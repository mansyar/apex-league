# Save Schema Reference

The save is a single JSON string under the localStorage key `apex.save`
(see `packages/sim/src/save/storage.ts`). Everything about it is versioned,
migrating, and pure — the sim owns the schema; the client only reads and
writes through the `SaveAdapter` seam.

```ts
// packages/sim/src/save/schema.ts
interface SaveData {
  version: number // current: 18 (SAVE_VERSION)
  state: GameState
  savedAt: number // Date.now() of the persist
  session: CupSession | null // live cup walk (v7+; null outside a cup)
}
```

## `GameState` at v18

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

### `Creature`

| Field | Type | Meaning |
|---|---|---|
| `name` | string | Player-facing name (rivals draw from a separate pool). |
| `speciesId` | non-empty string, must exist in the species catalog | Drives stats bounds, element, kit. Hand-edited unknown species are rejected on load. |
| `archetypeId` | non-empty string | Voxel archetype used for rendering ("draconic", "bovine", ...). |
| `stage` | `"baby" \| "juvenile" \| "champion"` | Evolution stage. |
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
`loadout` and its validation are unchanged at v18, and the bumps to 16 (audio
mix levels), 17 (evolution discovery), and 18 (training programs) came from
other tracks. A pre-pool
save (v15 or earlier, `loadout: null`) migrates onto the wider pool with no
extra step.

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

## Export and import

The client can download the current state as a session-free `SaveData`
(`buildSaveExport`) and import a known or older version from a file
(`inspectSaveImport`). Import parses, migrates, and validates with the same
`isValidSaveState` predicate as boot; a malformed file, invalid state, or any
version newer than `SAVE_VERSION` is refused with a reason and the live save is
never replaced. Accepted imports drop any live cup session and reload into the
day phase. The two volume levels travel with the save.

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
