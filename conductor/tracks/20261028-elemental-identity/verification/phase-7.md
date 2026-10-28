# Phase 7 verification — Wind (7 new + 1 upgrade, decoupled parts)

> Result: **blocked** — subagent shell is permission-denied in this
> environment, so no task commits, no gate, and no lab evidence could be
> produced here. All code and pins below are written and ready; the primary
> runs the gate, commits per task, and captures the 8 wind Move-Lab frames.

## Tasks

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| P7.T1 | New rows in `wind.ts` | done (uncommitted) | 7 new bespoke rows; `zephyr_veil` via `barrierBody("wind")`, stale default-body comment deleted |
| P7.T2 | `cyclone_dive` upgrade + purge shared water/plant parts | done (uncommitted) | Dive verb (rising windup, plunging streak, 3 lanes, no charge); wind-only `streak`/`streaks` shot families replace shared `teardrop`/`seeds` |
| P7.T3 | Test pins | done (uncommitted) | AC-1 + AC-3 + FR-4 pins in `fallback.test.ts`; look pin, guard trim, and builder-level FR-4 pins in `move-fx.test.ts` |
| P7.T4 | This report | done (uncommitted) | Primary runs the gate, commits, captures |

Suggested commit sequence (exact messages from the brief):

1. `feat(client): phase 7 wind new bespoke rows` — `wind.ts` (P7.T1)
2. `feat(client): phase 7 cyclone_dive upgrade and wind part decoupling` — `wind.ts` cyclone row + `looks.ts` + `shot-geometry.ts` (P7.T2)
3. `test(client): phase 7 wind pins and guard trim` — `fallback.test.ts` + `move-fx.test.ts` (P7.T3)

## Verification

| Check | Result |
| --- | --- |
| `bun run verify` | not run (no shell) — primary runs |
| `bun run build` | not run (no shell) — primary runs |
| Move-Lab frames (8 wind moves, desktop + phone, clean console) | not captured (no shell) — primary captures |
| Module-size caps (`wind.ts`, `looks.ts`, `shot-geometry.ts` ≤ 12 KB) | not measured (no shell) — `wind.ts` is 8 rows in the `earth.ts` shape (~9 KB budget); no new modules added |

Pre-gate self-checks for the primary:

- `cyclone_dive` keeps the legacy `move-fx.test.ts` pin green: rise
  0.16 > 0, 3 lanes, burst gravity 2.4 < 4, shove -0.45 < 0 with
  |-0.45| < 0.5.
- Every projectile shot `life` ≥ 620ms (anchor lesson: shortest is
  `gust` at 640ms).
- `talon_slash`: 3 shots on ONE shared beat (`at: 0.42` × 3, simultaneous
  — not staggered).
- `projectiles.test.ts` wind goldens still hold: the `streak` core is
  stretched along +Z (faces downrange at spawn), carries no pulse, and
  keeps spin 0.03 (corkscrew).
- Run `bunx biome check --write --unsafe` on the touched files before the
  gate; delete any scratch capture scripts before `bun run verify`.

## Travel/impact separation notes

- Shot flight is look-driven and fully generic (`projectiles.ts`
  dispatches on look fields, never on family names): the new `streak`
  core is aimed downrange by the existing stretch rule (`stretch` 2.1 >
  1.2, no pulse) and spun by the existing spin rule — no interpreter
  changes needed.
- All 8 arrivals land as gust rings (gravity 2.4, sway 1.6, additive):
  impact treatment is unchanged, only the ring sizes/shoves scale with
  tier (`hurricane_spiral` 1.9/-0.65 down to `gust` 0.9/-0.35).
- Instant/fast-forward and point-blank compressed replays are unaffected:
  rows use the standard `wind`/`shots`/`arrival` schema, no beat-tuning
  outside `PLAYBACK_BEATS` (none added).
- No sim, save, audio, or other-element changes; element hues untouched.

## Deviations

- `apps/client/src/move-fx/looks.ts` — added `"streak"` geometry and
  `"streaks"` trail families; `SHOT_LOOKS.wind` now uses them instead of
  the shared `teardrop`/`seeds`. Required by FR-4 ("in fallback or any
  of its 8 rows"); the brief's touch map did not list it, but the
  FR-4 audit named this exact sharing. Smallest change: 4 lines.
- `apps/client/src/fx/shot-geometry.ts` — added the `streak` core branch
  (stretched octahedron needle) and the `streaks` trail branch (baked
  z-stretched octahedron slivers) plus doc lines. Chose inline branches
  over a new file: the module header states the shot identity lives in
  one auditable place, and the addition is ~20 lines (well under caps).
- `apps/client/src/move-fx.test.ts` — beyond the brief's guard-trim
  line: updated the wind look pin (`teardrop`/`seeds` → `streak`/`streaks`,
  gate-required) and added builder-level FR-4 + determinism tests next
  to the boulder/dust ones (the brief's "natural home" for the
  no-shared-parts assertion).
- Brief touch-map path `apps/client/src/move-fx/moves/move-fx.test.ts`
  does not exist; the file is `apps/client/src/move-fx.test.ts`.
- `moves.ts` registry comment (lines ~87–101) still names `zephyr_veil`
  as default-body — left untouched per touch map (same staleness
  precedent as Phase 6's `basalt_guard`); flagging for a docs pass.

## Notes

- No unauthored specials remain after this phase (48/48 bespoke), so the
  `fallback.test.ts` spot test became a closure pin and the
  `move-fx.test.ts` guard line was dropped (no unauthored guard exists to
  move it to). `DEFAULT_FX` still serves unknown ids and element-less
  lookups.
- Suggested lab setup for evidence (mirror Phase 6): attacker Storm Hound
  (`storm_hound`), defender to be chosen, far range, 1×, seeded,
  explicit desktop + phone viewports, travel + impact per move.
- `cyclone_dive` deliberately keeps 3 lanes (legacy pin) and no charge:
  it reads as a sweeping plunge, stepped down from `hurricane_spiral` on
  every axis (wind 0.58 < 0.64, 1 streak vs 3, ring 1.7 < 1.9, shove
  -0.45 vs -0.65).
