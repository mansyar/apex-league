## Summary

Retunes the arena camera, lighting, and HUD so both fighters stay readable at
every viewport: a containment-only animated envelope (`ANIM_HEIGHT_PAD = 0.2`)
with rebalanced aim keeps bodies in frame, a hard-cut measured-action
lifecycle (750 ms wide establishing beat, then pose+FOV cut together) ends
transition clipping, arena-only contrast paint separates fighters from the
floor, and full HUD names wrap without ellipsis at all three viewports.

## Track

- **ID:** `20261127-arena-readability-pass`
- **Type:** feature — high priority
- **Spec:** [spec.md](conductor/tracks/20261127-arena-readability-pass/spec.md)
- **Plan:** [plan.md](conductor/tracks/20261127-arena-readability-pass/plan.md)
- **Review:** [review.md](conductor/tracks/20261127-arena-readability-pass/review.md) — Round 2 `PASS`

## What happened

| Phase | Checkpoint | Result |
|-------|------------|--------|
| 1 — Action framing + lifecycle skeleton | `82f713ef` | Readability lens 2.4x, rest floor, measured rig radii; red→green. |
| 2 — Arena contrast + HUD names | `986c7aeb` | Arena-only paint/lighting, full-name wrap; red→green. |
| 3 — Browser proof + integrated gate | `c6e2963d` | Real-sim spar/cup matrix, exhaustive 252k containment probe, gate green. |
| 4 — Separation + contrast polish | `c1860f51` | Real-smallest-ray separation fixtures, arena contrast polish; red→green. |
| R1 — Strict-review corrective | `942fd3fe` | Hard-cut lifecycle, reduced-motion tracked action, animated envelope 0.2, fresh r3 matrix; red→green. |
| Review | `228de73f` | Round 1 BLOCK F1–F4 → Round 2 PASS (4 fixed, 0 open). |

## Requirements

- [x] FR-1 — rest 8%/32px floor + animated containment + establishing corners
- [x] FR-2 — broadcast/cinematic lifecycle + reduced-motion tracked action
- [x] FR-3 — arena-only contrast, frozen surfaces untouched
- [x] FR-4 — 0.38 separation target + explicit 0.1 fallback on real profiles
- [x] FR-5 — full HUD names, no ellipsis/overflow
- [x] FR-6 — extremes/lifecycle/dense/safe-area finite
- [x] FR-7 — spar + cup evidence all styles/viewports + GIF
- [x] NFR-1..NFR-5 — freeze lines hold; gate + build + Biome + determinism green

Gate (final code): 4,630 pass / 1 skip / 0 fail, 685,273 expects, 4,631 tests /
446 files; `bun run build` exit 0; Biome clean (1,063 files); voxel
determinism byte-identical. Code delta confined to `camera/rig.ts`,
`scene-logic/framing.ts`, `framing.test.ts` + verification docs.

## Media

Final-code captures (real-sim day-7 cup, cinematic, consoles 2/0/0):

![cup cinematic action, desktop 1440x900](https://github.com/user-attachments/assets/7baac0ce-aec9-4f0f-83d2-3cdaa1c92f1e)
![cup cinematic action, portrait 393x852](https://github.com/user-attachments/assets/51db82e3-40f9-4896-8c46-d0f46ce3f9ad)
![cup cinematic action, landscape 852x393](https://github.com/user-attachments/assets/ffc2c9b6-bf60-4e37-8e45-f94f1d3c01dc)
![live establishing, desktop](https://github.com/user-attachments/assets/df1bfa76-11f7-43e4-9cee-097491f17424)
![live establishing, portrait](https://github.com/user-attachments/assets/192253e9-7628-4325-8f72-e5ed76077ca4)
![arena action GIF, final code](https://github.com/user-attachments/assets/e292d67f-2497-4b64-8478-df09da0e02e4)

12/12 action beats zero viewport-edge clip; establishing shows all four
painted corners at every viewport (landscape: partial HUD-panel overlap +
fade transition, disclosed overlay class, not crop).
