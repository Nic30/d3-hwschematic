import {section2svgPath} from "./elk/elk-d3-utils.js";

export function renderLinks(root, edges) {
    let junctionPoints = [];

    let link = root.selectAll(".link")
      .data(edges)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", function(d) {
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
          d._svgPath = section2svgPath(d.sections[0]);
          return d._svgPath;
      });

    let linkWrap = root.selectAll(".link-wrap")
      .data(edges)
      .enter()
      .append("path")
      .attr("class", function (d) {
          let cssClass;
           if (d.hwMeta.parent) {
	           cssClass = d.hwMeta.parent.hwMeta.cssClass;
           } else {
	           cssClass = d.hwMeta.cssClass
           }
           if (typeof cssClass !== 'undefined') {
	           return "link-wrap " + cssClass;
           } else {
	           return "link-wrap";
           }
      })
      .attr("style", function (d) {
           if (d.hwMeta.parent) {
	           return d.hwMeta.parent.hwMeta.cssStyle;
           } else {
	           return d.hwMeta.cssStyle
           }
      })
      .attr("d", function(d) {
          return d._svgPath;
      });

    let junctionPoint = root.selectAll(".junction-point")
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