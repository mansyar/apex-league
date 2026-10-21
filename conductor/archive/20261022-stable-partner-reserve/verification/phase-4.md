# Phase 4 — Docs & Integrated Verification

**Track:** `20261022-stable-partner-reserve` — Stable & Partner Reserve
**Phase:** 4 — Docs & Integrated Verification
**Date:** 2026-10-22
**Branch:** `feat/20261022-stable-partner-reserve`
**Base commit:** `2350747` — conductor(plan): Mark phase 'Docs & Integrated Verification' as in progress
**Head commit:** `24b89af` — docs(conductor): record the phase 4 verification
report (the phase's content commit is `d206f0d` — docs(readme): the stable holds
the pets you are not ranching)
**Result:** **verified** (by the primary) - the full gate and the visual pass are
green on the branch head, `README.md` now tells the player-facing truth, and
`docs/save-schema.md` was re-verified line by line against the code (it already
documents v23/v24 correctly and needed no edit). This phase could **not** write
`conductor/product.md` and `conductor/tech-stack.md` - the sandbox refuses every
write under `conductor/` outside this evidence folder, and both files are listed
in the brief's `Touches` - so the phase reported **partial** with the exact,
ready-to-apply text for both in **Ready-to-apply doc changes** below. The
primary applied that text verbatim (see *Primary verification*), which closed
the phase.

---

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Types | `bun run check` (step of `bun run verify`) | 0 | voxel 71 files, sim 102 files, client 308 files — no type errors |
| Tests | `bun test --check --parallel --timeout 120000` (step of `bun run verify`) | 0 | 2307 pass, 1 skip, 0 fail, 90,695 `expect()` calls, 2308 tests across 173 files, 58.39 s |
| Lint | `biome check` (step of `bun run verify`) | 0 | 502 files checked, no fixes applied |
| Assets | `bun run gate:determinism` (step of `bun run verify`) | 0 | 12 creature GLBs byte-identical + 5 props regeneration digests match |
| **Gate** | `bun run verify` | **0** | all four layers green on the branch head |
| **Build** | `bun run build` | **0** | 250 modules transformed, `dist/assets/index-CzUx-dp5.js` 868.83 kB (gzip 237.02 kB), built in 779 ms |
| Visual | `bun test --timeout 120000 ./.conductor/evidence/phase-3/stable-visual-pass.ts` | 0 | 8 tests, 102 visual assertions, 0 fail, 109.16 s, console clean at both widths |

The shell in this environment rejects `&&` chains, so the brief's two commands were run
one after the other, exactly as written (`bun run verify` is itself a `&&` chain inside
the package script, so it ran as a single command).

---

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| **AC-9** | the full gate is green: types, biome, whole test suite, determinism gate, build | commands table above; re-run on the phase head | **pass (this phase)** |
| AC-1 | Storm Gift hatches into the stable, the ranch pet stays (desktop + iPhone 15, clean console) | `phase-3.md`; visual pass "gift flow" — 11 assertions per width, both clean | pass (phase 3, re-verified here) |
| AC-2 | lossless free swap | `phase-2.md` (sim seam) + `phase-3.md` (client) | pass (phases 2–3) |
| AC-3 | a stashed pet is frozen | `phase-2.md` | pass (phase 2) |
| AC-4 | a day-24 hatch matures on its own tenth night, a day-1 starter still on day 10 | `phase-1.md` | pass (phase 1) |
| AC-5 | the age is shown in both modals | `phase-3.md`; visual pass "the partner details carry the pet's own age" | pass (phase 3, re-verified here) |
| AC-6 | save v24 round-trips, v23→v24 → empty stable with the age preserved, a malformed stable fails the load | `phase-2.md` | pass (phase 2) |
| AC-7 | the chip opens the modal, lists the pets, the swap rebuilds the ranch (desktop + iPhone 15, clean console) | `phase-3.md`; visual pass "stable flow" — 25 assertions per width, both clean | pass (phase 3, re-verified here) |
| AC-8 | a graduation can hand the ranch to a stashed pet, the retiree is archived to the Hall | `phase-2.md` (sim) + `phase-3.md` (screen); visual pass "graduation flow" | pass (phases 2–3, re-verified here) |

---

## Docs diff summary

| File | State | What it now says |
|---|---|---|
| `README.md` | **changed** (`d206f0d`, +26 / −15) | The player-facing truth of the feature, in six places: the **Status** paragraph now states that the ranch keeps one partner at a time and every other pet waits in the stable; **Core loop** step 2 says the juvenile gate arrives "on its own tenth night" (the pet's own age, not the world day) and a new **step 5 — The stable** describes the frozen waiting pets and the free, instant, lossless swap; **Getting started** now says the Storm Gift "adds a fourth line to your collection" and "waits in the stable rather than taking your ranch pet's place", with the Stable chip beside Settings bringing a waiting pet forward (the old "hatched into a fourth line" sentence that implied replacement is gone); the **release checklist** "Older saves" step now targets v23 → v24 (empty stable, the pet's own age intact) instead of the stale v19 → v20 line, and the keyboard-only path now includes the stable; the **Roadmap** Phase 3 cell says the reward line "now joins your collection instead of replacing your pet". |
| `docs/save-schema.md` | **unchanged — verified true** | Phase 1 and Phase 2 already wrote the v23/v24 documentation correctly. Re-read line by line against the code: the header says `current: 24 (SAVE_VERSION)` and `SAVE_VERSION = 24` in `packages/sim/src/save/schema.ts` ✓; the `GameState at v24` table has all 15 fields of `GameState` including `stable` ✓; the `Creature` table documents `ageDays` (integer ≥ 1, the pet's own age) ✓; the migration chain ends with `v22 → v23` (stamps the world day on the active pet) and `v23 → v24` (stamps an empty stable) matching `migrate.ts` ✓; the validation paragraphs state the v23 age rule and the v24 whole-pet rule, matching `isValidCreature` in `save/storage.ts` ✓. No edit was needed, so none was made. |
| `conductor/product.md` | **not written — sandbox** | The planned edits are in **Ready-to-apply doc changes** below: the closed known issue from the Electric species line and the stable in product language. |
| `conductor/tech-stack.md` | **not written — sandbox** | The planned dated entry (`2026-10-22`) is in **Ready-to-apply doc changes** below. |

---

## Gate output summary

- **Types** — `bun run check` → exit 0. `@apex/voxel` 71 files, `@apex/sim` 102 files,
  `@apex/client` 308 files, no type errors.
- **Tests** — `bun test --check --parallel --timeout 120000` → exit 0. **2307 pass,
  1 skip, 0 fail**, 90,695 `expect()` calls, 2308 tests across 173 files in 58.39 s
  (the suite the phases 1–3 left green, now 16 tests larger than phase 2's 2291 —
  the phase 3 client suites).
  - NFR-1 (client modules ≤ 12 KB) is enforced inside that suite:
    `apps/client/src/module-size.test.ts` caps every non-test module at
    `12 * 1024` = 12,288 B and it passed.
- **Lint** — `biome check` → exit 0, 502 files checked, no fixes applied.
- **Determinism gate** — `bun run gate:determinism` → exit 0, **12 creature GLBs**
  byte-identical (draconic, bovine, axolotl and storm_hound × baby/juvenile/champion,
  seed 42) and 5 props (tuft, bush, broadleafTree, rock, foodPile) regeneration
  digests match. NFR-6 holds: no new voxel artifact was added by this track.
- **Build** — `bun run build` → exit 0, 250 modules transformed,
  `dist/index.html` 2.13 kB, `dist/assets/index-CfQfZGnJ.css` 63.28 kB (gzip 12.16 kB),
  `dist/assets/index-CzUx-dp5.js` 868.83 kB (gzip 237.02 kB), built in 779 ms. The only
  output is the pre-existing "some chunks are larger than 500 kB" warning, which was
  already there in phase 2.

---

## Visual-pass summary

Harness: `.conductor/evidence/phase-3/stable-visual-pass.ts` (re-run unchanged against
the phase head, with its fixture saves in the same folder). Dev server: `bun run dev`
(Vite 8.3.4) on `http://localhost:5199`.

| Width | Flow | Assertions | Console |
|---|---|---|---|
| 1440×900 (desktop) | stable flow — chip, modal, two pets, crest/stage/age, no repeated species, keyboard focus, swap, focus returns to the partner plate, Escape returns it to the chip | 25 | clean |
| 393×852 (iPhone 15) | the same stable flow | 25 | clean |
| 1440×900 | gift flow — gift chip visible, stable chip hidden while the stable is empty, the card says the hound waits in the stable and the ranch pet stays, the Hall of Fame line is gone, the stats preview stays, the ranch pet survives the hatch, the gift chip disappears, the stable chip appears with the hound | 11 | clean |
| 393×852 | the same gift flow | 11 | clean |
| 1440×900 | cup flow — a swap during a live cup is refused with coaching copy, the modal stays open, the ranch pet is untouched | 5 | clean |
| 1440×900 | graduation flow — the dock offers the Graduate chip, the confirm names the retiree, the stable group is offered and lists the waiting pets with their stage and age, the starter species are still offered, the ranch goes to the pet the player already has | 10 | clean |
| 393×852 | the same graduation flow | 10 | clean |
| 1440×900 | renamed flow — a renamed waiting pet keeps its species and reads species + stage + age | 5 | clean |

**102 visual assertions passed, 0 failed, 8/8 tests, 109.16 s, console clean at every
step of every flow.**

Captures (re-taken at the phase head commit):

```
.conductor/evidence/phase-3/shots/desktop-1-ranch.png
.conductor/evidence/phase-3/shots/desktop-2-stable-modal.png
.conductor/evidence/phase-3/shots/desktop-3-after-swap.png
.conductor/evidence/phase-3/shots/desktop-4-stable-after-swap.png
.conductor/evidence/phase-3/shots/desktop-5-gift-card.png
.conductor/evidence/phase-3/shots/desktop-6-after-hatch.png
.conductor/evidence/phase-3/shots/desktop-7-stable-after-hatch.png
.conductor/evidence/phase-3/shots/desktop-8-cup-refusal.png
.conductor/evidence/phase-3/shots/desktop-9-graduation-egg.png
.conductor/evidence/phase-3/shots/desktop-10-stable-renamed.png
.conductor/evidence/phase-3/shots/iphone-1-ranch.png
.conductor/evidence/phase-3/shots/iphone-2-stable-modal.png
.conductor/evidence/phase-3/shots/iphone-3-after-swap.png
.conductor/evidence/phase-3/shots/iphone-4-stable-after-swap.png
.conductor/evidence/phase-3/shots/iphone-5-gift-card.png
.conductor/evidence/phase-3/shots/iphone-6-after-hatch.png
.conductor/evidence/phase-3/shots/iphone-7-stable-after-hatch.png
.conductor/evidence/phase-3/shots/iphone-9-graduation-egg.png
```

---

## Evidence paths

| What | Path |
|---|---|
| This report | `conductor/tracks/20261022-stable-partner-reserve/verification/phase-4.md` |
| Phase 1 (per-pet age, save v23) | `conductor/tracks/20261022-stable-partner-reserve/verification/phase-1.md` |
| Phase 2 (the stable, save v24) | `conductor/tracks/20261022-stable-partner-reserve/verification/phase-2.md` |
| Phase 3 (client surfaces) | `conductor/tracks/20261022-stable-partner-reserve/verification/phase-3.md` |
| Visual-pass harness | `.conductor/evidence/phase-3/stable-visual-pass.ts` (+ `stable-save.ts`, `cup-save.json`, `gift-save.json`, `graduate-save.json`, `renamed-save.json`) |
| Visual-pass captures | `.conductor/evidence/phase-3/shots/` (18 PNGs, re-taken at the phase head) |
| Save schema | `docs/save-schema.md` |
| Sim seams | `packages/sim/src/stable.ts`, `packages/sim/src/creature.ts` (`AGE_AT_HATCH`), `packages/sim/src/evolution.ts`, `packages/sim/src/save/migrate.ts`, `packages/sim/src/save/storage.ts` |
| Client surfaces | `apps/client/src/stable.ts`, `apps/client/src/gift.ts`, `apps/client/src/hud/shell.ts` |

---

## Ready-to-apply doc changes (blocked by the sandbox)

The phase's write permission covers `README.md`, `docs/**`, the code paths and this
evidence folder. Every write to `conductor/product.md` and `conductor/tech-stack.md`
was refused with `Permission denied: edit` (the rule is path-based on `conductor/`,
not on the file's content — a probe file at `conductor/.phase4-probe.md` was refused
too, while the same probe under `docs/` and under this folder was accepted). The text
below is final and needs no decisions; it only needs to be pasted.

### `conductor/product.md` — three edits

**1. Core Loop — add a fifth step** (after the "Legacy phase" item, before
`## Key Systems`):

```markdown
5. **The ranch and the stable**: the player owns several pets, but only one
   partner lives in the ranch at a time; every other pet waits in the stable,
   frozen until it is brought forward. A tournament reward now joins that
   collection instead of replacing the partner already in the ranch.
```

**2. Key Systems — the Acquisition bullet.** Replace:

```markdown
- **Acquisition**: Fire/Water/Plant starter choice; new creatures via breeding
  retired pairs and tournament reward eggs.
```

with:

```markdown
- **Acquisition**: Fire/Water/Plant starter choice; new creatures via breeding
  retired pairs and tournament reward eggs. The ranch holds one partner at a
  time; every other pet the player owns waits in the stable, frozen, and any
  of them can be brought forward when the player wants it.
```

**3. Roadmap → Phase 3 — the roster / electric line item, which also closes the
known issue.** Replace:

```markdown
- Roster to 20-40 species across 6 types; rare tournament reward eggs.
  *(Started 2026-10-21: the first reward line — the Electric storm hound — is
  granted once at Silver as a pure gift egg, raised through the same
  three-stage, two-branch life as the starters, and joins generated rival
  fields from Silver up. The remaining five types and the wider roster are
  still open.)*
```

with:

```markdown
- Roster to 20-40 species across 6 types; rare tournament reward eggs.
  *(Started 2026-10-21: the first reward line — the Electric storm hound — is
  granted once at Silver as a pure gift egg, raised through the same
  three-stage, two-branch life as the starters, and joins generated rival
  fields from Silver up. **Landed 2026-10-22: the ranch keeps one partner at
  a time and every other pet the player owns waits in the stable**, so the
  Storm Gift now *joins* the collection instead of replacing the pet you
  already have — this closes the known issue the Electric storm hound line
  left open ("the Storm Gift takes the pet in the ranch with it"). The
  remaining five types and the wider roster are still open.)*
```

### `conductor/tech-stack.md` — one dated entry

Insert as a new bullet in the `## Client` section, directly after the
`2026-10-21` — **Electric species line** entry (i.e. after its `*Review round 1
(same track):*` paragraph and before `## Quality Gates`), in the house style of the
other dated entries:

```markdown
- `2026-10-22` - **Stable & partner reserve** (`20261022-stable-partner-reserve`): the
  ranch keeps one partner and every other pet the player owns waits in the stable.
  Two linear save steps: v23 adds `ageDays` to the creature (the pet's own age — the
  world day used to be the effective age) with a v22→v23 migration that stamps the
  world day on the active pet, and v24 adds `state.stable` with a v23→v24 migration
  that stamps an empty stable. The growth gates (juvenile, champion, graduation) read
  the pet's own age, and only the active pet is settled at night, so a pet waiting in
  the stable neither ages nor decays. The sim seams are pure and consume no RNG:
  `packages/sim/src/stable.ts` (`sendToStable` / `bringToRanch` — free, instant,
  lossless, refused during a live cup by the day-phase lock), `graduateFromStable`
  in `legacy.ts`, and the gift hatch that installs the hound in the stable and leaves
  the ranch pet in place. The client gained the Stable chip and modal
  (`apps/client/src/stable.ts`), an age row in the partner-details modal, a gift card
  that says the hound waits in the stable, and a graduation screen that offers the
  waiting pets as successors. No new dependency; no new voxel artifacts; the
  determinism gate still hashes twelve creature GLBs, all byte-identical. Gate on the
  branch head: `bun run check` clean (voxel 71, sim 102, client 308 files), 2,307 tests
  pass / 1 skip / 0 fail across 173 files, `biome check` clean on 502 files,
  `bun run build` green, and the visual pass re-run at 1440×900 and 393×852 with a
  clean console.
```

---

## Deviations

None. Every file this phase wrote is inside the brief's `Touches`; the only other
writes were this evidence file and the two empty probe files noted below.

---

## Notes

- **Two doc files are still open** (`conductor/product.md`, `conductor/tech-stack.md`).
  The text is ready to paste above; the primary owns those files. If the phase
  permission is widened later, re-run the phase as a two-minute follow-up.
- **`docs/save-schema.md` needed no edit** — Phases 1 and 2 already wrote it
  correctly, and it matches the code on every point the brief lists. Two
  *pre-existing* gaps were noticed while checking it and deliberately left alone
  (out of this track's scope): the `Creature` table in the save schema does not list
  the persisted `element` and `bondedToday` fields.
- **Two empty stray files** were left behind by the permission probe and could not be
  deleted (this shell has no file-delete command and `git clean` is out of bounds):
  `docs/.phase4-probe.md` and
  `conductor/tracks/20261022-stable-partner-reserve/verification/.probe.md`. Both are
  0 bytes and untracked — please delete them before the phase is squashed.
- **The dev server is no longer running.** The visual pass used `bun run dev --port
  5199 --strictPort` (Vite 8.3.4) on `http://localhost:5199`; that background process
  has since exited (the Vite script exited with code 255 when its shell was reaped),
  so nothing is listening on 5199 now and a reviewer can start their own with
  `bun run dev --port 5199 --strictPort`.
- **The code and the docs agreed everywhere.** The only doc/code disagreement found
  in this phase was in `README.md` itself, and it was fixed here: the release
  checklist still told a reader to test the v19 → v20 migration, and the Storm Gift
  was still described as a replacement ("hatched into a fourth line"). Both are
  corrected above. The old "the gift takes your pet" behaviour recorded in the
  archived Electric species line PR is now closed by the stable.
- `docs/save-schema.md`, `README.md` and the two Conductor documents are the whole of
  FR-13; the gate, the client module cap (NFR-1), the determinism gate over the 12
  creature GLBs (NFR-2), the re-pinned evolution goldens (NFR-4), the stable surface's
  keyboard/ARIA/44 px behaviour (NFR-5, re-proven by the visual pass) and the
  artifact-free change set (NFR-6) are all covered by the runs above.

## Primary verification

Run by the primary agent, independently of the phase report.

| Check | Command | Exit | Result |
|---|---|---|---|
| Working tree | git status --porcelain | 0 | clean apart from the two doc files the phase could not write |
| Files vs Touches | git diff --name-only 2350747..HEAD | — | README.md and this evidence file inside Touches; the two 0-byte probe files the phase left behind were deleted by the primary |
| Static (types) | un run check (step of un run verify) | 0 | voxel 71 files, sim 102 files, client 308 files — no type errors |
| Unit | un test (step of un run verify) | 0 | 2,307 pass / 1 skip / 0 fail across 173 files |
| Lint (format) | iome check (step of un run verify) | 0 | 502 files, no fixes applied |
| Assets | un run gate:determinism (step of un run verify) | 0 | 12 creature GLBs regenerated byte-identical + 5 props' digests match |
| **Gate** | un run verify | **0** | all four layers green on the branch head |
| Build | un run build | 0 | 250 modules, 868.83 kB / gzip 237.02 kB — only the pre-existing chunk-size warning |

**The two blocked doc changes were applied by the primary**, from the phase's
own ready-to-apply text, verbatim apart from the two arrow characters the
phase's console had dropped (22 → v23, 23 → v24):

- conductor/product.md — a fifth Core Loop step (the ranch and the stable),
  the Acquisition bullet (the ranch holds one partner; the rest wait in the
  stable), and the roadmap item now records that the Storm Gift *joins* the
  collection instead of replacing the pet — the electric line's known issue,
  closed in the product's own language.
- conductor/tech-stack.md — the dated 2026-10-22 entry in the house style:
  the two save steps (v23 age, v24 stable), the pure seams, the client surfaces,
  and the gate result.

**Truth check on the docs** (the code wins; a disagreement is fixed in the doc):

- README.md now says the gift "adds a fourth line to your collection" and
  "waits in the stable rather than taking your ranch pet's place" — the old
  replacement wording is gone, and the release checklist targets the v23 → v24
  migration instead of the stale v19 → v20 line.
- docs/save-schema.md was re-read against schema.ts, migrate.ts and
  storage.ts: the header says v24, the stable and geDays fields are
  documented with their migration rules, and the validation section carries the
  v23 and v24 rules. It is true as it stands.
- Two *pre-existing* gaps were noticed and deliberately left alone (outside this
  track): the Creature table in the save schema omits the persisted lement
  and ondedToday fields. Recorded as a documentation debt, not a behaviour
  bug.

**Visual pass** — re-run unchanged on the head commit: 8 flows, 102 assertions,
0 failures, console clean at every step, at 1440x900 and 393x852; the 18
captures in .conductor/evidence/phase-3/shots/ were re-taken at the head.

Verdict: **verified** — the phase's goal (the docs match the delivered
behaviour, the full gate is green) is met, with the two blocked files closed by
the primary from the phase's own text.