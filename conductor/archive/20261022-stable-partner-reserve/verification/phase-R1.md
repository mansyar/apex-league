# Phase R1 — Review fixes (round 1)

**Track:** `20261022-stable-partner-reserve` — Stable & Partner Reserve
**Phase:** R1 — Review fixes (round 1), closing the findings F1–F5 of the
round-1 review (`review.md`)
**Date:** 2026-10-22
**Branch:** `feat/20261022-stable-partner-reserve`
**Base commit:** `5667cf8` — conductor(review): Add review fixes phase for track
'20261022-stable-partner-reserve'
**Head commit:** `5617f68` — feat(client): rename a waiting pet from the stable
modal (the phase's content head; this report is committed on top of it)
**Result:** **verified** — every finding of round 1 is closed, each one with a
test that pins it: F1 (the rename of a waiting pet) gained a pure sim seam, a
real control on the stable row and the plumbing to the store; F2 is confirmed
closed in the code (nothing offers or promises a pending-gift successor); F3
(the chip that folded away) now stays, so the modal's empty state is reachable;
F4 (the growth panel calling the pet's own age "Day") now says "Age"; F5 (the
world day in the evolution gate's signature) is gone. The full gate is green
(`bun run verify` and `bun run build`), the client module cap holds (the
largest client module is still `hud/update.ts` at 12,263 B, 25 B under the
12,288 B cap), and the re-run visual pass is green at 1440x900 and 393x852 with
a clean console — 12 flows, 146 assertions.

---

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Types | `bun run check` (step of `bun run verify`) | 0 | voxel 71 files, sim 102 files, client 309 files — no type errors |
| Tests | `bun test --check --parallel --timeout 120000` (step of `bun run verify`) | 0 | 2321 pass, 1 skip, 0 fail, 90,729 `expect()` calls, 2322 tests across 173 files, 65.43 s |
| Lint | `biome check` (step of `bun run verify`) | 0 | 503 files checked, no fixes applied |
| Assets | `bun run gate:determinism` (step of `bun run verify`) | 0 | 12 creature GLBs byte-identical + 5 props regeneration digests match |
| **Gate** | `bun run verify` | **0** | all four layers green on the phase head |
| **Build** | `bun run build` | **0** | 251 modules transformed, `dist/assets/index-CJUvT2pQ.js` 870.82 kB (gzip 237.51 kB), built in 705 ms (the pre-existing chunk-size warning stands) |
| Visual | `bun test --timeout 120000 ./.conductor/evidence/phase-3/stable-visual-pass.ts` | 0 | 12 flows, **146 visual assertions**, 0 fail, 207.51 s, console clean at 1440x900 and 393x852 |

The shell in this environment rejects `&&` chains, so the brief's two commands
were run one after the other, exactly as written (`bun run verify` is itself an
`&&` chain inside the package script, so it ran as a single command).

---

## The findings, one by one

| ID | Severity | What changed | Files | The test that pins it |
|---|---|---|---|---|
| **F1** | Medium | **Renaming a stashed pet now exists, end to end.** The sim grew a pure seam `renameStablePet(state, creatureId, name)`: it follows `renameCreature`'s rules (the name is trimmed and clamped to `NAME_MAX_LENGTH`, an empty name falls back to the species' display name), it refuses the same `"cup-phase"` day-phase lock, and it refuses a pet that is not waiting with `"unknown-pet"`. It returns a new `stable` array in which **only that slot's name changed** — the ranch pet, the day, the lineage and the ladder stand untouched, and the input state is never mutated. The client grew a real control on the stable row: a labelled pencil (44 x 44 px at every width) that opens a small editor (a labelled field, Save and Cancel), where Enter saves and Escape cancels the edit and hands the keyboard back to the pencil. The sim decides the name, the app commits the answer through the store, and the row repaints from the committed state. | `packages/sim/src/stable.ts`, `packages/sim/src/index.ts`, `apps/client/src/stable-rename.ts` (new), `apps/client/src/stable.ts`, `apps/client/src/hud.ts`, `apps/client/src/hud/types.ts`, `apps/client/src/hud/shell.ts`, `apps/client/src/app/hud-screen.ts` | sim: `packages/sim/src/stable.test.ts` — "renaming a waiting pet (the spec's edge case)", 8 tests (renamed where it waits; only the name moves; the ranch pet/day/lineage/ladder stand untouched; trim + clamp; empty name falls back to the species; the cup-phase refusal; the unknown-pet refusal; purity). client: `apps/client/src/stable.test.ts` — "renaming a waiting pet", 3 tests (the pencil is a labelled 44px control; the pencil renames the pet and the change is committed; Escape cancels and hands the keyboard back to the pencil). visual: the **rename flow** — 16 assertions per width |
| **F2** | Low | **Confirmed closed in the code; nothing claims the pending gift as a successor.** The primary narrowed FR-8 to "a stashed pet or a starter"; the code already matched. The graduation egg screen never reads `state.pendingGift` — it offers exactly two groups, "From your stable" and "A new hatch" (`apps/client/src/graduation/egg.ts`). The sim's graduation has exactly two successor paths: `graduateFromStable` (a stashed pet) and the starter-species path in `packages/sim/src/legacy.ts`. The client's only mention of the pending gift at all is a doc comment in `apps/client/src/gift.ts` about the gift card's stat preview — the card, not the graduation. No copy, screen or seam offers a third option. | *(no change — confirmation only)* | the graduation flow of the visual pass (the stable group and the starter species are the two groups on the egg screen) + the sim's graduation tests in `packages/sim/src/stable.test.ts` |
| **F3** | Low | **The chip stays; the empty state is reachable at last.** `stableChipVisible(state)` now returns `true` whatever the stable holds, `buildStableChip` no longer hides the chip when it is built, and the modal keeps its empty state (the copy "No pets in the stable yet — every pet you own but the one in the ranch waits here.") and its `role="status"` note. The client test that pinned the old behaviour ("the chip folds away while the stable is empty") was re-pinned to the new contract. | `apps/client/src/stable.ts`, `apps/client/src/stable.test.ts` | client: `apps/client/src/stable.test.ts` — "stableChipVisible" (2 tests) and "the modal with an empty stable" (the empty state is visible, says so in words, lists no pet, the note is a live region). visual: the **empty-stable flow** (7 assertions per width) and the flipped gift-flow assertion "the stable chip stays visible while the stable is empty" |
| **F4** | Low | **The growth panel calls the pet's own age "Age".** `ageCondition` in `apps/client/src/growth.ts` labelled the pet's own age (ageDays) "Day", which reads as the world day; the partner-details modal already said "Age". The label and the `GrowthRow.label` doc example now say "Age". The growth rows are shared by two surfaces, so both test files that read the labels were re-pinned. | `apps/client/src/growth.ts`, `apps/client/src/growth.test.ts`, `apps/client/src/creature-detail.test.ts` | client: `apps/client/src/growth.test.ts` (the row-label lists and the digit-free row) and `apps/client/src/creature-detail.test.ts` (the growth rows of the partner details: labels `["Age","Clean nights","Mood","Bond","Cups won"]`, details "6 / 25" and "6 / 10") |
| **F5** | Low | **The world day left the evolution gate's signature.** `evaluateEvolution(creature, _day, cupsWon)` kept a day argument that decided nothing — the age gates read the pet's own age. The seam is now `evaluateEvolution(creature, cupsWon)`, the doc comment says the gate reads the pet's own age, and the settlement no longer takes the day either (`settleCreature(creature, rng, cupsWon)`). Every call site follows: the settlement, the ticker's night, the sim tests, the save-migration test, the client's growth test and the champion demo. | `packages/sim/src/evolution.ts`, `packages/sim/src/settlement.ts`, `packages/sim/src/ticker.ts`, `packages/sim/src/evolution.test.ts`, `packages/sim/src/save/save.test.ts`, `apps/client/src/growth.test.ts`, `artifacts/champion-demo.ts` | sim: `packages/sim/src/evolution.test.ts` (the baby and champion gate suites, re-pinned) and `packages/sim/src/save/save.test.ts` (the v22 migration keeps today's behaviour) |

### The commit trail

| Commit | Task |
|---|---|
| `a7f118a` | feat(sim): rename a pet waiting in the stable — F1 (the sim seam + its tests + the barrel export) |
| `3452a4e` | refactor(sim): drop the world day from the evolution gate — F5 (the seam, the settlement, the ticker, the tests, the demo) |
| `967d6be` | fix(client): call the pet's own age Age, not Day — F4 (the growth rows and both label tests) |
| `5617f68` | feat(client): rename a waiting pet from the stable modal — F1 (the control, the editor, the store plumbing) and F3 (the chip stays) |

---

## The visual pass

**How it was driven.** `bun run dev` (vite 8.3.4) on `http://localhost:5199`
(a dev server was already running on that port when this phase started; the
phase left it running rather than taking down a server it did not start). The
pass is the Phase 3 harness, re-run on the phase head with the F3 assertion
flipped and two new flows added.

| Flow | Widths | Assertions | What it proves |
|---|---|---|---|
| stable (chip, modal, listing, swap, focus) | 1440x900 + 393x852 | 25 per width | the surface still works after the change |
| gift (the card, the hatch, the chip) | 1440x900 + 393x852 | 11 per width | **the flipped F3 assertion**: the stable chip stays visible while the stable is empty |
| cup (the refusal) | 1440x900 | 5 | the day-phase lock still coaches instead of acting |
| graduate (the egg screen) | 1440x900 + 393x852 | 10 per width | F2 in the running app: the egg screen offers the stable group and the starter species, and nothing else |
| renamed (a pet renamed before the save) | 1440x900 | 4 | the species still rides in the meta beside a new name |
| **empty stable (new)** | 1440x900 + 393x852 | 7 per width | **F3**: the chip stays, the modal opens, the empty state is visible and says so in words, no pet is listed, the note is a live region, Escape returns the focus to the chip |
| **rename (new)** | 1440x900 + 393x852 | 16 per width | **F1**: the row carries one rename control, it is labelled "Rename <pet>", its box is at least 44 x 44, the editor takes the keyboard, the field is labelled, Escape folds the editor and leaves the name standing, the pencil takes the focus back, the modal stays open, the saved name shows on the row with its species still in the meta, the ranch pet is untouched, and the new name reached the store (`apex.save`) |

**Totals.** 12 flows, **146 visual assertions**, 0 failures, 207.51 s. The
console was clean in every flow at both widths (the harness collects
`console` errors and `pageerror`s and fails the flow on any).

**Captures.** `.conductor/evidence/phase-3/shots/` — the new ones are
`desktop-11-empty-stable.png`, `iphone-11-empty-stable.png`,
`desktop-12-stable-rename.png`, `iphone-12-stable-rename.png`,
`desktop-13-stable-renamed.png`, `iphone-13-stable-renamed.png`; the phase-3
captures (`desktop-1-ranch.png` … `iphone-9-graduation-egg.png`) were rewritten
by the re-run.

---

## The client module cap (NFR-1)

The cap is 12,288 B per non-test module under `apps/client/src`, and
`apps/client/src/module-size.test.ts` walks the whole tree on every run. The
sizes below were read from the working tree by the visual pass itself (the
same `statSync` the guard uses), after the phase's last edit.

| Module | Bytes | Headroom |
|---|---|---|
| `apps/client/src/hud/update.ts` (the largest client module, untouched) | 12,263 B | 25 B under the cap |
| `apps/client/src/stable.ts` (touched: the chip, the row, the editor wiring) | 11,379 B | 909 B under the cap |
| `apps/client/src/stable-rename.ts` (new: the rename control and its editor) | 4,949 B | 7,339 B under the cap |
| `apps/client/src/growth.ts` (touched: the "Age" label) | 7,015 B | 5,273 B under the cap |

The guard is green in the same run as the rest of the gate.

---

## Deviations

Every change outside the brief's `Touches` list, and why it was needed.

| File | Why it was required |
|---|---|
| `apps/client/src/stable-rename.ts` *(new)* | The rename editor needed its own seam. The stable modal was already 10,598 B of a 12,288 B cap; with the editor inlined the module measured **14,366 B — 2,078 B over the cap** (the guard failed on it), so the control and its editor were split into their own module. The two modules now measure 11,379 B and 4,949 B, and the cap holds. |
| `apps/client/src/hud.ts` | The HUD's handler seam needed one more handler (`onRenameStable`) so the rename can reach the store. One interface member and its doc comment. |
| `apps/client/src/hud/types.ts` | The shell's handler subset needed the same one member, so `shell.ts` can wire the modal. |
| `apps/client/src/hud/shell.ts` | The shell builds the stable modal, so it passes the new handler to `buildStableModal`. One wiring line. |
| `apps/client/src/app/hud-screen.ts` | The app owns the store: this is where the rename runs the sim's seam and commits the answer (`store.commit(result.state)`) — the "the rename must reach the store and be committed" half of F1. |
| `apps/client/src/creature-detail.test.ts` | The partner-details growth rows read the labels from `growth.ts`, so F4's "Day" → "Age" broke their expectations. Re-pinned (labels and the two detail values). |
| `packages/sim/src/ticker.ts` | `settleCreature` lost its day parameter (F5), so its one call site changed. |
| `packages/sim/src/save/save.test.ts` | The v22-migration test called `evaluateEvolution(creature, 10)`; the call follows F5's new signature. |
| `packages/sim/src/evolution.test.ts` | The `evaluateEvolution` calls follow F5's new signature (and biome's formatter re-flowed four of them). |
| `.conductor/evidence/phase-3/stable-visual-pass.ts` | The re-run visual pass: the F3 assertion flipped and the two new flows added. An evidence artifact under `.conductor/evidence/`, not a tracked source file. |

---

## Notes for the primary

- **F2 is a confirmation, not a change.** Nothing in the code offers or
  promises a pending-gift successor: the graduation egg screen shows "From
  your stable" and "A new hatch" and never reads `state.pendingGift`; the
  sim's graduation has exactly two successor paths. The client mentions
  `pendingGift` in one place only — a doc comment in `apps/client/src/gift.ts`
  about the gift card's stat preview, which is the card, not the graduation.
- **The 44 px target is met at every width**, not only at the phone tier. The
  repo's own convention (`base.css`) keeps the active pet's pencil at 26 px on
  desktop and grows it to 44 px on the phone tier; the brief asked the stable
  row's control for a 44 px target, so that one control is 44 x 44 inline at
  every width. The active pet's pencil was left as it is (out of scope).
- **The chip is now always visible**, which changes the ranch's top-left chip
  row: STABLE sits beside SETTINGS and HANDBOOK even when nobody waits. That
  is what FR-9 and the spec's edge case ask for, and the visual pass pins it.
- **A dev server was already running on port 5199** when this phase started
  (the phase's own `bun run dev -- --port 5199` failed with "Port 5199 is
  already in use"). The visual pass therefore ran against that server, which
  serves this working tree; the phase did not start or stop any server.
- **The shell in this environment rejects** `bun test <file>` on its own, so
  the module-cap numbers were read by the visual-pass script itself (it stats
  the client modules and prints them) rather than by a separate command.
- The four task-level commits are listed above; this report is committed on
  top of `5617f68`.

## Primary verification

Run by the primary agent, independently of the phase report.

| Check | Command | Exit | Result |
|---|---|---|---|
| Working tree | `git status --porcelain` | 0 | clean |
| Files vs Touches | `git diff --name-only 5667cf8..HEAD` | - | 21 files: the sim's stable/evolution/settlement/ticker/barrel and their tests, the client's stable/rename/growth modules and the handlers the rename needed, `artifacts/champion-demo.ts`, and this evidence file - all inside Touches or the ten reported deviations (each one a call site or handler the fix forced) |
| Commits reported | `git log --oneline 5667cf8..HEAD` | - | 5 commits, all reported; no merge commit |
| Gate | `bun run verify` | **0** | types clean (voxel 71 / sim 102 / client 309 files), **2,321 pass / 1 skip / 0 fail** across 173 files, `biome check` clean on 503 files, the determinism gate byte-identical for 12 creature GLBs + 5 props |
| Build | `bun run build` | 0 | exit 0 (only the pre-existing chunk-size warning) |
| Module cap | the module-size gate | 0 | `hud/update.ts` 12,263 B, `stable.ts` 11,379 B, `stable-rename.ts` 4,949 B - the cap was never raised |

The fixes were read, not just trusted:

- **F1** - `renameStablePet(state, creatureId, name)` (packages/sim/src/stable.ts)
  is pure, refuses `cup-phase` and `unknown-pet`, trims and clamps like
  `renameCreature`, falls back to the species display name for an empty name,
  and replaces only that slot in a new `stable` array. The client adds a
  labelled pencil per row and a small editor; the capture
  `desktop-13-stable-renamed.png` shows the waiting hound renamed to "Rolo",
  with the species line returning ("Storm Hound - Baby - 1 day") because the
  name no longer says it - the Phase 3 pure decision doing its job on a name
  that changed.
- **F2** - confirmed: the egg screen offers "From your stable" and "A new
  hatch" and never reads `state.pendingGift`; FR-8 was narrowed in the spec by
  the primary, with the reason recorded in the spec's stability note.
- **F3** - the chip now always shows, so the empty state is reachable; the
  capture `desktop-11-empty-stable.png` shows the STABLE chip beside SETTINGS,
  HANDBOOK and GIFT, and the modal reading "No pets in the stable yet - every
  pet you own but the one in the ranch waits here."
- **F4** - the growth row's label is "Age" (apps/client/src/growth.ts:93).
- **F5** - `evaluateEvolution(creature, cupsWon)` no longer takes a day, and
  every call site in the repo was updated.

Verdict: **verified** - all five findings are closed, each with a test, and
the gate is green.
