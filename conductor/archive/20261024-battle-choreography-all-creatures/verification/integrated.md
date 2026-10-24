# Integrated Verification — Battle Choreography for All Creatures

**Track:** 20261024-battle-choreography-all-creatures
**Date:** 2026-10-24
**Branch:** `feat/20261024-battle-choreography-all-creatures`
**Range:** `4d6346b` (base, the merged test-suite speedup) → `3eb67f4` (HEAD)
**Result:** ✅ **green** — every layer of the configured strategy passes.

## Strategy

| Layer | Command | Result | Notes |
|---|---|---|---|
| Static | `bun run check` | exit 0 | voxel 90 / sim 147 / client 362 files, no type errors |
| Static | `bunx biome check` | exit 0 | 581 files, no fixes (the format/lint gate) |
| Unit | `bun run verify` (parallel suite leg) | exit 0 | 2,516 pass / 1 skip / 0 fail, 194 files |
| Unit | `bun run test:phase` (capped-4 whole suite) | exit 0 | **2,517 tests / 129,166 expect / 197 files / 0 fail in 59 s** — the phase-runner tier documented in workflow.md |
| Determinism | `bun run gate:determinism` (via verify) | exit 0 | **18 creature GLBs + 5 props, every digest byte-identical**; the 12 pre-existing GLBs unchanged across the whole track |
| Visual | matrix + console + reduced-motion + montage | ✅ | `verification/phase-4.md` — 6 × 4 × 2 authored-id matrix (broadcast framing), 0 console errors on both viewports (desktop shows only Chromium's own ReadPixels warnings), reduced-motion instant dump proven first-hand, montage GIF 29.88 s/8 fps/2.03 MB |
| Build | `bun run build` | exit 0 | 294 modules |

## What the track proved

- **Phase 1 (`87232a5`)** — all six archetypes carry authored, frozen, in-band body profiles
  (pairwise distinct, ≥2 knobs apart), the three attack-character knobs exist with NEUTRAL
  reproducing today exactly, and amplitudes are profile-weighted through `applyPosture` and
  the extracted `strikePose` melee beats. NEUTRAL is bit-for-bit the pre-track behaviour
  (14 pure tests + a differential against the old hardcoded formulas).
- **Phase 2 (`563f195`)** — `move-fx.ts` split into a 1,069 B barrel over `looks.ts`/`moves.ts`
  (further per-element under `moves/`) with the 15-name export surface proven 0/0 changed;
  Earth and Wind no longer fire generic orbs (new `boulder` + `dust` families, non-luminous
  Earth), `quake_stomp`/`cyclone_dive` got their bespoke finishers, electric was promoted to
  an explicit row with fallback-equal values.
- **Phase 3 (`87121d0`)** — the battle stage is deterministic: the one `Math.random()` under
  `steps/` was replaced by a pure seeded `contactJitter` (all **five** call sites thread
  `step.tick` — a rework caught the first pass's 4 unseeded sites, with a non-vacuous source
  guard pinning the class), and a `battle-timing.test.ts` pins `CONTACT_T` 0.46,
  `PROJECTILE_LIFE_MS` 700, `PROJECTILE_ARC 0.55`, all nine `PLAYBACK_PHASES` rows, and
  `slide`/`dash` invariance across profiles.
- **Phase 4 (`28c3fa3`)** — the visual matrix, reduced-motion probe, console audit, montage
  GIF and the full gate (phase subagent died of HTTP 413 after capturing; the primary
  completed from its intact disk state — recorded in phase-4.md's deviations).

## Known flags carried to review

- The falcon voxel silhouette is chunky for a speedster (art-pass follow-up, NOT this track).
- iPhone-15 HUD nav overlap (cosmetic, pre-existing on multiple tracks).
- Montage built from the stills because the agent's WebM recordings captured the wrong
  content (deviation 2 in phase-4.md).
- Visual matrix framed with the broadcast camera (cinematic drifts attackers out of frame) —
  supported user setting, noted for honesty.

## Coverage

`coverage.gate: "none"` — not applicable per workflow config.
