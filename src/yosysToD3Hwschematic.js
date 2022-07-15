
function makeLEdge(name, idCounter) {
  if (name === undefined) {
    throw new Error("Name is undefined");
  }

  return [{
    "id": idCounter.toString(),
    "sources": [],
    "targets": [], // [id of LNode, id of LPort]
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
  if (name === undefined) {
    throw new Error("Name is undefined");
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

function fillPorts(node, ports, idCounter, objType) {
  for (const [portName, portObj] of Object.entries(ports)) { //objType === ports: portObj = modules[name].ports
    //objType === port_directions: portObj = 
    // modules[name].cells.port_directions
    if (objType === "ports") {
      var direction = portObj.direction;
    } else if (objType === "port_directions") {
      var direction = portObj;
    } else {
      throw new Error("Invalid objType: " + objType)
    }
    var [port, idCounter] = makeLPort(portName, direction, idCounter);
    node.ports.push(port);
  }

  return idCounter;
}

function fillChildren(node, yosysModule, idCounter, yosysModules) {
  // iterate all cells and lookup for modules and construct them recursively
  for (const [cellName, cellObj] of Object.entries(yosysModule.cells)) {
    var moduleName = cellObj.type; //module name
    var cellModuleObj = yosysModules[moduleName];
    var [subNode, idCounter] = makeLNode(cellName, cellModuleObj, idCounter, yosysModules);
    if (cellModuleObj === undefined) {
      if (cellObj.port_directions === undefined)
      {
        throw new Error("[Todo] if modules does not have definition in modules and its name does not \
                         start with $, then it does not have port_directions. Must add port to sources and targets of an edge")
      }
      idCounter = fillPorts(subNode, cellObj.port_directions, idCounter, "port_directions")

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


/*
 * Iterate bits representing yosys net names, which are used to get edges from the edgeDict.
 * If edges are not present in the dictionary, they are created and inserted into it. Eventually,
 * nodes are completed by filling sources and targets properties of LEdge.
 */
function loadNets(bits, getPortName, nodeId, portId, getSourceAndTarget, edgeDict, bitNodeDict, idCounter, direction, node, edgeArray) {
  for (const bit of bits) {
    var portName = getPortName(bit);
    var edge = edgeDict[bit];
    var netIsConst = typeof (bit) == "string";
    if (netIsConst || edge === undefined) {
      // create edge if it is not in edgeDict
      if (portName === undefined) {
        if (!netIsConst) {
          throw new Error("Netname is undefined");
        }
        portName = bit;
      }
      var [edge, idCounter] = makeLEdge(portName, idCounter);
      edgeDict[bit] = edge;
      edgeArray.push(edge);
      if (netIsConst) {
        // If bit is a constant, create a node with constant
        var [constSubNode, port, idCounter, bitNodeDict] = addBitNode(node, bit, idCounter, bitNodeDict);
        edge.sources.push([constSubNode.id, port.id]);
      }
    }

    var [a, b] = getSourceAndTarget(edge);
    if (direction === "input") {
      a.push([nodeId, portId]);
    } else if (direction === "output") {
      b.push([nodeId, portId]);
    } else {
      throw new Error("Unknown direction " + direction);
    }
  }

  return idCounter;
}

function getSourceAndTarget2(edge) {
  return [edge.sources, edge.targets];
}

function getEdgeDictFromPorts(node, yosysModule, idCounter, bitNodeDict) {
  var edgeDict = {}; // yosys bits (netId): LEdge
  var edgeArray = [];
  var nodeId = node.id;
  var portI = 0;
  for (const [portName, portObj] of Object.entries(yosysModule.ports)) {
    var port = node.ports[portI++];
    port.properties.index = portI;
    var portId = port.id;

    function getPortName2(bit) {
      return portName;
    }

    idCounter = loadNets(portObj.bits, getPortName2, nodeId, portId, getSourceAndTarget2, edgeDict,
      bitNodeDict, idCounter, portObj.direction, node, edgeArray)

  }
  return [edgeDict, edgeArray, idCounter, bitNodeDict];
}

function getSourceAndTargetForCell(edge) {
  return [edge.targets, edge.sources];
}

function fillEdges(node, yosysModule, idCounter) {
  var bitNodeDict = {};
  var [edgeDict, edgeArray, idCounter, bitNodeDict] = getEdgeDictFromPorts(node, yosysModule, idCounter, bitNodeDict);
  var netnamesDict = getNetNamesDict(yosysModule);
  constructConstNodesForNetnames(yosysModule);
  function getPortName(bit) {
    return netnamesDict[bit];
  }

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

      if (portName.startsWith("$")) {
        var direction = portObj.direction.toLowerCase(); //use direction from module port definition
      } else {
        var direction = portDirections[portName];
      }

      idCounter = loadNets(bits, getPortName, subNode.id, portObj.id, getSourceAndTargetForCell,
        edgeDict, bitNodeDict, idCounter, direction, node, edgeArray);
    }
  }

  var edgeSet = {}; // [sources, targets]: true
  for (const edge of edgeArray) {
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
  if (name === undefined) {
    throw new Error("Name is undefined");
  }

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

  if (yosysModule != null) {
    // cell with module definition, load ports, edges and children from module def. recursively
    idCounter = fillPorts(node, yosysModule.ports, idCounter, "ports")
    idCounter = fillChildren(node, yosysModule, idCounter, yosysModules)
    idCounter = fillEdges(node, yosysModule, idCounter)
  }

  if (yosysModule !== null && node.children.length === 0) {
    node._children = node.children;
    delete node.children
    node._edges = node.edges;
    delete node.edges;
  }

  node.hwMeta.maxId = idCounter - 1;
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
  } else if (name.startsWith("$gt$")) {
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
  } else if (name.startsWith("$not$")) {
    meta.cls = "Operator";
    meta.name = "NOT";
  } else if (name.startsWith("$logic_and$")) {
    meta.cls = "Operator";
    meta.name = "AND";
  } else if (name.startsWith("$eq$")) {
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
