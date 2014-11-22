var GeoJsonFeature = (function() {
    'use strict';

    /**
     * @constructor
     * The constructor for the geo json feature.
     *
     * @param {String} feature_id   feature id for the feature
     * @param {String} feature_name name of the feature
     * @param {String} overlay id of the feature
     */
    var Feature = function (feature_id, feature_name, overlay_id) {
        this.id = feature_id;
        this.name = feature_name;
        this.overlayId = overlay_id;
        this.format = "geojson";
    }

    /**
     * Load geojson data via a url.
     *
     * @param  {String} url     url where the geojson file is located
     * @param  {Boolean} visible hide/show the new feature data.
     */
    Feature.prototype.loadUrl = function (url, visible) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        var that = this;
        xhr.onload = function () {
            //TODO: note #2 & note #3
            var feature_str = $.parseJSON(this.responseText);
            that.load(feature_str, visible);
        };
        xhr.send();
    }

    Feature.prototype._setupFeatureBounds = function () {
        this._bounds = [];
        this._getBounds(this.feature);
        var bounds = new google.maps.LatLngBounds();
        _(this._bounds).each(function (bound) {
            bounds.union(bound);
        });
        this._bounds = bounds;
    }

    /**
     * Load the geojson data via a string of geojson data.
     *
     * @param  {Object} feature_obj geojson object data
     * @param  {Boolean} visible     hide/show the new feature data.
     */
    Feature.prototype.load = function (feature_obj, visible) {
        this.visible = visible ? true : false;

        // If the feature is a string representation then get the json object.
        feature_obj = _(feature_obj).isString() ? $.parseJSON(feature_obj) : feature_obj;

        this.feature = new GeoJSON(feature_obj);

        if (_(this.feature.parseJson).isFunction()) {
            return; // Error parsing geojson
        }

        // Setup the bounds on the feature.
        this._setupFeatureBounds();

        // If the visibility is hidden then don't waste time hiding it. Aint no one got time for that.
        if (!this.visible) {
            return;
        }

        // If we got this var then we need to set the visibility of the feature to true;
        this._changeFeatureVisibility(this.feature, true, true);

        // TODO: Listener for click events.
    }

    /**
     * Remove the feature from the map.
     *
     */
    Feature.prototype.remove = function () {
        this.setVisiblity(false);
    }

    /**
     * Hide the feature from the map.
     *
     */
    Feature.prototype.hide = function () {
        this.setVisiblity(false);
    }

    /**
     * Show the feature on the map.
     *
     */
    Feature.prototype.show = function () {
        this.setVisiblity(true);
    }

    /**
     * Return the bounds for the given feature.
     *
     * @return {google.maps.LatLngBounds} Google latlng bounds object
     */
    Feature.prototype.bounds = function () {
        // This condition shouldn't happen, but who knows.
        if (_(this._bounds).isEmpty()) {
            this._setupFeatureBounds();
        }
        return this._bounds;
    }

    /**
     * Set the visibility of the feature on the map.
     * @param {Boolean} visible visbility to set the feature.
     */
    Feature.prototype.setVisiblity = function (visible) {
        // Visiblity is the same, so don't do anything.
        if (_(this.visible).isEqual(visible)) {
            return;
        }

        this.visible = visible;

        this._changeFeatureVisibility(this.feature, this.visible);
    }

    /**
     * @private
     * This is a helper function that hides or shows the features within
     * a feature collection.
     *
     * @param  {Object} features single feature || array of features
     * @param  {Boolean} visible  hide or show the features in the collection
     * @param  {Boolean} create   if creating the features add event listeners
     */
    Feature.prototype._changeFeatureVisibility = function (features, visible, create) {
        var overlayId = this.overlayId;
        var featureId = this.id;

        if (_(features).isArray()) {
            var that = this;
            _(features).each(function (feature) {
                // A geojson feature produced by geojson.js will always have properties field.
                if (_(feature).has('properties')) {
                    // Set feature visibility.
                    feature.setMap(visible ? map : null);
                    if (create) { // If we are creating the feature add event listener.
                        that._addEventListener(feature, overlayId, featureId);
                    }
                } else {
                    // We have a nested feature array, so recursively call to handle.
                    that._changeFeatureVisibility(feature, visible, create);
                }
            });
        } else {
            if (_(features).has('properties')) {
                // Set feature visibility.
                features.setMap(visible ? map : null);
                if (create) { // If we are creating the feature add event listener.
                    this._addEventListener(features, overlayId, featureId);
                }
            }
        }

    }

    /**
     * This method adds a click event listener to the feature object to be
     * published on the map.feature.selected channel.
     *
     * @param {google.maps.X} feature   google maps object
     * @param {String} overlayId overlay id for the feature
     * @param {String} featureId feature id for this features document
     */
    Feature.prototype._addEventListener = function (feature, overlayId, featureId) {
        google.maps.event.addListener(feature, 'click', function (event) {
            var selectedId, selectedName;

            if (_(event).has('featureData')) { // KML id/name
                selectedId = event.featureData.id;
                selectedName = event.featureData.name;
            } else { //Geojson id/name
                selectedId = feature.properties.id;
                selectedName = feature.properties.name;
            }

            umap.Eventing.publish(
                "map.feature.selected",
                {
                    selectedId: selectedId,
                    selectedName: selectedName,
                    overlayId: overlayId,
                    featureId: featureId
                }
            );

        });
    }

    /**
     * @private
     *
     * This is a private helper method that is used to recursively search
     * through the sub-features to gather all the bounds.
     *
     * @param  {Object} features The current subset of features at a given time
     */
    Feature.prototype._getBounds = function (features) {
        // If the feature is an array we need to parse its coordinates
        if (_(features).isArray()) {
            var that = this;
            _(features).each(function (feature) { // If it has sub arrays do recursion
                if (_(feature).isArray()) {
                    that._getBounds(feature);
                } else { // Store bounds for feature
                    that._bounds.push(feature.properties.bounds);
                }
            });
        } else {
            this._bounds.push(features.properties.bounds);
        }
    }

    // Give access to constructur
    return Feature;

}());
