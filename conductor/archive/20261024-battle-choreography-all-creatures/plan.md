# Implementation Plan: Battle Choreography for All Creatures

**Track:** `20261024-battle-choreography-all-creatures`
**Branch:** `feat/20261024-battle-choreography-all-creatures`
**Base:** `main` @ `4d6346b`

Phase states: `pending` → `in_progress` → `verified` (also `failed`, `blocked`).
Only the primary agent writes this file.

## Constraints that apply to every phase

- **Client cap is 12,288 B per module.** `move-fx.ts` starts at 10,999 B, so it is
  split before it grows. Co-located `*.test.ts` files are exempt. `choreo.ts`
  starts at 5,811 B.
- **No timing change, ever.** `CONTACT_T` (0.46), `PROJECTILE_LIFE_MS`,
  `PROJECTILE_ARC`, every `PLAYBACK_PHASES` value, and the reaction `slide`/
  `dash` numbers stay byte-identical. This track changes amplitudes only — the
  visual must never drift from the sim's resolution.
- **No sim change.** `packages/sim` and `packages/voxel` are read-only this
  track; no save-schema change (`SAVE_VERSION` stays 25).
- **Purity.** `choreo.ts` and the `move-fx` tables stay pure data + pure
  functions (no DOM; `THREE` only where it already lives — `move-fx/looks.ts`
  and the shot builders).
- **Reduced motion wins.** New impulses route through `impulse()`; nothing may
  bypass the 0.4 damping or the instant-dump playback path.
- **No new dependency**, no `any`, no `@ts-ignore`, named exports, explicit
  return types on exported functions, `biome check` clean.
- **Determinism layer applies**: `bun run gate:determinism` must stay
  byte-identical (18 GLBs + 5 props). It runs inside `bun run verify`.
- **Visual layer applies** (this track is player-visible): a spot capture at
  Phases 1 and 2 acceptance, the full matrix at Phase 4.
- `verify_phase` (`bun run verify && bun run build`) runs at every phase
  acceptance in addition to the phase's own Verification command.
- Global NFR coverage: NFR-2 (caps) is proven per phase by the client guard;
  NFR-3/4 per phase by `bun run check` + `biome check` + the purity check;
  NFR-1/5/6 by each phase's command plus the determinism gate at acceptance.
- **Workspace scope:** `apps/client` only (plus the track's evidence files).

---

## Phase 1: Body Language — Six Profiles and the Attack Character

**Goal:** `choreo.ts` carries authored, frozen profiles for all six archetypes
with three attack-character knobs; windup, recoil, and basic-strike amplitudes
are profile-weighted; `NEUTRAL` still reproduces today's behavior exactly.

**Depends on:** none.

**Covers:** FR-1, FR-2, FR-3, NFR-2, NFR-4, AC-1, AC-2, AC-3.

**Touches:**
- `apps/client/src/choreo.ts`
- `apps/client/src/choreo.test.ts`
- `apps/client/src/steps/pure.ts`
- `apps/client/src/steps/melee.ts`
- `apps/client/src/steps/pure.test.ts`

**Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/choreo.test.ts apps/client/src/steps && bun run check && biome check`

**Status:** verified
**Result:** verified
**Checkpoint:** 87232a5
**Evidence:** conductor/tracks/20261024-battle-choreography-all-creatures/verification/phase-1.md

- [x] **P1.T1: Extend the profile contract with the attack character** — covers: FR-2
  - [x] **P1.T1.1: Add the three knobs** — `windupMult`, `recoilMult`, `strikeMult` on `BodyProfile`, each documented as an amplitude multiplier; `NEUTRAL` sets all three to 1 so nothing changes until a profile authors them.
  - [x] **P1.T1.2: Weight the posture curves** — `applyPosture` multiplies windup amplitudes (`pitch`, `roll`, `rise`, `coilX`) by `ao.profile.windupMult` and recoil amplitudes (`pitchOut`, `sweepX`, `riseOut`) by `ao.profile.recoilMult`, leaving the phase fractions (`half`/`full` sines) untouched. Signature stays unchanged: `DriveFighter` already carries `profile`.
  - [x] **P1.T1.3: Weight the melee strike body** — `steps/melee.ts` multiplies its commit offsets, leans, and settle impulse by `ao.profile.strikeMult` (and the victim-side reaction stays exactly as it is — `contactReaction` already reads the *victim's* profile).
  - [x] **P1.T1.4: Prove the multiplier math** — tests: `NEUTRAL`'s three knobs are 1; a synthetic profile with `windupMult: 1.5` yields exactly 1.5× windup amplitude with identical phase fractions; `recoilMult` does the same on the recoil curve; `strikeMult` scales the melee offsets proportionally.
- [x] **P1.T2: Author all six identities** — covers: FR-1, FR-3
  - [x] **P1.T2.1: Author the three missing bodies** — `storm_hound` (wired, restless), `falcon` (light, airborne, precise), `tortoise` (ponderous, immovable) keyed by archetype id, inside the spec's bands (multipliers 0.5–1.6, `swayAmp` 0.004–0.045). Use the spec's table as the starting point.
  - [x] **P1.T2.2: Give the launched trio its attack character** — `draconic`, `bovine`, `axolotl` gain the three attack knobs in the same grammar; their existing body values stay byte-identical (a change needs a recorded defect and a before → after note).
  - [x] **P1.T2.3: Freeze and table-test the library** — extend `choreo.test.ts`: all six ids present and frozen, every value inside its band, no two profiles equal (each pair differs in at least two knobs), unknown id still resolves to `DEFAULT_PROFILE`, and `reactionFor` still composes per archetype (`stagger` weighted by `staggerMult`, `glance`/`down` by `hurtMult`, `dodge` by neither).
- [x] **P1.T3: Prove size and purity** — covers: NFR-2, NFR-4
  - [x] **P1.T3.1: Record the sizes** — `choreo.ts`, `steps/pure.ts`, and `steps/melee.ts` byte sizes in the evidence; all under 12,288 B.
  - [x] **P1.T3.2: Prove the tables stay pure** — evidence record that `choreo.ts` imports nothing from `three` and touches no DOM, and that the profile table is frozen at module load.
  - [x] **P1.T3.3: Spot visual** — one desktop spar with `falcon` and one with `tortoise` via `playwright-cli`; screenshots at idle and contact into `.conductor/evidence/`; console clean. Record the observation (not a tuning pass — that is Phase 4).

---

## Phase 2: The move-fx Split and the Earth/Wind Identity

**Goal:** `move-fx.ts` is split at its seam with an unchanged export surface, and
Earth and Wind fire their own shots with bespoke heavy finishers.

**Depends on:** none (independent of Phase 1; sequenced after it).

**Covers:** FR-4, FR-5, FR-6, NFR-2, NFR-4, AC-4, AC-5, AC-6.

**Touches:**
- `apps/client/src/move-fx.ts`
- `apps/client/src/move-fx/**`
- `apps/client/src/move-fx.test.ts`
- `apps/client/src/fx/shot-geometry.ts`

**Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/move-fx.test.ts apps/client/src/fx && bun run check && biome check`

**Status:** verified
**Result:** verified
**Checkpoint:** 563f195
**Evidence:** conductor/tracks/20261024-battle-choreography-all-creatures/verification/phase-2.md

- [x] **P2.T1: Split move-fx at its seam** — covers: FR-4
  - [x] **P2.T1.1: Move the two halves** — `move-fx/looks.ts` takes `ShotLook`, `SHOT_LOOKS`, `lookFor`, `elementColor`, `ELEMENT_COLOR_FALLBACK`, `PROJECTILE_LIFE_MS`, `PROJECTILE_ARC`; `move-fx/moves.ts` takes `Posture`, `ShotSpec`, `MoveFx`, `MOVE_FX`, `DEFAULT_FX`, `fxFor`, `CONTACT_T`. `move-fx.ts` becomes the barrel re-exporting both, in the house style of `cup.ts` (header comment naming the submodules and why).
  - [x] **P2.T1.2: Prove the surface** — capture the module's exported names from the base commit and from the barrel; the diff must be empty (0 added, 0 removed). Every importer still resolves; `bun run build` green proves the Vite side.
  - [x] **P2.T1.3: Prove the sizes** — every resulting file under 12,288 B; record the sizes. If `move-fx/moves.ts` lands above ~9.5 KB, split it further by element along the same seam rather than growing it.
- [x] **P2.T2: Earth and Wind shot identity** — covers: FR-5
  - [x] **P2.T2.1: Add the geometry** — a `boulder` core in `fx/shot-geometry.ts` (flat, heavy, non-luminous, deterministic geometry — no randomness at build time) and a `dust` trail family (small flat facets) alongside the existing ember/seed/sphere trails.
  - [x] **P2.T2.2: Author the two looks** — `earth`: `boulder` core, no glow, slow spin, lobbing arc, `dust` trail. `wind`: stretched teardrop core, high spin, wobble for a streak, flat arc, faceted trail. Both distinct from each other and from the fallback.
  - [x] **P2.T2.3: Test the look table** — new `move-fx.test.ts`: all six sim elements have a look; `lookFor` never returns the fallback for a known element; `boulder`/`dust` builders return non-empty geometry; `elementColor` matches `ui/element.ts`'s hue for each element.
- [x] **P2.T3: Finishers with a body** — covers: FR-6
  - [x] **P2.T3.1: `quake_stomp`** — Earth heavy finisher: long coil, ground-slam release, arrival as a ring burst with a high gravity and a dust tint (non-emissive), heavy shove.
  - [x] **P2.T3.2: `cyclone_dive`** — Wind heavy finisher: rising windup, dive release, arrival as a swept burst with lateral lanes, light shove.
  - [x] **P2.T3.3: Test the move table** — every `MOVE_FX` key resolves in `CATALOG`; both new finishers present; `basalt_guard` and `zephyr_veil` resolve to the default body with their element look (deliberately unauthored).
  - [x] **P2.T3.4: Spot visual** — one Earth spar and one Wind spar at desktop: confirm the lob and the streak read distinctly and neither is the white orb; screenshots into `.conductor/evidence/`; console clean.

---

## Phase 3: The Deterministic Stage

**Goal:** the battle stage has no unseeded randomness, and its timing contract is
pinned by a test so future choreography cannot drift it.

**Depends on:** Phase 1 (both touch the contact-reaction path).

**Covers:** FR-7, NFR-1, NFR-6, AC-7, AC-10.

**Touches:**
- `apps/client/src/steps/fire.ts`
- `apps/client/src/steps/impact.ts`
- `apps/client/src/steps/melee.ts`
- `apps/client/src/steps/fire.test.ts`
- `apps/client/src/battle-timing.test.ts`

*Amended 2026-10-24 during execution: `impact.ts` and `melee.ts` hold the three
remaining `contactReaction` call sites. They were outside the original Touches,
which forced the seed to default to `0` there — so a repeated basic strike on the
same victim with the same damage landed at the identical lateral offset every
time (`contactJitter(undefined, "left", 4)` is `0.101` on every hit), where today
those hits vary. Each call site already has `step` in scope, so each threads
`step.tick` — one argument added, nothing else. That satisfies P3.T1.1's "derive a
seed from the step's stable fields (tick, actorKey/actor, damage)": every hit keeps
its variety and a replay still lands identically.*

**Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/steps apps/client/src/battle-timing.test.ts && bun run check && biome check`

**Result:** verified
**Checkpoint:** 87121d0
**Evidence:** conductor/tracks/20261024-battle-choreography-all-creatures/verification/phase-3.md

**Status:** verified

- [x] **P3.T1: Seed the contact jitter** — covers: FR-7, NFR-6
  - [x] **P3.T1.1: Write the pure helper** — derive a seed from the step's stable fields (`tick`, `actorKey`/`actor`, `damage`) and return a bounded lateral offset (within ±0.15, today's range) using the existing seeded `jitter`/`hash` utilities in `anim.ts`. No new randomness source, no clock reads.
  - [x] **P3.T1.2: Wire it in** — `contactReaction` takes the step (or its seed inputs) and replaces `Math.random()`; nothing else in the reaction path changes.
  - [x] **P3.T1.3: Prove determinism** — tests: identical step ⇒ identical offset; different ticks ⇒ different offsets (no constant); every offset inside the bound; and an evidence record that a repository search for `Math.random` under `apps/client/src/steps/` finds nothing.
- [x] **P3.T2: Pin the timing contract** — covers: NFR-1, AC-10
  - [x] **P3.T2.1: Write the pin suite** — `battle-timing.test.ts` asserts the values the visual layer depends on: `CONTACT_T` 0.46, `PROJECTILE_LIFE_MS`, `PROJECTILE_ARC`, and every `PLAYBACK_PHASES` row imported from `@apex/sim`, so an accidental timing edit fails loudly instead of drifting the animation.
  - [x] **P3.T2.2: Pin the movement rule** — assert `reactionFor` returns the same `slide`/`dash` for every profile (movement stays global), which is the invariant the choreography comments promise.

---

## Phase 4: The Visual Matrix and the Full Gate

**Goal:** every archetype visibly reads as itself at idle, windup, contact, and
stagger on both viewports; the montage clip proves it in one glance; the whole
gate is green and byte-identical where it must be.

**Depends on:** Phase 1, Phase 2, Phase 3.

**Covers:** AC-8, AC-9, AC-10, NFR-1, NFR-2, NFR-3, NFR-5.

**Touches:**
- `apps/client/src/choreo.ts` (in-band tuning only)
- `apps/client/src/move-fx/**` (in-band tuning only)
- `apps/client/src/fx/shot-geometry.ts` (builders only)
- the track's evidence and media directories

**Verification:** `bun run verify && bun run build` (plus the visual layer via
`playwright-cli` against `bun run dev`).

**Result:** verified
**Checkpoint:** 28c3fa3
**Evidence:** conductor/tracks/20261024-battle-choreography-all-creatures/verification/phase-4.md
**Status:** verified

- [x] **P4.T1: Tune inside the bands** — covers: FR-3, AC-9
  - [x] **P4.T1.1: Per-archetype spars** — drive a spar per archetype, capture the four moments, and tune any value that reads wrong (a tortoise that bounces, a falcon that stomps) strictly inside its band.
  - [x] **P4.T1.2: Record the final table** — the evidence carries the final twelve-knob table for all six archetypes plus a note per change from the spec's starting values.
- [x] **P4.T2: The visual matrix** — covers: AC-9
  - [x] **P4.T2.1: Capture** — six archetypes × {idle, windup, contact, stagger} × {desktop 1440×900, iPhone 15 393×852}, console asserted clean on both viewports.
  - [x] **P4.T2.2: Reduced-motion sanity** — with the pref on, playback still dumps instantly, impulses are damped, and the idle terms zero out; one screenshot pair as evidence.
  - [x] **P4.T2.3: The montage clip** — record the six spars, cut one short clip, convert to a ≤ 10 fps GIF with the local `ffmpeg`, keep it under `.conductor/media/` (never committed). If `ffmpeg` is unavailable, record the fallback in the evidence and ship screenshots only.
- [x] **P4.T3: The full gate** — covers: AC-8, AC-10, NFR-1
  - [x] **P4.T3.1: Run the gate** — `bun run verify && bun run build`, with the determinism gate reporting the same 18 GLBs and 5 props byte-identical.
  - [x] **P4.T3.2: Prove the caps** — the client module-size guard green, and every touched module's size recorded.
  - [x] **P4.T3.3: Re-run the spot checks** — `bun run test:phase` green with the final tuned values (counts unchanged from the pre-tuning run).

---

## Primary follow-up (not a phase task)

Before Phase 1 launches, the phase and reviewer agent allowlists must gain the
tiered test commands this track's phases use —
`bun test --check --parallel=4 --timeout 120000` (with its `*` argument form)
and `bun run test:phase`. They were authored before the test-suite-speedup
track introduced `test:phase`, so without this the phase subagent cannot run
its own Verification command and would report `blocked`. Same class of fix as
the `playwright-cli` addition; record the change in the Phase 1 evidence note.

<!--
After a phase is accepted, the primary appends:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261024-battle-choreography-all-creatures/verification/phase-<n>.md
under that phase's Status line, and marks every task and sub-task [x].
-->

## Phase R1: Review Fixes

- **Goal:** Resolve review finding F1 — the wind look's authored `spin` never renders because the projectile interpreter's per-frame `lookAt()` overwrites the quaternion.
- **Depends on:** Phase 4
- **Covers:** F1
- **Touches:** `apps/client/src/fx/projectiles.ts`, `apps/client/src/fx/projectiles.test.ts` (new, or the project co-located home for an interpreter-level test)
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/fx && bun run check && biome check`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 194d073
- **Evidence:** conductor/tracks/20261024-battle-choreography-all-creatures/verification/phase-R1.md
- [x] **R1.T1: Make wind's spin real** — covers: F1
  - [x] **R1.T1.1: Orient once at spawn** — in `fx/projectiles.ts`, the flight direction (from→to) is fixed per shot, so apply the face-downrange orientation once in `spawn()` after core assembly when `(look.stretch ?? 1) > 1.2`, and drop the per-frame `else if ((p.look.stretch ?? 1) > 1.2)` branch in `projectileStep` (lines ~99-106) so `rotation.z`/`rotation.x` from the spin branch (lines ~91-95) can accumulate over the spawn-time orientation. Water (pulse branch) and earth (no stretch) must render byte-identically to today.
  - [x] **R1.T1.2: Prove wind's spin renders** — add an interpreter-level test asserting the wind core's mesh orientation actually changes across two `projectileStep` ticks (the reviewer's identified test gap: the table-row pin alone let this dead value pass green).
  - [x] **R1.T1.3: Preserve the others** — a test or recorded evidence shows water (pulse) and earth (spin, no stretch) still behave as before the change.
