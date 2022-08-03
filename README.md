# d3-hwschematic
[![Travis-ci Build Status](https://travis-ci.org/Nic30/d3-hwschematic.png?branch=master)](https://travis-ci.org/Nic30/d3-hwschematic)
[![Windows Build Status](https://ci.appveyor.com/api/projects/status/73w4swf18m8mr1t0?svg=true)](https://ci.appveyor.com/project/Nic3084362/d3-hwschematic)
[![npm version](https://badge.fury.io/js/d3-hwschematic.svg)](https://badge.fury.io/js/d3-hwschematic)[![Coverage Status](https://coveralls.io/repos/github/Nic30/d3-hwschematic/badge.svg?branch=master)](https://coveralls.io/github/Nic30/d3-hwschematic?branch=master)[![Documentation Status](https://readthedocs.org/projects/d3-hwschematic/badge/?version=latest)](http://d3-hwschematic.readthedocs.io/en/latest/?badge=latest)

D3.js and ELK based schematic visualizer.

Use `npm install d3-hwschematic --save` to install this library and save it to your package.json file.

## Features:

* automatic layout (layered graph with orthogonal routing, created by `elkjs`) with caching
* hierarchical components expandable on click
* net selection on click, highligh and tooltip on mouse over
* zoom, drag
* css style/class specifiable in input json, d3.js querey as a query language in javascript
* support for user node renderers and user CSS
* input is [ELK json](https://www.eclipse.org/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html) with hwMeta propoperty (described in this document)

![cdc_pulse_gen](https://github.com/Nic30/d3-hwschematic/raw/master/doc/cdc_pulse_gen.png "cdc_pulse_gen")

## Typical usecase

* A widget in for "synthesis tool" [jupyter_widget_hwt](https://github.com/Nic30/jupyter_widget_hwt)
* An extension for Sphinx document generator [sphinx-hwt](https://github.com/Nic30/sphinx-hwt)

## How to use examples

### Online

* Documentation of [hwtLib](https://hwtlib.readthedocs.io/en/latest/?badge=latest).
  (Look for scheme href under component name.)

* [jupyter_widget_hwt](https://github.com/Nic30/jupyter_widget_hwt) - Jupyter widgets for hw developement.


### From this git

1. download dependencies and build this library

```bash
npm install
npm install --only=dev
npm run build
```

2. Then you can open examples, but current web browsers does not allow to load files from local disk (because of security).
It has multiple solution
  * You can run chrome with --allow-file-access-from-files option
  * (prefered) Or use webserver. One webserver implementation is part of standard python distribution.

```bash
# (in root directory of this git)
python3 -m http.server 8888
```

Now you should be able to view the example application on http://0.0.0.0:8888/examples/example.html?schematic=/examples/schemes/Cdc.json.
Where part after schematic= is path to json file where schematic is stored.


## ELK json format for d3-hwschematic

This libarary uses [ELK json](https://www.eclipse.org/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html), [ELK options](https://www.eclipse.org/elk/reference/options.html).
This format is basically a component tree stored in json.
The json specifies not just the structure of circuit but also how the circuit should be rendered.
It contains 3 object types `LNode`, `LPort` and `LEdge`.

ELK `LNode` (component instance)
```javascript
{
  "id": "0",
  "hwMeta": { // [d3-hwschematic specific]
    "name": "compoent instance name", // optional str
    "cls": "compoent (module) name", // optional str
    "bodyText": "", // optional str
    "maxId": 2, // max id of any object in this node used to avoid re-counting object if new object is generated
    "isExternalPort": true, // optional flag which set LNode style to external LPort
    "cssClass": "node-style0", // optional string, css classes separated by space
    "cssStyle": "fill:red", // css style specification separated by ;
  },
  "properties": { // recommended renderer settings
    "org.eclipse.elk.portConstraints": "FIXED_ORDER", // can be also "FREE" or other value accepted by ELK
    "org.eclipse.elk.layered.mergeEdges": 1
  },
  "ports": [],    // list of LPort
  "edges": [],    // list of LEdge
  "children": [], // list of LNode, if the node should be collapsed rename this property
                  // to "_children" and "edges" to "_edges"
}
```
If the children should be collapsed by default, the children `children` and `edges` property should be renamed to `_children` and `_edges`.

ELK `LPort`
```javascript
{
  "id": "1",
  "hwMeta": { // [d3-hwschematic specific]
    "name": "port name",
    "cssClass": "node-style0", // optional string, css classes separated by space
    "cssStyle": "fill:red", // css style specification separated by ;
    "connectedAsParent": true, // an optional flag that notes that this LPort
                               // has no connections but it is connected as its parent LPort
  },
  "direction": "OUTPUT", // [d3-hwschematic specific] controlls direction marker
  "properties": {
    "side": "EAST",
    "index": 0 // The order is assumed as clockwise, starting with the leftmost port on the top side.
                   // Required only for LNodes with "org.eclipse.elk.portConstraints": "FIXED_ORDER"
  },
  "children": [], // list of LPort, if the port should be collapsed rename this property to "_children"
}
```

ELK `LEdge`
```javascript
{ // simple LEdge
  "id": "62",
  "source": "2", // id of LNode
  "sourcePort": "23", // id of LPort
  "target": "4", // id of LNode
  "targetPort": "29", // id of LPort
  "hwMeta": { // [d3-hwschematic specific]
    "name": null // optional string, displayed on mouse over
    "cssClass": "link-style0", // optional string, css classes separated by space
    "cssStyle": "stroke:red", // css style specification separated by ;
  }
}
{ // hyper LEdge
  "id": "1119",
  "sources": [
    ["17", "343"]  // id of LNode, id of LPort
  ],
  "targets": [
    [ "18", "346"],  // id of LNode, id of LPort
    [ "21", "354"],
  ],
  "hwMeta": { // [d3-hwschematic specific]
    "name": "wr_ptr",
    "cssClass": "link-style0", // optional string, css classes separated by space
    "cssStyle": "stroke:red", // css style specification separated by ;
  }
}
```

`LEdge` souce destination has to always be directly visible from the `LNode` where the `LEdge` is instanciated.
That means that LEdge may connect only to LPorts of current LNode or to LPorts of this LNode direct children `LNode`s.
`LNode` represents all types of components. Top LPorts are also represented as `LNode` because it looks better.


## Component shapes

The style and shape is determined by node renderers. Node renderers are defined in `src/node_renderers`.
Renderer classes can be registered using  `HwSchematic.nodeRenderers.registerRenderer()` function on HwSchematic object.
The node renderer has function `select` which is used to determine if renderer should be used for for selected LNode.



## Similar opensource projects

* [netlistsvg](https://github.com/nturley/netlistsvg) - draws an SVG schematic from a JSON netlist
* [pyVhdl2Sch](https://github.com/LaurentCabaret/pyVhdl2Sch) -  Python based VHDL to (pdf) schematic converter
* [verilog-dot](https://github.com/ben-marshall/verilog-dot) - Python, A simple dot file / graph generator for Verilog syntax trees.
* [diagrammer](https://github.com/freechipsproject/diagrammer) - Scala, Very simple visualizer for chisel3.
* [hwstudio](https://github.com/umarcor/hwstudio) - GDScript, GUI editor for hardware description designs
* [Spyce](https://github.com/imec-myhdl/Spyce) - Python, Simple circuit editor, MyHDL output (only prototype)
* [circuitsandbox](http://bitbucket.org/kwellwood/circuitsandbox) - Java, Boolean network editor and simulator
* [CuFlow](https://github.com/jamesbowman/cuflow) - Python, experimental procedural PCB layout program
* [BreadboardSim](https://github.com/daveshah1/BreadboardSim) - C#, Circuit Simulator with Breadboard UI
* [hneemann/Digital](https://github.com/hneemann/Digital) - Java, Circut simulator and editor
* [adaptagrams](https://github.com/mjwybrow/adaptagrams) - C++, Libraries for constraint-based layout and connector routing for diagrams.
* [sphinxcontrib-hdl-diagrams](https://github.com/SymbiFlow/sphinxcontrib-hdl-diagrams) - Python, Sphinx Extension which generates various types of diagrams from Verilog code.
* [logidrom](https://github.com/wavedrom/logidrom) - JS, Digital circuit renderer for some specific circuits
* [dkilfoyle/logic](https://github.com/dkilfoyle/logic) - JS, IDE for digital circuit simulation
* [Eclipse Layout Kernel (ELK)](https://github.com/eclipse/elk) - Java, Libary focused on automatic graph drawing.
* [electric-circuits](https://github.com/symbench/electric-circuits) - JS, Electric Circuits Domain for webGME
* [elkjs](https://github.com/kieler/elkjs) - JS, ELK transpiled to JS, (used in this project)
* [ogdf](https://github.com/ogdf/ogdf) - C++, Libary focused on automatic graph drawing.
* [hdelk](https://github.com/davidthings/hdelk) - Web-based HDL diagramming tool
* [schemdraw](https://bitbucket.org/cdelker/schemdraw) - Python, manual layout electrical circuit schematic diagrams
* [Siva](https://github.com/jasonpjacobs/Siva) - Python, Qt based scheme editor
* [HAL](https://github.com/emsec/hal) - Python, The Hardware Analyzer
* [VSRTL](https://github.com/mortbopet/VSRTL/) - C++, Visual Simulation of Register Transfer Logic
