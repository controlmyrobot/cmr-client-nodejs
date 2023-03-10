const {Client} = require('./client/client')
const spawn = require('child_process').spawn
const os = require('os')

const start = async () => {
    const client = new Client({
        backendEndpoint: process.env.BACKEND_ENDPOINT || 'https://controlmyrobot.com',
        robotId: process.env.ROBOT_ID || 'abc123',
        robotSecretKey: process.env.ROBOT_SECRET_KEY || '321cba',
        tmpDir: '/var/tmpfs'
    })

    await client.initializeBackends()
    const backends = client.getConnectedBackends()

    // Read the backends configured through the CMR admin dashboard. Taking note of our own internal IDs:
    const backendTelemetry = backends.find(b => b.clientType === 'SOCKET_TELEMETRY' && b.internalId() === "telem")
    const backendVideoJpeg = backends.find(b => b.clientType === 'SOCKET_VIDEO_JPEG' && b.internalId() === "mainjpeg")
    const backendControlWheels = backends.find(b => b.clientType === 'SOCKET_CONTROL' && b.internalId() === "wheels")
    const backendControlCamera = backends.find(b => b.clientType === 'SOCKET_CONTROL' && b.internalId() === "camera")

    if (backendTelemetry) {
        // Send load average telemetry every 10 seconds:
        setInterval(() => {
            const avg_load = os.loadavg()
            backendTelemetry.telemetryToUser('system_load_average', String(avg_load[0]))
        }, 10000)

        // Send a user count metric back to the log whenever it changes:
        client.on('users_connected', (data) => {
            if(data && data.users) {
                console.log(`There are ${data.users.length} total users connected`)
                const userCountByPermission = data.users.reduce((v, user) => {
                    if(user?.permissions?.control) v.control += 1
                    if(user?.permissions?.view) v.view += 1
                    return v
                }, {
                    control: 0,
                    view: 0
                })
                backendTelemetry.logToUser(`There are ${data.users.length} total users connected.`)
                backendTelemetry.logToUser(`Viewer Count: ${userCountByPermission.view}`)
                backendTelemetry.logToUser(`Controller Count: ${userCountByPermission.control}`)
            }
        })
    }

    if (backendVideoJpeg) {
        let jpegCaptureProcess = null
        backendVideoJpeg.on('found_qr_code', async qr_code => {
            console.log("Found QR Code in image data: ", qr_code)
        })
        client.on('user_count', (user_count) => {
            if (user_count > 0) {
                // We only want to start our "expensive" video capture command when we have users connected:
                if (!backendVideoJpeg.streamRunning) {
                    backendVideoJpeg.streamRunning = true
                    const videoCaptureCommand = `/usr/bin/libcamera-vid -n -t 0 --framerate 10 --rotation 180 --width 640 --height 480 --segment 1 --codec mjpeg --quality 40 -o tcp://127.0.0.1:${backendVideoJpeg.socketPipePort}`
                    backendVideoJpeg.logToUser(`Starting video capture: ${videoCaptureCommand}`)
                    jpegCaptureProcess = spawn('sh', ['-c', videoCaptureCommand])
                    client.addChildProcess.push(jpegCaptureProcess)
                    jpegCaptureProcess.on('close', (err) => {
                        backendVideoJpeg.streamRunning = false
                        backendVideoJpeg.logToUser('video capture stopped')
                    })
                }
            } else {
                // Terminate the video capture process as soon as our connected user count reaches 0:
                backendVideoJpeg.streamRunning = false
                client.endChildProcess(jpegCaptureProcess)
            }
        })
    }

    if (backendControlCamera) {
        backendControlCamera.on('action_control', (data) => {
            if (data && data.message) {
                console.log('camera command:', data)
                backendControlCamera.logToUser('moving_camera', data)
                // TODO: put your code in here to control the robot based on the `data` variable
                // e.g. serialPort.write("moveLeft")
            }
        })
    }

    if (backendControlWheels) {
        backendControlWheels.on('action_control', (data) => {
            if (data && data.message) {
                console.log('wheels command', data)
                backendControlWheels.logToUser('moving_wheels', data)
                // TODO: put your code in here to control the robot based on the `data` variable
                // e.g. serialPort.write("moveLeft")
            }
        })
    }

    // Finally we connect our backends.
    // todo: refactor incoming, this is going to change:
    client.connectBackends()
}

start()
