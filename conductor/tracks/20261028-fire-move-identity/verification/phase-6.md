# Phase 6 — GIF Catalog + Acceptance Sweep: verification evidence

Track: `20261028-fire-move-identity` · Phase: `phase-6-catalog-sweep`

## Goal

8 per-move GIFs captured, grayscale readability pass, full gate green.
User sign-off (P6.T2) stays with the primary — the track's acceptance
criterion is the user watching the GIFs.

## Catalog (all 8 GIFs, 12 fps, 480 px)

| Move | GIF | Size | Action confirmed |
|------|-----|------|------------------|
| spark | `verification/phase-2/fire-spark.gif` | 1.86 MB | projectile + fiery trail |
| flare_dart | `verification/phase-2/fire-flare_dart.gif` | 1.99 MB | linear streak + compact spark cluster |
| cinder_shot | `verification/phase-3/fire-cinder_shot.gif` | 2.08 MB | small arcing sphere + drip particles |
| blaze_bolt | `verification/phase-3/fire-blaze_bolt.gif` | 2.23 MB | rounded burst on defender |
| pyre_wall | `verification/phase-4/fire-pyre_wall.gif` | 1.98 MB | curved vertical particle wall |
| flame_charge | `verification/phase-5/fire-flame_charge.gif` | 0.66 MB | lunging attacker engulfed in flames |
| cinder_dive | `verification/phase-5/fire-cinder_dive.gif` | 0.74 MB | airborne diving attacker + fire |
| pyre_lance | `verification/phase-5/fire-pyre_lance.gif` | 0.74 MB | beam extending significantly behind defender |

## Grayscale readability pass (P6.T1)

One action frame per GIF, `format=gray`, vision-probed blind (no hue).
Method note: fast moves need timestamp hunting (flare's 560 ms flight
missed at 60% — caught at 65%/75%); Phase-5 frames reused the already
verified action indices (charge 20, dive 60, lance 70).

- spark: projectile + trail — DISTINCT (forked crackle in color).
- flare_dart: linear streak + compact cluster — DISTINCT from spark.
- cinder_shot: small arcing sphere + drip — DISTINCT (lob read).
- blaze_bolt: rounded burst on defender — DISTINCT (biggest bloom).
- pyre_wall: curved vertical wall — DISTINCT (only encirclement).
- flame_charge: lunging body engulfed — DISTINCT (only body-crossing).
- cinder_dive: airborne diving body — DISTINCT (only aerial arc).
- pyre_lance: beam projecting behind defender — DISTINCT (only exit wound).

**Verdict: PASS.** No two moves share a shape-language read; no move
depends on hue alone.

## Gate

- `bun run verify` → exit 0 (run at tuning head `91d2bb3c`; docs-only
  commits since).
- `bun run build` → exit 0 (pre-existing chunk-size warning only).

## P6.T2

Pending: user watches the 8 GIFs and signs off (AC-7).
