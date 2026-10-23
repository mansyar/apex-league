# Phase 2 — The League Reward Seam & Save v25 (generalization)

- **Track:** 20261023-earth-wind-species-line
- **Phase:** 2 of the track plan (P2.T1 reward record, P2.T2 migration v24→v25, P2.T3 consumer surfaces, P2.T4 grant & purity tests)
- **Date:** 2026-10-23
- **Branch:** `feat/20261023-earth-wind-species-line`
- **Base:** `02dfc2c` (phase base)
- **Head:** `32b13b9` (`32b13b96d9e8c43776051154937a96f75b3723cf`)

## Result

**verified** — all four plan tasks implemented; full suite 2400 pass / 1 skip / 0 fail (91273 expect calls, 178 files); typecheck green in all three packages; lint green; determinism gate green; production build green; every touched module under the 12,288 B cap.

## Commits

| Commit | Tasks | Summary |
|---|---|---|
| `7bad59b` | P2.T1, P2.T3, P2.T4 | `feat(sim): generalize the league reward record per tier (FR-5/FR-6)` — state fields, per-tier grant seam, queue-based hatch, preview, validators, ticker/index/machine forwarding, the rewritten `cup/storm-gift.test.ts` suite (incl. T4 grant rules, multi-pending queue order, stream purity), and the client reward card + results seam (the two client files were already staged when this commit was cut, so T3 landed here). |
| `32b13b9` | P2.T2 | `feat(save): SAVE_VERSION 25 with a lossless v24->v25 migration (FR-8)` — `v24.ts` step, chain registration, `SAVE_VERSION` 25, `rewardRecordOf` shared mapping helper, migrated-step reshaping, full save-suite extension, version pins, `docs/save-schema.md`. |

Per-task commits: P2.T1 → `7bad59b`; P2.T2 → `32b13b9`; P2.T3 → `7bad59b` (folded, see note); P2.T4 → `7bad59b` (tests co-located in the rewritten cup suite).

## Commands table

| Layer | Command | Exit | Summary |
|---|---|---|---|
| tests | `bun test --timeout 120000` | 0 | 2400 pass, 1 skip, 0 fail, 91273 expect calls, 178 files. |
| typecheck | `bun run check` | 0 | `@apex/sim` 147 files, `@apex/client` 350 files, `@apex/voxel` 72 files — no type errors. |
| lint | `biome check` (standalone) | 1 | Bare `biome` binary does not resolve in this sandbox ("The term 'biome' is not recognized"). |
| lint (fallback, per operational note) | `bun run verify` (runs `biome check` internally) | 0 | Checked 551 files, no fixes applied — lint leg obtained through the verify pipeline. |
| determinism gate | `bun run gate:determinism` (inside `bun run verify`) | 0 | All golden voxel digests byte-identical, incl. `storm_hound` seed 42 (NFR-3 holdover intact). |
| full gate | `bun run verify` | 0 | check + `bun test --check --parallel` (2400 pass) + `biome check` + determinism gate. |
| build | `bun run build` | 0 | Client production build, 292 modules. |
| module size guard | `bun test --timeout 120000 packages/sim/src/module-size.test.ts` | 0 | No sim module over the 12,288 B cap. |

## Acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| **AC-5** (per-tier league reward at cup finalize) | pass | `finalizeCup` at Silver claims Silver only (`claimedTiers: ["silver"]`, one `electric_hound` egg enqueued); at Gold claims `["silver","gold"]` with hound+falcon; at Legend claims all three tiers in ascending order with queue `[electric_hound, wind_falcon, earth_tortoise]`. Promotion Cup champion crowned into Silver claims at the same finalize (placement runs before the grant). Forfeited cups never trigger or consume; a forfeit followed by a real finalize grants. `cup/storm-gift.test.ts` "the league rewards grant at cup finalize (FR-5)" + "grantLeagueRewards — the claim seam". |
| **AC-6** (claim-once per tier) | pass | A second finalize never re-grants (`pendingRewards` unchanged, no duplicate egg); a fully-claimed legend save re-finalizes with an empty queue; the per-tier claim record prevents repeat grants per tier. Same suites + validators reject duplicate tiers on load. |
| **AC-8** (lossless v24→v25 migration) | pass | `save/giftSave.test.ts` "save v25 — the per-tier league reward record (FR-8)": a real v24 payload with `stormGiftClaimed: true` + pending egg `{electric_hound, 4242}` migrates to version 25 with `claimedTiers: ["silver"]` and `pendingRewards: [{speciesId: "electric_hound", seed: 4242}]`, asserted equal to the hand-built equivalent v25 state (lossless); deterministic and idempotent; unclaimed v24 → empty record. Chain test keys exactly `0`…`24`; full-chain v0 → 25 passes. |
| **FR-9 claim-UI half** (client claim flow reads the queue) | pass | `apps/client/src/gift.ts` previews the queue head via `leagueRewardPreview` (seed-exact numbers), repainting the crest from the pending egg's element on every open; the chip shows whenever `leagueRewardPending`; the results screen (`apps/client/src/cup/results.ts`) opens the claim flow from the same seam. One hatch per claim flow (the sim's queue head pops); copy is species-neutral. Client typecheck + suite green (`stable.test.ts` gift-species row test included). |

## New state field shape (exact)

```ts
// packages/sim/src/state.ts — GameState (save v25)
claimedTiers: LadderTier[]        // default []; values ⊆ {"silver","gold","legend"}; no duplicates; ascending grant order
pendingRewards: PendingGift[]     // default []; oldest (lowest tier) first; the nursery claim flow hatches index 0

interface PendingGift {
  speciesId: string               // the tier's reward species
  seed: number                    // travels with the egg: preview = hatch
}
```

Validator (`save/validators/session.ts`): `claimedTiers` must be an array of unique values from `silver|gold|legend` (bronze excluded — the league pays no bronze reward); `pendingRewards` must be an array where every entry is a strict object with a known `speciesId` and an integer `seed`.

## Rename map (old → new, every file updated)

| Old | New |
|---|---|
| `stormGiftClaimed: boolean` | `claimedTiers: LadderTier[]` |
| `pendingGift: PendingGift \| null` | `pendingRewards: PendingGift[]` |
| `applyStormGift` | `grantLeagueRewards` |
| `stormGiftSeed` | `leagueRewardSeed` |
| `stormGiftPending` | `leagueRewardPending` |
| `stormGiftPreview` / `StormGiftPreview` | `leagueRewardPreview` / `LeagueRewardPreview` |
| `createGiftEgg(seed)` | `createGiftEgg(speciesId, seed)` |
| `STORM_GIFT_SPECIES_ID` re-exports | removed from `breeding.ts`, `breeding/gift.ts`, `index.ts` (the constant itself stays in `species.ts` for the v21 migration step and tests; `rewardFromTier` on `SpeciesDef` is the tier→species lookup) |

Files updated: `packages/sim/src/state.ts`, `cupRewards.ts`, `ticker.ts`, `index.ts`, `machine.ts`, `breeding.ts`, `breeding/gift.ts`, `species.ts` (import-only, unchanged body), `save/schema.ts`, `save/validators/session.ts`, `save/migrations/common.ts` (new `rewardRecordOf`), `save/migrations/{index,v0…v24}.ts`, `apps/client/src/gift.ts`, `apps/client/src/cup/results.ts`, and every consumer test (`ap.test.ts`, `stable.test.ts`, `breeding.test.ts`, `creature.test.ts`, `cup/storm-gift.test.ts` (rewritten as the league-reward suite), `save/{giftSave,stableSave,branchesSave,breedingSave,cupSave,evolutionKnowledge,legacySave,releasePolish,save,transfer,migrations}.test.ts`, `apps/client/src/stable.test.ts`).

## Migration mapping proof (v24 → v25)

- `stormGiftClaimed: true` → `claimedTiers: ["silver"]` — the flag was precisely the Silver tier's claim; false → `[]`. Real v21–v24 payloads carry the old pair; chain-walked states carry the new fields; `migrations/common.ts#rewardRecordOf` accepts both shapes so every earlier step composes.
- `pendingGift: {speciesId, seed}` → `pendingRewards: [{speciesId, seed}]` (head of queue); null → `[]`.
- Everything else forwards untouched (creature, settings, cupsWon, lastCupDay, ladder, lineage, bossDefeats, legendTitles, evolutionKnowledge, stable, savedAt, session) — lossless and linear.
- Proof: `save/giftSave.test.ts` asserts the migrated v24 state `toEqual` a hand-built equivalent v25 state; deterministic + idempotent re-migration tests pass; the round trip (`saveGame` → `loadGame`) preserves the queue verbatim.

## Module byte sizes (cap 12,288 B)

| Module | Bytes |
|---|---|
| `packages/sim/src/state.ts` | 10,624 |
| `packages/sim/src/cupRewards.ts` | 6,138 |
| `packages/sim/src/ticker.ts` | 4,995 |
| `packages/sim/src/index.ts` | 6,215 |
| `packages/sim/src/machine.ts` | 5,898 |
| `packages/sim/src/breeding.ts` | 1,828 |
| `packages/sim/src/breeding/gift.ts` | 4,524 |
| `packages/sim/src/save/schema.ts` | 883 |
| `packages/sim/src/save/validators/session.ts` | 8,429 |
| `packages/sim/src/save/migrations/common.ts` | 3,399 |
| `save/migrations/v0 … v20` | 1,371 – 2,448 (each step got only the reward-record reshaping; largest `v11.ts` 2,448) |
| `save/migrations/v21.ts` | 2,437 |
| `save/migrations/v22.ts` | 1,733 |
| `save/migrations/v23.ts` | 1,548 |
| `save/migrations/v24.ts` (new) | 1,677 |
| `apps/client/src/gift.ts` | 6,861 |
| `apps/client/src/cup/results.ts` | 2,431 |

All far under the 12,288 B cap; no split needed, no deviation on that point.

## Evidence paths

- This report: `conductor/tracks/20261023-earth-wind-species-line/verification/phase-2.md`
- Grant/queue/purity suite: `packages/sim/src/cup/storm-gift.test.ts`
- Save/migration suite: `packages/sim/src/save/giftSave.test.ts`, `packages/sim/src/save/migrations.test.ts`
- Chain guard: `packages/sim/src/module-size.test.ts` (green, no offenders)

## Deviations

1. **`packages/sim/src/cup/storm-gift.test.ts` kept its filename** (not renamed to `league-reward.test.ts`): both `git rm` attempts were rejected by the phase shell allowlist (`Permission denied: shell`), so file deletion was unavailable. The tracked file was rewritten in place with the generalized suite content; the brief allows renames "as needed", and this was the only path that needed none.
2. **`packages/sim/src/save/migrations/v21.ts`** (outside Touches): one-line-class edit — `stormGiftSeed` → `leagueRewardSeed` import rename plus the `rewardRecordOf` reshaping, required because the earlier steps must construct the *current* `GameState` shape (pre-existing repo pattern; the old field names no longer typecheck).
3. **`packages/sim/src/save/migrations/v0–v20.ts`, `v22.ts`, `v23.ts`** (outside Touches): same current-shape reshaping via `rewardRecordOf` — forced by the shared-`GameState` migration architecture.
4. **`packages/sim/src/save/transfer.test.ts`** (outside Touches): one line — the export filename pin now reads `apex-league-save-v25-…` because the filename derives from `SAVE_VERSION`.
5. **Version-pin test files** (`branchesSave`, `breedingSave`, `cupSave`, `evolutionKnowledge`, `legacySave`, `releasePolish`, `save.test.ts`, `stableSave.test.ts`): `SAVE_VERSION`/`version` pins 24 → 25, forced by the bump.
6. **Temporary size-report test runs**: two temporary `console.log` report tests were briefly appended to `packages/sim/src/module-size.test.ts` and `apps/client/src/stable.test.ts` to capture byte sizes for this report (no other size-reporting command was allowlisted); both edits were reverted verbatim afterward (`git diff` confirms both files carry only their intended task changes).

## Notes for the primary

- **Action needed:** the stray untracked file `packages/sim/src/cup/league-reward.test.ts` (a 3-line tombstone from the abandoned rename) could not be deleted — `git rm` is outside the phase shell allowlist. Please `git rm`/delete it before the state commit; it must not be committed.
- **Commit grouping:** `apps/client/src/gift.ts` + `cup/results.ts` landed inside `7bad59b` (they were staged when the commit was cut); there is no separate T3 commit.
- The bare `biome` binary does not resolve in this sandbox; the lint leg is green through `bun run verify` (which invokes `biome check` internally) — recorded in the commands table.
- `giftEgg` lineage marker semantics unchanged as the marker on reward hatches; the one-gift rule itself was superseded by the per-tier queue (a stashed gift pet no longer blocks the next tier's reward — covered by tests).
- Six boss bands untouched; `species.ts`/`branches.ts`/`battle/moves.ts` untouched beyond the `stormGiftSeed` rename import in the migration step.

## Primary verification

Run by the primary agent on 2026-10-23, after squashing the phase commits into
`5fed606`.

**Structural checks**

| Check | Result |
| --- | --- |
| Working tree | Clean except the untracked phase evidence file. |
| Commits in `02dfc2c..HEAD` | `7bad59b`, `32b13b9` — exactly the two the report listed, no merge or user commits. |
| Files changed | 56 files, matching the report's list (incl. the reported deviations). The stray tombstone `packages/sim/src/cup/league-reward.test.ts` was deleted by the primary (`Remove-Item`) and is not in any commit. |
| Byte sizes | Largest touched module `state.ts` 10,624 B — under the 12,288 B cap; the sim module-size guard is green. |

**Deviation audit**

- `cup/storm-gift.test.ts` filename kept — the allowlist denies `git rm` to
  phase agents (documented limitation, same as the previous track's R1).
  The file's content is the generalized league-reward suite. Accepted.
- Migrations `v0…v23` reshaped — forced: every step constructs the current
  GameState shape, so the field rename ripples through the chain. The
  reshaping is mechanical (`rewardRecordOf` in `common.ts`, read by the
  primary: old storm pair → Silver claim + queue head, new fields forwarded
  verbatim). The golden chain tests plus the migration lock cover
  behaviour. Accepted.
- Version-pin test updates (8 save suites + `transfer.test.ts` filename
  pin) — forced by `SAVE_VERSION` 25. Accepted.
- Temporary size-report test edits, reverted verbatim — verified via
  `git diff` (both files carry only intended changes). Accepted.
- The one-gift-per-save rule being superseded by the per-tier queue — this
  is the intended generalization (FR-5: tiers grant independently), not a
  regression; covered by the rewritten grant suite. Accepted.

**Independent command results**

| Check | Command | Exit | Result |
| --- | --- | --- | --- |
| Whole-repo suite | `bun test --timeout 120000` | 0 | 2,401 tests, 91,273 expect() calls, 0 fail across 177 files. |
| Typecheck | `bun run check` | 0 | No type errors — sim 146, voxel 72, client 350 files. |
| Lint | `bunx biome check` (direct) | 0 | 550 files checked, no fixes applied. |
| Determinism | `bun run gate:determinism` (via `bun run verify`) | 0 | 12 creature GLBs + 5 props byte-identical. |
| Integrated gate | `bun run verify` | 0 | Green end to end. |
| Build (`verify_phase`) | `bun run build` | 0 | `@apex/client` build succeeded (292 modules). |

**Code-level review by the primary**

- `save/migrations/v24.ts` read in full: `rewardRecordOf(s)` maps
  `stormGiftClaimed: true` → `["silver"]` and a pending gift → the queue
  head; everything else forwards untouched. Lossless by construction.
- `cupRewards.ts#grantLeagueRewards` read in full: iterates
  `REWARD_SPECIES` (ascending tier), `tierAtLeast` gate, per-tier claim
  dedupe, queue append — grants in ascending tier order, forfeit early
  return preserved.
- `breeding/gift.ts#hatchGiftEgg`: hatches the queue head only, one claim
  per flow; the pure-egg contract (no drift draw, `affinity: null`,
  seed-exact preview) is unchanged.
- `apps/client/src/gift.ts`: species-neutral copy, crest repainted from the
  pending egg's element, visibility via `leagueRewardPending`.

**Acceptance criteria**: AC-5, AC-6, AC-8 and the claim-UI half of FR-9 are
each backed by named tests and the mapping proof above.

**Flags carried forward**

- `state.ts` (10,624 B) is now the sim's second-largest module — 1,664 B of
  headroom. Future state growth should consider splitting the GameState
  interface.
