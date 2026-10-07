export const GATE_TYPES = [
  "H",
  "X",
  "Y",
  "Z",
  "S",
  "T",
  "Sdg",
  "Tdg",
  "RX",
  "RY",
  "RZ",
  "CNOT",
  "CZ",
  "CP",
  "SWAP",
  "CCX",
  "M",
] as const;

export type GateType = (typeof GATE_TYPES)[number];

export type GateOp = {
  id: string;
  type: GateType;
  /**
   * Qubit indices. Least significant bit is qubit 0.
   * CNOT and CP: [control, target]. CCX: [control, control, target].
   */
  qubits: number[];
  /** Radians, for RX / RY / RZ / CP. */
  theta?: number;
  column: number;
};

export const MIN_QUBITS = 1;
export const MAX_QUBITS = 6;
export const MAX_COLUMNS = 14;

export function arity(type: GateType): number {
  if (type === "CNOT" || type === "CZ" || type === "CP" || type === "SWAP") return 2;
  if (type === "CCX") return 3;
  return 1;
}

export function hasAngle(type: GateType): boolean {
  return type === "RX" || type === "RY" || type === "RZ" || type === "CP";
}

export function gateSpan(gate: GateOp): [number, number] {
  let lo = gate.qubits[0] ?? 0;
  let hi = lo;
  for (const q of gate.qubits) {
    if (q < lo) lo = q;
    if (q > hi) hi = q;
  }
  return [lo, hi];
}

export function isGateType(value: string): value is GateType {
  return (GATE_TYPES as readonly string[]).includes(value);
}
