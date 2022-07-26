function makeEdge(name, idCounter) {
  return {
    "id": idCounter.toString(),
    "sources": [],
    "targets": [], // [id of LNode, id of LPort]
    "hwMeta": { // [d3-hwschematic specific]
      "name": name, // optional string, displayed on mouse over
    }
  };
}

function makeLEdge(name, idCounter) {
  if (name === undefined) {
    throw new Error("Name is undefined");
  }

  return [makeEdge(name, idCounter), idCounter + 1];
}

function makePort(name, direction, portSide, idCounter) {
  return {
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
  }
}
function getPortSide(direction) {
  if (direction === "output") {
    return "EAST";
  } if (direction === "input") {
    return "WEST";
  }
  throw new Error("Unknown direction " + direction);
}

function makeLPort(name, direction, idCounter) {
  if (name === undefined) {
    throw new Error("Name is undefined");
  }

  var portSide = getPortSide(direction);

  return [makePort(name, direction, portSide, idCounter), idCounter + 1];
}

function fillPorts(node, ports, idCounter, objType, cellObj) {
  var issplit = cellObj !== undefined && cellObj.type === "$slice";
  var issconcat = cellObj !== undefined && cellObj.type === "$concat"

  for (var [portName, portObj] of Object.entries(ports)) { 
    // objType === ports: portObj = modules[name].ports
    // objType === port_directions: portObj = 
    // modules[name].cells.port_directions
    if (objType === "ports") {
      var direction = portObj.direction;
    } else if (objType === "port_directions") {
      var direction = portObj;
    } else {
      throw new Error("Invalid objType: " + objType)
    }

    if (issplit) {
      if (portName === "Y") {
        portName = "";
      }
      else if (portName === "A") {
        portName = getPortNameSplice(cellObj.parameters.OFFSET, cellObj.parameters.Y_WIDTH);
      }
    }

    else if (issconcat) {
      if (portName === "Y") {
        portName = "";
      }
      else if (portName === "A"){
        portName = getPortNameSplice(0, cellObj.parameters.A_WIDTH);
      }

      else if (portName === "B"){
        portName = getPortNameSplice(cellObj.parameters.A_WIDTH, cellObj.parameters.B_WIDTH);
      }

    }
    var [port, idCounter] = makeLPort(portName, direction, idCounter);
    node.ports.push(port);
  }

  return idCounter;
}

function fillChildren(node, yosysModule, idCounter, yosysModules) {
  var childrenWithoutPortArray = [];
  // iterate all cells and lookup for modules and construct them recursively
  for (const [cellName, cellObj] of Object.entries(yosysModule.cells)) {
    var moduleName = cellObj.type; //module name
    var cellModuleObj = yosysModules[moduleName];
    var [subNode, idCounter] = makeLNode(cellName, cellModuleObj, idCounter, yosysModules);
    node.children.push(subNode);
    if (cellModuleObj === undefined) {
      if (cellObj.port_directions === undefined) {
        // throw new Error("[Todo] if modules does not have definition in modules and its name does not \
        // start with $, then it does not have port_directions. Must add port to sources and targets of an edge")

        childrenWithoutPortArray.push([cellObj, subNode]);
        continue;
      }
      idCounter = fillPorts(subNode, cellObj.port_directions, idCounter, "port_directions", cellObj)

    }

  }

  return [idCounter, childrenWithoutPortArray];
}

function addconstNode(node, nodeName, idCounter, constNodeDict) {
  var [subNode, idCounter] = makeLNode(nodeName, undefined, idCounter, null);
  var [port, idCounter] = makeLPort("O0", "output", idCounter);
  subNode.ports.push(port);
  node.children.push(subNode);
  constNodeDict[subNode.id] = 1;

  return [subNode, port, idCounter, constNodeDict];
}

function iterNetnameBits(netnames, fn) {
  for (const [netname, netObj] of Object.entries(netnames)) {
    for (const bit of netObj.bits) {
      fn(netname, bit, Number.isInteger(bit), isConst(bit));
    }
  }
}

function getNetNamesDict(yosysModule) {
  var netnamesDict = {}; // yosys bits (netId): netname

  iterNetnameBits(yosysModule.netnames, (netname, bit, isInt, isStr) => {
    if (isInt) {
      netnamesDict[bit] = netname;
    } else if (!isStr) {
      throw new Error("Invalid type in bits: " + typeof bit);
    }
  });
  return netnamesDict;
}


function isConst(val) {
  return (typeof val === "string");
}

function getConstNodeName(nameArray) {
  var nodeName = nameArray.reverse().join("");
  nodeName = ["0b", nodeName].join("");
  if (nodeName.match(/^0b[01]+$/g)) {
    var res = BigInt(nodeName).toString(16);
    return ["0x", res].join("");
  }
  return nodeName;
}

function addConstNodeToSources(node, bits, sources, i, constNodeDict, idCounter) {
  var nameArray = [];
  for (i; i < bits.length; ++i) {
    var bit = bits[i];
    if (isConst(bit)) {
      nameArray.push(bit);
    }
    else {
      break;
    }
  }
  --i;
  // If bit is a constant, create a node with constant
  var nodeName = getConstNodeName(nameArray);
  var [constSubNode, port, idCounter, constNodeDict] = addconstNode(node, nodeName, idCounter, constNodeDict);
  sources.push([constSubNode.id, port.id]);
  return [idCounter, i];
}

function addEdge(edge, portId, edgeDict, startIndex, width) {
  var edgeArr = edgeDict[portId];
  if (edgeArr === undefined) {
    edgeArr = edgeDict[portId] = [];
  }
  edgeArr[startIndex] = [edge, width];
}


/*
 * Iterate bits representing yosys net names, which are used to get edges from the edgeDict.
 * If edges are not present in the dictionary, they are created and inserted into it. Eventually,
 * nodes are completed by filling sources and targets properties of LEdge.
 */
function loadNets(node, nodeId, portId, bits, direction, edgeDict, constNodeDict, edgeArray, idCounter, getPortName, getSourceAndTarget, edgeTargetsDict, edgeSourcesDict) {
  for (var i = 0; i < bits.length; ++i) {
    var startIndex = i;
    var width = 1;
    var bit = bits[i];
    var portName = getPortName(bit);
    var edge = edgeDict[bit];
    var netIsConst = isConst(bit);
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
        [idCounter, i] = addConstNodeToSources(node, bits, edge.sources, i, constNodeDict, idCounter);
        width = i - startIndex + 1;
      }
    }

    var [a, b, targetA, targetB] = getSourceAndTarget(edge);
    if (direction === "input") {
      a.push([nodeId, portId]);
      if (targetA) {
        addEdge(edge, portId, edgeTargetsDict, startIndex, width);
      } else {
        addEdge(edge, portId, edgeSourcesDict, startIndex, width)
      }
    } else if (direction === "output") {
      b.push([nodeId, portId]);
      if (targetB) {
        addEdge(edge, portId, edgeTargetsDict, startIndex, width);
      }
      else {
        addEdge(edge, portId, edgeSourcesDict, startIndex, width);
      }
    } else {
      throw new Error("Unknown direction " + direction);
    }
  }

  return idCounter;
}

function getSourceAndTarget2(edge) {
  return [edge.sources, edge.targets, false, true];
}

function getEdgeDictFromPorts(node, yosysModule, constNodeDict, idCounter, edgeTargetsDict, edgeSourcesDict) {
  var edgeDict = {}; // yosys bits (netId): LEdge
  var edgeArray = [];
  var portsIndex = 0;
  for (const [portName, portObj] of Object.entries(yosysModule.ports)) {
    var port = node.ports[portsIndex];
    port.properties.index = portsIndex;
    portsIndex++;

    function getPortName2(bit) {
      return portName;
    }
    idCounter = loadNets(node, node.id, port.id, portObj.bits, portObj.direction,
      edgeDict, constNodeDict, edgeArray, idCounter, getPortName2, getSourceAndTarget2, edgeTargetsDict, edgeSourcesDict)

  }
  return [edgeDict, edgeArray, constNodeDict, idCounter];
}

function getSourceAndTargetForCell(edge) {
  return [edge.targets, edge.sources, true, false];
}

function findIndex(array, val) {
  for (var i = 0; i < array.length; ++i) {
    if (array[i][0] === val[0] && array[i][1] === val[1]) {
      return i;
    }
  }
  return -1;
}

function getPortNameSplice(startIndex, width) {
  if (width === 1) {
    return `[${startIndex}]`;
  }
  else if (width > 1) {
    var endIndex = startIndex + width;
    return `[${endIndex}:${startIndex}]`;
  }

  throw new Error("Incorrect width" + width);

}

function filterEdges(edgeDictA, targetDict) {
  // targetDict is true if edgeDictA is edgeTargetsDict
  for (var [, edgeArray] of Object.entries(edgeDictA)) {
    var edgeDictB = {}
    var lastEdgeObj = undefined;
    for (var i = 0; i < edgeArray.length; ++i) {
      if (edgeArray[i] === undefined) {
        continue;
      }
      var edge = edgeArray[i][0];

      if (targetDict) {
        var key = edge.sources;
      } else {
        var key = edge.targets;
      }

      if (edgeDictB[edge.sources]) {
        edgeArray[i] = undefined;
        if (lastEdgeObj !== undefined) {
          ++lastEdgeObj[1];
        }
      }
      else {
        edgeDictB[edge.sources] = true;
        lastEdgeObj = edgeArray[i];
      }
    }
  }
}

function arrayHasDifferentTargets(array) {
  
  var targetsToCompare = undefined;
  for (var [edge, width] of array) {
    var targets = edge.targets;
    if (targetsToCompare === undefined) {
      targetsToCompare = targets;
    }
    else if (targets.join("") !== targetsToCompare.join("")){
      return true;
    }
  }
  return false;
}

function fillEdges(node, yosysModule, idCounter, childrenWithoutPortArray) {
  var constNodeDict = {};
  var edgeTargetsDict = {};
  var edgeSourcesDict = {};
  var [edgeDict, edgeArray, constNodeDict, idCounter] = getEdgeDictFromPorts(node, yosysModule, constNodeDict, idCounter, edgeTargetsDict, edgeSourcesDict);
  var netnamesDict = getNetNamesDict(yosysModule);
  function getPortName(bit) {
    return netnamesDict[bit];
  }

  for (var i = 0; i < node.children.length; i++) {
    const subNode = node.children[i];
    if (constNodeDict[subNode.id] === 1) {
      //skip constants to iterate original cells
      continue;
    }

    var cell = yosysModule.cells[subNode.hwMeta.name];
    var isslice = cell.type === "$slice";
    if (cell.port_directions == undefined) {
      continue;
    }
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

      idCounter = loadNets(node, subNode.id, portObj.id, bits, direction, edgeDict, constNodeDict,
        edgeArray, idCounter, getPortName, getSourceAndTargetForCell, edgeTargetsDict, edgeSourcesDict)
    }
  }
  // source null target null == direction is output

  for (const [cellObj, subNode] of childrenWithoutPortArray) {
    for (const [portName, bits] of Object.entries(cellObj.connections)) {
      for (var bit of bits) {
        var edge = edgeDict[bit];
        if (edge === undefined) {
          throw new Error("[Todo] create edge");
        }
        if (edge.sources.length === 0 && edge.targets.length == 0) {
          var direction = "output";
          var edgePoints = edge.sources;
        } else if (edge.sources.length === 0) {
          // no sources -> add as source
          var direction = "output";
          var edgePoints = edge.sources;
        } else {
          var direction = "input";
          var edgePoints = edge.targets;
        }

        var [port, idCounter] = makeLPort(portName, direction, idCounter);
        subNode.ports.push(port);
        edgePoints.push([subNode.id, port.id]);
      }
    }

  }

  var edgeSet = {}; // [sources, targets]: true
  for (const edge of edgeArray) {
    var key = [edge.sources, null, edge.targets]
    if (!edgeSet[key]) // filter duplicities
    {
      edgeSet[key] = true;
      node.edges.push(edge);
    }
  }

  return idCounter;
}

function hideChildrenAndNodes(node, yosysModule) {
  if (yosysModule !== null && node.children.length === 0 && node.edges.length === 0) {
    //node._children = node.children;
    delete node.children
    //node._edges = node.edges;
    delete node.edges;
  }
}

function makeNode(name, idCounter) {
  return {
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
}
function makeLNode(name, yosysModule, idCounter, yosysModules) {
  if (name === undefined) {
    throw new Error("Name is undefined");
  }

  var node = makeNode(name, idCounter);
  idCounter++;

  if (yosysModule != null) {
    // cell with module definition, load ports, edges and children from module def. recursively
    idCounter = fillPorts(node, yosysModule.ports, idCounter, "ports")
    var [idCounter, childrenWithoutPortArray] = fillChildren(node, yosysModule, idCounter, yosysModules)
    idCounter = fillEdges(node, yosysModule, idCounter, childrenWithoutPortArray)
  }

  //todo hide based on hierarchy level
  hideChildrenAndNodes(node, yosysModule);

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

function yosysTranslateIcons(node) {
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
  } else if (name.startsWith("$auto$splice.cc:78")) {
    meta.cls = "Operator";
    meta.name = "SLICE";
  } else if (name.startsWith("$auto$splice.cc:135")) {
    meta.cls = "Operator";
    meta.name = "CONCAT";
  }

  if (node.children !== undefined)
    node.children.forEach(yosysTranslateIcons);
}

export function yosysToD3Hwschematic(yosysJson) {
  var idCounter = 0;
  var [output, idCounter] = makeLNode("root", null, idCounter, null);

  var topModuleName = getTopModuleName(yosysJson);
  var [node, idCounter] = makeLNode(topModuleName, yosysJson.modules[topModuleName], idCounter, yosysJson.modules);
  output.children.push(node);
  output.hwMeta.maxId = idCounter - 1;
  yosysTranslateIcons(output);
  //print output to console
  //console.log(JSON.stringify(output, null, 2));

  return output;
}
