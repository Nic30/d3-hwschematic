const AND = `
<g width="30" height="25">
  <path d="M0,0 L0,25 L15,25 A15 12.5 0 0 0 15,0 Z"/>
</g>`;

const NAND = `
<g width="30" height="25">
  <path d="M0,0 L0,25 L15,25 A15 12.5 0 0 0 15,0 Z"/>
  <circle cx="34" cy="12.5" r="3" />
</g>`;

const DFF = `
<g width="30" height="40">
  <rect width="30" height="40" x="0" y="0"/>
  <path d="M0,35 L5,30 L0,25"/>
</g>`;

const EQ = `
<g width="25" height="25">
  <circle r="12.5" cx="12.5" cy="12.5" />
  <line x1="7.5" x2="17.5" y1="10" y2="10" />
  <line x1="7.5" x2="17.5" y1="15" y2="15" />
</g>`;

const NEQ = `
<g width="25" height="25">
  <circle r="12.5" cx="12.5" cy="12.5" />
  <line x1="7.5" x2="17.5" y1="10" y2="10" />
  <line x1="7.5" x2="17.5" y1="15" y2="15" />
  <line x1="9"   x2="16"   y1="17" y2="8">
</g>`;
		
const MUX = `
<g width="20" height="40">
  <path d="M0,0 L20,10 L20,30 L0,40 Z"/>
</g>`;

const OR = `
<g width="30" height="25">
  <path d="M0,25 L0,25 L15,25 A15 12.5 0 0 0 15,0 L0,0"/>
  <path d="M0,0 A30 25 0 0 1 0,25" />
</g>`;

const NOR = `
<g width="33" height="25">
  <path d="M0,25 L0,25 L15,25 A15 12.5 0 0 0 15,0 L0,0"/>
  <path d="M0,0 A30 25 0 0 1 0,25" />
  <circle cx="34" cy="12.5" r="3" />
</g>`;

const XOR = `
<g width="33" height="25">
  <path d="M3,0 A30 25 0 0 1 3,25 A30 25 0 0 0 33,12.5 A30 25 0 0 0 3,0" />
  <path d="M0,0 A30 25 0 0 1 0,25" />
</g>`;

const NXOR = `
<g width="33" height="25">
  <path d="M3,0 A30 25 0 0 1 3,25 A30 25 0 0 0 33,12.5 A30 25 0 0 0 3,0" />
  <path d="M0,0 A30 25 0 0 1 0,25" />
  <circle cx="35" cy="12.5" r="3" />
</g>`;

const NOT = `
<g width="30" height="20">
  <path d="M0,0 L0,20 L20,10 Z" />
  <circle cx="23" cy="10" r="3" />
</g>`;

const ADD = `
<g width="25" height="25">
  <circle r="12.5" cx="12.5" cy="12.5" />
  <line x1="7.5" x2="17.5" y1="12.5" y2="12.5" />
  <line x1="12.5" x2="12.5" y1="7.5" y2="17.5" />
</g>`;

const SUB = `
<g width="25" height="25">
  <circle r="12.5" cx="12.5" cy="12.5" />
  <line x1="7.5" x2="17.5" y1="12.5" y2="12.5" />
</g>`;

var _parser = new DOMParser();
export const SHAPES = {
		"NOT":  _parser.parseFromString(NOT, "image/svg+xml").documentElement,

		"AND":  _parser.parseFromString(AND, "image/svg+xml").documentElement,
		"NAND": _parser.parseFromString(NAND, "image/svg+xml").documentElement,
		"OR":   _parser.parseFromString(OR, "image/svg+xml").documentElement,
		"NOR":  _parser.parseFromString(NOR, "image/svg+xml").documentElement,
		"XOR":  _parser.parseFromString(XOR, "image/svg+xml").documentElement,
		"NXOR": _parser.parseFromString(NXOR, "image/svg+xml").documentElement,
		
		"ADD":  _parser.parseFromString(ADD, "image/svg+xml").documentElement,
		"SUB":  _parser.parseFromString(SUB, "image/svg+xml").documentElement,
		
		"EQ":   _parser.parseFromString(EQ, "image/svg+xml").documentElement,
		"NEQ":  _parser.parseFromString(NEQ, "image/svg+xml").documentElement,

		"DFF":  _parser.parseFromString(DFF, "image/svg+xml").documentElement,
};

