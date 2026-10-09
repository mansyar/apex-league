# Spec: Battle Resolution Core

**Track ID:** `battle_core_20261010` · **Type:** Feature (Phase 1 MVP core) · **Branch:** `track/battle_core_20261010`

## Overview

The league's exam becomes real, as a simulation plus a ranch exhibition — not as an arena.

`@apex/sim` gains a pure, seeded battle resolver. The ranch gains a **Spar** button that runs one free exhibition and plays the result as an announcer log. There is no 3D arena, no cup bracket, and no lasting consequence.

The feel to translate is Digimon World Championship's, cut to what this game can actually show: you set a tactic, then you watch. Combat is hands-off and real-time in the sense that **Speed decides how often a pet acts**, not who wins a turn-order coin flip. A basic strike is melee. A special is a projectile. Care conditions do not enter the math.

Deliberate cuts from that reference, approved for this track: one fighter per side, no TP, no support moves, no mid-fight orders, no manual-control unlock. Cooldown is the resource, which matches the product doc. Favor Support waits for a later track.

## Functional Requirements

### 1. Resolver (sim)

- New pure module, exported from `@apex/sim`. No DOM, no Three.js, no I/O.
- `resolveBattle(input, seed) → BattleResult`. Same seed and same input always produce the same event log, winner, and final HP.
- Input is two fighter snapshots plus their tactics and loadouts. The function does not read or write `GameState`, the save, or the live creature.
- A battle snapshot copies `name`, `speciesId`, `element`, `stats`, and nothing else. Hunger, energy, health, mood, bond, and life stage do not modify gauges, hit rolls, or damage.

### 2. Type chart

Six elements. No immunities. One multiplier per ordered pair, from a beats-list:

- Fire beats Plant. Plant beats Water. Water beats Fire.
- Electric beats Water. Earth beats Electric. Wind beats Earth.

If the attacker's element beats the defender's, the multiplier is 2×. If the defender's element beats the attacker's, it is 0.5×. Otherwise it is 1×. The shipped move catalog only uses Fire, Plant, and Water; the chart still covers all six so a later move does not invent a second table.

Lookup is integer: 2× is numerator 2 / denominator 1, 0.5× is 1 / 2, 1× is 1 / 1.

### 3. Moves, basic strike, equip-4

**Basic strike** is innate. It is not one of the four slots. Power 4, accuracy 100, no element (multiplier 1×), no cooldown, melee only.

**Catalog** is 12 specials, four per starter element. Same four tiers on each element, so type and stats are what differ, not a hidden power budget. All specials are projectiles.

| Tier | Power | Accuracy | Cooldown | Fire | Plant | Water |
| --- | --- | --- | --- | --- | --- | --- |
| Quick | 6 | 100 | 1 | Spark | Seed Shot | Bubble |
| Standard | 8 | 90 | 1 | Flame Charge | Thorn Volley | Tide Shot |
| Heavy | 10 | 85 | 2 | Cinder Shot | Spore Burst | Foam Volley |
| Bomb | 12 | 75 | 2 | Blaze Bolt | Bramble Dart | Splash Bolt |

Names are original. No imported creature or move names.

**Cooldown** is counted in that fighter's own actions, not in clock ticks. After a special is used, it cannot be selected for the next N of that fighter's actions, where N is the move's cooldown. It is legal again on the action after that.

**Loadout** is four catalog ids. The resolver rejects a loadout that is not exactly four known ids, or that repeats an id. Each starter species has a fixed kit: the four moves of its element. The ranch spar uses that kit. `resolveBattle` still accepts any legal loadout, so a later equipping track does not need a new resolver.

Electric, Earth, and Wind have chart rows and no catalog moves this track.

### 4. Range and projectiles

Two ranges: `far` and `near`. Both fighters start `far`. The only range change this track is **close** (`far` → `near`). It costs the action. There is no open, no sidestep, and no kiting.

- **Basic** is legal only at `near`. It resolves immediately and always hits.
- **Special from far** does not resolve on the acting tick. The log records a launch. The impact is the first step of the next tick.
- **Special from near** is point-blank. It resolves during the action. Movement cannot spoil it.
- A far shot **can miss because the target moved**. Movement means the target's range changed between launch and impact (they closed). Standing still — holding, shooting, or already being near — does not.
- Hit checks, in order, only at impact (or at the point-blank action):
  1. Accuracy: seeded roll `0–99`. Hit if `roll < accuracy`. Otherwise the miss reason is `accuracy`, and no dodge roll is consumed.
  2. If accuracy hit and the target moved during travel: dodge roll `0–99`. The shot misses if `roll < dodgePercent`. Miss reason is `dodge`. `dodgePercent = min(70, 20 + spd * 3)` using the **target's** SPD. Standing still skips this roll.
- A point-blank special rolls accuracy only.
- When the fight ends, shots still in flight are discarded. They do not land in the log.

### 5. Action clock

Each tick, in order:

1. Resolve every impact launched on the previous tick, in the order they were launched. Then, if the fight is over, stop.
2. Add each fighter's SPD to that fighter's gauge (gauges start at 0).
3. Fighters whose gauge is at least **12** act, highest SPD first. Equal SPD: the battle seed picks the order, once. Acting subtracts 12. Leftover gauge carries.
4. A fighter at 0 HP does not act. A fighter downed by an earlier action in the same tick does not take a later action.

A drake at SPD 12 acts every tick. An ox at SPD 6 acts every other tick. That is the whole "running around" translation the text log can tell.

### 6. Tactics and temperament

Two tactics. Each species has a fixed temperament, stored on the species definition and looked up by `speciesId`. It is not rolled, not trained, and not written into the save.

| Species | Temperament | Plain language |
| --- | --- | --- |
| Ember Drake | `rush` | Rushes in. May ignore a cautious plan. |
| Bramble Ox | `slow` | Slow to start. |
| Tide Axolotl | `obedient` | Follows the tactic. |

Temperament is not a damage modifier.

**Opening override**, checked before the tactic:

- `rush`, while `far`: the action is close, even if the tactic wanted a shot. Once `near`, rush obeys the tactic.
- `slow`, on that fighter's first action only: hold. The hold spends the gauge and does not attack or change range. After that, slow obeys the tactic.
- `obedient`: no override.

**Balanced**, when obeyed:

- From `far`: if a super-effective special is off cooldown, or any ready special would KO on the formula below assuming it hits, fire the best one. Otherwise close.
- From `near`: point-blank that same kind of special if one is ready. Otherwise basic.

**Favor Specials**, when obeyed:

- If any equipped special is off cooldown, use the best one (launch from `far`, point-blank from `near`).
- If every special is on cooldown: close when `far`, basic when `near`.

**Best special:** highest expected damage, then higher power, then move id ascending. Expected damage is the integer damage below, multiplied by `accuracy / 100`. "Would KO" uses the integer damage assuming a hit, not the expected value. No seed in the choice.

### 7. Damage

On a hit:

```
max(1, floor(power * atk * typeNum / (def * typeDen)))
```

`atk` is the attacker's, `def` the defender's. A miss deals 0.

Worked neutral check, ATK 11 vs DEF 10: a basic deals 4; Blaze Bolt deals 13. The same Blaze Bolt is 26 into a type it beats, and 6 into a type that beats it. Against a starter HP band of about 38–52, a super-effective bomb is a moment, not the whole fight, and a basic is filler.

### 8. Ending the fight

- After each impact step and after each action, if exactly one fighter is at 0 HP, the other wins. Reason `ko`. Copy: "{Name} is down!" Never death, faint-as-grim, or retirement.
- If both reach 0 HP in the same impact step, the exhibition is a draw. Reason `double_ko`.
- **Safety cap:** 40 ticks. If both are still standing, the higher remaining HP% wins. Equal percent: higher SPD. Still tied: the battle seed. Reason `time`. Copy: "Time's up. {Name} is still standing." It must not say "judge." The cap is a runaway brake. A normal starter-band fight is expected to end by KO first; tests cover both the KO path and the cap path.

### 9. Event log

`BattleResult` carries the winner (or draw), the reason, final HP, and an ordered event list. Each event has a tick, a kind, actor, target where relevant, move id where relevant, damage, hit flag, miss reason, both fighters' HP after the event, and one announcer line.

Kinds: `close`, `hold`, `launch`, `impact`, `basic`, `down`, `time`, `draw`.

Announcer lines are present tense, one short sentence, proper nouns capitalized. Patterns:

- "{Name} closes in."
- "{Name} hesitates."
- "{Name} looses a {Move}!"
- "{Move} hits {Name} for {n}."
- "{Move} misses {Name}."
- "{Name} slips in. {Move} misses."
- "{Name} strikes {Name} for {n}."
- "{Name} is down!"

The log is the artifact a later arena track plays back. This track does not animate it in 3D.

### 10. Exhibition helper (sim)

A pure helper builds a spar from the owned creature, a player tactic, and a seed:

- Rival species is a seeded pick among **available** starters only. Tide Axolotl is not a rival while `available` is false. Its kit and temperament still exist.
- Rival stats come from `createCreature` with a seed derived from the battle seed.
- Rival tactic is a seeded pick between the two tactics.
- Both sides use their species kit.
- The helper does not mutate the owned creature.

### 11. Ranch Spar (client)

A **Spar** control on the ranch, visually separate from Feed / Rest / Treat / Play and from Advance Day. It is available whenever a creature exists, including on a cup day. It does not spend AP, does not change stats or conditions, does not call `advanceDay` or `beginCup`, and does not write the save. Battle result is client session state, not `GameState`.

Flow, two clicks from the ranch:

1. Spar opens one panel. It shows the rival's name, element, temperament line, tactic, and the seed, plus both fighters' HP / ATK / DEF / SPD. Stat names are visible. Element is a word, not color alone.
2. Two tactic buttons, each with a one-line preview: Balanced — "Closes in and strikes. Saves specials for a type advantage or a finisher." Favor Specials — "Fires specials whenever they are ready. Closes only when the kit is cooling down." Clicking one starts the fight.

Playback: the log steps forward on a short delay. **Fast-forward** shortens the delay. There is no skip-to-end control. `prefers-reduced-motion` shows the full log immediately, without timers. The ranch creature stays; the rival is not spawned in the scene.

Copy on the button is coach-warm. Copy in the log is announcer. Disabled reasons, if any, are one gentle sentence.

## Non-Functional Requirements

- Sim stays DOM-free and deterministic. Battle logic is test-first per `workflow.md`. The suite stays under 10 seconds. No real timers in unit tests.
- **Suite-runtime deviation (2026-10-10, user-approved):** the fuzz property
  suite in `@apex/voxel` was partitioned for `bun test --parallel` with zero
  coverage change (fuzz wall 58 s → 11.5 s; full test leg now 15–20 s from a
  64–66 s baseline). A test leg below 10 s is out of reach through
  partitioning alone on this hardware: per-seed `voxelize` cost (~0.5–1 s of
  CPU) is the structural floor. A dedicated voxelize-performance track is the
  follow-up. This track commits full-coverage green suites, not the 10 s
  number.
- Client remains vanilla TypeScript and the typed store. No new runtime dependency. No UI framework.
- `bun run verify` green, including the determinism gate.
- No `SAVE_VERSION` bump. Temperament and kits live on species data, not on the saved creature.

## Acceptance Criteria

1. The type chart matches the beats-list, including a neutral pair and both directions of a beating pair. No pair is 0×.
2. Damage matches the integer formula, including the minimum of 1 on a hit and 0 on a miss.
3. A far special impacts on the next tick. If the target closed during travel, a dodge roll can turn an accurate shot into a `dodge` miss. Standing still never consumes a dodge roll. A point-blank special does not travel. A basic from `far` is illegal; a basic at `near` always hits.
4. Cooldown skips exactly N of the user's following actions. Gauge leftover carries. Higher SPD acts more often; equal SPD is seed-stable.
5. Rush closes while `far` even under Favor Specials. Slow's first action is a hold, and its second follows the tactic. Obedient never holds or closes against its tactic.
6. Favor Specials spends a ready special before it closes. Balanced closes from `far` unless a super-effective or killing special is ready.
7. Conditions and stage are absent from the snapshot. Two resolves with the same input and seed match in full.
8. The exhibition helper only picks available starters, uses species kits, and leaves the owned creature unchanged.
9. A KO, a same-step double down, and a 40-tick cap each produce the specified winner and reason. Cap copy does not say "judge." Down copy does not say death.
10. The ranch Spar is a free exhibition: no AP change, no condition change, no save write, tactic preview visible before the whistle, log playable with fast-forward and a reduced-motion path.
11. `bun run verify` passes.

## Out of Scope

- 3D arena, camera, battle idles, projectiles as meshes, and playing the log on the ranch scene.
- Cup brackets, ladder, ranking, rewards, and replacing the day-7 cup stub.
- Teams of three, targeting, and ally support.
- TP / MP as a stat or a battle pool. Support moves, heals, guards, buffs, and status ailments. Favor Support.
- Mid-fight orders, a dodge button, opening range, sidestep, kiting.
- Training, stat growth, evolution, loadout UI, renaming.
- Unlocking Tide Axolotl. Condition or personality effects on damage.
- Persisting the last log. Audio. Icons. A ranch partner card outside the spar panel.
