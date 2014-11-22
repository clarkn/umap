/*global window, $, umap, console */

(function () {
    'use strict';
    function handle_data(channel, payload, uid) {

        console.log(channel, payload, uid);
        $('#data').append(channel + ' : ' + payload + ' : ' + uid + '<br/>');
    }

    function subscribe() {
        // OVERLAYS
        console.log('Subscribe: ' + (new Date()).getTime());
        umap.Eventing.subscribe('map.overlay.create', handle_data);
        umap.Eventing.subscribe('map.overlay.remove', handle_data);
        umap.Eventing.subscribe('map.overlay.hide', handle_data);
        umap.Eventing.subscribe('map.overlay.show', handle_data);
        umap.Eventing.subscribe('map.overlay.update', handle_data);

        // FEATURES
        umap.Eventing.subscribe('map.feature.plot', handle_data);
        umap.Eventing.subscribe('map.feature.plot.url', handle_data);
        umap.Eventing.subscribe('map.feature.unplot', handle_data);
        umap.Eventing.subscribe('map.feature.hide', handle_data);
        umap.Eventing.subscribe('map.feature.show', handle_data);

        // VIEW
        umap.Eventing.subscribe('map.view.zoom', handle_data);
        umap.Eventing.subscribe('map.view.center.overlay', handle_data);
        umap.Eventing.subscribe('map.view.center.feature', handle_data);
        umap.Eventing.subscribe('map.view.center.location', handle_data);
        umap.Eventing.subscribe('map.view.center.bounds', handle_data);
    }

    window.addEventListener('message', function (e) {
        if (e.data === 'ready') {
            subscribe();
        }
    });

}());
