const {SocketBase} = require("./socket");

const NET = require("net")

class SocketVideoH264 extends SocketBase {
    clientType = 'SOCKET_VIDEO_H264'
    localFfmpegSplitPort

    connected() {
        this.monitorForLatency()
        this.startVideoSocketFramePipe()
        console.log('Vide Connected Once')
        this.on('connected', () => {
            console.log('Vide Connected Callback', this.clientType)
            this.do('start_video_stream')
        })
    }

    monitorForLatency() {
        this.experiencingLatency = false
        // todo: these will double up on() if socket client restarts. Fix it
        this.socket.on("robot_raw_video_frame_received", (timestamp) => {
            const latencyDelay = Date.now() - timestamp
            this.experiencingLatency = latencyDelay > 200
            this.do('video_latency', latencyDelay)
        })
    }

    startVideoSocketFramePipe() {
        this.localFfmpegSplitPort = 8090 // TODO: pull from pool of ports so we don't impact multiple videos running
        const server = NET.createServer(serverSocket => {
            this.socket.emit('robot_raw_video_start')
            serverSocket.on('data', chunk => {
                // todo: check if we're sending too much data locally first and back off there as well
                if (this.experiencingLatency) {
                    // send some empty data to server until we catch up
                    chunk = new Buffer.from([])
                }
                this.socket.volatile.emit('robot_raw_video_frame', {
                    timestamp: Date.now(),
                    videoframe: chunk
                })
            });

            serverSocket.on("end", () => {
                // video streaming stopped
                console.log('Stopped receiving video stream...')
                // todo: Restart video capture, or the entire pipeline
            })

        }).listen(this.localFfmpegSplitPort, () => {
        });

        this.on('reset', () => {
            console.log('terminating server')
            server.close()
        })
    }
}

exports.SocketVideoH264 = SocketVideoH264
