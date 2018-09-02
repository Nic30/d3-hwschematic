# d3-hwschematic
[![Travis-ci Build Status](https://travis-ci.org/Nic30/d3-hwschematic.png?branch=master)](https://travis-ci.org/Nic30/d3-hwschematic)[![npm version](https://badge.fury.io/js/d3-hwschematic.svg)](https://badge.fury.io/js/d3-hwschematic)[![Coverage Status](https://coveralls.io/repos/github/Nic30/d3-hwschematic/badge.svg?branch=master)](https://coveralls.io/github/Nic30/d3-hwschematic?branch=master)[![Documentation Status](https://readthedocs.org/projects/d3-hwschematic/badge/?version=latest)](http://d3-hwschematic.readthedocs.io/en/latest/?badge=latest)

D3.js and ELK based schematic visualizer.

Use `npm install d3-hwschematic --save` to install this library and save it to your package.json file.

## Features:

* automatic layout
* hierarchical components expandable on click
* net selection on click
* zoom, drag
* input is [ELK json](https://www.eclipse.org/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html)


## How to use examples

### Online

This library is used in generated documentation for HWToolkit projects.
One of them is documentation of [CRC generator](https://hwtlib.readthedocs.io/en/latest/_static/schematic_viewer/schematic_viewer.html?schematic=../../_static/hwt_schematics/hwtLib.logic.crc.Crc.json).
There is much more in [hwtLib](https://hwtlib.readthedocs.io/en/latest/?badge=latest).

This documentations usually use some older version of this library.


### From this git

1. download dependencies and build this library

```bash
npm install
npm install --only=dev
npm run build
```

2. then you can open examples, but current web browsers does not allow to load files from local disk (because of security).
It has multiple solution 
  * You can run chrome with --allow-file-access-from-files option
  * (prefered) Or use webserver. One webserver implementation is part of standard python distribution. 

```bash
# (in root directory of this git)
python3 -m http.server 8888
```

Now you should be able to view example application on http://0.0.0.0:8888/examples/example.html?schematic=/examples/schemes/Crc.json.
Where part after schematic= is path to json file where schematic is sotored. 



## Similar opensource projects

https://github.com/nturley/netlistsvg
