DI2E Open Source Common Map Widget API Implementation (uMap)
=======
oscmapi
=======

To clone the repo:

    git clone https://git.c4i.gmu.edu/oscmap.git

If you have SSL verification errors:

    git config http.sslVerify false

### Setup

Install node on Ubuntu (also installs `npm` and `nodejs-dev`):

    sudo add-apt-repository ppa:chris-lea/node.js
    sudo apt-get update
    sudo apt-get install python-software-properties python g++ make nodejs

Install other dependencies using `npm`:

    cd src
    npm install

You may also find it useful to install
[nodemon](https://github.com/remy/nodemon), which automatically restarts the
server for you when you change critical files. Using npm:

    npm install -g nodemon

You should then run the server with:

    nodemon app.js

If you wish to only have nodemon restart on changes that require a restart
then perform the following steps: 

    Create a file called 'nodemon.json' in the same directory as app.js
    Paste the following into the file and restart nodemon

    {
      "verbose": true,
      "ignore": ["public/*"]
    }

Note that you may still need to manually clear your cache for public resource
files (js/css/html) to get updated in the page you're looking at. The shortcut
for this is:

> <Shift><Ctrl><Del>

