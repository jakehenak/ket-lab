# Ket Lab

A statevector emulator for small quantum circuits, up to six qubits.

Qubit 0 is the top wire and the least significant bit of each ket. Gates are exact unitaries. Shots are drawn from the Born rule, with an optional bit-flip readout error. There is no gate noise.

## Try it

Open the example menu. Bell, GHZ, Deutsch (constant and balanced), Grover `|11⟩`, and a 3-qubit QFT are included. The depth slider rewinds the circuit. Arrow keys do the same.

- **Probabilities** — ideal Born probabilities, then a pale bar after you sample shots
- **Amplitudes** — magnitude and phase
- **Bloch** — one sphere per qubit, from the reduced density matrix
- **Unitary** — full matrix, three qubits or fewer

## Code

| Path | What it is |
| --- | --- |
| `src/lib/quantum` | Complex numbers, gates, statevector, presets |
| `src/components/quantum` | Circuit board, Bloch spheres, bench |
| `scripts/quantum-check.ts` | Checks for Bell, Grover, Deutsch, and QFT |

```bash
npm install
npm run dev
```

The dev server listens on port 8080.
