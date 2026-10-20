# Phase R1 evidence — review fixes

Base: `7144a7c` (end of Phase 2 / doc sync). Checkpoint: `b81c1ce`.

## Findings and resolutions

| Finding | Severity | Resolution |
| --- | --- | --- |
| F1 `ui/tabs.ts` unpinned | Medium | `size-probe.test.ts` `MODULES` now lists `ui/tabs.ts`; the probe's docstring already explains the narrow guard scope |
| F2 Phase 2 status stale | Low | `plan.md` Phase 2 line 57 now `Status: verified` |
| F3 `sync` write described as unobservable | Low | Kept the write (it is what makes a Growth entry after a settlement fresh — proven by `creature-detail.test.ts` "leaving and returning to Growth paints the latest state", which fails if the write is removed) and rewrote both the interface doc and the inline comment to say so |
| F4 shell CSS in `kit.css` | Low | `.creature-detail-box`, `.detail-tabs`, `.detail-tab`, `.detail-tab[aria-selected]`, `.detail-panel`, `.detail-panel[hidden]` moved into `ranch.css` beside the other `.detail-*` rules; the duplicated `text-align` removed |
| F5 Phase 2 evidence head commit | Low | `verification/phase-2.md` now names `c0f3491` |
| F6 panels unreachable by keyboard scroll | Low | `createTabs` sets `panel.tabIndex = 0`; the wiring test asserts it for every panel |

## Verification

| Command | Exit | Result |
| --- | --- | --- |
| `bun test apps/client/src/ui/tabs.test.ts apps/client/src/creature-detail.test.ts apps/client/src/size-probe.test.ts` | 0 | 29 pass, 0 fail, 182 expect() calls |
| `bun run check` | 0 | client 237 files, no type errors |
| `bunx biome check` | 0 | 398 files, 0 errors, 7 pre-existing warnings |
| `bun run verify` | 0 | suite, biome, typecheck and determinism gate all green |
| `bun run build` | 0 | chunk-size warning only (pre-existing) |

## Live check after the CSS move

Dev server at `localhost:5173`: computed `max-height: 658.76px`, `grid-template-rows: auto auto minmax(0px, 1fr) auto`, `.detail-tabs` margin `10px 0px 12px`, active panel `tabIndex 0` — identical to the pre-move values, loaded from `ranch.css`.
