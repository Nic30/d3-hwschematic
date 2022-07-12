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
*/

function makeLEdge(name, idCounter) {
  return [{
    "id": idCounter.toString(),
    "sources": [

    ],
    "targets": [// id of LNode, id of LPort

    ],
    "hwMeta": { // [d3-hwschematic specific]
      "name": name, // optional string, displayed on mouse over

    }
  }, idCounter + 1];
}
function makeLPort(name, direction, idCounter) {
  if (direction === "output") {
    var portSide = "EAST";
  }
  else if (direction === "input") {
    var portSide = "WEST";
  }
  else {
    throw new Error("Unknown direction " + direction);
  }

  return [{
    "id": idCounter.toString(),
    "hwMeta": { // [d3-hwschematic specific]
      "name": name,
    },
    "direction": direction.toUpperCase(), // [d3-hwschematic specific] controlls direction marker
    "properties": {
      "side": portSide,
      "index": 0 // The order is assumed as clockwise, starting with the leftmost port on the top side.
      // Required only for components with "org.eclipse.elk.portConstraints": "FIXED_ORDER"
    },
    "children": [], // list of LPort, if the port should be collapsed rename this property to "_children"
  }, idCounter + 1];
}
function makeLNode(name, idCounter) {

  return [{
    "id": idCounter.toString(), //generate, each component has unique id
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
  }, idCounter + 1];
}

function yosysToD3Hwschematic(yosysJson) {
  var idCounter = 0;
  var [output, idCounter] = makeLNode("root", idCounter);
  for (const [moduleName, moduleObj] of Object.entries(yosysJson.modules)) {
    var [n, idCounter] = makeLNode(moduleName, idCounter);
    //n.ports.push(...)
    output.children.push(n);
    console.log(moduleName);
    for (const [portName, portObj] of Object.entries(moduleObj.ports)) {
      var [port, idCounter] = makeLPort(portName, portObj.direction, idCounter);
      n.ports.push(port);
    }
    for (const [cellName, cellObj] of Object.entries(moduleObj.cells)) {
      var [subNode, idCounter] = makeLNode(cellName, idCounter);
      n.children.push(subNode);
      for (const [portName, direction] of Object.entries(cellObj.port_directions)) {
        var [port, idCounter] = makeLPort(portName, direction, idCounter);
        subNode.ports.push(port);
      }
    }

    var edgeDict = {};

    var nodeId = n.id;
    var portI = 0;
    for (const [portName, portObj] of Object.entries(moduleObj.ports)) {
      var port = n.ports[portI++];
      port.properties.index = portI;
      var portId = port.id;
      var index = portObj.bits[0]

      var [edge, idCounter] = makeLEdge(portName, idCounter);

      if (portObj.direction === "input") {
        edge.sources.push([nodeId, portId]);

      }
      else if (portObj.direction === "output") {
        edge.targets.push([nodeId, portId]);

      }
      else {
        throw new Error("Unknown direction " + portObj.direction);
      }
      edgeDict[index] = edge;
    }
    for (var i = 0; i < n.children.length; ++i) {
      const subNode = n.children[i];
      var cell = moduleObj.cells[subNode.hwMeta.name];
      var connections = cell.connections;
      var portDirections = cell.port_directions;

      if (connections === undefined) {
        throw new Error("Cannot find cell for subnode" + subNode.hwMeta.name);
      }
      var portI = 0;
      for (const [portName, netArray] of Object.entries(connections)) {
        console.log(portI, subNode.ports);
        var portObj = subNode.ports[portI++];
        portObj.properties.index = portI;

        var indexToSearch = netArray[0];
        var edge = edgeDict[indexToSearch];

        var direction = portDirections[portName];
        if (direction === "output") {
          edge.sources.push([subNode.id, portObj.id]);

        }
        else if (direction === "input") {
          edge.targets.push([subNode.id, portObj.id]);

        }
        else {
          throw new Error("Unknown direction " + direction);
        }
      }

    }

    for (const [edgeIndex, edge] of Object.entries(edgeDict)) {
      n.edges.push(edge);
    }


  }
  n.hwMeta.maxId = idCounter - 1;
  //console.log(JSON.stringify(output, null, 2));
  return output;
}
