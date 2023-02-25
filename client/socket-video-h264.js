const {SocketBase} = require("./socket");
const NET = require("net")

class SocketVideoH264 extends SocketBase {
    clientType = 'SOCKET_VIDEO_H264'
    pipePort

    connected() {
        this.monitorForLatency()
        this.startVideoSocketFramePipe()
    }

    monitorForLatency() {
        this.experiencingLatency = false
        this.socket.on("robot_h264_frame_received", (timestamp) => {
            const latencyDelay = Date.now() - timestamp
            this.experiencingLatency = latencyDelay > 200
            this.do('latency', latencyDelay)
        })
    }

    startVideoSocketFramePipe() {
        this.pipePort = 8090
        const server = NET.createServer(serverSocket => {
            serverSocket.on('data', chunk => {
                // todo: check if we're sending too much data locally first and back off there as well
                if (this.experiencingLatency) {
                    // send some empty data to server until we catch up
                    chunk = new Buffer.from([])
                }
                this.socket.volatile.emit('robot_h264_frame', {
                    timestamp: Date.now(),
                    chunk: chunk
                })
            });

            serverSocket.on("end", () => {
                // video streaming stopped
                console.log('Stopped receiving video stream...')
                // todo: Restart video capture, or the entire pipeline
            })

        }).listen(this.pipePort, () => {
        });
    }
}

exports.SocketVideoH264 = SocketVideoH264
