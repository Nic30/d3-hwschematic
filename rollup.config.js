import {nodeResolve} from '@rollup/plugin-node-resolve';
const definition = require("./package.json");
const dependencies = Object.keys(definition.dependencies);

export default {
  input: "index",
  external: dependencies,
  plugins: [
	nodeResolve({
    jsnext: true,
    module: true
  }),
  ],
  output: {
    extend: true,
    file: `dist/${definition.name}.js`,
    format: "umd",
    globals: {
	  // lib name: name where lib exports itself on "window"
      "d3-array"     : "d3", 
      "d3-zoom"      : "d3",
      "d3-selection" : "d3",
      "elkjs": "ELK",
    },
    name: "d3",
  },
};
