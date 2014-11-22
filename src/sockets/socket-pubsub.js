var util = require('./util.js');

/*
 * socket.io handlers
 */

exports.socketSetup = function (io) {

io.sockets.on('connection', function (socket) {

    /* We have a new socket! */
    console.log('A socket connected! ' + socket.id);

    /* switch to default room */
    util.joinDefaultRoom(socket);

    /* until the user registers himself, he will be anonymous to other users */
    socket.name = 'anonymous';

    /*
     * ------------------------------------------------------------------------
     * Register socket emit handlers.
     * ------------------------------------------------------------------------
     */

    /*
     * PUBLISH handler.
     *   Archive message, then propogate message to
     *   all users in same room except sender.
     */
    socket.on('publish', function (msg) {

        /* add timestamped message to archive for room */
        util.archive(msg, socket);

        util.log({
            'message': msg.data,
            'from': socket.id,
            'to': socket.room
        });

        /* send message to all users in room except this socket */
        socket.broadcast.to(socket.room).emit('message', msg);
    });

    /*
     * ROOM.GET.NAME handler.
     *   Return current room on `getroom` channel.
     */
    socket.on('room.get.name', function () {
        util.sendCurrentRoom(socket);
    });

    /*
     * ROOM.GET.ALL.NAME handler.
     *  Return list of all rooms on 'rooms' channel.
     */
    socket.on('room.get.all.name', function () {
        var room_names = [],
            rooms_listing = io.sockets.manager.rooms;  // this is an object

        for (room_name in rooms_listing) {
            /* ignore default room, which is empty string */
            if (room_name) {
                stripped_name = room_name.substr(room_name.indexOf(":") + 1);
                room_names.push(stripped_name);
            }
        }

        socket.emit('room.get.all.name', room_names);
    });

    /*
     * ROOM.SWITCH handler.
     *   Switch from current room to new room.
     */
    socket.on('room.switch', function (room) {
        util.switchRoom(room, socket);
    });

    /*
     * USER.SET.NAME handler.
     *   Bind the socket with the name it is registering.
     */
    socket.on('user.set.name', function (name) {
        util.registerUser(name, socket);
    });

    /*
     * USER.GET.NAME handler.
     *   Get the name registered for the socket making this request.
     */
    socket.on('user.get.name', function () {
        socket.emit('user.get.name', socket.name);
    });

    /*
     * USER.GET.ALL.NAME
     *   Get the names of all users in the same room as the socket
     *   making this request.
     */
    socket.on('user.get.all.name', function () {
        var i,
            user_names = [],
            socket_list = io.sockets.clients(socket.room);

        for (i = 0; i < socket_list.length; i++) {
            user_names.push(socket_list[i].name);
        }
        socket.emit('user.get.all.name', user_names);
    });

    /*
     * DISCONNECT handler.
     *   Leave the current room.
     */
    socket.on('disconnect', function () {
        util.leaveRoom(socket);
    });

    /*
     * ACK handler.
     *   Log message receipt acknowledgement from socket.
     */
    socket.on('ack', function (msg) {
        util.log({
            'ack': msg.data,
            'socket': socket.id,
            'topic': msg.topic,
            'sender': msg.uid
        });
    });

});

};
