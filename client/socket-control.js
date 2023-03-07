const {SocketBase} = require("./socket");

class SocketControl extends SocketBase {
    clientType = 'SOCKET_CONTROL'
}

exports.SocketControl = SocketControl
