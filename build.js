//var util = require('util');
var exec = require('child_process').exec;
var os = require('os');

//function puts(error, stdout, stderr) { util.puts(stdout) }

// Run command depending on the OS
if (os.type() === 'Windows_NT') 
   exec("SET NODE_ENV=production && rollup -c");
else
   exec("NODE_ENV=production rollup -c");