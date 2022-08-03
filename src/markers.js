var PORT_MARKERS = {
		"WEST": {
			"INPUT": "#westInPortMarker",
			"OUTPUT": "#westOutPortMarker"},
		"EAST": {
			"INPUT": "#eastInPortMarker",
			"OUTPUT": "#eastOutPortMarker"},
		"NORTH": {
			"INPUT": "#northInPortMarker",
			"OUTPUT": "#northOutPortMarker"},
	    "SOUTH": {
	    	"INPUT": "#southInPortMarker" ,
	    	"OUTPUT": "#southOutPortMarker"},
};

export function addMarkers(defs, PORT_PIN_SIZE) {
    // real size of marker
    var w = 7;
    var h = 10;
    
    function addMarker(id, arrowTranslate, arrowRotate=0) {
    	var rightArrow = "M 0 4  2 4  2 0  7 5  2 10  2 6  0 6 Z";
        var trans = "";
    
        if (arrowTranslate[0] !== 0 || arrowTranslate[1] !== 0)
        	trans += "translate(" + arrowTranslate[0] + ", " + arrowTranslate[1] + ")";
    
        if (arrowRotate !== 0)
        	trans += "rotate(" + arrowRotate + ")";
    
        var cont = defs.append("g");
    
        cont
        .attr("id", id)
        .attr("class", "port")
        .append("path")
        .attr("d", rightArrow)
        
        if (trans)
        	cont
            .attr("transform", trans);
    }
    
    var horizYOffset = (PORT_PIN_SIZE[1] - h) * 0.5;
    var horizYOffset2 = (PORT_PIN_SIZE[1] + h) * 0.5;
    
    var vertXOffset = -(PORT_PIN_SIZE[1] - w) * 0.5;
    addMarker("westInPortMarker", [0, horizYOffset]);
    addMarker("westOutPortMarker",[w, horizYOffset2], 180);
    
    addMarker("eastInPortMarker", [w, horizYOffset2], 180);
    addMarker("eastOutPortMarker",[0, horizYOffset]);
    
    addMarker("northInPortMarker", [vertXOffset, -w], 90);
    addMarker("northOutPortMarker",[vertXOffset, 0], 270);
    
    addMarker("southInPortMarker", [vertXOffset, w], 270);
    addMarker("southOutPortMarker",[vertXOffset, 0], 90);
}

export function getIOMarker(d) {
    var side = d.properties.side;
    var portType = d.direction;
    var marker = PORT_MARKERS[side][portType];
    if (marker === undefined) {
    	throw new Error("Wrong side, portType", side, portType)
    }
    return marker;
}