import { add, c, cis, conj, mag, mag2, mul, phase, scale, type C, type M2 } from "./complex";
import { singleQubitMatrix } from "./gates";
import type { GateOp } from "./types";

export function zeroState(n: number): C[] {
  const state = Array.from({ length: 1 << n }, () => c(0));
  state[0] = c(1);
  return state;
}

export function cloneState(state: readonly C[]): C[] {
  return state.map((a) => ({ re: a.re, im: a.im }));
}

function applyMatrix(state: C[], qubit: number, m: M2): void {
  const [a, b, d, e] = m;
  const bit = 1 << qubit;
  for (let i = 0; i < state.length; i++) {
    if (i & bit) continue;
    const j = i | bit;
    const a0 = state[i];
    const a1 = state[j];
    state[i] = add(mul(a, a0), mul(b, a1));
    state[j] = add(mul(d, a0), mul(e, a1));
  }
}

function applySwap(state: C[], a: number, b: number): void {
  if (a === b) return;
  const bitA = 1 << a;
  const bitB = 1 << b;
  for (let i = 0; i < state.length; i++) {
    const hasA = (i & bitA) !== 0;
    const hasB = (i & bitB) !== 0;
    if (hasA || !hasB) continue;
    const j = (i | bitA) & ~bitB;
    const tmp = state[i];
    state[i] = state[j];
    state[j] = tmp;
  }
}

function applyCnot(state: C[], control: number, target: number): void {
  if (control === target) return;
  const bc = 1 << control;
  const bt = 1 << target;
  for (let i = 0; i < state.length; i++) {
    if ((i & bc) === 0 || (i & bt) !== 0) continue;
    const j = i | bt;
    const tmp = state[i];
    state[i] = state[j];
    state[j] = tmp;
  }
}

function applyPhaseBoth(state: C[], a: number, b: number, phase: C): void {
  const ba = 1 << a;
  const bb = 1 << b;
  for (let i = 0; i < state.length; i++) {
    if ((i & ba) !== 0 && (i & bb) !== 0) state[i] = mul(state[i], phase);
  }
}

function applyToffoli(state: C[], c1: number, c2: number, target: number): void {
  const b1 = 1 << c1;
  const b2 = 1 << c2;
  const bt = 1 << target;
  for (let i = 0; i < state.length; i++) {
    if ((i & b1) === 0 || (i & b2) === 0 || (i & bt) !== 0) continue;
    const j = i | bt;
    const tmp = state[i];
    state[i] = state[j];
    state[j] = tmp;
  }
}

export function applyGate(state: C[], gate: GateOp): void {
  if (gate.type === "M") return;
  const matrix = singleQubitMatrix(gate.type, gate.theta ?? Math.PI);
  if (matrix) {
    const q = gate.qubits[0];
    if (q === undefined) return;
    applyMatrix(state, q, matrix);
    return;
  }
  const [q0, q1, q2] = gate.qubits;
  if (q0 === undefined || q1 === undefined) return;
  switch (gate.type) {
    case "CNOT":
      applyCnot(state, q0, q1);
      break;
    case "CZ":
      applyPhaseBoth(state, q0, q1, c(-1));
      break;
    case "CP":
      applyPhaseBoth(state, q0, q1, cis(gate.theta ?? Math.PI));
      break;
    case "SWAP":
      applySwap(state, q0, q1);
      break;
    case "CCX":
      if (q2 === undefined) return;
      applyToffoli(state, q0, q1, q2);
      break;
    default:
      break;
  }
}

export function evolve(n: number, gates: readonly GateOp[], depth: number): C[] {
  const state = zeroState(n);
  const ordered = gates
    .filter((g) => g.column < depth && g.qubits.every((q) => q >= 0 && q < n))
    .slice()
    .sort((a, b) => a.column - b.column || a.qubits[0] - b.qubits[0]);
  for (const gate of ordered) applyGate(state, gate);
  return state;
}

export function probabilities(state: readonly C[]): number[] {
  return state.map((a) => mag2(a));
}

/** Make the first nonzero amplitude real and positive. Relative phases stay. */
export function alignGlobalPhase(state: readonly C[]): C[] {
  const lead = state.find((a) => mag(a) > 1e-8);
  if (!lead) return state.map((a) => ({ re: a.re, im: a.im }));
  const turn = cis(-phase(lead));
  if (Math.abs(turn.im) < 1e-12 && Math.abs(turn.re - 1) < 1e-12) {
    return state.map((a) => ({ re: a.re, im: a.im }));
  }
  return state.map((a) => mul(a, turn));
}

export function stateNorm(state: readonly C[]): number {
  return Math.sqrt(state.reduce((sum, a) => sum + mag2(a), 0));
}

export function qubitOneProbability(probs: readonly number[], qubit: number): number {
  const bit = 1 << qubit;
  let p = 0;
  for (let i = 0; i < probs.length; i++) if (i & bit) p += probs[i];
  return p;
}

export type Bloch = { x: number; y: number; z: number; r: number };

/** Reduced Bloch vector of one qubit. Zero means the reduced state is mixed. */
export function blochVector(state: readonly C[], qubit: number): Bloch {
  const bit = 1 << qubit;
  let r00 = 0;
  let r11 = 0;
  let re01 = 0;
  let im01 = 0;
  for (let i = 0; i < state.length; i++) {
    const p = mag2(state[i]);
    if (i & bit) {
      r11 += p;
    } else {
      r00 += p;
      const j = i | bit;
      const prod = mul(state[i], conj(state[j]));
      re01 += prod.re;
      im01 += prod.im;
    }
  }
  const x = 2 * re01;
  const y = -2 * im01;
  const z = r00 - r11;
  return { x, y, z, r: Math.hypot(x, y, z) };
}

export function sampleIndex(probs: readonly number[], rng: () => number): number {
  let r = rng();
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (r <= acc) return i;
  }
  return probs.length - 1;
}

/** Ideal computational-basis shots, then independent bit-flip readout error. */
export function sampleCounts(
  probs: readonly number[],
  shots: number,
  readout: number,
  rng: () => number = Math.random,
): number[] {
  const n = Math.round(Math.log2(probs.length));
  const counts = Array.from({ length: probs.length }, () => 0);
  for (let s = 0; s < shots; s++) {
    let index = sampleIndex(probs, rng);
    if (readout > 0) {
      for (let q = 0; q < n; q++) {
        if (rng() < readout) index ^= 1 << q;
      }
    }
    counts[index] += 1;
  }
  return counts;
}

export function circuitUnitary(n: number, gates: readonly GateOp[], depth: number): C[][] {
  const dim = 1 << n;
  const columns: C[][] = [];
  for (let basis = 0; basis < dim; basis++) {
    const state = zeroState(n);
    state[0] = c(0);
    state[basis] = c(1);
    const ordered = gates
      .filter((g) => g.column < depth && g.qubits.every((q) => q >= 0 && q < n))
      .slice()
      .sort((a, b) => a.column - b.column || a.qubits[0] - b.qubits[0]);
    for (const gate of ordered) applyGate(state, gate);
    columns.push(state);
  }
  return Array.from({ length: dim }, (_, row) => columns.map((column) => column[row]));
}

export function basisLabel(index: number, n: number): string {
  return index.toString(2).padStart(n, "0");
}

export function significantCount(state: readonly C[], eps = 1e-8): number {
  return state.reduce((n, a) => n + (mag(a) > eps ? 1 : 0), 0);
}
