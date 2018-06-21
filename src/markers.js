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

function addMarkers(svg, PORT_PIN_SIZE) {
    var defs = svg.append("defs");
    // real size of marker
    var w = 7;
    var h = 10;
    
    function addMarker(id, arrowTranslate, arrowRotate=0) {
    	var rightArrow = "M 0 4  2 4  2 0  7 5  2 10  2 6  0 6 Z";
        var trans = "";
    
        if (arrowTranslate[0] != 0 || arrowTranslate[1] != 0)
        	trans += "translate(" + arrowTranslate[0] + ", " + arrowTranslate[1] + ")";
    
        if (arrowRotate != 0)
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
    
    var horizYoffet = (PORT_PIN_SIZE[1] - h) * 0.5;
    var horizYoffet2 = (PORT_PIN_SIZE[1] + h) * 0.5;
    
    var vertXOffet = -(PORT_PIN_SIZE[1] - w) * 0.5;
    addMarker("westInPortMarker", [0, horizYoffet]);
    addMarker("westOutPortMarker",[w, horizYoffet2], 180);
    
    addMarker("eastInPortMarker", [w, horizYoffet2], 180);
    addMarker("eastOutPortMarker",[0, horizYoffet]);
    
    addMarker("northInPortMarker", [vertXOffet, -w], 90);
    addMarker("northOutPortMarker",[vertXOffet, 0], 270);
    
    addMarker("southInPortMarker", [vertXOffet, w], 270);
    addMarker("southOutPortMarker",[vertXOffet, 0], 90);
}

function getIOMarker(d) {
    var side = d.properties.portSide;
    var portType = d.direction;
    var marker = PORT_MARKERS[side][portType];
    if (marker === undefined) {
    	throw new Error("Wrong side, portType", side, portType)
    }
    return marker;
}