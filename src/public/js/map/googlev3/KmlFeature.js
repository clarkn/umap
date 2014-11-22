/*global google, _, map*/
var KmlFeature = (function () {

    /**
     * @constructor
     * Constructor to create a new KML Feature
     *
     * @param {String} feature_id   the id of the feature
     * @param {String} feature_name name of the new feature
     */
    var Feature = function (feature_id, feature_name, overlay_id) {
        this.id = feature_id;
        this.name = feature_name;
        this.format = "KML";
        this.overlayId = overlay_id;
    }

    /**
     * Load the kml data via a string of kml data.
     *
     * @param  {String} feature_str  kml string data
     * @param  {Boolean} visible     hide/show the new feature data.
     */
    Feature.prototype.load = function (feature_str, visible) {
        var that = this;
        $.post('https://horwitzja.com/parser/', {
            uid: that.overlayId,
            kml_data: feature_str
        }, function (data) {
            if(data.error) {
                console.log(data.error);
                return;
            }
            that.loadUrl('https://horwitzja.com/parser/'+data.url, visible);
        });
    }


    /**
     * Load kml data via a url.
     *
     * @param  {String} url     url where the kml file is located
     * @param  {Boolean} visible hide/show the new feature data.
     */
    Feature.prototype.loadUrl = function (url, visible) {
        // TODO: Listener for click events.
        this.feature = new google.maps.KmlLayer({url: url, preserveViewport: true});

        if (this.feature.status && this.feature.status !== "ok") {
            console.log("KML feature status: " + this.feature.status);
            return;
        }

        this.setVisiblity(visible);

        // Setup feature selection listener
        var that = this;
        google.maps.event.addListener(that.feature, 'click', function (event) {
            var selectedId, selectedName;

            if (_(event).has('featureData')) { // KML id/name
                selectedId = event.featureData.id;
                selectedName = event.featureData.name;
            } else { //Geojson id/name
                selectedId = that.feature.properties.id;
                selectedName = that.feature.properties.name;
            }
            umap.Eventing.publish(
                "map.feature.selected",
                {
                    selectedId: selectedId,
                    selectedName: selectedName,
                    overlayId: that.overlayId,
                    featureId: that.id
                }
            );
        });
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

    Feature.prototype.bounds = function () {
        return this.feature.getDefaultViewport();
    }

    /**
     * Set the visibility of the feature on the map.
     * @param {Boolean} visible visbility to set the feature.
     */
    Feature.prototype.setVisiblity = function (visible) {
        // If the current visibility is the same then do nothing.
        if (_(this.visible).isEqual(visible)) {
            return;
        }
        this.visible = visible;
        // Set the feature to be visible to the map or not.
        this.feature.setMap(this.visible ? map : null);
    }

    // Give access to constructur
    return Feature;
}());


