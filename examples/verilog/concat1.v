module concat1(input in0, input in1, input in2, output [3-1:0] out);
  wire [2-1:0] x;
  assign x = {in2, in1};
  assign out = {x, in0};
endmodule
