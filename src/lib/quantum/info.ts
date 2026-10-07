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
    blurb: "Sends |0⟩ to |+⟩ and |1⟩ to |−⟩. The equal-superposition gate.",
  },
  X: {
    name: "Pauli X",
    hint: "X",
    place: "Tap a wire",
    blurb: "Bit flip. Quantum NOT: |0⟩ and |1⟩ trade places.",
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
    blurb: "Phase flip. |1⟩ picks up a minus sign; |0⟩ stays put.",
  },
  S: {
    name: "S",
    hint: "S",
    place: "Tap a wire",
    blurb: "Phase gate, √Z. |1⟩ goes to i|1⟩ — a quarter turn around Z.",
  },
  T: {
    name: "T",
    hint: "T",
    place: "Tap a wire",
    blurb: "π/8 gate, √S. |1⟩ goes to e^{iπ/4}|1⟩.",
  },
  Sdg: {
    name: "S†",
    hint: "S†",
    place: "Tap a wire",
    blurb: "Inverse of S. |1⟩ goes to −i|1⟩.",
  },
  Tdg: {
    name: "T†",
    hint: "T†",
    place: "Tap a wire",
    blurb: "Inverse of T. Undoes the π/8 phase.",
  },
  RX: {
    name: "RX",
    hint: "RX",
    place: "Tap a wire",
    blurb: "Rotate the Bloch vector around X by θ. RX(π) is a NOT, up to global phase.",
  },
  RY: {
    name: "RY",
    hint: "RY",
    place: "Tap a wire",
    blurb: "Rotate around Y by θ. RY(π/2) takes |0⟩ to |+⟩.",
  },
  RZ: {
    name: "RZ",
    hint: "RZ",
    place: "Tap a wire",
    blurb: "Rotate around Z by θ. A diagonal phase, split symmetrically.",
  },
  CNOT: {
    name: "CNOT",
    hint: "CX",
    place: "Tap control, then target",
    blurb: "If the control is |1⟩, flip the target. This is the usual entangling gate.",
  },
  CZ: {
    name: "CZ",
    hint: "CZ",
    place: "Tap both qubits",
    blurb: "If both qubits are |1⟩, apply a minus sign. Either wire can be the control.",
  },
  CP: {
    name: "CPhase",
    hint: "P",
    place: "Tap control, then target",
    blurb: "If both qubits are |1⟩, multiply by e^{iθ}. CZ is the special case θ = π.",
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
    blurb: "Flip the target only when both controls are |1⟩. Universal with single-qubit gates.",
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
