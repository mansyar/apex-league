# Phase R1 — Review Fixes

- **Track**: 20261025-species-roster-expansion (Species Roster Expansion)
- **Phase**: R1 — Review Fixes (round 1: 2 Medium, 4 Low)
- **Date**: 2026-10-26
- **Branch**: `feat/20261025-species-roster-expansion`
- **Base**: `5fde953d` · **Head at evidence time**: `1943dba7` (this file is the
  following commit)
- **Result**: **verified** — all six round-1 findings resolved at root cause,
  each with a test (or, for F3, a test plus a two-viewport visual re-check) that
  would have caught the defect. No assertion weakened, no test skipped, no
  `.only`, no GLB touched, no dependency added. `review.strict: true`, so
  nothing was deferred.

## Findings

| Id | Severity | What changed | File:line | Guarding test |
| --- | --- | --- | --- | --- |
| F1 | Medium | `tierLine` joins reward species with `" and "` instead of `" or "`, because `grantLeagueRewards` queues **one egg per species of the tier**, never a choice between them. Doc comment now states the additive connective and why. The three hardcoded tier pins were updated. | `apps/client/src/handbook/chart.ts:37-48` | `apps/client/src/species-roster.test.ts` — "the tier connective matches the eggs the league actually grants": derives the expected connective from `REWARD_SPECIES.filter(s => s.rewardFromTier === tier)` → `grantLeagueRewards(...)` and asserts every granted species is named in that tier's sentence, that a multi-egg tier reads `" and "`, and that it never reads `" or "`. Fails against the base code. |
| F2 | Medium | Deleted the dead `!ownKit.includes(move)` loop (vacuous: the sibling test already pins `boss.loadout ⊆ ownKit`, so `foreign` could never be true). Kept the live `allSignatures.size === BRANCHES.length` uniqueness pin and the loadout-subset pin untouched. Replaced the dead loop with a positive data pin of the exercised exemption surface. | `packages/sim/src/bosses.test.ts:138-165` | `bosses.test.ts` — "never wields a form-exclusive special of a species the boss is not" now pins `sharedSignatures` exactly: `koda/flame_charge`, `hesse/spore_burst`, `delmar/tide_shot`, `fenn/flame_charge`, `fenn/pyre_lance`, `thessa/root_quake`. Any new boss move that is another species' branch signature fails the pin and must be a recorded decision. |
| F3 | Low | Chip visibility is now a class toggle (`classList.add("is-hidden")` / `classList.toggle("is-hidden", !pending)`), not an inline `style.display` write. The five `:has()` seat rules key on `:has(.gift-chip:not(.is-hidden))`; a new `.gift-chip.is-hidden { display: none }` rule does the folding. Behaviour identical: pending egg → lineage plate, panel stack and callout step down; no egg → rules inert. | `apps/client/src/gift.ts:71-88`; `apps/client/src/ranch.css:845-847,1415,1419,1425,1518,1522` | `apps/client/src/gift.test.ts` — "the gift chip's visibility" (3 tests): the chip folds through `is-hidden` while `style.display` stays `""`, shows when an egg waits, and `ranch.css` contains no `[style*=`, has exactly five gift-chip seat rules, and every one of them keys on `:not(.is-hidden)`. |
| F4 | Low | Unknown reward species now sort **last** (`?? Number.MAX_SAFE_INTEGER`) instead of first (`?? 0`), via a named `rank` helper with the reason recorded. | `packages/sim/src/cupRewards.ts:207-208` | `packages/sim/src/reward-catchup.test.ts` — "an unknown reward species sorts after every real reward": queue `[earth_tortoise, ghost_line]` reconciles to `[electric_hound, fernstag, wind_falcon, reefclaw, earth_tortoise, cindermoor, ghost_line]`. Fails against the base code (`ghost_line` lands first). |
| F5 | Low | `--write-missing` no longer `continue`s past the deep compare: after writing a new pair the gate re-reads both files and falls through to the same hash compare committed artifacts get, so an authoring run verifies what it wrote. The plain gate is unchanged — without the flag, drift still fails. | `packages/voxel/scripts/determinism-gate.ts:88-106` | `packages/voxel/src/determinism-gate.test.ts` (new, 3 tests): the source contains no `continue`; the pair is re-read after the writes (index-ordered assertions on the write/read sequence); an existing pair is still never overwritten. All three fail against the base source. |
| F6 | Low | Boundary containment is asserted for **every** life stage (baby, juvenile, champion), not baby only, in all three new archetypes — the champion crowns and juvenile buds are exactly the parts the old body never looked at. Each stage additionally pins that its signature parts are present, so a stage cannot pass by covering less creature. | `packages/voxel/src/frond.test.ts:129-158`; `crab.test.ts:128-157`; `smolder.test.ts:129-158` | The boundary test itself, now stage-parameterised. Red run on the baby-only scope: `Expected to contain: "leafBudLeft" / Received: Set(13) { body, legFL … antlerRight }` — proof the old assertion never visited the juvenile or champion geometry. |

## Commands

| # | Command | Exit | Summary |
| --- | --- | --- | --- |
| 1 | `bun test apps/client/src/species-roster.test.ts --timeout 120000` (**red**, F1, first draft) | 1 | 8 pass / 2 fail — the `" or "` pin plus a first-draft sentence-slicing bug in the new helper |
| 2 | `bun test apps/client/src/species-roster.test.ts --timeout 120000` (**red**, F1, helper fixed) | 1 | 8 pass / 2 fail / 72 expects — intended red: `"Silver pays a Storm Hound or a Whistlefern"` and `expect(sentence).toContain(" and ")` |
| 3 | `bun test apps/client/src/species-roster.test.ts --timeout 120000` (green) | 0 | 10 pass / 0 fail / 83 expects |
| 4 | `bun test packages/sim/src/bosses.test.ts --timeout 120000` (**red**, F2, placeholder pin) | 1 | 16 pass / 1 fail / 210 expects — the pin surfaced 6 exemptions, not 3 (see Notes) |
| 5 | `bun test packages/sim/src/bosses.test.ts` (green) | 0 | 17 pass / 0 fail / 210 expects |
| 6 | `bun test packages/sim/src/reward-catchup.test.ts --timeout 120000` (**red**, F4) | 1 | 14 pass / 1 fail / 74 expects — `ghost_line` sorted to index 0 |
| 7 | `bun test packages/sim/src/reward-catchup.test.ts` (green) | 0 | 15 pass / 0 fail / 74 expects |
| 8 | `bun test packages/voxel/src/frond.test.ts` (**red**, F6) | 1 | 17 pass / 1 fail / 182 expects — baby build visits 13 parts, no `leafBudLeft` |
| 9 | `bun test packages/voxel/src/frond.test.ts packages/voxel/src/crab.test.ts packages/voxel/src/smolder.test.ts --timeout 120000` (green) | 0 | 54 pass / 0 fail / 134,586 expects |
| 10 | `bun test apps/client/src/gift.test.ts` (F3) | 0 | 7 pass / 0 fail / 23 expects |
| 11 | `bun test apps/client/src --timeout 120000` | 0 | 1073 pass / 0 fail / 63,869 expects, 82 files |
| 12 | `bun test packages/voxel/src/module-size.test.ts` | 0 | 5 pass / 0 fail — the new `determinism-gate.test.ts` is under the 24 KB voxel cap |
| 13 | `bun run gate:determinism` | 0 | 27 creature GLB pairs byte-identical (9 archetypes × 3 stages) + 5 prop digests — plain gate unaffected by the authoring-mode change |
| 14 | `bun run check` | 0 | no type errors — voxel 118, sim 151, client 389 files |
| 15 | `bunx biome check <touched files>` | 0 | clean after `--write`; only the pre-existing `ranch.css:1429` `noDescendingSpecificity` warning remains (confirmed present at the base commit too) |
| 16 | `bun test --check --parallel=4 --timeout 120000` (**phase verification**) | 0 | **2798 pass / 1 skip / 0 fail / 267,327 expects / 239 files, 42.9 s** |
| 17 | `bun run verify` | 0 | typecheck clean; 2798 pass / 1 skip / 0 fail; Biome clean (1 pre-existing warning); determinism gate OK |
| 18 | `bun run build` | 0 | vite 314 modules, 916.62 kB js / 66.67 kB css |
| 19 | `git status --porcelain` | 0 | clean |

Baseline was 2791 tests / 238 files; the phase adds 7 tests and 1 file
(`determinism-gate.test.ts`) → 2798 / 239. The single skip is the pre-existing one.

## F3 visual re-verification

Driven against the real dev server (`bun run dev`, port 5175) with
`playwright-cli`, on a save seeded through `localStorage` (silver ladder,
`pendingRewards` = `[electric_hound, fernstag]`), so the four-chip cluster is the
shipping one.

**852×393 (landscape-short tier).** Chip cluster ends at 196 px; `.hud-lineage`
seat computes to `204px` (the `:has(.gift-chip:not(.is-hidden))` rule) and its
rect is 204–241 — 8 px clear of the Stable chip, no occlusion. The expanded
plate's ceiling computes to `max-height: 101px` (`calc(100dvh - 292px)`), the
gift-visible value. Clearing the eggs folds the chip (`gift-chip is-hidden`,
`display: none`) and both seats snap back to their compact values
(`lineageTop: 158px`, plate ceiling `calc(100dvh - 246px)`) — the rules are
inert with no egg, as designed. `scrollWidth === 852 === innerWidth`,
`scrollHeight === 393`. Capture:
`.conductor/evidence/20261025-species-roster-expansion/phase-R1-landscape-gift.png`.

**393×852 (phone tier).** Chip cluster ends at 208 px; `.hud-lineage` seat is
`208px` with a 208–252 rect, `.hud-stack` steps to `260px`, `.hud-callout` to
`258px` — the plate ends at 252 and the teaching card starts at 258, so the card
sits below it with no overlap. Clearing the eggs returns the seats to
176 / 228 / 226. `scrollWidth === 393 === innerWidth`,
`scrollHeight === 852`. Capture:
`.conductor/evidence/20261025-species-roster-expansion/phase-R1-phone-gift.png`.

`playwright-cli console` → 2 messages, **0 errors / 0 warnings**.

## Deviations

| File | Reason |
| --- | --- |
| `apps/client/src/gift.test.ts` | F3's guarding test. The brief's Touches list names `gift.ts` for the chip write and `species-roster.test.ts` for F1, but not the gift test; the fix needs a test that fails on the base code, and there is no DOM harness in this repo (no `happy-dom`, no test reads a CSS file), so the honest option is a fake `classList`/`style` button plus a source-shape pin on `ranch.css` — exactly the precedent `steps/fire.test.ts` set by reading module source. Smallest change that satisfies "each must end with a test that would catch regression". |
| `packages/voxel/src/determinism-gate.test.ts` | F5's guarding test, **new file**. `determinism-gate.ts` lives in `packages/voxel/scripts/`, which has no test file and is not in the brief's Touches list; running the gate in `--write-missing` mode would regenerate every artifact, so the guard is a source-shape pin (no `continue`; re-read after write; still refuses to overwrite an existing pair). Confirmed to fail against the base source (`git show 5fde953d:…` has the `continue` and no re-read). 5 tests / 15 expects; under the 24 KB voxel cap. |

Nothing else outside the Touches list was modified.

## Notes

- **F2 pinned six exemptions, not three.** The brief named
  `koda/flame_charge`, `fenn/pyre_lance`, `thessa/root_quake`. Building the pin
  from the real data (boss loadout moves that are also some *other* species'
  branch signature) surfaced three more of the same class:
  `hesse/spore_burst` (`spore_warden`/fernstag signature, a plant_ox kit row),
  `delmar/tide_shot` (`tide_sentinel`/reefclaw signature, a water_axolotl kit
  row) and `fenn/flame_charge` (`ember_bank`/cindermoor signature, a fire_drake
  kit row). All six are the same user decision (2026-10-25) — a signature may be
  a kit row of its own species' element vocabulary that another species carries.
  Pinning the observed six is strictly stronger than pinning three and leaves no
  unrecorded exemption; nothing was weakened.
- **F6 red step was deliberately produced by narrowing, then restored.** The
  stage-parameterised body was written green first, then temporarily reduced to
  the old baby-only build with a `leafBudLeft` coverage pin to prove the old
  scope could not see the juvenile/champion parts. The red output is recorded in
  the commands table; the shipped body is the green version and the coverage
  pins stay in it, so the assertion can never pass by covering less creature.
- **No recipe was touched for F6.** The extended containment assertion passed on
  all three archetypes × three stages at seed 42 without any change to
  `frond.ts`, `crab.ts` or `smolder.ts`, consistent with the review's 12-seed
  probe. No GLB was regenerated or hand-edited; `git status` shows no artifact
  churn.
- **The `ranch.css:1429` Biome warning is pre-existing.** It was verified against
  a copy of `ranch.css` taken from `5fde953d` — the same
  `noDescendingSpecificity` warning fires there (at its old line 1419). The F3
  selector rewrite did not introduce it, and suppressing it would have been an
  unrelated change.
- **Screenshots are gitignored** under `.conductor/evidence/`, per the workflow;
  the two paths are recorded above.
- **For the primary**: `plan.md` Phase R1 task checkboxes are yours; this phase
  touched only the twelve contract paths plus the two recorded deviations and
  this evidence file.

## Primary verification

- **Date**: 2026-10-26
- **By**: Conductor primary (independent of the subagent report)
- **Tree**: clean at `5fde953d..fb1264d2` before this append
- **Squash guard**: `git log 5fde953d..HEAD` = exactly the 7 reported commits
  (`df868734`, `df91e3b1`, `c2e0720f`, `158f8ae9`, `898b904d`,
  `1943dba7`, `fb1264d2`) — no foreign, unreported or user commits.
- **Diff**: 14 paths, all inside the contract plus the two recorded deviations
  (`gift.test.ts`, `determinism-gate.test.ts`). No artifact churn, no
  `packages/voxel/artifacts/**` change, no dependency change.

Fix spot-check by direct read of the diffs (not the report):

- **F1** — `chart.ts` joins with `" and "` and the doc comment now explains
  the additive connective by reference to `grantLeagueRewards`. The new guard
  derives the expected connective from `REWARD_SPECIES` filtered by tier, so
  copy and grant cannot drift apart again.
- **F2** — the vacuous `!ownKit.includes(move)` loop is gone; the live
  `allSignatures.size === BRANCHES.length` pin and the loadout-subset pin both
  survive. The replacement pins the exemption surface as data and found **six**
  entries rather than the three named in the brief, which is strictly stronger
  and leaves nothing unrecorded.
- **F3** — the chip folds through `.is-hidden`; all five seat rules key on
  `:not(.is-hidden)`; the new `.gift-chip.is-hidden` rule carries the fold
  and explains why `.gift-chip` must outrank `.kit-chip`. No
  `[style*=` selector remains in `ranch.css`.
- **F4** — named `rank` helper, `?? Number.MAX_SAFE_INTEGER`, with the
  reason recorded in the comment.
- **F5** — after writing, the gate re-reads both files and falls through to the
  same deep compare; the plain gate path is untouched.
- **F6** — containment runs for all three stages in all three archetypes and
  each stage additionally pins its signature parts are present, so a stage
  cannot pass by covering less creature. No recipe was modified.

Independent gates run by the primary:

| Check | Command | Result |
| --- | --- | --- |
| Phase verification | `bun run test:phase` | exit 0 — 2799 tests / 239 files / 0 fail, 267,327 expect() calls, 42.47 s |
| Static + determinism | `bun run verify` | exit 0 — typecheck clean; Biome clean; determinism gate OK for all 27 creature GLB pairs (incl. frond/crab/smolder × 3 stages) + 5 prop digests |
| Build | `bun run build` | exit 0 — pre-existing >500 kB chunk advisory only |

Test arithmetic reconciles: baseline 2791 / 238 → 2799 / 239 (+8 tests, +1 file;
the single skip is the pre-existing one).

The F3 two-viewport re-verification (852×393 seats 204/101 px, 393×852 seats
208/260/258 px, no occlusion, `scrollWidth === innerWidth` on both, console
0 errors / 0 warnings) is accepted as visual evidence under the workflow's
visual layer; the two captures are gitignored under `.conductor/evidence/`.

**Result: phase accepted.** All six round-1 findings are resolved at root cause
with guarding tests; no assertion weakened; nothing deferred.
