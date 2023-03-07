const NET = require("net")

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
}

exports.getNextOpenPort = getNextOpenPort
