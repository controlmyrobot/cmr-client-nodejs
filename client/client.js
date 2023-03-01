const io = require('socket.io-client')
const {SocketControl} = require('./socket-control')
const {SocketTelemetry} = require('./socket-telemetry')
const {SocketVideoH264} = require('./socket-video-h264')
const {SocketVideoJpeg} = require('./socket-video-jpeg')
const {SocketVideoSvg} = require('./socket-video-svg')

const config = {
    backendEndpoint: process.env.BACKEND_ENDPOINT || 'https://controlmyrobot.com',
    robotId: process.env.ROBOT_ID || 'abc123',
    robotSecretKey: process.env.ROBOT_SECRET_KEY || '321cba'
}

async function startRobotClient() {
    let initializedBackends = []
    try {
        // Grab the configuration for our robot backends from the server:
        const response = await fetch(
            `${config.backendEndpoint}/api/v1/robot/setup/${config.robotId}`,
            {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    robot_secret_key: config.robotSecretKey
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

        const socketUri = `${socketHost.endpoint}/v1/stream_robot/?actor=robot&robot_id=${config.robotId}&stream_robot_id=${socketHost.stream_robot_id}&stream_robot_key=${socketHost.stream_robot_key}`
        const socket = io(socketUri, {
            // reconnection: false
        })
        socket.io.on("error", (error) => {
            console.error("Socket error", error)
        })
        socket.io.on("reconnect_attempt", (attempt) => {
            if(attempt > 5){
                console.error('Failed to connect after 5 attempts')
            }
        })

        json.backends.forEach(backend => {
            let initializedBackend

            switch (backend.type) {
                case "SOCKET_VIDEO_JPEG":
                    // Which video device are we going to read from? Will that appear in backend JSON file?
                    initializedBackend = new SocketVideoJpeg({socket: socket, backend: backend})
                    break;
                case "SOCKET_VIDEO_SVG":
                    initializedBackend = new SocketVideoSvg({socket: socket, backend: backend})
                    break;
                case "SOCKET_VIDEO_H264":
                    // Which video device are we going to read from? Will that appear in backend JSON file?
                    initializedBackend = new SocketVideoH264({socket: socket, backend: backend})
                    break;
                case "SOCKET_TELEMETRY":
                    initializedBackend = new SocketTelemetry({socket: socket, backend: backend})
                    break;
                case "SOCKET_CONTROL":
                    initializedBackend = new SocketControl({socket: socket, backend: backend})
                    break;
            }

            if (initializedBackend) {
                initializedBackends.push(initializedBackend)
            }
        })
    } catch (err) {
        console.error('startRobotClient(): Failed to start', err)
    }

    return initializedBackends
}


exports.startRobotClient = startRobotClient
