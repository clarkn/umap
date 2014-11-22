var map;

var GoogleMap = (function () {
	'use strict';

	var instance;
	var overlays = {};


	function init(map_id, map_options) {
		if (!map_id) {
			console.log("Map id for the div is required");
			return;
		}

		if (!map_options) {
			map_options = {
				zoom: 8,
				center: new google.maps.LatLng(38,-77)
			};
		}

	    map = new google.maps.Map(document.getElementById(map_id), map_options);

	    // Setup listeners for zoom and drag
	    setupZoomListener();
    	setupDragListener();

    	return {
    		// Overlay channels
    		createOverlay: createOverlay,
    		removeOverlay: removeOverlay,
    		hideOverlay: hideOverlay,
    		showOverlay: showOverlay,
    		updateOverlay: updateOverlay,

    		// Feature channels
    		plotFeature: plotFeature,
    		plotUrl: plotUrl,
            unplotFeature: unplotFeature,
    		hideFeature: hideFeature,
    		showFeature: showFeature,
    		updateFeature: updateFeature,
    		featureSelected: featureSelected,
    		featureDeselected: featureDeselected,

    		// View channels
    		mapClicked: mapClicked,
    		centerOnBounds: centerOnBounds,
    		centerOnOverlay: centerOnOverlay,
    		centerOnFeature: centerOnFeature,
            centerOnLocation: centerOnLocation,
    		mapZoom: mapZoom,

    		// Status channels
    		mapViewStatus: mapViewStatus,
    		requestStatus: requestStatus,
    		respondWithMapFormatStatus: respondWithMapFormatStatus,
    		respondWithMapAboutStatus: respondWithMapFormatStatus,
    		respondWithMapSelectedStatus: respondWithMapSelectedStatus
    	};

	}

	// Helper methods to convert between meters and zoom levels in google maps.
	// Magic numbers come from JC2... who knows where they come from.
	var getRange = function (zoom) {
		return 35200000 / (Math.pow(2, zoom));
	};

	var getZoom = function (range){
        return  Math.round(Math.log(35200000 / range) / Math.log(2));
    };

    /**
     * Find children takes in an overlay ID and finds all the children overlay
     * id's, if any exist.
     *
     * @param  {String} overlay_id: Overlay ID to find children of
     * @return {Array<String>} Return array of overlay ids, including original
     */
    var _findChildren = function (id) {
    	var children = [];
        var updated_overlays = _(overlays).keys();

        function getChildren(id) {
            children.push(id);
            _(updated_overlays).each(function (overlay_id) {
                var overlay = overlays[overlay_id];
                if (_(id).isEqual(overlay._parentId)) {
                    getChildren(overlay_id);
                }
            });
        }
        getChildren(id);
        return children;
    };

	// Client listener methods for clicking
	window.setupZoomListener = function () {
	    window.umap.zoomListener = google.maps.event.addListener(map, 'zoom_changed', function (event) {
	        var zoom = map.getZoom();
	        zoom = getRange(zoom);
	        umap.Eventing.publish('map.view.zoom', {
	            range: zoom
	        }, umap.Eventing.uid);
	    });
	};

	window.removeZoomListener = function () {
	    window.umap.zoomListener.remove();
	};

	window.setupDragListener = function () {
	    window.umap.dragListner = google.maps.event.addListener(map, 'drag', function (event) {
	        var center = map.getCenter();

	        var zoom = map.getZoom();
	        zoom = getRange(zoom);

	        umap.Eventing.publish('map.view.center.location', {
	            location: {
	                lat: center.lat(),
	                lon: center.lng()
	            },
	            zoom: zoom
	        }, umap.Eventing.uid);
	    });
	};

	window.removeDragListener = function () {
	    window.umap.dragListner.remove();
	};

    /**
     * Create an overlay into which data can be aggregated.
     *
     * channel = 'map.overlay.create'
     * payload = {name: (optional), overlayId: (optional), parentId: (optional)}
     */
    var createOverlay = function (payload, sender_uid) {
	    var id;
        // Set uid as per specification
        if (_(payload).has('overlayId')) {
            id = payload.overlayId;
        } else if (_(payload).has('name')) {
            id = payload.name;
        } else {
            id = sender_uid;
        }

        // if overlay already exists, exit
        if (_(overlays).has(id)) {
            console.log('overlay with id ' + id + 'already exists');
            return;
        }

        // check for parentId.
        if (_(payload).has('parentId')) {
            // create parent if it does not exist
            if (!_(overlays).has(payload.parentId)) {
                createOverlay({
                    overlayId: payload.parentId
                }, sender_uid);
            }
        }

        overlays[id] = new Overlay(id, payload.name, payload.parentId);
    };


    /**
     * Remove an entire overlay from the map.
     * If no overlay with overlayId exists, delete default overlay.
     * If no default overlay exists, no operation is performed.
     *
     * channel = 'map.overlay.remove'
     * payload = {overlayId (optional)}
     */
    var removeOverlay = function (payload, sender_uid) {
        var id = _(payload).has('overlayId') ? payload.overlayId : sender_uid;

        if (!_(overlays).has(id)) {
            console.log('no overlay with id ' + id + ' exists');
            return;
        }
        var children = _findChildren(id);
        _(children).each(function (overlay) {
            overlays[overlay].remove();
            delete overlays[overlay];
        });
    };

    /**
     * Hide an existing overlay on the map.
     *
     * channel = 'map.overlay.hide'
     * payload = {overlayId}
     *
     */
    var hideOverlay = function (payload, sender_uid) {
        var id = _(payload).has('overlayId') ? payload.overlayId : sender_uid;

        if (!_(overlays).has(id)) {
            console.log('Overlay doesnt exist to hide: ' + id);
            return;
        }

        var children = _findChildren(id);
        _(children).each(function (overlay) {
            overlays[overlay].hide();
        });
    };

    /**
     * Show an existing overlay on the map. This does nothing if the
     * overlay is already showing.
     *
     * channel = 'map.overlay.show'
     * payload = {overlayId}
     *
     */
    var showOverlay = function (payload, sender_uid) {
        var id = _(payload).has('overlayId') ? payload.overlayId : sender_uid;

        if (!_(overlays).has(id)) {
            console.log('Overlay doesnt exist to show: ' + id);
            return;
        }
        var children = _findChildren(id);
        _(children).each(function (overlay) {
            overlays[overlay].show();
        });
    };

    /**
     * Update an existing overlay.
     *
     * channel = 'map.overlay.update'
     * payload = {name (optional),
     *            overlayId (optional),
     *            parentId (optional)}
     */
    var updateOverlay = function (payload, sender_uid) {
        var id = _(payload).has('overlayId') ? payload.overlayId : sender_uid;

        if (!_(overlays).has(id)) {
            console.log('Overlay doesnt exist ' + id);
            return;
        }

        var overlay = overlays[id];

        if (_(payload).has('parentId')) {
            var parentId = payload.parentId;
            if (!_(overlays).has(parentId)) {
                createOverlay({
                    overlayId: parentId
                }, sender_uid);
            }
            updateOverlay(payload.name, parentId);
        }
    };

    /**
     * Plot feature data on the map.
     *
     * channel = 'map.feature.plot'
     * payload = {overlayId: (optional), featureId: (required), name: (optional),
     *       format: (optional), feature: (required), zoom: (optional),
     *       readOnly: (optional)}
     */
    var plotFeature = function (payload, sender_uid) {
        //console.log(payload);
        var overlayId = _(payload).has('overlayId') ? payload.overlayId : sender_uid;
        // Create overlay id
        if (!_(overlays).has(overlayId)) {
            createOverlay({overlayId: overlayId}, sender_uid);
        }
        // Defualt format is KML, so if format doesn't exist in payload then set it to KML
        var format = _(payload).has('format') ? payload.format : 'KML';
        var overlay = overlays[overlayId];
        overlay.addFeature(payload.featureId, payload.name, format, payload.feature);
    };

    /**
     * Plot feature data on the map obtained from a URL.
     *
     * channel = 'map.feature.plot.url'
     * payload = {overlayId, featureId, featureName, format, url, zoom}
     */
    var plotUrl = function (payload, sender_uid) {
		console.log('map.feature.plot.url');
        var overlayId = _(payload).has('overlayId') ? payload.overlayId : sender_uid;

        // Create overlay id
        if (!_(overlays).has(overlayId)) {
            createOverlay({overlayId: overlayId}, sender_uid);
        }

        // Defualt format is KML, so if format doesn't exist in payload then set it to KML
        var format = _(payload).has('format') ? payload.format : 'KML';

        var overlay = overlays[overlayId];
        overlay.addFeatureUrl(payload.featureId, payload.name, format, payload.url, payload.zoom);
    };

    /**
     * Remove feature data from the map.
     *
     * channel = 'map.feature.unplot'
     * payload = {overlayId (optional), featureId (required)}
     */
    var unplotFeature = function (payload, sender_uid) {
        // Retrieve overlay and then the feature to remove.
        var overlayId = _(payload).has('overlayId') ? payload.overlayId : sender_uid;

        if (!_(overlays).has(overlayId)) {
            return;
        }

        var overlay = overlays[overlayId];
        overlay.removeFeature(payload.featureId);
    };

    /**
     * Hide an existing feature on the map.
     * This does nothing if the feauture is already hidden.
     *
     * channel = 'map.feature.hide'
     * payload = {overlayId, featureId}
     */
    var hideFeature = function (payload, sender_uid) {
        // Retrieve overlay and then the feature to remove.
        var overlayId = _(payload).has('overlayId') ? payload.overlayId : sender_uid;

        if (!_(overlays).has(overlayId)) {
            return;
        }

        var overlay = overlays[overlayId];
        overlay.hideFeature(payload.featureId);
    };

    /**
     * Show previously hidden feature data on the map.
     * This does nothing if the feature data is already showing.
     *
     * channel = 'map.feature.show'
     * payload = {overlayId, featureId, zoom}
     */
    var showFeature = function (payload, sender_uid) {
        // Retrieve overlay and then the feature to remove.
        var overlayId = _(payload).has('overlayId') ? payload.overlayId : sender_uid;

        var overlay = overlays[overlayId];
        if (!_(overlays).has(overlayId)) {
            return;
        }
        overlay.showFeature(payload.featureId);
    };

    /**
     * {overlayId:  (optional), featureId:  (required), name:   (optional),
     *      newOverlayId:   (optional)}
     *
     * @param  {[type]} payload    [description]
     * @param  {[type]} sender_uid [description]
     * @return {[type]}            [description]
     */
    var updateFeature = function (payload, sender_uid) {
        var overlayId = _(payload).has('overlayId') ? payload.overlayId : sender_uid;
        var newOverlay = _(payload).has('newOverlayId');

        if (!_(overlays).has(overlayId)) {
            return;
        }

        var overlay = overlays[overlayId];

        // Update the feature. If it has a new overlay it's removed and returned.
        var feature = overlay.updateFeature(payload.featureId, payload.name, newOverlay);

        // If there is a new overlay then we must create it if it doesn't exist.
        if (newOverlay && !_(overlays).has(payload.newOverlayId)) {
            createOverlay({
                overlayId: payload.newOverlayId
            }, sender_uid);
        }

        // Add feature to new overlay.
        if (newOverlay && feature !== null) {
            overlay = overlays[payload.newOverlayId];
            overlay.addFeatureObject(feature);
        }
    };

    /**
     * Trigger selection of a feature on the map.
     * Subsequent calls to 'map.status.selected' will include this feature
     * until it is deselected. The message is ignored if this feature is
     * already selected.
     *
     * channel = 'map.feature.selected'
     * payload = {selectedId, selectedName, featureId, overlayId}
     */
    var featureSelected = function (payload, sender_uid) {
        console.log('not implemented yet');
        // Center on the feature...passed
    };

    /**
     * Deselect a feature on the map.
     * The message is ignored if the feature is not selected.
     *
     * channel = 'map.feature.deselected'
     * payload = {deSelectedId, deSelectedName, featureId, overlayId}
     */
    var featureDeselected = function (payload, sender_uid) {
        console.log('not implemented yet');
    };

    /**
     * Zoom the map to a particular range.
     *
     * channel = 'map.view.zoom'
     * payload = {range}
     */
    var mapZoom = function (payload, sender_uid) {
        removeZoomListener();
        var range = (_(payload.range).isString()) ? parseInt(payload.range, 10) : payload.range;
        var zoom = getZoom(range);
        map.setZoom(zoom);
        setupZoomListener();
    };

    /**
     * Center the map on a particular overlay.
     *
     * channel = 'map.view.center.overlay'
     * payload = {overlayId, zoom}
     */
    var centerOnOverlay = function (payload, sender_uid) {
        var overlayId = _(payload).has('overlayId') ? payload.overlayId : sender_uid;

        if (!_(overlays).has(overlayId)) {
            return;
        }

        var bounds = overlays[overlayId].bounds();
        map.fitBounds(bounds);
    };

    /**
     * Center the map on a particular feature, or on a given range.
     *
     * channel = 'map.view.center.feature'
     * payload = {overlayId, featureId, zoom}
     */
    var centerOnFeature = function (payload, sender_uid) {
        var overlayId = _(payload).has('overlayId') ? payload.overlayId : sender_uid;

        if (!_(overlays).has(overlayId)) {
            return;
        }

        var overlay = overlays[overlayId];
        var bounds = overlay.getFeatureBounds(payload.featureId);

        map.fitBounds(bounds);
    };

    /**
     * Center the map on a particular location,
     * either as close as possible or to a given range.
     *
     * channel  = 'map.view.center.location'
     * payload  = {location, zoom}
     * location = {lat, lon}
     */
    var centerOnLocation = function (payload) {
        removeDragListener();
        removeZoomListener();

        map.setCenter(new google.maps.LatLng(payload.location.lat, payload.location.lon));

        if (_(payload.zoom).isEqual('auto')) {
            console.log('auto'); //TODO: What to do with auto?
        } else if (_(payload).has('zoom')) {
            var range = _(payload.zoom).isString() ? parseFloat(payload.zoom) : payload.zoom;
            zoom = getZoom(range);
            map.setZoom(zoom);
        }
        setupDragListener();
        setupZoomListener();
        // Else: no zoom
    };

    /**
     * Center the map on a particular bounding box,
     * either as close as possible to the bounds or to a given range.
     *
     * channel = 'map.view.center.bounds'
     * payload = {bounds, zoom}
     * bounds  = {southWest: {lat, lon}, northEast: {lat, lon}}
     */
    var centerOnBounds = function (payload) {
        var sw, ne, latlngbounds;
        var bounds = payload.bounds;

        sw = new google.maps.LatLng(bounds.southWest.lat, bounds.southWest.lon);
        ne = new google.maps.LatLng(bounds.northEast.lat, bounds.northEast.lon);

        latlngbounds = new google.maps.LatLngBounds();
        latlngbounds.extend(sw);
        latlngbounds.extend(ne);

        map.fitBounds(latlngbounds);

        if (_(payload).has('zoom')) {
            var zoom = _(payload.zoom).isString() ? parseFloat(payload.zoom) : payload.zoom;
            map.setZoom(zoom);
        }
    };

    /**
     * This is the channel the map uses to report where user clicks.
     * This function should actually listen for map events and publish them
     * to the global pub/sub object.
     *
     * channel = 'map.view.clicked'
     * payload = {lat:  (required), lon:    (required), button: (required), type:
                    (required), keys:[] (required)}
     */
    var mapClicked = function (payload) {
        //TODO: What do we do with this here!??!?!
        //console.log('not implemented yet');
    };

    /**
     * Request the status of the map from the map.
     * The result gets sent out on the associated channel.
     *
     * channel = 'map.status.request'
     * payload = {types}
     *
     * types: list of strings identifying which status messages are being
     *        requested. Allowable types are 'view', 'format', and 'about'.
     *        If omitted, all status messages will be published.
     */
    var requestStatus = function (payload) {
        console.log('not implemented yet');
    };

    /**
     * Publish a 'view' status response to the global pub/sub object.
     *
     *
     * channel = 'map.status.view'
     * payload = {requester (optional), bounds, center, range}
     * bounds  = {southWest: {lat, lon}, northEast: {lat, lon}}
     * center  = {lat, lon}
     */
    var mapViewStatus = function (payload) {
        if (_(payload).has('requester')) {
            var bounds = map.getBounds();
            var northEast = bounds.getNorthEast();
            var southWest = bounds.getSouthWest();
            var center = map.getCenter();
            var range = getRange(map.getZoom());

            umap.Eventing.publish('map.status.view',{
                bounds: {
                    southWest: {
                        lat: southWest.lat(),
                        lon: southWest.lng()
                    },
                    northEast: {
                        lat: northEast.lat(),
                        lon: northEast.lng()
                    }
                },
                center: {
                    lat: center.lat(),
                    lon: center.lng()
                },
                range: range
            });
        } else {
            removeDragListener();
            removeZoomListener();
            map.setCenter(new google.maps.LatLng(payload.center.lat, payload.center.lon));
            map.setZoom(getZoom(payload.range));
            setupDragListener();
            setupZoomListener();
        }

    };

    /**
     * Publish a 'format' status response to the global pub/sub object.
     *
     * channel = 'map.status.format'
     * payload = {formats}
     *
     * example payload: {formats: ['kml', 'geojson', 'wms']}
     */
    var respondWithMapFormatStatus = function () {
        console.log('not implemented yet');
    };

    /**
     * Publish a 'about' status response to the global pub/sub object.
     *
     * channel = 'map.status.about'
     * payload = {version, type, widgetName}
     *
     * version: The version numbers of the Common Map Widget API this map
     *          widget supports.
     *
     * type: The type of map in the map widget.
     *       Allowable values are “2-D,” “3-D,” or “other.”
     */
    var respondWithMapAboutStatus = function () {
        console.log('not implemented yet');
    };

    /**
     * Publish a 'selected' status response to the global pub/sub object.
     * 'selected' status is a list of currently selected features.
     *
     * channel = 'map.status.selected'
     * payload = {overlayId, selectedFeatures}
     * selectedFeatures = [{featureId, selectedId, selectedName}]
     */
    var respondWithMapSelectedStatus = function () {
        console.log('not implemented yet');
    };

	return {
	    // Always create a new Singleton instance
	    getInstance: function (map_id, map_options) {
	      instance = init(map_id, map_options);
	      return instance;
	    }
  	};

})();
