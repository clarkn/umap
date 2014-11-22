/*global it, describe, chai, GeoJsonFeature, beforeEach*/
var expect = chai.expect;

describe('GeoJsonFeature', function () {
    describe('constructor', function () {
        it('should have geojson format', function () {
            var json = new GeoJsonFeature();
            expect(json.format).to.equal('geojson');
        });

        it('should have a feature id', function () {
            var json = new GeoJsonFeature("feature_id");
            expect(json.id).to.equal("feature_id");
        });

        it('should have a feature name', function () {
            var json = new GeoJsonFeature("id", "feature_name");
            expect(json.name).to.equal("feature_name");
        });

        it('should have an overlay id', function () {
            var json = new GeoJsonFeature("id", "name", "overlay_id");
            expect(json.overlayId).to.equal("overlay_id");
        });
    });

    describe('load geojson object', function () {
        var json;

        beforeEach(function () {
            json = new GeoJsonFeature();
        });

        it('should default to hidden', function () {
            json.load({});
            expect(json.visible).to.be.false;
        });

        it('should be hidden', function () {
            json.load({}, false);
            expect(json.visible).to.be.false;
        });

        it('should be a point', function () {
            var point = { "type": "Point", "coordinates": [100.0, 0.0] };
            json.load(point, true);
            expect(json.visible).to.be.true;
            expect(json.feature.properties.type).to.equal("Point");
        });

        it('should be 2 points (multipoint)', function () {
            var points = {
                "type": "MultiPoint",
                "coordinates": [ [100.0, 0.0], [101.0, 1.0] ]
            };
            json.load(points, true);

            expect(json.visible).to.be.true;
            expect(json.feature).to.have.length(2);
            expect(json.feature[0].properties.type).to.equal("Point");
            expect(json.feature[1].properties.type).to.equal("Point");
        });

        it('should be a polygon', function () {
            var polygon = {
                "type": "Polygon",
                "coordinates": [
                    [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0] ]
                ]
            };
            json.load(polygon, true);

            expect(json.visible).to.be.true;
            expect(json.feature.properties.type).to.equal("Polygon");
        });

        it('should be a multiline string (2 lines)', function () {
            var mutlilineString = {
                "type": "MultiLineString",
                "coordinates": [
                    [ [100.0, 0.0], [101.0, 1.0] ],
                    [ [102.0, 2.0], [103.0, 3.0] ]
                ]
            };
            json.load(mutlilineString, true);

            expect(json.visible).to.be.true;
            expect(json.feature).to.have.length(2);
            expect(json.feature[0].properties.type).to.equal("LineString");
            expect(json.feature[1].properties.type).to.equal("LineString");
        });
    });
});
