# Phase 2 — Conditional rule (FR-13, AC-13)

Branch `feat/20261109-battle-balance`, built on the Phase 1 checkpoint
(`ef514222`). One coach's note that pre-empts the doctrine inside its plan and
hands the next cadence straight back.

## Commands

| # | Command | Exit | Evidence |
|---|---------|------|----------|
| 1 | `bun run verify` | 0 | typecheck clean (voxel 160, sim 217, server 44, client 505 files); **3,884 pass, 1 skip, 0 fail**, 459,513 expects, 357 files; Biome 895 files clean; determinism gate OK (46 model digests) |
| 2 | `bun run build` | 0 | 403 modules, 1,050.79 kB (gzip 287.99 kB), 358 ms |

Both run as separate commands, in that order, on the final tree.

Telemetry and pacing printed inside `bun run verify` are unchanged from Phase 1
(engagement 380/1114/3984 mm, idle 37.9%, contact 3.6%, retreats 6928/6888,
cap share 6/14 = 42.9%, durations 10.54–40.00 s; all 14 pacing rows identical).
That is the headline result for "unequipped is inert": no rule is equipped by
default anywhere in the shipped data, so no seeded row moved.

## The four rules (frozen table, `controller-rule.ts`)

| id | label | trigger | action | cost |
|----|-------|---------|--------|------|
| `save_heavy` | Save the heavy | the doctrine reaches for a **special** (`melee === false`) while the foe is neither broken nor nearly down | refuse the special and hold instead — keep the biggest affordable special for the break or the finisher | none (no commit) |
| `read_tell` | Read the tell | the foe is in `startup` on a move whose `reachMm` covers this body (ranged tells included; the doctrine's own gate is melee-only) | commit to a dodge burst directly away from the foe, even when the pool cannot pay it | one dodge price (`DODGE_STAMINA_COST`), reported as `paid:false` when refused |
| `keep_back` | Keep something back | `stamina * 100 < staminaMax * 30` and the foe is not within 25% HP of down | give ground (retreat) when the fence leaves `RETREAT_ROOM_RADII` of room, otherwise strafe | none |
| `never_trade` | Never trade | the foe is in `startup` on a move that reaches this body | refuse the commit the doctrine planned and keep the feet moving (advance inside the band, strafe under it) | none |

`KEEP_BACK_FLOOR_PERCENT = 30`, `FINISHER_HP_PERCENT = 25`, `RULE_IDS` frozen in
table order, `RULES`/`RULE_LABELS` frozen. `RULE_LABELS` are the exact strings
the HUD prints.

## Precedence: a note inside the plan, not a second controller

`decide()` gained exactly three call sites, all inside the existing plan:

1. after the commitment lock, before the doctrine's dodge gate:
   `ruleDodge` (read_tell) — the note answers a wind-up the doctrine would eat;
2. after the doctrine's `circle()` is built, before the retreat/press slots:
   `ruleDisengage` (keep_back) — a plan-level "give ground" note;
3. at the two `chooseMove` commit sites: `ruleRefuses` (save_heavy,
   never_trade) — the note vetoes one commit and the doctrine's own fallback
   for that slot runs (`circle()` under the band, `advance` inside it).

Every rule order returns through the same `settle(...)` builder as a doctrine
verb, so the returned `ControllerState` differs from the doctrine's only in the
one decision the note changed; `withRule` stamps `rule` and nothing else. The
next cadence starts from the doctrine again (`decisions` keeps counting, the
band/strafe/dodge helpers are untouched). Tests
`above the ceiling every rule still closes` and `keep something back leaves the
doctrine's dodge gate alone` pin the "never moves the band, the strafe, or the
dodge policy" half.

Equipping: `DecisionInput.rule?: RuleId` and `ControllerDecision.rule?: RuleId`.
Absent means none (valid and default). `BattleSide.rule?: RuleId` is additive
exactly like `doctrine` was; `resolveContinuous` forwards `(side === 0 ? a : b).rule`.
No save migration here (Phase 5 owns it).

## AC table

| AC | Requirement | Named tests |
|----|-------------|-------------|
| AC-13 | each rule changes an observable decision | `holds the biggest special until the foe's poise breaks`; `spends it once the guard breaks`; `spends it for the finisher`; `commits to a dodge even with a dry pool, where the doctrine swings`; `reads a ranged wind-up the doctrine's gate ignores`; `gives ground under the floor, where the doctrine presses`; `refuses the commit the doctrine would make` |
| AC-13 | exactly one can be equipped | one `rule` field, `RULE_IDS` is the only source of values; the spar row (`RULE_CHOICES = ["none", ...RULE_IDS]`) and cup row (`values: ["none", ...RULE_IDS]`) are single-select `buildChoiceRow` rows; `four frozen notes, each with a trigger and an action` pins the four ids |
| AC-13 | unequipped rule has no effect | `no rule key and an undefined rule decide the same thing`; `the unequipped side still presses, and names no rule`; plus the whole unchanged trace/telemetry/pacing set above |
| FR-13 | note fires inside the plan and returns | `the doctrine resumes the cadence after the note fires` |
| FR-13 | impossible rule must not deadlock | `an impossible note cannot deadlock: no stamina, no room, it still acts` (24 cadences) |
| FR-13 | refusals observable in the step outcome | `the refused dodge is visible in the step outcome, like any other` |
| FR-12 | band/strafe/dodge policy unchanged | `above the ceiling every rule still closes`; `keep something back leaves the doctrine's dodge gate alone`; `the strafe it falls back to is the doctrine's own strafe intent` |
| FR-16 | HUD names doctrine and the rule | `a rule rides after the doctrine on the same plate (FR-13)`; `a rule with no doctrine still shows, and all four have a label` (battleHud.test.ts) |

## Unequipped is inert — proof

- `RULE_IDS` has no default anywhere: `BattleSide.rule` is optional,
  `makeExhibition` only spreads it when passed, `initialPicks` returns
  `rule: null`, and both pickers open on "No note".
- `decide` without `input.rule`: all three seams return `null` on their first
  line (`ruleDodge`/`ruleDisengage` require `rule === id`; `ruleRefuses` returns
  `null` when `rule` is undefined).
- Consequently the 14 telemetry rows, 14 pacing rows, and both battle traces
  (seeds 1 and 20261111) print the same numbers and the same final hashes
  (`0x3958accc`, `0x8b89d828`) as Phase 1.

## Deadlock proof

`an impossible note cannot deadlock: no stamina, no room, it still acts` runs
`keep_back` against a fighter with a dry pool and a fence at its back for 24
consecutive cadences. Every cadence returns a real verb (`retreat` where room
exists, otherwise `strafe` with the doctrine's own strafe intent), the fighter
keeps moving, and the note stops firing the moment the pool refills
(`the doctrine resumes the cadence after the note fires`). A refused dodge from
`read_tell` is priced through the normal `spendDodge` path, so the step reports
`{key, paid:false}` and the body holds — same shape as a doctrine dodge refusal.

## HUD line (FR-16)

`plateName` composes `name · Doctrine · Rule` from `DOCTRINE_LABELS` and
`RULE_LABELS`; a side with no note prints exactly the Phase 1 line. The rule
reaches the plate through `BattleHudFighter.rule`, set by `fightNowFor`
(spar) and `arena.ts` (cup) from the resolved sides.

## Module size (NFR-3)

`controller.ts` stays under the 12,288 B cap by keeping the note logic in the
new `controller-rule.ts` (216 lines); the controller grew only by the three
seams, the `rule` fields and `withRule`. `apps/client/src/battleHud.ts` was
trimmed back under the cap by shortening its own doc comments, not by removing
behaviour. `bun test packages/sim/src/module-size.test.ts` and
`bun test apps/client/src/module-size.test.ts` both pass inside `verify`.

## Re-pinned rows

| File | Row | Change |
|------|-----|--------|
| `apps/client/src/cup/view-models.test.ts` | `a creature without a loadout defaults to the species kit, balanced` | expects `{loadout, doctrine:"press", rule:null}` |
| `apps/client/src/cup/view-models.test.ts` | `a creature with an existing loadout keeps it` | same `rule:null` addition |

No cup golden, bracket, ghost, lifecycle, trace, telemetry, or pacing row moved.

## Deviations

- `packages/sim/src/battle/exhibition.ts` (outside the brief's `Touches`):
  `makeExhibition` gained an optional fifth `rule?: RuleId` argument so the spar
  panel can equip a note without hand-building a `BattleSide`. One parameter and
  one conditional spread; no behaviour change when omitted.
- `packages/sim/src/index.ts` and `packages/sim/src/battle/index.ts` barrels
  export the rule table (clients import from `@apex/sim`).
- `packages/sim/src/cup/session/walk.ts` and
  `apps/client/src/cup/shared.ts`, `arena.ts`, `coach-room.ts`,
  `view-models.ts`, `spar/panel.ts`, `spar.ts`, `spar/ghost.ts`,
  `spar/casting.ts` are all inside `apps/client/src/{spar,cup}` or are the
  plumbing that carries `rule` beside `doctrine`; no pacing or stamina constant
  changed.
