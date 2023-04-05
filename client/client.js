const io = require('socket.io-client')
const kill  = require('tree-kill')
const {SocketControl} = require('./socket-control')
const {SocketTelemetry} = require('./socket-telemetry')
const {SocketVideoH264} = require('./socket-video-h264')
const {SocketVideoJpeg} = require('./socket-video-jpeg')
const {SocketVideoSvg} = require('./socket-video-svg')
const {SocketVideoMpegts} = require('./socket-video-mpegts')
const {SocketQuest} = require('./socket-quest')

class Client  {
    constructor(config) {
        this.config = {
            robotId: config.robotId,
            robotSecretKey: config.robotSecretKey,
            backendEndpoint: config.backendEndpoint || 'https://controlmyrobot.com',
            tmpDir: config.tmpDir || '/tmp'
        }
        this.childProcesses = []
        this.connectedBackends = []
        this.socket = null
        this.hooks = []

        process.on('exit', () => {
            console.log(`Ending ${this.childProcesses.length} child processes`)
            this.childProcesses.forEach(child => {
                this.endChildProcess(child)
            })
        })
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

    addChildProcess(proc) {
        this.childProcesses.push(proc)
    }

    endChildProcess(proc) {
        if(proc && proc.pid) {
            kill(proc.pid)
        }
    }

    async initializeBackends() {
        try {
            // Grab the configuration for our robot backends from the server:
            const response = await fetch(
                `${this.config.backendEndpoint}/api/v1/robot/setup/${this.config.robotId}`,
                {
                    method: 'POST',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        robot_secret_key: this.config.robotSecretKey
                    })
                })
            const json = await response.json()

            console.log(`Initializing:`)
            console.log(` - Robot: ${json.robot_id}`)
            console.log(` - API version: ${json.api_version}`)
            console.log(` - Hosts: ${json.hosts.length}`)
            console.log(` - Backends: ${json.backends.length}`)
            console.log(` `)

            const socketHost = json.hosts.find(b => b.type === 'SOCKET')
            // const socketRtsp = json.hosts.find(b => b.type === 'RTSP') // TODO
            if(!socketHost){
                throw new Error('Unable to find socket host')
            }

            const socketUri = `${socketHost.endpoint}/v1/stream_robot`
            this.socket = io(socketUri, { autoConnect: false, transports: ["websocket"] })
            this.socket.on("connect", async () => {
                console.log("Socket Authentication: starting")
                const authResult = await this.socket.emitWithAck("authenticate", {
                    actor: "robot",
                    robot_id: this.config.robotId,
                    stream_robot_id: socketHost.stream_robot_id,
                    stream_robot_key: socketHost.stream_robot_key
                })
                if(!authResult || !authResult.success){
                    console.error("Socket Authentication: failed", authResult)
                }
            })
            const attemptSocketReconnect = () => {
                setTimeout(() => {
                    console.log("Socket Authentication: reconnecting...")
                    this.socket.io.open((err) => {
                        if (err) {
                            attemptSocketReconnect()
                        }
                    });
                }, 2000)
            }
            this.socket.io.on("close", () => {
                console.error("Socket Authentication: closed")
                attemptSocketReconnect()
            })
            this.socket.io.on("error", (error) => {
                console.error("Socket error", error)
            })

            this.socket.on("cmr_command", command => {
                switch(command){
                    case 'new_configuration':
                        this.do('new_configuration', true)
                        break;
                }
            })
            this.socket.on("users_connected", data => {
                if(data && data.users) {
                    this.do('users_connected', data)
                    this.do('user_count', data.users.length)
                }
            })

            json.backends.forEach(backend => {
                switch (backend.type) {
                    case "SOCKET_VIDEO_JPEG":
                        // Which video device are we going to read from? Will that appear in backend JSON file?
                        this.connectedBackends.push(
                            new SocketVideoJpeg({socket: this.socket, backend: backend, config: this.config})
                        )
                        break;
                    case "SOCKET_VIDEO_SVG":
                        this.connectedBackends.push(
                            new SocketVideoSvg({socket: this.socket, backend: backend, config: this.config})
                        )
                        break;
                    case "SOCKET_VIDEO_MPEGTS":
                        this.connectedBackends.push(
                            new SocketVideoMpegts({socket: this.socket, backend: backend, config: this.config})
                        )
                        break;
                    case "SOCKET_VIDEO_H264":
                        this.connectedBackends.push(
                            new SocketVideoH264({socket: this.socket, backend: backend, config: this.config})
                        )
                        break;
                    case "SOCKET_TELEMETRY":
                        this.connectedBackends.push(
                            new SocketTelemetry({socket: this.socket, backend: backend, config: this.config})
                        )
                        break;
                    case "SOCKET_CONTROL":
                        this.connectedBackends.push(
                            new SocketControl({socket: this.socket, backend: backend, config: this.config})
                        )
                        break;
                    case "SOCKET_QUEST":
                        this.connectedBackends.push(
                            new SocketQuest({socket: this.socket, backend: backend, config: this.config})
                        )
                        break;
                }
            })
        } catch (err) {
            console.error('startRobotClient(): Failed to start', err)
        }
    }

    getConnectedBackends(){
        return this.connectedBackends
    }

    connectBackends() {
        // Call socket connect last so all the backends are ready to listen for events that are sent on connection.
        this.socket.connect()
    }
}

exports.Client = Client
