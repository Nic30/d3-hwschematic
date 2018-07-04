import * as d3 from "d3";
import {addMarkers, getIOMarker} from "./markers"; 
import {default as d3elk} from "./elk/elk-d3";

/**
 * Returns whether the sides of ports are fixed.
 * 
 * @see PortSide
 * @return true if the port sides are fixed
 */

function PortConstraints_isSideFixed(val) {
   return val == "FREE" || val != "UNDEFINED"
}

/**
 * apply hideChildren flag no node
 **/
function applyHideChildren(n) {
    if (n.hideChildren) {
        if (n.children !== undefined) {
            n.__children = n.children;
            n.__edges = n.edges;
            delete n.children;
            delete n.edges;
        }
    } else {
        if (n.__children !== undefined) {
            n.children = n.__children;
            n.edges = n.__edges;
            delete n.__children;
            delete n.__edges;
        }
    }
    (n.children || []).forEach(applyHideChildren)
}

/**
 * HwScheme builds scheme diagrams after bindData(data) is called
 * 
 * @param svg:
 *            root svg element where scheme will be rendered
 * @note do specify size of svg to have optimal result
 */
export default class HwSchematic {
    constructor(svg) {
        this.svg = svg;
        this.PORT_PIN_SIZE = [7, 13];
        this.PORT_HEIGHT = this.PORT_PIN_SIZE[1];
        this.CHAR_WIDTH = 7.55;
        this.CHAR_HEIGHT = 13;
        this.NODE_MIDDLE_PORT_SPACING = 20;
        this.MAX_NODE_BODY_TEXT_SIZE = [400, 400];
        // top, right, bottom, left
        this.BODY_TEXT_PADDING = [15, 10, 0, 10];

        addMarkers(svg, this.PORT_PIN_SIZE);
        this.root = svg.append("g");
        this.layouter = new d3elk();
    }
        
    widthOfText(text) {
        if (text)
            return text.length * this.CHAR_WIDTH;
        else
            return 0;
    }

    /**
     * Split bodyText of one to lines and resolve dimensions of body text
     * 
     * @param d
     *            component node
     */
    initBodyTextLines(d) {
        var max = Math.max
        if (d.bodyText) {
            if (typeof d.bodyText === "string") {
                d.bodyText = d.bodyText.split("\n");
            }
            var bodyTextW = 0;
            d.bodyText.forEach(function (line) {
                bodyTextW = max(bodyTextW, line.length);
            })
            bodyTextW *= this.CHAR_WIDTH;
            var bodyTextH = d.bodyText.length * this.CHAR_HEIGHT;  
        } else {
            var bodyTextW = 0;
            var bodyTextH = 0;
        }
        var pad = this.BODY_TEXT_PADDING;
        if (bodyTextW  > 0)
            bodyTextW += pad[1] + pad[3];
        if (bodyTextH  > 0)
            bodyTextH += pad[0] + pad[2];
        return [bodyTextW, bodyTextH];
    }

    /**
     * Init bodyText and resolve size of node from body text and ports
     * 
     * @param d
     *            component node *
     */
    initNodeSizes(d) {
        if (d.properties["org.eclipse.elk.noLayout"])
            return;
        var ignorePortLabel = d.children && !d.hideChildren;
        if (d.ports != null)
            d.ports.forEach(function(p) {
                p.ignoreLabel = ignorePortLabel;
            });
        var widthOfText = this.widthOfText.bind(this);

        var labelW = widthOfText(d.name)
        var max = Math.max
        var bodyTextSize = this.initBodyTextLines(d);
        const MBT = this.MAX_NODE_BODY_TEXT_SIZE;
        bodyTextSize[0] = Math.min(bodyTextSize[0], MBT[0]);
        bodyTextSize[1] = Math.min(bodyTextSize[1], MBT[1]);

        // {PortSide: (portCnt, portWidth)}
        var portDim = {
                "WEST": [0, 0],
                "EAST": [0, 0],
                "SOUTH": [0, 0],
                "NORTH": [0, 0]
        };
        var PORT_PIN_SIZE_x = this.PORT_PIN_SIZE[0],
            PORT_PIN_SIZE_y = this.PORT_PIN_SIZE[1];
        var CHAR_WIDTH = this.CHAR_WIDTH;
        if (d.ports != null)
          d.ports.forEach(function(p) {
              var t = p.properties.portSide;
              var indent = 0;
              if (p.level > 0)
                  indent = (p.level + 1) * CHAR_WIDTH;
              var portW = widthOfText(p.name) + indent;
              var pDim = portDim[t];
              if (pDim === undefined)
                  throw new Error(t);
              pDim[0]++;
              pDim[1] = max(pDim[1], portW);
              
              // dimension of connection pin
              p.width = PORT_PIN_SIZE_x;
              p.height = PORT_PIN_SIZE_y;
          })
         
        var west = portDim["WEST"],
            east = portDim["EAST"],
            south = portDim["SOUTH"],
            north = portDim["NORTH"];

        var portColums = 0;
        if (west[0])
            portColums += 1;
        if (east[0])
            portColums += 1;

        var middleSpacing = 0;
        if (portColums == 2)
            middleSpacing = this.NODE_MIDDLE_PORT_SPACING
        var portW = max(west[1], east[1]);
        
        d.portLabelWidth = portW;
        d.width = max(portW * portColums + middleSpacing, labelW,
                      max(south[0], north[0]) * this.PORT_HEIGHT)
                    + bodyTextSize[0] + CHAR_WIDTH;
        d.height = max(max(west[0], east[0]) * this.PORT_HEIGHT,
                       bodyTextSize[1],
                       max(south[1], north[1]) * CHAR_WIDTH);
    }
    
    /**
     * @param bodyTexts
     *            list of strings
     */
    renderTextLines(bodyTexts) {
        const padTop = this.BODY_TEXT_PADDING[0];
        const padLeft = this.BODY_TEXT_PADDING[3];
        const MBT = this.MAX_NODE_BODY_TEXT_SIZE;
        const CHAR_WIDTH = this.CHAR_WIDTH;
        const CHAR_HEIGHT = this.CHAR_HEIGHT;

        bodyTexts.each(function() {
            var bodyText = d3.select(this)
            var d = bodyText.data()[0];
            var bodyTextLines = d.bodyText;
            var _MBT = [MBT[0] /CHAR_WIDTH, MBT[1] / this.CHAR_HEIGHT];
            
            if (bodyTextLines && (d.children == null 
                    || d.children.length == 0 
                    || d.hideChildren)) {
                bodyTextLines.forEach(function (line, dy) {
                    if (line.length > _MBT[0])
                        line = line.slice(0, _MBT[0] - 3) + "...";
                    if (dy > _MBT[1])
                        return;
                    bodyText
                       .append("tspan")
                       .attr("x", d.portLabelWidth + padLeft)
                       .attr("y", padTop)
                       .attr("dy", dy + "em")
                       .text(line);
                });
            }
        });
        
    }
    
    /*
     * Set bind graph data to graph rendering engine
     */
    bindData(graph) {
        applyHideChildren(graph);
        var root = this.root;
        var layouter = this.layouter;
        var bindData = this.bindData.bind(this);
        var PORT_HEIGHT = this.PORT_HEIGHT;
        var CHAR_WIDTH = this.CHAR_WIDTH;


        // config of layouter
        layouter
            .options({
                edgeRouting: "ORTHOGONAL",
                // "org.eclipse.elk.layered.crossingMinimization.strategy":
                // "LAYER_EVO"
            })
            .kgraph(graph)
            .size([width, height])
            .transformGroup(root)

        var nodes = layouter.getNodes().slice(1); // skip root node
        var edges = layouter.getEdges();
        nodes.forEach(this.initNodeSizes.bind(this));
            
        // by "g" we group nodes along with their ports
        var node = root.selectAll(".node")
            .data(nodes)
            .enter()
            .append("g");
        
        var nodeBody = node.append("rect");
        
        var port = node.selectAll(".port")
            .data(function(d) { return d.ports || []; })
            .enter()
            .append("g");
        
        var link = root.selectAll(".link")
            .data(edges)
            .enter()
            .append("path")
            .attr("class", "link")

        function toggleHideChildren(node) {
            var h = node.hideChildren = !node.hideChildren;
        }

        node.on("click", function (d) {
            var children;
            if (d.hideChildren)
                children = d.__children;
            else
                children = d.children;

            if (!children || children.length == 0)
                return; // does not have anything to expand
            var graph = layouter.kgraph()
            layouter.cleanLayout();
            root.selectAll("*").remove();
            toggleHideChildren(d);    
            bindData(graph)
        });
        // Select net on click
        link.on("click", function(d) {
          var doSelect = !d.selected;
          var l = d3.select(this);
          var data = l.data()[0];
          // propagate click on all nets with same source
          var src = data.source;
          var srcP = data.sourcePort;
          link.classed("link-selected", function (d) {
              if (d.source == src && d.sourcePort == srcP) {
                  d.selected = doSelect;
              }
              return d.selected;
          });
          d3.event.stopPropagation();
        });

        // apply layout
        layouter.on("finish", function applyLayout() {
          nodeBody
            .attr("width", function(d) { return d.width })
            .attr("height", function(d) { return d.height });

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
          
          // apply node positions
          node.transition()
            .duration(0)
            .attr("transform", function(d) {
                // if side of ports is not fixed resolve it from position
                var c = d.properties['"org.eclipse.elk.portConstraints"'];
                if (!PortConstraints_isSideFixed(c)) {
                    var w = d.width;
                    var h = d.height;
                    ports.forEach(function initPortSides(p) {
                        if (p.x < 0)
                            p.side = "WEST";
                        else if (p.y < 0)
                            p.side = "NORTH";
                        else if (p.x >= w)
                            p.side = "EAST";
                        else if (p.y >= h)
                            d.side = "SOUTH";
                        else
                            throw new Exception("wrong port position" + [p.x, p.y]);
                    });
                }
                if (typeof d.x === "undefined" || typeof d.x === "undefined") {
                    throw new Error("Node with undefined position", d);
                }
                return "translate(" + d.x + " " + d.y + ")"
            });
          
          // apply port positions
          port.transition()
            .duration(0)
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"});

          // spot port name
          port.append("text")
            .attr("y", PORT_HEIGHT * 0.75)
            .text(function(d) {
                if (d.ignoreLabel)
                    return "";
                else if (d.level) {
                    var indent = '-'.repeat(d.level);
                    var side = d.properties.portSide;
                    if (side == "WEST") {
                       return indent + d.name;;
                    } else if (side == "EAST") {
                       return d.name + indent;
                    } else {
                        throw new Error(side);
                    }
                } else
                    return d.name; 
            })
            .attr("x", function(d) {
                var side = d.properties.portSide;
                if (side == "WEST") {
                   return 7;
                } else if (side == "EAST") {
                   return -this.getBBox().width - CHAR_WIDTH / 2;
                } else if (side == "NORTH") {
                   return 0;
                } else if (side == "SOUTH") {
                    return 0;
                } else {
                    throw new Error(side);
                }
            });
          
          // spot input/output marker
          port.append("use")
              .attr("href", getIOMarker)
        });
        
        layouter.start();

        // set dimensions and style of node
        nodeBody
            .attr("class", function (d) { 
                if (d.isExternalPort) {
                    return "node-external-port";
                } else {
                    return "node";
                }
            })
            .attr("rx", 5)
            .attr("ry", 5);
        
        // spot node label
        node.append("text")
            .text(function(d) { return d.name; });
        
        // spot node body text
        node.append("text")
            .call(this.renderTextLines.bind(this))
    }
}
