
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
  } else if (direction === "input") {
    var portSide = "WEST";
  } else {
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


function fillPorts(node, ports, idCounter, option) {
  for (const [portName, portObj] of Object.entries(ports)) { //option === modules: portObj = modules[name].ports
    //option === cells: portObj = modules[name].cells.port_directions
    if (option === "modules") {
      var direction = portObj.direction;
    }
    else if (option === "cells") {
      var direction = portObj;
    }
    else {
      throw new Error("Invalid option: " + option)
    }
    var [port, idCounter] = makeLPort(portName, direction, idCounter);
    node.ports.push(port);
  }

  return idCounter;
}


function fillChildren(node, yosysModule, idCounter, yosysModules) {
  for (const [cellName, cellObj] of Object.entries(yosysModule.cells)) { // iterate all cells and lookup for modules and construct them recursively,
    // yosysModule = modules[name]
    var type = cellObj.type; //module name
    var cellModuleObj = yosysModules[type];
    var [subNode, idCounter] = makeLNode(cellName, cellModuleObj, idCounter, yosysModules);
    if (cellModuleObj === undefined) {
      idCounter = fillPorts(subNode, cellObj.port_directions, idCounter, "cells")
    }
    node.children.push(subNode);
  }

  return idCounter;
}

function addBitNode(node, bit, idCounter, bitNodeDict) {
  var [subNode, idCounter] = makeLNode(bit, null, idCounter, null);
  var [port, idCounter] = makeLPort("O0", "output", idCounter);
  subNode.children.push(port);
  node.children.push(subNode);
  bitNodeDict[subNode.id] = 1;

  return [subNode, port, idCounter, bitNodeDict];
}

function iterNetnameBits(netnames, fn) {
  for (const [netname, netObj] of Object.entries(netnames)) {
    for (const bit of netObj.bits) {
      fn(netname, bit, Number.isInteger(bit), typeof (bit) == "string");
    }
  }
}

function getNetNamesDict(yosysModule) {
  var netnamesDict = {}; // yosys bits (netId): netname

  iterNetnameBits(yosysModule.netnames, (netname, bit, isInt, isStr) => {
    if (isInt) {
      netnamesDict[bit] = netname;
    } else if (!isStr) {
      throw new Error("Invalid type in bits: " + typeof (bit));
    }
  });
  return netnamesDict;
}

function constructConstNodesForNetnames(yosysModule) {
  iterNetnameBits(yosysModule.netnames, (netname, bit, isInt, isStr) => {
    if (isStr) {
      throw new Error("[Todo]: Connect constant port to net");
    }
  });
}

function getEdgeDictFromPorts(node, yosysModule, idCounter, bitNodeDict) {
  var edgeDict = {}; // yosys bits (netId): LEdge

  var nodeId = node.id;
  var portI = 0;
  for (const [portName, portObj] of Object.entries(yosysModule.ports)) {
    var port = node.ports[portI++];
    port.properties.index = portI;
    var portId = port.id;
    for (const bit of portObj.bits) {
      var edge = edgeDict[bit];
      if (edge === undefined)// create edge if it is not in edgeDict
      { 
        var [edge, idCounter] = makeLEdge(portName, idCounter);
        edgeDict[bit] = edge;

        if (typeof (bit) == "string") { //create node with constant
          var [subNode, port, idCounter, bitNodeDict] = addBitNode(node, bit, idCounter, bitNodeDict);
          edge.sources.push([subNode.id, port.id]);
        }
      }


      var _nodeId = nodeId;
      var _portId = portId;

      if (portObj.direction === "input") {
        edge.sources.push([_nodeId, _portId]);

      } else if (portObj.direction === "output") {
        edge.targets.push([_nodeId, _portId]);

      } else {
        throw new Error("Unknown direction " + portObj.direction);
      }

    }

  }
  return [edgeDict, idCounter, bitNodeDict];
}
function fillEdges(node, yosysModule, idCounter) {
  var bitNodeDict = {};
  var [edgeDict, idCounter, bitNodeDict] = getEdgeDictFromPorts(node, yosysModule, idCounter, bitNodeDict);
  var netnamesDict = getNetNamesDict(yosysModule); 
  constructConstNodesForNetnames(yosysModule);

  for (var i = 0; i < node.children.length; i++) {
    const subNode = node.children[i];
    if (bitNodeDict[subNode.id] === 1) {
      continue;
    }
    var cell = yosysModule.cells[subNode.hwMeta.name];
    var connections = cell.connections;
    var portDirections = cell.port_directions;

    if (connections === undefined) {
      throw new Error("Cannot find cell for subnode" + subNode.hwMeta.name);
    }

    var portI = 0;
    for (const [portName, bits] of Object.entries(connections)) {
      var portObj = subNode.ports[portI++];
      portObj.properties.index = portI;

      for (const bit of bits) {
        var edge = edgeDict[bit];
        if (edge === undefined) {
          var [edge, idCounter] = makeLEdge(netnamesDict[bit], idCounter);
          edgeDict[bit] = edge;
          if (typeof (bit) == "string") { //create node with constant
            var [constSubNode, port, idCounter, bitNodeDict] = addBitNode(node, bit, idCounter, bitNodeDict);
            edge.sources.push([constSubNode.id, port.id]);
  
          }
        }
        var _nodeId = subNode.id;
        var _portId = portObj.id;
        


        if (portName.startsWith("$")) {
          //console.log("stop: " + portName)
          var direction = portObj.direction.toLowerCase(); //use direction from module port definition
        } else {
          var direction = portDirections[portName];
        }

        if (direction === "output") {
          edge.sources.push([_nodeId, _portId]);
        } else if (direction === "input") {
          edge.targets.push([_nodeId, _portId]);

        } else {
          throw new Error("Unknown direction " + direction);
        }
      }




      //if not in modules:



    }

  }

  var edgeSet = {}; // [sources, targets]: true
  for (const [edgeIndex, edge] of Object.entries(edgeDict)) {
    var key = [edge.sources, edge.targets]
    if (!edgeSet[key]) // filter duplicities
    {
      edgeSet[key] = true;
      node.edges.push(edge);
    }

  }

  return idCounter;
}
function makeLNode(name, yosysModule, idCounter, yosysModules) {

  var node = {
    "id": idCounter.toString(), //generate, each component has unique id
    "hwMeta": { // [d3-hwschematic specific]
      "name": name, // optional str
      "cls": "", // optional str
      "maxId": 2, // max id of any object in this node used to avoid re-counting object if new object is generated
    },
    "properties": { // recommended renderer settings
      "org.eclipse.elk.portConstraints": "FIXED_ORDER", // can be also "FREE" or other value accepted by ELK
      "org.eclipse.elk.layered.mergeEdges": 1
    },
    "ports": [],    // list of LPort
    "edges": [],    // list of LEdge
    "children": [], // list of LNode
  };

  idCounter++;
  if (yosysModule) {
    // cell with module definition, load ports, edges and children from module def. recursively
    idCounter = fillPorts(node, yosysModule.ports, idCounter, "modules")
    idCounter = fillChildren(node, yosysModule, idCounter, yosysModules)
    idCounter = fillEdges(node, yosysModule, idCounter)

  }
  if (yosysModule !== null && node.children.length === 0) {
    node._children = node.children;
    delete node.children
    node._edges = node.edges;
    delete node.edges;
  }




  //coutner maxId should be idCounter - 1
  node.hwMeta.maxId = idCounter;

  return [node, idCounter];
}

function getTopModuleName(yosysJson) {
  var topModuleName = undefined;
  for (const [moduleName, moduleObj] of Object.entries(yosysJson.modules)) {
    if (moduleObj.attributes.top) {
      topModuleName = moduleName;
      break;

    }
  }
  if (topModuleName === undefined) {
    throw new Error("Cannot find top");
  }

  return topModuleName;
}

function setIcons(node) {
  var name = node.hwMeta.name;
  var meta = node.hwMeta;
  if (name.startsWith("$ternary$")) {
    meta.cls = "Operator";
    meta.name = "MUX";
  }

  else if (name.startsWith("$gt$")) {
    meta.cls = "Operator";
    meta.name = "GT";
  } else if (name.startsWith("$lt$")) {
    meta.cls = "Operator";
    meta.name = "LT";
  } else if (name.startsWith("$ge$")) {
    meta.cls = "Operator";
    meta.name = "GE";
  } else if (name.startsWith("$le$")) {
    meta.cls = "Operator";
    meta.name = "LE";
  }
  else if (name.startsWith("$not$")) {
    meta.cls = "Operator";
    meta.name = "NOT";
  }
  else if (name.startsWith("$logic_and$")) {
    meta.cls = "Operator";
    meta.name = "AND";
  }
  else if (name.startsWith("$eq$")) {
    meta.cls = "Operator";
    meta.name = "EQ";
  } else if (name.startsWith("$ne$")) {
    meta.cls = "Operator";
    meta.name = "NE";
  } else if (name.startsWith("$add$")) {
    meta.cls = "Operator";
    meta.name = "ADD";
  } else if (name.startsWith("$sub$")) {
    meta.cls = "Operator";
    meta.name = "SUB";
  } else if (name.startsWith("$mul$")) {
    meta.cls = "Operator";
    meta.name = "MUL";
  } else if (name.startsWith("$div$")) {
    meta.cls = "Operator";
    meta.name = "DIV";
  }


  if (node.children !== undefined)
    node.children.forEach(setIcons);

}
//node.hwMeta.cls == "Operator"
//node.hwMeta.name === "MUX
export function yosysToD3Hwschematic(yosysJson) {
  var idCounter = 0;
  var [output, idCounter] = makeLNode("root", null, idCounter, null);

  var topModuleName = getTopModuleName(yosysJson);
  var [node, idCounter] = makeLNode(topModuleName, yosysJson.modules[topModuleName], idCounter, yosysJson.modules);
  output.children.push(node);
  output.hwMeta.maxId = idCounter;
  setIcons(output);
  //print output to console
  //console.log(JSON.stringify(output, null, 2));

  return output;
}
