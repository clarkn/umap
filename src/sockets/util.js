/*
 * Socket.io has default room management, but we want persistence
 * and have some usability requirements to meet, so we're backing
 * up all of the room management goodness in Redis.
 *
 * This utility module helps extract away the details of this in
 * case Redis needs to be switched out for another data store in
 * the future, or in case the particular manner of performing this
 * backup needs to be changed.
 */


/*
 * Set up redis host and port, then connect.
 * Defaults are:
 *   port: 6379
 *   host: "127.0.0.1"
 */
var redis = require('redis'),
    redis_host = "127.0.0.1",
    redis_port = 6379,
    redis_server = redis_host + ":" + redis_port,
    client = redis.createClient(redis_port, redis_host);

/*
 * General purpose error handler - catches unaccounted for errors.
 */
client.on('error', function (err) {
    console.log('Error: ' + err);
});


/* ------------------------------------------------------------------
 * ROOM PREFIX MANAGEMENT UTILITIES
 *
 * Since everything is being stored in the same database in Redis, it
 * is important to prefix key names in order to avoid conflicts.
 * ------------------------------------------------------------------
 */

/**
 * Create a prefixing function that takes string arguments and
 * prepends a prefix to it.
 *
 * Note that it does not check if the prefix is already appended, so
 * it will happily continue to append the same prefix to a string if
 * called repeatedly on the same string.
 *
 * @private
 * @param {String} prefix
 *   the prefix the returned function will prepend to args.
 * @returns {Function}
 *   a function that will prepend the prefix to any string
 *   key passed to it.
 */
var keyPrefixer = function (prefix) {
    return function (key) {
        return prefix + key;
    };
};

/**
 * Create a prefix removing function that will take strings and
 * remove the given prefix from the string. If the string does not
 * have the given prefix, the function won't do anything.
 *
 * @private
 * @param {String} prefix
 *   the prefix the returned function will remove from args.
 * @returns
 *   a function that will strip the prefix from the start
 *   of string key arguments passed to it.
 */
var keyStripper = function (prefix) {
    return function (key) {
        return key.replace(prefix, "");
    };
};


var prependRoomPrefix = keyPrefixer('room:');
var stripRoomPrefix = keyStripper('room:');
var prependArchivePrefix = keyPrefixer('archive:');
var stripArchivePrefix = keyStripper('archive:');

/*
 * ------------------------------------------------------------------
 * END ROOM PREFIX MANAGEMENT UTILITIES
 * ------------------------------------------------------------------
 */

/*
 * We're gonna need a default room.
 */

var default_room = prependRoomPrefix('default');

/**
 * Logger function which takes an object composed of key/value
 * pairs of the form:
 *     title: content
 * and outputs a message to the console of the form:
 *     [TITLE]: content
 * for each key/value pair in the object.
 *
 * @public
 * @param {Object} obj
 *   object to pull log message from.
 */
var log = function (obj) {
    var info, key;

    info = [''];
    for (key in obj) {
        info.push([
            '[', key.toUpperCase(), ']: ', obj[key]
        ].join(''));
    }
    console.log(info.join('\n'));
};
/* export after definition so function name is global to this module */
exports.log = log;

/**
 * General purpose error/result handler, for use in redis
 * function callbacks.
 *
 * @private
 * @param {String} room
 *   name of the room the socket making the call to redis is in.
 * @param {String} socket_id
 *   unique id which identifies the socket making the call to
 *   redis.
 * @param {String} func_name
 *   the name of the function in which the redis call is made.
 * @return {Function}
 *   a function which takes the err, result pair from the redis
 *   call and logs the resulting information to the console.
 */
var redisHandler = function (room, socket_id, func_name) {
    return function (err, result) {
        var toBeLogged = {
            'redis': redis_server,
            'callback': func_name,
            'room': room,
            'socket': socket_id
        };
        if (err) {
            toBeLogged['error'] = err;
        } else if (result) {
            toBeLogged['result'] = result;
        }
        log(toBeLogged);
    };
};

/**
 * Message archiver: save message to redis sorted set.
 * Rank by timestamp; archive by room.
 *
 * @public
 * @param {String} msg
 *   the message to be archived.
 * @param {Object} socket
 *   the socket on which the message arrived.
 */
exports.archive = function (msg, socket) {
    client.zadd(
        prependArchivePrefix(socket.room),
        (new Date()).getTime(),
        msg,
        redisHandler(socket.room, socket.id, 'archive')
    );
};

/**
 * Leave the current room. This should only be called when a
 * socket is disconnecting from the server. Otherwise, the socket
 * will be in the default room while still connected and may end
 * up receiving a bunch of junk.
 *
 * @public
 * @param {Object} socket
 *   the socket which will be leaving its current room.
 */
exports.leaveRoom = function (socket) {
    socket.leave(socket.room);
    socket.room = "";

    /* update redis to reflect change */
    client.srem(socket.room, socket.id,
        redisHandler(socket.room, socket.id, 'disconnect'));
};

/**
 * Switch from the current room to another room and update Redis
 * records to reflect the change.
 *
 * @public
 * @param {String} new_room
 *   unique name of the room to switch to.
 * @param {Object} socket
 *   the socket which is requesting a room switch.
 */
exports.switchRoom = function (new_room, socket) {
    var new_room = prependRoomPrefix(new_room);

    log({
        'socket': socket.id + ' is switching rooms',
        'from': socket.room,
        'to': new_room
    });

    /* socket.io operations: the actual switch */
    socket.leave(socket.room);
    socket.join(new_room);
    socket.room = new_room;

    /* keep accurate records of room state in redis */
    client.smove(socket.room, new_room, socket.id, redisHandler(
        new_room, socket.id, 'switchRoom'));
};

/**
 * Join the default room.
 *
 * @param {object} socket
 *   the socket which is joining the default room.
 */
exports.joinDefaultRoom = function (socket) {
    console.log(socket.id + ' joining the default room');
    socket.join(default_room);
    socket.room = default_room;

    /* keep records in redis */
    client.sadd(default_room, socket.id, redisHandler(
        default_room, socket.id, 'joinDefaultRoom'));
};

/**
 * Bind a name for the given user and back it up in Redis.
 *
 * @param {String} name
 *   name to bind to the user.
 * @param {Object} socket
 *   socket to register the name with.
 */
exports.registerUser = function (name, socket) {
    console.log(socket.id + ' registered as ' + name);
    socket.name = name;
    /*
     * Oh no... looks like we can't actually back this up if we're
     * tying the names to socket ids. If a user disconnects, the
     * socket id will change, so this mapping will be useless.
     *
     * The setup should be altered to use user tokens or something
     * like that instead of socket ids...
     *
     * ...something for the future.
     */
};

/**
 * Return the name of the current room. Strip the prefix.
 *
 * @param {Object} socket
 *   socket to register the name with.
 */
exports.sendCurrentRoom = function (socket) {
    stripped_room_name = socket.room.substr(socket.room.indexOf(":") + 1);
    socket.emit('room.get.name', stripped_room_name);
};

