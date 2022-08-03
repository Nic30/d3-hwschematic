module concat0(input in0, input in1, input in2, output [3-1:0] out);
  assign out = {in2, in1, in0};
endmodule
