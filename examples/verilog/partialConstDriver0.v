module partialConstDriver0(input in, output [8-1:0] out);
  assign out = {in, 7'B 0101101};
endmodule
