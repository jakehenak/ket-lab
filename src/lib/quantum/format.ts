import { mag, phase, type C } from "./complex";

const SQRT1_2 = Math.SQRT1_2;

function formatReal(value: number): string {
  const sign = value < 0 ? "−" : "";
  const x = Math.abs(value);
  if (x < 1e-9) return "0";
  if (Math.abs(x - 1) < 1e-8) return sign + "1";
  if (Math.abs(x - 0.5) < 1e-8) return sign + "1/2";
  if (Math.abs(x - SQRT1_2) < 1e-8) return sign + "1/√2";
  if (Math.abs(x - 1 / Math.sqrt(8)) < 1e-8) return sign + "1/√8";
  if (Math.abs(x - 0.25) < 1e-8) return sign + "1/4";
  const text = x.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return sign + text;
}

export function formatAmp(value: C): string {
  const m = mag(value);
  if (m < 1e-9) return "0";
  const ph = phase(value);
  const wrap = (angle: number) => {
    let a = angle;
    while (a <= -Math.PI) a += 2 * Math.PI;
    while (a > Math.PI) a -= 2 * Math.PI;
    return a;
  };
  const p = wrap(ph);
  if (Math.abs(p) < 1e-6) return formatReal(m);
  if (Math.abs(Math.abs(p) - Math.PI) < 1e-6) return formatReal(-m);
  if (Math.abs(p - Math.PI / 2) < 1e-6) return `${formatReal(m)}i`;
  if (Math.abs(p + Math.PI / 2) < 1e-6) return `−${formatReal(m)}i`;
  const deg = Math.round((p * 180) / Math.PI);
  return `${formatReal(m)} ∠ ${deg}°`;
}

export function formatAngle(theta: number): string {
  const snaps: Array<[number, string]> = [
    [0, "0"],
    [Math.PI / 4, "π/4"],
    [Math.PI / 3, "π/3"],
    [Math.PI / 2, "π/2"],
    [(2 * Math.PI) / 3, "2π/3"],
    [(3 * Math.PI) / 4, "3π/4"],
    [Math.PI, "π"],
    [(5 * Math.PI) / 4, "5π/4"],
    [(3 * Math.PI) / 2, "3π/2"],
    [(7 * Math.PI) / 4, "7π/4"],
    [2 * Math.PI, "2π"],
  ];
  for (const [value, label] of snaps) {
    if (Math.abs(theta - value) < 1e-6) return label;
  }
  const ratio = theta / Math.PI;
  return `${ratio.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}π`;
}

export function formatPercent(p: number): string {
  if (p >= 0.9995) return "100%";
  if (p < 0.0005) return "0%";
  if (p >= 0.1) return `${(p * 100).toFixed(1)}%`;
  return `${(p * 100).toFixed(2)}%`;
}

export function formatSigned(value: number, digits = 2): string {
  const text = value.toFixed(digits);
  if (text === "-0.00" || text === "0.00" || text === "-0.0") return (0).toFixed(digits);
  return text;
}
