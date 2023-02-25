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

        const socketUri = `${this.backend.endpoint}/v1/stream_robot/${this.backend.stream_robot_id}?actor=robot&key=${this.backend.stream_robot_key}`
        this.socket = this.io(socketUri, {
            reconnection: false
        });

        this.socket.emit("ping", "hello from backend client");

        this.socket.io.on("error", (error) => {
            this.do('error', error)
        })

        this.socket.io.on("reconnect_attempt", (attempt) => {
            if(attempt > 5){
                console.error('Failed to connect after 5 attempts')
            }
        })

        this.socket.on("connect", () => {
            if(!this.connectedDoneOnce){
                this.connectedDoneOnce = true
                this.connected()
            }
            this.do('connected')
        })

        this.socket.on('user_count', (user_count) => {
            user_count = parseInt(user_count, 10)
            if(user_count>=0){
                this.do('user_count', user_count)
            }
        })

        this.socket.on('user_connected', (data) => {
            this.do('user_connected', data)
        })

        this.socket.on('user_disconnected', (data) => {
            this.do('user_disconnected', data)
        })

        this.socket.on("disconnect", () => {
            console.error('Socket disconnected')
        })
    }

    connected() {

    }
}

exports.SocketBase = SocketBase
