import {default as util} from 'util';
import {exec}  from 'child_process';
import {default as os} from 'os';

function puts(error, stdout, stderr) { 
    util.puts(stdout);
    if (error) {
        util.puts(stderr);
    } 
 }

// Run command depending on the OS
if (os.type() === 'Windows_NT') 
   exec("SET NODE_ENV=production && rollup -c", puts);
else
   exec("NODE_ENV=production rollup -c", puts);