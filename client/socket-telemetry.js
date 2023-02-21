const {SocketBase} = require("./socket");

class SocketTelemetry extends SocketBase {
    clientType = 'SOCKET_TELEMETRY'

    connected() {
        this.on('reset', () => {
            this.log('system', 'resetting')
        })
    }

    log(key, value, level = 'INFO') {
        this.socket.emit('robot_telemetry', {
            timestamp: Date.now(),
            key: key,
            value: value,
            level: level
        })
    }
}

exports.SocketTelemetry = SocketTelemetry
