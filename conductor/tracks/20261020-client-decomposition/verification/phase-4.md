# Phase 4 — Screens and dev harness

- **Track:** `20261020-client-decomposition`
- **Phase:** 4 (Screens and dev harness) — FR-4, FR-5, NFR-2
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-client-decomposition`
- **Base commit:** `9d3da46` (phase-3 checkpoint parent: "Mark phase 'Screens and dev harness' as in progress")
- **Head commit:** `11d69c9`
- **Result:** verified — the four over-cap screen modules are under 12,288 B, every
  public surface is unchanged, and `bun run verify && bun run build` is green.

## Seam map

### `cup-screens.ts` → `cup/screens/`

| Module | Size | Contents |
| --- | --- | --- |
| `cup/screens/bracket.ts` | 5,380 B | `MatchCard`, `BracketScreenRefs`, `buildBracketScreen` |
| `cup/screens/coach.ts` | 2,264 B | `CoachScreenRefs`, `buildCoachScreen` |
| `cup/screens/results.ts` | 2,203 B | `ResultsScreenRefs`, `buildResultsScreen` |
| `cup/screens/giveup.ts` | 2,567 B | `GiveupModalRefs`, `buildGiveupModal` |
| `cup/screens/battle-chips.ts` | 660 B | `buildBattleChips` |
| `cup-screens.ts` (facade) | 826 B | re-exports only |

`bracket.ts` keeps the only imports (`BRACKET_SLOTS`, `bracketPlan`), `giveup.ts`
the only other one (`focusTrap`); coach, results and battle chips were already
import-free. Types live in the leaf modules they belong to, never in the facade,
so there is no facade ↔ leaf cycle.

### `spar.ts` → `spar/`

| Module | Size | Contents |
| --- | --- | --- |
| `spar/panel.ts` | 6,155 B | `buildSparPanel` — chip, overlay, panel, cards, loadout row, tactics, chips row, `SparPanelRefs` |
| `spar/setup.ts` | 2,705 B | `renderRival`, `refreshPrep` (kit picker + progress + hint) |
| `spar/casting.ts` | 1,772 B | `castingFor`, `fightNowFor` |
| `spar/copy.ts` | 1,158 B | `TEMPERAMENT_LINES`, `TACTIC_PREVIEWS`, `TACTIC_LABELS` |
| `spar/types.ts` | 2,554 B | `SparHandlers`, `Spar`, `SparSetup`, `SparPanelRefs` |
| `spar.ts` | 7,675 B | `createSpar`: session wiring, `runBattle`/start path, open/close, listeners, `update`/`setPaused` |

Seam adjustment recorded below: the fight payload builder became
`fightNowFor(setup)` in `spar/casting.ts` (it was an inline object literal in
`runBattle`) and the panel refs moved to `spar/types.ts` — both mechanical
extractions needed to keep `spar.ts` under the cap without a facade-plus-body.

### `graduation.ts` → `graduation/`

| Module | Size | Contents |
| --- | --- | --- |
| `graduation/copy.ts` | 3,062 B | `confirmCopy`, `confirmLabel`, `lineageSummary`, `floorSummary`, `perkLabels`, `hallEntryLabel`, `hallEntryMeta`, `hatchFailureCopy` |
| `graduation/modal.ts` | 2,010 B | `modalShell`, `wireModal`, `openerElement` |
| `graduation/egg.ts` | 3,480 B | `buildEgg`, `renderEgg` (starter overlay, floors, perks) |
| `graduation/hall.ts` | 3,469 B | `buildHall`, `renderHall` (entries, scalps, empty states) |
| `graduation/flow.ts` | 4,277 B | `createGraduation` — confirm modal, egg, hall, nursery, focus/close wiring |
| `graduation/types.ts` | 1,396 B | `GraduationHandlers`, `GraduationFlow` |
| `graduation.ts` (facade) | 884 B | re-exports only |

### `mock.ts` → `mock/`

| Module | Size | Contents |
| --- | --- | --- |
| `mock/data.ts` | 3,097 B | `el`, `figure`, canned stats/conditions, crest elements, starter cards, tier rows, motion notes |
| `mock/sections.ts` | 9,089 B | `buildHeader`, `buildStage`, `buildStarterSection`, `buildResponsiveSection`, `buildNotes` |
| `mock/showcase.ts` | 4,156 B | `buildShowcase` — the kit primitive grid |
| `mock.ts` (entry) | 1,267 B | four CSS side-effect imports + one `document.body.append(...)` |

The four section banners in the old file became the module boundaries
(header/ranch stage + starter + responsive + notes); the showcase banner became
`showcase.ts`. `mock.html` still boots `src/mock.ts` and did not change.

## Commands

| Command | Result |
| --- | --- |
| `bun run --filter @apex/client check` (fast loop, after each task) | exit 0 — 287 files, no type errors |
| `bun run verify` (attempt 1) | exit 1 — two `biome check` errors (export order in `cup-screens.ts`, one reflow in `spar/setup.ts`); typecheck and tests inside that run were green |
| `bun run verify` (attempt 2, after the two formatting fixes) | **exit 0** — check 62/79/287 files, 1787 pass / 1 skip / 0 fail, 84595 expects, biome 449 files with the 7 pre-existing `noNonNullAssertion` warnings only, determinism gate byte-identical |
| `bun run build` | **exit 0** — 232 modules, `dist/index.html` 2.13 kB, css 56.48 kB, js 824.34 kB |

Fast loop note: `bun run --filter @apex/client check` is the client typecheck
(`tsgo`), and it was run after each of the four task commits; it catches every
import/export break in all 287 files, which is why the four commits needed no
import fixups.

## Acceptance criteria

| AC | Criterion | Result |
| --- | --- | --- |
| AC-3 | Every touched/created module < 12,288 B; no facade is the largest module | pass — largest is `mock/sections.ts` 9,089 B (−26%); facades are 826 / 884 / 1,267 B and `spar.ts` 7,675 B |
| AC-4 | `bun run verify && bun run build` | pass — both exit 0 (see table) |
| AC-5 | Browser smoke: cup run, graduation from a seeded save, `mock.html` | **not run by agent** — primary's step (no dev server or browser from this subagent) |
| AC-6 | `hud.ts`, `cup.ts`, `spar.ts`, `graduation.ts`, `scene.ts` export the same names | pass — `cup-screens.ts`, `spar.ts`, `graduation.ts` keep every previously exported name (`MatchCard`, the four `*Refs` types, five builders; `SparHandlers`, `Spar`, `createSpar`; `GraduationHandlers`, `GraduationFlow`, eight helpers, `createGraduation`); `mock.ts` exported nothing and still exports nothing; `hud.ts`/`cup.ts`/`scene.ts` untouched |
| AC-7 | No new import cycles | pass — see the import audit |

## Byte sizes

| File | Before | After |
| --- | --- | --- |
| `cup-screens.ts` | 12,617 | 826 |
| `cup/screens/bracket.ts` | — | 5,380 |
| `cup/screens/coach.ts` | — | 2,264 |
| `cup/screens/results.ts` | — | 2,203 |
| `cup/screens/giveup.ts` | — | 2,567 |
| `cup/screens/battle-chips.ts` | — | 660 |
| `spar.ts` | 17,477 | 7,675 |
| `spar/panel.ts` | — | 6,155 |
| `spar/setup.ts` | — | 2,705 |
| `spar/casting.ts` | — | 1,772 |
| `spar/copy.ts` | — | 1,158 |
| `spar/types.ts` | — | 2,554 |
| `graduation.ts` | 14,807 | 884 |
| `graduation/copy.ts` | — | 3,062 |
| `graduation/modal.ts` | — | 2,010 |
| `graduation/egg.ts` | — | 3,480 |
| `graduation/hall.ts` | — | 3,469 |
| `graduation/flow.ts` | — | 4,277 |
| `graduation/types.ts` | — | 1,396 |
| `mock.ts` | 15,285 | 1,267 |
| `mock/data.ts` | — | 3,097 |
| `mock/sections.ts` | — | 9,089 |
| `mock/showcase.ts` | — | 4,156 |

Every existing sibling module is unchanged (`cup/view-models.test.ts` 12,095 B is
the largest file in these folders and is a test, out of the guard's scope).

## Import audit (AC-7)

| From | To |
| --- | --- |
| `cup-screens.ts` | `./cup/screens/{battle-chips,bracket,coach,giveup,results}` |
| `cup/screens/bracket.ts` | `@apex/sim`, `../../bracket-model` |
| `cup/screens/giveup.ts` | `../../battleUI` |
| `spar.ts` | `@apex/sim`, `./battle-session`, `./battleHud`, `./battleUI`, `./spar/{casting,log,panel,setup,types}` |
| `spar/panel.ts` | `@apex/sim` (type), `../battleUI`, `../ui/{icons,kit}`, `./copy`, `./types` |
| `spar/setup.ts` | `@apex/sim`, `../battleUI`, `../element`, `./copy`, `./loadout-vm`, `./types` |
| `spar/casting.ts` | `@apex/sim` (type), `../battle-session` (type), `../battleUI`, `../staging`, `../staging-seed`, `./types` |
| `spar/copy.ts` | `@apex/sim` (types) |
| `spar/types.ts` | `@apex/sim` (types), `../battleUI` (type), `../staging` (type) |
| `graduation.ts` | `./graduation/{copy,flow,types}` |
| `graduation/flow.ts` | `@apex/sim` (type), `../ui/kit`, `./copy`, `./egg`, `./hall`, `./modal`, `./nursery`, `./types` |
| `graduation/egg.ts` | `@apex/sim`, `../ui/kit`, `./copy` |
| `graduation/hall.ts` | `@apex/sim`, `../ui/kit`, `./copy`, `./modal` |
| `graduation/copy.ts` | `@apex/sim`, `./nursery-vm` |
| `graduation/modal.ts` | `../battleUI` |
| `graduation/types.ts` | `@apex/sim` (types) |
| `mock.ts` | CSS side effects, `./mock/sections`, `./mock/showcase` |
| `mock/sections.ts` | `../handbook`, `../hud`, `../settings-modal`, `../ui/{kit,icons}` via data, `./data` |
| `mock/showcase.ts` | `../ui/{icons,kit}`, `./data` |
| `mock/data.ts` | `@apex/sim` (type) |

Graph is a DAG in every new folder: leaves → `copy`/`data`/`types`/`modal`, then
`setup`/`egg`/`hall`/`sections`/`showcase`, then `spar.ts`/`flow.ts`/`mock.ts` and
the facades. No leaf imports its facade — no new cycle, and the
screen → view-model → kit/sim direction is preserved.

Importer audit (unchanged, no edits needed): `cup.ts`, `cup/shared.ts`
(`./cup-screens`); `app/screens.ts`, `app/runtime.ts` (`../spar`);
`app/screens.ts`, `app/hud-screen.ts`, `graduation.test.ts` (`../graduation`);
`mock.html` → `/src/mock.ts`.

## Behaviour identity

1. **String-literal set comparison** against `9d3da46` (gitignored artifact
   `.conductor/evidence/phase-4/identity.test.ts`): every pre-split literal —
   copy, class names, selectors, ARIA strings — is present post-split.
   `cup-screens` 86/86 with zero additions, `mock` 180/180 with zero additions,
   `graduation` 76 → 77, `spar` 73 → 74. The only additions are a type-position
   string (`SparHandlers["onSetLoadout"]`) and a JSDoc mention of `onPick`; the
   two "changed" template literals differ only in indentation of an
   interpolation, not in runtime text.
2. **Append-order comparison** (`git grep "append(" 9d3da46` vs the new files):
   all 21 cup screen appends, all 11 spar panel appends, all 20 graduation
   appends across `modal`/`egg`/`hall`/`flow`, and every mock append (2 in
   `data`, 26 in `showcase`, 28 across the section builders, plus the final
   `document.body.append(...)`) match one-for-one in order with identical
   arguments.
3. Typecheck (287 files) and the full suite (1787 pass / 1 skip) are green, so
   every importer and every view-model contract still resolves.

## Commits

| Commit | Task | Message |
| --- | --- | --- |
| `c0a461a` | P4.T1 | `refactor(client): split the cup screens into per-screen modules` |
| `44e48f9` | P4.T2 | `refactor(client): split the spar into panel, setup and casting modules` |
| `24c2466` | P4.T3 | `refactor(client): split the graduation surfaces into copy, shell and flow modules` |
| `3d42d3b` | P4.T4 | `refactor(client): split the design mock into data, sections and showcase` |
| `11d69c9` | — | `style(client): sort the cup facade exports and reflow the spar rival line` (the two `biome check` errors from verification attempt 1; formatting only) |

## Deviations

| File | Reason |
| --- | --- |
| `spar/types.ts`, `spar/casting.ts` (not in the brief's seam list) | The brief's spar seam ("screen build, setup rows, casting/start path") does not fit under the cap as written: `createSpar` alone (session wiring + fight path + open/close) is 7,675 B and the panel body 6,155 B. Splitting the panel's `*Refs` interface into its own module and lifting the inline `fightNow` literal into `fightNowFor` are pure extractions; naming follows the folder theme. Recorded per the brief's "if a seam does not fit, move the boundary". |
| `graduation/types.ts`, `mock/data.ts` | Same rule: contracts and the canned data are the natural shared modules for their folders, so the facades stay re-exports and the flow/section modules stay readable. |
| `spar/setup.ts` — `renderRival(refs, setup, battleSeed)` and `refreshPrep(refs, creature, onSetLoadout)` take the panel refs as a first parameter | The DOM nodes they write now belong to the panel module; only the parameter list changed, no logic or ordering. |
| `spar/casting.ts` — `fightNowFor(setup)` returns `PlaybackFight` | Was an inline object literal inside `runBattle`; extracted verbatim so the casting module owns the payload type. |
| `mock/data.ts` — `ELEMENTS` renamed `CREST_ELEMENTS` | The element list and the `el()` helper now share one module and read confusingly side by side; rename only, values and order unchanged. |

Nothing outside `Touches` was edited: no test file, no HTML entry, no
`vite.config.ts`, no `plan.md`/`spec.md`/`metadata.json`/`tracks.md`/docs.
`git status` is clean at `11d69c9`.

## Notes

- Biome's import sorter orders export specifiers case-insensitively by name, so
  `BracketScreenRefs` must precede `buildBracketScreen`; the cup facade is the
  only place where a type had to move ahead of a value.
- `mock.ts` is a dev entry, not a build input (`vite.config.ts` lists no extra
  inputs and `vite build` emits only `index.html`), so the mock is covered by the
  typecheck (287 files) and by the primary's `mock.html` smoke, not by `build`.
- The phase-4 preliminary measurement used a gitignored `statSync` probe
  (`.conductor/evidence/phase-4/sizes.test.ts`) because `git ls-tree -l` is not
  in this subagent's allowed shell surface.
- For phase 5: the guard's walk will see 19 new files; the largest non-test
  module under `apps/client/src` is now `graduation/nursery.ts` 11,613 B and
  `cup/view-models.test.ts` 12,095 B is a test, so the cap holds tree-wide.

## Primary verification

Not run by this agent: cup run, graduation-from-seeded-save, and `mock.html`
smoke in a browser (AC-5) — the brief assigns the visual layer to the primary.

## Primary verification

Run by the orchestrator on `feat/20261020-client-decomposition`, HEAD `bab2e17`.

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| full gate | `bun run verify` | 0 | typecheck, biome, suite and determinism gate green |
| build | `bun run build` | 0 | @apex/client build, only the chunk-size advisory |

### Screen smoke (AC-5)

Headless Playwright against the dev server, fresh profile:

- **Cup:** advanced days until the `Enter Cup` chip enabled, entered: the bracket rendered with `CUP DAY Bronze Cup DAY 7 · SINGLE ELIMINATION QUARTERFINALS SEMIFINALS FINAL 🏆 CHAMPION` and the entry line `Ember Drake steps into the b…`. No console or page errors.
- **Graduation:** seeded a champion at day 70, reloaded, the dock's Graduate chip enabled, and the modal rendered `GRADUATE EMBER DRAKE — Ember Drake has had a full career. Retire Ember Drake to the Hall of Fame and pass a stat floor to the next egg? NOT YET / GRADUATE`. The retirement was not confirmed in this pass, so the hatch screen was not exercised; it is covered by the suite.
- **Dev harness:** `mock.html` booted, rendering the design mock (`DESIGN MOCK · BROADCAST_HUD_20261011 · APPROVED …`, 3,184 characters of content) with no page errors.

`vite.config.ts` declares no extra build inputs, so `mock.ts` is covered by the typecheck and this smoke rather than by `bun run build`.
