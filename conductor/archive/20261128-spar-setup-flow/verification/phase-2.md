# Phase 2 Verification — Sticky Start footer plus stable panel scroll

- Track: `20261128-spar-setup-flow`
- Phase: Phase 2 — Sticky Start footer plus stable panel scroll
- Date: 2026-11-28
- Branch: `refactor/20261128-spar-setup-flow`
- Base commit: `83296237`
- Head commit: `1bee68b3`
- Result: **verified** (phase checks green; full-gate Biome has one pre-existing error in primary-owned `metadata.json`, recorded below)

## What changed

- `apps/client/src/spar/panel.ts`: sticky footer DOM with live `Press · No note`-style summary and a single `Start bout` control wired to the existing launch seam; `syncStartFooter()` exposed for fresh setups.
- `apps/client/src/spar.ts`: `presentSetup()` calls `syncStartFooter()` so the chip/ghost path cannot show a previous bout's tactic (outside Touches — see deviations).
- `apps/client/src/spar.css`: sticky footer styling, internal-scroller specificity fix (`.spar-overlay .spar-panel`), and `box-sizing: border-box` so `max-height` includes padding.
- `apps/client/src/spar/panel.test.ts`: 7 new tests covering footer DOM/labels, live summary, launch semantics, modal contract, and internal-scroll CSS.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `bun test --check apps/client/src/spar/panel.test.ts` | exit 0 — 16 pass, 0 fail, 76 expect() calls | Exact phase verification command; re-run after the final import-order fix. |
| `bun run check` | exit 0 — no type errors across all workspaces | Static leg. |
| `bun test --check apps/client/src/module-size.test.ts` | exit 0 — 5 pass, 0 fail | `panel.ts` stays under the 12 KB client module cap. |
| `bun run verify` | exit 1 — tests 4645 pass / 1 skip / 0 fail; Biome found 1 error | The only remaining Biome error is `conductor/tracks/20261128-spar-setup-flow/metadata.json` formatting (primary-owned; forbidden for this phase). The first run also flagged import order in `panel.test.ts`; fixed and the second run shows no diagnostics in any touched file (one pre-existing info-level `useLiteralKeys` in the test harness). Full gate must be re-run by the primary after metadata formatting. |
| `bun run biome check <touched files>` | permission denied (`shell`) | Direct Biome invocation is not permitted in this agent; the equivalent check ran inside `bun run verify` above. See blockers. |
| `playwright-cli open http://localhost:5173`, `resize`, `snapshot`, `eval`, `screenshot`, `console`, `press Escape` | pass — 0 console errors, 0 warnings | Visual leg against the running dev server. |

## Acceptance criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| FR-3 / AC-3 — footer shows armed tactic + active rule and Start launches the existing battle path | pass | Unit tests assert `Press · No note` initially, live update to `Kite · Read the tell`, no launch on arm/pick, one launch on Start, and a fresh setup re-naming. In-browser: arming Kite + `Read the tell` changed the summary to `Kite · Read the tell`; tapping Start opened the battle HUD reading `Ember Drake · Kite · Read the tell`. |
| FR-4 / AC-4 — panel scrolls internally, page/scene stay locked, footer in frame at 393×852 and 852×393 | pass | CSS tests assert three internal-scroller rules, `max-height`, `overflow-y: auto`, `overscroll-behavior: contain`, and sticky footer declarations. Browser geometry: footer bottom 825 < 852 (phone) and 368 < 393 (landscape); panel `scrollHeight/clientHeight` 1109/674 and 773/367; footer stayed pinned at the same bottom across `scrollTop` 0, 200, and max; page scroll 0; `documentElement.scrollWidth` equals viewport width (393 and 852). |
| Desktop 1440×900 | pass | Footer bottom 841.7 < 900; no internal scroll needed (811/811); page scroll 0; no horizontal overflow. |
| NFR-2 — modal contract unchanged, focus trap includes Start, Escape/scrim close, focus returns to Spar | pass | Unit tests cover the dialog/modal contract with the Start control included. In-browser: with Start focused, Escape closed the overlay (`display: none`) and returned focus to the `Spar` button. |
| NFR-1 / NFR-3 — mobile bar readable, no occluded interactives, clean console, reduced motion honored | pass | All three viewports measured; Start button fully inside the viewport; `playwright-cli console` reported 0 errors / 0 warnings. No new motion was added. |
| NFR-4 — no new deps, client-only, no save-schema/sim change | pass | Only client TS/CSS/tests plus one client call-site line changed; no manifests or sim files touched. |

## Evidence paths

- `.conductor/evidence/20261128-spar-setup-flow/phase-2-portrait-393x852.png`
- `.conductor/evidence/20261128-spar-setup-flow/phase-2-landscape-852x393.png`
- `.conductor/evidence/20261128-spar-setup-flow/phase-2-desktop-1440x900.png`

## Deviations

- `apps/client/src/spar.ts` — `presentSetup()` needed `syncStartFooter()` after the Press re-arm so the new footer cannot display a stale tactic on chip/ghost setups. Two-line change plus comment; outside the brief's Touches, kept to the minimum.

## Notes

- The CSS initially measured the footer below the viewport: a later base `.spar-panel` rule won on equal specificity, and `max-height` excluded padding. Fixed with a more specific `.spar-overlay .spar-panel` selector in both media queries and `box-sizing: border-box` on the base panel rule; all three viewports re-measured green afterwards.
- `bun run verify` is Phase 3's full gate; it was run here only to obtain the Biome leg. It still exits 1 solely because of `metadata.json` formatting, which the primary owns. No Conductor state file was modified by this phase.
- The evidence file is committed separately from the code change.
