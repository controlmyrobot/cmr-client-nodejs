const {SocketBase} = require("./socket")
const zbarimg = require('node-zbarimg')
const fs = require('fs');

class SocketVideoJpeg extends SocketBase {
    clientType = 'SOCKET_VIDEO_JPEG'

    init() {
        this.startGenericSocketPipe(data => {
            this.maybeParseQrCode(data)
        })
    }

    maybeParseQrCode(data) {
        // Look for QR code data every 2 seconds:
        if(!this.lastLookedForQrData || (Date.now() - this.lastLookedForQrData) > 2000){
            this.lastLookedForQrData = Date.now()
            const tmpFilename = `${this.config.tmpDir}/still-image-for-qr.jpg`
            fs.writeFileSync(tmpFilename,data)
            zbarimg(tmpFilename, (err, code) => {
                if(code){
                    if(code.startsWith('CMR:')) {
                        this.do('found_qr_code', code)
                    }else{
                        console.error('Found a QR code, but it does not start with CMR:')
                    }
                }
            })
        }
    }
}

exports.SocketVideoJpeg = SocketVideoJpeg
