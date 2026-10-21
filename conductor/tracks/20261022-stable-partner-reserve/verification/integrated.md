# Integrated Verification — Stable & Partner Reserve

**Track:** `20261022-stable-partner-reserve`
**Branch:** `feat/20261022-stable-partner-reserve`
**Base:** `cf2cdbf` (origin/main at the track's start) · **Head:** `99d626b`
**Date:** 2026-10-22
**Result:** **verified** — every requirement and acceptance criterion in the
spec is delivered, and the full gate is green on the branch head.

---

## What the track did, phase by phase

| Phase | Goal | Checkpoint | Evidence |
|---|---|---|---|
| 1 — Per-Pet Age | Every pet carries its own age; the growth gates read it, not the world day | `d929a77` | `verification/phase-1.md` |
| 2 — The Stable | The state holds the pets you own; the swap, freeze, gift and graduation seams work in the sim | `d8dff99` | `verification/phase-2.md` |
| 3 — Client Surfaces | The stable chip and modal, the swap, the age readout, the gift card and the graduation screen | `681fe3e` | `verification/phase-3.md` |
| 4 — Docs & Integrated Verification | The docs match the delivered behaviour; the full gate is green | `91114b0` | `verification/phase-4.md` |

The track exists because of a defect the electric line recorded as a known
issue: **the Storm Gift took the ranch pet with it**. A reward that costs the
player their companion is a reward nobody wants. The stable turns that
around — the ranch keeps one partner, every other pet waits in the stable
frozen, and a reward joins the collection instead of replacing a pet.

The second defect the track fixed is older and quieter: the growth gates read
the *world* day, so a pet hatched late became a juvenile after one night. Age
is now the pet's own.

---

## Requirement coverage

| ID | Requirement | Where | Status |
|---|---|---|---|
| FR-1 | The stable holds every non-ranch pet, unlimited, persisted by v24; older saves migrate to an empty stable | `packages/sim/src/state.ts`, `save/migrate.ts` (`23:` step), `save/storage.ts` | pass |
| FR-2 | Exactly one pet is active; a stashed pet never competes | `packages/sim/src/stable.ts`, `ticker.ts` | pass |
| FR-3 | The swap is free, instant and lossless in both directions | `packages/sim/src/stable.ts` (`sendToStable` / `bringToRanch`) | pass |
| FR-4 | A stashed pet is frozen — a night changes neither its conditions nor its age | `packages/sim/src/ticker.ts` (only the active pet settles) | pass |
| FR-5 | Age is per pet; the juvenile, champion and graduation gates read it | `packages/sim/src/creature.ts`, `evolution.ts`, `legacy.ts` | pass |
| FR-6 | The age is shown in the partner-details modal and the stable modal | `apps/client/src/creature-detail.ts`, `apps/client/src/stable.ts` | pass |
| FR-7 | The Storm Gift hatches into the stable; the gift is never a replacement | `packages/sim/src/breeding.ts` (`hatchGiftEgg`), `apps/client/src/gift.ts` | pass |
| FR-8 | A graduation's successor may be a stashed pet or a starter | `packages/sim/src/legacy.ts` (`graduateFromStable`), `apps/client/src/graduation/egg.ts` | pass |
| FR-9 | The stable chip and modal list every stashed pet; the ranch rebuilds after a swap | `apps/client/src/stable.ts`, `app/hud-screen.ts` | pass |
| FR-10 | A swap during a live cup is refused with coaching copy | `packages/sim/src/stable.ts` (`"cup-phase"`), `apps/client/src/stable.ts` | pass |
| FR-11 | Breeding stays Hall-only | `packages/sim/src/breeding.ts` | pass |
| FR-12 | The cups-won tally stays the family's | `packages/sim/src/state.ts`, `legacy.ts` (untouched) | pass |
| FR-13 | The docs match the delivered behaviour | `docs/save-schema.md`, `README.md`, `conductor/product.md`, `conductor/tech-stack.md` | pass |

## Non-functional coverage

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| NFR-1 | Every client module ≤ 12,288 B | `module-size.test.ts` green; the largest client module is `hud/update.ts` at 12,263 B, `stable.ts` is 11,379 B and `stable-rename.ts` 5,070 B | pass |
| NFR-2 | No new dependencies; the gate still covers 12 byte-identical creature GLBs | `bun run gate:determinism` — 12 GLBs byte-identical + 5 props; no dependency added | pass |
| NFR-3 | Sim logic pure, seeded, DOM-free, TDD'd; a swap consumes no RNG | `packages/sim/src/stable.ts` is pure and seedless; the sim's tests cover each seam | pass |
| NFR-4 | Existing invariants hold; the evolution goldens re-pinned onto the pet's age with the same day numbers | The six boss bands unchanged; the day-1 starter still matures on the day-10 night (`evolution.test.ts`, "the pet's own age — a late hatch grows at its own pace") | pass |
| NFR-5 | The stable surface follows `product-guidelines.md` | The modal is a `kit-modal` with a focus trap, Escape and backdrop close, focus restored to the partner plate, ARIA-labelled, and the house's icon-button targets (26 px on the desktop, the phone tier's 44 px floor) — proven by the visual pass | pass |
| NFR-6 | No new voxel artifacts | The change set touches no voxel source or GLB; the gate regenerates all 12 byte-identical | pass |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-1 | The gift hatches into the stable and the ranch pet stays put — browser-verified at both widths, clean console | The visual pass's gift flow (11 assertions per width): the card says *"Hatching sends the hound to the stable — Ember Drake keeps the ranch"*, the hatch leaves the ranch pet in place, and the Stable chip then lists the hound | pass |
| AC-2 | A swap is lossless | `stable.test.ts`; the primary's probe: the stashed drake kept its stats, conditions and age | pass |
| AC-3 | A stashed pet is frozen | `stable.test.ts`; the primary's probe: a night moved the stashed pet's age 1 → 1 and mood 60 → 60 while the active pet aged 1 → 2 | pass |
| AC-4 | A day-24 hatch matures on its own tenth night; the day-1 starter on the day-10 night | `packages/sim/src/evolution.test.ts`; the primary's probe: a day-24 hatch stays a baby through its first night (it was a juvenile before this track) | pass |
| AC-5 | The detail modal shows the active pet's age; the stable modal shows each stashed pet's age | The visual pass's stable flow (25 assertions per width) | pass |
| AC-6 | v24 round-trips; v23 → v24 migrates; a malformed stable fails the load | `save/stableSave.test.ts`; `storage.ts`'s v24 rule | pass |
| AC-7 | The chip opens the modal, the pets are listed, a swap rebuilds the ranch; both widths clean | The visual pass's stable flow, desktop 1440x900 and iPhone 15 393x852, console clean | pass |
| AC-8 | A graduation can hand the ranch to a stashed pet, the retired pet archived as before | `legacy.test.ts`; the visual pass's graduation flow (10 assertions per width) shows *From your stable* next to *A new hatch* | pass |
| AC-9 | The full gate is green | `bun run verify` exit 0 and `bun run build` exit 0 on the head | pass |

## The gate on the branch head

| Layer | Command | Exit | Result |
|---|---|---|---|
| Types | `bun run check` | 0 | voxel 71 files, sim 102 files, client 308 files — no type errors |
| Unit | `bun test` | 0 | 2,307 pass / 1 skip / 0 fail across 173 files |
| Lint | `biome check` | 0 | 502 files, no fixes applied |
| Assets | `bun run gate:determinism` | 0 | 12 creature GLBs byte-identical + 5 props' digests match |
| **Gate** | `bun run verify` | **0** | all four layers green |
| Build | `bun run build` | 0 | 250 modules, 868.83 kB / gzip 237.02 kB (pre-existing chunk-size warning only) |
| Visual | the Playwright pass | 0 | 8 flows, 102 assertions, 0 failures, console clean at 1440x900 and 393x852 |

## Notes and deviations

- **Two save steps, not one.** v23 (the pet's own age) and v24 (the stable) are
  two linear migrations, so the verified Phase 1 migration was never rewritten.
  A v22 save migrates through both.
- **The graduation gate now follows the pet's own 60 days.** A late-hatched pet
  needs 60 of its own days; a day-1 starter is unchanged. This was the
  approved consequence of making age per pet, and the spec records it.
- **Phase 4 was partly blocked:** the phase agent's sandbox refused every write
  under `conductor/` outside its own evidence folder, so it could not write
  `conductor/product.md` and `conductor/tech-stack.md`. The phase reported
  *partial* with the finished text; the primary applied it verbatim and closed
  the phase. The truth check (the code wins over a doc) is recorded in
  `verification/phase-4.md`.
- **One polish fix was sent back to Phase 3** after my review: a waiting pet's
  row repeated its own name (the meta line was `${species} · ${stage} · ${age}`
  while the title is the pet's name, and a pet's default name *is* its species
  name). The decision now lives in the pure layer and both surfaces consume it.
- **Documentation debt, out of scope:** the `Creature` table in
  `docs/save-schema.md` omits the persisted `element` and `bondedToday` fields.
  Pre-existing; recorded, not fixed here.
- **No known issue remains open.** The electric line's "the Storm Gift takes
  the pet in the ranch with it" is closed by this track and recorded as closed
  in `conductor/product.md`.
- **Review round 1 narrowed FR-8** (2026-10-22): the successor options are "a
  stashed pet or a starter". The pending gift was dropped from the requirement
  because it is a pure gift with no inherited stat floor (FR-7), so it waits in
  the stable like any other pet and the player brings it forward; the
  requirement ID is unchanged and the reason is recorded in the spec's
  stability note.
