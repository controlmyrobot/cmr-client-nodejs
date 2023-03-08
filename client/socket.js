const NET = require("net")
const {getNextOpenPort} = require("./port-helper")

class SocketBase  {
    clientType = 'unknown'

    constructor({socket, backend, config}) {
        this.socket = socket
        this.backend = backend
        this.config = config
        this.hooks = []
        this.experiencingLatency = false

        console.log(`INIT Backend:`)
        console.log(` - Type: ${this.backend.type}`)
        console.log(` - ID: ${this.backend.robot_backend_id}`)
        console.log(` `)

        this.listenForMessagesFromCrm()
        this.listenForLatency()
        this.init()
    }

    init() {

    }

    robotBackendId() {
        return this.backend.robot_backend_id
    }

    internalId() {
        return this.backend.internal_id
    }

    on(action, callback) {
        this.hooks.push({
            action: action,
            callback: callback
        })
    }

    do(action, args) {
        this.hooks.forEach(hook => {
            if(hook.action === action){
                hook.callback(args)
            }
        })
    }

    listenForMessagesFromCrm() {
        this.socket.on(`cmr2r_${this.backend.robot_backend_id}`, dataPack => {
            if(dataPack.action) {
                let filteredData = null
                switch(dataPack.action){
                    case 'user_count':
                        filteredData = parseInt(dataPack.user_count, 10)
                        break;
                    default:
                        filteredData = dataPack
                }
                this.do(`action_${dataPack.action}`, filteredData)
            }
        })
    }

    listenForLatency() {
        this.on(`action_calculate_latency`, (data) => {
            if(data && data.timestamp) {
                const latencyDelay = Date.now() - data.timestamp
                this.experiencingLatency = latencyDelay > 200
                this.do('latency_calculated', latencyDelay)
                this.telemetryToUser(`latency`, latencyDelay)
            }
        })
    }

    logToUser(message) {
        this.sendDataToServer({
            timestamp: Date.now(),
            message: message,
        }, "log")
    }

    telemetryToUser(key, value){
        this.sendDataToServer({
            timestamp: Date.now(),
            key: key,
            value: value
        }, "telemetry")
    }

    async startGenericSocketPipe(optionalDataCallback = null) {
        this.socketPipePort = await getNextOpenPort()

        NET.createServer(serverSocket => {
            serverSocket.on('data', async data => {
                if(this.pauseGenericSocketPipe) return // we might want to pause the default stream if we're sending some custom image data (e.g. You completed a quest)
                if(optionalDataCallback){
                    // Sometimes we will want to check the image for additional data, e.g. scan it for a QR code.
                    optionalDataCallback(data)
                }
                this.sendDataToServer(data)
            })
            serverSocket.on("end", () => {
                console.log('Stopped genericSocketPipe.')
            })
        }).listen(this.socketPipePort, () => {
        });
    }

    // This takes an array of image buffers and sends them to the client spread over the desired duration.
    playCustomImageStream(images, duration = 2000) {
        this.pauseGenericSocketPipe = true
        const imageSplitDuration = Math.floor(duration / images.length)
        images.forEach((image, index) => {
            setTimeout(() => {
                this.sendDataToServer(image, null, true)
            }, index * imageSplitDuration)
        })
        return new Promise(resolve => setTimeout(() => {
            this.pauseGenericSocketPipe = false
            resolve()
        }, duration))
    }

    sendDataToServer(chunk, channel = null, force = false) {
        if (this.experiencingLatency && !force) {
            // send some empty data to server until we catch up
            chunk = null
        }
        // todo: also check if we're sending too much data locally first and back off there as well
        this.socket.emit(`r2cmr_${this.backend.robot_backend_id}`, {
            timestamp: Date.now(),
            channel: channel,
            chunk: chunk
        })
    }
}

exports.SocketBase = SocketBase
