function loader_subscribe(){

    //Store the features that we have encountered
    var points={};
    
    //Make sure we always use the same ID in the DOM
    var create_feature_id = function(id){
        return "plot_point"+id;
    }
    
    //Generate the HTML to add feature options to a dropdown
    var create_plot_point_html = function(id, name){
        id = create_feature_id(id);
        return "<option value='"+id+"' id='"+id+"'>" + name + "</option>"
    }

    //This takes new features (generally as published) and adds them
    //to the dropdown in the DOM. This allows users to do stuff to 
    //features as encountered
    var update_feature_list=function(payload, uid){
        //Extract important values
        var name=payload.name;
        var id=payload.featureId;
        if (name == "") {
            name = id;
        }
        var oid=payload.overlayId;
        //The domid is the ID of the row that feature has in the DOM
        var domid=String(oid)+"___"+String(id);
        //Create the object that has information on each feature and add it
        //to the storage array
        var finfo={fid: id, oid: oid, domid: domid};
        points[domid]=finfo;
        // Yes, I do want to match all kinds of empty-ish stuff
        if (name == "") {
            name = id;
        }
        
        //Compute the name then add it to the end of the list, removing the same
        //feature from the list if it was already there
        var selid='#'+create_feature_id(domid);
        console.log("Adding (" + name + "," + id + ") to feature list");
                if( $(selid).length )
        {
            $(selid).remove();
        }
        $("#unplot_feature_id").append(create_plot_point_html(domid,name));
    };

    //This function removes the feature from the dropdown list
    var del_from_feature_list=function(payload, uid){
        var id=payload.featureId;
        var oid=payload.overlayId;
        //Identify the name of the feature in the DOM
        var domid=String(oid)+"___"+String(id);
        var selid='#'+create_feature_id(domid);
        delete points[domid];
        //If the feature exists, delete it from the DOM
        if( $(selid).length )
        {
            $(selid).remove();
        }
    };

    
    
    // Plot the feature using data in the widget text box
    $('#map_feature_plot').click(function () {
        var payload = "";
        var name = $("#feature_name").val();
        var id = $("#feature_id").val();
        //Set the format based on the drop down
        if ($("#format").val() === "KML"){
            payload=$("#payload").val();
        } else {
            payload=JSON.parse($("#payload").val());
        }
        //Compute the object, publish it around and add it to the list
        var obj = {
            overlayId: 'loader_widget',
            featureId: id,
            name: name,
            format: $("#format").val(),
            feature: payload
        };
        umap.Eventing.publish('map.feature.plot', obj);
        update_feature_list(obj,"Self");
    });

    // Plot the point using the lat/lng in the text boxes
    $('#map_feature_plot_point').click(function () {
        //get the name & id; 
        var name = $("#feature_name").val();
        var id = $("#feature_id").val();
        //generate the payload based on the lat/lng text boxes
        var payload = {
                "type": "Feature",
                "id": id,
                "geometry": {
                    "type": "Point",
                    "coordinates": [$("#lng").val(), $("#lat").val()]
                },
                "properties": {
                    "name": name,
                    "popupContent": name
                }
            };

        //Compute the object, publish it around and add it to the list
        var obj = {
            overlayId: 'loader_widget',
            featureId: id,
            name: name,
            format: 'geojson',
            feature: payload
        };
        umap.Eventing.publish('map.feature.plot', obj);
        update_feature_list(obj,"Self");
    });
    
    //Plot the data in the URL given in the text box
    $('#map_feature_plot_url').click(function () {
        var name = $("#feature_name").val();
        var id = $("#feature_id").val();
        //Compute the object, publish it around and add it to the list
        var obj = {
            overlayId: 'loader_widget',
            featureId: id,
            name: name,
            format: $("#format").val(),
            url: $("#payload").val(),
        };
        umap.Eventing.publish('map.feature.plot.url', obj);
        update_feature_list(obj,"Self");
     });
    

    //Take the selected feature and unplot it
    $('#unplot_feature').click(function () {
        //Get the ID used in the points dictionary. Get the object 
        var featuredata=$("#unplot_feature_id").val();
        var fobj=points[featuredata.replace('plot_point','')];
        //Get the right object, find it in the DOM and publish the update
        var selid='#'+fobj.domid;
        var featureobj={featureId: fobj.fid, overlayId: fobj.oid};
        console.log("Unplot on " + fobj.fid);
        umap.Eventing.publish('map.feature.unplot', featureobj);
        del_from_feature_list(featureobj, "Self");
     });
    
    //Take the selected feature and unhide(show) it
    $('#unhide_feature').click(function () {
        //Get the ID used in the points dictionary. Get the object 
        var featuredata=$("#unplot_feature_id").val();
        var fobj=points[featuredata.replace('plot_point','')];
        var selid='#'+fobj.domid;
        var featureobj={featureId: fobj.fid, overlayId: fobj.oid};
        console.log("Show on " + fobj.fid);
        umap.Eventing.publish('map.feature.show', featureobj);
     });
        
    //Take the selected feature and hide it
    $('#hide_feature').click(function () {
        //Get the ID used in the points dictionary. Get the object 
        var featuredata=$("#unplot_feature_id").val();
        var fobj=points[featuredata.replace('plot_point','')];
        //Get the right object, find it in the DOM and publish the update
        var selid='#'+fobj.domid;
        var featureobj={featureId: fobj.fid, overlayId: fobj.oid};
        console.log("Hide on " + fobj.fid);
        umap.Eventing.publish('map.feature.hide', featureobj);
     });

    //Take the selected feature and center on it
    $('#center_feature').click(function () {
        //Get the ID used in the points dictionary. Get the object 
        var featuredata=$("#unplot_feature_id").val();
        var fobj=points[featuredata.replace('plot_point','')];
        //Get the right object, find it in the DOM and publish the update
        var selid='#'+fobj.domid;
        var featureobj={featureId: fobj.fid, overlayId: fobj.oid};
        console.log("Center on " + fobj.fid);
        umap.Eventing.publish('map.view.center.feature', featureobj);
     });
    umap.Eventing.subscribe('map.feature.plot', update_feature_list);
    umap.Eventing.subscribe('map.feature.plot.url', update_feature_list);
    umap.Eventing.subscribe('map.feature.unplot', del_from_feature_list);
}