# Battle Choreography for All Creatures

## Summary

Every arena archetype now has its own authored body language — and its own attack character. When the league launched, `choreo.ts` carried three authored profiles (`draconic`, `bovine`, `axolotl`) while the registry grew to six: the storm hound, zephyr falcon, and basalt tortoise — the three newest species — animated through the neutral profile ("a tortoise walked with a falcon's bounce"). This track authors all three layers of battle choreography: per-archetype idle bodies (6/6), a per-archetype **attack** character (windup/recoil/strike amplitudes weighted by the actor's profile — a layer that never existed), and Earth/Wind shot identity (both elements fired generic white orbs). It also seeds the battle stage's one non-deterministic visual input and pins the timing contract so future choreography cannot drift it.

## Track

- **Track:** [20261024-battle-choreography-all-creatures](../../conductor/archive/20261024-battle-choreography-all-creatures/index.md) — spec, plan, metadata
- **Branch:** `feat/20261024-battle-choreography-all-creatures` · base `main` @ `4d6346b`
- **Registry:** [tracks.md](../../conductor/tracks.md)

## What happened

| Phase | Checkpoint | Delivered |
| --- | --- | --- |
| P1 — Body Language | `87232a5` | Six authored frozen `BodyProfile`s (bands 0.5–1.6, pairwise-distinct ≥2 knobs); three new attack knobs `windupMult`/`recoilMult`/`strikeMult` defaulting to 1 in NEUTRAL; `applyPosture` weights windup/recoil amplitudes, a new pure `strikePose` weights the melee strike body; 21 new tests |
| P2 — move-fx split + identity | `563f195` | 10,999 B `move-fx.ts` split into a barrel + `looks.ts` + `moves.ts` (five per-element tables), export surface 15→15 unchanged; Earth = boulder core + dust trail (non-luminous, `NormalBlending`), Wind = stretched teardrop streak, electric promoted explicitly; bespoke `quake_stomp` + `cyclone_dive` finishers |
| P3 — Deterministic stage | `87121d0` | `Math.random()` eliminated from `steps/` — contact jitter now seeded from `step.tick` + victim identity via `anim.ts`'s `jitter`/`hashString`, wired at all 5 call sites behind a non-vacuous source guard; `battle-timing.test.ts` pins `CONTACT_T`, `PROJECTILE_LIFE_MS`, `PROJECTILE_ARC` and all nine `PLAYBACK_PHASES` rows, plus reaction slide/dash invariance |
| P4 — Visual matrix + gate | `28c3fa3` | 6 archetypes × {idle, windup, contact, stagger} × {1440×900, 393×852} captured; reduced-motion A/B probe (instant dump proven first-hand); console clean on both viewports; montage clip |
| R1 — Review fixes | `194d073` | Wind's authored spin now actually renders — the projectile interpreter's per-frame `lookAt()` was overwriting the spin quaternion; orientation now applied once at spawn with the exact mirrored predicate (water/earth byte-identical), plus the interpreter-level test that closes the round-1 test gap |

## Requirements

- [x] **FR-1** — six registered archetypes each have an authored, frozen `BodyProfile`; unknown ids fall back to `DEFAULT_PROFILE`
- [x] **FR-2** — three attack knobs default to 1 in NEUTRAL; windup/recoil/strike amplitudes are profile-weighted, timing phases untouched
- [x] **FR-3** — all six profiles in-band (multipliers 0.5–1.6, swayAmp 0.004–0.045), pairwise distinct, frozen
- [x] **FR-4** — `move-fx.ts` split with every import path and exported name preserved (15→15, runtime-proven)
- [x] **FR-5** — six-element `SHOT_LOOKS`; Earth = boulder + dust (non-luminous lob), Wind = stretched high-spin flat-arc streak; no fallback for known elements
- [x] **FR-6** — bespoke `quake_stomp` + `cyclone_dive`; `basalt_guard`/`zephyr_veil` deliberately ride `DEFAULT_FX`
- [x] **FR-7** — zero `Math.random()` under `steps/`; contact jitter seeded and bounded ±0.15
- [x] **FR-8** — every layer pinned by new/extended co-located tests
- [x] **NFR-1** — no gameplay/timing change (constants test-pinned; determinism gate byte-identical through all four phases)
- [x] **NFR-2** — every touched module ≤ 12,288 B (largest: `steps/pure.ts` 9,697 B)
- [x] **NFR-3** — no new dependency, no `any`/`@ts-ignore`
- [x] **NFR-4** — tables stay pure data + pure functions
- [x] **NFR-5** — reduced motion still wins (instant dump A/B-proven; all new impulses route through `impulse()`'s 0.4 damping)
- [x] **NFR-6** — identical script ⇒ identical stage (no clock reads, seeded jitter only)

## Verification

| Layer | Command | Result |
| --- | --- | --- |
| unit | `bun run test:phase` | 2,517 pass / 0 fail / 1 skip · 129,166 expect · 197 files · 59 s |
| static | `bun run check` + `bunx biome check` | 0 errors (voxel 90 / sim 147 / client 363) · 582 files clean |
| determinism | `bun run gate:determinism` | 18 GLBs + 5 props byte-identical |
| build | `bun run build` | exit 0, 294 modules |
| visual | `playwright-cli` against `bun run dev` | full matrix desktop + iPhone 15, 0 console errors/warnings |
| integrated | `bun run verify && bun run build` | exit 0 (150 s / 90 s legs) |

## Media

The one-glance proof: all six archetypes sparring in sequence, desktop then phone framing (captured against this branch's Phase-4 state via the seeded-spar harness in the evidence tree).

![Six battle bodies in sequence](.conductor/media/20261024-battle-choreography-all-creatures/montage-six.gif)

## Review

**PASS** after 2 rounds — round 1 found one Medium (wind's authored spin silently discarded by the interpreter's per-frame `lookAt`; dead config that passed green because nothing tested the interpreter end), fixed by Phase R1 with the interpreter-level test the reviewer identified as the gap. Round 2 confirmed the fix genuine and raised one Low doc nit (stale pre-squash hashes in the evidence header), fixed. Zero Critical/High findings across both rounds.

## Deviations and risks

- The projectile-observation hook `firstMesh()` is additive to the layer's returned API (nothing removed/renamed; sole consumer unaffected).
- Phase 3's plan Touches were amended mid-phase (`e510006`) to add `impact.ts`/`melee.ts` after the primary's own brief under-seeded the jitter at 4 call sites — caught by an independent repeat-hit probe (fixed offset where variety used to be), reworked, and guarded by a non-vacuous source test.
- Electric's shot row was promoted from implicit fallback to an explicit row with byte-identical values — zero visual change.
- Risk: low. Sim and voxel are untouched (`SAVE_VERSION` stays 25), no timing constant changed, and the determinism gate is byte-identical end to end.

## Follow-ups

- Stage-scaled animation (one profile per archetype regardless of baby/juvenile/champion) — deferred by spec with its own driver read.
- Ranch-scene adoption of the body profiles — `choreo.ts` already anticipates it.
- Wind shares the `seeds` facet trail family with plant; distinctness is carried by stretch/spin/arc/wobble (accepted pending the shipped matrix).

## Rollback

Plain `git revert` of the squash commit. No save-schema, server, or balance surface is touched, so no data migration or save-backup concerns.
