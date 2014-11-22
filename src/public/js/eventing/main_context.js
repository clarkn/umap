/*global $, Porthole, console, _, window */
/*jslint bitwise: true */

(function () {
    'use strict';

    var windowProxies = [];

    /**
     * Generate an rfc4122 version 4 compliant guid.
     * From http://byronsalau.com/blog/how-to-create-a-guid-uuid-in-javascript/
     *
     */
    function createOverlayUid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * @param {message} messageEvent
     *   the message object, which contains the following:
     *     origin:     Protocol and domain origin of the message
     *     data:       Message itself
     *     source:     Window proxy object, useful to post a response
     *     overlayUID: default overlay id for source
     */
    window.onMessage = function (messageEvent) {
        var data = messageEvent.data;
        var i;
        switch (data.action) {
        case "ack":
            for (i = 0; i < windowProxies.length; i++) {
                if (windowProxies[i].proxy === messageEvent.source) {
                    messageEvent.source.post({
                        action: "set_uid",
                        uid: windowProxies[i].uid
                    });
                    break;
                }
            }
            break;
        case "publish":
            for (i = 0; i < windowProxies.length; i++) {
                if (windowProxies[i].proxy !== messageEvent.source) {
                    windowProxies[i].proxy.post(messageEvent);
                }
            }
            break;
        }
    }

    window.addWindowProxy = function (url, frame_id) {
        var windowProxy = new Porthole.WindowProxy(
            url,
            frame_id
        );
        windowProxy.addEventListener(window.onMessage);
        var uid = createOverlayUid();
        windowProxies.push({uid: uid, proxy: windowProxy});
    }

}(window));
