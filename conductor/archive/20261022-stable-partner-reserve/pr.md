# Stable & Partner Reserve

## Summary

The ranch keeps one partner. Every other pet the player owns now waits in a
**stable** — frozen, its career paused, ready to be brought forward with a
free, instant, lossless swap. The league's Storm Gift no longer takes your
pet with it: the hound hatches *into the stable* and joins your collection.

That closes the known issue the Electric storm hound line left open ("the
Storm Gift takes the pet in the ranch with it") — a reward that costs the
player their companion is a reward nobody wants.

The track also fixed a quieter defect: the growth gates read the *world* day,
so a pet hatched late became a juvenile after a single night. Age is now the
pet's own (`ageDays`), and the juvenile, champion and graduation gates read
it.

## Track

- **Track:** `20261022-stable-partner-reserve` — [spec](./spec.md) · [plan](./plan.md) · [review](./review.md)
- **Branch:** `feat/20261022-stable-partner-reserve`
- **Base:** `cf2cdbf` (origin/main)
- **Save versions:** v23 (the pet's own age), v24 (the stable)

## What happened

| Phase | What it did | Checkpoint |
|---|---|---|
| 1 — Per-Pet Age | Every pet carries its own `ageDays`; the night advances the active pet by one; the juvenile, champion and graduation gates read the pet's age; save v23 with a linear v22 → v23 migration | `d929a77` |
| 2 — The Stable | `GameState.stable`; the pure swap seams (`sendToStable` / `bringToRanch`); the freeze; the gift hatching into the stable; a graduation handing the ranch to a stashed pet; save v24 with a linear v23 → v24 migration | `d8dff99` |
| 3 — Client Surfaces | The Stable chip and modal, the swap, the age readout, the gift card that stops implying a replacement, the graduation screen offering the waiting pets | `681fe3e` |
| 4 — Docs & Gate | The save schema, the README, the product roadmap and the tech-stack changelog; the full gate green on the branch | `91114b0` |
| R1 — Review Fixes | A waiting pet can be renamed; the stable's empty state is reachable; the growth panel says "Age"; `evaluateEvolution` dropped the day it no longer read; FR-8 narrowed to the delivered options | `d77638c` |
| R2 — Review Fixes | The rename editor wears the house kit and its two untested branches are pinned | `fdfaa9a` |

## Requirements

Every FR, NFR and AC in the spec is delivered and verified; the coverage
table is in [integrated.md](./verification/integrated.md). The shape of it:

- **The stable** holds every pet the player owns that is not in the ranch, with
  no capacity limit, persisted by save v24.
- **Exactly one pet is active**; a stashed pet never competes, trains,
  evolves or graduates, and resumes exactly where it left off.
- **The swap is free, instant and lossless** — every field of a pet travels
  with it in both directions, and a swap during a live cup is refused with
  coaching copy.
- **Age is per pet.** A pet hatched on day 24 matures on its own tenth night,
  not its first; the day-1 starter still matures on the day-10 night.
- **The Storm Gift hatches into the stable**; the ranch pet is untouched and
  the gift is never a replacement.
- **A graduation** may hand the ranch to a stashed pet or to a new starter
  hatch; the retired pet is archived exactly as before.
- **Breeding stays Hall-only**, and the cups-won tally stays the family's.

## Verification

| Layer | Command | Result |
|---|---|---|
| Types | `bun run check` | pass — voxel 71 / sim 102 / client 309 files, no type errors |
| Unit | `bun test` | pass — 2,323 pass / 1 skip / 0 fail across 173 files |
| Lint | `biome check` | pass — 503 files, no fixes applied |
| Assets | `bun run gate:determinism` | pass — 12 creature GLBs byte-identical + 5 props' digests match |
| Build | `bun run build` | pass |
| Visual | the Playwright pass | pass — 12 flows, 154 assertions, console clean at 1440x900 and 393x852 |

The client module cap holds: the largest client module is `hud/update.ts` at
12,263 B against the 12,288 B cap, and the new `stable.ts` / `stable-rename.ts`
sit well inside it.

## Review

**PASS** after three rounds, with no Critical or High finding at any point.

- **Round 1** (PASS WITH FINDINGS): one Medium and four Low — a stashed pet
  could not be renamed, the stable's empty state was unreachable because the
  chip hid, the growth panel still said "Day", the sim's evolution API kept a
  day argument it no longer read, and FR-8 promised a successor option the
  code never offered.
- **Round 2**: all five closed and verified; it raised the unstyled rename
  editor, a stale coverage row, and two untested editor branches.
- **Round 3** (PASS): all three closed; no new problem introduced.

Nothing was deferred, accepted as debt, or filed as an issue — the strict
review policy was in force. The full record is in [review.md](./review.md).

## Deviations

- **Two save steps, not one.** v23 (the pet's own age) and v24 (the stable)
  are two linear migrations, so the verified Phase 1 migration was never
  rewritten. A v22 save migrates through both.
- **The graduation gate now follows the pet's own 60 days.** A late-hatched
  pet needs 60 of its own days; a day-1 starter is unchanged. This was the
  approved consequence of making age per pet, and the spec records it.
- **Phase 4 was partly blocked** by the phase agent's sandbox (it could not
  write under `conductor/`), so the primary applied its ready-to-apply text
  for `conductor/product.md` and `conductor/tech-stack.md` verbatim.
- **The rename editor needed its own module.** Inlined, `stable.ts` measured
  14,366 B — 2,078 B over the cap. Split, the two are 11,379 B and 5,070 B.
- **FR-8 was narrowed at review** (with the user) from "a stashed pet, a
  starter, or the pending gift" to "a stashed pet or a starter": the pending
  gift is a pure gift with no inherited stat floor, so it waits in the stable
  like any other pet. The requirement ID is unchanged.

## Follow-ups

- **Documentation debt (pre-existing, out of scope):** the `Creature` table
  in `docs/save-schema.md` omits the persisted `element` and `bondedToday`
  fields.
- The stable has no capacity limit; a limit, a ranch building and releasing a
  pet are open questions for a future track.

## Rollback

The track is one squash commit on `main` after merge. Reverting it restores
the pre-stable behaviour: one pet in the ranch, the Storm Gift replacing it
again, and the growth gates reading the world day. The two save steps would
revert to v22, and the migration chain would need the v23 and v24 steps
removed with it.
