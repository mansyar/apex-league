# Plan — 20261025-mobile-layout-pass

Base: `main` @ `f359653d469308ba474ce2b85f2d1af630ec0fa7`

Phase gate for every phase: `bun test --check --parallel=4 --timeout 120000`.
Phase acceptance additionally runs `bun run verify && bun run build`.
Visual evidence per the workflow: Playwright at 393×852 (portrait) and 852×393
(landscape), with a 1440×900 desktop guard capture in every phase (NFR-2 /
AC-7), console-clean at all audited viewports (AC-8). Screenshots under
`.conductor/evidence/20261025-mobile-layout-pass/`, recorded in the phase's
`verification/phase-<n>.md`. TDD applies to logic only (e.g., dock collapse
decision); CSS/layout work is verified through the visual layer.

---

## Phase 1 — Kit baseline & ranch portrait

- **Goal:** the shared kit gains coherent width breakpoints and the ranch+HUD
  day view is fully playable at 393×852 with zero occlusion.
- **Depends on:** none
- **Covers:** FR-1, FR-2, NFR-2, NFR-3, NFR-4, NFR-5, NFR-6, AC-1 (portrait), AC-7, AC-8
- **Touches:** `apps/client/src/ui/kit.css`, `apps/client/src/ranch.css`,
  `apps/client/src/hud/**` (class/markup only),
  `conductor/tracks/20261025-mobile-layout-pass/verification/**`
- **Verification:** `bun test --check --parallel=4 --timeout 120000` +
  visual evidence (393×852 ranch day view, 1440×900 guard, console clean)
- **Status:** verified

- [x] **P1.T1: Kit responsive baseline** — covers: FR-1, NFR-2
  - [x] **P1.T1.1: Add phone (≤767.98px) and tablet (768–1023.98px) width breakpoints to `kit.css`** — shared components (plates, chips, dock, modals, ticker) size legibly at 393px; desktop rules untouched
  - [x] **P1.T1.2: Visual evidence** — kit-bearing surfaces at 1440×900 (unchanged) and 393×852 (legible)
- [x] **P1.T2: Ranch & HUD portrait pass** — covers: FR-2, AC-1 (portrait), AC-8
  - [x] **P1.T2.1: Reflow `ranch.css` HUD panel layout at phone widths** — panels never occlude the scene's action area or each other's interactive regions; no horizontal page scroll
  - [x] **P1.T2.2: Visual evidence at 393×852** — feed/rest/train/bond reachable, scene visible, console clean; 1440×900 guard capture

- **Result:** verified — bar met with live measurements (no horizontal
  scroll at 393/800/1440; bottom panels mutually exclusive via `:has()`
  with the pet visible; 40px touch floors; console 0 errors / 0 warnings
  at both audited viewports); desktop 1440×900 and the 800×1000 tablet
  band verified unchanged.
- **Checkpoint:** `9e4e7b12`
- **Evidence:** `conductor/tracks/20261025-mobile-layout-pass/verification/phase-1.md`

## Phase 2 — Landscape & dock adaptation

- **Goal:** ranch+HUD passes the bar at 852×393 and the HUD dock collapses on
  phone widths (light adaptation, no gestures).
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-7, NFR-2, AC-1 (landscape), AC-5, AC-7, AC-8
- **Touches:** `apps/client/src/ranch.css`, `apps/client/src/ui/kit.css`,
  `apps/client/src/hud/**`, `apps/client/src/hud.ts` (or co-located dock
  module), `apps/client/src/ranch/**` (frame/adapter only if the dock needs a
  scene-side hook),
  `conductor/tracks/20261025-mobile-layout-pass/verification/**`
- **Verification:** `bun test --check --parallel=4 --timeout 120000` +
  visual evidence (both orientations, desktop + tablet guard)
- **Status:** verified

- [x] **P2.T1: Dock collapse adaptation** — covers: FR-7, AC-5
  - [x] **P2.T1.1: Failing-first unit test for the collapse decision** — pure function: viewport width class → collapsed default on phone widths; user toggle override persists in-session; desktop default unchanged
  - [x] **P2.T1.2: Implement collapse behavior + wiring** — dock condenses on phone widths; no gestures; existing handlers unchanged; module stays within the 12 KB cap
- [x] **P2.T2: Landscape ranch/HUD pass** — covers: FR-3, AC-1 (landscape)
  - [x] **P2.T2.1: Landscape rules in `ranch.css`/`kit.css`** at 852×393 — panels fit without covering the scene
  - [x] **P2.T2.2: Visual evidence** — 852×393 ranch day view + 393×852 recheck + 1440×900 and tablet-band guards

- **Result:** verified — landscape block is orientation-gated (no third
  width breakpoint); dock collapses by default on phone only via a pure
  session seam (`hud/dock-collapse.ts`, failing-first TDD, no
  persistence); 16/16 hit-test sweeps in both plate states; real-tap
  interaction proofs in both orientations; portrait recheck, desktop
  1440×900 and tablet 800×1000 guards measured unchanged; console 0/0 at
  all four viewports.
- **Checkpoint:** `319bd9d7`
- **Evidence:** `conductor/tracks/20261025-mobile-layout-pass/verification/phase-2.md`

## Phase 3 — Cup, battle & spar

- **Goal:** cup flow key states, battle HUD/arena overlays, and spar pass the
  bar in both orientations.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, FR-8, NFR-2, AC-2, AC-3, AC-7, AC-8
- **Touches:** `apps/client/src/cup.css`, `apps/client/src/battle-hud.css`,
  `apps/client/src/spar.css`, `apps/client/src/cup/**` (class/markup only),
  `conductor/tracks/20261025-mobile-layout-pass/verification/**`
- **Verification:** `bun test --check --parallel=4 --timeout 120000` +
  visual evidence (key states × both orientations, desktop guard)
- **Status:** verified

- [x] **P3.T1: Cup flow both orientations** — covers: FR-4, AC-2
  - [x] **P3.T1.1: `cup.css` adjustments** for entry, bracket, coach room, board, results at both phone orientations — legible, operable, no occlusion, modals within viewport
  - [x] **P3.T1.2: Visual evidence** — key states × 393×852 and 852×393 + 1440×900 guard
- [x] **P3.T2: Battle & spar surfaces** — covers: FR-5, FR-8, AC-3
  - [x] **P3.T2.1: `battle-hud.css` + `spar.css` adjustments** — battle HUD/arena overlays readable mid-battle in both orientations; spar setup/panel/log operable
  - [x] **P3.T2.2: Visual evidence** — active spar session + cup battle in both orientations + 1440×900 guard

- **Result:** verified — real pre-fix defects captured and fixed (landscape
  coach room was a flow dead-end; battle-hud phone tier targeted dead
  pre-rework `.spar-hud*` selectors; landscape spar panel clipped both
  ends); full real cup runs (days 7/14) and spar sessions by real taps at
  both orientations; desktop guard unchanged; console 0/0 everywhere.
  Cosmetic residual documented (landscape verdict stamp passes behind the
  open log box; transient, non-interactive) with two fix attempts spent —
  left for Phase 4 polish.
- **Checkpoint:** `90d7431d`
- **Evidence:** `conductor/tracks/20261025-mobile-layout-pass/verification/phase-3.md`

## Phase 4 — Secondary surfaces, docs & integrated audit

- **Goal:** all remaining surfaces pass; the mobile bar is recorded in the
  product guidelines; a full integrated sweep confirms every surface in both
  orientations.
- **Depends on:** Phase 1
- **Covers:** FR-6, FR-9, NFR-1, AC-4, AC-6, AC-8
- **Touches:** `apps/client/src/starter.css`, `apps/client/src/nursery.css`,
  `apps/client/src/graduation.css`, other surface stylesheets as the audit
  surfaces them (`spar.css`, `base.css`), `conductor/product-guidelines.md`,
  `conductor/tracks/20261025-mobile-layout-pass/verification/**`
- **Verification:** `bun test --check --parallel=4 --timeout 120000` +
  full both-orientation sweep evidence + `bun run verify && bun run build`
- **Status:** verified

- [x] **P4.T1: Secondary surfaces pass** — covers: FR-6, AC-4
  - [x] **P4.T1.1: Adjustments** for stable, graduation/nursery, handbook, starter, gift, settings, recovery, save-transfer in both orientations — long content scrolls rather than clips; inputs reachable with OS keyboard open
  - [x] **P4.T1.2: Visual evidence** — representative state per surface × both orientations + desktop guard
- [x] **P4.T2: Guidelines mobile bar** — covers: FR-9, AC-6
  - [x] **P4.T2.1: Record the mobile bar in `conductor/product-guidelines.md`** — 393px core loops playable, desktop-first unchanged; edit requires explicit approval per the docs-sync gate
- [x] **P4.T3: Integrated audit** — covers: AC-1, AC-2, AC-3, AC-4 (final confirmation), AC-8
  - [x] **P4.T3.1: Full sweep** — every surface × both orientations, adopted bar re-checked end-to-end, console clean, integrated evidence summary

- **Result:** verified — STABLE/DRAFT-DAY overlap fixed and proven at both
  orientations; full secondary sweep with real-tap proofs (draft, ranch,
  stable, handbook, settings + save-transfer, recovery incl. corrupt-save
  cycle, cup entry); bar re-checked end-to-end; console 0/0 everywhere;
  desktop + tablet guards unchanged. Mobile bar recorded as UX Principle 8
  in product-guidelines.md (user-approved wording, applied by the primary).
  AC-4 visual coverage for graduation/nursery/gift is a recorded partial
  gap (unreachable by real play in one session; static CSS review only —
  fallback ladder).
- **Checkpoint:** `980d050b`
- **Evidence:** `conductor/tracks/20261025-mobile-layout-pass/verification/phase-4.md`

---

<!-- Review-Fixes phases are appended here by conductor-review. -->
