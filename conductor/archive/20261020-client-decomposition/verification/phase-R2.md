# Phase R2 — Review Fixes

- Track: `20261020-client-decomposition`
- Phase: R2 (round-2 findings N1-N4)
- Branch: `feat/20261020-client-decomposition`
- Base: `bbf396f` (round-two fix phase opened)
- Date: 2026-10-20

## Findings and resolutions

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| N1 | Medium | `phase-5.md` and `integrated.md` still described the in-repo `__guard-negative-control-<pid>.ts` fixture and `existsSync(path)` after the control moved to a temp folder; `phase-5.md` also carried the superseded "exact text for the primary" block | AC-3 rows in both files describe the `oversized.tsx` temp-folder control, the recursive `finally`, and the directory-absence assertion; the obsolete insert block is replaced by a one-paragraph deviation saying the primary wrote the note |
| N2 | Low | The guard description still said "every `.ts` file", `readdirSync` recursion and `*.test.ts` only | `phase-5.md` walk/exclusion items and its AC-2 row, plus `integrated.md` AC-2, now state the `statSync` directory follow, the `.ts`/`.tsx`/`.mts` set and the `*.test.*` exemption |
| N3 | Low | `writeFileSync` sat outside the `try`, so a write failure leaked the temp folder | The write is inside the `try`; `finally` always removes the directory |
| N4 | Low | The `tech-stack.md` note opened with "every `.ts` file" while a later sentence listed three extensions | The opening clause names `.ts`, `.tsx` and `.mts`; the note reads as one rule from start to finish |

## Commands

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| guard suite | `bun test apps/client/src/module-size.test.ts` | 0 | 5 pass, 0 fail, 15 `expect()` |
| lint (guard) | `bunx biome check apps/client/src/module-size.test.ts` | 0 | 1 file, no fixes needed |
| full gate | `bun run verify` | 0 | typecheck + biome + suite + determinism |
| build | `bun run build` | 0 | @apex/client built |

Determinism gate output unchanged (axolotl champion byte-identical; five prop digests
match).

## Acceptance

| Finding | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| N1 | No AI-facing record describes the retired fixture | AC-3 rows in `phase-5.md`/`integrated.md`; insert block removed | met |
| N2 | The guard prose matches the code in one reading | `phase-5.md` items 1-2, AC-2 rows in both files | met |
| N3 | Every failure path removes the temp folder | `try` opens before `writeFileSync`; `finally` removes recursively | met |
| N4 | The note states one version of the rule | `tech-stack.md` guard bullet | met |
