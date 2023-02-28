const NET = require("net");

const isPortOpen = async (port) => {
    return new Promise((resolve, reject) => {
        let s = NET.createServer();
        s.once('error', (err) => {
            s.close();
            resolve(false);
        });
        s.once('listening', () => {
            resolve(true);
            s.close();
        });
        s.listen(port);
    });
}

const getNextOpenPort = async(startFrom = 8080) => {
    let openPort = null;
    while (startFrom < 65535 || !!openPort) {
        if (await isPortOpen(startFrom)) {
            openPort = startFrom;
            break;
        }
        startFrom++;
    }
    return openPort;
};


class SocketBase  {
    clientType = 'unknown'

    constructor({socket, backend}) {
        this.socket = socket
        this.backend = backend
        this.hooks = []
        this.experiencingLatency = false

        console.log(`INIT Backend:`)
        console.log(` - Type: ${this.backend.type}`)
        console.log(` - ID: ${this.backend.robot_backend_id}`)
        console.log(` `)

        this.socket.on('user_count', (user_count) => {
            console.log('Got user_count', user_count)
            user_count = parseInt(user_count, 10)
            if(user_count>=0){
                this.do('user_count', user_count)
            }
        })

        this.socket.on('user_connected', (data) => {
            console.log('Got user_connected', data)
            this.do('user_connected', data)
        })

        this.socket.on('user_disconnected', (data) => {
            this.do('user_disconnected', data)
        })

        this.init()
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
                hook.callback(args);
            }
        })
    }

    init() {
    }

    connect() {
        // when our script really wants to send data.
    }

    async startGenericSocketPipe(name) {
        this.socketPipePort = await getNextOpenPort()

        this.socket.on(`${name}_received`, (data) => {
            if(data && data.timestamp && data.robot_backend_id === this.robotBackendId()) {
                const latencyDelay = Date.now() - data.timestamp
                this.experiencingLatency = latencyDelay > 200
                this.do('latency', latencyDelay)
            }
        })

        NET.createServer(serverSocket => {
            serverSocket.on('data', chunk => {
                // todo: check if we're sending too much data locally first and back off there as well
                if (this.experiencingLatency) {
                    // send some empty data to server until we catch up
                    chunk = new Buffer.from([])
                }
                this.socket.volatile.emit(name, {
                    timestamp: Date.now(),
                    robot_backend_id: this.robotBackendId(),
                    chunk: chunk
                })
            });
            serverSocket.on("end", () => {
                console.log('Stopped receiving video stream...')
            })
        }).listen(this.socketPipePort, () => {
        });
    }
}

exports.SocketBase = SocketBase
