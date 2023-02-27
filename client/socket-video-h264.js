const {SocketBase} = require("./socket");

class SocketVideoH264 extends SocketBase {
    clientType = 'SOCKET_VIDEO_H264'

    init() {
        this.startGenericSocketPipe('robot_h264_frame')
    }
}

exports.SocketVideoH264 = SocketVideoH264
