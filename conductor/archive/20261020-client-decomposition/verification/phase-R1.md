# Phase R1 — Review Fixes

- Track: `20261020-client-decomposition`
- Phase: R1 (round-1 findings F1-F5)
- Branch: `feat/20261020-client-decomposition`
- Base: `507e099` (review record commit)
- Checkpoint: `440965b`
- Date: 2026-10-20

## Findings and resolutions

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| F1 | Medium | Phase reports cited head SHAs that were squashed away | Every report now names its checkpoint (`d5b0117`, `9511846`, `97a9bba`, `3466438`, `57ac657`) and states that the task commits were squashed into it; the per-task SHA tables carry the same note, and `integrated.md` no longer points at the folded formatting commit |
| F2 | Medium | `phase-5.md` and `integrated.md` disagreed on the suite counts, and "six tests" contradicted the guard's five | One statement everywhere: 142 files, 1789 tests, 1788 pass, 1 skip, 0 fail, 84,605 `expect()` calls; the guard is described as five tests |
| F3 | Low | The walk skipped symlinked folders and measured only `.ts` | `moduleFiles` now branches on `statSync(full).isDirectory()` so a linked folder is walked, and `isModule` measures `.ts`, `.tsx` and `.mts`; `.test.*` and `vite-env.d.ts` stay exempt, and the report footer names the exemption pattern |
| F4 | Low | The negative control wrote its fixture into `apps/client/src` | The fixture is now an oversized `oversized.tsx` in `mkdtempSync(join(tmpdir(), "apex-guard-"))`, measured by the same `moduleFiles`/`capReport`, removed recursively in `finally`, and the directory's absence is asserted |
| F5 | Low | The `tech-stack.md` note misquoted the report format | The note quotes the real line (`hud.ts — 15121 B (2833 B over the 12288 B cap)`, largest first, header + footer) and records the widened extensions and the temp-folder control |

## What changed in the guard

- `isModule` uses `SOURCE_EXTENSIONS = /\.(ts|tsx|mts)$/`, excludes any `*.test.*` name
  and `vite-env.d.ts`.
- `moduleFiles` follows the target type rather than the dirent, so symlinked folders are
  measured.
- The negative control exercises the same walk and report as the real assertion, but on a
  temp folder: nothing is ever written into the repo, and a killed run cannot leave an
  offender behind.
- `capReport` footer now reads `Only *.test.ts, *.test.tsx and vite-env.d.ts are exempt.`

## Commands

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| guard suite | `bun test apps/client/src/module-size.test.ts` | 0 | 5 pass, 0 fail, 15 `expect()` |
| lint (guard) | `bunx biome check apps/client/src/module-size.test.ts` | 0 | 1 file checked, no fixes needed |
| full gate | `bun run verify` | 0 | typecheck + biome + suite + determinism |
| unit | `bun test --timeout 120000` | 0 | 1788 pass, 1 skip, 0 fail (1789 tests), 142 files, 137.70 s |
| build | `bun run build` | 0 | @apex/client built |

Determinism gate output unchanged (axolotl champion 221,284 B, 3,286 tris; five prop
digests match).

## Acceptance

| Finding | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| F1 | No phase report names a SHA that is absent from the branch | checkpoint lines in `phase-1..5.md`; squash notes above the per-task SHA tables; `integrated.md:71` rewritten | met |
| F2 | One consistent suite statement | counts above and in `phase-5.md` / `integrated.md` | met |
| F3 | A `.tsx` module and a linked folder are both measured | guard's negative control measures an `oversized.tsx`; the walk follows `statSync` | met |
| F4 | The control leaves nothing behind and works on a read-only tree | fixture lives in the OS temp dir; `finally` removes it recursively; absence asserted | met |
| F5 | The note quotes the emitted format | `tech-stack.md` guard bullet | met |
