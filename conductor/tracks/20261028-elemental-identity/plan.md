# Elemental Identity Pass — Implementation Plan

> **Branch:** `feat/20261028-elemental-identity`
> **Base:** `main` @ `751443c7fab78dfb83410e71211c94e2b0394e49`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Identity foundation

- **Goal:** six authored per-element fallback bodies wired through the
  `MOVE_FX` lookup, plus shared verb-family choreography helpers — every move
  reads as its element even before its bespoke row lands.
- **Depends on:** none
- **Covers:** FR-1, FR-5, FR-6, NFR-1, NFR-4
- **Touches:** `apps/client/src/move-fx/looks.ts`,
  `apps/client/src/move-fx/moves/*.ts` (fallback table),
  `apps/client/src/fx/*.ts`, `apps/client/src/steps/*.ts` (only if lookup
  needs verb dispatch)
- **Verification:** `bun run verify && bun run build` + playwright fallback
  screenshots (one per element, desktop + phone, clean console)
- **Status:** verified

- [x] **P1.T1: Author 6 fallback bodies** — covers: FR-1
  - [x] **P1.T1.1: Fire, water, plant fallbacks** (rising flicker shards;
    heavy droplets + foam ring; seed cluster + petals)
  - [x] **P1.T1.2: Electric, earth, wind fallbacks** (arc-tendril halo + hot
    core; tumbling grit, non-luminous; stretched streaks + gust ring)
  - [x] **P1.T1.3: Element-typed floor-mark treatments** in the decal layer —
    covers: FR-6
- [x] **P1.T2: Verb-family helpers** — covers: FR-5
  - [x] **P1.T2.1: barrier, dash, eruption builders**
  - [x] **P1.T2.2: cone, volley-fan, beam builders**
- [x] **P1.T3: Lookup + fallback test** — covers: FR-1 (unknown moveId resolves
  to its element's fallback; instant mode unaffected)

**Result:** verified — `bun run verify` exit 0 (3425 pass / 0 fail,
determinism gate OK), `bun run build` exit 0, 12 fallback screenshots
(desktop + phone, clean console) in `verification/phase-1/`.
**Evidence:** conductor/tracks/20261028-elemental-identity/verification/phase-1.md

## Phase 1.5: Move Lab (deterministic visual rig)

- **Goal:** dev-only harness that drives the staging stack directly so any
  catalog move is triggerable on demand — no sim, no AI, no feed-timing
  races. All visual evidence from Phase 2 onward is captured in the lab.
- **Depends on:** Phase 1
- **Covers:** FR-8, NFR-6, AC-6
- **Touches:** `apps/client/src/movelab/*` (new, dev-only), `apps/client/src`
  boot composition (DEV-gated entry only)
- **Verification:** `bun run verify && bun run build` + lab opens via query
  param, triggers all 8 fire rows (incl. `spark`) with replay/slow-mo, clean
  console, production bundle contains no lab code
- **Status:** verified

- [x] **P1.5.T1: DEV-gated lab entry** — query-param mount (dynamic
  `import()` behind `import.meta.env.DEV`), ranch bypass, hint overlays
  suppressed — covers: FR-8, NFR-6
- [x] **P1.5.T2: Staging-direct driver** — attacker/defender species pickers,
  range toggle, move dropdown sourced from the real `fxFor` registry
  (fallbacks visible), trigger + replay via `applyStep`/`instant` — covers:
  FR-8
- [x] **P1.5.T3: Determinism controls** — slow-motion via `setPace`,
  pause/step, seeded particles (reuse `anim.ts` seeding), fixed camera
  presets, phone-width toggle — covers: FR-8
- [x] **P1.5.T4: Lab verification** — all 8 fire moves triggered on demand,
  clean console, prod-bundle exclusion check — covers: AC-6
- [x] **P1.5.T5: Barrier-target fidelity decision** — ring-on-foe confirmed
  production-faithful (sim targets opponent unconditionally); experiment
  reverted; spec edge case amended

**Result:** verified — `bun run verify` exit 0 (3440 pass), `bun run build`
exit 0, lab at `?movelab=1` triggers all 8 fire rows with replay/slow-mo,
clean console, lab split into its own prod chunk with no lab strings in the
main bundle.
**Evidence:** conductor/tracks/20261028-elemental-identity/verification/phase-1.5.md

## Phase 2: Fire (4 new + 4 upgrades)

- **Goal:** all 8 fire moves bespoke — `spark`, `flame_charge`, `flare_dart`,
  `pyre_wall` new; `cinder_shot`, `blaze_bolt`, `pyre_lance`, `cinder_dive`
  upgraded for verb consistency.
- **Depends on:** Phases 1, 1.5 (rows are written; visual evidence is
  captured in the Move Lab)
- **Covers:** FR-2, FR-5, AC-1 (fire), AC-3 (fire verbs)
- **Touches:** `apps/client/src/move-fx/moves/fire.ts`
- **Verification:** `bun run verify && bun run build` + 8 fire screenshots
  (Move Lab, desktop + phone, clean console)
- **Status:** verified

- [x] **P2.T1: New rows** (`spark` stinger, `flame_charge` dash, `flare_dart`
  fast bolt, `pyre_wall` barrier) — covers: FR-2
- [x] **P2.T2: Upgrade 4 existing rows** to verb + identity grammar — covers:
  FR-2, FR-5
- [x] **P2.T3: Fire visual evidence in Move Lab** — covers: AC-1, AC-3

**Result:** verified — `bun run verify` exit 0 (3427 pass / 0 fail),
`bun run build` exit 0, 32 Move-Lab frames (8 moves × travel/impact ×
desktop/device-phone, clean console) with per-move fire-identity reads.
**Evidence:** conductor/tracks/20261028-elemental-identity/verification/phase-2.md

## Phase 3: Water (4 new + 4 upgrades)

- **Goal:** all 8 water moves bespoke — `bubble`, `tide_shot`, `mist_spray`,
  `tide_aegis` new; `splash_bolt`, `maelstrom`, `foam_volley`, `riptide_rush`
  upgraded.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-5, AC-1 (water), AC-3 (water verbs)
- **Touches:** `apps/client/src/move-fx/moves/water.ts`
- **Verification:** `bun run verify && bun run build` + 8 water screenshots
  desktop + phone, clean console
- **Status:** in_progress

- [ ] **P3.T1: New rows** (`bubble` floaty orb, `tide_shot`, `mist_spray` cone,
  `tide_aegis` barrier) — covers: FR-2
- [ ] **P3.T2: Upgrade 4 existing rows** — covers: FR-2, FR-5
- [ ] **P3.T3: Water visual evidence** — covers: AC-1, AC-3

## Phase 4: Plant (4 new + 4 upgrades)

- **Goal:** all 8 plant moves bespoke — `seed_shot`, `thorn_volley`,
  `vine_lash`, `bramble_guard` new; `bramble_dart`, `spore_burst`,
  `root_quake`, `thorn_charge` upgraded.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-5, AC-1 (plant), AC-3 (plant verbs)
- **Touches:** `apps/client/src/move-fx/moves/plant.ts`
- **Verification:** `bun run verify && bun run build` + 8 plant screenshots
  desktop + phone, clean console
- **Status:** pending

- [ ] **P4.T1: New rows** (`seed_shot`, `thorn_volley` fan, `vine_lash` lash,
  `bramble_guard` barrier) — covers: FR-2
- [ ] **P4.T2: Upgrade 4 existing rows** — covers: FR-2, FR-5
- [ ] **P4.T3: Plant visual evidence** — covers: AC-1, AC-3

## Phase 5: Electric (8 new + `electric.ts`)

- **Goal:** electric identity lands — new `moves/electric.ts`, all 8 moves
  bespoke with arc-tendril grammar (`static_jolt`, `volt_dash`, `arc_shot`,
  `storm_bolt`, `ion_dart`, `gigavolt`, `storm_surge`, `ion_wall` barrier).
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-5, AC-1 (electric), AC-3 (electric verbs)
- **Touches:** `apps/client/src/move-fx/moves/electric.ts`,
  `apps/client/src/move-fx/moves.ts` (registry)
- **Verification:** `bun run verify && bun run build` + 8 electric screenshots
  desktop + phone, clean console
- **Status:** pending

- [ ] **P5.T1: Create `electric.ts`** with arc-tendril builders for all 8 rows
  — covers: FR-2, FR-3
- [ ] **P5.T2: Register + wire** (`ion_wall` self-targeted barrier path if
  needed) — covers: FR-3
- [ ] **P5.T3: Electric visual evidence** — covers: AC-1, AC-3

## Phase 6: Earth (7 new + 1 upgrade)

- **Goal:** all 8 earth moves bespoke — `pebble_shot`, `dust_devil`,
  `clay_burst`, `boulder_toss`, `sand_blast`, `tectonic_slam`, `basalt_guard`
  new; `quake_stomp` upgraded.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-5, AC-1 (earth), AC-3 (earth verbs)
- **Touches:** `apps/client/src/move-fx/moves/earth.ts`
- **Verification:** `bun run verify && bun run build` + 8 earth screenshots
  desktop + phone, clean console
- **Status:** pending

- [ ] **P6.T1: New rows** (incl. `tectonic_slam` eruption, `basalt_guard`
  barrier, `boulder_toss` heavy arc) — covers: FR-2
- [ ] **P6.T2: Upgrade `quake_stomp`** — covers: FR-2, FR-5
- [ ] **P6.T3: Earth visual evidence** — covers: AC-1, AC-3

## Phase 7: Wind (7 new + 1 upgrade, decoupled parts)

- **Goal:** all 8 wind moves bespoke with wind-only parts — `gust`,
  `feather_dart`, `gale_cutter`, `sky_bolt`, `talon_slash`,
  `hurricane_spiral`, `zephyr_veil` new; `cyclone_dive` upgraded.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-4, FR-5, AC-1 (wind), AC-3 (wind verbs)
- **Touches:** `apps/client/src/move-fx/moves/wind.ts`
- **Verification:** `bun run verify && bun run build` + 8 wind screenshots
  desktop + phone, clean console
- **Status:** pending

- [ ] **P7.T1: New rows** (incl. `zephyr_veil` barrier, `hurricane_spiral`
  vortex, `talon_slash` streak) — covers: FR-2
- [ ] **P7.T2: Upgrade `cyclone_dive` + purge shared water/plant parts** —
  covers: FR-2, FR-4
- [ ] **P7.T3: Wind visual evidence + no-shared-parts check** — covers: AC-1,
  AC-3

## Phase 8: Catalog, grayscale, acceptance

- **Goal:** full 48-move catalog (desktop + phone), grayscale
  element-readability check, integrated verification green.
- **Depends on:** Phases 1–7
- **Covers:** FR-7, AC-2, AC-4, AC-5
- **Touches:** `conductor/tracks/20261028-elemental-identity/verification/*`
  (evidence only; code only if a gap surfaces)
- **Verification:** `bun run verify && bun run build` + complete catalog +
  grayscale pass, clean console
- **Status:** pending

- [ ] **P8.T1: Assemble 48-move catalog in Move Lab** desktop + phone — covers: FR-7
- [ ] **P8.T2: Grayscale readability check** (one reference move per element,
  element named from shape/motion) — covers: AC-2
- [ ] **P8.T3: Acceptance sweep** (AC-1 lookup audit, AC-3 verb spot-checks,
  AC-5 caps/schema/deps) — covers: AC-1, AC-4, AC-5
- [ ] **P8.T4: Lab phone-toggle framing fix** — the in-page Phone-width toggle
  mis-frames the arena camera (empty strip); real phone viewports are fine.
  Make the toggle drive the same responsive path or remove it — covers: FR-8

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 8
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
