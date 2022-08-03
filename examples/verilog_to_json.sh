#!/bin/bash

# Script expects one file with a module of the same name.
# It creates json form verilog file using yosys.

if !(test 1 -eq $#); then
	echo 1 argument required
	exit 1
fi;

file=$1
yosys <<EOF
read_verilog $file.v;
hierarchy -top $file;
synth -run coarse -noabc -noalumacc -nordff;
splice
# show -stretch; # show circuit in yosys graphviz
write_json $file.json;
EOF
