# Review — Species Roster Expansion

- **Track:** 20261025-species-roster-expansion
- **Type:** feature
- **Branch:** feat/20261025-species-roster-expansion
- **Range:** 2adc0518..HEAD (`2adc0518d136ec3b41cc7b6daa17821ae4e1d6f4..60905f9a`)
- **Date:** 2026-10-26
- **Verdict:** PASS

## Summary

The track delivers its scope: the roster grows from six species to nine with three new lines (Fernstag plant @ Silver, Reefclaw water @ Gold, Cindermoor fire @ Legend), each with a probe-tuned six-move kit recomposed from existing vocabulary, its own voxel archetype with pinned determinism digests, two champion branch forms, and a boot-time retroactive catch-up for saves that had already claimed those tiers. Save stays v25; no sim seam was redesigned.

Review found no Critical or High issues. The two Medium findings are both precision defects rather than broken behaviour: the handbook's tier line describes a two-species tier as "or" when the reward seam grants both, and the re-scoped boss-signature invariant is vacuous code that cannot fail. Four Low findings cover a brittle CSS selector, a queue-sort fallback, an authoring-mode verification gap, and a stage-coverage gap in the voxel boundary assertion.

Under `review.strict: true` there are no deferrals — all six findings enter Phase R1.

Code volume was 86 files / 6208 insertions / 276 deletions, so the review used per-phase checkpoint diffs plus a cross-phase integration pass rather than a single full diff.

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Test | `bun test --timeout 120000` | Pass — 2791 tests, 238 files, 0 fail, 1 pre-existing skip, 179,196 expect() calls, 110.02s |
| Typecheck | `bun run verify` | Pass — voxel 117, sim 150, client 389 files, no errors |
| Lint / format | `bun run verify` (biome) | Pass — clean |
| Build | `bun run build` | Pass — pre-existing >500 kB chunk advisory only |
| Determinism | `bun run verify` (gate) | Pass — 27 creature GLBs + 5 prop digests byte-identical |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 species defs | `species.test.ts` (roster pin, gating) | Covered |
| FR-2 | P2.T1/T2 archetypes | `frond/crab/smolder.test.ts`, determinism gate, budget fuzz, gilded frequency | Covered (stage-coverage gap → F6) |
| FR-3 | P1.T2 kits | `moves.test.ts` CATALOG pin, `species-roster.balance.test.ts` | Covered |
| FR-4 | P1.T1 tier gating | `obtainableSpecies` tests | Covered |
| FR-5 (sim) | P1.T3 reward seam | `reward-catchup.test.ts` (7 tests) | Covered |
| FR-5 (client) | P3.T3 hatch/branch-reveal | `copy-hatch.ts` tests, browser captures | Covered |
| FR-6 | P4.T1/T2 rivals + gatekeepers | `gatekeeper-reach.test.ts`, `rival-roster.test.ts`, six end-to-end cup runs | Covered |
| FR-7 | P3.T1/T2 roster surfaces + choreography | `species-roster.test.ts`, `choreo.test.ts`, `battle-timing.test.ts` | Covered |
| FR-8 | P3.T3 single-sourced copy | `copy-hatch.ts`, `handbook/chart.ts`, cup reward row | Partial — copy is single-sourced but the tier connective is inaccurate (F1) |
| FR-9 | P4.T3 docs sync | `tech-stack.md` dated note, `product.md` roadmap | Covered |
| NFR-1 | — | save stays v25, `save.test.ts` green | Covered |
| NFR-2 | — | `module-size.test.ts` green (voxel 24 KB, sim/client 12 KB) | Covered |
| NFR-3 | — | determinism gate; no hand-edited GLB (`--write-missing` authoring only) | Covered |
| NFR-4 | — | hue pins 110°/205°/18°, gilded weight 32, `face.ts` ramp | Covered |
| NFR-5 | — | no new dependencies; 27 GLBs + 5 props unchanged in behaviour | Covered |
| NFR-6 | — | 393×852 and 852×393 sweeps, console clean | Covered |
| AC-1 | P1 | roster/gating tests | Covered |
| AC-2 | P2 | determinism gate + budget fuzz + gilded frequency | Covered |
| AC-3 | P1 | balance probe, fresh/cap/identity gates | Covered |
| AC-4 | P1 | `reward-catchup.test.ts` | Covered |
| AC-5 | P1 + P3 | hatch/training parity, six branch suites, browser captures | Covered |
| AC-6 | P4 | reach guard + six played pairings + under-trained replay | Covered |
| AC-7 | P3 + P4 | 68 screenshots, occlusion sweeps, console 0/0 | Covered |
| AC-8 | P3 | copy single-sourcing tests | Partial — see F1 |

## Findings

### Critical

None.

### High

None.

### Medium

#### F1 — Handbook tier line misdescribes a two-species tier as a choice

- **File:** `apps/client/src/handbook/chart.ts:41-45`
- **What:** `tierLine` joins a tier's reward species with `" or "`, producing copy like "Silver pays a Storm Hound or a Whistlefern". `grantLeagueRewards` (`packages/sim/src/cupRewards.ts:118-136`) queues **one egg per species of the tier**, and `reward-catchup.test.ts` pins the catch-up queue as `[fernstag, reefclaw]`. The copy therefore understates the reward and contradicts the pinned behaviour.
- **Why:** Player-visible inaccuracy introduced by this diff — before the track every tier held exactly one species, so "or" never read as a choice. It now reads as "you get one of these two", which is false.
- **Fix:** Join with " and " and update the three pins at `apps/client/src/species-roster.test.ts:153-155`. Add a behavioural pin asserting the connective matches the number of eggs the tier actually grants, so the two cannot drift apart again.
- **Requirement:** FR-8, AC-8
- **Test gap:** Yes — no test ties the handbook connective to the granted egg count.

#### F2 — Re-scoped boss-signature invariant is vacuous

- **File:** `packages/sim/src/bosses.test.ts:139-153`
- **What:** The user-approved re-scope ("a boss never wields a form-exclusive special of a species it is not") is implemented as `ownKit.includes(move)` where `ownKit` is the boss's own species kit. A sibling test already pins `boss.loadout ⊆ ownKit`, so `!ownKit.includes(move)` is always false and `foreign` can never be true. The loop cannot fail.
- **Why:** A guard that cannot fail is worse than no guard — it advertises coverage that does not exist. This diff introduced the re-scope, so the defect is diff-introduced.
- **Fix:** Delete the dead loop. Keep `allSignatures.size === BRANCHES.length` (that assertion is live). Add positive pins for the three exercised exemptions so the decision is recorded as data: `koda/flame_charge`, `fenn/pyre_lance`, `thessa/root_quake`.
- **Requirement:** FR-5 (parity), NFR-4
- **Test gap:** Yes — the intended invariant has no working assertion.

### Low

#### F3 — Gift-chip seat shift keys off a substring match on inline style

- **File:** `apps/client/src/ranch.css:1405,1409,1415,1508,1512`
- **What:** The four `:has()` seat rules key on `[style*="none"]`, a substring match against the inline `style` attribute written by `syncGiftChip` via `button.style.display`. Any future inline declaration whose value contains the substring "none" pins the HUD 32–46 px low.
- **Why:** Brittle coupling between a JS style write and a CSS selector, introduced by this diff's pending-gift chip.
- **Fix:** Toggle a `.is-hidden` class in `syncGiftChip` and key the rules on `:has(.gift-chip:not(.is-hidden))`.
- **Requirement:** FR-7, NFR-6
- **Test gap:** No automated test; covered visually.

#### F4 — Reward queue sort sends unknown species to the front

- **File:** `packages/sim/src/cupRewards.ts:204-208`
- **What:** The queue re-sort falls back to `?? 0` for a `speciesId` absent from `REWARD_SPECIES`, which sorts such an egg ahead of every real reward.
- **Why:** Unreachable today (all ids come from `REWARD_SPECIES`), but the fallback picks the worst possible ordering if a future migration or hand-edited save introduces an unknown id.
- **Fix:** `?? Number.MAX_SAFE_INTEGER` so unknown ids sort last.
- **Requirement:** FR-5
- **Test gap:** No test for an unknown species id in the queue.

#### F5 — `--write-missing` never verifies the pair it writes

- **File:** `packages/voxel/scripts/determinism-gate.ts:89-96`
- **What:** The authoring mode `continue`s before the deep compare, so the run that writes a new artifact pair never checks it. It cannot mask drift on existing artifacts (those take the compare path), but it does allow committing an unverified pair.
- **Why:** Added by this diff to author the nine new GLBs; the plain gate re-proves them afterwards, but the authoring run itself gives no assurance.
- **Fix:** Regenerate and assert equality within the same run, or hard-fail at the end instructing a re-run without the flag.
- **Requirement:** NFR-3
- **Test gap:** No test for the authoring mode's verification behaviour.

#### F6 — Boundary containment asserted for the baby stage only

- **File:** `packages/voxel/src/frond.test.ts:129` (also `crab.test.ts:128`, `smolder.test.ts:129`)
- **What:** The grid-boundary assertion runs for the baby build only, while this diff adds champion crowns (`crownBloom*`, `coralCrown*`, `crownFlame*`) and juvenile buds that are unasserted.
- **Why:** A future recipe change could push champion geometry through the grid wall and ship a clipped GLB with every test green.
- **Fix:** Extend the containment assertion to juvenile and champion.
- **Requirement:** FR-2, AC-2
- **Test gap:** Yes — this finding *is* the gap.
- **Probe result (closed at Low):** a 12-seed × 3-stage × 3-archetype coordinate probe found **zero violations** — frond 1..44/43/43, crab 1..43/42/42, smolder 2..46/45/44 against a legal interior of 1..55. No shipped GLB is clipped. Note for future work: smolder has the least headroom (9 voxels at baby), so its geometry edits have the smallest margin.

## Overrides

None.

## Plan compliance

- All four phases carry Result, Checkpoint and Evidence blocks; statuses are `verified`.
- All 11 task checkboxes and their subtasks are `[x]` and each is implemented in the diff.
- No silent drops: every `covers:` ID appears in a phase's Covers line and is backed by a test or browser evidence.
- Touches respected. Recorded deviations, all accepted:
  - `branch-catalog.ts` split out of `branches.ts` (module cap).
  - `branches.ts` / `branches.test.ts` outside P1 Touches for FR-5 parity.
  - `bosses.test.ts` invariant re-scope (explicit user decision, 2026-10-25) — see F2 for the implementation defect.
  - `save/storage.ts` one-line `loadBoot` hook.
  - `apps/client/src/choreo.ts` + `choreo.test.ts` outside P2 Touches (registry-coverage assertion forced the entries).
  - `determinism-gate.ts` `--write-missing` authoring mode — see F5.
  - `apps/client/src/cup.css` in P4 (real 852×393 occlusion defect found while playing the gatekeepers).

## Out of scope

- `morning-after-poses.ts` reuses the six original archetypes' temper vocabulary for the new lines; new-archetype pose variety is a future polish item.
- No branch-variant GLBs by design — branch accent hue is applied at the client material layer via `creature.ts` `branchTint()`, matching the six existing species.
- Pre-existing tablet-band (800×1000) chip/lineage overlap, carried from the mobile layout track.
- Only `loadBoot` reconciles rewards, not `loadSave`/`loadGame` — acceptable because the boot path is the single entry point in the app.
- Both species of a tier share one roll seed (`leagueRewardSeed(day, points)`), so a tier's two eggs arrive together. Intended by the reward seam's design.
- The PR gate runs the 1-seed fuzz smoke slice; the 200-seed sweep runs nightly under `APEX_FUZZ_SWEEP=full`. Pre-existing policy.

## Debt

None outstanding. `review.issues.enabled` is false and, under strict mode, every finding is fixed in Phase R1/R2 rather than filed.

## Doc sync

Updated before review: `conductor/tech-stack.md` dated note (2026-10-26, roster 6→9), `conductor/product.md` roadmap line (user-approved), `verification/integrated.md`.

## Round 2 — resolution record

Phase R1 resolved all six round-1 findings at root cause, each with a regression test that fails on the base source. No assertion was weakened: F2's deleted predicate could not evaluate false, and both of its live neighbours survive; F1 replaced three hardcoded string pins with those three plus a seam-derived test; F6 replaced baby-only containment with three-stage containment.

One discrepancy was investigated and accepted: the R1 brief named three signature exemptions, and the data-driven pin surfaced six. Pinning six is correct rather than papering over — all six are the identical case (a boss wielding a move that is its own species' kit row while another species' champion form claims that row as its signature), `bosses.ts` was unchanged so these overlaps predate the track, and the complementary direction is enforced by the loadout-subset pin, making the pair of tests exhaustive.

| Finding | Resolution |
| --- | --- |
| F1 | `handbook/chart.ts` joins with " and "; guard derives the connective from `REWARD_SPECIES` and cross-checks `grantLeagueRewards` |
| F2 | Vacuous loop deleted; uniqueness and loadout-subset pins kept; six exemptions pinned as data |
| F3 | Chip folds via `.is-hidden`; five seat rules re-keyed; verified live at both phone orientations |
| F4 | `rank()` with `?? Number.MAX_SAFE_INTEGER`; unknown id sorts last |
| F5 | Authoring run re-reads and falls through to the same deep compare |
| F6 | Containment asserted for all three stages plus signature-part presence per stage |

## Round 3 — resolution record

The round-2 delta review surfaced two findings in the R1 delta itself, both resolved in Phase R2.

| Finding | Severity | Resolution |
| --- | --- | --- |
| F7 | Medium | `handbook/chart.ts:68-71` no longer claims a cross-element partner; it states the invariant the catalogs guarantee (a reward is a partner the player could not have chosen at the start). Guard `species-roster.test.ts:221-236` derives disjointness from the real arrays and pins "another element" out of real output. |
| F8 | Low | `determinism-gate.test.ts:21-49` scopes the pin from the write branch to the first deep compare, asserting both anchors exist and are ordered first; `determinism-gate.ts` untouched; base-source proof recorded in `phase-R2.md`. |

Two guard-strictness limitations were reported as notes, not findings, because both fail closed on the shipped code shape: the F7 guard would not catch a *paraphrase* of the element claim, and the F8 slice would not catch a `break` substituted for the `continue`. Hardening either at track close would be opportunistic work outside the findings, so both are recorded here for future maintenance rather than actioned.

**Round 3 verdict: PASS** — 0 Critical, 0 High, 0 Medium, 0 Low outstanding; no new findings introduced by the R2 delta.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 2 | 4 | 0 |
| 2 | PASS WITH FINDINGS | 0 | 0 | 1 | 1 | 6 |
| 3 | PASS | 0 | 0 | 0 | 0 | 2 |
