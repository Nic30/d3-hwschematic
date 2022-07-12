/*


ELK `LPort`
// ommit bits, set only, name and direction
```javascript
{
  "id": "1",
  "hwMeta": { // [d3-hwschematic specific]
    "name": "port name", //IO
    "cssClass": "node-style0", // optional string, css classes separated by space
    "cssStyle": "fill:red", // css style specification separated by ;
    "connectedAsParent": true, // an optional flag that notes that this port
                               // has no connections but it is connected as its parent port
  },
  "direction": "OUTPUT", // [d3-hwschematic specific] controlls direction marker
  "properties": {
    "portSide": "EAST",
    "portIndex": 0 // The order is assumed as clockwise, starting with the leftmost port on the top side.
                   // Required only for components with "org.eclipse.elk.portConstraints": "FIXED_ORDER"
  },
  "children": [], // list of LPort, if the port should be collapsed rename this property to "_children"
}
```

ELK `LEdge` // only port - port connection
```javascript
{ // simple LEdge
  "id": "62",
  "source": "2", // id of component //node id
  "sourcePort": "23", // id of component port
  "target": "4", // id of component // node id
  "targetPort": "29", // id of component port
  "hwMeta": { // [d3-hwschematic specific]
    "name": null // optional string, displayed on mouse over
    "cssClass": "link-style0", // optional string, css classes separated by space
    "cssStyle": "stroke:red", // css style specification separated by ;
  }
}
{ // hyper LEdge
  "id": "1119",
  "sources": [
    ["17", "343"]  // id of component, id of port
  ],
  "targets": [
    [ "18", "346"],  // id of component, id of port
    [ "21", "354"],
  ],
  "hwMeta": { // [d3-hwschematic specific]
    "name": "wr_ptr",
    "cssClass": "link-style0", // optional string, css classes separated by space
    "cssStyle": "stroke:red", // css style specification separated by ;
  }
}

*/
function makeLNode(name) {

  return {
    "id": "0", //generate, each component has unique id
    "hwMeta": { // [d3-hwschematic specific]
      "name": name, // optional str //mux
      "cls": "", // optional str //prazndy string
      "maxId": 2, // max id of any object in this node used to avoid re-counting object if new object is generated
    },
    "hideChildren": true, // [d3-hwschematic specific] optional flag, if true the body of component is collapsed //nastavit na true
    "properties": { // recommended renderer settings
      "org.eclipse.elk.portConstraints": "FIXED_ORDER", // can be also "FREE" or other value accepted by ELK //set recommended settings
      "org.eclipse.elk.layered.mergeEdges": 1
    },
    "ports": [],    // list of LPort
    "edges": [],    // list of LEdge
    "children": [], // list of LNode, if the node should be collapsed rename this property
    // to "_children" and "edges" to "_edges"
  };
}

function yosysToD3Hwschematic(yosysJson) {
  var output = makeLNode("top");
  var idCounter = 0;
  for (const [moduleName, moduleObj] of Object.entries(yosysJson.modules)) {
    var n = makeLNode(moduleName);
    //n.ports.push(...)
    output.children.push(n)
    console.log(moduleName);
  }


  return output;
}
