
/**
 * This function is loaded into the global namespace when this script
 * is included on a page. It should be called in order to load the
 * relay object into the global namespace for subsequent use.
 *
 * This function will attempt to connect to the given host. If
 * successful, it registers listeners for a bunch of events on the
 * socket object, sets up the relay object, then attaches it to the
 * appropriate window object for one of: CommonJS, AMD, Browser.
 *
 * @public
 * @param {String} host
 *   the host to connect to (ex: http://localhost:3000).
 * @param {Boolean} secure : https if true, false if http
 */
var loadRelay = function (host, secure) {

/*
 * The root here is the appropriate global context (e.g. window in
 * browser). Factory is the module which follows, which will
 * actually return the relay object. This nice little outer function
 * just attaches the relay object to the appropriate root, accounting
 * for differences between CommonJS, AMD, and a Browser.
 */

(function(root, factory) {
    'use strict';

    // CommonJS
    if (typeof exports === 'object' && module) {
        module.exports = factory();

    // AMD
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    // Browser
    } else {
        root.relay = factory();
    }

}((typeof window === 'object' && window) || this, function() {

    'use strict';

    /**
     * Useful little function to check for object existence.
     * Returns true if object is neither null nor undefined.
     *
     * @private
     * @param {Object} x
     *   object to check existence of.
     */
    var exists = function (x) {
        return x != null;
    };

    /**
     * Utility function to check for an object with no properties.
     * This is handy to avoid passing empty objects around.
     *
     * @private
     * @param {Object} x
     *   object to check for emptiness.
     */
    var empty = function (x) {

        /* empty strings are not objects */
        if (typeof x === "string") {
            return x.trim() ? false : true;
        } else {
            /* no non-inherited properties means empty */
            return Object.getOwnPropertyNames(x).length === 0;
        }
    };

    /**
     * Ensure the socket is connected to the server and throws
     * a `SocketDisconnected` error if not connected.
     *
     * @private
     * @param {Object} socket
     *   the socket to check the connection status of.
     */
    var ensureConnection = function (socket) {
        if (!socket.socket.connected) {
            throw {
                name: 'SocketDisconnected',
                message: 'the socket is not connected to the server',
                level: 'error'
            };
        }
    };

    /**
     * Validate a handler by making sure it is of type `function`.
     * Handlers are used extensively in this module.
     *
     * @param {Function} handler
     *   handler to validate; obviously the type on this one will be
     *   in question by the caller.
     * @throws HandlerNotFunction
     *   if the handler is not of type `function`.
     */
    var validateHandler = function (handler) {
        if (typeof handler !== 'function') {
            throw {
                name: 'HandlerNotFunction',
                message: 'Attempted to subscribe handler which is not a function.',
                level: 'error'
            };
        }
    };

    /**
     * Validate a string by ensuring it is not empty. Throw a
     * 'EmptyString' exception if it is only whitespace.
     *
     * @param {String} str
     *   the string to validate.
     * @throws TypeError
     *   if str is not a string.
     * @throws EmptyString
     *   if the string is only whitespace.
     */
    var checkForEmptyString = function (str, var_name) {
        var var_type = typeof(str);

        if (var_type != 'string') {
            throw {
                name: 'TypeError',
                message: 'Expected string but got ' + var_type + ' instead.',
                level: 'error'
            };
        } else if (empty(str)) {
            throw {
                name: 'EmptyString',
                message: 'The variable "' + var_name + '" is only whitespace.',
                level: 'error'
            };
        }
    };

    /**
     * Creates token generators, which use a simple
     * increment by one method to generate tokens
     * from 0 onwards.
     *
     * Tokens take the form t_0, t_1, ...
     *
     * @private
     * @return {Function}
     *   generator which returns tokens sequentially, memoizing state.
     */
    function makeTokenGenerator() {
        var lastToken = -1;

        return function tokenGenerator () {
            return 't_' + (++lastToken);
        };
    }

    /*
     * This is the actual token generator which will be used
     * for subscriptions.
     */

    var tokenGenerator = makeTokenGenerator();

    /* if socket.io library is not loaded, we're donzo */
    if (!exists(io)) {
        console.log('[critical]: io undefined, required for relay');
        throw {
            name: 'UnmetDependency',
            message: 'socket.io required to load relay',
            level: 'critical'
        };
    }

    /*
     * Establish connection to host.
     *
     * The 'force new connection flag' allows multiple socket
     * connections to be established with the same browser instance.
     * This creates support for multiple widgets in the same tab or
     * various uMap widgets in different tabs.
     */
    secure = !secure ? false : secure; // If secure isn't defined then false else secure.
    var socket = io.connect(host, {secure: secure, 'force new connection':true});

    /*
     * Set up initial callbacks for status monitoring.
     */

    socket.on('connect', function () {
        console.log('Socket connected! Global pub/sub is a go.');

        /* dispatch a new event to indicate the socket has connected. */
        var socketConnectedEvent = new Event('socketConnected');
        window.dispatchEvent(socketConnectedEvent);

        /**
         * Set up socket to receive global publishes.
         * Messages from server are rejected if they have no topic.
         */
        socket.on('message', function (msg) {

            /* fail if message has no topic */
            if (!exists(msg.topic)) {
                console.log(['[warning]: Received ill-formed message!',
                    '\n[TOPIC]:', msg.topic,
                    '\n[DATA]:', msg.data,
                    '\n[UID]:', msg.uid
                ].join(' '));
            } else {
                var deliver = createDeliveryFunction(
                    msg.topic,
                    msg.data,
                    msg.uid
                );

                /* asynchronously deliver the message to all subscribers */
                setTimeout(deliver, 0);

                /* send acknowledgement of message receipt to the server */
                socket.emit('ack', msg);
            }
        });

    });

    socket.on('disconnect', function () {
        console.log('Disconnected from server! This is bad.');
    });

    /*
     * This is the main data structure, which holds our list of
     * topics, subscriber tokens, and the registered callbacks.
     * Specifically, the first layer of keys consists of topics.
     * For each topic, there can be multiple tokens. Each token
     * is associated with a callback.
     *
     * This model allows subscribers to register more than one
     * callback and unsubscribe only one callback from a topic
     * using its associated token.
     */

    var subscribers = {};

    /**
     * Create the actual function which handles delivery to all
     * subscribers of the topic. The returned function can be
     * used as a paremeter in asynchronous functions such as
     * `setTimeout`.
     *
     * @private
     * @param {String} topic
     *   the topic to delivery to.
     * @param {Object} data
     *   the data passed to the registered callbacks for this topic.
     * @param {String} uid
     *   the uid of the sender of this message
     * @return {Function}
     *   delivers the data to all subscribers when called.
     */
    function createDeliveryFunction(topic, data, uid) {
        return function () {
            var subscriber_list, subscriber;

            /* if there are no subscribers for this topic, simply return */
            if (!subscribers.hasOwnProperty(topic)) {
                console.log([
                    'received message', data,
                    'but no one is subscribed to topic:', topic
                ].join(' '));
                return;
            }

            subscriber_list = subscribers[topic];
            for (subscriber in subscriber_list) {
                subscriber_list[subscriber](topic, data, uid);
            }
        };
    }

    /**
     * Subscribe to messages from the host.
     * Register handler callback to be called on message receipt.
     *
     * @public
     * @param {String} topic
     *   the name of the topic to subscribe to.
     * @param {Function} handler
     *   callback to execute when this topic is published to.
     * @return
     *   false when the handler is not a function, else the token
     *   which the callback is registered with; this token can
     *   subsequently be used for unsubscription.
     * @throws HandlerNotFunction
     *   if the handler is not of type `function`.
     */
    function subscribe(topic, handler) {
        var token;
        validateHandler(handler);

		/* topic is not registered yet */
		if (!subscribers.hasOwnProperty(topic)) {
			subscribers[topic] = {};
		}

        token = tokenGenerator();
        subscribers[topic][token] = handler;

        /* return token for unsubscribing */
        return token;
    }

    /**
     * Unsubscribe from a subscription using the subscription token.
     *
     * @public
     * @param {String} token
     *   string returned from call to `subscribe`.
     * @return
     *   true if unsubscription was successful; false if the token
     *   was not found and no callback was unsubscribed.
     * @throws InvalidToken
     *   if the token is not of type `string`.
     */
    function unsubscribe(token) {
        var topic;

        /* token must be a string */
        if (typeof token !== "string") {
            throw {
                name: 'InvalidToken',
                message: 'token must be of type string',
                token: token
            };
        }

        /* search all subscribers for token */
        for (topic in subscribers) {
            if (subscribers[topic].hasOwnProperty(token)) {
                delete subscribers[topic][token];
                return true;
            }
        }
        return false;
    }

    /**
     * Publish to a topic with the given data.
     * Fails silently if the socket
     *
     * @public
     * @param {String} topic
     *   the topic to publish to.
     * @param {Object} data
     *   the data to pass to subscribers.
     * @param {String} sender_id
     *   the id of the publisher.
     * @throws SocketDisconnected
     *   if the socket is not connected to the server.
     * @throws EmptyData
     *   if the data object is empty.
     */
    function publish(topic, data, sender_id) {
        ensureConnection(socket);

        /* don't publish empty data */
        if (empty(data)) {
            throw {
                name: 'EmptyData',
                message: 'publish attempted with empty data object',
                level: 'error'
            };
        }

        /* server will be listening for this */
        socket.emit('publish', {
            topic: topic,
            data: data,
            uid: sender_id
        });
    }

    /**
     * Listen on a response from the server.
     * This simply exposes the `socket.on` function.
     *
     * @public
     * @param {String} channel
     *   the channel to listen on.
     * @param {Function} handler
     *   the callback to be executed when a message comes in on the
     *   channel.
     * @throws HandlerNotFunction
     *   if the handler is not of type `function`.
     */
    function listen(channel, handler) {
        validateHandler(handler);
        socket.on(channel, handler);
    }

    /**
     * Change the relay's room. The server only sends message to this
     * relay from other relays in the same room, and publishes from
     * this relay are only broadcasted to other relays in the same
     * room.
     *
     * @public
     * @param {String} room_name
     *   the name of the room to switch to.
     * @throws SocketDisconnected
     *   if the socket is not connected to the server.
     */
    function switchRoom(room_name) {
        ensureConnection(socket);
        socket.emit('room.switch', room_name);
    }

    /**
     * Get the name of the current room.
     *
     * @param {Function} handler
     *   callback which takes a room (string).
     * @throws SocketDisconnected
     *   if the socket is not connected to the server.
     * @throws HandlerNotFunction
     *   if the handler is not of type `function`.
     */
    function getCurrentRoom(handler) {
        ensureConnection(socket);
        validateHandler(handler);
        socket.once('room.get.name', handler);
        socket.emit('room.get.name', '');
    }

    /**
     * Request a list of all active rooms from server.
     *
     * @public
     * @param {Function} handler
     *   callback that takes resulting list of the form:
     *   [name1, name2, ..., nameN].
     * @throws SocketDisconnected
     *   if the socket is not connected to the server.
     * @throws HandlerNotFunction
     *   if the handler is not of type `function`.
     */
    function getAllRooms(handler) {
        ensureConnection(socket);
        validateHandler(handler);
        socket.once('room.get.all.name', handler);
        socket.emit('room.get.all.name', '');
    }


    /**
     * Register a name for the current user. If the user is already
     * registered, this will overwrite that name.
     *
     * @param {String} name
     *   the name to register for the current user.
     * @throws SocketDisconnected
     *   if the socket is not connected to the server.
     * @throws TypeError
     *   if name is not a string.
     * @throws EmptyString
     *   if name is only whitespace.
     */
    function setUsername(name) {
        ensureConnection(socket);
        checkForEmptyString(name, 'name');
        socket.emit('user.set.name', name);
    }

    /**
     * Retrieve the registered name for this user.
     *
     * @returns {String}
     *   the name of the user; will be 'anonymous' if not registered.
     * @throws SocketDisconnected
     *   if the socket is not connected to the server.
     * @throws HandlerNotFunction
     *   if the handler is not of type `function`.
     */
    function getUsername(handler) {
        ensureConnection(socket);
        validateHandler(handler);
        socket.once('user.get.name', handler);
        socket.emit('user.get.name', '');
    }

    /**
     * Retreive the list of users in the current room.
     *
     * @returns {Array of Strings}
     *   array of names of other users in the current room; users who
     *   have not registered will be named 'anonymous'.
     * @throws SocketDisconnected
     *   if the socket is not connected to the server.
     * @throws HandlerNotFunction
     *   if the handler is not of type `function`.
     */
    function getAllUsers(handler) {
        ensureConnection(socket);
        validateHandler(handler);
        socket.once('user.get.all.name', handler);
        socket.emit('user.get.all.name', '');
    }

    /*
     * Expose the public interface for relay.
     */

    var relay = {

        /* main pubsub functionality */
        subscribe: subscribe,
        unsubscribe: unsubscribe,
        publish: publish,
        listen: listen,

        /* room management functionality */
        switchRoom:     switchRoom,
        getCurrentRoom: getCurrentRoom,
        getAllRooms:    getAllRooms,
        getAllUsers:    getAllUsers,
        setUsername:    setUsername,
        getUsername:    getUsername
    };
    return relay;

}));


/*
 * Once the socket is connected, trigger an event to indicate the
 * relay has loaded.
 */
window.addEventListener('socketConnected', function () {
    var relayLoadedEvent = new Event('relayLoaded');
    window.dispatchEvent(relayLoadedEvent);
});

};
