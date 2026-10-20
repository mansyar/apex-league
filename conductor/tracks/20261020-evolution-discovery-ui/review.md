# Review — Evolution Threshold Discovery UI

- **Track:** `20261020-evolution-discovery-ui`
- **Type:** feature
- **Branch:** `feat/20261020-evolution-discovery-ui`
- **Range:** `b97cb37..HEAD`, reviewed per phase (`b97cb37..34fc937`, `34fc937..b039471`, `b039471..385a49f`, `385a49f..HEAD`)
- **Date:** 2026-10-20
- **Verdict:** BLOCK (round 1 → Phase R1 fixes)

## Summary

Save v17, the growth view-model, and the live-repainting panel are correct and
well tested. Gate predicates mirror `evaluateEvolution` exactly (imported
constants, `sickCooldown === 0`), undiscovered copy leaks no digit through text,
ARIA, `title`, or CSS, and the migration is total and idempotent. The blocking
issues are coverage for the live-repaint seam (AC-7) and a real NFR-2 breach the
primary had wrongly claimed was guarded: `creature-detail.ts` is 12,305 B against
a 12,288 B cap.

Volume strategy: large diff (22 files, +1595/−34 excluding `conductor/`), so the
review ran per phase and merged duplicates.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Unit | `bun test --timeout 120000` | pass — 1751 pass, 1 skip, 0 fail | integrated.md |
| Unit (CI) | `bun test --check --parallel --timeout 120000` | pass | integrated.md |
| Static | `bun run check` | pass | integrated.md |
| Lint | `bunx biome check` | pass — 0 errors, 7 pre-existing warnings | review run |
| Format | `bunx biome format .` | pass | review run |
| Build | `bun run build` | pass | integrated.md |
| Determinism | `bun run gate:determinism` | pass | integrated.md |

## Requirements

| ID | Status | Note |
| --- | --- | --- |
| FR-1, FR-2, FR-3, FR-6 | covered | view-model + panel tests |
| FR-4, FR-5 | covered | `evolutionKnowledge.test.ts` |
| FR-7 | **partial** | no automated or browser evidence (F1) |
| FR-8 | covered | no `graduation/` diff |
| NFR-1 | covered | glyph + status word + `aria-label` |
| NFR-2 | **unmet** | `creature-detail.ts` 12,305 B > 12,288 B (F2) |
| NFR-3, NFR-4, NFR-5, NFR-6 | covered | determinism gate, migration tests, copy tests, no manifest diff |
| AC-1 – AC-6, AC-8 – AC-10 | covered | see `verification/integrated.md` |
| AC-7 | **partial** | same as FR-7 |

## Findings

### F1 — Medium — AC-7 has no automated or browser evidence

- **Where:** `apps/client/src/creature-detail.test.ts:1-140`
- **What:** `buildCreatureDetail`, `open`, `sync`, and the `hud.ts` call site are
  never executed by a test. P3.T2 is marked `[x]` and phase 3 claims the
  criterion.
- **Why:** the refresh rides three separate seams (`hud.update` reaching the
  subscriber, `visible` being true, `renderGrowth` swapping the host). Any can
  regress while the suite stays green.
- **Fix:** fake-DOM test for open → sync → repaint, no-op while closed, and
  creature-less hide.
- **Test gap:** yes.

### F2 — High (reclassified from Low) — NFR-2 is unmet

- **Where:** `apps/client/src/creature-detail.ts` (12,305 B), `apps/client/src/module-size.test.ts:13`
- **What:** the touched module exceeds the 12 KB cap. The guard scans only
  `scene-logic/` and `ranch/`, so nothing fails, and `integrated.md` cited
  "guard green" as evidence for NFR-2.
- **Why:** the requirement is silently violated; the evidence was misleading.
  Reclassified from Low because an unmet NFR is a requirement failure, not a nit.
- **Fix:** extract the Growth DOM builders into `growth-panel.ts` so both
  modules are under the cap; restate the evidence as measured.
- **Test gap:** the guard's directory scope (documented, not widened here — client
  root modules such as `main.ts` predate and exceed the cap by design).

### F3 — Low — `GrowthRow.target` is dead

- **Where:** `apps/client/src/growth.ts:35-36`, `:62-63`, `:188`, `:196`
- **What:** production renders only `label`, `met`, `detail`; `target` duplicates
  what `detail` already contains.
- **Why:** two representations drift, and a future consumer could double-print.
- **Fix:** drop the field and assert the composed `detail` instead.

### F4 — Low — Evidence cites commits that no longer exist

- **Where:** `verification/phase-1.md:10,75,108`, `phase-2.md:8`, `phase-3.md:8,28-30`
- **What:** per-task SHAs (`73e1d23`, `ac53706`, `60ffa41`, `b5519eb`, `7e9416e`,
  `28b5f17`, `fa0abfc`) were squashed away; only `34fc937`, `b039471`, `385a49f`
  survive.
- **Why:** unverifiable history misleads the revert and future review paths.
- **Fix:** cite the phase checkpoints and state that history was squashed.

## Plan compliance

All three phases have Result, Checkpoint, and Evidence; every `[x]` task was
implemented; the diff stays within Touches apart from reported deviations
(`storage.ts`, version-fixture tests). Phase R1 added for the findings above.

## Out of scope

- Widening `module-size.test.ts` to the client root (`main.ts`, `hud.ts`,
  `scene.ts` already exceed 12 KB there by long-standing design).

## Debt

None accepted. Strict mode is on: no deferrals.

## History

| Round | Verdict | Findings | Fixed |
| --- | --- | --- | --- |
| 1 | BLOCK | 1 High, 1 Medium, 2 Low | — |

## Doc sync

pending
