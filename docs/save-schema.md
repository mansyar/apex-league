# Save Schema Reference

The save is a single JSON string under the localStorage key `apex.save`
(see `packages/sim/src/save/storage.ts`). Everything about it is versioned,
migrating, and pure — the sim owns the schema; the client only reads and
writes through the `SaveAdapter` seam.

```ts
// packages/sim/src/save/schema.ts
interface SaveData {
  version: number // current: 24 (SAVE_VERSION)
  state: GameState
  savedAt: number // Date.now() of the persist
  session: CupSession | null // live cup walk (v7+; null outside a cup)
}
```

## `GameState` at v24

| Field | Type | Meaning |
|---|---|---|
| `day` | integer ≥ 1 | Current in-game day (1-based). |
| `phase` | `"day" \| "cup"` | Cup phase is granted by the ticker on cup days; `finalizeCup` returns the game to the day phase. |
| `actionPoints` | integer ≥ 0 | AP left today (max from `ACTION_POINTS_PER_DAY` + cup-win bonus). |
| `creature` | `Creature \| null` | The partner; null until a starter is chosen. Stats carry the v12 HP scale (see the migration table). |
| `settings` | `{ reducedMotion: boolean, seenHints: string[], arenaCamera: "cinematic" \| "broadcast", muted: boolean, musicVolume: number, sfxVolume: number }` | In-app motion preference (v5+); dismissed onboarding hint ids (v7+); arena camera style for the battle presentation (v9+, default `"cinematic"`); persisted audio mute (v13+, default `false`); music and SFX bus levels 0–1 (v16+, default `1.0`). Mute overrides both levels. |
| `cupsWon` | integer ≥ 0 | Permanent cup-win counter (v5+). |
| `lastCupDay` | integer ≥ 1 \| null | Day of the last cup win; the ticker grants +1 AP the next day (v5+). |
| `ladder` | `{ points: integer ≥ 0, tier: "bronze"\|"silver"\|"gold"\|"legend", subTier: "III"\|"II"\|"I" }` | Ladder standing: placement points, current tier, and sub-tier. `tier` arrived at v11; Gold and Legend arrived at v14. Migrated saves keep their points and sub-tier (banked progress is the player's real standing at the promotion gate). |
| `lineage` | `{ generation: integer ≥ 0, hallOfFame: RetiredRecord[] }` | The bloodline (v10+): completed graduations plus an archived-career list. Fresh after migration (`{generation: 0, hallOfFame: []}`) — no backfill; `cupsWon` (v5) already feeds the derived prestige rating. |
| `bossDefeats` | string[] | Boss ids defeated by the current creature's career, in defeat order (v11+). An idempotent ledger — the client derives callouts, coach lines, and Hall of Fame scalps from it. Migrated saves start empty (`[]`); no boss existed before v11. |
| `legendTitles` | integer ≥ 0 | Legend-plateau titles earned (v14+). Stamped `0` on migration: no pre-v14 career could reach a plateau that did not exist yet. |
| `evolutionKnowledge` | `{ juvenile: boolean, champion: boolean }` | Which evolution gates the player has already cleared once (v17+). Save-wide and per gate: the night a creature actually evolves through a gate flips that gate to `true` and never back. The Growth panel shows exact thresholds only for a known gate. Migrated saves infer it from the active creature's `stage`. |
| `stormGiftClaimed` | boolean | The Silver tier-reward claim (v21+). Stamped `true` exactly once by the cup finalize's reward seam when a non-forfeit cup closes on a post-placement Silver-or-higher ladder - never below Silver, never on a forfeit, never twice. The granted "Storm Gift" egg itself lives in the nursery flow (`breeding.ts`); this flag is the league-side guarantee that it is granted at most once. Migrated saves stamp `false`: no pre-v21 save has received the gift, and the retroactive rule delivers it on the next non-forfeit finalize. |
| `pendingGift` | `{ speciesId: string, seed: integer }` \| null | The granted Storm Gift egg, waiting in the nursery for the player to hatch it (v22+). `null` when no egg is waiting - never granted, or already hatched. The seed travels with the egg so the nursery preview and the hatch roll the same individual. A v21 save that already claimed the gift but never hatched one (the v21 grant only stamped the flag) receives the egg it was promised here; a save whose gift career is already in the lineage gets nothing. |
| `stable` | `Creature[]` | The stable (v24+): every pet the player owns that is not in the ranch. There is no capacity limit, and exactly one pet is active (`creature`); a swap between the ranch and the stable is free, instant and lossless - every field of a pet travels with it. A stashed pet is frozen: the night settlement touches neither its conditions nor its age, and it cannot train, evolve, graduate or compete until it returns. Migrated saves stamp `[]`: a pre-v24 save owns one pet, and it is the ranch pet. |

### `Creature`

| Field | Type | Meaning |
|---|---|---|
| `name` | string | Player-facing name (rivals draw from a separate pool). |
| `speciesId` | non-empty string, must exist in the species catalog | Drives stats bounds, element, kit. Hand-edited unknown species are rejected on load. |
| `archetypeId` | non-empty string | Voxel archetype used for rendering ("draconic", "bovine", ...). |
| `stage` | `"baby" \| "juvenile" \| "champion"` | Evolution stage. |
| `ageDays` | integer ≥ 1 | The pet's own age in days (v23+): the number of days it has been alive, counting the day it hatched (1 on its hatch day). The juvenile, champion and graduation gates read this and never the world day, so a pet hatched late matures on its own tenth night. The night settlement advances it by exactly one, and only the active pet is settled. Migrated saves stamp the world day — today's effective age — so a v22 save matures on precisely the night it matures on today. |
| `branch` | string \| null | The form earned at the juvenile gate (v19+). A baby is always `null`; a juvenile or champion may be `null` (a hand-built or not-yet-resolved payload), `"legacy"` (the migration-only signature-less old line), or a real branch from `branches.ts` owned by this creature's `speciesId`. |
| `affinity` | string \| null | The secondary type affinity (v20+). Won by the seeded 15% drift roll at breeding time (`breeding.ts`): when a parent's primary element differs from the egg's species element, that parent's element may attach as a second type. `null` for founders and migrated saves; never equal to `element` (validation rejects that — it is not clamped). Secondaries never chain: the drift roll reads only primary elements. |
| `giftEgg` | boolean | The gift-egg lineage marker (v21+). `true` only for a creature hatched from the league's one-time Silver tier-reward gift egg (the "Storm Gift", `breeding.ts`). Provenance, not battle data: the client derives gift copy from it, and the hatch seam derives the one-gift rule from the marker across the active creature, the stable and the Hall of Fame. Migrated creatures stamp `false`. |
| `stats` | `{hp, atk, def, spd}` | Rolled base stats; effective = base + evolution boost + trained. |
| `trained` | `{hp, atk, def, spd}` | Training bonuses, each capped (`TRAINED_START` … cap). |
| `conditions` | `{hunger, energy, health, mood, bond}` | 0–100, clamped nightly by settlement. |
| `fedToday` | boolean | Feeding gate for the day. |
| `trainingProgram` | `"power"\|"endurance"\|"sprint"\|"ring" \| null` | Tonight's training program (v18+); null = no program assigned. The four ids map onto a primary and a trickle stat (see the catalog table below). |
| `trainingResult` | `"gained"\|"sick"\|"hungry"\|"exhausted" \| null` | Last night's training outcome (`exhausted` arrived with v18). |
| `trainingDays` | integer | Cumulative training days (kit gating; 6 opens the full six-move pool). |
| `loadout` | string[] \| null | Equipped move ids (2–4), each one the creature knows; null = the default kit (first four known). |
| `sickCooldown` | integer | Nights since medicine; blocks evolution until 0 (v6+). |
| `traits` | `LineageTrait[]` | Up to four canonical lineage ids (`sturdy`, `fierce`, `guarded`, `quick`); derived at graduation, never hand-picked (v15+). Empty on a founder until then. |
| `parents` | integer[] | Parent generation numbers (v15+): `[]` for a founder, one entry for the single-parent successor path, two sorted entries for a bred egg. |

### Training programs (v18+) — `training.ts`

A program is a stat pair, not a single stat: it pays its **primary** on every
paid night and its **trickle** on every third trained night. The catalog is
single-sourced in `packages/sim/src/training.ts`
(`TRAINING_PROGRAMS`), in picker order.

| Id | Label | Primary | Trickle |
|---|---|---|---|
| `power` | Power Lifting | `atk` | `def` |
| `endurance` | Endurance Circuit | `hp` | `def` |
| `sprint` | Sprint Work | `spd` | `atk` |
| `ring` | Ring Craft | `atk` | `def` |

A program night pays only when the creature, at lights-out **before** the
night's recovery, is not sick, not waking up starving, and has at least
`EXHAUSTED_ENERGY` (30) energy. A paid night grants +1 to the primary (and +1
to the trickle when `trainingDays % 3 === 0`), both clamped at
`TRAINING_CAP`; it costs 10 energy; `ring` also adds +5 mood and +2 bond. A
night that fails the gate pays nothing and costs no energy — its result is
`"sick"`, `"hungry"`, or `"exhausted"` by that precedence. The assignment is
consumed at the end of the night (`trainingProgram` returns to null), so a
program is picked per day.

### Move knowledge is derived — no schema change needed

The save never stores which moves a creature has learned. Knowledge is
recomputed on load from three fields that were already there:
`speciesId` picks the six-move kit, `trainingDays` and `stage` feed
`requiredTierDays`. Indices 0–1 are known from birth, index 2 at three
trained days (or on evolution, which counts as training for that index
only), and indices 3–5 at six trained days. A creature always fields at
most four, so `loadout` records a choice among known moves, not a list of
what exists.

`setLoadout` rejects an id the creature does not know, the innate basic
strike, duplicates, and lengths outside 2–4. `loadout: null` resolves to
the first four known moves, which is exactly the four-move kit a pre-track
save fought with. Widening the pool therefore needs **no schema change**:
`loadout` and its validation are unchanged at v19, and the bumps to 16 (audio
mix levels), 17 (evolution discovery), 18 (training programs), and 19
(branching evolution) came from other tracks. A pre-pool save (v15 or earlier,
`loadout: null`) migrates onto the wider pool with no extra step.

### `RetiredRecord` (Hall of Fame)

| Field | Type | Meaning |
|---|---|---|
| `name`, `speciesId`, `archetypeId`, `element` | strings | The career as displayed in the Hall and the Nursery. |
| `stats` | `{hp, atk, def, spd}` | Effective stats at retirement (the inheritance source). |
| `trained` | `{hp, atk, def, spd}` | Training bonuses at retirement. |
| `cupsWon` | integer ≥ 0 | Lifetime cups at retirement. |
| `generation` | integer ≥ 0 | The generation this career belonged to. |
| `retiredOnDay` | integer ≥ 1 | Day of graduation. |
| `traits` | `LineageTrait[]` | Derived at graduation (v15+). Pre-v15 records migrate empty; `effectiveTraits` derives on read. |
| `parents` | integer[] | Recorded parentage (v15+), same shape as the live creature's. Pre-v15 records start empty — parentage was not recorded before v15. |
| `branch` | string | The form this career earned (v19+): a real branch id or `"legacy"`. A real branch must belong to the record's `speciesId`; `"legacy"` fits any species. Pre-v19 careers archive as `"legacy"`; their signature move is derived from this id on read, never stored. |
| `affinity` | string \| null | The secondary affinity at retirement (v20+), or `null`. Breeding reads only `element`, so a record's secondary never becomes a drift source. |
| `giftEgg` | boolean | The gift-egg lineage marker (v21+): `true` when this career hatched from the Silver tier-reward gift egg. Archived with the record so the gift's one-hatch rule survives retirement. Migrated records stamp `false`. |

## Migration chain

`migrate(raw)` walks the chain one step at a time (`migrate.ts`):

| Step | What changes |
|---|---|
| v0 → v1 | Flat `{version, day}` scaffold → state object (phase derived from day, full AP, null creature). |
| v1 → v2 | Grants the fire drake starter (seed 42) so mid-loop saves keep a partner. |
| v2 → v3 | Adds training: `trained` zeros, `trainingFocus`/`trainingResult` null. |
| v3 → v4 | Adds care fields: `fedToday: false`, `trainingDays: 6`, `loadout: null`. |
| v4 → v5 | Adds `settings` (`{reducedMotion: false}` fallback) + `cupsWon: 0`, `lastCupDay: null`. |
| v5 → v6 | Adds `creature.sickCooldown: 0` (evolution gate field). |
| v6 → v7 | Adds `settings.seenHints: []` (onboarding ledger) and the top-level `session: null` cup-session slot. The v6→v7 step forwards `reducedMotion` unchanged so corrupt values still fail load-time validation; an invalid persisted session is dropped (not fatal) by `loadSave`. |
| v7 → v8 | Adds the `ladder` slice (`{points: 0, subTier: "III"}`) and forwards the live cup session unchanged. No backfill: every migrated save starts the ladder fresh, even with `cupsWon` history. |
| v8 → v9 | Adds `settings.arenaCamera: "cinematic"` (arena camera style for the battle presentation; reduced-motion players stay pinned at render time). |
| v9 → v10 | Adds the bloodline slice `lineage: { generation: 0, hallOfFame: [] }` (legacy & breeding). No backfill: a migrated save starts fresh; `cupsWon` already feeds prestige. The cup session is forwarded unchanged. |
| v10 → v11 | Stamps `ladder.tier: "bronze"` — preserving the migrated ladder's points and sub-tier — and adds `bossDefeats: []` (silver ladder & rival bosses). No backfill: no boss existed before v11, and no save can predate the Promotion Cup, so `"bronze"` is the only correct stamp. |
| v11 → v12 | Doubles every stored HP magnitude for the element-chart HP scale (element chart & battle length): the live creature's `stats.hp`, every cup-session slot's `stats.hp` (rivals **and** the player snapshot), the bracket's `finalRival.stats.hp`, and every Hall of Fame record's `stats.hp`. Exact, not approximate: v11 effective stats were `base + 1×trained`, so doubling the stored base HP lands migrated saves on the same effective-pool curve as fresh v12 creatures. ATK/DEF/SPD, trained bonuses, ladder, and the ledger are scale-free and pass through untouched. |
| v12 → v13 | Adds `settings.muted: false` (audio foundation): sound stays on until the player silences it. Everything else forwards untouched. |
| v13 → v14 | Adds `legendTitles: 0` (Gold/Legend ladder): no v13 career can sit on a plateau that did not exist. The ladder is forwarded untouched — Gold and Legend are validated at load, not rewritten. |
| v14 → v15 | Adds `traits: []` and `parents: []` to the active creature and every Hall record (dynasty breeding). Traits are derived on read for pre-v15 careers; parentage begins with the first v15 succession. The live cup session is forwarded untouched — rivals are not lineage carriers. |
| v15 → v16 | Adds `settings.musicVolume: 1` and `settings.sfxVolume: 1` (release polish): older saves never chose a mix, so both buses start at full volume and the existing mute toggle keeps its authority. Everything else, including the cup session, is forwarded untouched. |
| v16 → v17 | Adds `evolutionKnowledge` (evolution discovery). There is nothing to forward from the old payload — the panel did not exist — so the record is **inferred from the active creature's `stage`**: `juvenile` ⇒ `{ juvenile: true, champion: false }`, `champion` ⇒ `{ juvenile: true, champion: true }`, no creature (or a baby) ⇒ both `false`. A pre-existing `evolutionKnowledge` field on the payload is ignored, so a hand-edited save cannot smuggle thresholds into a hidden panel. Settings, ladder, bloodline, boss ledger, and the cup session are forwarded untouched. |
| v17 → v18 | Replaces the single-stat `trainingFocus` with `trainingProgram` (training programs & form). The old key is mapped through `programFor` — the same table the old picker implied — and dropped; an unknown or absent focus becomes `null`. `trained`, `trainingDays`, `trainingResult`, settings, ladder, bloodline, boss ledger, and the cup session are forwarded untouched. |
| v18 → v19 | Adds `creature.branch` and `RetiredRecord.branch` (branching evolution & champion forms). Pre-v19 saves never chose a form, so the migration pins the old line: a baby becomes `null` (it earns its form at the next juvenile gate), a juvenile or champion becomes `"legacy"`, and every Hall record becomes `"legacy"`. Stats, trained bonuses, training days and program, loadout, conditions, evolution knowledge, lineage counters, the boss ledger, and the live cup session are forwarded untouched — no pre-v19 number changes. Cup slots carry species and stats only, so they gain no branch. |
| v19 → v20 | Adds `creature.affinity` and `RetiredRecord.affinity` (type affinity drift). Pre-v20 creatures never drifted — the roll did not exist — so the migration stamps `null` on the active creature and every Hall record: no inference, no backfill. Stats, branch, lineage fields, settings, the boss ledger, evolution knowledge, and the live cup session are forwarded untouched. |
| v20 → v21 | Adds `state.stormGiftClaimed`, `creature.giftEgg`, and `RetiredRecord.giftEgg` (the Silver tier-reward, electric species line FR-8). The claim flag stamps `false` - no pre-v21 save has received the gift, and the retroactive rule delivers it on the next non-forfeit cup finalize at Silver or higher. The gift marker stamps `false` on the active creature and every Hall record - no hatched career predates the gift. Everything else, including the live cup session, forwards untouched. |
| v21 → v22 | Adds `state.pendingGift` (the granted Storm Gift egg, v22+). A v21 save that already claimed the gift but never hatched one - the v21 grant only stamped the flag and never delivered an egg - receives the egg it was promised, rolled from a seed derived from the save's day and ladder points; a save whose gift career is already in the lineage (the `giftEgg` marker on the creature or a Hall record) gets nothing, and a save that never claimed waits for its next non-forfeit finalize. Everything else, including the live cup session, forwards untouched. |
| v22 → v23 | Adds `creature.ageDays` (the pet's own age, v23+). A v22 payload has no age field, and the world day WAS the effective age - the growth gates read `state.day` - so the migration stamps the world day on the active creature: the pet's gates then behave exactly as they did before the step, and a v22 save matures on precisely the night it matures on today. The Hall of Fame records no age (an age is the living pet's own), so every record forwards untouched, as does the live cup session. |
| v23 → v24 | Adds `state.stable` (the stable, v24+): the pets the player owns that are not in the ranch. A v23 payload predates the stable, so it holds exactly one pet - the ranch pet - and the migration stamps an empty stable. Nothing is inferred and nothing is carried over: the active pet keeps its own age and its career, the lineage, the ladder, the settings and the live cup session all forward untouched. |

### v18 → v19 branch mapping

| v18 state | v19 `branch` |
|---|---|
| Creature, `stage: "baby"` | `null` |
| Creature, `stage: "juvenile"` | `"legacy"` |
| Creature, `stage: "champion"` | `"legacy"` |
| Hall of Fame record | `"legacy"` |
| No creature | no creature (unchanged) |

`"legacy"` is migration-only and carries no signature move: its known pool is
the species kit exactly as before v19. New creatures are created with
`branch: null` and earn one of the species' real branches at the juvenile
gate, so no fresh career can ever acquire `"legacy"`. A migrated juvenile or
champion keeps the old line and finishes its career signature-less; a
migrated baby earns a real branch normally. The Hall of Fame archives the
form the career actually earned (`retireeRecord`), and a bred egg always
starts `null` — a parent's form is history, never inheritance.

### v17 → v18 focus mapping

| Old `trainingFocus` | New `trainingProgram` |
|---|---|
| `"hp"` | `"endurance"` |
| `"atk"` | `"power"` |
| `"def"` | `"power"` |
| `"spd"` | `"sprint"` |
| `null` | `null` |

`def` folded into `power` because no program trained DEF alone; the player
re-picks on the first day after loading, and a `null` mapping simply means no
program is assigned yet. `trainingResult: "exhausted"` (v18) is a new value of
an existing field, so the old chain needs no backfill.

The `session` slot holds a `CupSession` exactly as `prepareCup` produced
it (bracket, rival resolutions, verdicts, cursor position). It is
presentation bookkeeping: the client persists it on every session mutation
(prepare, after each fight, forfeit, auto-completion) and clears it when
the cup finalizes, so a refresh anywhere in the walk resumes exactly where
it stopped and committed cups can never strand their rewards.

Shared invariants, enforced by `validateStateShape(raw, version)` for every
state-bearing step: the state must be an object with integer `day ≥ 1`,
phase `"day"|"cup"`, integer `actionPoints ≥ 0` — otherwise the save is
rejected with `"invalid vN save: …"` and `loadGame` returns null (never
throws at callers).

At v16 the settings block must also carry finite `musicVolume` and `sfxVolume`
numbers in 0–1. The active creature and every Hall record must carry
well-formed lineage fields: `traits` is an array of at most four unique
known trait ids, and `parents` is an array of at most two unique
non-negative generation integers. Unknown/duplicate traits, more than two
parents, duplicate parents, non-integer parents, and out-of-range volumes
all fail the load.

At v17 the state must also carry `evolutionKnowledge` as an object with two
strict booleans, `juvenile` and `champion`. A missing block, a non-object, or
a non-boolean flag fails the load — the panel must never guess whether a
threshold is known.

At v18 the creature's `trainingProgram` must be one of the four catalog ids or
`null`. An unknown id, a stat key left over from the old focus field, a
non-string, or a missing field fails the load rather than silently dropping
the assignment; `trainingResult` accepts the four-value union above.

At v19 `creature.branch` is required and stage-dependent. A `baby` must be
`null` — it has not reached the gate, and `"legacy"` is reserved for migrated
older stages. A `juvenile` or `champion` may be `null`, the migration-only
`"legacy"`, or a real branch id that exists in `branches.ts` **and** names this
creature's `speciesId`. A branch on a baby, an unknown id, a branch owned by
another species, or a missing field fails the load — and a load failure never
rewrites the stored payload. Every Hall record's `branch` is required, must be
a known id, and a real id must match the record's species (`"legacy"` is
accepted for any species). Import validation runs the same predicate, so a v19
file with an unknown branch, a branch on a baby, or a mismatched Hall branch is
refused with `"invalid"` and the live save is left untouched.

At v20 `creature.affinity` and each Hall record's `affinity` must be `null` or
one of the six element ids, and must never equal that creature's or record's
own `element` — validation rejects the payload rather than clamping the value.
A missing `affinity` field fails the load like any other corrupt v20 field.
Import validation runs the same predicate, so a v20 file with a secondary equal
to its primary, an unknown element, or a missing `affinity` is refused with
`"invalid"` and the live save is left untouched.

At v21 `state.stormGiftClaimed` must be a plain boolean, and
`creature.giftEgg` plus each Hall record's `giftEgg` must be plain booleans.
A hand-edited claim flag (or a missing one) fails the load instead of
granting - or silently blocking - the gift; the same holds for the lineage
marker. Import validation runs the same predicate, so a v21 file with a
non-boolean or missing `stormGiftClaimed`/`giftEgg` is refused with
`"invalid"` and the live save is left untouched.

At v22 `state.pendingGift` must be `null` or an egg naming a known species
and an integer seed. A malformed egg fails the load instead of hatching an
unknown creature; import validation runs the same predicate, so a v22 file
with a broken pending egg is refused with `"invalid"` and the live save is
left untouched.

At v23 the active creature's `ageDays` must be a positive integer — the
days the pet has lived. A missing, zero, negative or fractional age fails
the load instead of letting the growth gates read a broken number; import
validation runs the same predicate, so a v23 file with a malformed age is
refused with `"invalid"` and the live save is left untouched.

At v24 `state.stable` must be a list, and every entry must be a whole pet:
the same `isValidCreature` predicate the active pet answers to — a known
species, a positive `ageDays`, a valid stage, branch and loadout. A
half-written stable (not a list, a pet with an unknown species, a broken
age) fails the load instead of half-loading a pet; import validation runs
the same predicate, so a v24 file with a malformed stable is refused with
`"invalid"` and the live save is left untouched. A pet with an unknown
species is refused in the stable exactly as it is refused in the ranch.

## Export and import

The client can download the current state as a session-free `SaveData`
(`buildSaveExport`) and import a known or older version from a file
(`inspectSaveImport`). Import parses, migrates, and validates with the same
`isValidSaveState` predicate as boot; a malformed file, invalid state, or any
version newer than `SAVE_VERSION` is refused with a reason and the live save is
never replaced. Accepted imports drop any live cup session and reload into the
day phase. The two volume levels, the creature's earned branch, the drifted
affinity, the pet's own age, the stable, and the Storm Gift bookkeeping
(claim flag and gift marker) travel with the save.

## Adding a new field (recipe)

1. Bump `SAVE_VERSION` in `packages/sim/src/save/schema.ts`.
2. Add a migration entry keyed to the previous version in the `migrations`
   record in `migrate.ts`. Destructure
   `validateStateShape(raw, <previous>)`, shape only the new field
   (defaults must be safe for a mid-life creature), and return
   `{version: <current>, state, savedAt, session}` (forward the incoming
   session unchanged — see the v7 → v8 step).
3. Extend the state validation in `storage.ts` (`isValidCreature` and/or
   the scalar checks) so corrupt values of the new field are rejected.
4. Tests, following `save.test.ts`:
   - the full chain test (`v0 → current`) still passes unchanged;
   - a fixture at the previous version migrates to the new one with the
     field defaulted;
   - corrupt new field → `loadGame` returns null;
   - round-trip: `saveGame` → `loadSave` equality (state + session).
5. Keep the chain ascending and never edit an existing step — old saves
   must migrate the same way forever.
