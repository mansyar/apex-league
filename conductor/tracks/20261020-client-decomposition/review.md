# Review — Client Module Decomposition & Size Guard

- Track: `20261020-client-decomposition`
- Review round: 1
- Range: `dde88d1..4aa6df3` (code scope `apps/ packages/ docs/`; `conductor/` reviewed as records)
- Verdict: **PASS WITH FINDINGS**
- Fix commit: this track's `## Phase R1` checkpoint

## Summary

The decomposition is a faithful relocation. Boot order, the eight `store.subscribe`
registrations, DOM construction order, user-facing copy and rendering constants all
match `dde88d1`; public export surfaces are identical across the nine facades. Two
record defects (dangling head SHAs, contradictory suite counts) and three guard-quality
gaps (symlinked folders and non-`.ts` sources invisible to the walk, a fixture written
into the repo, and a misquoted report format in the tech-stack note) needed fixing.

## Verification (measured by the lead, final tree)

| Layer | Command | Result |
| --- | --- | --- |
| unit | `bun test --timeout 120000` | 1788 pass, 1 skip, 0 fail (1789 tests), 84,605 `expect()`, 142 files |
| unit (CI mode) | `bun test --check --parallel --timeout 120000` | same counts, 22.86 s |
| typecheck | `bun run check` | clean |
| lint | `bunx biome check` | 448 files, 0 errors, 7 pre-existing warnings |
| determinism | `bun run gate:determinism` | byte-identical (axolotl 221,284 B) |
| build | `bun run build` | exit 0 |
| smoke | Playwright, final tree | boot, starter, care, detail tabs, spar verdict, cup bracket, graduation modal, mock/gallery/preview; zero console errors |

## Requirements coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-1 | covered | `main.ts` 8,690 B of boot + composition; feature wiring in `app/*` |
| FR-2 | covered | `hud.ts` facade + `hud/{shell,update,hints,types}.ts`; plates/copy split per domain |
| FR-3 | covered | `scene.ts`, `staging-fx.ts`, `orbit-camera.ts` facades over `scene/`, `fx/`, `camera/` |
| FR-4 | covered | `cup/screens/`, `spar/`, `graduation/` modules, all under cap |
| FR-5 | covered | `mock.ts` over `mock/{data,sections,showcase}.ts` |
| FR-6 | covered | whole-tree guard + negative control (strengthened in R1) |
| FR-7 | covered | identical export names; subscriber order preserved |
| NFR-1 | covered | DOM order, copy, constants and determinism unchanged |
| NFR-2 | covered | 167 modules measured; largest `battleHud.ts` 12,064 B |
| NFR-3 | covered | every phase gate green |
| NFR-4 | covered | only the guard rewritten; `size-probe.test.ts` retired |
| NFR-5 | covered | offender paths + bytes + overage |
| NFR-6 | covered | no new dependency, no module-level mutable state |
| NFR-7 | covered | no leaf→facade back-edges; shared types in leaves |
| AC-1..AC-8 | covered | see `verification/integrated.md` |

## Findings

| ID | Severity | Location | Finding | Resolution |
| --- | --- | --- | --- | --- |
| F1 | Medium | `verification/phase-1..5.md` | Head SHAs were squashed away; reports named trees that no longer resolve | Fixed: each report names its checkpoint and states the task commits were squashed; per-task SHA tables carry the same note |
| F2 | Medium | `phase-5.md`, `integrated.md` | Suite arithmetic contradicted itself (`1789 pass` vs `1788 pass + 1 skip`; "six tests" vs five) | Fixed: one consistent statement (142 files, 1789 tests, 1788 pass, 1 skip) and "five tests" |
| F3 | Low | `module-size.test.ts:44-50` | Symlinked folders were skipped (`entry.isDirectory()`) and only `.ts` was measured | Fixed: the walk follows `statSync(full).isDirectory()` and measures `.ts`, `.tsx`, `.mts`; `.test.*` excluded |
| F4 | Low | `module-size.test.ts:126-131` | Negative control wrote into `src/`, so a killed run could leave an offender behind and a read-only checkout would fail | Fixed: the fixture is built in `mkdtempSync` under the OS temp dir and removed recursively in `finally` |
| F5 | Low | `tech-stack.md` | The dated note quoted a report format the guard does not emit | Fixed: the note quotes the real line and the header/footer, and records the widened extensions |

## Plan compliance

All five phases are `verified` with checkpoints `d5b0117`, `9511846`, `97a9bba`,
`3466438`, `57ac657`; every task is `[x]`; the diff stayed inside each phase's
`Touches` modulo the recorded deviations (extra leaf modules, `fightNowFor()`,
`CREST_ELEMENTS` rename).

## Out of scope

`battleHud.ts` (224 B headroom), `staging.ts` and `graduation/nursery.ts` remain close
to the cap; splitting them is a separate track if they grow.

## Debt

None deferred: strict mode, and all five findings were fixed in R1.

## History

| Round | Commit | Verdict |
| --- | --- | --- |
| 1 | `4aa6df3` | PASS WITH FINDINGS → fixed in Phase R1 |

## Doc sync

`conductor/tech-stack.md` carries the 2026-10-20 decomposition and guard bullets; no
`docs/*.md` change was required (the save schema is untouched).
