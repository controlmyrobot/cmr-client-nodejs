const {startRobotClient} = require('./client/client')
const spawn = require('child_process').spawn;
const os = require('os');

const start = async () => {
    const backends = await startRobotClient()

    const backendTelemetry = backends.find(b => b.clientType === 'SOCKET_TELEMETRY')
    const backendVideoH264 = backends.find(b => b.clientType === 'SOCKET_VIDEO_H264')
    const backendControl = backends.find(b => b.clientType === 'SOCKET_CONTROL')

    const spawnChildren = [];
    process.on('exit', () => {
        console.log(`killing ${spawnChildren.length} child processes`)
        spawnChildren.forEach((child) => {
            child.kill()
        })
    })

    if (backendTelemetry) {
        backendTelemetry.connect()
        setInterval(() => {
            const avg_load = os.loadavg();
            backendTelemetry.log('system_load_average', String(avg_load[0]))
        }, 10000)
    }

    if (backendVideoH264) {
        backendVideoH264.on('start_video_stream', () => {
            console.log('Starting video stream callback')
            let videoCaptureCommand = null

            // There are 3 ways to achieve this:
            // - libcamera: if on a recent raspberry pi OS choose this
            // - v4l-cat: configure v4l and stream raw /dev/video0 device (very fast)
            // - ffmpeg: probably don't do this, it's very resource intensive and slower than above options.
            const streamMethod = 'libcamera'
            switch (streamMethod) {
                case 'libcamera':
                    videoCaptureCommand = `/usr/bin/libcamera-vid -n -t 0 --framerate 15 --rotation 180 --intra 30 --inline 1 --width 640 --height 480 --bitrate 1000000 --codec h264 --profile baseline -o tcp://127.0.0.1:${backendVideoH264.localFfmpegSplitPort}`
                    break;
                case 'v4l-cat':
                    const configureV4lCommand = 'v4l2-ctl -v width=640,height=480,pixelformat=H264 -p 15 -c h264_profile=0,repeat_sequence_header=1,video_bitrate=500000'
                    spawn('sh', ['-c', configureV4lCommand])
                    videoCaptureCommand = `/bin/cat /dev/video0 | /bin/nc 127.0.0.1 ${backendVideoH264.localFfmpegSplitPort} -w 2`
                    break;
                case 'ffmpeg':
                    videoCaptureCommand = `/usr/bin/ffmpeg -loglevel fatal -f v4l2 -i /dev/video0 -r 10 -tune zerolatency -s 640x480 -an -c:v libx264 -profile:v baseline -f h264 tcp://127.0.0.1:${backendVideoH264.localFfmpegSplitPort}`
                    break;
            }
            if (videoCaptureCommand) {
                backendTelemetry?.log('system', `starting h264 video stream using ${streamMethod}`)
                const videoCaptureProcess = spawn('sh', ['-c', videoCaptureCommand])
                spawnChildren.push(videoCaptureProcess)
                videoCaptureProcess.on('close', (err) => {
                    console.error('video capture process stopped for some reason', videoCaptureCommand, err)
                });
                backendVideoH264.on('reset', () => {
                    videoCaptureProcess.kill('SIGHUP');
                })
            }
        })

        // Report video latency once every 3 seconds
        let lastVideoLatency = Date.now()
        backendVideoH264.on('video_latency', (latency) => {
            if ((Date.now() - lastVideoLatency) > 3000) {
                lastVideoLatency = Date.now()
                backendTelemetry?.log('video_latency', latency, 'DEBUG')
            }
        })

        backendVideoH264.connect()
    }

    if (backendControl) {
        backendControl.on('user_command_for_robot', (data) => {
            console.log('user_command_for_robot', data)
            backendTelemetry?.log('user_command_for_robot', data)
            // TODO: put your code in here to control the robot based on the `data` variable
            // e.g. serialPort.write("moveLeft");
        })
        backendControl.connect()
    }
}

start()
