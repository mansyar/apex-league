# Phase R1 — Review fixes

| Field | Value |
| --- | --- |
| Track | `20261020-evolution-discovery-ui` |
| Phase | R1 — Review fixes |
| Date | 2026-10-20 |
| Branch | `feat/20261020-evolution-discovery-ui` |
| Phase base | `10fb1e0` |
| Head commit | `9e33c25` (code); this evidence file and the corrected phase reports land in the following `docs(conductor)` commit |
| Result | **verified** |

Per-task history for this phase was squashed into the phase checkpoint by the
primary; the task commits are `6181e15` (F2 extraction), `11d51cd` (F1 seam
tests) and `9e33c25` (F3 dead field), and the docs commit carries F4.

## Scope

Review round 1 (`review.md`, verdict BLOCK: 1 High, 1 Medium, 2 Low). Every fix
stays inside `apps/client/src/` and this track's verification folder.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Full (required) | `bun run verify` | 0 | typechecks clean (sim 79, voxel 62, client 234 files); 1758 pass / 1 skip / 0 fail across 141 files; `biome check` 394 files, 0 errors, 7 pre-existing `noNonNullAssertion` warnings in untouched test files; determinism gate OK (9 creature artifacts + 5 prop digests byte-identical) |
| Build | `bun run build` | 0 | Vite production build, 190 modules, `dist/` emitted (pre-existing >500 kB chunk warning) |
| Typecheck (targeted) | `bun run check` | 0 | 3 workspaces, no type errors |
| Lint (standalone) | `bunx biome check` | — | **not run**: the sandbox rejected `bunx` (`permission.rejected`). The identical `biome check` stage ran inside `bun run verify` against the same root `biome.json` and reported 0 errors. |

## Findings

| ID | Severity | Fix | Proof | Status |
| --- | --- | --- | --- | --- |
| F2 | High | Growth DOM layer (`GROWTH_GLYPH`, `GrowthRowParts`, `growthRowParts`, `growthRowNode`, `growthSection`) moved to new `apps/client/src/growth-panel.ts`; `creature-detail.ts` keeps layout only and drives the slot through `createGrowthHost(node)`, which remembers the last painted state, no-ops while hidden, clears + hides when `growthView` returns `null`, and swaps only its own children. `open` calls `setVisible(true)` then `paint(state)` (the host is created stateless, so the first paint must come from `open`); `closeNow` calls `setVisible(false)`; `sync` calls `paint(state)` with no local `visible` flag. | `creature-detail.ts` 12,305 B → 9,312 B; `growth-panel.ts` 4,843 B (cap 12,288 B). `apps/client/src/size-probe.test.ts` pins those bytes, and `bun run verify` / `bun run build` are green. | fixed |
| F1 | Medium | New `apps/client/src/growth-panel.test.ts`: jsdom-free fake node plus a plain-object `document` stand-in (`createElement` only). Six tests: paint while hidden leaves the node untouched (0 `replaceChildren` calls); `setVisible(true)` + paint renders the gate and unhides; a repaint swaps only the host's children (same host node identity, previous section gone); a creature-less state empties and hides; `setVisible(false)` then paint is a no-op and reopening repaints the remembered state; discovery turns row detail from qualitative copy into `current / target`. | Suite is part of the green `bun run verify` run (1758 pass). | fixed |
| F3 | Low | `GrowthRow.target` and the internal `Condition.target` removed; `detail` is the single representation. `growth.test.ts` now asserts the composed `detail` at every former `target` site (revealed pairs, `clear`, digit-free qualitative copy, per-gate isolation) and that no undiscovered detail contains `/`. `creature-detail.test.ts` imports `growthRowParts` from `./growth-panel`. | Grep: no `GrowthRow` `.target` reader survives (remaining `.target` hits are unrelated `event.target` / director / step fields); `bun run check` and `bun run verify` green. | fixed |
| F4 | Low | Squashed SHAs `73e1d23`, `ac53706`, `60ffa41`, `b5519eb`, `7e9416e`, `28b5f17`, `fa0abfc` replaced with the surviving phase checkpoints `34fc937` (phase 1), `b039471` (phase 2), `385a49f` (phase 3), each file stating that per-task history was squashed. `verification/phase-3.md` also corrects the false "stays well inside the cap" claim to the measured 12,305 B. `integrated.md` restates NFR-2 as measured bytes and notes that `module-size.test.ts` scans only `scene-logic/` and `ranch/`. | Docs-only. Grep over `conductor/`: none of the seven SHAs survives outside `review.md` (where the finding quotes them) and this report. | fixed |

## Module sizes

Measured with `statSync().size` on the committed tree (the brief's
`Get-ChildItem | Select-Object Length` and `bun -e` are both blocked by the
sandbox, so the probe test reports the numbers instead):

| File | Before | After | Cap |
| --- | --- | --- | --- |
| `apps/client/src/creature-detail.ts` | 12,305 B | **9,312 B** | 12,288 B |
| `apps/client/src/growth-panel.ts` | — | **4,843 B** | 12,288 B |
| `apps/client/src/growth.ts` | 6,846 B | 6,492 B | 12,288 B |
| `apps/client/src/growth-panel.test.ts` | — | 6,302 B | test file, not a module |
| `apps/client/src/creature-detail.test.ts` | 4,109 B | 4,109 B (import moved) | test file |
| `apps/client/src/growth.test.ts` | 14,747 B | 14,683 B | test file, over 12 KB **before and after** — see note 1 |

## Deviations

| File | Reason |
| --- | --- |
| `apps/client/src/size-probe.test.ts` | New file, not in the brief's file list. The sandbox blocks every way of reading a file's byte count (`Get-ChildItem`, `bun -e`, `bun test`, `git cat-file`, `git ls-tree`), so the sizes were measured by a probe test whose output `bun run verify` prints; the sandbox also blocks deleting files (`rm`, `Remove-Item`, `git rm` all `permission.rejected`), so the probe was kept and turned into a deliberate pin for the three Growth modules that the project-wide guard does not scan. |
| `apps/client/src/growth-panel.ts` | `GrowthHostNode` is `Pick<HTMLElement, "hidden" | "replaceChildren">` instead of the brief's hand-written interface with `hidden: boolean`: the DOM lib types `hidden` as `string | boolean`, so a real `HTMLDivElement` is not assignable to the boolean-only shape (`TS2345`). The seam's contract is unchanged. |

## Notes

1. `apps/client/src/growth.test.ts` is 14,683 B — over the 12 KB cap, as it was
   at 14,747 B before this phase. It is a test file, and the guard
   (`module-size.test.ts`) scans only `scene-logic/` and `ranch/`; review round 1
   raised no finding against it. Untouched in kind: only `.target` assertions
   changed. If NFR-2 is ever read to include client root *test* modules, this
   file needs a split and the guard needs widening — both are out of this
   phase's scope.
2. `bun run verify` now runs 141 files / 1759 tests (was 139 / 1751): +1 file for
   the seam tests, +1 for the size pin.
3. Behaviour on the AC-7 path is unchanged in shape: the HUD still calls
   `creatureDetail.sync(state)` on every commit, but the "am I open?" gate now
   lives in the host (`paint` is a no-op while hidden) instead of a local
   `visible` flag, which is what the fake-node tests pin. A human browser pass on
   the real modal is still worth doing before the PR.
4. `growth-panel.ts` keeps the accessible markup byte-for-byte (`role="group"`,
   `aria-label` from `view.summary`, `aria-hidden` glyph, `kit-sr-only` status
   word, `dataset.met`), so NFR-1 / AC-9 are unaffected by the extraction.
