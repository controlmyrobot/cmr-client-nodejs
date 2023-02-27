const {SocketBase} = require("./socket");

class SocketControl extends SocketBase {
    clientType = 'SOCKET_CONTROL'

    init() {
        this.listenForUserCommands()
    }

    listenForUserCommands() {
        this.socket.on('user_command_for_robot', (data) => {
            if (data && data.action && data.robot_backend_id && data.robot_backend_id === this.robotBackendId()) {
                this.do('user_command_for_robot', data)
            }
        })
    }
}

exports.SocketControl = SocketControl
