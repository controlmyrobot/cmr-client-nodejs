## Control My Robot - Node.js Client

These instructions are for Raspberry Pi OS, running on a Raspberry Pi4.

### Getting started:

Requirements:

- A robot that is connected to the internet (e.g. Raspberry Pi)
- A camera that can be streamed to show what the robot is doing (e.g. Raspberry Pi Camera).
- Some understanding of how to control your robot based on received commands (e.g. serial communication with a )

Install Raspberry Pi OS onto the SD card, following instructions from: https://www.raspberrypi.com/software/ (using the "Raspberry Pi Imager" is very easy, it lets you configure login details / Wifi details during image creation)

Once installed, ssh into your Raspberry Pi.

Then on the Pi, please ensure `node`, `yarn`, `ffmpeg`, and `zbar-tools` are available. Example:

```bash
# NodeJS 19
sudo su
curl -fsSL https://deb.nodesource.com/setup_19.x | bash -

# Yarn:
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | tee /usr/share/keyrings/yarnkey.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main" | tee /etc/apt/sources.list.d/yarn.list

apt-get update
apt install -y vim yarn ffmpeg nodejs gcc g++ make git python3-serial zbar-tools libcamera-apps
```

Then setup a `tmpfs` partition at `/var/tmpfs` so the code can read/write files in RAM quickly:

```
sudo mkdir /var/tmpfs
sudo echo "tmpfs /var/tmpfs tmpfs nodev,nosuid,size=10M 0 0" >> /etc/fstab
sudo mount -a
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
ROBOT_ID=abc123 ROBOT_SECRET_KEY=321cba yarn run start
```

### Auto boot

Add this to `/etc/systemd/system/robot.service`

```
[Unit]
Description=robot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/home/pi/v1
Environment=ROBOT_ID=put-your-id-here
Environment=ROBOT_SECRET_KEY=put-your-key-here
ExecStart=yarn run start

[Install]
WantedBy=multi-user.target
```

Then run: `sudo systemctl enable robot` to enable auto boot
Other options:
Manual start: `sudo systemctl start robot`
Status check: `sudo systemctl status robot`
Manual stop: `sudo systemctl stop robot`
Stop from auto boot: `sudo systemctl disable robot`

### Customisation:

Duplicate the `start.js` file into `start-custom.js`, make the required adjustments in `start-custom.js`, and start the client like so:

```
ROBOT_ID=abc123 ROBOT_SECRET_KEY=321cba yarn run start-custom
```
