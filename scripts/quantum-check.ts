import { mag, phase, type C } from "../src/lib/quantum/complex.ts";
import { presetById } from "../src/lib/quantum/presets.ts";
import {
  blochVector,
  evolve,
  probabilities,
  qubitOneProbability,
  stateNorm,
} from "../src/lib/quantum/simulate.ts";

const EPS = 1e-8;

function assert(cond: boolean, message: string): void {
  if (!cond) throw new Error(message);
}

function close(a: number, b: number, label: string): void {
  if (Math.abs(a - b) > 1e-6) {
    throw new Error(`${label}: expected ${b}, got ${a}`);
  }
}

function ampClose(a: C, re: number, im: number, label: string): void {
  close(a.re, re, `${label} re`);
  close(a.im, im, `${label} im`);
}

function runPreset(id: string, depth?: number) {
  const preset = presetById(id);
  if (!preset) throw new Error(`missing preset ${id}`);
  const d = depth ?? preset.gates.reduce((m, g) => Math.max(m, g.column + 1), 0);
  const state = evolve(preset.n, preset.gates, d);
  close(stateNorm(state), 1, `${id} norm`);
  return { preset, state, probs: probabilities(state) };
}

function relativePhases(state: C[]): number[] {
  const first = state.findIndex((a) => mag(a) > EPS);
  const base = phase(state[first] ?? { re: 1, im: 0 });
  return state.map((a) => {
    if (mag(a) <= EPS) return 0;
    let d = phase(a) - base;
    while (d <= -Math.PI) d += 2 * Math.PI;
    while (d > Math.PI) d -= 2 * Math.PI;
    return d;
  });
}

const plus = runPreset("plus");
ampClose(plus.state[0], Math.SQRT1_2, 0, "plus 0");
ampClose(plus.state[1], Math.SQRT1_2, 0, "plus 1");
const plusBloch = blochVector(plus.state, 0);
close(plusBloch.x, 1, "plus x");
close(plusBloch.y, 0, "plus y");
close(plusBloch.z, 0, "plus z");

const phaseDemo = runPreset("phase");
const phaseBloch = blochVector(phaseDemo.state, 0);
close(phaseBloch.x, Math.SQRT1_2, "T x");
close(phaseBloch.y, Math.SQRT1_2, "T y");
close(phaseBloch.z, 0, "T z");

const inter = runPreset("interfere");
ampClose(inter.state[0], 0, 0, "hzh 0");
ampClose(inter.state[1], 1, 0, "hzh 1");

const bell = runPreset("bell");
ampClose(bell.state[0], Math.SQRT1_2, 0, "bell 00");
ampClose(bell.state[1], 0, 0, "bell 01");
ampClose(bell.state[2], 0, 0, "bell 10");
ampClose(bell.state[3], Math.SQRT1_2, 0, "bell 11");
const bellBloch = blochVector(bell.state, 0);
close(bellBloch.r, 0, "bell reduced r");

const bellHalf = runPreset("bell", 1);
close(bellHalf.probs[0], 0.5, "bell depth H 00");
close(bellHalf.probs[1], 0.5, "bell depth H 01");

const ghz = runPreset("ghz");
close(ghz.probs[0], 0.5, "ghz 000");
close(ghz.probs[7], 0.5, "ghz 111");

const constant = runPreset("deutsch-c");
close(qubitOneProbability(constant.probs, 0), 0, "deutsch constant q0");

const balanced = runPreset("deutsch-b");
close(qubitOneProbability(balanced.probs, 0), 1, "deutsch balanced q0");

const grover = runPreset("grover");
close(grover.probs[3], 1, "grover 11");

const qft = runPreset("qft");
const n = 3;
const dim = 1 << n;
const expected: number[] = [];
for (let k = 0; k < dim; k++) expected.push((2 * Math.PI * k) / dim);
const got = relativePhases(qft.state);
for (let k = 0; k < dim; k++) {
  close(mag(qft.state[k]), 1 / Math.sqrt(dim), `qft mag ${k}`);
  let d = got[k] - expected[k];
  while (d <= -Math.PI) d += 2 * Math.PI;
  while (d > Math.PI) d -= 2 * Math.PI;
  if (Math.abs(d) > 1e-6) {
    throw new Error(`qft phase ${k}: got ${got[k]} expected ${expected[k]}`);
  }
}

console.log("quantum checks passed");
