$(function () {
    var frames = [];

    $('iframe').each(function () {
        frames.push(this.id);
    });

    function registerFrame(id) {
        $(id).load(function () {
            document.getElementById(id).contentWindow.setupFrame(PubSub);
        });
    };

    for (frame_id in frames) {
        registerFrame(frames[frame_id]);
        console.log('set up frame with id: ' + frames[frame_id]);
    }

});
