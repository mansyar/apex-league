# Phase 2 Verification — Shared stamp view and adapter rewiring

- **Track:** `20261126-verdict-presentation-dedup`
- **Phase:** 2 — Shared stamp view and adapter rewiring
- **Date:** 2026-11-26
- **Branch:** `refactor/20261126-verdict-presentation-dedup`
- **Phase base:** `536a3ec32374b3dafb05c6a40ca72903d0e246bd`
- **Head:** `b32f6318f9ff083f78b3406e2180c6f644854929`
- **Phase commits:** `682f3d6d` (test pins), `f093128a` (implementation), `d6678eb0` (Rework 1), `b32f6318` (Rework 2)
- **Result:** verified

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/stamp.test.ts apps/client/src/battle-session.test.ts apps/client/src/battleHud.test.ts apps/client/src/cup/view-models.test.ts apps/client/src/battleUI.test.ts` (T1 red) | exit 1 | `TS2307: Cannot find module './stamp'` — expected before the seam existed. |
| Same command after T2 | exit 0 | `105 pass / 0 fail`, `194 expect()` calls, 5 files. |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts` | exit 0 | `5 pass / 0 fail` — the 12 KB client cap remains green after rewiring `battleHud.ts`. |
| `grep` for verdict literals in `battle-session.ts` (`A drawn spar`, `A draw`, `Victory —`, `Defeat —`, `takes the`, `Champion`, `Eliminated`) | no matches | All title wording now delegates to `battleStampCopy`. |
| `grep` in `cup/view-models.ts` (`takes the`, `Champion`, `Eliminated`, `ends without a champion`) | 1 comment-only match | Line 118 doc comment; no title/sub literal remains in code. |
| `git diff --stat` / `git status --short` | clean after commits | `live/state.ts`, CSS, audio, sim, save/schema, voxel, dependencies and lockfiles absent from the diff. |

## Acceptance

| ID | Status | Evidence |
| --- | --- | --- |
| FR-1 | verified | One pure `verdict/copy.ts` owns all verdict title/sub derivation; `sparStampTitle`, `cupStampTitle` and `resultsView` are one-line delegations. |
| FR-2 | verified | No duplicated verdict title/sub literals in the three adapters (grep above). `reasonLine` is still the battle subline source and is unchanged at the finish call. Placement/reward derivation stays in `resultsView`. |
| FR-3 | verified | `verdict/stamp.ts` is the single DOM stamp view (class-name config only). `battleHud.test.ts` pins classes, rule element, reflow/animation restart, `role="status"`, `aria-live="polite"` and show/hide transitions; `cup/results.ts` announcement, `.lost` toggle and animation restart are untouched. |
| FR-4 | verified | Every pinned string is unchanged — pre-existing exact-string assertions were kept and delegation equality assertions added. |
| AC-2 | verified | Both title builders equal `battleStampCopy(...).title` across null-winner, distinct-name, mirror and no-fight (spar) cases; `resultsView` title/sub equal `cupResultCopy(...)`. |
| AC-3 | verified | Both surfaces call `buildStampView`; DOM tests cover both class configurations, child order, ARIA option and no side effects. Single cup announcement code path unmodified. |
| AC-4 | verified | `live/state.ts`, CSS and audio cues are absent from the phase diff; no wording change beyond moving literals into the Phase 1 copy module. |
| AC-7 | verified | Null winner, no-fight spar, mirror qualification, replay/hide lifecycle and stale-text prevention are pinned; reduced-motion/instant paths were not touched. |
| NFR-3 | verified | HUD stamp root keeps one `role="status"` + `aria-live="polite"` pair; cup stamp builder adds no ARIA attributes and the existing combined announcement is unchanged. |
| NFR-5 | verified | `show()` clears both stamp classes; `stamp()` writes texts and replays `battle-stamp-in` via a forced reflow; `hideStamp()` clears both classes. No state fields were added. |

## Exact copied strings (owned by `verdict/copy.ts`, unchanged)

- Spar stamp, null winner: `A drawn spar`
- Spar stamp, winner named: `Victory — ${winner}` (also the `fight === null` path)
- Spar stamp, mirror owned side wins: `Victory — your ${winner}`
- Spar stamp, mirror rival side wins: `Victory — rival ${winner}`
- Cup battle stamp, null winner: `A draw`
- Cup battle stamp, distinct names: `Victory` / `Defeat`
- Cup battle stamp, mirror: `Victory — your fighter` / `Defeat — the rival`
- Cup results, champion: `Champion` / `${player} takes the ${cupName}!`
- Cup results, eliminated with champion: `Eliminated` / `${championName} takes the ${cupName}.`
- Cup results, eliminated without champion: `Eliminated` / `The cup ends without a champion.`
- Battle subline: `reasonLine(verdict)` (unchanged at the finish call).

## DOM invariants

- `buildStampView` creates exactly four `div` elements, `root > title, rule, sub` in that order (default mode), with exactly the configured class names. `parentChildren: false` leaves the root empty and returns all four refs for the caller to append flat.
- `announce: true` sets `role="status"` and `aria-live="polite"` on the root only; `false`/omitted sets neither on root or children.
- The builder never sets text, toggles `.lost`/`.show`/`.in`, or replays animations; DOM-free logic stays in `verdict/copy.ts`.
- HUD classes: `.battle-stamp`, `.battle-stamp-title`, `.battle-stamp-rule`, `.battle-stamp-sub`. `show()` removes `.battle-stamp-in` then `.battle-stamp-show`; `stamp(title, sub)` writes texts, adds `.battle-stamp-show`, then `replayClass(stamp, "battle-stamp-in")`; `hideStamp()` removes both.
- Cup classes: `.cup-result-stamp`, `.cup-result-title`, `.cup-result-rule`, `.cup-result-sub`; no builder-added ARIA attributes. The stamp root and its title/rule/sub are flat siblings of `.cup-result-card`, preserving the card's original `flex-direction: column` + `gap: 1cqw` layout.
- `ResultsScreenRefs` and the returned object shape are unchanged.

## Evidence paths

- `apps/client/src/verdict/stamp.ts` — new DOM-only seam.
- `apps/client/src/verdict/stamp.test.ts` — both class configs, DOM order, ARIA option, no side effects.
- `apps/client/src/battle-session.test.ts` / `apps/client/src/cup/view-models.test.ts` — delegation equality pins added without weakening existing assertions.
- `apps/client/src/battleHud.test.ts` — local `FakeElement` harness and stamp DOM/lifecycle pins.
- `apps/client/src/verdict/copy.ts` / `copy.test.ts` — Phase 1 copy model (`phase-1.md`).
- Commits `682f3d6d`, `f093128a`, `d6678eb0` (Rework 1) and `b32f6318` (Rework 2) on the phase branch.

## Deviations

- `apps/client/src/cup/results.ts` was intentionally left unchanged: no type import was needed, per the rewiring contract. Recorded as a no-change rather than an omission.
- `apps/client/src/verdict/stamp.ts`: the required `buildStampView` seam was extended with `parentChildren?: boolean` (default `true`) so the cup can keep its original flat DOM without a second, duplicated stamp builder. This was added in Rework 1 to satisfy the byte-for-byte presentation requirement.
- Test-only local `FakeElement` harnesses were added inside `verdict/stamp.test.ts` and `battleHud.test.ts`; no shared test helper was introduced.

## Notes

- The cup stamp root and its title/rule/sub remain flat siblings of `.cup-result-card`, so the card's original `flex-direction: column` and `gap: 1cqw` are preserved. No CSS change was needed (CSS was out of scope); the primary may still include the cup results screen in visual/AC-5 verification as part of its normal gate.
- `bunx biome check` and `bun run gate:determinism` were permission-denied for subagents in Phase 1; in Rework 1 `bunx biome check --write` was denied again and the three reported findings were applied by hand exactly as printed. The primary's full gate remains the authority for NFR-4/AC-6.
- `## Primary verification` is appended by the primary after its own full-gate run.

## Rework 1

**Trigger:** The primary independently re-ran the phase command (105 pass / 0 fail / 194 expect() calls, exit 0) and the scope check (exactly the nine declared Touches changed, commits `682f3d6d` and `f093128a`, evidence file untracked). Two acceptance issues were raised: (A) nesting the cup title/rule/sub under `.cup-result-stamp` removed the `.cup-result-card` flex gaps and changed the visual layout; (B) three scoped Biome findings in `battle-session.ts:1`, `battleHud.ts:157` and `cup/view-models.test.ts:10`.

**Exact edits:**

- `apps/client/src/verdict/stamp.ts`: options widened to `{ announce?: boolean; parentChildren?: boolean }`; `root.append(title, rule, sub)` now runs only when `options?.parentChildren !== false` (default nests, as before); all four refs are always returned.
- `apps/client/src/cup/screens/results.ts`: `buildStampView(..., { parentChildren: false })` and `resultCard.append(resultStamp, resultTitle, resultRule, resultSub, resultPlate, resultRewards, resultBack)` restored the original flat DOM. `ResultsScreenRefs` and the returned shape are unchanged.
- `apps/client/src/verdict/stamp.test.ts`: added `parentChildren: false returns flat refs with unchanged ARIA behavior`, pinning empty root children, all four exact class names, and `role`/`aria-live` presence only with `announce: true`.
- `apps/client/src/battle-session.ts:1`: moved `import { battleStampCopy } from "./verdict/copy"` to the end of the local import block, after `import type { FightCasting } from "./staging"`.
- `apps/client/src/battleHud.ts:157`: destructuring wrapped exactly as printed by Biome (`const {` / `root: stamp,` / `title: stampTitle,` / `sub: stampSub,` / `} = buildStampView(`).
- `apps/client/src/cup/view-models.test.ts:10`: moved `import { cupResultCopy } from "../verdict/copy"` before the `./view-models` import block, after the `@apex/sim` block.

**Denied command (not retried or worked around beyond applying the fixes by hand):**

| Command | Result |
| --- | --- |
| `bunx biome check --write apps/client/src/verdict/stamp.ts apps/client/src/verdict/stamp.test.ts apps/client/src/battle-session.ts apps/client/src/battle-session.test.ts apps/client/src/battleHud.ts apps/client/src/battleHud.test.ts apps/client/src/cup/view-models.ts apps/client/src/cup/view-models.test.ts apps/client/src/cup/screens/results.ts` | Permission denied: shell |

**Re-run results:**

| Command | Result |
| --- | --- |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/stamp.test.ts apps/client/src/battle-session.test.ts apps/client/src/battleHud.test.ts apps/client/src/cup/view-models.test.ts apps/client/src/battleUI.test.ts` | exit 0 — `106 pass / 0 fail`, `220 expect()` calls, 5 files. |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts` | exit 0 — `5 pass / 0 fail`, 12 KB cap green. |

**Commit:** `d6678eb0d65ccd6d50d26e1614ef3bb54acf3fee` — `fix(verdict): preserve cup stamp layout and format adapters` (6 files changed, 60 insertions, 12 deletions). The evidence file remains uncommitted for the primary. No CSS, `live/state.ts`, audio, sim, save or full-gate changes were made.

## Rework 2

**Trigger:** The primary's full `bun run verify` failed at its first leg, `bun run check`, with an unresolved TypeScript import that the phase-scoped tests do not exercise:

```
@apex/client check: <error file="src/cup/screens/results.ts" line="5" column="32" code="TS2307">
@apex/client check: Cannot find module '../verdict/stamp' or its corresponding type declarations.
```

**Exact fix:** In `apps/client/src/cup/screens/results.ts:5`, changed `import { buildStampView } from "../verdict/stamp"` to `import { buildStampView } from "../../verdict/stamp"`. One line only; no behavior, DOM, CSS, sim, save, audio or live-code changes.

**Import scan:** `grep` for `verdict/stamp` across `apps/client/src` found exactly two imports — `apps/client/src/battleHud.ts:15` (`./verdict/stamp`, correct) and `apps/client/src/cup/screens/results.ts:5` (now `../../verdict/stamp`). No other wrong path exists.

**Re-run result:**

| Command | Result |
| --- | --- |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/stamp.test.ts apps/client/src/battle-session.test.ts apps/client/src/battleHud.test.ts apps/client/src/cup/view-models.test.ts apps/client/src/battleUI.test.ts` | exit 0 — `106 pass / 0 fail`, `220 expect()` calls, 5 files. |
| `bunx biome check apps/client/src/cup/screens/results.ts` | Permission denied: shell — not retried or worked around; the primary's scoped check remains authoritative. |

**Commit:** `b32f6318f9ff083f78b3406e2180c6f644854929` — `fix(verdict): correct shared stamp import path` (1 file changed, 1 insertion, 1 deletion). The evidence file remains uncommitted for the primary, who will re-run the full chained gate (`bun run verify`).

## Primary verification

**Scope and squash guard:** Primary checked the phase range `536a3ec32374b3dafb05c6a40ca72903d0e246bd..HEAD`. `git diff --name-only` returned exactly the nine declared Touches: `apps/client/src/verdict/stamp.ts`, `stamp.test.ts`, `apps/client/src/battle-session.ts`, `battle-session.test.ts`, `apps/client/src/battleHud.ts`, `battleHud.test.ts`, `apps/client/src/cup/view-models.ts`, `view-models.test.ts`, `cup/screens/results.ts`. The range contained only the four reported commits — `682f3d6d` (test pins), `f093128a` (implementation), `d6678eb0` (Rework 1), `b32f6318` (Rework 2) — with no merge or user commits. The only working-tree change was the untracked evidence file. Sizes: `battleHud.ts` 12,069 B, `stamp.ts` 1,056 B, `view-models.ts` 7,588 B, all under the 12 KB client cap.

**Independent checks:**

| Command | Result |
| --- | --- |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/stamp.test.ts apps/client/src/battle-session.test.ts apps/client/src/battleHud.test.ts apps/client/src/cup/view-models.test.ts apps/client/src/battleUI.test.ts` | exit 0 — `106 pass / 0 fail`, `220 expect()` calls, 5 files. |
| `bunx biome check` on all nine phase-2 files | exit 0 — `Checked 9 files in 49ms. No fixes applied.` |
| `bun run check` | exit 0 — no type errors in voxel (214), sim (253), server (185), client (560) files. |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts` | exit 0 — `5 pass / 0 fail`; 12 KB cap green. |
| `bun test --check --parallel --timeout 120000` | exit 0 — `4581 pass / 1 skip / 0 fail`, `Ran 4582 tests across 445 files [156.84s]`. |
| `(bun run verify && bun run build)` | exit 0 — typecheck, unit suite, Biome (`Checked 1055 files`), and determinism gate green for all archetype GLBs and 5 props; Vite built 443 modules to `dist/assets/index-BIKtLxEf.js` (1,109.29 kB) and `index-D45x_3yC.css` (71.62 kB), with only the pre-existing chunk-size warning. |

**Acceptance and presentation invariants:** The two reworks are resolved. The shared copy model owns every verdict string; the shared stamp view builds the same four `div`s, exact class names, and `role="status"`/`aria-live="polite"` only when requested. Cup results pass `{ parentChildren: false }` so `.cup-result-stamp`, `.cup-result-title`, `.cup-result-rule` and `.cup-result-sub` remain flat siblings of `.cup-result-card`, preserving its original `flex-direction: column` and `gap: 1cqw` layout. No CSS, live invite, audio, sim, save or generated file changed. FR-1, FR-2, FR-3, FR-4, AC-2, AC-3, AC-4, AC-7, NFR-3 and NFR-5 are satisfied for this phase. Ready for squash and plan acceptance.
