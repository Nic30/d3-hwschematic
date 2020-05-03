import {GenericNodeRenderer} from "./generic"

/**
 * Draw a multiplexer operator symbol
 */ 
function MUX_SHAPE(root) {
    // width="20" height="40"
    root.append("path")
      .attr("d","M0,0 L20,10 L20,30 L0,40 Z");
}

export class MuxNodeRenderer extends GenericNodeRenderer {
    constructor(schematic) {
        super(schematic);
        this.DEFULT_NODE_SIZE = [20, 40];
    }

    prepare(node) {
        var defs = this.schematic.defs;
        this.addShapeToDefs(defs);
        node.width = this.DEFULT_NODE_SIZE[0];
        node.height = this.DEFULT_NODE_SIZE[1];
    }
    
    selector(node) {
        return node.hwMeta.name === "MUX" ||  node.hwMeta.name === "LATCHED_MUX";
    }
    
    addShapeToDefs(defs) {
        var cont = defs.append("g");
        cont.attr("id", "MUX");
        cont.attr("class", "node-operator");
        MUX_SHAPE(cont);
        
        var cont = defs.append("g");
        cont.attr("id", "LATCHED_MUX");
        cont.attr("class", "node-operator");
        MUX_SHAPE(cont);
        cont.append("text")
          .text("LA")
          .attr("y", "10")
          .attr("x", "10")
          .attr("style", "writing-mode: tb;")
    }
        
    /**
     * Render svg of node
     * 
     * @param root root svg element where nodes should be rendered
     * @param nodeG svg g for each node with data binded
     * */
    render(root, nodeG) {
        var schematic = this.schematic;
        
        // apply node positions
        nodeG
          .attr("transform", function(d) {
              if (typeof d.x === "undefined" || typeof d.x === "undefined") {
                  throw new Error("Node with undefined position", d);
              }
              return "translate(" + d.x + " " + d.y + ")"
          });
        
        nodeG.append("use")
        .attr("href", function (d) {
            return "#" + d.hwMeta.name;
        });
        

    }
}