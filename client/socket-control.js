const {SocketBase} = require("./socket");

class SocketControl extends SocketBase {
    clientType = 'SOCKET_CONTROL'

    connected() {
        this.listenForUserCommands()
    }

    listenForUserCommands() {
        this.socket.emit('robot_listening_for_control')
        this.socket.on('user_command_for_robot', (data) => {
            if (data && data.action) {
                this.do('user_command_for_robot', data)
            }
        })
    }
}

exports.SocketControl = SocketControl
