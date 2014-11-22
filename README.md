DI2E Open Source Common Map Widget API Implementation (uMap)

Defense Intelligence Information Enterprise (DI2E) Open Source Common Map Widget
API (CMAPI) Implementation: This project is to implement the CMAPI in an
environment outside of the Ozone Widget Framework using different communication
models to evaluate the API and its robustness.

Code was produced by a team of GMU students participating in a semester
course.

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
