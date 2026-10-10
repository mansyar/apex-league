# Plan: Battle Resolution Core (`battle_core_20261010`)

Workflow: `conductor/workflow.md`. Logic-bearing tasks are test-first. The
ranch panel is verified manually. `spec.md` is the contract — if a task
would diverge from it, stop and update the spec first. No `SAVE_VERSION`
bump. No game code in this document.

Tests live next to the module, same as `care.test.ts`. New code sits under
`packages/sim/src/battle/` and is exported from `packages/sim/src/index.ts`
only when the task says so.

## Phase A — Type Chart & Damage (sim)

- [x] Task: Failing tests — chart and damage (`9d0e8e1`)
  - [x] each beats-edge is 2×, and the reverse pair is 0.5×
  - [x] a pair with no edge either way is 1× (Fire vs Electric)
  - [x] no pair is 0×
  - [x] hit damage matches `max(1, floor(power * atk * typeNum / (def * typeDen)))`, including the spec's ATK 11 / DEF 10 checks (basic 4, Blaze Bolt 13 / 26 / 6)
  - [x] a miss deals 0 and does not apply the minimum of 1
- [x] Task: Implement `battle/chart.ts` and `battle/damage.ts` (`9d0e8e1`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 9d0e8e1]

## Phase B — Catalog, Kits, Loadout, Cooldown (sim)

Phase note — suite runtime measurements (recorded 2026-10-10, before the
split): plain `bun test` 64 s; per-file `fuzz.test.ts` 57.7 s,
`proportion.test.ts` 6.0 s, everything else under 1 s; single-seed voxelize
~515 ms, full pipeline ~806 ms. Partitioning experiments: 5-seed chunks
(33 files) 20.8 s at 20 workers — worse than the 10-seed layout; N=10 14.7–
17.3 s; N=12 13.9 s; N=16 15.5 s; the 10-seed partition at default 20
workers is the best land (fuzz wall 11.5–11.65 s, full test leg 14.9–15.8 s,
verify leg 20.1 s once). Per-seed `voxelize` CPU (~0.5–1 s) is the
structural floor; a voxelize-performance track is the follow-up, recorded as
a dated deviation in spec.md.

- [x] Task: Suite runtime remediation (`fea4e96`)
  - [x] measure per-file runtime in the current suite and record it in the plan phase note
  - [x] identify the split (test-file partitioning, shared fixtures, or grouping) that gets the whole suite well under 10 s without weakening coverage — resolved to full-coverage partitioning plus a documented deviation and a follow-up perf track (user-approved 2026-10-10)
  - [x] confirm `bun run verify` still green after the change (216 pass / 0 fail, determinism gate green)
- [x] Task: Failing tests — moves and cooldown (`2967512`)
  - [x] catalog has the 12 spec rows (id, element, power, accuracy, cooldown) and the innate basic (power 4, accuracy 100, typeless)
  - [x] each starter species, including locked Tide Axolotl, has the four moves of its element
  - [x] temperament is on the species definition: drake `rush`, ox `slow`, axolotl `obedient`
  - [x] loadout rejects length other than 4, unknown ids, and duplicates
  - [x] after a special is used, it is illegal for exactly N of that fighter's later actions, then legal again
- [x] Task: Implement `battle/moves.ts` and add temperament plus kit to species data (not to the saved creature) (`336bbe2`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 336bbe2]

## Phase C — Action Clock & Range (sim)

Scripted actions only. No tactics yet. A test driver feeds close / hold / basic / special so the clock can be proved without the AI.

- [x] Task: Failing tests — gauge and range (`a9dc6ff`)
  - [x] gauges start at 0; a fighter acts when gauge ≥ 12, then subtracts 12; leftover carries
  - [x] SPD 12 acts every tick; SPD 6 acts every other tick
  - [x] same-tick ready fighters act highest SPD first; equal SPD is stable for a seed
  - [x] both start `far`; close is the only range change and it spends the action
  - [x] basic from `far` is rejected; basic at `near` always hits for formula damage
  - [x] a fighter at 0 HP does not act, including one downed earlier in the same tick
- [x] Task: Implement `battle/clock.ts` tick stepper with injected actions (`4998193`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 4998193]

## Phase D — Projectiles, Accuracy, Dodge (sim)

- [x] Task: Failing tests — shots in flight (`7bbeef3`)
  - [x] a far special emits `launch` on the acting tick and `impact` as the first step of the next tick
  - [x] a near special resolves during the action, accuracy only, no dodge roll
  - [x] accuracy roll is `0–99 < accuracy`; failure reason is `accuracy` and no dodge roll is consumed
  - [x] if the target closed between launch and impact, an accurate shot then takes `dodgePercent = min(70, 20 + targetSpd * 3)`; failure reason is `dodge`
  - [x] standing still (hold, shoot, or already near) never consumes a dodge roll
  - [x] shots still in flight when the fight ends are discarded and do not appear as impacts
- [x] Task: Implement projectile travel on the Phase C stepper (`2217770`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 2217770]

## Phase E — Tactics & Temperament (sim)

Pure `chooseAction`. No clock required.

- [x] Task: Failing tests — policy (`8f8b368`)
  - [x] `rush` while `far` closes under both tactics; once `near`, it obeys
  - [x] `slow` holds on its first action only; the second action follows the tactic
  - [x] `obedient` never holds or closes against the tactic
  - [x] Favor Specials uses the best ready special before closing or striking
  - [x] Balanced from `far` closes unless a super-effective or killing special is ready
  - [x] best-special ties break by expected damage, then power, then move id; the seed is not consulted
  - [x] a move on cooldown is not chosen
- [x] Task: Implement `battle/policy.ts` (`ccf0ec9`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: ccf0ec9]

## Phase F — Resolver, Log, Exhibition (sim)

- [x] Task: Failing tests — `resolveBattle` and the exhibition rival (`6073e10`, one combined red commit)
  - [x] KO, same-step double down, and the 40-tick cap each set winner and reason as specced
  - [x] cap copy does not contain "judge"; down copy does not contain death
  - [x] event kinds, HP-after, and announcer patterns match spec §9
  - [x] conditions and stage are not inputs; two calls with the same input and seed match in full
  - [x] a starter-band fixture ends by KO before tick 40; a separate fixture hits the cap
- [x] Task: Implement `battle/resolver.ts` (plan said `battle/resolve.ts`; the resolver.ts spelling matches the test file) and `battle/exhibition.ts` (`b0517fe`)
- [x] Task: Export the public battle API from `packages/sim/src/index.ts` via the `battle` barrel (`6b0afd4`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: b0517fe]

## Phase G — Ranch Spar (client — manual verification)

No new runtime dependency. Battle result stays in client session state, not `GameState`.

- [x] Task: Spar control, separate from the care cluster and from Advance Day; available with a creature, including on a cup day; does not spend AP or advance the day (`8c6f594`)
- [x] Task: One panel, two clicks to start - rival name, element word, temperament line, tactic, seed, and both fighters' HP/ATK/DEF/SPD; tactic buttons carry the spec's one-line previews (`8c6f594`)
- [x] Task: Log playback - stepped delay, fast-forward shortens it, no skip-to-end; `prefers-reduced-motion` shows the full log with no timers (`8c6f594`)
- [x] Task: Confirm in the client that a finished spar left AP, conditions, stats, and the save untouched (browser-verified: localStorage clean, HUD unchanged)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 8c6f594]
  - Manual: `bun run dev`, spar from the ranch, read one Balanced log and one Favor Specials log, confirm a dodge or a hit is announced in present tense, toggle reduced-motion, reload and confirm the save did not gain a battle result

Phase G revision (post-checkpoint, user-raised 2026-10-10):
- [x] Task: Harden the reduced-motion guard (`reduce` AND NOT `no-preference` — an embedded Chromium reported both true and the playback collapsed) and add a Replay slowly pill for reduced-motion users (fe21160, spec annotated under FR11 first; verified live in both media-query branches)

## Phase H — Integration & Verification Gate

- [x] Task: `bun run verify` green (types, tests, biome, determinism gate); suite still under 10 seconds (verify green at 14.77s — the user-approved Phase B suite-runtime deviation applies: floor-bound fuzz suite, voxelize-perf follow-up proposed)
- [x] Task: Browser verification of the spar panel with screenshot evidence, per workflow.md (screenshot control unavailable in-session; DOM-transcript evidence in phase-g-evidence.md presented via browser.preview)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 8c6f594]
