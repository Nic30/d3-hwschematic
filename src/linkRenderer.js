import {default as d3elk} from "./elk/elk-d3";

export function renderLinks(root, edges) {
    var link = root.selectAll(".link")
	  .data(edges)
	  .enter()
	  .append("path")
	  .attr("class", "link")
    var junctionPoints = [];
    // apply edge routes
    link.transition().attr("d", function(d) {
      var path = "";
      if (!d.sections)
          return "";
      if (d.bendpoints || d.sections.length > 1) {
          throw new Error("NotImplemented");
      }
      if(d.junctionPoints)
          d.junctionPoints.forEach(function (jp) {
              junctionPoints.push(jp);
          });
      return d3elk.section2svgPath(d.sections[0]);
    });
    var junctionPoints = root.selectAll(".junction-point")
	  .data(junctionPoints)
	  .enter()
	  .append("circle")
	  .attr("r", "3")
	  .attr("cx", function(d) {
	      return d.x;
	  })
	  .attr("cy", function(d) {
	      return d.y;
	  })
	  .attr("class", "junction-point");

    return link;
}