import resolve from 'rollup-plugin-node-resolve'

const definition = require("./package.json");
const dependencies = Object.keys(definition.dependencies);

export default {
  input: "index",
  external: dependencies,
  output: {
    extend: true,
    file: `dist/${definition.name}.js`,
    format: "umd",
    globals: {
    	"d3": "d3",
    	'webworker-threads':'webworker-threads',
    }, //dependencies.reduce((p, v) => (p[v] = "d3", p), {}),
    name: "d3",
  },
  plugins: [ resolve() ],
};
