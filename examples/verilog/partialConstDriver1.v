module partialConstDriver1(input in, output [8-1:0] out);
  assign out = {7'B 0101101, in};
endmodule
