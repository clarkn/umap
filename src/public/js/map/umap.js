var uMap = (function () {

	var map_obj;
	function init(map_type, map_id, map_options) {
		switch (map_type) {
		case "googlev3":
			map_obj = new GoogleMap.getInstance(map_id, map_options);
			break;
		case "esri":
			map_obj = new EsriMap.getInstance(map_id, map_options);
			break;
		default:
			console.log("You entered an invalid map type. We only support: [googlev3, esri] are supported.");
			return null;
		}
		subscribe();
		return map_obj;
	}

	function subscribe() {
	    // OVERLAYS
	    umap.Eventing.subscribe('map.overlay.create', 	map_obj.createOverlay);
	    umap.Eventing.subscribe('map.overlay.remove', 	map_obj.removeOverlay);
	    umap.Eventing.subscribe('map.overlay.hide', 	map_obj.hideOverlay);
	    umap.Eventing.subscribe('map.overlay.show', 	map_obj.showOverlay);
	    umap.Eventing.subscribe('map.overlay.update', 	map_obj.updateOverlay);

	    // FEATURES
	    umap.Eventing.subscribe('map.feature.plot', 	map_obj.plotFeature);
	    umap.Eventing.subscribe('map.feature.plot.url', map_obj.plotUrl);
	    umap.Eventing.subscribe('map.feature.unplot', 	map_obj.unplotFeature);
	    umap.Eventing.subscribe('map.feature.hide', 	map_obj.hideFeature);
	    umap.Eventing.subscribe('map.feature.show', 	map_obj.showFeature);
	    umap.Eventing.subscribe('map.feature.update', 	map_obj.updateFeature);

	    // VIEW
	    umap.Eventing.subscribe('map.view.zoom', 			map_obj.mapZoom);
	    umap.Eventing.subscribe('map.view.center.overlay', 	map_obj.centerOnOverlay);
	    umap.Eventing.subscribe('map.view.center.feature', 	map_obj.centerOnFeature);
	    umap.Eventing.subscribe('map.view.center.location', map_obj.centerOnLocation);
	    umap.Eventing.subscribe('map.view.center.bounds', 	map_obj.centerOnBounds);

	    // STATUS
	    umap.Eventing.subscribe('map.status.view', map_obj.mapViewStatus);
	}

	return init;
})();
