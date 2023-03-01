const {SocketBase} = require("./socket");

class SocketVideoSvg extends SocketBase {
    clientType = 'SOCKET_VIDEO_SVG'

    init() {
        this.startGenericSender('robot_svg_image')
    }

    sendImage(svgString) {
        this.do('robot_svg_image_send', svgString)
    }
}

exports.SocketVideoSvg = SocketVideoSvg
