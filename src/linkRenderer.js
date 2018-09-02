import {default as d3elk} from "./elk/elk-d3";

export function renderLinks(root, edges) {
    var linkWrap = root.selectAll(".link-wrap")
      .data(edges)
      .enter()
      .append("path")
      .attr("class", "link-wrap");

    var link = root.selectAll(".link")
      .data(edges)
      .enter()
      .append("path")
      .attr("class", "link");

    var junctionPoints = [];
    // apply edge routes
    linkWrap
      //.transition()
      .attr("d", function(d) {
      var path = "";
      if (!d.sections) {
    	  d._svgPath = "";
          return "";
      }
      if (d.bendpoints || d.sections.length > 1) {
          throw new Error("NotImplemented");
      }
      if(d.junctionPoints)
          d.junctionPoints.forEach(function (jp) {
              junctionPoints.push(jp);
          });
      d._svgPath = d3elk.section2svgPath(d.sections[0]);
      return d._svgPath;
    });
    link
    //.transition()
      .attr("d", function(d) {
    	return d._svgPath;
      });
    
    var junctionPoint = root.selectAll(".junction-point")
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

    return [link, linkWrap, junctionPoint];
}