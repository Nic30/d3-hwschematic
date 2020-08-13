import * as d3 from "d3";
import {getIOMarker} from "../markers"; 

/**
 * Returns whether the sides of ports are fixed.
 * 
 * @see PortSide
 * @return true if the port sides are fixed
 */

function PortConstraints_isSideFixed(val) {
   return val == "FREE" || val != "UNDEFINED"
}

export class GenericNodeRenderer {
    /**
     * @param schematic instance of HwSchematic
     **/
    constructor(schematic) {
        this.schematic = schematic;
    }
    /**
     * check if this selector should be used for this node 
     **/
    selector(node) {
    	// always return true, because this is a default renderer which just renders a box with ports
        return true;
    }
    
    getNodeLabelWidth(d) {
        var schematic = this.schematic;
        var widthOfText = schematic.widthOfText.bind(schematic);
        return widthOfText(d.hwMeta.name);
    }
    
    /**
     * Init bodyText and resolve size of node from body text and ports
     * 
     * @param d component node
     * 
     */
    initNodeSizes(d) {
        var schematic = this.schematic;
        if (d.properties["org.eclipse.elk.noLayout"])
            return;
        var ignorePortLabel = d.children;
        if (d.ports != null)
            d.ports.forEach(function(p) {
                p.ignoreLabel = ignorePortLabel;
            });
        var widthOfText = schematic.widthOfText.bind(schematic);

        var labelW = this.getNodeLabelWidth(d);
        var max = Math.max
        var bodyTextSize = this.initBodyTextLines(d);
        const MBT = schematic.MAX_NODE_BODY_TEXT_SIZE;
        bodyTextSize[0] = Math.min(bodyTextSize[0], MBT[0]);
        bodyTextSize[1] = Math.min(bodyTextSize[1], MBT[1]);

        // {PortSide: (portCnt, portWidth)}
        var portDim = {
                "WEST": [0, 0],
                "EAST": [0, 0],
                "SOUTH": [0, 0],
                "NORTH": [0, 0]
        };
        var PORT_PIN_SIZE_x = schematic.PORT_PIN_SIZE[0],
            PORT_PIN_SIZE_y = schematic.PORT_PIN_SIZE[1];
        var CHAR_WIDTH = schematic.CHAR_WIDTH;
        if (d.ports != null)
          d.ports.forEach(function(p) {
              var t = p.properties.portSide;
              var indent = 0;
              if (p.hwMeta.level > 0)
                  indent = (p.hwMeta.level + 1) * CHAR_WIDTH;
              var portW = widthOfText(p.hwMeta.name) + indent;
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
        if (west[0] && west[1] > 0)
            portColums += 1;
        if (east[0] && east[1] > 0)
            portColums += 1;

        var middleSpacing = 0;
        if (portColums == 2)
            middleSpacing = schematic.NODE_MIDDLE_PORT_SPACING
        var portW = max(west[1], east[1]);
        
        d.portLabelWidth = portW;
        d.width = max(portW * portColums + middleSpacing, labelW,
                      max(south[0], north[0]) * schematic.PORT_HEIGHT)
                    + bodyTextSize[0] + CHAR_WIDTH;
        d.height = max(max(west[0], east[0]) * schematic.PORT_HEIGHT,
                       bodyTextSize[1],
                       max(south[1], north[1]) * CHAR_WIDTH);
    }

    /**
     * Split bodyText of one to lines and resolve dimensions of body text
     * 
     * @param d component node
     */
    initBodyTextLines(d) {
        var schematic = this.schematic;
        var max = Math.max;
        var bt = d.hwMeta.bodyText
        if (bt) {
            if (typeof bt === "string") {
                bt = d.hwMeta.bodyText = bt.split("\n");
            }
            var bodyTextW = 0;
            bt.forEach(function (line) {
                bodyTextW = max(bodyTextW, line.length);
            })
            bodyTextW *= schematic.CHAR_WIDTH;
            var bodyTextH = bt.length * schematic.CHAR_HEIGHT;  
        } else {
            var bodyTextW = 0;
            var bodyTextH = 0;
        }
        var pad = schematic.BODY_TEXT_PADDING;
        if (bodyTextW  > 0)
            bodyTextW += pad[1] + pad[3];
        if (bodyTextH  > 0)
            bodyTextH += pad[0] + pad[2];
        return [bodyTextW, bodyTextH];
    }
    
    /**
     * @param bodyTexts list of strings
     */
    renderTextLines(bodyTexts) {
        var schematic = this.schematic;
        const padTop = schematic.BODY_TEXT_PADDING[0];
        const padLeft = schematic.BODY_TEXT_PADDING[3];
        const MBT = schematic.MAX_NODE_BODY_TEXT_SIZE;
        const CHAR_WIDTH = schematic.CHAR_WIDTH;
        const CHAR_HEIGHT = schematic.CHAR_HEIGHT;

        bodyTexts.each(function() {
            var bodyText = d3.select(this)
            var d = bodyText.data()[0];
            var bodyTextLines = d.hwMeta.bodyText;
            var _MBT = [MBT[0] /CHAR_WIDTH, MBT[1] / schematic.CHAR_HEIGHT];
            
            if (bodyTextLines && (!d.children
                    || d.children.length == 0)) {
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
    
    /**
     * Prepare node before ELK processing 
     * */
    prepare(node) {
        this.initNodeSizes(node)
    }
    
    /**
     * Render svg of node
     * 
     * @param root root svg element where nodes should be rendered
     * @param nodeG svg g for each node with data binded
     * */
    render(root, nodeG) {
        var node = nodeG
          .attr("class", function (d) { 
              if (d.hwMeta && d.hwMeta.isExternalPort) {
                  return "node-external-port";
              } else {
                  return "node";
              }
          });
        var nodeBody = node.append("rect");
        // set dimensions and style of node
        nodeBody
           .attr("width", function(d) { return d.width })
           .attr("height", function(d) { return d.height })
           .attr("rx", 5) // rounded corners
           .attr("ry", 5);

        // apply node positions
        node
          .attr("transform", function(d) {
              if (typeof d.x === "undefined" || typeof d.x === "undefined") {
                  throw new Error("Node with undefined position", d);
              }
              return "translate(" + d.x + " " + d.y + ")"
          });

        // spot node label
        node.append("text")
            .text(function(d) {
                if (d.hwMeta && !d.hwMeta.isExternalPort) {
                    return d.hwMeta.name;
                } else {
                    return "";
                }
            });

        // spot node body text
        node.append("text")
            .call(this.renderTextLines.bind(this));
        
        this.renderPorts(node);
    }

    renderPorts(node) {
        var schematic = this.schematic;
        var PORT_HEIGHT = schematic.PORT_HEIGHT;
        var CHAR_WIDTH = schematic.CHAR_WIDTH;
        var portG = node.selectAll(".port")
          .data(function(d) { return d.ports || []; })
          .enter()
          .append("g");
        
        // apply port positions
        portG
          //.transition()
          //.duration(0)
          .attr("transform", function(d) {
              return "translate(" + d.x + "," + d.y + ")"
          });
        
        // spot port name
        portG.append("text")
          .text(function(d) {
              if (d.ignoreLabel)
                  return "";
              else if (d.hwMeta.level) {
                  var indent = '-'.repeat(d.hwMeta.level);
                  var side = d.properties.portSide;
                  if (side == "WEST") {
                     return indent + d.hwMeta.name;;
                  } else if (side == "EAST") {
                     return d.hwMeta.name + indent;
                  } else {
                      throw new Error(side);
                  }
              } else
                  return d.hwMeta.name; 
          })
          .attr("x", function(d) {
             var side = d.properties.portSide;
             if (side == "WEST") {
                return 7;
             } else if (side == "EAST") {
                //if (d.hwMeta.name === null || d.hwMeta.name.length == 0) {
                //    return 0;
                //}
                if (typeof this.getBBox  == "undefined") {
                    // JSDOM under nodejs
                    return -this.textContent.length * CHAR_WIDTH - CHAR_WIDTH / 2
                }
                return -this.getBBox().width - CHAR_WIDTH / 2;
             } else if (side == "NORTH") {
                return 0;
             } else if (side == "SOUTH") {
                 return 0;
             } else {
                 throw new Error(side);
             }
          })
          .attr("y", PORT_HEIGHT * 0.75);
        
        // spot input/output marker
        portG.append("use")
            .attr("href", getIOMarker)
    }
}