# Phase 3 Verification — Heavy Pair: Cinder Ember + Blaze Comet

- Track: 20261028-fire-move-identity
- Phase: 3 (Heavy Pair: Cinder Ember + Blaze Comet)
- Date: 2026-10-28
- Branch: feat/20261028-fire-move-identity
- Base: 50e083d8 (main)
- Head: 3f22be3e (P3.T3) + GIF evidence (primary)
- Result: VERIFIED (code + gates by subagent; GIFs captured and visually confirmed by primary)

## Goal

Give the two remaining fire projectiles unmistakable per-move silhouettes:
Cinder Shot becomes a slow tumbling ember chunk (chunk geometry + wobble),
Blaze Bolt a fast head-first comet (jet geometry). Covers FR-3, FR-5, AC-2, AC-4.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `bun test apps/client/src/move-fx/moves/fallback.test.ts apps/client/src/move-fx/look-override.test.ts --timeout 120000` (red, pins first) | 40 pass / 5 fail | 4 heavy-pair pins + 1 identity-loop pin fail as designed (`chunk`/`jet` read `ember`; cinder muzzle present; blaze bloom too small) |
| same targeted pair after P3.T1 (cinder only) | 43 pass / 0 fail, 480 expects | cinder pins green |
| same targeted pair after P3.T2 (both rows) | 45 pass / 0 fail, 491 expects | all pins green |
| `bun run verify` | exit 0 | check: 466 + 169 + 160 + 44 files, 0 errors; tests 3478 pass / 1 skip / 0 fail (332 files, 436449 expects); biome 830 files clean; determinism gate OK (all species + 5 props byte-identical) |
| `bun run build` | exit 0 | 368 modules transformed; only the pre-existing >500 kB chunk-size warning |

## Acceptance criteria

| AC | Maps to | Status | Evidence |
| --- | --- | --- | --- |
| AC-2 | FR-3 Cinder identifiable in motion at 1x | VERIFIED | chunk + wobble 0.35 pin; strip: orange muzzle flash → brownish-orange puff string in flight → reddish-brown thud ring on defender; `phase-3/fire-cinder_shot.gif` (close, 900ms/step, seeds 103/104) |
| AC-4 | FR-5 Blaze identifiable in motion at 1x | VERIFIED | jet + wobble 0 / spin 0 pin; strip: launch flash + bright vertical streak in flight → large red/orange shockwave bloom on defender; `phase-3/fire-blaze_bolt.gif` (close, 900ms/step, seeds 105/106) |

## Shots (captured by primary 2026-10-28)

- `conductor/tracks/20261028-fire-move-identity/verification/phase-3/fire-cinder_shot.gif` (~2.1 MB, 12 fps) — chunk tumble + thud ring confirmed
- `conductor/tracks/20261028-fire-move-identity/verification/phase-3/fire-blaze_bolt.gif` (~2.2 MB, 12 fps) — comet streak + big bloom confirmed

### GIF capture recipe (for the primary — no browser/recording tools in this environment)

1. `bun run dev`, open `?movelab`.
2. Matchup: Ember Drake (draconic) vs Bramble Ox (bovine), fire group, bespoke rows only.
3. Camera: close; speed 1x (900 ms/step); seeds 11 and 23.
4. Trigger the flight + impact for `cinder_shot`, then `blaze_bolt`; watch `movelab-status` + seed.
5. Expect: cinder — large faceted chunk visibly tumbling end-over-end, no mouth flash, heavy downward thud that lingers; blaze — fast tapered pillar driving straight with no lateral drift, charge gather beforehand, biggest rising bloom that lingers longest.
6. Export ~12 fps GIFs to the paths above.

## Deviations (brief-authorized, same pattern as Phase 2)

- `apps/client/src/move-fx/looks.ts` — two `MOVE_SHOT_LOOK` opt-ins (table touch).
- `apps/client/src/move-fx/look-override.test.ts` — identity loop skips the two
  opted-in rows; unknown-element fallthrough probe switched from `cinder_shot`
  (now overridden) to `flame_charge` (still override-free); header comment updated.
- No sim changes, no save bump, no new deps, no conductor edits.

## Notes

- TDD: pins first (red 5 fail), rows second (green 45/45). One commit per task:
  P3.T1 cinder (`ac0ece06`), P3.T2 blaze (`30c5269e`), P3.T3 this report.
- Spec/brief reconciliation: cinder's "lobbed" read comes from the 850 ms heavy
  flight + falling (+6 gravity) thud arrival; scorch is automatic via the fire
  contact decal. Blaze keeps its charge gather (spec FR-5) while the 300 ms
  flight is the fastest of the fire mediums (300 < 560 flare < 850 cinder);
  "largest bloom" is the arrival core (size 1.9, 12 puffs, 620 ms, flashGrow 3.6).
  Both mouth flashes trimmed so no bloom outlives the flight (spark lesson):
  cinder muzzle removed, blaze muzzle shortened 380 → 260 ms.
- Trail family stays `embers` for both (no new family in touches); identity
  rides on geometry + wobble/spin + timing + arrival, not the trail.
- Wobble contrast: spark fork 0.3 (fast erratic line, 200 ms) vs cinder chunk
  0.35 (heavy tumble on a faceted mass, 850 ms) vs blaze jet 0/0 (locked straight).
