export type C = { re: number; im: number };

export const c = (re: number, im = 0): C => ({ re, im });

export const add = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im });

export const mul = (a: C, b: C): C => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

export const scale = (a: C, s: number): C => ({ re: a.re * s, im: a.im * s });

export const conj = (a: C): C => ({ re: a.re, im: -a.im });

export const div = (a: C, b: C): C => {
  const d = b.re * b.re + b.im * b.im;
  return {
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d,
  };
};

export const mag2 = (a: C): number => a.re * a.re + a.im * a.im;

export const mag = (a: C): number => Math.hypot(a.re, a.im);

export const phase = (a: C): number => Math.atan2(a.im, a.re);

export const cis = (theta: number): C => ({ re: Math.cos(theta), im: Math.sin(theta) });

/** Row-major 2×2 matrix. */
export type M2 = [C, C, C, C];
