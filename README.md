## Control My Robot - Node.js Client

These instructions are for Raspberry Pi OS, running on a Raspberry Pi4.

### Getting started:

Requirements:

- A robot that is connected to the internet (e.g. Raspberry Pi)
- A camera that can be streamed to show what the robot is doing (e.g. Raspberry Pi Camera).
- Some understanding of how to control your robot based on received commands (e.g. serial communication with a )

Install Raspberry Pi OS onto the SD card, following instructions from: https://www.raspberrypi.com/software/ (using the "Raspberry Pi Imager" is very easy, it lets you configure login details / Wifi details during image creation)

Once installed, ssh into your Raspberry Pi.

Then on the Pi, please ensure `node`, `yarn`, and `ffmpeg` are available. Example:

```bash
# NodeJS 19
sudo su
curl -fsSL https://deb.nodesource.com/setup_19.x | bash -

# Yarn:
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | tee /usr/share/keyrings/yarnkey.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main" | tee /etc/apt/sources.list.d/yarn.list

apt-get update
apt install -y yarn ffmpeg nodejs gcc g++ make git python3-serial
```

Then clone a copy of this repository:

```bash
git clone git@github.com:controlmyrobot/cmr-client-nodejs.git
```

Then install the package dependencies using `yarn`:

```bash
cd cmr-client-nodejs/
yarn install
```

Use your Robot ID and API key to start the nodejs client:

```bash
ROBOT_ID=abc123 ROBOT_SECRET=321cba yarn run start
```

### Customisation:

Duplicate the `start.js` file into `start-custom.js`, make the required adjustments in `start-custom.js`, and start the client like so:

```
ROBOT_ID=abc123 ROBOT_SECRET=321cba yarn run start-custom
```
