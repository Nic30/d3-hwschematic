import {exec}  from 'child_process';
import {default as os} from 'os';

function puts(error, stdout, stderr) { 
    console.log(stdout);
    if (error) {
        console.log(stderr);
    } 
 }

// Run command depending on the OS
if (os.type() === 'Windows_NT') 
   exec("SET NODE_ENV=production && rollup -c", puts);
else
   exec("NODE_ENV=production rollup -c", puts);