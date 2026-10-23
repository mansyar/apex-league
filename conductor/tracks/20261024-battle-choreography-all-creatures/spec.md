# Battle Choreography for All Creatures — Specification (DRAFT)

## Overview

Give every arena archetype its own authored battle body language. Today the
body-language table in `apps/client/src/choreo.ts` carries three profiles
(`draconic`, `bovine`, `axolotl`), authored on 2026-10-12 for the launch
species. The archetype registry has six: `storm_hound` (Oct 17), `falcon` and
`tortoise` (Oct 23) silently animate through `DEFAULT_PROFILE` — a tortoise
walks with a falcon's bounce. Two of the three layers that make a body feel
authored are also missing: no archetype has an attack character, and the two
newest elements throw generic white orbs.

This track authors all three layers for all six archetypes: body language
(gait, lean, sway, breath, hurt, stagger), an attack character (windup,
recoil, strike), and per-element shot identity for Earth and Wind. It also
seeds the one non-deterministic visual input on the battle stage.

## Problem / Motivation

**Three of six archetypes have no authored motion identity.** `profileFor()`
falls back to `NEUTRAL` for any id not in the table, so `storm_hound`,
`falcon`, and `tortoise` all walk, breathe, sway, flinch, and reel exactly the
same way. The newest species — the ones a player meets after a Gold or Legend
cup — are the least authored creatures in the league. That is backwards.

**Attacks have no body language at all.** The Oct-12 animation overhaul
(`conductor/archive/battle_animation_overhaul_20261012`, FR5) delivered
per-archetype *idle* body language and per-*move* windup/recoil postures, but
never the per-archetype *attack* body. Every creature's basic strike commits
with the same constants; `applyPosture()` applies a move's posture with no
knowledge of whose body is performing it.

**Earth and Wind have no shot identity.** `SHOT_LOOKS` covers fire, water, and
plant; `lookFor()` hands everything else the shared fallback (a plain orb with
orb trails). The two creatures shipped yesterday therefore fire anonymous
white orbs while the three launch species fire embers, droplets, and seed
clusters.

**One visual input is non-deterministic.** `steps/fire.ts:50` uses
`Math.random()` for the contact jitter — the only unseeded input on the battle
stage. The fight's outcome is already deterministic; its pixels are not.

Who feels it: every player watching a battle. The gap is largest for the
newest content.

## Goals & Success Metrics

1. All six registered archetypes resolve to an authored, frozen `BodyProfile`
   (test-pinned; unknown ids still resolve to `DEFAULT_PROFILE`).
2. Every archetype has an authored attack character — windup, recoil, and
   basic-strike amplitudes are profile-weighted, with timing untouched.
3. All six elements have a distinct `SHOT_LOOKS` entry; Earth and Wind never
   fall back to the generic orb.
4. The visual stage is replay-identical: zero `Math.random()` calls in
   `apps/client/src/steps/`.
5. `bun run verify` green, the determinism gate byte-identical, and every
   client module under its 12,288 B cap (including the `move-fx.ts` split).

## Scope

### In

1. `apps/client/src/choreo.ts`: three authored profiles (`storm_hound`,
   `falcon`, `tortoise`) plus authored attack values for the three existing
   archetypes; `BodyProfile` gains `windupMult`, `recoilMult`, `strikeMult`
   (default 1 in `NEUTRAL`).
2. `apps/client/src/steps/pure.ts` (`applyPosture`) and
   `apps/client/src/steps/melee.ts`: read the actor's profile and weight
   windup/recoil/strike amplitudes (no timing change).
3. Splitting `apps/client/src/move-fx.ts` (10,999 B of a 12,288 B cap) into a
   barrel plus `move-fx/looks.ts` (`ShotLook`, `SHOT_LOOKS`, `lookFor`) and
   `move-fx/moves.ts` (`MoveFx`, `MOVE_FX`, `DEFAULT_FX`, `fxFor`), with every
   existing import path and exported name preserved.
4. `SHOT_LOOKS` rows for `earth` and `wind`, plus one new geometry family
   (`boulder`) and one new trail family (`dust`) in `fx/shot-geometry.ts`.
5. Bespoke `MOVE_FX` entries for the two heavy finishers `quake_stomp` (Earth)
   and `cyclone_dive` (Wind).
6. Seeded contact jitter: `steps/fire.ts` swaps `Math.random()` for a pure,
   step-seeded helper.
7. New co-located tests for each layer (`choreo.test.ts` extended,
   `move-fx.test.ts` new, jitter helper test).

### Out

- Any change to battle resolution, damage, accuracy, cooldowns, or the
  `PlaybackStep` contract.
- Any timing change: `CONTACT_T`, `PLAYBACK_PHASES`, `PROJECTILE_LIFE_MS`,
  `PROJECTILE_ARC`, and the `slide`/`dash` reaction values stay exactly as
  they are (movement must agree with the sim's far/near semantics).
- Stage-scaled animation (baby vs champion) — deferred; one profile per
  archetype for now.
- Ranch-scene adoption of the profiles — the ranch keeps its current
  animation; `choreo.ts`'s own docstring already anticipates adoption later.
- Bespoke choreography for `basalt_guard` and `zephyr_veil` — they keep the
  shared default body plus their element look.
- New voxel archetypes, new species, new moves, camera-direction work, and
  any HUD change.
- A new runtime or dev dependency.

## Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Every registered voxel archetype (six: `draconic`, `bovine`, `axolotl`, `storm_hound`, `falcon`, `tortoise`) has an authored `BodyProfile` in `apps/client/src/choreo.ts`, keyed by archetype id; an unknown id still resolves to `DEFAULT_PROFILE`. | must |
| FR-2 | `BodyProfile` gains `windupMult`, `recoilMult`, and `strikeMult`, defaulting to 1 in `NEUTRAL`; `applyPosture` weights windup and recoil amplitudes by the acting fighter's profile, and `steps/melee.ts` weights its basic-strike offsets and lean by `strikeMult`. Amplitudes only. | must |
| FR-3 | All six profiles are authored expressions covering gait, lean, sway, breath, hurt, stagger, windup, recoil, and strike; each profile is frozen at module load and every value sits inside the declared bands (multipliers 0.5–1.6, `swayAmp` 0.004–0.045) and no two profiles are equal. | must |
| FR-4 | `move-fx.ts` is split at its seam into a barrel plus `move-fx/looks.ts` and `move-fx/moves.ts`; every existing import path and exported name is unchanged, and every resulting module is under the 12,288 B client cap. | must |
| FR-5 | `SHOT_LOOKS` covers all six elements. Earth fires a heavy, non-luminous lob built from a new `boulder` geometry family with a `dust` trail; Wind fires a stretched, high-spin, flat-arc streak. Neither element resolves to the fallback look. | must |
| FR-6 | `quake_stomp` and `cyclone_dive` carry bespoke `MOVE_FX` entries (windup posture, release beats, arrival treatment) in their element's grammar; `basalt_guard` and `zephyr_veil` deliberately carry none and render through the shared default plus their element look. | must |
| FR-7 | The contact jitter in `steps/fire.ts` is seeded from stable step fields (`tick`, `actorKey`/`actor`, `damage`) through a pure helper, so the same playback step always produces the same offset; no `Math.random()` remains anywhere under `apps/client/src/steps/`. | must |
| FR-8 | New and extended co-located tests pin: the six archetype ids and their freeze, the bands, pairwise distinctness, `NEUTRAL` defaults, per-archetype `reactionFor` weighting, the three attack knobs' effect on `applyPosture`/melee amplitudes, all-six-element look coverage with no fallback for known elements, every `MOVE_FX` key resolving in the sim's move catalog, and the jitter helper's determinism and bounds. | must |

## Non-Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| NFR-1 | No change to gameplay or its timing: `bun run verify` green, `CONTACT_T` 0.46 and every `PLAYBACK_PHASES` value byte-unchanged (test-pinned), and the determinism gate reports the same 18 creature GLBs and 5 prop digests byte-identical. | must |
| NFR-2 | Module caps hold: every touched `apps/client/src` module ≤ 12,288 B, with `move-fx.ts` split rather than grown; co-located `*.test.ts` files are exempt. | must |
| NFR-3 | No new runtime or dev dependency; no `any`, no `@ts-ignore`; named exports only; `biome check` clean; explicit return types on exported functions. | must |
| NFR-4 | `choreo.ts` and `move-fx/**` stay pure data + pure functions — no `THREE` or DOM imports in the profile/look tables (the shot *builders* may keep using THREE where they already do), and unknown ids/kinds keep their neutral fallbacks. | must |
| NFR-5 | Reduced motion still wins: the instant-dump playback path is unchanged, every new impulse still flows through `impulse()` so its 0.4 damping applies, and idle terms still zero out through `life = 0`. | must |
| NFR-6 | The battle stage becomes fully deterministic: identical playback script ⇒ identical jitter, no unseeded randomness in `steps/`. | must |

## Acceptance Criteria

| ID | Criterion | Verifies |
|---|---|---|
| AC-1 | A test asserts all six registered archetype ids resolve to a non-default, frozen profile, and that an unknown id still resolves to `DEFAULT_PROFILE`. | FR-1 |
| AC-2 | Tests assert `NEUTRAL`'s three new knobs are 1; a synthetic profile with `windupMult` 1.5 produces exactly 1.5× windup amplitude with unchanged phase fractions, and `strikeMult` scales the melee strike offsets proportionally. | FR-2 |
| AC-3 | A test asserts the six profiles are pairwise distinct (each pair differs in at least two knobs), every value inside its band, and the table frozen. | FR-3 |
| AC-4 | The client module-size guard passes with `move-fx.ts` under 12,288 B; an export-surface diff of the split against the pre-track module shows zero added and zero removed names; the full suite is green. | FR-4 |
| AC-5 | A test asserts `SHOT_LOOKS` covers all six elements, `lookFor("earth")` and `lookFor("wind")` return their own looks (never the fallback), and the `boulder`/`dust` builders produce non-empty geometry. | FR-5 |
| AC-6 | A test asserts `MOVE_FX` has entries for `quake_stomp` and `cyclone_dive`, that every `MOVE_FX` key exists in the sim's move catalog, and that `basalt_guard`/`zephyr_veil` resolve to the default body. | FR-6 |
| AC-7 | A test asserts the jitter helper is deterministic (same step ⇒ same offset) and bounded (within ±0.15); evidence records that a search for `Math.random()` under `apps/client/src/steps/` finds nothing. | FR-7 |
| AC-8 | All new and extended tests pass; `bun run verify` and `bun run build` exit 0; `biome check` clean; typecheck clean in all three workspaces. | FR-8 |
| AC-9 | Visual pass: each of the six archetypes shows a distinct body at idle, windup, contact, and stagger on desktop (1440×900) and iPhone 15 (393×852) with a clean console, plus one montage clip covering all six; reduced-motion sanity confirmed. | FR-1..FR-7 |
| AC-10 | The determinism gate reports the same 18 GLBs and 5 prop digests byte-identical; timing constants are test-pinned to their pre-track values. | NFR-1 |

## Edge Cases

- **Stage uniformity.** Baby, juvenile, and champion forms of an archetype
  share one profile — a champion tortoise does not feel weightier than a baby
  one this track. Recorded as a follow-up, not a defect.
- **Mirror matches.** Both sides of a same-archetype duel share one frozen
  profile object; nothing may mutate it (freeze is tested).
- **Unknown archetypes.** A future archetype added to the registry without a
  profile must keep rendering (neutral fallback), never throw.
- **Footprint normalization.** `roster.ts` normalizes every holder to
  `ARENA_FOOTPRINT` 1.7 before the profile applies, so profile numbers must
  express personality, not compensate for silhouette scale.
- **Timing desync risk.** Reaction `slide`/`dash` stay global on purpose: a
  profile that made a creature slide further would desync the visual from the
  sim's far/near state. Amplitudes may vary; distances may not.
- **Reduced motion.** A body profile amplifies impulses, but `impulse()`
  damps by 0.4 under the pref and the driver zeroes idle terms — profiles must
  not bypass either path.
- **Earth geometry determinism.** The `boulder` core is built from fixed
  geometry and materials (no randomness at build time), so two identical shots
  are identical meshes.
- **Split pressure.** If `move-fx/moves.ts` lands near the cap (it inherits
  most of today's 10,999 B), split further by element along the same seam
  rather than loosening the guard.
- **Media tooling absence.** The montage GIF needs a local `ffmpeg`; if it is
  unavailable the visual evidence falls back to screenshots with a recorded
  note. Media is never a gate.
- **Branch tint.** `applyBranchTint` keeps working unchanged; profile authoring
  must not touch material colors.

## Dependencies

- **Tracks:** none. The archetypes, species, and the God-orbs-become-elemental
  gap all ship in `main` today.
- **External:** none. Playwright already exists as a dev dependency of
  `packages/voxel` for the visual layer; `ffmpeg` is a local capture tool, not
  a repo dependency.

## Open Questions & Assumptions

- **Profile numbers are starting points.** The specification's bands, not the
  exact table values, are the contract; the visual pass may tune any value
  inside its band and must record the final table in the phase evidence.
- **Existing three profiles.** Their body values stay as shipped; they gain
  attack values in the same grammar. If the visual pass finds a genuine
  defect, the change and its reason are recorded (before → after).
- **`move-fx` split shape.** `looks.ts` + `moves.ts` mirrors the house barrel
  pattern (`cup.ts`, `save/migrations/`). If sizes demand, `moves.ts` splits
  further by element.
- **Earth/Wind look shapes.** Earth = new `boulder` geometry + `dust` trail,
  no glow, lobbing arc. Wind = existing teardrop core at high stretch, high
  spin, low arc, faceted trail. If the visual pass shows Wind reading as a
  recoloured fire ember, a dedicated trail family is the fallback inside the
  same phase.
- **Montage clip.** One clip, six archetypes, a few seconds, ≤ 10 fps GIF,
  under `.conductor/media/` (never committed), built with the local `ffmpeg`.
- **Stage scaling and ranch adoption** are explicitly deferred to follow-ups.

## References

- `apps/client/src/choreo.ts` — the profile library and reaction library.
- `apps/client/src/move-fx.ts`, `apps/client/src/fx/shot-geometry.ts` — shot
  looks, move grammar, geometry builders.
- `apps/client/src/steps/{pure,melee,fire}.ts`, `fighter-driver.ts`,
  `roster.ts` — the consumers.
- `conductor/archive/battle_animation_overhaul_20261012` — the FR5 origin of
  the profile layer and the per-move posture grammar.
- `conductor/archive/move_pool_20261018` — the "every element's heavy finisher
  earns a MOVE_FX entry" precedent.
- `conductor/archive/20261023-earth-wind-species-line` — the two archetypes
  and elements this track completes.
- `conductor/product-guidelines.md` — motion and accessibility rules.
- `conductor/workflow.md` — verification layers, caps, commit policy.
