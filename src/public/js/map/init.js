/*global window, umap, $, google, console */

var map;
var control_key, shift_key, alt_key;

function setupZoomListener() {
    window.umap.zoomListener = google.maps.event.addListener(map, 'zoom_changed', function (event) {
        var zoom = map.getZoom();
        zoom = cmapi.getRange(zoom);
        umap.Eventing.publish('map.view.zoom', {
            range: zoom
        }, umap.Eventing.uid);
    });
}

function removeZoomListener() {
    window.umap.zoomListener.remove();
}

function setupDragListener() {
    window.umap.dragListner = google.maps.event.addListener(map, 'drag', function (event) {
        var center = map.getCenter();

        var zoom = map.getZoom();
        zoom = cmapi.getRange(zoom);

        umap.Eventing.publish('map.view.center.location', {
            location: {
                lat: center.lat(),
                lon: center.lng()
            },
            zoom: zoom
        }, umap.Eventing.uid);
    });
}

function removeDragListener() {
    window.umap.dragListner.remove();
}

function initmap() {
    'use strict';

    var mapOptions = {
        center: new google.maps.LatLng(35.04267, -80.66252),
        zoom: 8
    };

    map = new google.maps.Map(document.getElementById('map-canvas'),
        mapOptions);
    /*
        This is helper code for map.view.clicked to determine if cntrl, shift or alt keys are pressed.
    */

    control_key = shift_key = alt_key = false;

    window.onkeydown = function (e) {
        control_key = e.ctrlKey;
        shift_key = e.shiftKey;
        alt_key = e.altKey;
    };

    window.onkeyup = function (e) {
        control_key = e.ctrlKey;
        shift_key = e.shiftKey;
        alt_key = e.altKey;
    };

    setupZoomListener();
    setupDragListener();


    // Left click listener
    google.maps.event.addListener(map, 'click', function (event) {
        var keys = [];
        if (control_key) {
            keys.push('ctrl');
        }
        if (alt_key) {
            keys.push('alt');
        }
        if (shift_key) {
            keys.push('shift');
        }
        if (keys.length === 0) {
            keys.push('none');
        }

        umap.Eventing.publish('map.view.clicked', {
            lat: event.latLng.A,
            lon: event.latLng.k,
            button: 'left',
            type: 'single',
            keys: keys
        });
    });

    // Double left click listener
    google.maps.event.addListener(map, 'dblclick', function (event) {
        var keys = [];

        if (control_key) {
            keys.push('ctrl');
        }
        if (alt_key) {
            keys.push('alt');
        }
        if (shift_key) {
            keys.push('shift');
        }
        if (keys.length === 0) {
            keys.push('none');
        }

        umap.Eventing.publish('map.view.clicked', {
            lat: event.latLng.A,
            lon: event.latLng.k,
            button: 'left',
            type: 'dobule',
            keys: keys
        });
    });

    // Right click listener
    google.maps.event.addListener(map, 'rightclick', function (event) {
        var keys = [];

        if (control_key) {
            keys.push('ctrl');
        }
        if (alt_key) {
            keys.push('alt');
        }
        if (shift_key) {
            keys.push('shift');
        }
        if (keys.length === 0) {
            keys.push('none');
        }

        umap.Eventing.publish('map.view.clicked', {
            lat: event.latLng.A,
            lon: event.latLng.k,
            button: 'right',
            type: 'single',
            keys: keys
        });
    });
}

$(document).ready(function () {
    'use strict';
    initmap();
});