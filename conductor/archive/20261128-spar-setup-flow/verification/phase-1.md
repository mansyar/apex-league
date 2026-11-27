# Phase 1 — Arm-then-start selection logic — Verification

- **Track:** 20261128-spar-setup-flow
- **Phase:** 1 — Arm-then-start selection logic
- **Date:** 2026-11-28
- **Branch:** `refactor/20261128-spar-setup-flow`
- **Base:** `327a0403` (phase base per brief)
- **Head:** `d205ba8d` (code head; this evidence file is committed on top)
- **Result:** blocked — all code and unit verification complete; the required
  `biome check` could not be run in this shell (binary not on PATH; `bunx`
  wrapper is permission-denied). Primary should run it and hand back output.

## What changed

- `apps/client/src/spar/panel.ts` — `buildSparPanel` now takes one `SparSetupSeam`
  object: `arm` / `pickRule` (selection only) plus `launch` (the single fight
  entry), and live `armed` / `rule` reads. Tactic row gained `on: "on"` +
  `initialOn: "press"` so the choice-row factory owns the armed highlight;
  rule row now returns its buttons. Refs are extended (in-file) with
  `launch`, `armed`, `rule`, `ruleButtons` for Phase 2's sticky footer.
- `apps/client/src/spar.ts` — owns `armedDoctrine` (Press default) and
  `playerRule`; tactic taps only set the armed doctrine, rule taps only store
  the note. `launch` calls the existing `runBattle(armedDoctrine, playerRule)`
  unchanged. `presentSetup` re-arms Press on every open (Spar chip and
  `fightGhost` share it), so a prior tactic can never leak into a new bout.
- `apps/client/src/spar/setup.ts` — `markArmedTactic` restores the Press
  highlight on a fresh setup.
- Tests: `panel.test.ts` extended the fake-DOM harness (launch/arm/pick spies,
  `createDocumentFragment`, `replaceChildren`) and covers Press default,
  tactic/rule/kit taps never launching, rapid re-taps, highlight reset, and the
  launch seam; `ghost.test.ts` adds arm-then-start parity for every doctrine.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Unit + typecheck | `bun test --check apps/client/src/spar/panel.test.ts apps/client/src/spar/ghost.test.ts apps/client/src/spar/casting.test.ts` | 0 | 19 pass, 0 fail, 112 `expect()` calls; 263 files typechecked, no TS errors |
| Static (lint/format) | `biome check apps/client/src/spar/panel.ts apps/client/src/spar.ts apps/client/src/spar/setup.ts apps/client/src/spar/panel.test.ts apps/client/src/spar/ghost.test.ts` | 1 | `biome` is not on this shell's PATH ("term not recognized"); no diagnostics produced |
| Static (retry) | `bunx biome check apps/client/src/spar/panel.ts apps/client/src/spar.ts apps/client/src/spar/setup.ts apps/client/src/spar/panel.test.ts apps/client/src/spar/ghost.test.ts` | denied | `permission.rejected` on `bunx` — see Blockers |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Tactic tap updates armed highlight; no `runBattle`/arena entry | `panel.test.ts`: "a tactic tap arms + highlights only; no runBattle or arena entry", "rapid re-taps…", "a rule tap only picks the note", "a kit tap only sets the loadout" — arm/pick spies fire, launch spy stays 0 | pass |
| AC-2 | Fresh setup shows Press armed and enabled Start | `panel.test.ts`: "a fresh setup shows Press armed and exposes one live launch entry" (Press has `.on`, `armed()` is `press`), "only the exposed launch entry starts a bout" (`refs.launch()` fires). The visible Start control is Phase 2; Phase 1 exposes a callable launch seam. | pass (Start control deferred to Phase 2) |
| AC-5 | Ghost setup: arm-then-start works; fight resolves the ghost contender | `ghost.test.ts`: "arm-then-start parity…" — for all `DOCTRINE_IDS` the ghost `ownedSide` equals a normal exhibition's (same armed doctrine + rule), rival keeps contender name/kit, `resolveSpar` is deterministic; distinct doctrines re-arm distinctly | pass |
| AC-6 | Full gate green incl. Biome clean | `bun test --check` green; `biome check` could not run here | blocked |

Requirement coverage: FR-1 (arm-only via seam + highlight), FR-2 (Press default
+ launch seam), FR-5 (ghost parity), AC-1/AC-2/AC-5 above.

## Evidence paths

- Source: `apps/client/src/spar/panel.ts`, `apps/client/src/spar.ts`,
  `apps/client/src/spar/setup.ts`
- Tests: `apps/client/src/spar/panel.test.ts`, `apps/client/src/spar/ghost.test.ts`
- Commits: `c4caa08b` (P1.T1), `d205ba8d` (P1.T2)

## Deviations

- None. All edits stayed inside `panel.ts`, `spar.ts`, `setup.ts` and the
  permitted `spar/*.test.ts`. The extended panel-refs interface is declared in
  `panel.ts` itself, so `spar/types.ts` was not touched.

## Blockers

- `biome check <touched files>` — named Phase 1 verification — could not run:
  bare `biome` is not on PATH in this shell. The `bunx biome check …` retry was
  permission-denied. Expected: lint/format diagnostics for the five touched
  files, exit 0 when clean. Primary should run it and hand back the output.

## Notes

- The launch seam is deliberately exposed but has no UI trigger in Phase 1:
  tactic/rule/kit taps are arm-only by design, and Phase 2 wires
  `refs.launch` to the sticky Start button (which also supplies the visible
  "Press armed / Start enabled" state). No existing test relies on a tactic
  tap launching a fight.
- `runBattle`, `battleSeed` minting, rule storage, kit picker and sim logic are
  unchanged; ghost and normal spar share the same `presentSetup` reset.
- No product/design decision was required; footer wording remains Phase 2's.
