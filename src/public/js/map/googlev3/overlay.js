var Overlay = (function () {
    'use strict';
    var Overlay = function (overlayId, name, parentId, visible) {
        // Set instance variables pertaining to this overlay
        this._overlayId = overlayId;
        this._parentId = parentId;
        this._name = name;
        // Default visibility to true if argument isn't present.
        this._visible = _(visible).isUndefined() ? true : visible;
        this._features = {};
    }

    /**
     * Checks whether or not the current overlay is visible.
     *
     * @return {Boolean} true if visible, false if hidden
     */
    Overlay.prototype.isVisible = function () {
        return this._visible;
    }

    /**
     * Change the visibility of the overlay
     *
     * @param {Boolean} visible  show if true, hide if false
     */
    Overlay.prototype.setVisibility = function (visible) {
        if (_(this._visible).isEqual(visible)) {
            return;
        }

        this._visible = visible;

        if (visible) {
            this.show();
        } else {
            this.hide();
        }
    }

    ///////////////////////////////////////////////////
    //                  Overlays                     //
    ///////////////////////////////////////////////////

    /**
     * Removes all the features from the map in this overlay.
     *
     */
    Overlay.prototype.remove = function () {
        this._visible = false; // not really needed, but done anyways.
        _(this._features).each(function (element) {
            element.remove();
        });
    }

    /**
     * Update the current overlay's name and parentId
     *
     * @precondition if a new parent id exists the overlay has been created
     * @param  {String} name     new name for the overlay
     * @param  {String} parentId new parent overlay UID
     */
    Overlay.prototype.update = function (name, parentId) {
        this._parentId = _(parentId).isUndefined() ? this._parentId : parentId;
        this._name = _(name).isUndefined() ? this._name : name;
    }

    /**
     * Show all the features on the map in this overlay.
     *
     */
    Overlay.prototype.show = function () {
        this._visible = true;
        _(this._features).each(function (element) {
            element.show();
        });

    }

    /**
     * Hide all the features on the map in this overlay.
     *
     */
    Overlay.prototype.hide = function () {
        this._visible = false;
        _(this._features).each(function (element) {
            element.hide();
        });
    }

    /**
     * //TODO: Dynamically update the bounds as features are updated / removed.
     *
     * This method returns the bounds for all the features within the current overlay.
     *
     * @return {LatLngBounds} Google maps LatLngBounds object.
     */
    Overlay.prototype.bounds = function () {
        if (_(this._features).isEmpty()) {
            return null;
        } else {
            var bounds = new google.maps.LatLngBounds();
            _(this._features).each( function (feature) {
                bounds.union(feature.bounds());
            });
            return bounds;
        }
    }

    ///////////////////////////////////////////////////
    //                  Features                     //
    ///////////////////////////////////////////////////

    /**
     * This method adds a feature to the current overlay via a url.
     *
     * @param {String} id     feature id for the new feature
     * @param {String} name   The name for the new feature
     * @param {String} format Feature type for the new feature
     * @param {String} url    The url location for the new feature
     * @param {Int} zoom      Integer value to zoom to.
     */
    Overlay.prototype.addFeatureUrl = function (id, name, format, url, zoom) {
        var feature;
        if (_(format).isEqual("geojson")) {
            // Create geo json feature object & load data.
            feature = new GeoJsonFeature(id, name, this._overlayId);
            feature.loadUrl(url, this._visible);

            // Check if feature id previously exists, if so remove old one.
            if (_(this._features).has(id)) {
                this._features[id].remove();
            }
            // Store feature in data store.
            this._features[id] = feature;
        } else if (_(format).isEqual("KML")) {
            // Create KML object & load data.
            feature = new KmlFeature(id, name, this._overlayId);
            feature.loadUrl(url, this._visible);

            // Check if feature id previously exists, if so remove old one.
            if (_(this._features).has(id)) {
                this._features[id].remove();
            }
            // Store feature in data store
            this._features[id] = feature;
        }
        // TODO: handle zoom
    }

    /**
     * Add a new feature to the overlay via either a GeoJSON object or string
     * representation of kml or geojson.
     *
     * @param {String} id     feature id for the new feature
     * @param {String} name   The name for the new feature
     * @param {String} format Feature type for the new feature
     * @param {[type]} feature_obj Either GeoJSON or KML string.
     * @param {Int}    zoom      Integer value to zoom to.
     * @param {[type]} readOnly    who knows what this does
     */
    Overlay.prototype.addFeature = function (id, name, format, feature_obj, zoom, readOnly) {
        var feature;
        if (_(format).isEqual("geojson")) {
            feature = new GeoJsonFeature(id, name, this._overlayId);
            feature.load(feature_obj, this._visible);
        } else if (_(format).isEqual("KML")) {
            feature = new KmlFeature(id, name, this._overlayId);
            feature.load(feature_obj, this._visible);
        }

        // Check if feature id previously exists, if so remove old one.
        if (_(this._features).has(id)) {
            this._features[id].remove();
        }
        // Store feature in data store
        this._features[id] = feature;
        // TODO: handle zoom and read only
        this.readOnly = _(readOnly).isUndefined() ? false : readOnly;
    }

    /**
     * This method is utilized to add an existing feature object created
     * by another overlay to the current overlay.
     *
     * The use case for this is when a feature gets updated with a new overlay.
     * There is no reason to create the object twice, just re-use it.
     *
     * @param {google.maps.X} feature_obj google maps object
     */
    Overlay.prototype.addFeatureObject = function (feature_obj) {
        var feature_id = feature_obj.id;
        if (_(this._features).has(feature_id)) {
            this._features[feature_id].remove();
        }
        feature_obj.overlayId = this._overlayId;
        this._features[feature_id] = feature_obj;
        feature_obj.setVisibility(this._visible);
        // TODO: handle zoom
    }

    /**
     * Remove the passed in feature id from the current overlay.
     *
     * @param  {String} id Feature id to be removed.
     */
    Overlay.prototype.removeFeature = function (id) {
        if(_(this._features).has(id)) {
            this._features[id].remove();
            delete this._features[id];
        }
    }

    /**
     * Update a feature with a new name and/or new overlay id.
     *
     * @precondition the new overlay has been created
     *
     * @param  {[type]} id           Feature id to update
     * @param  {[type]} name         New name for the feature, if exists.
     * @param  {[type]} newOverlayId The new overlay id for the feature, if exists.
     * @return {null | google.maps.x} if new overlay return feature else null
     */
    Overlay.prototype.updateFeature = function (id, name, newOverlayId) {
        if (!_(this._features).has(id)) {
            return null; // feature doesn't exist to update...
        }

        var feature = this._features[id];
        if(!_(name).isUndefined()) {
            feature.name = name;
        }
        // New overlay exists, remove feature and return it for new overlay.
        if(newOverlayId) {
            delete this._features[id];
            return feature;
        }

        return null;
    }

    /**
     * Show the given feature.
     *
     * @param  {String} id feature id to show
     */
    Overlay.prototype.showFeature = function(id) {
        if (!_(this._features).has(id)) {
            return;
        }
        this._features[id].show();
    }

    /**
     * Hide the given feature.
     *
     * @param  {String} id feature id to hide
     */
    Overlay.prototype.hideFeature = function (id) {
        if (!_(this._features).has(id)) {
            return;
        }
        this._features[id].hide();
    }

    /**
     * Get the bounds for the feature.
     *
     * @param  {google.maps.LatLngBounds} google map bounds object
     */
    Overlay.prototype.getFeatureBounds = function (id) {
        if (!_(this._features).has(id)) {
            return;
        }
        return this._features[id].bounds();
    }

    // Expose constructor for Overlay object.
    return Overlay;
}());
