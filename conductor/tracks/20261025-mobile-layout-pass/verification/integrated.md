# Integrated verification — Mobile Layout Pass (20261025-mobile-layout-pass)

- **Date:** 2026-10-25
- **Branch:** `feat/20261025-mobile-layout-pass` (base `main` @ `f359653d`)
- **Scope:** full track — kit responsive baseline, ranch/HUD portrait +
  landscape + dock adaptation, cup/battle/spar, secondary surfaces,
  guidelines record.
- **Result:** **pass** (one recorded partial visual-coverage gap, see
  below).

## Full strategy on the branch tip

Run by the Conductor primary at the integrated checkpoint (`1ae63b7b`):

| Layer | Command | Result |
| --- | --- | --- |
| Unit (phase gate) | `bun test --check --parallel=4 --timeout 120000` | exit 0 — 2640 pass / 1 skip / 0 fail, 209 files |
| Static | `bun run verify` (typecheck + Biome) | exit 0 |
| Determinism | `bun run verify` (gate segment) | OK — creature GLBs + prop digests byte-identical |
| Build | `bun run build` | exit 0 (pre-existing >500 kB chunk advisory only) |
| Visual | phase-1..4 Playwright evidence | pass (below) |

## Visual integration (per phase)

- **Phase 1** (`phase-1.md`): kit two-tier baseline (phone ≤767.98px with
  40px touch floors, tablet 768–1023.98px); ranch/HUD portrait at 393×852
  passes the bar with measured geometry, real-tap proofs, mutual panel
  exclusion; desktop + tablet guards unchanged; console 0/0.
- **Phase 2** (`phase-2.md`): orientation-gated landscape block
  (852×393) with panel height caps and internal scrolling; dock collapse
  via a pure session seam (`hud/dock-collapse.ts`, failing-first TDD,
  collapsed by default on phone only, nothing persisted — save stays
  v25); hit-test sweeps 16/16 in both plate states; portrait recheck,
  desktop/tablet guards measured unchanged; console 0/0 at four
  viewports.
- **Phase 3** (`phase-3.md`): cup flow (portrait served by the existing
  ≤767.98px tier; landscape coach-room dead-end fixed with an
  orientation-gated scroll block), battle HUD retargeted to the live
  classes (dead pre-rework `.spar-hud*` selectors removed), spar panel
  parked + internal scroll, lineage plate hidden in arena mode; real cup
  runs (days 7/14) and spar sessions by real taps at both orientations;
  console 0/0.
- **Phase 4** (`phase-4.md`): STABLE/DRAFT-DAY overlap on the 393px draft
  screen fixed; full secondary sweep (draft, ranch, stable, handbook,
  settings + save-transfer, recovery incl. corrupt-save cycle, cup entry)
  with hit-test sweeps all SELF; `scrollWidth === innerWidth` at
  393/852/800/1440; console 0/0 at every audited viewport; the mobile bar
  recorded as UX Principle 8 in `conductor/product-guidelines.md`.

## Requirements status at integration

- FR-1..FR-9: all implemented and evidenced (see review.md requirements
  table for the task/test mapping).
- NFR-1: no sim/save changes — save stays v25; no new dependencies.
- NFR-2: desktop 1440×900 and tablet 768–1023.98px guarded per phase —
  measured unchanged throughout.
- NFR-3: reduced-motion blocks byte-untouched (diff-scoped check).
- NFR-4: 40px touch floors + colour-never-sole-carrier preserved; copy and
  labels unchanged, no tiny essential text introduced.
- NFR-5: CSS-first adaptation, one small pure TS module
  (`hud/dock-collapse.ts` ~1 KB) — module caps green in the gate.
- NFR-6 / AC-8: console 0 errors / 0 warnings at every audited viewport.
- AC-1..AC-3, AC-5, AC-6, AC-7, AC-8: met.
- **AC-4: met with a recorded partial visual-coverage gap** —
  graduation/nursery/gift surfaces are unreachable by real play within a
  single session (need a champion at day 60, two graduations, a Silver
  tier reward); verified by static CSS review only (they inherit the
  fixed `.starter-overlay` phone tier). Handled via the workflow fallback
  ladder; no saves were hand-edited and nothing was fabricated.

## Known residuals (documented, non-blocking)

1. Landscape battle verdict stamp passes ~60 px behind the open log box
   (transient, non-interactive; the log paints on top) — cosmetic,
   documented in `phase-3.md` with two fix attempts spent.
2. Pre-existing tablet-band chip/lineage overlap at 800×1000 — out of
   contract (NFR-2 preserves base seats); noted for a future track.

## Conclusion

The integrated tree passes the full verification strategy. The track is
ready for docs sync and review.
