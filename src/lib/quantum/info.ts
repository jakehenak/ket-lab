import type { GateType } from "./types";

export type GateCopy = {
  name: string;
  hint: string;
  /** How to place it. */
  place: string;
  blurb: string;
};

export const GATE_COPY: Record<GateType, GateCopy> = {
  H: {
    name: "Hadamard",
    hint: "H",
    place: "Tap a wire",
    blurb: "Sends |0\u27e9 to |+\u27e9 and |1\u27e9 to |\u2212\u27e9. The equal-superposition gate.",
  },
  X: {
    name: "Pauli X",
    hint: "X",
    place: "Tap a wire",
    blurb: "Bit flip. Quantum NOT: |0\u27e9 and |1\u27e9 trade places.",
  },
  Y: {
    name: "Pauli Y",
    hint: "Y",
    place: "Tap a wire",
    blurb: "Bit flip plus a factor of i. Y = iXZ.",
  },
  Z: {
    name: "Pauli Z",
    hint: "Z",
    place: "Tap a wire",
    blurb: "Phase flip. |1\u27e9 picks up a minus sign; |0\u27e9 stays put.",
  },
  S: {
    name: "S",
    hint: "S",
    place: "Tap a wire",
    blurb: "Phase gate, \u221aZ. |1\u27e9 goes to i|1\u27e9 \u2014 a quarter turn around Z.",
  },
  T: {
    name: "T",
    hint: "T",
    place: "Tap a wire",
    blurb: "\u03c0/8 gate, \u221aS. |1\u27e9 goes to e^{i\u03c0/4}|1\u27e9.",
  },
  Sdg: {
    name: "S\u2020",
    hint: "S\u2020",
    place: "Tap a wire",
    blurb: "Inverse of S. |1\u27e9 goes to \u2212i|1\u27e9.",
  },
  Tdg: {
    name: "T\u2020",
    hint: "T\u2020",
    place: "Tap a wire",
    blurb: "Inverse of T. Undoes the \u03c0/8 phase.",
  },
  RX: {
    name: "RX",
    hint: "RX",
    place: "Tap a wire",
    blurb: "Rotate the Bloch vector around X by \u03b8. RX(\u03c0) is a NOT, up to global phase.",
  },
  RY: {
    name: "RY",
    hint: "RY",
    place: "Tap a wire",
    blurb: "Rotate around Y by \u03b8. RY(\u03c0/2) takes |0\u27e9 to |+\u27e9.",
  },
  RZ: {
    name: "RZ",
    hint: "RZ",
    place: "Tap a wire",
    blurb: "Rotate around Z by \u03b8. A diagonal phase, split symmetrically.",
  },
  CNOT: {
    name: "CNOT",
    hint: "CX",
    place: "Tap control, then target",
    blurb: "If the control is |1\u27e9, flip the target. This is the usual entangling gate.",
  },
  CZ: {
    name: "CZ",
    hint: "CZ",
    place: "Tap both qubits",
    blurb: "If both qubits are |1\u27e9, apply a minus sign. Either wire can be the control.",
  },
  CP: {
    name: "CPhase",
    hint: "P",
    place: "Tap control, then target",
    blurb: "If both qubits are |1\u27e9, multiply by e^{i\u03b8}. CZ is the special case \u03b8 = \u03c0.",
  },
  SWAP: {
    name: "SWAP",
    hint: "SW",
    place: "Tap both qubits",
    blurb: "Exchange the two qubit states.",
  },
  CCX: {
    name: "Toffoli",
    hint: "CCX",
    place: "Tap two controls, then the target",
    blurb: "Flip the target only when both controls are |1\u27e9. Universal with single-qubit gates.",
  },
  M: {
    name: "Meter",
    hint: "M",
    place: "Tap a wire",
    blurb: "Marks a readout. Sampling still draws the full register from the Born rule.",
  },
};

export const PALETTE: Array<{ label: string; gates: GateType[] }> = [
  { label: "Single", gates: ["H", "X", "Y", "Z", "S", "T", "Sdg", "Tdg"] },
  { label: "Rotate", gates: ["RX", "RY", "RZ"] },
  { label: "Entangle", gates: ["CNOT", "CZ", "CP", "SWAP", "CCX"] },
  { label: "Read", gates: ["M"] },
];
