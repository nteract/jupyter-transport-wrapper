import { EventEmitter2 as EventEmitter } from 'eventemitter2';
import * as jmp from 'jmp';
import * as uuid from 'uuid';

function formConnectionString(config, channel) {
  const portDelimiter = config.transport === 'tcp' ? ':' : '-';
  const port = config[channel + '_port'];
  if (! port) {
    throw new Error(`Port not found for channel "${channel}"`);
  }
  return `${config.transport}://${config.ip}${portDelimiter}${port}`;
}

export default class JupyterTransportWrapper extends EventEmitter {
    constructor(config, kernelProcess) {
      super({ wildcard: true });

      const scheme = config.signature_scheme.slice('hmac-'.length);

      this.kernelProcess = kernelProcess;
      this.shellSocket = new jmp.Socket('dealer', scheme, config.key);
      this.controlSocket = new jmp.Socket('dealer', scheme, config.key);
      this.ioSocket = new jmp.Socket('sub', config.signature_scheme, config.key);

      this.shellSocket.identity = 'dealer' + uuid.v4();
      this.controlSocket.identity = 'control' + uuid.v4();
      this.ioSocket.identity = 'sub' + uuid.v4();

      this.shellSocket.connect(formConnectionString(config, 'shell'));
      this.controlSocket.connect(formConnectionString(config, 'control'));
      this.ioSocket.connect(formConnectionString(config, 'iopub'));

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
      console.log(channel);
      console.log(message);
      let eventName = channel;
      if (message.parent_header && message.parent_header.msg_id) {
        eventName = eventName + '.' + message.parent_header.msg_id;
      }
      this.emit(eventName, message);
    }

    send(channel, messageObject) {
      const message = new jmp.Message(messageObject);
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
        throw new Error(`'${channel}' is not a valid channel`);
      }
    }

    interrupt() {
      if (this.kernelProcess) {
        this.kernelProcess.kill('SIGINT');
      }
    }

    close() {
      this.removeAllListeners();
      this.shellSocket.close();
      this.ioSocket.close();
      this.controlSocket.close();

      if (this.kernelProcess) {
        this.kernelProcess.kill('SIGKILL');
      }
    }
}
