# Phase 6 — Earth identity (7 new + 1 upgrade)

- Track: `20261028-elemental-identity`, Phase 6
- Date: 2026-10-28
- Branch: `feat/20261028-elemental-identity` (base `9c5a1a1e` per brief)
- Result: **blocked** — implementation (P6.T1/T2) and test pins (P6.T3) are
  written, but the subagent shell is permission-denied in this environment:
  no task commits could be made and `bun run verify && bun run build` could
  not be executed. Primary to run the gate, commit, and capture lab evidence
  on handoff.

## Tasks

- [x] **P6.T1: New rows** in `apps/client/src/move-fx/moves/earth.ts`, in
  sim-catalog order — `pebble_shot` (P6 chip: one small fast pebble, no
  charge), `dust_devil` (P8 swirl: three simultaneous dust streaks on one
  beat, wide sweep recoil), `clay_burst` (P10 workhorse: one midweight slab,
  held coil), `boulder_toss` (P12 heavy high arc: one massive slow slab plus
  charge), `sand_blast` (P7 cone via `coneBody`: one wide fan, 3-lane ring
  arrival), `tectonic_slam` (P14 finisher via `eruptionBody`: longest coil,
  charge, colossal slab, 18-puff ring — the one row allowed flashGrow 3.4),
  `basalt_guard` (P9 guard via `barrierBody`: foe-targeted eruption, no
  shots, shove 0). All rows in weight-and-dust grammar: gravity 12,
  `flash: false` + `"#9c8f7d"` tint on every muzzle/arrival burst,
  `ring: true` arrivals, deep coils with negative rise, every shot
  `life` ≥ 620ms per the Phase 4 capture lesson. Covers FR-2.
  → `apps/client/src/move-fx/moves/earth.ts` (~9 KB — under the 12 KB cap)
- [x] **P6.T2: Upgrade `quake_stomp`** (P12) to verb + identity grammar via
  `eruptionBody("earth")` (deep coil, charge phase, dust-tinted ring,
  flashGrow 3.2, shove −0.6) — a step down from the `tectonic_slam`
  finisher on every axis (shot 2.0 vs 2.4, 16 vs 18 puffs, wind 0.58 vs
  0.62). Covers FR-2, FR-5.
  → `apps/client/src/move-fx/moves/earth.ts` (same file)
- [x] **P6.T3: Test pins** — `fallback.test.ts` extended: unauthored-spot
  list drops `pebble_shot`/`basalt_guard` (now bespoke; wind spots remain);
  the no-element `DEFAULT_FX` assertion moves from `basalt_guard` (now
  bespoke) to `zephyr_veil`; new AC-1 pin (all 8 resolve bespoke, none the
  earth fallback) and AC-3 verb pins (`basalt_guard`: 0 shots / shove 0 /
  ring; `sand_blast`: 3 lanes + ring; `tectonic_slam` + `quake_stomp`:
  charge defined, coilX ≥ 0.28, ring, shove ≤ −0.55; `boulder_toss`: charge
  + 1 shot; `dust_devil`: 3 shots on one shared beat; `pebble_shot`: 1
  shot, no charge; `clay_burst`: 1 shot, kick ≤ −0.5). All pins use dot
  access (`MOVE_FX.pebble_shot`, pairs table with `as const` for the AC-1
  loop — no brackets) with throw-narrowing, no `!`/`as`. Covers AC-1, AC-3.
  → `apps/client/src/move-fx/moves/fallback.test.ts`
- [ ] **Primary on handoff:** run `bun run verify && bun run build`, commit
  per task (P6.T1 rows, P6.T2 quake upgrade, P6.T3 pins), capture P6.T3 lab
  screenshots (attacker Basalt Tortoise `tortoise` vs Storm Hound
  `storm_hound`, far, 1×, seeded; explicit `setViewportSize` 1280×800
  desktop / 390×844 phone).

## Verification

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static+unit+determinism | `bun run verify` | not run | subagent shell denied — primary to run on handoff |
| build | `bun run build` | not run | subagent shell denied — primary to run on handoff |
| visual (lab) | primary to capture | pending | 8 earth moves × travel/impact × desktop/phone per brief |

No commits were made (shell denied — `git` unavailable to this subagent).
No verification output exists to attach.

## Travel/impact separation notes (Phase 4 vine_lash lesson)

- `pebble_shot` vs `dust_devil` vs `sand_blast` at the travel anchor: 1
  small snap vs 3 simultaneous streaks vs 1 wide fan — distinct counts and
  spreads. At impact: 6-puff modest ring vs 8-puff quick ring vs 10-puff
  3-lane ring.
- `quake_stomp` vs `tectonic_slam`: both eruptions, separated by tier on
  every axis (wind 0.58/0.62, shot 2.0/2.4, puffs 16/18, flashGrow 3.2/3.4,
  shove −0.6/−0.65).

## Deviations

None — all changes inside the brief's Touch map
(`moves/earth.ts`, `moves/fallback.test.ts`, this report). No registry
changes needed (earth file already wired into `MOVE_FX`).

## Notes

- `coneBody("earth")` shots already carry `life: 700` and `barrierBody`
  already carries `shots: []` / `charge` / shove 0, so `sand_blast` and
  `basalt_guard` only override muzzle/pose/arrival into dust grammar.
- `eruptionBody("earth")` contributes ring + 16-puff/1.7-size floor and the
  ≥0.28 coil; both eruption rows override upward from there.
- Earth is the first element whose guard is foe-targeted-barrier shaped
  with an explicitly non-luminous ring (`flash: false` on the guard
  arrival, matching `ion_wall`'s rule shape but in dust grammar).
