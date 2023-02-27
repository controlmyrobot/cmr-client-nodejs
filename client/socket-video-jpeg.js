const {SocketBase} = require("./socket");

class SocketVideoJpeg extends SocketBase {
    clientType = 'SOCKET_VIDEO_JPEG'

    init() {
        this.startGenericSocketPipe('robot_jpeg')
    }
}

exports.SocketVideoJpeg = SocketVideoJpeg
