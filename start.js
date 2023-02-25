const {startRobotClient} = require('./client/client')
const spawn = require('child_process').spawn;
const kill  = require('tree-kill');
const os = require('os');

const start = async () => {
    const backends = await startRobotClient()

    const backendTelemetry = backends.find(b => b.clientType === 'SOCKET_TELEMETRY')
    const backendVideoH264 = backends.find(b => b.clientType === 'SOCKET_VIDEO_H264')
    const backendVideoJpeg = backends.find(b => b.clientType === 'SOCKET_VIDEO_JPEG')
    const backendControlWheels = backends.find(b => b.clientType === 'SOCKET_CONTROL' && b.internalId() === "wheels")
    const backendControlCamera = backends.find(b => b.clientType === 'SOCKET_CONTROL' && b.internalId() === "camera")

    const spawnChildren  = [];
    process.on('exit', () => {
        console.log(`killing ${spawnChildren.length} child processes`)
        spawnChildren.forEach((child) => {
            child.kill()
        })
    })

    if(backendTelemetry){
        backendTelemetry.connect()
        setInterval(() => {
            const avg_load = os.loadavg();
            backendTelemetry.log('system_load_average', String(avg_load[0]))
        }, 10000)
    }

    if(backendVideoJpeg){
        let jpegCaptureProcess = null
        backendVideoJpeg.on('user_count', (user_count) => {
            console.log(`There are ${user_count} users viewing this stream`)
            if(user_count > 0){
                if(!backendVideoJpeg.streamRunning) {
                    backendVideoJpeg.streamRunning = true
                    console.log('Starting backendVideoJpeg ')
                    backendTelemetry?.log('system', 'starting jpeg stream')

                    const videoCaptureCommand = `/usr/bin/libcamera-vid -n -t 0 --framerate 10 --rotation 180 --width 640 --height 480 --segment 1 --codec mjpeg --quality 40 -o tcp://127.0.0.1:${backendVideoJpeg.pipePort}`
                    jpegCaptureProcess = spawn('sh', ['-c', videoCaptureCommand])
                    spawnChildren.push(jpegCaptureProcess)
                    jpegCaptureProcess.on('close', (err) => {
                        backendVideoJpeg.streamRunning = false
                        console.error('backendVideoJpeg stopped', videoCaptureCommand, err)
                    });
                }
            }else{
                if(backendVideoJpeg.streamRunning) {
                    backendVideoJpeg.streamRunning = false
                    if(jpegCaptureProcess) {
                        kill(jpegCaptureProcess.pid);
                    }
                }
            }
        })

        let lastMjpegVideoLatency = Date.now()
        backendVideoJpeg.on('latency', (latency) => {
            if(( Date.now() - lastMjpegVideoLatency) > 3000) {
                lastMjpegVideoLatency = Date.now()
                // todo: associate log message with backend ID
                backendTelemetry?.log('jpeg_latency', latency, 'DEBUG')
            }
        })
        // Connect our backend to socket.io so we can start receiving commands:
        backendVideoJpeg.connect()
    }

    if(backendVideoH264){
        let h264CaptureProcess = null
        backendVideoH264.on('user_count', (user_count) => {
            user_count = parseInt(user_count, 10)
            console.log(`There are ${user_count} users viewing this stream`)
            if(user_count > 0){
                if(!backendVideoH264.streamRunning) {
                    backendVideoH264.streamRunning = true
                    console.log('Starting backendVideoH264 ')
                    backendTelemetry?.log('system', 'starting h264 stream')

                    // There are 3 ways to achieve h264 video capture:
                    // - libcamera-vid: if on a recent raspberry pi OS choose this
                    const videoCaptureCommand = `/usr/bin/libcamera-vid -n -t 0 --framerate 10 --rotation 180 --intra 30 --inline 1 --width 640 --height 480 --bitrate 1000000 --codec h264 --profile baseline -o tcp://127.0.0.1:${backendVideoH264.pipePort}`

                    // - v4l-cat: configure v4l and stream raw /dev/video0 device (very fast)
                    // const configureV4lCommand = 'v4l2-ctl -v width=640,height=480,pixelformat=H264 -p 10 -c h264_profile=0,repeat_sequence_header=1,video_bitrate=500000'
                    // spawn('sh', ['-c', configureV4lCommand])
                    // const videoCaptureCommand = `/bin/cat /dev/video0 | /bin/nc 127.0.0.1 ${backendVideoH264.pipePort} -w 2`

                    // - ffmpeg: probably don't do this, it's very resource intensive and slower than above options.
                    // const videoCaptureCommand = `/usr/bin/ffmpeg -loglevel fatal -f v4l2 -i /dev/video0 -r 10 -tune zerolatency -s 640x480 -an -c:v libx264 -profile:v baseline -f h264 tcp://127.0.0.1:${backendVideoH264.pipePort}`

                    h264CaptureProcess = spawn('sh', ['-c', videoCaptureCommand])
                    spawnChildren.push(h264CaptureProcess)
                    h264CaptureProcess.on('close', (err) => {
                        backendVideoH264.streamRunning = false
                        console.error('backendVideoH264 stopped', videoCaptureCommand, err)
                    });
                }
            }else {
                if(backendVideoH264.streamRunning) {
                    backendVideoH264.streamRunning = false
                    if(h264CaptureProcess) {
                        kill(h264CaptureProcess.pid);
                    }
                }
            }
        })

        let lastVideoLatency = Date.now()
        backendVideoH264.on('latency', (latency) => {
            if(( Date.now() - lastVideoLatency) > 3000) {
                lastVideoLatency = Date.now()
                // todo: associate log message with backend ID
                backendTelemetry?.log('h264_latency', latency, 'DEBUG')
            }
        })
        // Connect our backend to socket.io so we can start receiving commands:
        backendVideoH264.connect()
    }

    if(backendControlCamera){
        backendControlCamera.on('user_command_for_robot', (data) => {
            if(data && data.action) {
                console.log('camera command:', data)
                backendTelemetry?.log('moving_camera', data.action)
                // TODO: put your code in here to control the robot based on the `data` variable
                // e.g. serialPort.write("moveLeft");
            }
        })
        // Connect our backend to socket.io so we can start receiving commands:
        backendControlCamera.connect()
    }

    if(backendControlWheels){
        backendControlWheels.on('user_command_for_robot', (data) => {
            if(data && data.action) {
                console.log('user_command_for_robot', data)
                backendTelemetry?.log('moving_wheels', data.action)
                // TODO: put your code in here to control the robot based on the `data` variable
                // e.g. serialPort.write("moveLeft");
            }
        })
        // Connect our backend to socket.io so we can start receiving commands:
        backendControlWheels.connect()
    }
}

start()
