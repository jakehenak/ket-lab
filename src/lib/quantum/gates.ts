import { c, cis, scale, type C, type M2 } from "./complex";
import type { GateType } from "./types";

const I = c(0, 1);
const MI = c(0, -1);
const INV_SQRT2 = Math.SQRT1_2;

function mat(a: C, b: C, c00: C, d: C): M2 {
  return [a, b, c00, d];
}

/** Standard single-qubit matrices. RX(π) matches X up to a global phase. */
export function singleQubitMatrix(type: GateType, theta = Math.PI): M2 | null {
  const half = theta / 2;
  const cos = Math.cos(half);
  const sin = Math.sin(half);
  switch (type) {
    case "H":
      return mat(
        c(INV_SQRT2),
        c(INV_SQRT2),
        c(INV_SQRT2),
        c(-INV_SQRT2),
      );
    case "X":
      return mat(c(0), c(1), c(1), c(0));
    case "Y":
      return mat(c(0), MI, I, c(0));
    case "Z":
      return mat(c(1), c(0), c(0), c(-1));
    case "S":
      return mat(c(1), c(0), c(0), I);
    case "Sdg":
      return mat(c(1), c(0), c(0), MI);
    case "T":
      return mat(c(1), c(0), c(0), cis(Math.PI / 4));
    case "Tdg":
      return mat(c(1), c(0), c(0), cis(-Math.PI / 4));
    case "RX":
      return mat(c(cos), scale(MI, sin), scale(MI, sin), c(cos));
    case "RY":
      return mat(c(cos), c(-sin), c(sin), c(cos));
    case "RZ":
      return mat(cis(-half), c(0), c(0), cis(half));
    default:
      return null;
  }
}
