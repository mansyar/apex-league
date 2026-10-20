# Specification: Client Module Decomposition & Size Guard

## Overview

Every non-test module in `apps/client/src` comes in under the project's 12 KB cap,
and a single guard test enforces that cap across the whole client tree instead of
the two folders it scans today.

## Problem & Motivation

`module-size.test.ts` enforces `CAP_BYTES = 12 * 1024` over `["scene-logic", "ranch"]`
only — the two folders decomposed by `ranch_decomposition_20261018`. Modules outside
those folders drifted:

| Module | Bytes | Responsibilities |
| --- | --- | --- |
| `main.ts` | 25.2 KB | boot/load, store, scene sync, camera prefs, audio, arena entry, spar/cup/graduation/HUD construction, import modal, runtime graphics |
| `hud.ts` | 20.3 KB | score bug, lower third, dock wiring, hints, update loop |
| `scene.ts` | 19.7 KB | camera, lights, ground, props, creature mount, frame loop |
| `spar.ts` | 17.1 KB | spar screen, setup, casting |
| `hud/plates.ts` | 16.5 KB | ladder read-models, score/lineage/creature plate builders, callout |
| `mock.ts` | 14.9 KB | dev harness for `mock.html` |
| `hud/copy.ts` | 14.8 KB | care, cup, growth, graduation copy + onboarding hint table |
| `staging-fx.ts` | 14.6 KB | hit-stop, projectiles, bursts, kill shots |
| `graduation.ts` | 14.5 KB | graduation screen + modal shell |
| `orbit-camera.ts` | 14.4 KB | arena framing + orbit/drag rig |
| `cup-screens.ts` | 12.3 KB | bracket, coach, results, give-up, battle chips |

`20261020-evolution-discovery-ui` added `size-probe.test.ts` as a manual pin for four
of them (review finding). That is a workaround: the rule the project states is not
the rule CI enforces. Large wiring hubs also make review diffs hard to read and
invite subscriber-order mistakes.

## Goals & Success Metrics

- Zero non-test modules over 12,288 B under `apps/client/src`.
- One guard test that covers the whole client tree and names every offender.
- Behaviour is unchanged: same DOM, same copy, same timings, same save format.
- No new dependency, no test rewritten beyond import paths.

## Scope

**In scope**

- `main.ts`, `hud.ts`, `hud/plates.ts`, `hud/copy.ts`, `scene.ts`, `spar.ts`,
  `staging-fx.ts`, `orbit-camera.ts`, `graduation.ts`, `cup-screens.ts`, `mock.ts`.
- `module-size.test.ts` rewritten; `size-probe.test.ts` retired.
- A dated note in `conductor/tech-stack.md`.

**Out of scope**

- `packages/sim` (four offenders: `save/migrate.ts` 26.6 KB, `battle/clock.ts` 20 KB,
  `save/storage.ts` 15.6 KB, `cup/session.ts` 12 KB) and `packages/voxel`
  (four archetype art files) — separate track.
- Any behavioural, visual, copy or balance change.
- New abstractions beyond the seams the code already implies.
- Architecture documentation (separate track).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | `main.ts` keeps only boot and composition; scene sync, camera prefs, audio, arena entry/exit, flash, screen construction and runtime graphics move into `app/*` modules | must |
| FR-2 | `hud.ts` becomes a facade over `hud/shell.ts`, `hud/update.ts`, `hud/hints.ts`; `hud/plates.ts` and `hud/copy.ts` split by responsibility | must |
| FR-3 | `scene.ts`, `staging-fx.ts` and `orbit-camera.ts` split into composition/dressing/loop, effect layers, and framing/drag respectively | must |
| FR-4 | `spar.ts`, `cup-screens.ts` and `graduation.ts` split into per-screen modules inside their existing folders | must |
| FR-5 | `mock.ts` splits the same way shipping code does — no exemption | must |
| FR-6 | One guard walks every non-test `.ts` under `apps/client/src`, reports path + bytes for each offender, and replaces `size-probe.test.ts` | must |
| FR-7 | Existing public surfaces (`hud.ts`, `cup.ts`, `spar.ts`, `graduation.ts`, `scene.ts`, `main.ts`) keep their exports so callers change only where a module genuinely moved | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No behaviour change: identical DOM structure, copy, subscriber registration order and timing |
| NFR-2 | Every resulting module is single-purpose and under 12,288 B |
| NFR-3 | No new runtime dependency; no change to `package.json` |
| NFR-4 | The suite stays green with only import-path edits; no test weakened or deleted except retiring `size-probe.test.ts` |
| NFR-5 | The guard's failure message lists offender paths and byte counts, so a fix is obvious from CI output |
| NFR-6 | Moves are mechanical: each phase's diff is dominated by relocation, not rewriting |
| NFR-7 | No new import cycles; dependency direction stays screen → view-model → kit/sim |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | No non-test `.ts` under `apps/client/src` exceeds 12,288 B | FR-1..FR-5, NFR-2 |
| AC-2 | `module-size.test.ts` scans the whole client tree, excludes `*.test.ts` and `vite-env.d.ts`, and fails with offender paths + sizes | FR-6, NFR-5 |
| AC-3 | A deliberately oversized module makes the guard fail (negative control), and the control leaves no artifact behind | FR-6 |
| AC-4 | `bun run verify` and `bun run build` pass; determinism gate output unchanged | NFR-1, NFR-3 |
| AC-5 | Browser smoke: draft → starter → feed/rest/play → detail modal tabs → spar → cup run → graduation behave as before | NFR-1 |
| AC-6 | `hud.ts`, `cup.ts`, `spar.ts`, `graduation.ts` and `scene.ts` export the same names as before the track | FR-7 |
| AC-7 | No new import cycles in the client graph | NFR-7 |
| AC-8 | `size-probe.test.ts` is gone and its guarantee is covered by the new guard | FR-6 |

## Edge Cases

- **Wiring order**: subscriber registration in `main.ts` is load-bearing (`store.subscribe`
  fires in registration order). Splits must preserve the order; the phase evidence
  records the original order.
- **Facade modules**: a re-export file must not itself be the biggest module; keep
  facades to re-exports only.
- **Cycles**: `hud/update.ts` and `hud/shell.ts` can both want shared types — put
  shared types in a third module rather than importing each other.
- **Dev harness**: `mock.ts` loads from `mock.html` only; splitting must keep that
  entry working (no import of shipping-only code paths that need a live store).
- **Vite-env**: `vite-env.d.ts` is a type-only declaration, excluded by extension check.
- **Near-cap modules**: a split that lands at 12.0 KB is not success; each new module
  must have real headroom for the next change.

## Dependencies

- **Tracks**: none open. `20261020-detail-modal-tabs` merged (`dde88d1`) and archived.
- **External**: none.

## Open Questions & Assumptions

- Assumption: no behaviour change is wanted, even where a split reveals an obvious
  cleanup. Those become findings for a later track.
- Assumption: the cap stays 12,288 B with no per-file exceptions.
- Assumption: `packages/sim` and `packages/voxel` stay out of scope for this track.

## References

- `conductor/tech-stack.md` — module layout and the 12 KB cap rationale.
- `conductor/learnings.md` §11, §14, §15 — injected defaults, silent helper options,
  stacking contexts; all browser-verification lessons apply to this refactor's smoke pass.
- `apps/client/src/module-size.test.ts`, `apps/client/src/size-probe.test.ts`.
