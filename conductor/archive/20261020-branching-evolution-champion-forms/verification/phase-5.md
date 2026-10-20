# Phase 5 Verification — Tint, handbook, and documentation

- **Track:** `20261020-branching-evolution-champion-forms`
- **Phase:** 5
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-branching-evolution-champion-forms`
- **Phase base:** `977de9f58f943fd457c5c2457ab53e9a2d94c90f`
- **Result:** **pass** — the phase's code, tests, typecheck, build, and determinism checks are green, and the one external formatting blocker (Conductor metadata CRLF) was fixed by the orchestrator, after which the exact chain exits 0.

## Commands

The exact phase command:

```
bun test --timeout 120000 apps/client/src/creature.test.ts apps/client/src/handbook.test.ts apps/client/src/face-arena.test.ts && bun run verify && bun run build && bun run gate:determinism
```

| Check | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit (targeted) | `bun test --timeout 120000 apps/client/src/creature.test.ts apps/client/src/handbook.test.ts apps/client/src/face-arena.test.ts` | 0 | 19 pass, 0 fail — 21 500 expect() calls across 3 files |
| static | `bun run check` | 0 | voxel 62, sim 91, client 301 files — no type errors |
| unit (full) | `bun test --check --parallel --timeout 120000` | 0 | 2046 pass, 1 skip, 0 fail — 2047 tests across 153 files |
| lint/format | `biome check` | 0 | 474 files, 7 pre-existing non-null-assertion warnings, no errors (after the metadata EOL fix below). |
| determinism | `bun run gate:determinism` (run on its own after the chain stopped) | 0 | 9 creature artifacts + 5 props byte-identical |
| build | `bun run build` (run on its own after the chain stopped) | 0 | Vite production build, 245 modules (JS 844.93 kB, CSS 61.32 kB) |

The chained command stopped at the Biome step during the phase because of the external formatting error below; the orchestrator fixed that file with `git diff --ignore-cr-at-eol` proving no content change, and `bun run verify` then exited 0 (474 files linted, 7 pre-existing warnings).

## Blocker (resolved)

`conductor/tracks/20261020-branching-evolution-champion-forms/metadata.json` was committed with CRLF line endings, so Biome's formatter reported it on every run. The phase correctly refused to edit Conductor state. The orchestrator rewrote that one file with LF (`git diff --ignore-cr-at-eol` shows no content change) and committed it as a Conductor chore; `bun run verify` now exits 0.

## Task status

| Task | Status | Evidence |
| --- | --- | --- |
| P5.T1 — per-instance accent tint | done | `branchTint`/`applyBranchTint` in `apps/client/src/creature.ts` resolve the branch id (`null`, `undefined`, `legacy`, and unknown ids return null) and set **only** `material.color` on each mesh to a near-white HSL wash in the branch's `accentHue` (final tuning s 0.62, l 0.80 after the desktop visual check; the unit test pins the 0.75–0.95 lightness band). The ranch applies it in `ranch/mount.ts` right after `buildCreatureGroup` and before the rig joins the scene; the branch is threaded `scene.ts` → `ranch/types.ts` → `ranch/api.ts` → `ranch/mount.ts` for both `setCreature` and the evolution swap (`ranch/state.ts` keeps it on `evolutionSwap`, `ranch/frame.ts` passes it at the swap frame), sourced from `state.creature.branch` in `app/scene-sync.ts`, `app/hud-screen.ts`, and `app/screens.ts`. The arena adds optional `branch` to `FightCasting` (`staging.ts`) and `CastInfo` (`roster.ts`), applies the wash in `buildSpot` before `baseColors` is captured (so a hit flash restores the tinted base), and passes it in `cup/arena.ts` (owned side) and `spar/casting.ts` (owned and the rival's derived `BattleSide.branch`; cup rivals carry no branch in `CupSlot`, so they stay untinted). No geometry, material, mesh, or draw call is added; every creature owns its own materials. |
| P5.T2 — handbook Paths page | done | New `apps/client/src/handbook/paths.ts`, registered fifth in `handbook.ts`. It reads `BRANCHES` for the two leans (`ATK + SPD`, `HP + DEF` via `statLabel`), states training decides with natural stats as the tie-break, describes the Growth-panel direction-only preview, lists every real form with its signature display name from `getMove`, notes the default four never include it, and closes with the legacy exception (old save keeps its numbers, no signature). No gate days or thresholds. Reuses `handbook/common.ts` helpers; existing handbook CSS covers the page, so `ui/kit.css` needed no change. |
| P5.T3 — visual evidence | orchestrator, done | Desktop captures at day 12: the Cinder Courser and Pyre Warden rigs each carry their own warm wash while the plate label names the form; the handbook's fifth Paths tab renders both leans, all six forms with their signatures, and the Old lines section (the panel scrolls to reach them). See Visual verification. |

## Tests added

`apps/client/src/creature.test.ts` — `describe("branch tint")`:

- “washes one group's materials and leaves the other untouched”: two groups from the same build, one tinted; the tinted group has one identical wash on every part (not white), the same number of materials, and the sibling's colours are unchanged; the wash's HSL lightness stays in the near-white band (0.75–0.95).
- “legacy, null, and unknown branches leave every colour alone”: `null`, `undefined`, `"legacy"`, and `"ember_form"` all return `false`/`null` and leave every material at its built colour; `pyre_warden` does tint.

Existing grey/flat/vertex-colour cases stay green.

`apps/client/src/handbook.test.ts`:

- tab order test now expects five pages ending in “Paths”; selection/tabIndex/hidden arrays and the ArrowLeft wrap moved to index 4, and Raising remains index 3.
- `describe("the handbook's Paths page")`: names both leans and every real branch label with its signature display name, contains the legacy “no signature move” line and “older save”; asserts the Growth panel is mentioned and there are no day/threshold numbers (`/\bday\s*\d/i`, `/\b(10|25|5)\b/`); every tip and rule copy is at most two sentences.

## Acceptance criteria

| AC | Status | How |
| --- | --- | --- |
| AC-7 | pass | No client surface asks for a branch; no day-loop code touched. The tint and page are presentation only. |
| AC-9 | partial (this phase) | The earned form now reads at a glance in the ranch and arena (hue wash plus the Phase 4 label); Hall/export round-trip was verified in Phase 2. Screenshot evidence is the orchestrator's step. |
| AC-12 | pass | Determinism gate byte-identical (no generation change); every touched TS module under the 12 KB cap (full `module-size.test.ts` green); the tint touches only per-instance material colour, so one creature cannot affect another (unit test). |
| FR-10 | pass | Tint + text label on plate/growth/detail (Phase 4) and now the rig/arena wash; legacy never tinted. |
| FR-11 | pass | Handbook teaches both leans, the preview, signatures, and the legacy exception from sim labels. |
| NFR-5 | pass | No new geometry/material/mesh/draw call; tint is a single `Color.copy` per part at build time. |

## Deviations

Files outside the plan's Touches, all the smallest change needed to carry the branch to the tint sites, recorded here:

| File | Reason |
| --- | --- |
| `apps/client/src/scene/types.ts` | `SceneHandle.setCreature` and `startEvolutionCeremony` gain an optional trailing `branch` so the scene can receive it. |
| `apps/client/src/app/scene-sync.ts` | Passes `creature.branch` on the rebuild call (the stated “read `state.creature.branch`” site). |
| `apps/client/src/app/hud-screen.ts` | Passes `creature.branch` to the evolution ceremony so the swapped juvenile is tinted. |
| `apps/client/src/app/screens.ts` | Passes `creature.branch` to the graduation send-off ceremony (it reuses the evolution swap). |
| `apps/client/src/ranch/state.ts` | `evolutionSwap` carries the branch so the swap frame can tint the new rig. |

## Notes

- No CSS change was needed: the Paths page uses the existing handbook classes, and the tint is a material property. `ui/kit.css` remains untouched.
- The tint is deliberately near-white so the baked vertex colours (coat, AO, dappling) still read; the test pins lightness and non-white. A first pass at s 0.55 / l 0.86 was nearly invisible on the fire line in the desktop check, so the final wash is s 0.62 / l 0.80 — still a multiplier, not a repaint.
- Handbook copy tweak after the visual pass: each branch row reads "<Signature> — the special this form teaches." (the first draft said "one of the two signature moves this line teaches", which read oddly next to a single form's name).

## Visual verification

Desktop Chromium at 1400 px, dev server, seeded v19 saves:

- **Cinder Courser** (day 12): rig reads warmer/lighter than the untinted build; plate line "CINDER COURSER · ATK + SPD"; detail Path names Form / Favors / Signature.
- **Pyre Warden** (day 12, same stats): rig reads deeper red-orange against the Courser capture, so the two branches of one species are distinguishable at a glance; plate line "PYRE WARDEN · HP + DEF".
- **Legacy** (day 12): no wash; plate shows "LEGACY" and the detail Path reads "No signature move".
- **Handbook → Paths**: five tabs render, the new Paths tab shows both leans, the pre-gate read, all six forms with their signatures, and the Old lines section; the panel scrolls to reach the last rows.

Narrow-viewport visual verification remains unavailable in this harness (no window resize); the layout was covered by the existing narrow HUD rules and the 12 KB module cap, not by a screenshot.

- Build and determinism pass on their own; the only red check during the phase was the external CRLF formatting error in Conductor metadata described above, now fixed.
- Final head after commits: see the track log (code commits + this evidence commit).
