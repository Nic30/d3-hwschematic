#!/bin/bash

# Internal scipt for generating yosys test files,

cd verilog
for filename in *; do
	name=`echo $filename | cut -d"." -f1`
	../verilog_to_json.sh $name
done;


mv *.json ../schemes_yosys
cd ..
