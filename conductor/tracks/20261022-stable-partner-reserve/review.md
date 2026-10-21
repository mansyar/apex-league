# Review — Stable & Partner Reserve

**Track:** `20261022-stable-partner-reserve` — Stable & Partner Reserve
**Type:** feature · **Priority:** high
**Branch:** `feat/20261022-stable-partner-reserve`
**Range reviewed:** `cf2cdbf28798ae040348bcfd5513868ada46e040..6c10ea3`
**Date:** 2026-10-22
**Reviewer:** the `conductor-reviewer` subagent (read-only), validated by the
primary agent
**Round 1 verdict:** **PASS WITH FINDINGS** — no Critical or High finding; one
Medium and four Low findings, all in scope and all to be fixed under the
strict review policy (`review.strict: true`).

---

## Summary

The track does what it promised: the ranch keeps one partner, every other pet
the player owns waits in a stable, frozen; the Storm Gift now *joins* the
collection instead of replacing the pet in the ranch (the defect the previous
track left open as a known issue); and age became a per-pet value read by the
growth gates.

The reviewer's per-phase passes and the integration pass agreed on the
substance: the swap seams move the whole creature by reference, so no field
can silently reset; the night settles only the active pet, so a stashed pet
neither ages nor decays; the age increment lands after the gate reads it, so
the day-1 starter still matures on the night of day 10; and the save chain
(v22 → v23 → v24) is linear, lossless and refuses a malformed stable or age.

What the review did find is a set of small gaps between the *spec* and what
shipped: a stashed pet could not be renamed (an explicit spec edge case), the
stable's empty state was unreachable because the chip hides while the stable
is empty (also an explicit spec edge case), the growth panel still labels the
pet's own age "Day", a public sim function keeps a day parameter that no
longer decides anything, and FR-8 promised a successor option that does not
exist. None of them is a correctness bug in the delivered behaviour; all of
them are promises the code did not keep, and the strict policy says they are
fixed, not deferred.

## Verification

| Layer | Command | Result | Evidence |
|---|---|---|---|
| Types | `bun run check` | pass | voxel 71 / sim 102 / client 308 files, no type errors |
| Unit | `bun test --timeout 120000` | pass | 2,307 pass / 1 skip / 0 fail across 173 files |
| Lint | `biome check` | pass | 502 files, no fixes applied |
| Assets | `bun run gate:determinism` | pass | 12 creature GLBs byte-identical + 5 props' digests match |
| Build | `bun run build` | pass | 250 modules, only the pre-existing chunk-size warning |
| Visual | the Playwright pass | pass | 8 flows, 102 assertions, 0 failures, console clean at 1440x900 and 393x852 |

The reviewer did not re-run the gate (it is read-only); the numbers above are
the primary's runs on the branch head, and the reviewer read the harness
(`.conductor/evidence/phase-3/stable-visual-pass.ts`) and confirmed what it
asserts — the chip, the modal, the ages, the swap, the focus behaviour, the
cup refusal and the graduation handover. It does not assert the 44 px floor
or the ARIA attributes; those are structural in the code.

## Requirements coverage

The reviewer's table (every FR/NFR/AC → covered / partial / missing) is
reproduced in `verification/integrated.md`. Two rows changed in review
round 1: FR-8 and FR-9, both of which were **partial** at review time and are
fixed by the review-fix phase.

## Findings

### F1 — Medium — renaming a stashed pet is not implemented

- **Where:** `packages/sim/src/creature.ts:269` (`renameCreature`),
  `apps/client/src/stable.ts:250` (the stable row)
- **What:** the spec's edge case (spec.md:162) says *"Renaming a stashed pet:
  allowed from the stable modal; the name travels with the pet."* The sim's only
  rename seam rewrites `state.creature` and refuses `"no-creature"` when the
  ranch is empty — it cannot address a stable slot. The stable modal row
  carries no rename control. The second half of the case does hold (the name
  travels with the pet through the swap), but the first half does not.
- **Why it matters:** an explicit, testable spec case is silently not
  delivered; a pet the player owns can only be renamed by first swapping it
  into the ranch, which changes the active pet.
- **Fix:** a pure `renameStablePet(state, creatureId, name)` seam in
  `packages/sim/src/stable.ts` (the same trim/clamp rules as `renameCreature`,
  the same `cup-phase` refusal, a new `stable` array with that slot replaced)
  and a rename control on the stable row.
- **Requirement:** the spec edge case (spec.md:162), adjacent to FR-3 / FR-9.
- **Test gap:** a sim test that renames a stashed pet and asserts the name
  travels and the ranch pet is untouched, plus a client test for the copy.

### F2 — Low — FR-8's "or the pending gift" successor option does not exist

- **Where:** `apps/client/src/graduation/egg.ts:181`,
  `conductor/tracks/20261022-stable-partner-reserve/spec.md` (FR-8)
- **What:** FR-8 named three successor options; the egg screen offers the
  stashed pets and the starter species and never consults `state.pendingGift`.
- **Why it matters:** the spec claimed a capability the code does not have —
  the doc-truth drift FR-13 polices.
- **Fix (decided with the user):** narrow FR-8 to *"a stashed pet or a
  starter"*. The pending gift is a pure gift with no inherited stat floor
  (FR-7), so it is not a graduation successor; it waits in the stable like any
  other pet and the player brings it forward. The requirement ID is unchanged
  and the narrowing is recorded in the spec's stability note.
- **Requirement:** FR-8, FR-13.
- **Test gap:** none — a documentation correction.

### F3 — Low — the stable's empty state is unreachable

- **Where:** `apps/client/src/stable.ts:105` (`stableChipVisible`),
  `apps/client/src/stable.ts:148` (`syncStableChip`)
- **What:** the chip hides while the stable is empty, so the modal's empty
  state and its `role="status"` note can never be seen. The spec's edge case
  (spec.md:145) says *"The stable is empty: the chip still opens the modal,
  which shows an empty state (never a blank panel)"*, and FR-9 requires the
  empty state.
- **Why it matters:** the empty state is dead code, and the specified
  behaviour is not what ships. The visual pass only ever exercises a
  non-empty stable, so nothing catches it.
- **Fix:** always show the chip and let the modal carry the empty state.
- **Requirement:** FR-9, the spec edge case (spec.md:145).
- **Test gap:** a client test that the chip is visible with an empty stable
  and that opening the modal shows the empty state.

### F4 — Low — the growth panel labels the pet's own age "Day"

- **Where:** `apps/client/src/growth.ts:90` (`ageCondition`)
- **What:** the condition renders `label: "Day"` with `shown: "${age} /
  ${target}"`, where `age` is now `creature.ageDays`. The same number is
  labelled "Age" in the partner-details modal and "12 days" in the stable
  modal.
- **Why it matters:** "Day" still reads as the world day — the exact confusion
  the track removes — and the growth panel is where the player watches the
  gate.
- **Fix:** `label: "Age"`, and update the expectation in
  `apps/client/src/growth.test.ts`.
- **Requirement:** FR-6 / FR-5.
- **Test gap:** the existing expectation is re-pinned.

### F5 — Low — `evaluateEvolution` keeps a day parameter that decides nothing

- **Where:** `packages/sim/src/evolution.ts:209`
- **What:** the gate moved to `creature.ageDays`, but the public export keeps
  `evaluateEvolution(creature, _day, cupsWon)`. Callers still pass a world
  day: `packages/sim/src/settlement.ts:264`,
  `apps/client/src/growth.test.ts:473`, `artifacts/champion-demo.ts:69,78`.
- **Why it matters:** a public sim API whose second argument is silently
  ignored invites a future call site to believe the gate is day-based — the
  exact confusion FR-5 removes — and the compiler will not flag it.
- **Fix:** drop the parameter (`evaluateEvolution(creature, cupsWon)`) and
  update the four call sites.
- **Requirement:** FR-5, NFR-3.
- **Test gap:** none — a signature change covered by the existing tests.

## Plan compliance

- Every phase carries a `Result`, a `Checkpoint` and an `Evidence` path, and
  every task marked `[x]` was implemented and independently verified by the
  primary.
- The final diff stays inside the union of the phases' `Touches`, except for
  the deviations each phase reported (the ticker state literal, the
  `hud.ts` / `growth.ts` / `detail/path.ts` client modules outside the
  `hud/*` glob, one sim barrel export, and the two `conductor/` doc files the
  Phase 4 agent's sandbox refused — applied by the primary from the phase's own
  ready-to-apply text).
- No task was silently dropped.

## Out of scope

- The `Creature` table in `docs/save-schema.md` omits the persisted `element`
  and `bondedToday` fields. Pre-existing, unrelated to this track, and already
  recorded as documentation debt in `verification/integrated.md`.
- A spar is a full-screen client overlay, so the ranch is unreachable during
  one; the `cup-phase` refusal covers the cup. The reviewer confirmed the
  refusal reads as coaching, not a dead button.

## Debt

No finding is deferred. Under the strict review policy
(`review.strict: true`) and with `review.issues.enabled: false`, every finding
above is fixed in the review-fix phase (Phase R1); none is filed as an
issue, and none is accepted as debt.

## History

| Round | Date | Verdict | Findings | Fixed | Open |
|---|---|---|---|---|---|
| 1 | 2026-10-22 | PASS WITH FINDINGS | 1 Medium, 4 Low | 0 | F1, F2, F3, F4, F5 |
| 2 | 2026-10-22 | see below | — | — | — |

## Doc sync

`updated` — the spec's FR-8 was narrowed (F2) and the narrowing is recorded in
the spec's stability note; the review-fix phase updates the growth label (F4)
and the client copy (F1, F3), and `docs/save-schema.md` needs no change (no
persisted shape moves).
