class SocketBase  {
    clientType = 'unknown'

    constructor({io, backend}) {
        this.io = io
        this.backend = backend
        this.hooks = []
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

    connect() {
        this.do('connecting')

        const socketUri = `${this.backend.endpoint}/stream_robot/${this.backend.stream_robot_id}?actor=robot&key=${this.backend.stream_robot_key}`
        this.socket = this.io(socketUri, {
            reconnection: false
        });

        this.socket.emit("ping", "hello from backend client");

        this.socket.io.on("error", (error) => {
            this.do('error', error)
        })

        this.socket.io.on("reconnect_attempt", (attempt) => {
            if(attempt > 5){
                this.do('reset')
            }
        })

        this.socket.on("connect", () => {
            if(!this.connectedDoneOnce){
                this.connectedDoneOnce = true
                this.connected()
            }
            this.do('connected')
        })

        this.socket.on("disconnect", () => {
            this.do('reset')
        })
    }

    connected() {

    }

    reset() {
        this.socket.disconnect()
        setTimeout(() => {
            this.connect()
        }, 2000);
    }
}

exports.SocketBase = SocketBase
