import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Eraser, Minus, Plus, SkipBack, SkipForward, Trash2 } from "lucide-react";
import { BlochSphere } from "@/components/quantum/BlochSphere";
import { CircuitBoard } from "@/components/quantum/CircuitBoard";
import { cx } from "@/lib/cx";
import { mag, phase, type C } from "@/lib/quantum/complex";
import { formatAmp, formatAngle, formatPercent, formatSigned } from "@/lib/quantum/format";
import { GATE_COPY, PALETTE } from "@/lib/quantum/info";
import { highestColumn, PRESETS, presetById } from "@/lib/quantum/presets";
import {
  alignGlobalPhase,
  basisLabel,
  blochVector,
  circuitUnitary,
  evolve,
  probabilities,
  qubitOneProbability,
  sampleCounts,
  sampleIndex,
  stateNorm,
  type Bloch,
} from "@/lib/quantum/simulate";
import {
  arity,
  gateSpan,
  hasAngle,
  isGateType,
  MAX_COLUMNS,
  MAX_QUBITS,
  MIN_QUBITS,
  type GateOp,
  type GateType,
} from "@/lib/quantum/types";

const STORAGE_KEY = "ket-lab-v1";

type Tool = GateType | "erase";
type Tab = "probs" | "amps" | "bloch" | "unitary";

type Collapsed = { outcome: number; state: C[] };

type Model = {
  n: number;
  gates: GateOp[];
  depth: number;
  tool: Tool;
  pending: number[];
  pendingColumn: number | null;
  selectedId: string | null;
  shots: number;
  readout: number;
  counts: number[] | null;
  collapsed: Collapsed | null;
  presetId: string | null;
  notice: string | null;
};

function cloneGates(gates: readonly GateOp[]): GateOp[] {
  return gates.map((gate) => ({ ...gate, qubits: [...gate.qubits] }));
}

function fromPreset(id: string): Model {
  const preset = presetById(id) ?? PRESETS[0];
  const gates = cloneGates(preset.gates);
  return {
    n: preset.n,
    gates,
    depth: Math.max(0, highestColumn(gates) + 1),
    tool: "H",
    pending: [],
    pendingColumn: null,
    selectedId: null,
    shots: 1024,
    readout: 0,
    counts: null,
    collapsed: null,
    presetId: preset.id,
    notice: null,
  };
}

function columnCount(gates: readonly GateOp[]): number {
  return Math.min(MAX_COLUMNS, Math.max(4, highestColumn(gates) + 2));
}

function uid(): string {
  return `g-${Math.random().toString(36).slice(2, 10)}`;
}

function canPlace(gates: readonly GateOp[], column: number, qubits: number[]): boolean {
  if (new Set(qubits).size !== qubits.length) return false;
  const lo = Math.min(...qubits);
  const hi = Math.max(...qubits);
  return !gates.some((gate) => {
    if (gate.column !== column) return false;
    const [a, b] = gateSpan(gate);
    return hi >= a && lo <= b;
  });
}

function ketText(state: readonly C[], n: number): string {
  const terms: string[] = [];
  for (let i = 0; i < state.length; i++) {
    if (mag(state[i]) < 1e-8) continue;
    const amp = formatAmp(state[i]);
    const coeff = amp === "1" ? "" : amp === "−1" ? "−" : amp;
    terms.push(`${coeff}|${basisLabel(i, n)}⟩`);
  }
  if (terms.length === 0) return "|ψ⟩ = 0";
  const body =
    terms.length > 4
      ? `${terms.slice(0, 4).join(" + ")} + ${terms.length - 4} more`
      : terms.join(" + ");
  return `|ψ⟩ = ${body.replaceAll("+ −", "− ")}`;
}

function isModel(value: unknown): value is Model {
  if (!value || typeof value !== "object") return false;
  const m = value as Model;
  return (
    typeof m.n === "number" &&
    Array.isArray(m.gates) &&
    m.gates.every((gate) => {
      if (!gate || typeof gate !== "object") return false;
      const g = gate as GateOp;
      return typeof g.id === "string" && isGateType(g.type) && Array.isArray(g.qubits);
    })
  );
}

function toolButton(active: boolean, disabled = false): string {
  return cx(
    "h-11 min-w-11 shrink-0 rounded-lg border px-2.5 font-mono text-sm",
    active
      ? "border-primary bg-primary text-primary-fg"
      : "border-border bg-surface text-fg",
    disabled && "opacity-40",
  );
}

export function Workbench() {
  const [model, setModel] = useState<Model>(() => fromPreset("bell"));
  const [tab, setTab] = useState<Tab>("probs");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isModel(parsed)) {
          const n = Math.min(MAX_QUBITS, Math.max(MIN_QUBITS, parsed.n));
          const gates = parsed.gates
            .filter((gate) => gate.qubits.every((q) => Number.isInteger(q) && q >= 0 && q < n))
            .map((gate) => ({
              ...gate,
              qubits: [...gate.qubits],
              column: Math.max(0, Math.min(MAX_COLUMNS - 1, gate.column)),
            }));
          setModel({
            ...fromPreset("bell"),
            ...parsed,
            n,
            gates,
            depth: Math.max(0, Math.min(columnCount(gates), parsed.depth || 0)),
            tool: parsed.tool === "erase" || isGateType(parsed.tool) ? parsed.tool : "H",
            pending: [],
            pendingColumn: null,
            counts: null,
            collapsed: null,
            notice: null,
          });
        }
      }
    } catch {
      /* keep the Bell preset */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const { counts: _counts, collapsed: _collapsed, pending: _pending, notice: _notice, ...saved } =
      model;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, pending: [], pendingColumn: null }));
  }, [model, ready]);

  const cols = columnCount(model.gates);
  const depth = Math.min(model.depth, cols);

  const ideal = useMemo(
    () => evolve(model.n, model.gates, depth),
    [model.n, model.gates, depth],
  );
  const state = useMemo(
    () => alignGlobalPhase(model.collapsed?.state ?? ideal),
    [model.collapsed, ideal],
  );
  const probs = useMemo(() => probabilities(state), [state]);
  const norm = stateNorm(state);
  const ones = useMemo(
    () => Array.from({ length: model.n }, (_, q) => qubitOneProbability(probs, q)),
    [probs, model.n],
  );
  const blochs = useMemo<Bloch[]>(
    () => Array.from({ length: model.n }, (_, q) => blochVector(state, q)),
    [state, model.n],
  );
  const unitary = useMemo(
    () => (tab === "unitary" && model.n <= 3 ? circuitUnitary(model.n, model.gates, depth) : null),
    [tab, model.n, model.gates, depth],
  );

  const selected = model.gates.find((gate) => gate.id === model.selectedId) ?? null;
  const preset = presetById(model.presetId);
  const leaders = useMemo(() => {
    const ranked = probs
      .map((p, i) => ({ p, i }))
      .filter((row) => row.p > 1e-8)
      .sort((a, b) => b.p - a.p);
    if (ranked.length === 0) return [];
    return ranked.filter((row) => Math.abs(row.p - ranked[0].p) < 1e-6).slice(0, 4);
  }, [probs]);

  function patch(next: Partial<Model>, resetRun = false) {
    setModel((current) => ({
      ...current,
      ...next,
      ...(resetRun ? { counts: null, collapsed: null } : {}),
    }));
  }

  function loadPreset(id: string) {
    setModel((current) => ({
      ...fromPreset(id),
      tool: current.tool,
      shots: current.shots,
      readout: current.readout,
    }));
    setTab("probs");
  }

  function setN(n: number) {
    setModel((current) => {
      const next = Math.min(MAX_QUBITS, Math.max(MIN_QUBITS, n));
      const gates = current.gates.filter((gate) => gate.qubits.every((q) => q < next));
      const tool =
        current.tool !== "erase" && arity(current.tool) > next ? "H" : current.tool;
      return {
        ...current,
        n: next,
        gates,
        tool,
        depth: Math.min(current.depth, columnCount(gates)),
        pending: [],
        pendingColumn: null,
        selectedId: gates.some((gate) => gate.id === current.selectedId) ? current.selectedId : null,
        presetId: null,
        counts: null,
        collapsed: null,
        notice: null,
      };
    });
  }

  function onCell(qubit: number, column: number) {
    setModel((current) => {
      const occupant = current.gates.find((gate) => {
        if (gate.column !== column) return false;
        const [lo, hi] = gateSpan(gate);
        return qubit >= lo && qubit <= hi;
      });
      const cleared = { counts: null, collapsed: null, notice: null as string | null };

      if (current.tool === "erase") {
        if (!occupant) return { ...current, pending: [], pendingColumn: null, notice: null };
        return {
          ...current,
          ...cleared,
          gates: current.gates.filter((gate) => gate.id !== occupant.id),
          presetId: null,
          selectedId: current.selectedId === occupant.id ? null : current.selectedId,
          pending: [],
          pendingColumn: null,
        };
      }

      if (occupant) {
        return {
          ...current,
          selectedId: occupant.id,
          pending: [],
          pendingColumn: null,
          notice: null,
        };
      }

      const type = current.tool;
      const need = arity(type);
      if (need === 1) {
        if (!canPlace(current.gates, column, [qubit])) {
          return { ...current, notice: "That wire is already in use." };
        }
        const gate: GateOp = {
          id: uid(),
          type,
          qubits: [qubit],
          column,
          theta: hasAngle(type) ? Math.PI : undefined,
        };
        return {
          ...current,
          ...cleared,
          gates: [...current.gates, gate],
          depth: Math.max(current.depth, column + 1),
          presetId: null,
          selectedId: gate.id,
          pending: [],
          pendingColumn: null,
        };
      }

      const sameColumn = current.pendingColumn === column;
      const already = sameColumn && current.pending.includes(qubit);
      const pending = already
        ? current.pending.filter((q) => q !== qubit)
        : [...(sameColumn ? current.pending : []), qubit];
      if (pending.length < need) {
        return { ...current, pending, pendingColumn: column, selectedId: null, notice: null };
      }
      if (!canPlace(current.gates, column, pending)) {
        return {
          ...current,
          pending: [],
          pendingColumn: null,
          notice: "Those wires already hold a gate.",
        };
      }
      const gate: GateOp = {
        id: uid(),
        type,
        qubits: pending,
        column,
        theta: hasAngle(type) ? Math.PI : undefined,
      };
      return {
        ...current,
        ...cleared,
        gates: [...current.gates, gate],
        depth: Math.max(current.depth, column + 1),
        presetId: null,
        selectedId: gate.id,
        pending: [],
        pendingColumn: null,
      };
    });
  }

  const step = useCallback((direction: -1 | 1) => {
    setModel((current) => {
      const marks = [...new Set([0, ...current.gates.map((gate) => gate.column + 1)])].sort(
        (a, b) => a - b,
      );
      const limit = columnCount(current.gates);
      const next =
        direction > 0
          ? (marks.find((mark) => mark > current.depth) ?? limit)
          : ([...marks].reverse().find((mark) => mark < current.depth) ?? 0);
      return {
        ...current,
        depth: Math.max(0, Math.min(limit, next)),
        counts: null,
        collapsed: null,
      };
    });
  }, []);

  function runShots() {
    const counts = sampleCounts(probs, model.shots, model.readout);
    patch({ counts });
  }

  function collapseOnce() {
    const outcome = sampleIndex(probs, Math.random);
    const collapsedState = state.map((_, index) => ({
      re: index === outcome ? 1 : 0,
      im: 0,
    }));
    patch({ collapsed: { outcome, state: collapsedState }, counts: null });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const placeHint = (() => {
    if (model.tool === "erase") return "Tap a gate to remove it.";
    const copy = GATE_COPY[model.tool];
    if (model.pendingColumn === null || model.pending.length === 0) return `${copy.name}. ${copy.place}.`;
    const which =
      model.tool === "CCX"
        ? model.pending.length === 1
          ? "first control"
          : "second control"
        : model.tool === "CNOT" || model.tool === "CP"
          ? "control"
          : "qubit";
    return `${copy.name}: ${which} on q${model.pending[model.pending.length - 1]}, moment ${model.pendingColumn + 1}. ${copy.place}.`;
  })();

  const activeTab: Tab = tab === "unitary" && model.n > 3 ? "probs" : tab;
  const shotTotal = model.counts?.reduce((sum, count) => sum + count, 0) ?? 0;
  const dim = 1 << model.n;
  const showAllBases = dim <= 16;

  return (
    <div className="min-h-screen bg-bg pb-20 text-fg lg:pb-0">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs tracking-widest text-primary uppercase">
                Statevector emulator
              </p>
              <h1 className="text-balance text-3xl font-semibold tracking-tight">
                <span className="font-mono text-primary">|ψ⟩</span> Ket Lab
              </h1>
              <p className="mt-1 max-w-xl text-pretty text-sm text-muted">
                Build a circuit on up to six qubits. The statevector updates as you edit; shots sample the Born rule.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={toolButton(false, model.n <= MIN_QUBITS)}
                aria-label="Fewer qubits"
                disabled={model.n <= MIN_QUBITS}
                onClick={() => setN(model.n - 1)}
              >
                <Minus className="mx-auto size-4" aria-hidden="true" />
              </button>
              <div className="w-12 text-center">
                <div className="font-mono text-lg tabular-nums leading-none">{model.n}</div>
                <div className="text-xs text-muted">qubits</div>
              </div>
              <button
                type="button"
                className={toolButton(false, model.n >= MAX_QUBITS)}
                aria-label="More qubits"
                disabled={model.n >= MAX_QUBITS}
                onClick={() => setN(model.n + 1)}
              >
                <Plus className="mx-auto size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <label className="block max-w-md">
            <span className="mb-1 block text-xs text-muted">Example circuit</span>
            <select
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg"
              value={model.presetId ?? "custom"}
              onChange={(event) => {
                if (event.target.value !== "custom") loadPreset(event.target.value);
              }}
            >
              <option value="custom">Custom circuit</option>
              {PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <main className="mx-auto grid min-w-0 max-w-6xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-4">
        <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg px-2 py-2 lg:sticky lg:inset-auto lg:z-auto lg:col-span-1 lg:max-w-full lg:self-start lg:border-0 lg:bg-transparent lg:p-0 lg:top-4">
          <div className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {PALETTE.map((group) => (
              <div key={group.label} className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-stretch">
                <div className="w-16 shrink-0 text-xs text-muted lg:w-auto">{group.label}</div>
                <div className="flex gap-2 lg:grid lg:grid-cols-3">
                  {group.gates.map((type) => {
                    const disabled = arity(type) > model.n;
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={disabled}
                        aria-pressed={model.tool === type}
                        className={toolButton(model.tool === type, disabled)}
                        onClick={() =>
                          patch({
                            tool: type,
                            pending: [],
                            pendingColumn: null,
                            notice: null,
                          })
                        }
                      >
                        {GATE_COPY[type].hint}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-stretch">
              <div className="w-16 shrink-0 text-xs text-muted lg:w-auto">Edit</div>
              <button
                type="button"
                aria-pressed={model.tool === "erase"}
                className={cx(toolButton(model.tool === "erase"), "inline-flex items-center gap-1.5")}
                onClick={() => patch({ tool: "erase", pending: [], pendingColumn: null, notice: null })}
              >
                <Eraser className="size-4" aria-hidden="true" />
                Erase
              </button>
            </div>
          </div>
          <p className="mt-3 hidden text-pretty text-sm text-muted lg:block" aria-live="polite">
            {selected ? GATE_COPY[selected.type].blurb : model.tool === "erase" ? placeHint : GATE_COPY[model.tool].blurb}
          </p>
        </aside>

        <section className="flex min-w-0 flex-col gap-4 lg:col-span-3">
          <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-balance text-lg font-semibold">
                  {preset ? preset.name : "Custom circuit"}
                </h2>
                <p className="text-pretty text-sm text-muted">
                  {preset
                    ? preset.blurb
                    : "Qubit 0 is the top wire and the rightmost bit of each ket."}
                </p>
              </div>
              <button
                type="button"
                className="h-11 shrink-0 rounded-lg border border-border px-3 text-sm"
                onClick={() =>
                  setModel((current) => ({
                    ...current,
                    gates: [],
                    depth: 0,
                    pending: [],
                    pendingColumn: null,
                    selectedId: null,
                    presetId: null,
                    counts: null,
                    collapsed: null,
                    notice: null,
                  }))
                }
              >
                Clear
              </button>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <button type="button" className={toolButton(false)} aria-label="Step back" onClick={() => step(-1)}>
                <SkipBack className="mx-auto size-4" aria-hidden="true" />
              </button>
              <label className="flex min-w-0 flex-1 items-center gap-3">
                <span className="sr-only">Circuit depth</span>
                <input
                  type="range"
                  min={0}
                  max={cols}
                  step={1}
                  value={depth}
                  aria-valuetext={`${depth} of ${cols} moments`}
                  onChange={(event) =>
                    patch({ depth: Number(event.target.value), counts: null, collapsed: null })
                  }
                />
              </label>
              <span className="w-12 text-right font-mono text-sm tabular-nums text-muted">
                {depth}/{cols}
              </span>
              <button type="button" className={toolButton(false)} aria-label="Step forward" onClick={() => step(1)}>
                <SkipForward className="mx-auto size-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mb-2 text-sm text-muted lg:hidden" aria-live="polite">
              {placeHint}
            </p>
            {model.notice && (
              <p className="mb-2 text-sm text-primary" role="status">
                {model.notice}
              </p>
            )}

            <div className="rounded-lg bg-bg px-1 py-2">
              <CircuitBoard
                n={model.n}
                gates={model.gates}
                columns={cols}
                depth={depth}
                pending={model.pending}
                pendingColumn={model.pendingColumn}
                selectedId={model.selectedId}
                ones={ones}
                onCell={onCell}
              />
            </div>
            <p className="mt-2 text-pretty text-xs text-muted">
              Top wire is q0, the least significant bit. Dashed copper marks how far the emulator has run. Gates past it stay dim. Arrow keys step the depth.
            </p>

            {selected && (
              <div className="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-bg p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{GATE_COPY[selected.type].name}</p>
                  <p className="text-pretty text-sm text-muted">{GATE_COPY[selected.type].blurb}</p>
                  {hasAngle(selected.type) && (
                    <label className="mt-2 flex items-center gap-3">
                      <span className="font-mono text-sm text-primary">
                        θ {formatAngle(selected.theta ?? Math.PI)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={Math.PI * 2}
                        step={Math.PI / 12}
                        value={selected.theta ?? Math.PI}
                        aria-label={`${GATE_COPY[selected.type].name} angle`}
                        onChange={(event) => {
                          const theta = Number(event.target.value);
                          setModel((current) => ({
                            ...current,
                            presetId: null,
                            counts: null,
                            collapsed: null,
                            gates: current.gates.map((gate) =>
                              gate.id === selected.id ? { ...gate, theta } : gate,
                            ),
                          }));
                        }}
                      />
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm"
                  onClick={() =>
                    setModel((current) => ({
                      ...current,
                      gates: current.gates.filter((gate) => gate.id !== selected.id),
                      selectedId: null,
                      presetId: null,
                      counts: null,
                      collapsed: null,
                    }))
                  }
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">State</h2>
                <p className="mt-1 font-mono text-sm leading-relaxed text-pretty break-words">
                  {ketText(state, model.n)}
                </p>
                <p className="mt-1 font-mono text-xs tabular-nums text-muted">
                  ‖ψ‖ {formatSigned(norm, 3)}
                  {leaders.length > 0 && (
                    <>
                      {" "}
                      · most likely{" "}
                      {leaders
                        .map((row) => `|${basisLabel(row.i, model.n)}⟩ ${formatPercent(row.p)}`)
                        .join(", ")}
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-fg"
                  onClick={runShots}
                >
                  Sample {model.shots.toLocaleString()} shots
                </button>
                {model.collapsed ? (
                  <button
                    type="button"
                    className="h-11 rounded-lg border border-border px-3 text-sm"
                    onClick={() => patch({ collapsed: null, counts: null })}
                  >
                    Restore superposition
                  </button>
                ) : (
                  <button
                    type="button"
                    className="h-11 rounded-lg border border-border px-3 text-sm"
                    onClick={collapseOnce}
                  >
                    Collapse once
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm"
                  onClick={() => {
                    const clip = navigator.clipboard;
                    if (!clip) {
                      patch({ notice: "Could not copy from this browser." });
                      return;
                    }
                    void clip.writeText(ketText(state, model.n)).then(
                      () => patch({ notice: "Copied the ket." }),
                      () => patch({ notice: "Could not copy from this browser." }),
                    );
                  }}
                >
                  <Copy className="size-4" aria-hidden="true" />
                  Copy
                </button>
              </div>
            </div>

            {model.collapsed && (
              <p className="mt-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-pretty">
                Collapsed onto |{basisLabel(model.collapsed.outcome, model.n)}⟩. One shot picked a basis state and threw the other amplitudes away.
              </p>
            )}

            <div className="mt-4 flex gap-2 overflow-x-auto" role="tablist" aria-label="State views">
              {(
                [
                  ["probs", "Probabilities"],
                  ["amps", "Amplitudes"],
                  ["bloch", "Bloch"],
                  ["unitary", "Unitary"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  disabled={id === "unitary" && model.n > 3}
                  className={cx(
                    "h-11 shrink-0 rounded-lg px-3 text-sm",
                    activeTab === id ? "bg-primary text-primary-fg" : "bg-bg text-muted",
                    id === "unitary" && model.n > 3 && "opacity-40",
                  )}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4" role="tabpanel">
              {activeTab === "probs" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="block">
                      <span className="mb-1 block text-xs text-muted">Shots</span>
                      <select
                        className="h-11 rounded-lg border border-border bg-bg px-3 text-sm"
                        value={model.shots}
                        onChange={(event) => patch({ shots: Number(event.target.value), counts: null })}
                      >
                        {[256, 1024, 4096].map((count) => (
                          <option key={count} value={count}>
                            {count.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block min-w-0 flex-1">
                      <span className="mb-1 flex justify-between text-xs text-muted">
                        <span>Readout error</span>
                        <span className="font-mono tabular-nums text-fg">
                          {Math.round(model.readout * 100)}%
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={0.2}
                        step={0.01}
                        value={model.readout}
                        aria-valuetext={`${Math.round(model.readout * 100)} percent bit flips`}
                        onChange={(event) =>
                          patch({ readout: Number(event.target.value), counts: null })
                        }
                      />
                    </label>
                  </div>
                  <p className="text-pretty text-sm text-muted">
                    Copper is the ideal probability. After you sample, the pale bar is how often that bitstring actually came back. Readout error flips each measured bit on its own — it is not gate noise.
                  </p>
                  <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
                    {probs.map((p, index) => {
                      const shots = model.counts?.[index] ?? 0;
                      if (!showAllBases && p < 0.0005 && shots === 0) return null;
                      const empirical = shotTotal > 0 ? shots / shotTotal : 0;
                      return (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-20 shrink-0 font-mono text-sm tabular-nums">|{basisLabel(index, model.n)}⟩</span>
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="h-2.5 overflow-hidden rounded-full bg-bg">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.min(100, p * 100)}%` }}
                              />
                            </div>
                            {shotTotal > 0 && (
                              <div className="h-1.5 overflow-hidden rounded-full bg-bg">
                                <div
                                  className="h-full rounded-full bg-fg/70"
                                  style={{ width: `${Math.min(100, empirical * 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                          <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                            {formatPercent(p)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {activeTab === "amps" && (
                <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                  {state.map((amp, index) => {
                    if (mag(amp) < 1e-8 && dim > 8) return null;
                    const turns = ((phase(amp) * 180) / Math.PI + 360) % 360;
                    return (
                      <li key={index} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 font-mono text-sm">|{basisLabel(index, model.n)}⟩</span>
                        <span
                          className="phase-dial"
                          style={{
                            background: `conic-gradient(var(--color-primary) ${turns}deg, var(--color-border) ${turns}deg)`,
                          }}
                          aria-hidden="true"
                        />
                        <span className="truncate font-mono text-sm tabular-nums">{formatAmp(amp)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {activeTab === "bloch" && (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {blochs.map((bloch, q) => (
                    <BlochSphere key={q} label={`q${q}`} bloch={bloch} />
                  ))}
                </div>
              )}

              {activeTab === "unitary" && unitary && (
                <div className="overflow-x-auto">
                  <p className="mb-2 text-pretty text-sm text-muted">
                    Columns are inputs, rows are outputs, in basis order. Global phase is kept.
                  </p>
                  <table className="border-collapse font-mono text-xs">
                    <thead>
                      <tr>
                        <th className="p-2 text-left font-normal text-muted" />
                        {unitary[0]?.map((_, col) => (
                          <th key={col} className="p-2 text-left font-normal text-muted">
                            |{basisLabel(col, model.n)}⟩
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {unitary.map((row, r) => (
                        <tr key={r} className="border-t border-border">
                          <th className="p-2 text-left font-normal text-muted">|{basisLabel(r, model.n)}⟩</th>
                          {row.map((value, c) => (
                            <td key={c} className="p-2 whitespace-nowrap tabular-nums">
                              {formatAmp(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {activeTab === "unitary" && model.n > 3 && (
                <p className="text-sm text-muted">The full matrix is shown for three qubits or fewer.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
