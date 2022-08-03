module partialConstDriver2(input in, output [8-1:0] out);
  assign out = {4'B 1101, in, 3'B 101};
endmodule
