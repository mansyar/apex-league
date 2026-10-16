# Probe — BEFORE (pre-rebalance baseline)

Track: `battle_sim_consolidation_20261013` · Phase 3 · captured on
`battle_sim_consolidation_20261013` before any balance change.

Instrument: `packages/sim/src/battle/tactics.balance.test.ts` (**committed with
the direction decision, not in this baseline commit** — the probe's threshold
assertions fail by design until the meta is fixed).

Command:

```
APEX_BALANCE_REPORT=1 bun test packages/sim/src/battle/tactics.balance.test.ts
```

Batch: 216 mirrored battles = 3 species × kit tiers 2/3/4 × 4 tactic pairings
(balanced×balanced, specials×specials, balanced×specials, specials×balanced) ×
6 seeds `[11, 29, 47, 53, 71, 89]`, frozen stats (`createCreature(id, 777)`).

## Headline

| Tactic | Samples | Decisive win rate | Draw rate | FR7 band (25–60% / <20%) |
| --- | --- | --- | --- | --- |
| balanced | 216 | **25.5%** | 0.0% | lower edge (passes) |
| specials | 216 | **80.8%** | **20.4%** | **OUT** (both checks) |

The probe is **red** as expected, but not for the reason `learnings.md` finding
10 recorded. Two of its claims reproduce; the central one is **inverted**.

## What reproduces

- **Ox mirrors stall into 40-tick draws.** `plant_ox` kit2/kit3
  specials-vs-specials cells draw 8/12 and 8/12 battles. The ox's high DEF
  (10–14) and low SPD (5–8) starve both fighters of actions inside the cap.
- **Cross-type matchups are tactic-invariant** in the *other* direction: in
  every cross-element cell both tactics won 100% against the ox, because
  fire>plant makes every drake special super-effective and the SE stagger plus
  range-shifting knockbacks (`knockback: 3, stagger: 2` in a single KO fight)
  freeze the slow ox solid. A single SE hit did 14 damage and cost the ox two
  whole action windows.

## What is inverted

Finding 10 claims the free Strike out-sustains every special and that
`Favor Specials` "never Strikes so loses every mirror attrition race", with
"balanced beats specials 100% in drake/axolotl mirrors". **The seed batch
measures the opposite: `specials` wins 100% of every drake and axolotl mirror,
and `balanced` wins 25.5% overall.**

Per-battle instrumentation (fire drake vs fire drake, kit 2, seed 11, stats
hp 44 / atk 9 / def 7 / spd 9):

| Side | Events | Damage dealt |
| --- | --- | --- |
| `balanced` | `close: 1, basic: 4, down: 1` | 20 |
| `specials` | `close: 1, impact: 5` | 44 |

**Root cause:** `balancedQualifiers()` only admits a special that would KO or
is super-effective. Both conditions are unreachable in a neutral matchup — the
type chart is inert between two creatures of the same element, and no kit
special KOs a full-HP target on turn one. So **"Balanced" cannot fire a single
special in any mirror**, degenerating into a pure Striker at
`floor(4 × 9 / 7) = 5` damage per action, while `specials` fires a kit special
on every action window (both kit-2 moves have cooldown 1, so the next window
has them ready again) for 6–8 damage per action.

The Strike is therefore **not** out-sustaining the specials — it is the only
thing `balanced` is allowed to do, and the comparison that `learnings.md`
recorded was never measured in a neutral matchup.

## Consequence for the approved plan

FR5 (`Strike` power 4 → 3) would nerf the *only* attack `balanced` can reach
in a mirror, and FR6 (fall back to `Strike` when a special does not out-sustain
it) would make the winning tactic strike more often. **Both would widen the
gap the probe is trying to close.** Meeting the FR7 band therefore requires
changing the `balanced` qualifier rule — which spec FR *Out of Scope* forbids,
and which plan.md says must stop and re-scope with the user.