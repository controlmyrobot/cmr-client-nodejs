const {SocketBase} = require("./socket");

class SocketTelemetry extends SocketBase {
    clientType = 'SOCKET_TELEMETRY'

    log(key, value, level = 'INFO') {
        this.socket.emit('robot_telemetry', {
            timestamp: Date.now(),
            robot_backend_id: this.robotBackendId(),
            key: key,
            value: value,
            level: level
        })
    }
}

exports.SocketTelemetry = SocketTelemetry
