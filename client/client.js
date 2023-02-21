const io = require('socket.io-client')
const {SocketControl} = require('./socket-control')
const {SocketTelemetry} = require('./socket-telemetry')
const {SocketVideoH264} = require('./socket-video-h264')

const config = {
    backendEndpoint: process.env.BACKEND_ENDPOINT || 'https://controlmyrobot.com/',
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
        console.log(` - Backends: ${json.backends.length}`)
        console.log(` `)

        json.backends.forEach(backend => {
            let initializedBackend

            switch (backend.type) {
                case "SOCKET_VIDEO_H264":
                    // Which video device are we going to read from? Will that appear in backend JSON file?
                    initializedBackend = new SocketVideoH264({io: io, backend: backend})
                    break;
                case "SOCKET_TELEMETRY":
                    initializedBackend = new SocketTelemetry({io: io, backend: backend})
                    break;
                case "SOCKET_CONTROL":
                default:
                    initializedBackend = new SocketControl({io: io, backend: backend})
                    break;
            }

            if (initializedBackend) {
                initializedBackend.on('connecting', () => {
                    console.log(`CONNECTING Backend:`)
                    console.log(` - Type: ${backend.type}`)
                    console.log(` - ID: ${backend.stream_robot_id}`)
                    console.log(` `)
                })

                initializedBackend.on('reset', () => {
                    console.log(`RESETTING Backend:`)
                    console.log(` - Type: ${backend.type}`)
                    console.log(` - ID: ${backend.stream_robot_id}`)
                    console.log(` `)

                    initializedBackend.reset()
                })

                initializedBackend.on('connected', () => {
                    console.log(`CONNECTED Backend:`)
                    console.log(` - Type: ${backend.type}`)
                    console.log(` - ID: ${backend.stream_robot_id}`)
                    console.log(` `)
                })
                initializedBackends.push(initializedBackend)
            }
        })
    } catch (err) {
        console.error('startRobotClient(): Failed to start', err)
    }

    return initializedBackends
}


exports.startRobotClient = startRobotClient
