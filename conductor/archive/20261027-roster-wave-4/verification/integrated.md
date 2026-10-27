# Integrated verification — Roster Wave 4 (20261027-roster-wave-4)

- Track: 20261027-roster-wave-4 (Roster Wave 4, Fire-Triangle Discovery)
- Date: 2026-10-27 (UTC)
- Branch: feat/20261027-roster-wave-4
- Result: **verified**

## Phase checkpoints

| Phase | Commit | Evidence | Result |
| --- | --- | --- | --- |
| 1 — Species & discovery lookup | 1d249352 | verification/phase-1.md | verified |
| 2 — Voxel archetypes | 030cd383 | verification/phase-2.md | verified |
| 3 — Client presentation | 9ed5c037 | verification/phase-3.md | verified |
| 4 — Rivals, bosses & integrated evidence | 02a524b6 | verification/phase-4.md | verified |

## Full-gate re-run (final tree, after all phases + doc sync)

- `bun run check` — exit 0, no type errors (sim 169, voxel 160,
  server 44, client 452 files).
- `bun test --check --parallel=4 --timeout 120000` — exit 0:
  3412 pass, 1 skip, 0 fail across 326 files.
- `biome check` — exit 0, 812 files clean.
- `bun run gate:determinism` — exit 0: all 15 archetypes × 3 stages
  byte-identical + 5 props.
- `bun run build` (client) — exit 0.
- Browser pass (primary, `playwright-cli` vs `bun run dev`):
  handbook Raising tab renders all three new recipes; Paths tab lists the
  six new branch forms with element-true signatures; a free spar played
  end-to-end (Ember Drake vs Tide Axolotl, knockout finish); desktop +
  iPhone 15 screenshots under
  `.conductor/evidence/20261027-roster-wave-4/`; console 0 errors,
  0 warnings.

## Acceptance-criteria sweep (all phases)

- AC-1 — PASS: `ALL_SPECIES` holds 15; new lines locked, excluded from
  starter/reward paths (Phase 1 pins + Phase 4 sweep).
- AC-2 — PASS: determinism gate green, 9 new GLB pairs pinned,
  tripwire ≤320 KiB (Phase 2).
- AC-3 — PASS: kits in-band, fresh 0/36 disadvantaged cells, all
  trained+6 cells ≥66.7% vs the 35% bar (Phase 4 report mode).
- AC-4 — PASS: all six recipes resolve both parent orders, breed-true,
  no save change (still v25).
- AC-5 — PASS: hatch → train → branch for all six new forms (Phases 1–3).
- AC-6 — PASS: non-Bronze fields draw the 15-pool; six bosses keep with
  probe numbers; browser spar end-to-end.
- AC-7 — PASS: render + handbook recipes incl. browser confirmation.
- AC-8 — PASS: copy pins, no new user-facing strings this phase.

## Doc sync

- `conductor/product.md`: Wave-4 landed clause (fifteen species).
- `README.md`: Phase-3 row roster count nine → fifteen with full
  composition. No product-guideline changes (hue contract honored,
  existing rules untouched).
