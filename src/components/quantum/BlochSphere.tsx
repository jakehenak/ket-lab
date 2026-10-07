import { formatSigned } from "@/lib/quantum/format";
import type { Bloch } from "@/lib/quantum/simulate";

const SIZE = 168;

function project(x: number, y: number, z: number): [number, number] {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = 58;
  return [cx + r * (0.92 * x - 0.3 * y), cy + r * (-0.92 * z + 0.16 * y)];
}

function loop(points: Array<[number, number]>): string {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
}

function circle(axis: "xy" | "xz" | "yz"): string {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    if (axis === "xy") pts.push(project(c, s, 0));
    else if (axis === "xz") pts.push(project(c, 0, s));
    else pts.push(project(0, c, s));
  }
  return loop(pts);
}

export function BlochSphere({
  label,
  bloch,
}: {
  label: string;
  bloch: Bloch;
}) {
  const [px, py] = project(bloch.x, bloch.y, bloch.z);
  const [ox, oy] = project(0, 0, 0);
  const mixed = bloch.r < 0.08;
  const axis = (x: number, y: number, z: number) => {
    const [x1, y1] = project(-x, -y, -z);
    const [x2, y2] = project(x, y, z);
    return { x1, y1, x2, y2 };
  };
  const ax = axis(1, 0, 0);
  const ay = axis(0, 1, 0);
  const az = axis(0, 0, 1);
  const north = project(0, 0, 1.18);
  const south = project(0, 0, -1.22);

  return (
    <figure className="rounded-xl border border-border bg-bg p-3">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm text-fg">{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted">
          {mixed ? "mixed" : `r ${formatSigned(bloch.r)}`}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto w-full max-w-44 text-muted"
        role="img"
        aria-label={`${label} Bloch vector x ${formatSigned(bloch.x)}, y ${formatSigned(bloch.y)}, z ${formatSigned(bloch.z)}`}
      >
        <path d={circle("xy")} fill="none" stroke="currentColor" strokeOpacity={0.45} />
        <path d={circle("xz")} fill="none" stroke="currentColor" strokeOpacity={0.28} />
        <path d={circle("yz")} fill="none" stroke="currentColor" strokeOpacity={0.28} />
        <line x1={ax.x1} y1={ax.y1} x2={ax.x2} y2={ax.y2} stroke="currentColor" strokeOpacity={0.35} />
        <line x1={ay.x1} y1={ay.y1} x2={ay.x2} y2={ay.y2} stroke="currentColor" strokeOpacity={0.35} />
        <line x1={az.x1} y1={az.y1} x2={az.x2} y2={az.y2} stroke="currentColor" strokeOpacity={0.35} />
        <text x={north[0]} y={north[1]} textAnchor="middle" fill="currentColor" fontSize="11" fontFamily="IBM Plex Mono, ui-monospace, monospace">
          |0⟩
        </text>
        <text x={south[0]} y={south[1]} textAnchor="middle" fill="currentColor" fontSize="11" fontFamily="IBM Plex Mono, ui-monospace, monospace">
          |1⟩
        </text>
        <line
          x1={ox}
          y1={oy}
          x2={px}
          y2={py}
          stroke="var(--color-primary)"
          strokeWidth={2}
        />
        <circle cx={ox} cy={oy} r={2} fill="currentColor" />
        <circle cx={px} cy={py} r={mixed ? 3.5 : 5} fill="var(--color-primary)" />
      </svg>
      <dl className="mt-1 grid grid-cols-3 gap-1 font-mono text-xs tabular-nums text-muted">
        <div>
          <dt className="text-muted">x</dt>
          <dd className="text-fg">{formatSigned(bloch.x)}</dd>
        </div>
        <div>
          <dt>y</dt>
          <dd className="text-fg">{formatSigned(bloch.y)}</dd>
        </div>
        <div>
          <dt>z</dt>
          <dd className="text-fg">{formatSigned(bloch.z)}</dd>
        </div>
      </dl>
    </figure>
  );
}
