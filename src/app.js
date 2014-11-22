
/**
 * Module dependencies.
 */

var express = require('express');
var sio     = require('socket.io');
var pubsub  = require('./sockets/socket-pubsub.js');
var routes  = require('./routes');
var http    = require('http');
var path    = require('path');

var app = express();
var server, io;

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

/*
 * Set up RESTful URIs.
 */

app.get('/', routes.index);
app.get('/index', routes.index);
app.get('/test', routes.test);
app.get('/loader', routes.loader);
app.get('/logging', routes.logging);
app.get('/console', routes.console);
app.get('/map', routes.map);
app.get('/proxy.html', routes.proxy);

/*
 * Set up the socket pubsub and room management.
 */

server = http.createServer(app);
io = sio.listen(server);
pubsub.socketSetup(io);

/*
 * Crank the gears; let's get this server going.
 */

server.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
