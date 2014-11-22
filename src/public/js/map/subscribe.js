/*global umap, cmapi */

/**
 * This method needs to be called when the eventing object is ready, so
 * the map can subscribe to the necessary channels.
 */
function umap_subscribe() {
    // OVERLAYS
    umap.Eventing.subscribe('map.overlay.create', cmapi.overlay.create);
    umap.Eventing.subscribe('map.overlay.remove', cmapi.overlay.remove);
    umap.Eventing.subscribe('map.overlay.hide', cmapi.overlay.hide);
    umap.Eventing.subscribe('map.overlay.show', cmapi.overlay.show);
    umap.Eventing.subscribe('map.overlay.update', cmapi.overlay.update);

    // FEATURES
    umap.Eventing.subscribe('map.feature.plot', cmapi.feature.plotFeature);
    umap.Eventing.subscribe('map.feature.plot.url', cmapi.feature.plotURL);
    umap.Eventing.subscribe('map.feature.unplot', cmapi.feature.unplotFeature);
    umap.Eventing.subscribe('map.feature.hide', cmapi.feature.hideFeature);
    umap.Eventing.subscribe('map.feature.show', cmapi.feature.showFeature);
    umap.Eventing.subscribe('map.feature.update', cmapi.feature.updateFeature);

    // VIEW
    umap.Eventing.subscribe('map.view.zoom', cmapi.view.zoom);
    umap.Eventing.subscribe('map.view.center.overlay', cmapi.view.centerOnOverlay);
    umap.Eventing.subscribe('map.view.center.feature', cmapi.view.centerOnFeature);
    umap.Eventing.subscribe('map.view.center.location', cmapi.view.centerOnLocation);
    umap.Eventing.subscribe('map.view.center.bounds', cmapi.view.centerOnBounds);

    // STATUS
    umap.Eventing.subscribe('map.status.view', cmapi.status.mapViewStatus);
}