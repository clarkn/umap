/*global Porthole, _, console */

(function (window) {
    "use strict";

    var umap = {};

    umap.Eventing = (function () {

        /**
         * Channels are similar to topics in a traditional pubsub scheme.
         * Subscribers register handler callbacks for a particular
         * channel, and when a message is published to that channel, the
         * callback is executed.
         *
         * Channels take the form:
         *     channel_name: callback
         *
         * @private
         * @type {Object}
         */
        var channels = {};

        /**
         * Default overlay ID that is used to identify each widget.
         *
         * @public
         * @type {String}
         */
        var uid = null;

        var windowProxy = null;
        /**
         * Determines whether or not the eventing object is ready.
         * Eventing is ready only once the uid & windowProxy have been set.
         *
         * @private
         * @return {Boolean} true if ready; false otherwise
         */
        function isReady() {
            // The main context must have sent back a UID.
            // umap.Eventing.init must have been called.
            return !(_(uid).isEmpty() || _(windowProxy).isEmpty());
        }

        /**
         * Return true if object is neither null nor undefined.
         *
         * @private
         * @param {Object} obj: object to evaluate the existence of.
         */
        function exists(obj) {
            return !_(obj).isEmpty();
        }

        /**
         * Handler for messages received from the server relay.
         * This function will call the appropriate map handler
         * function, then propogate the message locally.
         *
         * To be clear, this message will have originated from
         * a publish in another browser, gone through the server,
         * and arrived here, to be handled by this function.
         *
         * @public
         * @param {String} channel
         *   the channel which the message was published on.
         * @param {Object} message
         *   the data of the publish.
         * @param {String} uid
         *   the uid of the widget that published this message.
         */
        function onServerReceive(channel, message, sender_uid) {
            var callback;

            if (!isReady()) {
                console.log("[error]: message received from server" +
                    " before Eventing has been initialized");
                return;
            }

            // Exit it widget isn't subscribed (shouldn't ever happen from server);
            if (!_(channels).has(channel)) {
                return;
            }
 
            // call appropriate map handler
            callback = channels[channel];
            callback(message, sender_uid);

            // Post message to main context to distribute to other widgets
            windowProxy.post({
                action: 'publish',
                channel: channel,
                message: message,
                uid: sender_uid
            });
        }

        /**
         * @private
         * @param {message} messageEvent
         *   the message object, which contains the following:
         *     origin: Protocol and domain origin of the message
         *     data: Message itself
         *     source: Window proxy object, useful to post a response
         *     uid: Widget UID
         */
        function onMessage(messageEvent) {
            var data, callback;

            // Retrieve data from main context
            messageEvent = messageEvent.data;

            // If action is set uid then set default uid and exit
            if (_(messageEvent.action).isEqual("set_uid")) {
                uid = messageEvent.uid;
                var eventingReady = new Event('eventingReady');
                window.dispatchEvent(eventingReady);
                return;
            }
            // Strip main context to get original sender message
            data = messageEvent.data;

            // Exit if widget is not subscribed to channel
            if (!_(channels).has(data.channel)) {
                return;
            }

            // Retrieve and call registered callback function
            callback = channels[data.channel];
            callback(data.message, uid);

            // If the widget has a relay established, then send to relay.
            if (exists(window.relay)) {
                setTimeout(window.relay.publish(data.channel, data.message, uid), 0);
            }
        }

        /**
         * Initialize the windowProxy object on the window object.
         *
         * @public
         * @param {String} server_url: Domain where proxy html is located.
         * @param {Boolean} secure: (optional) secure sockets = true, unsecure = false
         */
        function init(server_url, secure) {
            if (_(server_url).isEmpty()) {
                console.log("[error]: the server url must not be empty");
                return;
            }
            /*jshint validthis:true */
            windowProxy = new Porthole.WindowProxy(server_url);
            // Register an event handler to receive messages
            windowProxy.addEventListener(onMessage);
            // Send acknolwedgement to main context to receive uid.
            windowProxy.post({
                action: 'ack'
            });

            // If the widget has a relay established, then send to relay.
            if (typeof window.loadRelay === 'function') {
                window.loadRelay('/', secure);
                // TODO: add this check to is ready if the load relay exists.
            }
        }

        /**
         * Subscribe a handler to a particular channel.  Note that
         * this will also unsubscribe any previously subscribed
         * handlers. In other words, each channel can only have one
         * callback subscribed at a time.
         *
         * @public
         * @param {String} channel: name of channel to subscribe to.
         * @param {Function} callback to execute for the subscribed channel
         * @return {Boolean} true if subscribed, false is error
         */
        function subscribe(channel, callback) {
            if (typeof callback !== 'function') {
                console.log("[error]: you must pass a function as a callback");
                return false;
            }
            channels[channel] = callback;
            if (exists(window.relay)) {
                window.relay.subscribe(channel, onServerReceive);
            }
            return true;
        }

        /**
         * Unsubscribe the previously subscribed callback from
         * the given channel.
         *
         * @public
         * @param {String} channel: Name of channel to unsubscribe from.
         * @return {Boolean} Returns false if not subscribed, true when removed
         */
        function unsubscribe(channel) {
            if (_(channels).has(channel)) {
                delete channels[channel];
                return true;
            }
            return false;
        }

        /**
         * Publish a message to the given channel.
         * Returns true if published; otherwise, false.
         *
         * @public
         * @param {String} channel: name of channel to publish to.
         * @param {String} message: the message to publish.
         * @return {Boolean}
         */
        function publish(channel, message) {
            /*jshint validthis:true */
            /* return false if no windowProxy is available to post on */
            if (!isReady()) {
                console.log("[error]: eventing hasn't been initialized");
                return false;
            }

            /* post the message with format expected by onMessage */
            windowProxy.post({
                action: 'publish',
                channel: channel,
                message: message,
                uid: uid
            });

            /*
             * If the widget has the server relay, then send the message
             * to the server.
             *
             * Asynchronous calback.
             */
            if (exists(window.relay)) {
                setTimeout(window.relay.publish(channel, message, uid), 0);
            }

            return true;
        }

        // function send(receiver, channel, message) {
        //     if (!isReady()) {
        //         console.log("[error]: eventing hasn't been initialized");
        //         return false;
        //     }
        //
        //     windowProxy.post({
        //         action: 'send',
        //         receiver: receiver,
        //         channel: channel,
        //         message: message,
        //         uid: uid
        //     });
        // }

        /*
         * Expose public interface.
         */
        return {
            /* variables */
            uid: uid,

            /* methods */
            publish: publish,
            subscribe: subscribe,
            unsubscribe: unsubscribe,
            init: init,
            // send: send
        };

    }());

    /*
     * Support testing in node.js by binding the `umap` object to the
     * global window context.
     */
    if (window.exports !== undefined) {
        window.exports.umap = umap;
    } else {
        window.umap = umap;
    }

}(this));
