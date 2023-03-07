const {SocketBase} = require("./socket");

class SocketTelemetry extends SocketBase {
    clientType = 'SOCKET_TELEMETRY'
}

exports.SocketTelemetry = SocketTelemetry
