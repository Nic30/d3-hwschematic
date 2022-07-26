module mux2x1(a,b,s, out);
  input a,b,s;
  wire and_1,and_2,s_c;
  output out;
  assign out = (s)? a: b;
endmodule

module mux4x2(i0,i1,i2,i3,s1,s0, out);
  input i0,i1,i2,i3,s1,s0;
  output out;
  wire mux1, mux2;
  mux2x1 mux_1(i0,i1,s1, mux1);
  mux2x1 mux_2(i2,i3,s1, mux2);
  mux2x1 mux_3(mux1,mux2,s0, out);
endmodule
