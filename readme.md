# jupyter-transport-wrapper

[![Greenkeeper badge](https://badges.greenkeeper.io/nteract/jupyter-transport-wrapper.svg)](https://greenkeeper.io/)

Currently just provides a very simple layer on top of Jupyter ZMQ sockets. Will one day abstract over ZMQ or websockets for Jupyter.

Probably easier to use [jupyter-session](https://github.com/nteract/jupyter-session), which is built on this, for whatever you're doing.

## Usage

```javascript
var JupyterTransport = require('jupyter-session');

transport = new JupyterTransport(
    {
        version: 5,
        signature_scheme: 'sha256',
        key: '<the signing key>',
        transport: 'tcp',
        ip: '127.0.0.1',
        hb_port: 60868,
        control_port: 60869,
        shell_port: 60870,
        stdin_port: 60871,
        iopub_port: 60872
    },
    <'handle to kernel process, if available'>
);

// use wildcards to get all messages on a channel
transport.on('shell.*', function(message) {
    // message will be a jmp.Message
});

// send a JSON-formatted Jupyter message over the given channel
transport.send(channel, message);

// send the kernel an interrupt
transport.interrupt();

// close the sockets and kill the kernel
transport.close();
```

JupyterTransport is an EventEmitter, so you can use any of these methods: https://github.com/asyncly/EventEmitter2
