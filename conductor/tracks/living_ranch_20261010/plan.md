# Plan: Living Ranch — wind, feeding ceremony, wandering

Spec: [spec.md](./spec.md) · Branch: `track/living_ranch_20261010`
Type: Feature · Order: cheap → architecture (wind → ceremony → wander)

Each phase follows workflow.md TDD where logic is pure and ends with a Phase
Verification & Checkpoint gate run before moving on.

## Phase A — Wind sway on scenery

- [x] Task: Scene-logic module (failing tests) — extract pure wind math:
  - [x] per-class amplitude table (tuft > bush > tree, rocks/foodPile = 0) + position-hash phase offsets (stable per prop world position, seeded — no Math.random)
  - [x] gust envelope: low-frequency smooth noise mapped into [0.4, 1.2] × base amplitude, no discontinuities
  - [x] `prefers-reduced-motion` flattens every amplitude to 0
  - [x] boundary tests: gust continuity, amplitude table completeness for every registry prop id, phase-hash stability, reduced-motion zeroing (`9b7755c`)
- [x] Task: Wire scene.ts — attach per-prop `{group, baseAmp, phase}` at scatter time; per-tick rotation around base axis; no geometry/material edits; landmark trees included, rocks/pile excluded (`d104fe7`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) — bun run check, targeted tests, biome, browser screenshot confirming visible sway across multiple props *(checkpoint: sha)*

## Phase B — Feeding ceremony

- [ ] Task: Ceremony state machine (failing tests) in the scene-logic module:
  - [ ] phases `turn → walk-out → nibble(2–3 dips) → walk-home` with fixed durations totaling ~4–6 s; phase transitions from tick deltas; invalid-phase guards
  - [ ] instant-cancel from ANY user input path → single `cancel()` that returns the machine to `home-idle` (position lerps home); never queues
  - [ ] reduced-motion variant: turn+travel collapsed to in-place nibble at anchor, still cancellable
  - [ ] successive feeds re-trigger cleanly even while pile already visible
- [ ] Task: Wire scene.ts + main.ts — creature yaw target, walk target near pile (seeded side offset, pile anchor from existing scatter data), head-dip overlay on the existing head-bob pivot; main.ts onCare feed branch calls `scene.startFeedCeremony()` only after a successful feed; care/train/advance callers already flow through `scene.cancelFeedCeremony()` — add call, never the reverse
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) — unit tests green; browser evidence: feed → pile up + creature nibbling; mid-ceremony cancel snaps home *(checkpoint: sha)*

## Phase C — Sparse wandering

- [ ] Task: Wander scheduler (failing tests) in the scene-logic module:
  - [ ] gap chooser 20–40 s from free-running Rng seeded `visualSeed ^ stepCount` (never wall-clock; no save interaction)
  - [ ] target chooser: near a visible tuft/bush, min distance from pile anchor and inside moss disc; deterministic per (seed, step)
  - [ ] visit pause with look-around head turns (1–2 s); droopy/sick mood profiles (from existing scenes mapping) suppress wandering; end state always `home-idle`
- [ ] Task: Locomotion + camera — leg-shuffle overlay on existing leg pivots at walking cadence; orbit target soft-lerps to creature pos, returns to home anchor; user drag/wheel remains authoritative
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) — unit tests; browser evidence: a full wander trip + camera tracking, reduced-motion shows no wandering *(checkpoint: sha)*

## Phase D — Integration and Verification Gate

- [ ] Task: Full gate — `bun run verify` green everywhere; `bun run gate:determinism` reports byte-identical creature GLBs and matching prop digests (zero geometry churn)
- [ ] Task: Browser manual verification — screenshot evidence: swaying meadow, ceremony sequence (3 shots), one wander trip; reduced-motion check of both
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) *(checkpoint: sha)*

## Notes

- Estimated diff surface: `apps/client/src/` only (scene-logic module new; scene.ts, main.ts touched) + one new test file. No sim, no save, no voxel data.
- Cancel is a hard invariant: any HUD input path must reach the scene before the next tick semantics are observed.
