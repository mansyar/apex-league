# Spec: Learnable Move Pool & Loadout Depth

## Overview

Today a partner's moveset is a fixed four-entry slice of its element's catalog,
and the player can only equip a prefix of that slice. This track widens each
playable element's catalog to six specials with two new stat lines, lets the
player equip any four of the six they have unlocked, and gives rivals — and now
bosses — access to the wider pool.

No save-schema change. No existing creature gains a move earlier than it does
today. A save with `loadout: null` fields exactly the kit it fields today.

## Decisions

| Decision | Choice |
| --- | --- |
| Track type | Feature |
| Pool | 6 specials per element (fire / plant / water): the existing 4 plus 2 new, appended |
| New stat lines | Steady `power 7 / acc 95 / cd 1`; Heavy `power 14 / acc 70 / cd 3`; identical across the three elements |
| Unlock | Same per-index gates as today, extended to the two new slots |
| Knowledge storage | Derived from stage and trained days — no save v16 |
| Equip rule | Any 2–4 unique known moves, no AP cost to change |
| Rivals | Deterministic seeded 4-of-6 per rival, in spar and in cup |
| Bosses | All six kits widened and each re-verified by its own probe (40–70% player win band) |
| Battle FX | Inherit element `SHOT_LOOK` and default `MOVE_FX`; bespoke only if two moves read identically |
| Elements | Fire, Plant, Water only |

## Unlock table

This table must reproduce today's gates exactly.

| Index | Move slot | Required |
| --- | --- | --- |
| 0–1 | current tiers 1–2 | birth |
| 2 | current tier 3 | 3 trained days **or** juvenile stage |
| 3 | current tier 4 | 6 trained days |
| 4–5 | new steady + heavy | 6 trained days |

Consequence to preserve: at 3 trained days a player knows 3 moves and at 6 they
know 6 — the same moves arrive on the same day as today, so no existing save
gains a move early.

## Functional Requirements

- **FR1** — Each element's catalog gains the steady and heavy moves, mirrored in
  stat line. `tierCount` is replaced by a `knownCount` that follows the table
  above; `requiredTierDays` reports the gate for indices 4–5.
- **FR2** — `knownMoves(creature, species)` returns the unlocked prefix (length
  2–6). `unlockedKit` becomes an alias or is removed, with the barrel updated.
- **FR3** — `defaultLoadout` returns the first four known moves and never more
  than `MAX_LOADOUT`. A null-loadout save therefore fields exactly today's kit
  even at six known moves.
- **FR4** — `setLoadout` accepts any 2–4 known moves from the six and rejects
  unknown, duplicate, basic, and not-yet-unlocked entries with the existing
  message shapes; gate copy stays accurate for indices 4–5.
- **FR5** — Loadout picker, coaching room, and creature detail render six rows;
  locked rows show the gate hint ("Train N more days" / "Evolve to unlock").
- **FR6** — Spar rivals and cup opponents draw four from six using a derived
  RNG keyed from the existing seed with a distinct constant. The current RNG
  stream is not consumed, so species, tactic, creature seed, and bracket
  pairings stay identical.
- **FR7** — The six boss kits are revisited to include the new moves, and each is
  measured by a per-boss probe against a stage-appropriate reference creature
  over the seed batch. The measured win rate is recorded in the plan.
- **FR8** — Handbook move table and picker copy describe the pool and its gates.
  No new screen is introduced.
- **FR9** — `MOVE_FX` / `SHOT_LOOK` cover the new moves by inheritance; a bespoke
  entry is added only where browser review shows two moves rendering
  indistinguishably.

## Non-Functional Requirements

- **NFR1** — No break to the `packages/sim` public surface beyond the
  `tierCount` rename; barrel exports stay explicit.
- **NFR2** — Save v15 payloads load unchanged. No migration is added.
- **NFR3** — Determinism: the voxelize gate stays byte-identical. Any battle
  fixture that pins a rival or boss outcome is re-baselined deliberately, with
  the reason recorded in the plan.
- **NFR4** — Every behaviour lands test-first. No module crosses the 12 KB cap;
  the catalog and pool logic split into new modules if either existing file would.

## Acceptance Criteria

- All three elements expose six moves. Mirrors stay within ±5 points of the
  recorded pre-change baseline, there are zero time-cap endings
  (`reason: "time"`, `MAX_TICKS`), and each new move is chosen by the AI in at
  least one probe matchup.
- Each of the six bosses sits in the 40–70% player-win band, with its number
  recorded in the plan.
- A null-loadout save at 6 trained days fields the same four moves as today; a
  save with an explicit four-move loadout is untouched.
- The picker shows six rows with correct gate copy at birth, 3 trained days,
  6 trained days, and juvenile with 0 trained days.
- `bun run verify` is green, and a browser pass covers ranch → coaching room →
  spar with a new move in play.

## Out of Scope

Teach/forget mechanics, AP-paid coaching sessions, affinity drift, evolutionary
branching, moves for the three unimplemented elements, new species or voxel art,
leaderboards or any server work, and any coach-room redesign beyond the row list.

## Risks

- Six boss retunes are the largest and least mechanical part. A boss outside the
  band forces a kit edit and a re-probe.
- Rival kit variety widens the move set visible in spars and may surface
  AI-ranking weaknesses (stalls) that the probe must catch.
