import type { GateOp, GateType } from "./types";

export type Preset = {
  id: string;
  name: string;
  blurb: string;
  n: number;
  gates: GateOp[];
};

let seq = 0;

function op(
  preset: string,
  type: GateType,
  qubits: number[],
  column: number,
  theta?: number,
): GateOp {
  seq += 1;
  return {
    id: `${preset}-${type}-${seq}`,
    type,
    qubits,
    column,
    theta,
  };
}

function singles(
  preset: string,
  type: GateType,
  qubits: number[],
  column: number,
  theta?: number,
): GateOp[] {
  return qubits.map((q) => op(preset, type, [q], column, theta));
}

/**
 * Qiskit little-endian QFT (qubit 0 is the least significant bit), including
 * the final bit reversal so amplitudes match Σ exp(2πi x k / N) |k⟩.
 */
function qftOps(preset: string, n: number, column0: number): GateOp[] {
  const gates: GateOp[] = [];
  let column = column0;
  for (let target = n - 1; target >= 0; target--) {
    gates.push(op(preset, "H", [target], column));
    column += 1;
    for (let control = 0; control < target; control++) {
      const k = target - control;
      gates.push(op(preset, "CP", [control, target], column, Math.PI / 2 ** k));
      column += 1;
    }
  }
  for (let i = 0; i < Math.floor(n / 2); i++) {
    gates.push(op(preset, "SWAP", [i, n - 1 - i], column));
    column += 1;
  }
  return gates;
}

export const PRESETS: Preset[] = [
  {
    id: "bell",
    name: "Bell pair",
    blurb: "(|00⟩ + |11⟩) / √2. Each Bloch sphere looks mixed — the entanglement is in the pair, not in either qubit.",
    n: 2,
    gates: [op("bell", "H", [0], 0), op("bell", "CNOT", [0, 1], 1)],
  },
  {
    id: "plus",
    name: "Plus state",
    blurb: "H|0⟩ = |+⟩, the +X pole of the Bloch sphere. A second H brings it home.",
    n: 1,
    gates: [op("plus", "H", [0], 0)],
  },
  {
    id: "phase",
    name: "T on |+⟩",
    blurb: "Hadamard, then T. The state sits on the equator, halfway from +X toward +Y.",
    n: 1,
    gates: [op("phase", "H", [0], 0), op("phase", "T", [0], 1)],
  },
  {
    id: "interfere",
    name: "Interference",
    blurb: "H, Z, H sends |0⟩ to |1⟩. The phase kick from Z becomes a bit you can measure.",
    n: 1,
    gates: [op("interfere", "H", [0], 0), op("interfere", "Z", [0], 1), op("interfere", "H", [0], 2)],
  },
  {
    id: "ghz",
    name: "GHZ",
    blurb: "(|000⟩ + |111⟩) / √2. The three-qubit cousin of the Bell pair.",
    n: 3,
    gates: [
      op("ghz", "H", [0], 0),
      op("ghz", "CNOT", [0, 1], 1),
      op("ghz", "CNOT", [1, 2], 2),
    ],
  },
  {
    id: "deutsch-c",
    name: "Deutsch · constant",
    blurb: "One query, constant oracle. Qubit 0 reads 0 — the hidden function ignores its input.",
    n: 2,
    gates: [
      op("deutsch-c", "X", [1], 0),
      ...singles("deutsch-c", "H", [0, 1], 1),
      op("deutsch-c", "H", [0], 2),
    ],
  },
  {
    id: "deutsch-b",
    name: "Deutsch · balanced",
    blurb: "Same preparation, but the oracle is a CNOT. Qubit 0 reads 1 — the function is balanced.",
    n: 2,
    gates: [
      op("deutsch-b", "X", [1], 0),
      ...singles("deutsch-b", "H", [0, 1], 1),
      op("deutsch-b", "CNOT", [0, 1], 2),
      op("deutsch-b", "H", [0], 3),
    ],
  },
  {
    id: "grover",
    name: "Grover · |11⟩",
    blurb: "One Grover iterate. The CZ oracle marks |11⟩ and diffusion turns that mark into a certainty.",
    n: 2,
    gates: [
      ...singles("grover", "H", [0, 1], 0),
      op("grover", "CZ", [0, 1], 1),
      ...singles("grover", "H", [0, 1], 2),
      ...singles("grover", "X", [0, 1], 3),
      op("grover", "CZ", [0, 1], 4),
      ...singles("grover", "X", [0, 1], 5),
      ...singles("grover", "H", [0, 1], 6),
    ],
  },
  {
    id: "qft",
    name: "QFT of |001⟩",
    blurb: "Fourier transform of the basis state |001⟩. Every amplitude has size 1/√8, with phase stepping by 45°.",
    n: 3,
    gates: [op("qft", "X", [0], 0), ...qftOps("qft", 3, 1)],
  },
  {
    id: "vacuum",
    name: "Vacuum |0…0⟩",
    blurb: "Nothing on the wires. The register sits in |0⟩, ready for a gate.",
    n: 1,
    gates: [],
  },
];

export function presetById(id: string | null): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

export function highestColumn(gates: readonly GateOp[]): number {
  let hi = -1;
  for (const gate of gates) if (gate.column > hi) hi = gate.column;
  return hi;
}
