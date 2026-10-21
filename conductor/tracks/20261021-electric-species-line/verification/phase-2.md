# Phase 2 — Silver Reward & Gift Egg

- **Track:** 20261021-electric-species-line
- **Phase:** 2 of 5 — Silver Reward & Gift Egg
- **Date:** 2026-10-21
- **Branch:** `feat/20261021-electric-species-line`
- **Base commit:** `563d294` (phase base; Phase 1 checkpoint `c33482d` underneath)
- **Head commit:** `752220e`
- **Result:** ✅ verified

## What was built

1. **P2.T1 — the grant (FR-5, AC-5).** `applyStormGift(state, forfeited)`
   in `cupRewards.ts`: a pure reward-layer step, mirrored on
   `applyCupRewards`, stamped by `finalizeCup` in `machine.ts` right after
   `applyCupRewards`. It flips `state.stormGiftClaimed` (new `GameState`
   field, save v21) exactly once when a non-forfeit cup closes on a
   post-placement Silver-or-higher ladder; bronze, forfeits, and
   already-claimed saves return the state unchanged. Retroactivity is by
   construction — the check reads the *current* tier at every non-forfeit
   finalize, so an existing save already past Silver is granted at its next
   real finalize. Placement runs before the grant, so a promotion-cup
   champion crowned into Silver is paid in the same finalize.
2. **P2.T2 — the pure gift egg (FR-6, AC-6, NFR-3).** `createGiftEgg(seed)`
   in `breeding.ts`: fixed Electric (`STORM_GIFT_SPECIES_ID` =
   `electric_hound`), affinity stamped `null` directly — **no
   `rollAffinityDrift` call, no drift RNG draw** — stats rolled from the
   seed (same seed → same individual, so nursery preview = hatch), marker
   `giftEgg: true`. Reaches the locked species through the new unchecked
   seam `createCreatureFrom(species, seed)` in `creature.ts`
   (`createCreature` keeps its availability gate untouched;
   `species.ts` stays locked). `hatchGiftEgg(state, seed)` is the nursery's
   hatch seam: refuses `not-granted` / `already-hatched` (the one-gift rule
   is derived from the persisted markers: active creature `giftEgg` or any
   Hall record `giftEgg`), replaces the active creature per the
   single-creature rule without a Hall retirement — a grant, not a
   graduation — and carries day/AP/ladder/lineage over untouched.
   `RetiredRecord.giftEgg` (`legacy.ts`) archives the marker with the
   career. Drift-stream purity is pinned by test: `rollAffinityDrift`
   outcomes and a full bred hatch are byte-identical with and without an
   intervening gift creation.
3. **P2.T3 — save v21 (FR-8, AC-8).** `SAVE_VERSION` 20 → 21; linear
   migration step `20` stamps `stormGiftClaimed: false`, `creature.giftEgg:
   false`, and `giftEgg: false` on every Hall record (defaults are true:
   no pre-v21 save received the gift, no hatched career predates it),
   forwards the live session untouched; `storage.ts` validation
   (`isValidCreature`, `isValidRetiredRecord`, `isValidSaveState`) rejects
   non-boolean / missing markers; `docs/save-schema.md` rows and the v21
   validation paragraph added in the same phase; `giftSave.test.ts` pins
   migration determinism/idempotence, corrupt-field refusal, and
   export/import round-trips.

## Boundary note (egg representation)

Egg/nursery presentation is client-side over the graduation seams; the sim
persists exactly what FR-8 requires — the claim flag and the gift-egg
lineage marker (`Creature.giftEgg`, `RetiredRecord.giftEgg`). The gift's
hatch seam is `hatchGiftEgg` (a grant, deliberately distinct from
`graduateWithPair`), which the nursery flow can call with the same seed it
previewed with.

## Commands

| Command | Result |
|---|---|
| `bun run check` | ✅ exit 0 — no type errors (voxel 62, sim 98, client 302 files) |
| `bun test --timeout 120000` | ✅ exit 0 — 2190 pass, 1 skip, 0 fail, 88623 expect calls, 160 files |

Both run sequentially from the repo root on the final state (commit `752220e`).

## Acceptance criteria

| AC | Evidence |
|---|---|
| AC-5 grant once / never duplicate / never below Silver / retroactive | `cup/storm-gift.test.ts`: silver finalize claims once; second finalize stays claimed; bronze never claims; promotion-cup champion crowned into Silver claims in the same finalize; forfeit never triggers and does not consume (next real finalize grants); gold runner-up final-loss grants (retroactive); `applyStormGift` idempotent on claimed |
| AC-6 fixed Electric, affinity null, preview = hatch | `createGiftEgg(42)` ≡ `hatchGiftEgg(granted, 42)` creature (`toEqual`); element `"electric"`, affinity `null`, `giftEgg: true`, stage `"baby"`, parents `[]`; stats within species bounds; same seed → same individual; public starter gate stays locked (`createCreature` still throws) |
| AC-8 round-trip + v20→v21 migration | `save/giftSave.test.ts`: v20 state/Hall record migrate with defaults stamped `false`; numbers/savedAt/session preserved; deterministic + idempotent; corrupt claim flag / missing flag / missing or non-boolean `giftEgg` → `loadGame` null with payload unmutated; export/import round-trip keeps both fields; `transfer.test.ts` filename pin bumped to v21 |
| NFR-3 drift stream purity | intervening `createGiftEgg(999)` leaves `rollAffinityDrift(drake, MIXED_PARENTS, 7)` unchanged; a full `createBredCreature("fire_drake", 7, MIXED_PARENTS, 1)` hatch is `toEqual`-identical with and without an intervening grant |
| Balance guardrails | `bosses.balance.test.ts`, `cup.golden.test.ts`, breeding/legacy goldens, `species-electric.balance.test.ts` all pass unchanged (2173 → 2190 tests, only additions) |

## Evidence paths

- `packages/sim/src/cup/storm-gift.test.ts` (P2.T1 grant paths + P2.T2 gift/purity tests)
- `packages/sim/src/save/giftSave.test.ts` (v21 migration, validation, transfer)
- `docs/save-schema.md` (v21 rows: `stormGiftClaimed`, `Creature.giftEgg`,
  `RetiredRecord.giftEgg`, migration chain step, validation paragraph)
- Commits: `77f4ee5` (T1), `a624b32` (T2), `752220e` (T3)

## Deviations

- `packages/sim/src/ticker.ts` — outside the listed Touches;
  `advanceDay`'s full-state literal is the type-checked mirror of
  `GameState`, so it had to carry `stormGiftClaimed` forward (pure
  pass-through, no behavior change).
- `packages/sim/src/legacy.ts` — outside Touches; FR-8 requires the
  gift-egg lineage marker to persist, so `RetiredRecord.giftEgg` +
  `retireeRecord` stamping (`creature.giftEgg ?? false`) were required.
- `packages/sim/src/creature.ts` — listed only as "availability gate only
  if required"; the required choice was the unchecked seam
  `createCreatureFrom` (smallest change: gate intact, one explicit bypass).
- Test fixtures outside Touches updated because the new required fields
  break full-literal typing: `ap.test.ts`, `breeding.test.ts`,
  `species.test.ts`, `stats.test.ts`,
  `species-electric.balance.test.ts`, save-test version pins
  (`save`, `branchesSave`, `breedingSave`, `cupSave`,
  `evolutionKnowledge`, `legacySave`, `releasePolish`,
  `corruptRecovery`, `transfer`), client tests `graduation.test.ts`,
  `hud/copy.test.ts`, `graduation/nursery-vm.test.ts`.
- `packages/sim/src/index.ts` — barrel exports for the new public symbols
  (explicitly allowed by the brief).

## Notes

- Shell policy only allowed the exact verification commands from the repo
  root; all iteration ran through the two configured commands.
- One transient cold-machine flake earlier in the phase (a voxel fuzz test
  and once a client rendering test hitting their per-test timeouts) did not
  recur; both final verification runs are fully green.
- `stormGiftClaimed` was placed after `evolutionKnowledge` in
  `GameState`/`createInitialState` and in every migration step, matching
  the append-only field order the chain documents.
