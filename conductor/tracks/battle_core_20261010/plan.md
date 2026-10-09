# Plan: Battle Resolution Core (`battle_core_20261010`)

Workflow: `conductor/workflow.md`. Logic-bearing tasks are test-first. The
ranch panel is verified manually. `spec.md` is the contract — if a task
would diverge from it, stop and update the spec first. No `SAVE_VERSION`
bump. No game code in this document.

Tests live next to the module, same as `care.test.ts`. New code sits under
`packages/sim/src/battle/` and is exported from `packages/sim/src/index.ts`
only when the task says so.

## Phase A — Type Chart & Damage (sim)

- [ ] Task: Failing tests — chart and damage
  - [ ] each beats-edge is 2×, and the reverse pair is 0.5×
  - [ ] a pair with no edge either way is 1× (Fire vs Electric)
  - [ ] no pair is 0×
  - [ ] hit damage matches `max(1, floor(power * atk * typeNum / (def * typeDen)))`, including the spec's ATK 11 / DEF 10 checks (basic 4, Blaze Bolt 13 / 26 / 6)
  - [ ] a miss deals 0 and does not apply the minimum of 1
- [ ] Task: Implement `battle/chart.ts` and `battle/damage.ts`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase B — Catalog, Kits, Loadout, Cooldown (sim)

- [ ] Task: Failing tests — moves and cooldown
  - [ ] catalog has the 12 spec rows (id, element, power, accuracy, cooldown) and the innate basic (power 4, accuracy 100, typeless)
  - [ ] each starter species, including locked Tide Axolotl, has the four moves of its element
  - [ ] temperament is on the species definition: drake `rush`, ox `slow`, axolotl `obedient`
  - [ ] loadout rejects length other than 4, unknown ids, and duplicates
  - [ ] after a special is used, it is illegal for exactly N of that fighter's later actions, then legal again
- [ ] Task: Implement `battle/moves.ts` and add temperament plus kit to species data (not to the saved creature)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase C — Action Clock & Range (sim)

Scripted actions only. No tactics yet. A test driver feeds close / hold / basic / special so the clock can be proved without the AI.

- [ ] Task: Failing tests — gauge and range
  - [ ] gauges start at 0; a fighter acts when gauge ≥ 12, then subtracts 12; leftover carries
  - [ ] SPD 12 acts every tick; SPD 6 acts every other tick
  - [ ] same-tick ready fighters act highest SPD first; equal SPD is stable for a seed
  - [ ] both start `far`; close is the only range change and it spends the action
  - [ ] basic from `far` is rejected; basic at `near` always hits for formula damage
  - [ ] a fighter at 0 HP does not act, including one downed earlier in the same tick
- [ ] Task: Implement `battle/clock.ts` tick stepper with injected actions
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase D — Projectiles, Accuracy, Dodge (sim)

- [ ] Task: Failing tests — shots in flight
  - [ ] a far special emits `launch` on the acting tick and `impact` as the first step of the next tick
  - [ ] a near special resolves during the action, accuracy only, no dodge roll
  - [ ] accuracy roll is `0–99 < accuracy`; failure reason is `accuracy` and no dodge roll is consumed
  - [ ] if the target closed between launch and impact, an accurate shot then takes `dodgePercent = min(70, 20 + targetSpd * 3)`; failure reason is `dodge`
  - [ ] standing still (hold, shoot, or already near) never consumes a dodge roll
  - [ ] shots still in flight when the fight ends are discarded and do not appear as impacts
- [ ] Task: Implement projectile travel on the Phase C stepper
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase E — Tactics & Temperament (sim)

Pure `chooseAction`. No clock required.

- [ ] Task: Failing tests — policy
  - [ ] `rush` while `far` closes under both tactics; once `near`, it obeys
  - [ ] `slow` holds on its first action only; the second action follows the tactic
  - [ ] `obedient` never holds or closes against the tactic
  - [ ] Favor Specials uses the best ready special before closing or striking
  - [ ] Balanced from `far` closes unless a super-effective or killing special is ready
  - [ ] best-special ties break by expected damage, then power, then move id; the seed is not consulted
  - [ ] a move on cooldown is not chosen
- [ ] Task: Implement `battle/policy.ts`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase F — Resolver, Log, Exhibition (sim)

- [ ] Task: Failing tests — `resolveBattle`
  - [ ] KO, same-step double down, and the 40-tick cap each set winner and reason as specced
  - [ ] cap copy does not contain "judge"; down copy does not contain death
  - [ ] event kinds, HP-after, and announcer patterns match spec §9
  - [ ] conditions and stage are not inputs; two calls with the same input and seed match in full
  - [ ] a starter-band fixture ends by KO before tick 40; a separate fixture hits the cap
- [ ] Task: Implement `battle/resolve.ts`, wiring clock, projectiles, damage, and policy
- [ ] Task: Failing tests — exhibition helper
  - [ ] rival species is only an available starter
  - [ ] rival stats, tactic, and both kits are a pure function of the seed
  - [ ] the owned creature is unchanged
- [ ] Task: Implement `battle/exhibition.ts` and export the public battle API from `packages/sim/src/index.ts`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase G — Ranch Spar (client — manual verification)

No new runtime dependency. Battle result stays in client session state, not `GameState`.

- [ ] Task: Spar control, separate from the care cluster and from Advance Day; available with a creature, including on a cup day; does not spend AP or advance the day
- [ ] Task: One panel, two clicks to start — rival name, element word, temperament line, tactic, seed, and both fighters' HP/ATK/DEF/SPD; tactic buttons carry the spec's one-line previews
- [ ] Task: Log playback — stepped delay, fast-forward shortens it, no skip-to-end; `prefers-reduced-motion` shows the full log with no timers
- [ ] Task: Confirm in the client that a finished spar left AP, conditions, stats, and the save untouched
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Manual: `bun run dev`, spar from the ranch, read one Balanced log and one Favor Specials log, confirm a dodge or a hit is announced in present tense, toggle reduced-motion, reload and confirm the save did not gain a battle result

## Phase H — Integration & Verification Gate

- [ ] Task: `bun run verify` green (types, tests, biome, determinism gate); suite still under 10 seconds
- [ ] Task: Browser verification of the spar panel with screenshot evidence, per workflow.md
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
