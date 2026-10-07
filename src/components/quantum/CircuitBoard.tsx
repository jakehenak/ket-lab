import { GATE_COPY } from "@/lib/quantum/info";
import { formatAngle } from "@/lib/quantum/format";
import { gateSpan, hasAngle, type GateOp } from "@/lib/quantum/types";

const COL = 72;
const ROW = 64;
const FOOT = 22;

function cx(column: number): number {
  return column * COL + COL / 2;
}

function cy(qubit: number): number {
  return qubit * ROW + ROW / 2;
}

export function CircuitBoard({
  n,
  gates,
  columns,
  depth,
  pendingColumn,
  pending,
  selectedId,
  ones,
  onCell,
}: {
  n: number;
  gates: GateOp[];
  columns: number;
  depth: number;
  pendingColumn: number | null;
  pending: number[];
  selectedId: string | null;
  ones: number[];
  onCell: (qubit: number, column: number) => void;
}) {
  const width = Math.max(columns, 1) * COL;
  const height = n * ROW + FOOT;
  const occupantAt = (qubit: number, column: number) =>
    gates.find((gate) => {
      if (gate.column !== column) return false;
      const [lo, hi] = gateSpan(gate);
      return qubit >= lo && qubit <= hi;
    });

  return (
    <div className="flex min-w-0">
      <div className="w-16 shrink-0 sm:w-20">
        {Array.from({ length: n }, (_, q) => (
          <div key={q} style={{ height: ROW }} className="flex items-center justify-end pr-2">
            <div className="text-right leading-tight">
              <div className="font-mono text-sm text-fg">q{q}</div>
              <div className="font-mono text-xs text-muted">|0\u27e9</div>
            </div>
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto" role="group" aria-label="Circuit grid">
        <div className="relative" style={{ width, height }}>
          <svg width={width} height={height} className="block text-muted" aria-hidden="true">
            {Array.from({ length: n }, (_, q) => (
              <line
                key={q}
                x1={8}
                x2={width - 8}
                y1={cy(q)}
                y2={cy(q)}
                stroke="currentColor"
                strokeOpacity={0.55}
                strokeWidth={1.5}
              />
            ))}
            <line
              x1={depth * COL}
              x2={depth * COL}
              y1={8}
              y2={n * ROW - 4}
              stroke="var(--color-primary)"
              strokeDasharray="3 4"
              strokeWidth={1.5}
            />
            {gates.map((gate) => (
              <g key={gate.id} opacity={gate.column >= depth ? 0.35 : 1}>
                <GateGlyph gate={gate} selected={gate.id === selectedId} />
              </g>
            ))}
            {pendingColumn !== null &&
              pending.map((q) => (
                <circle
                  key={q}
                  cx={cx(pendingColumn)}
                  cy={cy(q)}
                  r={16}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeDasharray="3 3"
                />
              ))}
            {Array.from({ length: columns }, (_, column) => (
              <text
                key={column}
                x={cx(column)}
                y={n * ROW + 15}
                textAnchor="middle"
                fill="currentColor"
                fontSize="11"
                fontFamily="IBM Plex Mono, ui-monospace, monospace"
              >
                {column + 1}
              </text>
            ))}
          </svg>
          {Array.from({ length: n }, (_, q) =>
            Array.from({ length: columns }, (_, column) => {
              const occupant = occupantAt(q, column);
              const name = occupant ? GATE_COPY[occupant.type].name : "empty";
              return (
                <button
                  key={`${q}-${column}`}
                  type="button"
                  aria-label={`Moment ${column + 1}, qubit ${q}, ${name}`}
                  onClick={() => onCell(q, column)}
                  className="absolute rounded-md hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary"
                  style={{ left: column * COL, top: q * ROW, width: COL, height: ROW }}
                />
              );
            }),
          )}
        </div>
      </div>
      <div className="w-16 shrink-0">
        {ones.map((p, q) => (
          <div key={q} style={{ height: ROW }} className="flex items-center pl-2">
            <div className="leading-tight">
              <div className="font-mono text-xs text-muted">P\u2081</div>
              <div className="font-mono text-sm tabular-nums text-fg">{Math.round(p * 100)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GateGlyph({ gate, selected }: { gate: GateOp; selected: boolean }) {
  const stroke = selected ? "var(--color-primary)" : "var(--color-muted)";
  const sw = selected ? 2.25 : 1.5;
  const [a, b, target] = gate.qubits;
  if (a === undefined) return null;

  if (gate.type === "CNOT" || gate.type === "CCX" || gate.type === "CZ" || gate.type === "SWAP" || gate.type === "CP") {
    const ys = gate.qubits.map((q) => cy(q));
    const y1 = Math.min(...ys);
    const y2 = Math.max(...ys);
    const x = cx(gate.column);
    return (
      <g>
        <line x1={x} x2={x} y1={y1} y2={y2} stroke="var(--color-primary)" strokeWidth={1.75} />
        {gate.type === "CNOT" && b !== undefined && (
          <>
            <Control x={x} y={cy(a)} />
            <Target x={x} y={cy(b)} />
          </>
        )}
        {gate.type === "CCX" && b !== undefined && target !== undefined && (
          <>
            <Control x={x} y={cy(a)} />
            <Control x={x} y={cy(b)} />
            <Target x={x} y={cy(target)} />
          </>
        )}
        {gate.type === "CZ" && b !== undefined && (
          <>
            <Control x={x} y={cy(a)} />
            <Control x={x} y={cy(b)} />
          </>
        )}
        {gate.type === "SWAP" && b !== undefined && (
          <>
            <Cross x={x} y={cy(a)} />
            <Cross x={x} y={cy(b)} />
          </>
        )}
        {gate.type === "CP" && b !== undefined && (
          <>
            <Control x={x} y={cy(a)} />
            <Box x={x} y={cy(b)} stroke={stroke} sw={sw} title="P" sub={formatAngle(gate.theta ?? Math.PI)} />
          </>
        )}
      </g>
    );
  }

  if (gate.type === "M") {
    return <Meter x={cx(gate.column)} y={cy(a)} stroke={stroke} sw={sw} />;
  }

  const sub = hasAngle(gate.type) ? formatAngle(gate.theta ?? Math.PI) : undefined;
  return (
    <Box
      x={cx(gate.column)}
      y={cy(a)}
      stroke={stroke}
      sw={sw}
      title={GATE_COPY[gate.type].hint}
      sub={sub}
    />
  );
}

function Box({
  x,
  y,
  stroke,
  sw,
  title,
  sub,
}: {
  x: number;
  y: number;
  stroke: string;
  sw: number;
  title: string;
  sub?: string;
}) {
  return (
    <g>
      <rect
        x={x - 20}
        y={y - 18}
        width={40}
        height={36}
        rx={8}
        fill="var(--color-surface)"
        stroke={stroke}
        strokeWidth={sw}
      />
      <text
        x={x}
        y={sub ? y - 3 : y + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--color-fg)"
        fontSize="13"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        {title}
      </text>
      {sub && (
        <text
          x={x}
          y={y + 11}
          textAnchor="middle"
          fill="var(--color-primary)"
          fontSize="9"
          fontFamily="IBM Plex Mono, ui-monospace, monospace"
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function Control({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={5} fill="var(--color-primary)" />;
}

function Target({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="var(--color-primary)" fill="var(--color-surface)" strokeWidth={1.75}>
      <circle cx={x} cy={y} r={13} />
      <line x1={x - 7} x2={x + 7} y1={y} y2={y} stroke="var(--color-primary)" />
      <line x1={x} x2={x} y1={y - 7} y2={y + 7} stroke="var(--color-primary)" />
    </g>
  );
}

function Cross({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="var(--color-primary)" strokeWidth={1.75}>
      <line x1={x - 6} y1={y - 6} x2={x + 6} y2={y + 6} />
      <line x1={x - 6} y1={y + 6} x2={x + 6} y2={y - 6} />
    </g>
  );
}

function Meter({ x, y, stroke, sw }: { x: number; y: number; stroke: string; sw: number }) {
  return (
    <g>
      <rect
        x={x - 20}
        y={y - 18}
        width={40}
        height={36}
        rx={8}
        fill="var(--color-surface)"
        stroke={stroke}
        strokeWidth={sw}
      />
      <path d={`M ${x - 8} ${y + 6} A 8 8 0 0 1 ${x + 8} ${y + 6}`} fill="none" stroke="var(--color-primary)" strokeWidth={1.5} />
      <line x1={x} y1={y + 6} x2={x + 6} y2={y - 3} stroke="var(--color-primary)" strokeWidth={1.5} />
    </g>
  );
}
