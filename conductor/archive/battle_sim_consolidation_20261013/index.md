# Track: Battle Sim Consolidation & Rebalance (`battle_sim_consolidation_20261013`)

- **Type:** Refactor
- **Status:** New
- **Branch:** `battle_sim_consolidation_20261013` (base: `main @ 19700d7`)

Consolidate the deterministic battle core, then spend that confidence on the
balance fix it has been waiting for. `clock.ts` implements the heavy-hit →
stagger / knockback / down rule twice (projectile path and melee-basic path),
~20 event literals repeat the same preamble, and the cup match-seed formula is
written three times; all of that becomes one implementation each, proven
behavior-identical by a seeded event-stream contract test pinned first.

Then the payoff: learnings #10's open obligation. The typeless innate Strike
out-sustains every special, so "Favor Specials" never picks it and loses every
mirror attrition race while "Balanced" wins 100% of drake/axolotl mirrors. This
track makes the specials tactic cooldown-DPS-aware, drops Strike from power 4 to
3, and gates both on a deterministic 200-seed mirror probe (every tactic inside
a 25–60% win band, draws under 20%). Also fixes the one known behavioral
inconsistency: on a double-KO the bracket UI advanced `slotA` while the sim
advances the higher-HP fighter.

No save-schema change (the double-KO fix reuses the already-persisted
`BattleResult.finalHp` through the sim's exported `doubleKoWinner`).

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)