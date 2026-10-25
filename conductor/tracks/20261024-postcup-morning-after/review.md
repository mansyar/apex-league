# Review: Post-Cup Morning-After Ritual

- **Track:** `20261024-postcup-morning-after`
- **Type:** `feature`
- **Branch:** `feat/20261024-postcup-morning-after`
- **Range:** `2dcebc7..98bf444a`
- **Date:** 2026-10-25
- **Verdict:** `BLOCK` (strict mode — review-fixes phase R1 open; re-review follows)

## Summary

The track is structurally complete and well-evidenced: all 23 requirements
(10 FR, 7 NFR, 6 AC) are covered with pinned tests, plan compliance is clean
(all phases have Result/Checkpoint/Evidence; recorded deviations accepted),
and all configured checks pass on the final tree. The reviewer found two
Medium behavioral defects at the seams (a sick-gate bypass on the ritual-day
first pet, and a mid-ceremony day-straddle that leaks tint/pet-pending into
the next day) plus three Low hardening findings. Under `review.strict: true`
all five are fixed in Phase R1 before the PR.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --check --parallel=4 --timeout 120000` | pass (0 fail; 2629 pass / 1 skip, 207 files) | run at `98bf444a` tree |
| lint | `bun run verify` (includes `biome check`) | pass | at code-identical tree `698c8b03` |
| typecheck | `bun run verify` (workspace typecheck) | pass | at code-identical tree `698c8b03` |
| build | `bun run build` | pass (pre-existing chunk advisory only) | at code-identical tree `698c8b03` |
| determinism | `gate:determinism` inside verify | pass (byte-identical) | at code-identical tree `698c8b03` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `morning-after/derive.test.ts` | covered |
| FR-2 | P2.T1 | `scene-logic/morning-after.test.ts` + `store.test.ts` | covered |
| FR-3 | P2.T2 | `morning-after-poses.test.ts` + `ranch/morning-after.test.ts` + `frame.test.ts` | covered |
| FR-4 | P1.T2 | `morning-after/milestones.test.ts` | covered |
| FR-5 | P3.T1 | `scene-logic/pet.test.ts` + `ranch/morning-after.test.ts` | covered (F1 gap) |
| FR-6 | P3.T2 | `hud/copy-morning-after.test.ts` + `store.test.ts` | covered (F4 gap) |
| FR-7 | P2.T3 | reduced-motion suite in `scene-logic/morning-after.test.ts` + `frame.test.ts` | covered |
| FR-8 | P3.T3 | `audio/careCues.test.ts` | covered |
| FR-9 | P4.T1 | `store.test.ts` + `derive.test.ts` + ledger tests | covered (F2 gap) |
| FR-10 | P1.T3 | `morning-after/copy.test.ts` golden | covered |
| NFR-1 | P2/P3 | `store.test.ts` save-payload assertions; save v25 untouched | covered |
| NFR-2 | all | module-size guard (12 KB) in suite | covered |
| NFR-3 | all | no dependency changes in diff | covered |
| NFR-4 | all | determinism gate byte-identical | covered |
| NFR-5 | P2.T1 | no randomness in new modules (grep + design) | covered |
| NFR-6 | P1.T3/P2.T3 | copy golden; pose-based stance; reduced motion | covered |
| NFR-7 | P2.T1 | timer-stub suite; zero timers | covered (F2 gap) |
| AC-1 | P1.T1 | `derive.test.ts` | covered |
| AC-2 | P2.T1 | machine + store + frame tests | covered |
| AC-3 | P1.T2 | `milestones.test.ts` | covered |
| AC-4 | P3.T1/T2 | `pet.test.ts` + `copy-morning-after.test.ts` | covered |
| AC-5 | P4.T2 | 12 real dev-server captures, console clean (`phase-4.md`) | covered |
| AC-6 | P4.T1 | forfeit-zero-amplifier + yield-flow tests | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- **F1 — Ritual-day first pet bypasses the sick gate**
  - **File:** `apps/client/src/ranch/api.ts:181-183`
  - **What:** when `morningAfterPetPending` is true, `startPet` returns
    `MORNING_AFTER_PET_VARIANT[class]` unconditionally, bypassing
    `pickPetReaction(mood, sick)` — a sick creature gets the perky variant
    (e.g. `hop` on a title morning). The adjacent comment claims the
    "mood, sick, and cooldown gates stay exactly as they are", so the code
    contradicts its own contract; the existing sick test only covers a
    non-ritual day.
  - **Why:** breaks an established care invariant on exactly the day the
    feature highlights; reads wrong against the creature-care voice.
  - **Fix:** gate the table lookup behind the sick check —
    `sick ? "stir" : MORNING_AFTER_PET_VARIANT[s.morningAfterClass]` —
    keeping cooldown/mood behavior otherwise unchanged.
  - **Requirement:** FR-5
  - **Test gap:** `ranch/morning-after.test.ts`: ritual day + sick
    conditions (`health < SICK_HEALTH`) → first pet returns `stir` and the
    pet window closes.
- **F2 — Mid-ceremony day-straddle leaks tint and pet-pending past night settle**
  - **File:** `apps/client/src/ranch/frame.ts:47-54, 116-138`
  - **What:** if the sim day advances while the ceremony is still running,
    the machine keeps playing into the next day; the settle edge then
    latches `setMorningAfterTint` with the NEW day, so the tint (and, if
    never petted, `morningAfterPetPending`) survives the night settle and
    colors the whole following day — violating FR-9's "state never persists
    past night settle".
  - **Why:** a day advance inside the 3–10 s ceremony window plays the
    ritual a full day late; pose-layer state outlives its day while the
    ledger is (correctly) settled.
  - **Fix:** track the last-seen day in the frame; on a day change
    mid-ceremony, settle/dismiss the machine, suppress the stale-day tint
    latch, and clear `morningAfterPetPending` unconditionally.
  - **Requirement:** FR-9 / NFR-7
  - **Test gap:** `ranch/morning-after.test.ts`: begin on day N, set
    `s.day = N+1` mid-ceremony, advance past settle → tint inactive and
    petPending false on day N+1.

### Low

- **F3 — `morningAfterDue` is a test-only public export**
  - **File:** `apps/client/src/scene-logic/morning-after-ledger.ts:36-45`
  - **What:** exported through the scene-logic barrel but no production
    caller (`store.takeMorningAfterArrival` uses `takeMorningAfter`
    directly); two shapes of "due" logic invite drift.
  - **Fix:** unexport from the barrel (keep the predicate internal to the
    ledger's own take path/tests), or make the store consult it — prefer
    the smaller unexport.
  - **Requirement:** none
- **F4 — Debrief update wrapper in `app/hud-screen.ts` has no direct test**
  - **File:** `apps/client/src/app/hud-screen.ts:235-251`
  - **What:** the seam that turns the banked derivation into an actual
    ticker say (routineUpdate → gate → `announceMorningAfter`, latching
    `debriefSaidDay`) is unpinned; a wiring regression would pass the suite.
  - **Fix:** small hud-screen test with a fake Hud double asserting exactly
    one `announceMorningAfter` across two updates on the ritual day and
    none after the settle.
  - **Requirement:** FR-6
- **F5 — `ranch/state.ts` begin-wrapper latch order allows clobbering a live ceremony**
  - **File:** `apps/client/src/ranch/state.ts:169-175`
  - **What:** the wrapper latches `morningAfterClass` and opens the pet
    window BEFORE delegating to `machine.begin`, which no-ops while a
    ceremony is running — a second begin would corrupt the latched class.
    Currently unreachable (single call site) but latent.
  - **Fix:** guard on machine-idle (or move the latch inside the
    begin-success path) + a state-level test.
  - **Requirement:** FR-2

## Overrides

- <none>

## Plan compliance

Clean. All four phases have Result/Checkpoint/Evidence; all 13 tasks
implemented; the union of Touches holds (three recorded composition-root
pass-throughs in P3 and the P4 tech-stack-by-primary are recorded
deviations, accepted). Volume strategy: large — per-phase checkpoint diffs
plus cross-phase integration; the executed diff-stat confirmed full
36-file scope examined.

## Out of scope

- Pre-existing unseeded `Math.random` in `camera/shake.ts`, `fx/bursts.ts`,
  `roster.ts`; pre-existing `setTimeout` in `cup.ts`, `arena.ts`,
  `playbackDriver.ts`, `musicBeds.ts` — untouched by this diff.
- Mobile training observations (nightly 1-AP training cost non-persistence;
  Juvenile ATK cap) — future product/UX track input.

## Debt

- <none — strict mode; all findings routed to Phase R1>

## Doc sync

`pending` — tech-stack note landed pre-review (`fa0593ac`); re-sync only if
fixes change documented behavior.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 0 | 2 | 3 | 0 (R1 open) |
