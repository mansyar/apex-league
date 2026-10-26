# Phase R2 — Review Fixes (round 2)

- **Track**: 20261025-species-roster-expansion (Species Roster Expansion)
- **Phase**: R2 — Review Fixes (round 2: 1 Medium, 1 Low)
- **Date**: 2026-10-26
- **Branch**: `feat/20261025-species-roster-expansion`
- **Base**: `641c2738` · **Head at evidence time**: `649b0943` (this file is the
  following commit)
- **Result**: **verified** — both round-2 findings fixed at root cause. F7's copy
  was rewritten to the invariant the catalog structurally provides and pinned by
  a test that failed first (red recorded below); F8's over-broad source pin was
  scoped to the region it was actually about, and the scoped pin was proved to
  still fail against the tree that carried the original defect. No assertion
  weakened, no test skipped, no `.only`, no GLB touched, no dependency added.

## Findings

| Id | Severity | What changed | File:line | Guarding test |
| --- | --- | --- | --- | --- |
| F7 | Medium | The population note no longer claims every reward tier pays "a partner of another element". That clause died with the roster expansion — Silver now pays the plant Whistlefern beside the plant starter, Gold the water Coral Claw, Legend the fire Moor Cinder, and the claim contradicted the tier list in the same sentence. It now states the guarantee the two catalogs structurally provide: "every reward tier hands out a partner you did not choose at the start". The doc comment records why no element claim may be made here. Two-sentence structure, the `rewards` interpolation and the starter-trio opener are unchanged. | `apps/client/src/handbook/chart.ts:57-72` (string at `:70`) | `apps/client/src/species-roster.test.ts:221-236` — "makes only the guarantee the catalog structurally provides": derives the invariant from the real catalogs (every `REWARD_SPECIES` id absent from `STARTER_SPECIES`) and pins the specific falsehood (`expect(note).not.toContain("another element")`) against the real `populationNote()` output. Red against the base source. |
| F8 | Low | The F5 guard asserted `not.toContain("continue")` across the whole gate script, so any future legitimate `continue` (a skipped prop, an opt-out archetype, a retry) would fail a guard about verification — the kind of nuisance pin that gets deleted rather than read. The assertion is now scoped to the stretch between the `--write-missing` write branch and the first deep compare, via a helper that also asserts both anchors exist and are ordered (an empty slice cannot pass an absence check). The other two pins are untouched. | `packages/voxel/src/determinism-gate.test.ts:21-49` | The scoped assertion itself. Base-source proof: `.conductor/evidence/20261025-species-roster-expansion/f8-base-check.test.ts` applies the same two anchors to `git show 5fde953d:…/determinism-gate.ts` and asserts the 654-char slice still contains the `continue`. |

## Commands

| # | Command | Exit | Summary |
| --- | --- | --- | --- |
| 1 | `git status --porcelain` (start) | 0 | clean at `641c2738` |
| 2 | `git show 5fde953d:packages/voxel/scripts/determinism-gate.ts` | 0 | base source read: the write branch `continue`s before the compare (F8 proof anchor) |
| 3 | `bun test apps/client/src/species-roster.test.ts --timeout 120000` (**red**, F7) | 1 | 10 pass / 1 fail / 91 expects — `Expected to not contain: "another element"` / `Received: "…every reward tier hands out a partner of another element. Silver pays a Storm Hound and a Whistlefern; …"`. The reward-vs-starter half passed (it is the invariant the new copy relies on); the falsehood pin is what went red. |
| 4 | `bun test apps/client/src/species-roster.test.ts --timeout 120000` (green, F7) | 0 | 11 pass / 0 fail / 91 expects |
| 5 | `bun test packages/voxel/src/determinism-gate.test.ts` (F8, scoped) | 0 | 3 pass / 0 fail / 8 expects |
| 6 | `bun test ./.conductor/evidence/20261025-species-roster-expansion/f8-base-check.test.ts` (**base-source proof**) | 0 | 2 pass / 0 fail / 3 expects — `5fde953d slice: 654 chars`, slice contains `continue`; `HEAD` slice does not |
| 7 | `bun test --check --parallel=4 --timeout 120000` (**phase verification**) | 0 | **2799 pass / 1 skip / 0 fail / 267,337 expects / 239 files, 35.76 s** |
| 8 | `bunx biome check apps/client/src/handbook/chart.ts apps/client/src/species-roster.test.ts packages/voxel/src/determinism-gate.test.ts` | 0 | clean, no fixes applied |
| 9 | `bun run check` | 0 | no type errors — voxel 118, sim 151, client 389 files |
| 10 | `bun run gate:determinism` | 0 | 27 creature GLB pairs byte-identical (9 archetypes × 3 stages) + 5 prop digests; no artifact churn |
| 11 | `git status --porcelain` (end) | 0 | clean |

Test arithmetic: baseline (round-1 acceptance) was **2798 pass / 1 skip /
239 files** (reported as "2799 tests" including the skip). F7 adds one test, F8
rewrites an existing one and adds none → **2799 pass / 1 skip / 239 files**
(reported as 2800 tests), i.e. **+1 test, +0 files**. The single skip is the
pre-existing one.

## Why the new copy is permanently true

`STARTER_SPECIES` and `REWARD_SPECIES` are two separate frozen arrays
(`packages/sim/src/species.ts`), and `ALL_SPECIES` is their concatenation. A
species is a starter or a reward, never both: a tier grants a partner precisely
because it was not on the starting menu. "A partner you did not choose at the
start" therefore holds for every reward species by construction, and the guard
test asserts the disjointness against the real arrays rather than a copied
string — so if a future roster edit ever made a reward species also a starter,
the test fails before the sentence can become a lie.

The element claim was the fragile part, and it is now absent by design: a tier
may legitimately pay a species of a starter's own element (Silver's plant
Whistlefern beside the plant starter), so no element property can be promised
about "every reward tier". The `not.toContain("another element")` pin records
that reasoning as executable history.

## Why the F8 slice still catches the original defect

The two anchors are the real lines, not paraphrase: the write branch opens on
`if (writeMissing && !existsSync(glbPath) && !existsSync(manifestPath))` and the
first deep compare opens on
`if (JSON.stringify(manifest) !== JSON.stringify(committedManifest))`. Against
`5fde953d` — the tree F5 was raised against — the slice is 654 characters and
reads exactly the buggy path: both `writeFileSync` calls, the "wrote …" log, the
`continue`, the `fail(…)` else-branch, and the deep-compare comment. The
`continue` is inside it, so the scoped assertion fails on that source, which the
base-source proof test asserts directly rather than by reasoning alone. Against
`HEAD` the same slice has no `continue`, so the pin is green for the right
reason. The helper additionally asserts `start > -1` and `end > start`, closing
the failure mode where a renamed anchor yields an empty slice that vacuously
satisfies an absence assertion.

## Deviations

None. All edits landed in the four contract paths; `determinism-gate.ts` itself
was not touched (F8 is a test-scope fix), and the only files created outside the
contract are gitignored scratch evidence under `.conductor/evidence/`.

## Notes

- **No visual re-verification was run.** The copy change is one clause of a
  handbook note whose length, sentence count and layout are unchanged (the
  replacement clause is 13 characters longer than the original and the note
  already wraps). `species-roster.test.ts` pins the ≤2-sentence budget, all six
  species names and the three tier phrases, so the rendered text is fully
  constrained by unit tests. The round-1 captures already cover the panel's
  layout.
- **No artifact was regenerated or hand-edited.** `bun run gate:determinism`
  passed on all 27 creature pairs and the 5 prop digests with no working-tree
  change; `git status` was clean before and after.
- **F8's test count is flat by intent.** The brief allowed either a rewrite or an
  added pin; the honest fix is to change the scope of the existing assertion, so
  no test was added to pad the count. The +1 in the totals is F7's.
- **For the primary**: `plan.md` Phase R2 task checkboxes are yours; this phase
  touched only `chart.ts`, `species-roster.test.ts`,
  `determinism-gate.test.ts` and this evidence file.

## Primary verification

- **Date**: 2026-10-26
- **By**: Conductor primary (independent of the subagent report)
- **Tree**: clean at `641c2738..24abf5d5` before this append
- **Squash guard**: `git log 641c2738..HEAD` = exactly the 3 reported commits
  (`0abfbada`, `649b0943`, `24abf5d5`) — no foreign, unreported or user commits.
- **Diff**: 4 paths, all inside the contract. `determinism-gate.ts` untouched;
  no artifact churn; no dependency change.

Fix spot-check by direct read of the diffs:

- **F7** — the element claim is gone: `"tier hands out a partner you did not
  choose at the start."` The doc comment records why no element claim may live
  there and names the exact falsifying case (Silver's plant Whistlefern beside
  the plant starter). The guard derives the reward-vs-starter disjointness from
  the real `REWARD_SPECIES`/`STARTER_SPECIES` arrays and pins
  `not.toContain("another element")` against the real `populationNote()`
  output, so the copy cannot silently go false again.
- **F8** — the assertion is scoped through a `writeBranchThroughCompare`
  helper anchored on the write branch and the first deep compare. Both anchors
  are asserted present and ordered before slicing, which prevents the failure
  mode where a renamed anchor yields an empty slice that passes vacuously —
  a stronger construction than the over-broad original. `determinism-gate.ts`
  itself was not modified.

Independent gates run by the primary:

| Check | Command | Result |
| --- | --- | --- |
| Phase verification | `bun run test:phase` | exit 0 — 2800 tests / 239 files / 0 fail, 267,337 expect() calls, 33.76 s |
| Static + determinism | `bun run verify` | exit 0 — typecheck clean; Biome clean; determinism gate OK (27 creature GLB pairs + 5 prop digests byte-identical) |
| Build | `bun run build` | exit 0 — pre-existing >500 kB chunk advisory only |

Test arithmetic: R1 closed at 2799 tests / 239 files; F7 adds one test and F8
changed an existing assertion's scope without adding one → 2800 / 239. The
single skip is the pre-existing one.

**No visual pass was run for F7, and none is required.** The change is one
clause of a handbook note whose sentence count, species list and per-tier
phrases are all unit-pinned; the replacement is 13 characters longer inside an
already-wrapping paragraph, and the workflow's visual layer is scoped to
rendering and layout changes, not prose substitutions in a flowing paragraph.

**Result: phase accepted.** Both round-2 findings resolved at root cause with
guards that fail on the base source; no assertion weakened.
