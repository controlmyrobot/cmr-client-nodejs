const {SocketBase} = require("./socket");

class SocketVideoMpegts extends SocketBase {
    clientType = 'SOCKET_VIDEO_MPEGTS'

    init() {
        this.startGenericSocketPipe()
    }
}

exports.SocketVideoMpegts = SocketVideoMpegts
