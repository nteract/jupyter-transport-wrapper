"use strict";

import {EventEmitter2 as EventEmitter} from 'eventemitter2';
import * as jmp from 'jmp';
import * as uuid from 'uuid';

export default class JupyterTransportWrapper extends EventEmitter {
    constructor(config, kernelProcess) {
        super({wildcard: true});

        this.kernelProcess = kernelProcess;
        this.shellSocket = new jmp.Socket(
            'dealer',
            config.signature_scheme,
            config.key);

        this.controlSocket = new jmp.Socket(
            'dealer',
            config.signature_scheme,
            config.key);

        this.ioSocket = new jmp.Socket(
            'sub',
            config.signature_scheme,
            config.key);

        this.shellSocket.identity = 'dealer' + uuid.v4();
        this.controlSocket.identity = 'control' + uuid.v4();
        this.ioSocket.identity = 'sub' + uuid.v4();

        this.shellSocket.connect(
        config.address + ':' + config.shell_port);
        this.controlSocket.connect(
        config.address + ':' + config.control_port);
        this.ioSocket.connect(
        config.address + ':' + config.iopub_port);

        this.ioSocket.subscribe('');

        this.shellSocket.on('message', this._onShellMessage.bind(this));
        this.ioSocket.on('message', this._onIOMessage.bind(this));
    }

    _onShellMessage = (message) => {
        message.channel = 'shell';
        this._onMessage('shell', message);
    }

    _onIOMessage = (message) => {
        message.channel = 'iopub';
        this._onMessage('iopub', message);
    }

    _onMessage = (channel, message) => {
        let eventName = channel;
        if (message.parent_header !== undefined
            && message.parent_header !== null
            && message.parent_header.msg_id !== undefined
            && message.parent_header.msg_id !== null) {
            eventName = eventName + '.' + message.parent_header.msg_id;
        }
        this.emit(eventName, message);
    }

    send(channel, messageObject) {
        let message = new jmp.Message(messageObject);
        switch(channel) {
            case 'iopub':
                this.ioSocket.send(message);
                break;
            case 'shell':
                this.shellSocket.send(message);
                break;
            case 'control':
                this.controlSocket.send(message);
                break;
            default:
                throw `'${channel}' is not a valid channel`;
        }
    }

    interrupt() {
        if (this.kernelProcess !== null
            && this.kernelProcess !== undefined) {
            this.kernelProcess.kill('SIGINT');
        }
    }

    close() {
        this.removeAllListeners();
        this.shellSocket.close();
        this.ioSocket.close();
        this.controlSocket.close();

        if (this.kernelProcess !== null
            && this.kernelProcess !== undefined) {
            this.kernelProcess.kill('SIGKILL');
        }
    }
}
