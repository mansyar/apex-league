# Review — 20261128-spar-setup-flow

- Track: `20261128-spar-setup-flow` — Streamline spar setup with an explicit start action and stable mobile scrolling
- Branch: `refactor/20261128-spar-setup-flow`
- Range: `000d64d3c0cca05ab362e4eafa9af987bce324ba..c3c5bbbb`
- Date: 2026-11-28
- Round: 1
- Verdict: **PASS**

## Summary

The arm-then-start flow meets all FR/AC with regression tests, sticky
footer geometry, and a green full gate. No blocking, medium, or low
findings. Rule selection intentionally persists across setups (no spec
reset requirement); the tactic reset is the only required leak guard and
is implemented (`armedDoctrine = "press"` + `markArmedTactic` in
`presentSetup`).

## Findings

None. No fix round required.

## Requirements coverage

| ID | Status | Verified by |
| --- | --- | --- |
| FR-1 — taps arm, never launch | covered | `spar/panel.test.ts:246,259,278,368` |
| FR-2 — Press pre-armed | covered | `spar/panel.test.ts:235,323`; `spar.ts:48,197` |
| FR-3 — footer names armed setup, Start launches existing path | covered | `spar/panel.test.ts:351,368`; phase-2.md browser Start opens battle HUD |
| FR-4 — internal scroll, footer in-frame at 393px both orientations | covered | `spar/panel.test.ts:436,450`; phase-2.md geometry at 3 viewports |
| FR-5 — ghost parity | covered | `spar/ghost.test.ts:170`; `spar/panel.test.ts:399` |
| NFR-1 — stable mobile bar, no h-scroll, clean console | covered | phase-3.md `scrollWidth` + 6 stills, console 0/0 |
| NFR-2 — modal contract, Start in frame | covered | panel.test.ts modal contract; phase-2.md Escape/focus-return |
| NFR-3 — no new motion, reduced-motion honored | covered | phase-2.md; no animation added |
| NFR-4 — no new deps, client-only, no save/sim change | covered | phase-3.md; module-size green |
| AC-1..AC-6 | all pass | Phase evidence tables; `integrated.md` full gate |

## Checks

- `bun test --check` spar suites: 19 pass / 0 fail (Phase 1), 16 pass panel-only (Phase 2).
- `bun run verify && bun run build` (primary re-run): 4645 pass / 1 skip / 0 fail, Biome 1064 files clean, determinism OK, build exit 0.
- `playwright-cli` visual spar + ghost at 393×852 / 852×393 / 1440×900: 6 committed stills, footer in-frame, zero h-scroll, console clean.
- Module-size guard: `panel.ts` under the 12 KB client cap.

## Deviation log (accepted)

- `apps/client/src/spar.ts` (+4 lines): `presentSetup()` calls `syncStartFooter()` so chip/ghost setups cannot show a stale footer.
- Track `metadata.json` reformatted with `biome --write` (primary-owned conductor state).
- Ghost visuals driven through the app's own `fightGhost(bundle)` seam (offline dev server); same `presentSetup` path as the board handler.

## History

- Round 1: PASS, no findings.
