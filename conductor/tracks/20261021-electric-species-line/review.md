# Review — Electric Species Line (`20261021-electric-species-line`)

- **Track:** 20261021-electric-species-line — Electric Species Line
- **Branch:** `feat/20261021-electric-species-line`
- **Base commit:** `461e779`
- **Reviewed HEAD:** `5da2183`
- **Mode:** strict (`review.strict: true`) — findings are fixed, not deferred
- **Rounds:** 2 (round 1 below, round 2 appended after the fix round)
- **Diff reviewed:** `461e779..5da2183 -- . ':!conductor'` — 56 files, +2,893 / −76

## Round 1

### Method

The reviewer subagent was dispatched first and failed (provider rate limit), so
the primary agent ran the read-only review against the same inputs: the spec's
requirement IDs, the diff, the plan, and the phase evidence files. Every
finding below was re-verified against the code at the cited lines before it was
accepted — no finding is recorded on the reviewer's word alone. The
configured checks had already run green on this HEAD (`bun run verify` exit 0:
typecheck + biome 487 files + 2,213 pass / 1 skip / 0 fail + determinism gate
12/12 GLBs byte-identical; `bun run build` exit 0).

### Findings

| ID | Severity | Location | Finding |
| --- | --- | --- | --- |
| F1 | High | `packages/sim/src/cupRewards.ts:97`, `packages/sim/src/breeding.ts:405` | **The granted reward never reaches the player.** `applyStormGift` stamps `stormGiftClaimed` and nothing else; the only hatch path (`createGiftEgg` / `hatchGiftEgg`) has no non-test caller anywhere outside `.conductor/evidence`, and the client never reads `stormGiftClaimed` (zero references in `apps/client`). A player who reaches Silver gets a saved flag and no egg: no results row, no nursery card, no preview, no hatch. FR-5 ("grants a pure gift egg"), FR-6 ("nursery preview matches the hatch exactly"), FR-9's nursery surface, and AC-1/AC-6 are therefore not deliverable through the product — the Phase 5 lifecycle evidence drove the sim API directly. README and `product.md` (Phase 5) assert the line is "playable end to end". |
| F2 | High | `packages/sim/src/breeding.ts:253`, `packages/sim/src/species.ts:112`, `apps/client/src/graduation/nursery-vm.ts:97` | **The nursery offers a species the sim refuses to create.** `createBredCreature` routes through the gated constructor `createCreature`, which throws `Species not yet available: electric_hound` for a species with `available: false`. `speciesOptions(pair)` returns the parents' species ids, so once a hound reaches the Hall the nursery renders it as a selectable chip, and `hatchPreview` calls `createBredCreature` inside the render path — an uncaught exception in the client, and `graduateWithPair` throws for the same reason. Breaks the spec's own edge case ("a hound follows standard dual-parent breeding rules"). |
| F3 | Medium | `packages/sim/src/breeding.ts:405-409` | **The gift hatch silently destroys the player's current career.** `hatchGiftEgg` overwrites `state.creature` with no Hall-of-Fame archive, unlike every other succession path (`graduateWithPair` archives the retiree at `breeding.ts:348`). The outgoing pet's name, stats, loadout and cups vanish with no record. |
| F4 | Medium | `apps/client/src/handbook/chart.ts:20-23` | **The handbook contradicts itself.** The Moves page now lists `Electric · Storm Hound` (data-driven over `ALL_SPECIES`), while the type-chart page in the same modal still says "Fire, Plant, and Water partners roam the league today. Electric, Earth, and Wind matchups are charted and waiting for their species." |
| F5 | Medium | `packages/voxel/src/fuzz/` | **The new archetype ships with no fuzz coverage.** Every other archetype has `boundary.*` (40 seeds) and `budget.*` (8 seeds) partitions plus a determinism partition; there is no `storm_hound` equivalent, so the "no voxel touches the grid boundary" invariant and the 320 KiB GLB tripwire are unverified for the hound's long muzzle and whip tail. |
| F6 | Low | `packages/sim/src/machine.ts:18-21` | **The rival pool is derived from the wrong registry.** `POST_OBTAINABLE_POOL` is built from `LOCKED_SPECIES` — documented as "not yet acquirable" — so it is correct only because that array holds exactly one species. The next teaser species added there would join every Silver+ bracket with no tier gate. |
| F7 | Low | `packages/sim/src/index.ts:117` | **The unchecked creation seam is public.** `createCreatureFrom` bypasses the starter gate and is exported from the package barrel, though its only legitimate caller is `createGiftEgg` inside the sim. The "public starter gate stays locked" property is then only pinned for `createCreature`. |
| F8 | Low | `packages/voxel/src/face.test.ts:167,244` | **Two heavy geometry tests had their budgets raised 6×** (20 s → 120 s) because the suite grew under this track. A slow test is a bug in the test; raising the ceiling masks the slowdown and lets each test occupy two minutes. |

### Coverage (round 1)

| ID | Status | Note |
| --- | --- | --- |
| FR-1 | partial | The 3-stage line and its branches exist (`species.ts`, `branches.ts`, `moves.ts`); the *obtain* step is unreachable — F1. |
| FR-2 | covered | `storm_hound.ts`, three registered artifacts, accent-tint branch forms; fuzz gap — F5. |
| FR-3 | covered | `species.ts:122` stat bounds; distinctness asserted in `species.test.ts`. |
| FR-4 | covered | Six-move kit, learn schedule and equip-4 asserted in `battle/moves.test.ts`. |
| FR-5 | partial | The claim fires once at tier ≥ Silver (`cupRewards.ts`, `storm-gift.test.ts`); the egg half is never delivered — F1. |
| FR-6 | partial | `createGiftEgg` stamps `affinity: null` with no drift draw; no preview surface — F1. |
| FR-7 | covered | Tier-gated pool in `machine.ts`, `rival-roster.test.ts` 5/5, boss sides untouched. |
| FR-8 | covered | Save v21 + migration + `docs/save-schema.md` + `giftSave.test.ts`. |
| FR-9 | partial | Handbook moves and the data-driven surfaces are in; the nursery preview is not — F1; copy contradiction — F4. |
| FR-10 | covered | Housekeeping done in Phase 0; `.conductor/runs/` emptied, `tracks.md` mojibake fixed. |
| AC-1 | partial | Lifecycle proven through the sim API, not through the product — F1. |
| AC-2 | covered | 12/12 artifacts byte-identical in the determinism gate. |
| AC-3 | covered | `species-electric.balance.test.ts`; `bosses.balance.test.ts` untouched and green. |
| AC-4 | covered | Learn-schedule and equip-4 tests green. |
| AC-5 | covered | Eight grant paths asserted (silver, second finalize, bronze, promotion cup, forfeit, forfeit-then-real, gold runner-up, purity). |
| AC-6 | partial | `createGiftEgg(42) ≡ hatchGiftEgg`; no preview surface — F1. |
| AC-7 | covered | Bronze bracket deep-equals the plain draw; boss slot intact. |
| AC-8 | covered | Round-trip and v20→v21 migration green. |
| AC-9 | covered | `visual-pass.ts`: 0 console/page errors at 1440×900 and 393×852. (The harness injected a fixture save rather than playing the flow — see F1.) |
| AC-10 | covered | Housekeeping evidence in `verification/phase-0.md`. |
| NFR-1 | covered | `module-size.test.ts` 5/5 after the handbook change. |
| NFR-2 | covered | No dependency changes; gate extended to 12 GLBs, byte-identical. |
| NFR-3 | covered | Drift-stream purity pinned by test; the gift consumes no draw. |
| NFR-4 | covered | Boss bands untouched; 2,213 pass / 0 fail. |
| NFR-5 | covered | Hue 50° from the shared element table, shared AO floor, shared bead-eye kit. |

### Verdict (round 1)

**CHANGES REQUESTED** — F1 and F2 are blocking: the track's headline reward is
unreachable in the shipped client while the docs claim it is playable, and the
nursery offers a species the sim throws on. F3–F5 are fixed in the same round
(strict mode: no deferrals). F6–F8 are fixed too, since each is a small,
contained change.

### Fix round (R1)

Recorded in `plan.md` as Phase R1. Summary of the resolution:

- **F1** — the grant now creates a persisted pending egg (save v22 field
  `pendingGift`), the cup results show the grant, and a HUD chip opens a
  Storm Gift card that previews the exact hatch and commits it through the
  store. The preview and the hatch use the stored seed, so they cannot drift.
- **F2** — breeding creates any *known* species through the unchecked seam; the
  starter gate (`createCreature`) is unchanged, so the hound is still not a
  starter.
- **F3** — the gift hatch archives the outgoing creature into the Hall of Fame
  before the hound takes the ranch.
- **F4** — the handbook's population note now names the storm hound.
- **F5** — `storm_hound` gets the same boundary, budget and determinism fuzz
  partitions as the other three archetypes.
- **F6** — the rival pool is derived from an explicit per-species reward tier,
  not from the locked-species array.
- **F7** — `createCreatureFrom` is no longer exported from the package barrel.
- **F8** — the two heavy face tests are split per archetype and their budgets
  restored to 20 s.

Round 2 results are appended below.

## Round 2

### Method

The reviewer subagent was dispatched again after the fix round and failed
(provider rate limit), so the primary agent re-reviewed the R1 diff
(`31fbbbe..b3e800a`) against the same checklist: every round-1 finding
re-verified at its cited lines, the new code read for correctness, and the
requirement coverage re-derived from the diff and the evidence files.

### Findings closed

| ID | Severity | Resolution | Verified by |
| --- | --- | --- | --- |
| F1 | High | The grant creates a persisted pending egg; the results screen names it, a ranch chip opens the card, the card previews the exact hatch and the hatch commits through the store. | `packages/sim/src/cupRewards.ts:104`, `packages/sim/src/breeding.ts:405`, `apps/client/src/gift.ts`, `apps/client/src/app/hud-screen.ts:192`; browser pass: chip → card → hatch at two widths, 0 errors; `giftSave.test.ts` round-trip; `storm-gift.test.ts` preview == hatch |
| F2 | High | Breeding creates any known species through the unchecked seam; the starter seam still refuses the hound. | `packages/sim/src/breeding.ts:257`; `species.test.ts` "a hound pair breeds a hound (review round 1, F2)" — the gate still throws |
| F3 | Medium | The hatch archives the outgoing creature in the Hall of Fame. | `packages/sim/src/breeding.ts:419`; `storm-gift.test.ts` "the outgoing partner is archived, not dropped (review round 1, F3)"; browser pass: the card names the retiree before the hatch |
| F4 | Medium | The population note names the storm hound. | `apps/client/src/handbook/chart.ts:21`; the Phase 4 visual pass re-ran clean |
| F5 | Medium | `storm_hound` gained boundary, budget and determinism fuzz partitions. | `packages/voxel/src/fuzz/*storm_hound*` (7 files, 30 fuzz tests green); a pre-check over 40 seeds × 3 stages found 0 boundary violations and a 195 KB max GLB |
| F6 | Low | The pool derives from each species' `rewardFromTier`. | `packages/sim/src/species.ts:obtainableSpecies`, `packages/sim/src/machine.ts:74`; `species.test.ts` "carries the tier that unlocks it" |
| F7 | Low | `createCreatureFrom` is no longer exported from the barrel. | `packages/sim/src/index.ts`; the client compiles against the narrower surface |
| F8 | Low | The heavy face loops are split per archetype with 20 s budgets. | `packages/voxel/src/face.test.ts` — 15 tests in 6.9 s |

### New findings

None. The R1 diff was read for correctness, save-migration shape, client
wiring, and module-size headroom; no new defect was found.

### Coverage (round 2)

| ID | Status | Note |
| --- | --- | --- |
| FR-1 | covered | The obtain step now reaches the player: grant → pending egg → card → hatch (browser-verified), then raise → evolve → branch → compete (Phase 5 lifecycle). |
| FR-2 | covered | Archetype, three gated GLBs, accent-tint branch forms, and now the same fuzz coverage as the other archetypes. |
| FR-3 | covered | Fast-striker bounds, distinct from every starter. |
| FR-4 | covered | Six-move kit, learn schedule, equip-4. |
| FR-5 | covered | The grant fires once at tier ≥ Silver, never on a forfeit, and now delivers a persisted egg. |
| FR-6 | covered | Pure egg (`affinity: null`, no drift draw) and the nursery preview is the same seed as the hatch. |
| FR-7 | covered | The rival pool reads the per-species reward tier; Bronze brackets stay byte-identical. |
| FR-8 | covered | Save v21 + v22 with two linear migrations, `docs/save-schema.md` updated in the same phase. |
| FR-9 | covered | Handbook (moves + chart note), ranch, plate, detail modal, and the gift card. |
| FR-10 | covered | Housekeeping unchanged since Phase 0. |
| AC-1 | covered | Phase 5 lifecycle + the R1 browser pass (grant → hatch → the hound on the ranch). |
| AC-2 | covered | 12/12 GLBs byte-identical in the gate. |
| AC-3 | covered | Balance probe green; boss bands untouched. |
| AC-4 | covered | Learn-schedule and equip-4 tests green. |
| AC-5 | covered | Grant paths asserted (silver, second finalize, bronze, promotion cup, forfeit, forfeit-then-real, gold runner-up, purity). |
| AC-6 | covered | `createGiftEgg` ≡ the hatched creature; the card previews the same seed (browser-verified). |
| AC-7 | covered | Bronze deep-equals the plain draw; the boss slot is intact. |
| AC-8 | covered | Round-trip, the v20→v21 and v21→v22 migrations, and the export filename all green. |
| AC-9 | covered | Both visual passes (Phase 4 surfaces, R1 gift flow) clean at 1440×900 and 393×852. |
| AC-10 | covered | Housekeeping evidence in `verification/phase-0.md`. |
| NFR-1 | covered | Module-size gate green; the HUD update module keeps its headroom. |
| NFR-2 | covered | No dependency changes; the gate covers 12 GLBs, byte-identical. |
| NFR-3 | covered | Drift-stream purity pinned; the grant consumes no draw. |
| NFR-4 | covered | Boss bands and existing goldens unchanged; 2,235 pass / 0 fail. |
| NFR-5 | covered | Hue 50°, shared AO floor, shared bead-eye kit; the hound now inherits the same fuzz gates. |

### Checks (round 2)

| Command | Result | Summary |
|---|---|---|
| `bun run verify` | pass | typecheck + biome (496 files) + 2,235 pass / 1 skip / 0 fail + determinism gate 12 GLBs and 5 props byte-identical |
| `bun run build` | pass | all packages built |
| gift visual pass | pass | chip → card → hatch at 1440×900 and 393×852; 0 console/page errors |
| Phase 4 visual pass (re-run) | pass | handbook, detail modal, ranch; 0 console/page errors |

### Verdict (round 2)

**APPROVED** — every round-1 finding is closed at its source, no new finding
was introduced, and the track's requirements are covered end to end. No debt
is carried forward: `issues.enabled` is `false`, and nothing was deferred.

### Deviations from the original plan

- **Save v22 in the same track** (v21 in Phase 2): the granted egg has to
  persist, and a pending egg is a persisted value. Linear migration, four new
  tests, documented in `docs/save-schema.md`.
- **The gift surface is a ranch card, not the nursery screen**: the nursery is
  only reachable at graduation, so a gift granted mid-run had no surface.
