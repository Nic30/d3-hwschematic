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
        "direction": direction.toUpperCase(), // [d3-hwschematic specific] controls direction marker
        "properties": {
            "side": portSide,
            "index": 0 // The order is assumed as clockwise, starting with the leftmost port on the top side.
            // Required only for components with "org.eclipse.elk.portConstraints": "FIXED_ORDER"
        },
        "children": [], // list of LPort, if the port should be collapsed rename this property to "_children"
    }
}

function getPortSide(portName, direction, nodeName) {
    if (direction === "input" && nodeName === "MUX" && portName === "S") {
        return "SOUTH";
    }
    if (direction === "output") {
        return "EAST";
    }
    if (direction === "input") {
        return "WEST";
    }
    throw new Error("Unknown direction " + direction);
}

function makeLPort(portList, name, direction, idCounter, nodeName) {
    if (name === undefined) {
        throw new Error("Name is undefined");
    }

    let portSide = getPortSide(name, direction, nodeName);
    let port = makePort(name, direction, portSide, idCounter);
    port.properties.index = portList.length;
    portList.push(port);
    return [port, idCounter + 1];
}

function fillPorts(node, ports, idCounter, objType, cellObj) {
    const isSplit = cellObj !== undefined && cellObj.type === "$slice";
    const isConcat = cellObj !== undefined && cellObj.type === "$concat"
    for (let [portName, portObj] of Object.entries(ports)) {
        // objType === ports: portObj = modules[name].ports
        // objType === port_directions: portObj =
        // modules[name].cells.port_directions
        let direction;
        if (objType === "ports") {
            direction = portObj.direction;
        } else if (objType === "port_directions") {
            direction = portObj;
        } else {
            throw new Error("Invalid objType: " + objType)
        }

        if (isSplit) {
            if (portName === "Y") {
                portName = "";
            } else if (portName === "A") {
                portName = getPortNameSplice(cellObj.parameters.OFFSET, cellObj.parameters.Y_WIDTH);
            }
        } else if (isConcat) {
            if (portName === "Y") {
                portName = "";
            } else if (portName === "A") {
                portName = getPortNameSplice(0, cellObj.parameters.A_WIDTH);
            } else if (portName === "B") {
                portName = getPortNameSplice(cellObj.parameters.A_WIDTH, cellObj.parameters.B_WIDTH);
            }

        }
        let port;
        [port, idCounter] = makeLPort(node.ports, portName, direction, idCounter, node.hwMeta.name);
    }

    return idCounter;
}

function orderPorts(node) {
    let index = 0;
    for (let port of node.ports) {
        let dstIndex = index;
        if (port.hwMeta.name === "CLK") {
            dstIndex = node.ports.length - 1;
        } else if (port.hwMeta.name === "ARST") {
            dstIndex = node.ports.length - 2;
        }
        if (index !== dstIndex) {
            let otherPort = node.ports[dstIndex];
            node.ports[dstIndex] = port;
            node.ports[index] = otherPort;
            otherPort.properties.index = port.properties.index;
            port.properties.index = dstIndex;
        }
        ++index;
    }
}
function fillChildren(node, yosysModule, idCounter, yosysModules) {
    let childrenWithoutPortArray = [];
    let nodeIdToCell = {};
    // iterate all cells and lookup for modules and construct them recursively
    for (const [cellName, cellObj] of Object.entries(yosysModule.cells)) {
        let moduleName = cellObj.type; //module name
        let cellModuleObj = yosysModules[moduleName];
        let subNode;
        [subNode, idCounter] = makeLNode(cellName, cellModuleObj, idCounter, yosysModules);
        node.children.push(subNode);
        yosysTranslateIcons(subNode, cellObj);
        nodeIdToCell[subNode.id] = cellObj;
        if (cellModuleObj === undefined) {
            if (cellObj.port_directions === undefined) {
                // throw new Error("[Todo] if modules does not have definition in modules and its name does not \
                // start with $, then it does not have port_directions. Must add port to sources and targets of an edge")

                childrenWithoutPortArray.push([cellObj, subNode]);
                continue;
            }
            idCounter = fillPorts(subNode, cellObj.port_directions, idCounter, "port_directions", cellObj);

        }
    }

    return [idCounter, childrenWithoutPortArray, nodeIdToCell];
}

function addConstNode(node, nodeName, idCounter, constNodeDict) {
    let subNode;
    let port;
    [subNode, idCounter] = makeLNode(nodeName, undefined, idCounter, null);
    [port, idCounter] = makeLPort(subNode.ports,"O0", "output", idCounter, subNode.hwMeta.name);
    node.children.push(subNode);
    constNodeDict[subNode.id] = 1;

    return [subNode, port, idCounter];
}

function iterNetnameBits(netnames, fn) {
    for (const [netname, netObj] of Object.entries(netnames)) {
        for (const bit of netObj.bits) {
            fn(netname, bit, Number.isInteger(bit), isConst(bit));
        }
    }
}

function getNetNamesDict(yosysModule) {
    let netnamesDict = {}; // yosys bits (netId): netname

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
    let nodeName = nameArray.reverse().join("");
    nodeName = ["0b", nodeName].join("");
    if (nodeName.match(/^0b[01]+$/g)) {
        let res = BigInt(nodeName).toString(16);
        return ["0x", res].join("");
    }
    return nodeName;
}

function addConstNodeToSources(node, bits, sources, i, constNodeDict, idCounter) {
    let nameArray = [];
    for (i; i < bits.length; ++i) {
        let bit = bits[i];
        if (isConst(bit)) {
            nameArray.push(bit);
        } else {
            break;
        }
    }
    --i;
    // If bit is a constant, create a node with constant
    let nodeName = getConstNodeName(nameArray);
    let constSubNode;
    let port;
    [constSubNode, port, idCounter] = addConstNode(node, nodeName, idCounter, constNodeDict);
    sources.push([constSubNode.id, port.id]);
    return [idCounter, i];
}

function addEdge(edge, portId, edgeDict, startIndex, width) {
    let edgeArr = edgeDict[portId];
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
    for (let i = 0; i < bits.length; ++i) {
        let startIndex = i;
        let width = 1;
        let bit = bits[i];
        let portName = getPortName(bit);
        let edge = edgeDict[bit];
        let netIsConst = isConst(bit);
        if (netIsConst || edge === undefined) {
            // create edge if it is not in edgeDict
            if (portName === undefined) {
                if (!netIsConst) {
                    throw new Error("Netname is undefined");
                }
                portName = bit;
            }
            [edge, idCounter] = makeLEdge(portName, idCounter);
            edgeDict[bit] = edge;
            edgeArray.push(edge);
            if (netIsConst) {
                [idCounter, i] = addConstNodeToSources(node, bits, edge.sources, i, constNodeDict, idCounter);
                width = i - startIndex + 1;
            }
        }

        let [a, b, targetA, targetB] = getSourceAndTarget(edge);
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
            } else {
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
    let edgeDict = {}; // yosys bits (netId): LEdge
    let edgeArray = [];
    let portsIndex = 0;
    for (const [portName, portObj] of Object.entries(yosysModule.ports)) {
        let port = node.ports[portsIndex];
        portsIndex++;

        function getPortName2() {
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

function getPortNameSplice(startIndex, width) {
    if (width === 1) {
        return `[${startIndex}]`;
    } else if (width > 1) {
        let endIndex = startIndex + width;
        return `[${endIndex}:${startIndex}]`;
    }

    throw new Error("Incorrect width" + width);

}

function fillEdges(node, yosysModule, idCounter, childrenWithoutPortArray, nodeIdToCell) {
    let constNodeDict = {};
    let edgeTargetsDict = {};
    let edgeSourcesDict = {};
    let edgeDict;
    let edgeArray;
    [edgeDict, edgeArray, constNodeDict, idCounter] = getEdgeDictFromPorts(node, yosysModule, constNodeDict, idCounter, edgeTargetsDict, edgeSourcesDict);
    let netnamesDict = getNetNamesDict(yosysModule);

    function getPortName(bit) {
        return netnamesDict[bit];
    }

    for (let i = 0; i < node.children.length; i++) {
        const subNode = node.children[i];
        if (constNodeDict[subNode.id] === 1) {
            //skip constants to iterate original cells
            continue;
        }

        let cell = nodeIdToCell[subNode.id];
        if (cell.port_directions === undefined) {
            continue;
        }
        let connections = cell.connections;
        let portDirections = cell.port_directions;


        if (connections === undefined) {
            throw new Error("Cannot find cell for subNode" + subNode.hwMeta.name);
        }

        let portI = 0;
        for (const [portName, bits] of Object.entries(connections)) {
            let portObj = subNode.ports[portI++];
            let direction;
            if (portName.startsWith("$")) {
                direction = portObj.direction.toLowerCase(); //use direction from module port definition
            } else {
                direction = portDirections[portName];
            }

            idCounter = loadNets(node, subNode.id, portObj.id, bits, direction, edgeDict, constNodeDict,
                edgeArray, idCounter, getPortName, getSourceAndTargetForCell, edgeTargetsDict, edgeSourcesDict)
        }
    }
    // source null target null == direction is output

    for (const [cellObj, subNode] of childrenWithoutPortArray) {
        for (const [portName, bits] of Object.entries(cellObj.connections)) {
            let port = null;
            for (const bit of bits) {
                let edge = edgeDict[bit];
                if (edge === undefined) {
                    throw new Error("[Todo] create edge");
                }
                let edgePoints;
                let direction;
                if (edge.sources.length === 0 && edge.targets.length === 0) {
                    direction = "output";
                    edgePoints = edge.sources;
                } else if (edge.sources.length === 0) {
                    // no sources -> add as source
                    direction = "output";
                    edgePoints = edge.sources;
                } else {
                    direction = "input";
                    edgePoints = edge.targets;
                }

                if (port === null) {
                    [port, idCounter] = makeLPort(subNode.ports, portName, direction, idCounter, subNode.hwMeta.name);
                }

                edgePoints.push([subNode.id, port.id]);
            }
        }

    }

    let edgeSet = {}; // [sources, targets]: true
    for (const edge of edgeArray) {
        let key = [edge.sources, null, edge.targets]
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

    let node = makeNode(name, idCounter);
    idCounter++;

    if (yosysModule != null) {
        // cell with module definition, load ports, edges and children from module def. recursively
        idCounter = fillPorts(node, yosysModule.ports, idCounter, "ports");
        let childrenWithoutPortArray;
        let nodeIdToCell;
        [idCounter, childrenWithoutPortArray, nodeIdToCell] = fillChildren(node, yosysModule, idCounter, yosysModules)
        idCounter = fillEdges(node, yosysModule, idCounter, childrenWithoutPortArray, nodeIdToCell);
        for (let child of node.children) {
            if (child.hwMeta.cls === "Operator" && child.hwMeta.name.startsWith("FF")) {
                orderPorts(child);
            }
        }
    }

    //todo hide based on hierarchy level
    hideChildrenAndNodes(node, yosysModule);

    node.hwMeta.maxId = idCounter - 1;
    return [node, idCounter];
}

function getTopModuleName(yosysJson) {
    let topModuleName = undefined;
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

function yosysTranslateIcons(node, cell) {
    let meta = node.hwMeta;
    const t = cell.type;

    if (t === "$mux" || t === "$pmux") {
        meta.cls = "Operator";
        meta.name = "MUX";
    } else if (t === "$gt") {
        meta.cls = "Operator";
        meta.name = "GT";
    } else if (t === "$lt") {
        meta.cls = "Operator";
        meta.name = "LT";
    } else if (t === "$ge") {
        meta.cls = "Operator";
        meta.name = "GE";
    } else if (t === "$le") {
        meta.cls = "Operator";
        meta.name = "LE";
    } else if (t === "$not" || t === "$logic_not") {
        meta.cls = "Operator";
        meta.name = "NOT";
    } else if (t === "$logic_and") {
        meta.cls = "Operator";
        meta.name = "AND";
    } else if (t === "$eq") {
        meta.cls = "Operator";
        meta.name = "EQ";
    } else if (t === "$ne") {
        meta.cls = "Operator";
        meta.name = "NE";
    } else if (t === "$add") {
        meta.cls = "Operator";
        meta.name = "ADD";
    } else if (t === "$sub") {
        meta.cls = "Operator";
        meta.name = "SUB";
    } else if (t === "$mul") {
        meta.cls = "Operator";
        meta.name = "MUL";
    } else if (t === "$div") {
        meta.cls = "Operator";
        meta.name = "DIV";
    } else if (t === "$slice") {
        meta.cls = "Operator";
        meta.name = "SLICE";
    } else if (t === "$concat") {
        meta.cls = "Operator";
        meta.name = "CONCAT";
    } else if (t === "$adff") {
        meta.cls = "Operator";
        let arstPolarity = cell.parameters["ARST_POLARITY"];
        let clkPolarity = cell.parameters["CLK_POLARITY"];
        if (clkPolarity && arstPolarity) {
            meta.name = "FF_ARST_clk1_rst1";
        } else if (clkPolarity) {
            meta.name = "FF_ARST_clk1_rst0";
        } else if (arstPolarity) {
            meta.name = "FF_ARST_clk0_rst1";
        } else {
            meta.name = "FF_ARST_clk0_rst0";
        }
    } else if (t === "$dff") {
        meta.cls = "Operator";
        meta.name = "FF";
    } else if (t === "$shift" || t === "$shiftx") {
        meta.cls = "Operator";
        meta.name = "SHIFT";
    } else if (t === "$dlatch") {
        meta.cls = "Operator";
        let enPolarity = cell.parameters["EN_POLARITY"];
        if (enPolarity) {
            meta.name = "DLATCH_en1";
        } else {
            meta.name = "DLATCH_en0";

        }
    }
}

export function yosysToD3Hwschematic(yosysJson) {
    let [output, idCounter] = makeLNode("root", null, 0, null);

    let topModuleName = getTopModuleName(yosysJson);
    let node;
    [node, idCounter] = makeLNode(topModuleName, yosysJson.modules[topModuleName], idCounter, yosysJson.modules);
    output.children.push(node);
    output.hwMeta.maxId = idCounter - 1;
    //yosysTranslateIcons(output);
    //print output to console
    //console.log(JSON.stringify(output, null, 2));

    return output;
}
