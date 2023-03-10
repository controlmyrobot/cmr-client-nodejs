const {SocketBase} = require("./socket")
const zbarimg = require('node-zbarimg')
const fs = require('fs')

class SocketVideoJpeg extends SocketBase {
    clientType = 'SOCKET_VIDEO_JPEG'

    init() {
        this.lookForQrCodes = true
        this.startGenericSocketPipe(data => {
            if(this.lookForQrCodes) {
                this.maybeParseQrCode(data)
            }
        })
    }

    maybeParseQrCode(data) {
        // Look for QR code data every 3 seconds:
        if(!this.lastLookedForQrData || (Date.now() - this.lastLookedForQrData) > 3000){
            this.lastLookedForQrData = Date.now()
            const tmpFilename = `${this.config.tmpDir}/cmr-qr-code-${this.backend.robot_backend_id.replace(/[^a-zA-Z0-9]/g,'')}.jpg`
            fs.writeFile(tmpFilename,data, (err) => {
                if(!err) {
                    zbarimg(tmpFilename, (err, code) => {
                        if(code){
                            console.log('Found a QR code',code)
                            if(code.startsWith('CMR:')) {
                                this.do('found_qr_code', code)
                            }else{
                                console.error('Found a QR code, but it does not start with CMR:')
                            }
                        }
                        try {fs.unlinkSync(tmpFilename)}catch(e){}
                    })
                }
            })
        }
    }
}

exports.SocketVideoJpeg = SocketVideoJpeg
