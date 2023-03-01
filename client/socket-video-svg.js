const {SocketBase} = require("./socket");

class SocketVideoSvg extends SocketBase {
    clientType = 'SOCKET_VIDEO_SVG'

    init() {
        this.startGenericSocketPipe('robot_svg_image')
    }
}

exports.SocketVideoSvg = SocketVideoSvg
