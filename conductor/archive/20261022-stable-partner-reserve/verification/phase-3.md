# Phase 3 — Client Surfaces (verified)

| | |
|---|---|
| **Track** | 20261022-stable-partner-reserve — Stable & Partner Reserve |
| **Phase** | 3 — Client Surfaces |
| **Date** | 2026-10-22 |
| **Branch** | `feat/20261022-stable-partner-reserve` |
| **Base** | `b5b2944` (conductor: Mark phase 'Client Surfaces' as in progress) |
| **Head** | `a5fb48a` |

**Head commits**

| Commit | What |
|---|---|
| `940c172` | fix(client): the growth hints read the pet's own age, not the world day |
| `d0ccd11` | feat(client): the stable surface — the chip, the waiting pets and the swap |
| `7288a6a` | feat(client): the partner details read the pet's own age |
| `083f474` | feat(client): the gift card and the graduation screen speak about the stable |
| `d1e76c9` | test(client): the graduation names the pet waiting in the stable as a successor |
| `a5fb48a` | fix(client): a waiting pet's row no longer repeats the species its own name already says (the review fix) |

**Result** — **verified.** The player sees the stable, swaps from it, reads each
pet's age, and the gift card no longer implies a replacement. `bun run check`
and `bun test --timeout 120000` are green, `biome check` is clean, the client
builds, and the visual pass drives every surface in a real browser at 1440x900
and 393x852 with a clean console (102 assertions).

---

## What changed

### The stable surface (FR-9, FR-2)

- **New module `apps/client/src/stable.ts` (10,598 B)** — the whole stable
  surface lives here so no existing module grows past the cap:
  - `stableChipVisible(state)` — the chip shows only while the stable holds a
    pet, the same rule the gift chip follows.
  - `buildStableChip(onOpen)` / `syncStableChip(button, state)` — a `dim` chip
    labelled **Stable** with the class `stable-chip`, folded with
    `style.display` (not the `hidden` attribute: the chip's own `display` rule
    outranks `hidden`, the same trap the gift chip documents).
  - `buildStableModal(options)` — a `kit-modal` / `kit-plate` / `kit-modal-box`
    modal (role=dialog, aria-modal, aria-label "Stable") with a focus trap,
    Escape and backdrop close, and the focus restored to the chip that opened
    it.
  - The listing: every waiting pet with its crest, name, stage and **its own
    age**, plus a **Bring to the ranch** action per pet
    (`aria-label="Bring <name> to the ranch"`). The species joins the meta
    line only when the pet's own name does not already say it (see *The review
    fix* below).
  - The empty state: `STABLE_EMPTY_COPY` — *"No pets in the stable yet — every
    pet you own but the one in the ranch waits here."* An empty stable is never
    a blank panel.
- **The chip sits beside Settings/Handbook** — `hud/shell.ts` appends it to
  the same `.hud-motion` cluster as the gift chip, and the modal root joins the
  HUD stack.
- **The swap** — `hud/types.ts` carries `HudShellHandlers.onBringToRanch`,
  `app/hud-screen.ts` calls the sim's `bringToRanch(store.get(), creatureId)`,
  commits the result, calls `sceneSync.syncScene()` (the ranch scene rebuilds)
  and returns the refusal reason. The modal then closes and the focus lands on
  the partner plate (`.creature-head`) — the same contract the gift hatch
  uses. The swap is free, instant and lossless because it is the Phase 2 sim
  seam doing the work; the client only composes it.
- **`hud.ts` syncs the chip** in the paint pass, right after `syncGiftChip` —
  every store commit re-paints, so the chip always reflects the stable's
  current contents.

### The refusal reads as coaching (FR-10)

`stableRefusalCopy(reason)` turns every sim refusal into words; the
day-phase lock says *"The swap waits until the cup is done — the ranch stays
as it is for now."* The modal stays open and the line is published through a
`role="status"` note — never a silent no-op, never a dead button.

### The age readout (FR-6)

- **Partner details** — an **Age** row directly beside the **Stage** row in
  the context list, reading `creature.ageDays` through the shared
  `ageLabel()` ("1 day" / "12 days").
- **The stable modal** — each waiting pet carries its own age in the meta
  line.
- **The hint copy now reads the pet's age, not the world day** —
  `growthHint(creature)`, `graduationHint(creature)` and `branchPath(creature)`
  read `creature.ageDays` (save v23), so `EVOLUTION_HINT_DAY` (5),
  `CHAMPION_HINT_DAY` (20) and `GRADUATION_HINT_DAY` (55) mean what they say.
  The `day` parameter fell out of `statusLine` as well.

### The gift card (FR-7)

The card no longer implies a replacement. The note reads *"Hatching sends the
hound to the stable — Ember Drake keeps the ranch, and the hound's career
starts when you bring it forward."* The false "retires X to the Hall of Fame"
line is gone, and the stat preview is now labelled *"The stats it hatches
with"* so it reads as what it is. The hatch button still hatches (into the
stable) and the gift chip still folds away once the egg is hatched — the
browser pass asserts both.

### The graduation screen (FR-8)

The egg screen now offers **two kinds of successor** in two honest groups:
**From your stable** (the pets the player already owns, each with crest, name,
stage and age, badged *In the stable*) and **A new hatch** (the starter species
with their inherited floors). Picking a waiting pet calls the sim's
`graduateFromStable`, so the retiree is archived to the Hall as before and the
ranch goes to the pet that was waiting.

### The review fix — a row never repeats itself

The review caught a stutter in the two new surfaces: a pet's default name **is**
its species display name, so the meta line read *"Storm Hound"* under a title
that already said *"Storm Hound"*.

- **The decision is pure** — `stableRow()` in `apps/client/src/stable.ts` now
  decides the species for itself: `species` is `null` when the species display
  name already says what the pet's own name says (case-insensitively, so a
  name that merely matches reads cleanly too), and the species string when it
  still adds something ("Rolo" keeps *"Tide Axolotl"*).
- **The line is built once** — the new pure `stableMeta(row)` joins the parts
  ("Tide Axolotl · Baby · 9 days" / "Baby · 9 days"), and the graduation card
  consumes it instead of re-deriving the line itself.
- **The stable modal** keeps its layout (three meta spans); the species span
  simply does not appear when the name says it.
- **Unit tests** (`stable.test.ts`) cover both cases: an unrenamed pet (no
  species in the meta) and a renamed pet (species kept), plus the
  case-insensitive match and the gift species.
- **The browser pass** covers both cases too: the unrenamed hound and axolotl
  in the stable modal and on the graduation cards, and a renamed pet ("Rolo")
  in a new flow.

Nothing else moved: the copy, the layout, the two graduation groups, the swap,
the age readout and the refusals are as they were.

---

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Types | `bun run check` | 0 | voxel 71 files, sim 102 files, client 308 files — no type errors |
| Tests | `bun test --timeout 120000` | 0 | **2307 pass, 1 skip, 0 fail** — 90,695 expect() calls, 173 files, 243.66 s |
| Lint/format | `biome check` | 0 | 502 files, no fixes applied |
| Build | `bun run build` | 0 | 250 modules, `dist/assets/index-CzUx-dp5.js` 868.83 kB (gzip 237.02 kB) — the pre-existing chunk-size warning only |
| Fixtures | `bun test --timeout 120000 ./.conductor/evidence/phase-3/stable-save.ts` | 0 | 5 tests — builds `stable-save.json`, `renamed-save.json`, `gift-save.json`, `cup-save.json`, `graduate-save.json` with the sim's own API |
| Visual pass | `bun test --timeout 120000 ./.conductor/evidence/phase-3/stable-visual-pass.ts` | 0 | 8 flows, **102 assertions**, desktop 1440x900 + iPhone 15 393x852, clean console |

The phase gate `bun run check && bun test --timeout 120000` is green on
`a5fb48a`.

---

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| **FR-2** | Exactly one pet active at a time; a stashed pet never competes | The client composes the swap with the sim seam (`bringToRanch` files the outgoing pet at the end of the stable); browser: *"the modal lists the other pet and the outgoing one"* | pass |
| **FR-6** | Age shown where the player reads a pet's facts: partner-details modal carries an age row beside the stage; stable modal shows each stashed pet's age | `creature-detail.ts` (Age row after the Stage row) + `stable.ts` (the per-pet meta line); unit: `creature-detail.test.ts` *"the context list carries the pet's own age beside the stage"*; browser: *"the partner details carry the pet's own age"* and *"the first pet reads its age"* | pass |
| **FR-7** | Storm Gift hatches into the stable; ranch pet untouched; never a replacement | `gift.ts` copy rewritten; browser: *"the gift card says the hound waits in the stable"*, *"the ranch pet stays after the hatch"*, *"the hound waits in the stable"*, *"the gift chip disappears once hatched"* | pass |
| **FR-8** | At graduation the successor may be a stashed pet; a graduation never strands a pet; the retired pet is archived as today | `graduation/egg.ts` (the *From your stable* group) + `app/screens.ts` (`graduateFromStable`); browser: *"the stable group is offered"*, *"the ranch goes to the pet the player already has"*; unit: `graduation.test.ts` *"a pet waiting in the stable is a successor the player already has"* | pass |
| **FR-9** | Stable surface = ranch chip plus a modal listing every stashed pet (crest, name, species, stage, age) with a *Bring to the ranch* action; an empty stable has an empty state; the ranch scene rebuilds after a swap | `stable.ts` (chip + modal + `STABLE_EMPTY_COPY`); browser: *"the stable chip is visible"*, *"the modal lists two pets"*, *"the first pet carries a crest"*, *"the first pet reads its stage/age"*, *"the first pet does not repeat its species"*, *"the partner plate reads the hound"* after the swap | pass |
| **FR-10** | A swap is refused during a live cup or spar with coaching copy, never a silent no-op | `stableRefusalCopy`; browser: *"the refusal reads as coaching"*, *"the modal stays open"*, *"the ranch pet is untouched"* | pass |
| **NFR-1** | Every client module ≤ 12,288 B | Module-size probe: the largest client module is `hud/update.ts` at **12,263 B**; the new `stable.ts` is 10,598 B; `module-size.test.ts` green in the full run | pass |
| **NFR-5** | The stable surface follows the product guidelines: keyboard reachable, focus restored on close, ARIA-labelled, 44 px targets, meaning never carried by colour alone | The modal is a `role="dialog"` / `aria-modal` / `aria-label="Stable"` plate with a focus trap; Escape and backdrop close; the focus returns to the chip that opened it and to the partner plate after a swap; the crest carries the element and every row names its stage and age in words (and its species whenever the pet's own name does not say it); browser: *"the modal takes the keyboard"*, *"the focus lands on the partner plate"*, *"Escape returns the focus to the chip"* | pass |
| **AC-1** | The Storm Gift hatches into the stable and the ranch pet stays — browser-verified at desktop and iPhone 15 widths with a clean console | The gift flow passes at 1440x900 and 393x852, console clean in both | pass |
| **AC-5** | The partner-details shows the active pet's age; the stable modal shows each stashed pet's age | Unit + browser assertions above | pass |
| **AC-7** | The stable chip opens the stable modal, lists the stashed pets, a swap rebuilds the ranch; desktop and iPhone 15 visual passes clean | The stable flow passes at both widths, console clean in both | pass |

---

## Tasks

| Task | Status | Commit | What |
|---|---|---|---|
| **P3.T1** T1.1 — the chip beside Settings/Handbook opens a modal listing the stashed pets (crest, name, species, stage, age) with an empty state | done | `d0ccd11`, `a5fb48a` | `stable.ts` (chip + modal + `STABLE_EMPTY_COPY` + the row's own line), `hud/shell.ts`, `hud/types.ts`, `hud.ts` (chip sync), `ranch.css` (the plate and the phone tier) |
| **P3.T1** T1.2 — *Bring to the ranch* commits the swap, rebuilds the ranch scene and restores the focus to the partner plate | done | `d0ccd11` | `app/hud-screen.ts` (`bringToRanch` → commit → `sceneSync.syncScene()`), `stable.ts` (the action closes the modal, `onSwapped` focuses `.creature-head`) |
| **P3.T2** T2.1 — the partner-details modal carries an age row beside the stage | done | `7288a6a` | `creature-detail.ts` + `creature-detail.test.ts` (the context list grows from 6 rows to 7) |
| **P3.T3** T3.1 — the gift card says the hound goes to the stable and the hatch leaves the ranch pet in place | done | `083f474` | `gift.ts` (the note, the stat caption) + `gift.test.ts` |
| **P3.T3** T3.2 — the graduation egg screen offers the stashed pets as successors | done | `083f474`, `d1e76c9`, `a5fb48a` | `graduation/egg.ts` (the *From your stable* group, the shared meta line), `graduation/flow.ts`, `graduation/types.ts`, `app/screens.ts` (`graduateFromStable`), `graduation.test.ts` |
| **P3.T4** — the swap refusal reads as coaching, not a dead button | done | `d0ccd11` | `stableRefusalCopy` + the `role="status"` note in the modal |

The hint copy that reads the pet's own age (`growthHint`, `graduationHint`,
`branchPath`, `statusLine`) landed with `940c172` — it is the same age readout
FR-6 asks for, on the surfaces that coach the player.

---

## The visual pass

**How it was driven.** `bun run dev` (vite 8.3.4) on `http://localhost:5199`,
driven with Playwright's bundled Chromium (imported by absolute file URL — no
new project dependency, no new dep in the repo). The fixtures are built with
the **sim's own API** in `.conductor/evidence/phase-3/stable-save.ts`
(`chooseStarter`, `advanceDay`, `evolveCreature`, `applyStormGift`,
`hatchGiftEgg`, `bringToRanch`, `renameCreature`, `createGiftEgg`, `saveGame`)
and injected into `localStorage["apex.save"]` — no hand-edited JSON.

**Fixtures**

| File | What it holds |
|---|---|
| `stable-save.json` | The ranch holds the starter (Ember Drake, 9 days); the stable holds the Storm Hound (1 day) and a Tide Axolotl (9 days) |
| `renamed-save.json` | The same stable, but the waiting axolotl has been renamed **Rolo** (the sim's own `renameCreature` seam) |
| `gift-save.json` | A pending Storm Gift with an empty stable |
| `cup-save.json` | The same stable during a live cup (the day-phase lock) |
| `graduate-save.json` | A champion past its own sixtieth day with two pets waiting |

**Flow 1 — the stable surface (desktop + iPhone 15, 25 assertions each)**
the stable chip is visible; the gift chip stays hidden; the partner plate reads
the starter; **the partner details carry the pet's own age**; the stable modal
opens; the modal lists two pets; the first pet is the Storm Hound; the first
pet carries a crest; the first pet reads its stage and its age; **the first pet
does not repeat its species**; **the first pet's meta reads stage and age
only**; the second pet is the Tide Axolotl and reads its stage and age; the
second pet does not repeat its species; the modal takes the keyboard; the swap
closes the modal; **the partner plate reads the hound**; **the focus lands on
the partner plate**; the stable chip still reads the new contents; the modal
lists the other pet and the outgoing one; the waiting pets keep their own ages;
Escape returns the focus to the chip; the console is clean.

**Flow 2 — the gift card (desktop + iPhone 15, 11 assertions each)**
the gift chip is visible; the stable chip stays hidden while the stable is
empty; the gift card says the hound waits in the stable; the gift card says
the ranch pet stays; the gift card drops the Hall of Fame line; the gift card
still previews the stats; **the ranch pet stays after the hatch**; the gift
chip disappears once hatched; the stable chip appears with the hound; the hound
waits in the stable; the console is clean.

**Flow 3 — the cup refusal (desktop, 5 assertions)**
the stable chip is visible; **the refusal reads as coaching**; the modal stays
open; the ranch pet is untouched; the console is clean.

**Flow 4 — the graduation egg screen (desktop + iPhone 15, 10 assertions each)**
the dock offers the Graduate chip; the confirm modal names the retiree; the
stable group is offered; the stable group lists the waiting pets; the stable
group names the Storm Hound; the stable card reads stage and age; **the stable
card does not repeat the species it already names**; the starter species are
still offered; **the ranch goes to the pet the player already has**; the console
is clean.

**Flow 5 — a renamed pet (desktop, 5 assertions)**
the stable lists two pets; the waiting pet is **Rolo**; **the renamed pet keeps
its species**; **the renamed pet's meta reads species, stage and age**; the
console is clean.

**102 assertions passed, 0 failed, console clean in every flow.**

**Screenshots** (`.conductor/evidence/phase-3/shots/`)

| Shot | What it shows |
|---|---|
| `desktop-2-stable-modal.png` | The stable modal on the ranch: the Storm Hound and the Tide Axolotl, each with crest, name, stage, age and a *Bring to the ranch* action — the meta line never repeats the name |
| `iphone-2-stable-modal.png` | The same modal at 393x852 — the chip cluster stacks, each row puts the action under the pet |
| `desktop-3-after-swap.png` | The partner plate after the swap |
| `desktop-4-stable-after-swap.png` | The modal after the swap: the ranch pet is now the Storm Hound and the stable lists the axolotl and the outgoing drake |
| `desktop-5-gift-card.png` | The gift card: *"The stats it hatches with"*, *"Hatching sends the hound to the stable — Ember Drake keeps the ranch…"* |
| `desktop-7-stable-after-hatch.png` | After the hatch the ranch pet is untouched and the hound waits in the stable |
| `desktop-8-cup-refusal.png` | The cup refusal: *"The swap waits until the cup is done — the ranch stays as it is for now."* |
| `desktop-9-graduation-egg.png` | The egg screen: *From your stable* (the two waiting pets) above *A new hatch* (the starter species) — each waiting pet reads its stage and age, never a repeated species |
| `iphone-9-graduation-egg.png` | The same screen at 393x852 — the groups stack and scroll |
| `desktop-10-stable-renamed.png` | A renamed pet ("Rolo") keeps its species in the meta line |
| `desktop-1-ranch.png`, `desktop-6-after-hatch.png`, `iphone-1-ranch.png`, `iphone-3-after-swap.png`, `iphone-4-stable-after-swap.png`, `iphone-5-gift-card.png`, `iphone-6-after-hatch.png`, `iphone-7-stable-after-hatch.png` | The surrounding ranch states |

---

## Evidence paths

| Path | What |
|---|---|
| `.conductor/evidence/phase-3/stable-save.ts` | The fixture builder (the sim's own API) |
| `.conductor/evidence/phase-3/stable-save.json` | The ranch with a populated stable |
| `.conductor/evidence/phase-3/renamed-save.json` | The same stable with a renamed waiting pet ("Rolo") |
| `.conductor/evidence/phase-3/gift-save.json` | A pending Storm Gift, empty stable |
| `.conductor/evidence/phase-3/cup-save.json` | The stable during a live cup |
| `.conductor/evidence/phase-3/graduate-save.json` | A champion past its own sixtieth day |
| `.conductor/evidence/phase-3/stable-visual-pass.ts` | The Playwright pass (102 assertions) |
| `.conductor/evidence/phase-3/shots/` | 18 screenshots (desktop + iPhone 15) |
| `apps/client/src/stable.ts` | The new stable module |
| `apps/client/src/stable.test.ts` | The unit tests behind the stable's decisions |

---

## Deviations

| File | Reason |
|---|---|
| `apps/client/src/hud.ts` | The brief's Touches glob `apps/client/src/hud/*` covers the `hud/` **directory**; `hud.ts` is a top-level module. The chip must be synced in the paint pass (every store commit re-paints) and `HudHandlers` must carry `onBringToRanch`, so this file had to change. |
| `apps/client/src/growth.ts` | The Growth panel's path reading called `branchPath(creature, state.day)`; the branch hint now reads the pet's own age, so the call had to change (the panel is a top-level module, outside the `hud/*` glob). |
| `apps/client/src/detail/path.ts` | `buildPathSection(creature, day)` forwards the day to `branchPath`; the day argument fell out with the age change. `detail/` is outside the Touches list. |
| `packages/sim/src/index.ts` | `graduateFromStable` / `GraduateFromStableResult` were not exported from the sim barrel, so the client could not reach the FR-8 seam. The package exports only its root, so the barrel was the only door. The sim's behaviour is untouched — the export only. |

No Conductor state was edited: `plan.md`, `spec.md`, `metadata.json`,
`tracks.md`, `conductor/index.md`, the product docs, `review.md` and `pr.md`
are untouched, and the product/tech-stack docs stay with Phase 4.

---

## Notes

- **The empty state is a safety net.** The brief's decision (1) folds the
  chip while the stable holds no pet, so the "no pets yet" panel is not the
  usual way in — it is the promise that the modal is never a blank panel
  (the stable can empty between the chip's paint and a click). The copy is
  there and tested (`STABLE_EMPTY_COPY`).
- **The chip folds with `style.display`, never the `hidden` attribute** — the
  chip's own `display` rule outranks `hidden`, the trap the gift chip
  documents. `syncStableChip` and `syncGiftChip` now behave the same way.
- **The refusal line is published, not painted over**: the note carries
  `role="status"`, so a screen reader hears the refusal.
- **The swap costs nothing** — no AP, no day, no RNG. The client only
  composes the Phase 2 seam; the sim owns the rules.
- **The chip sits in the same cluster as Settings/Handbook**, so the stable is
  reachable in one click from the ranch (product guideline: every screen
  within two clicks).
- **The module cap was never raised.** The new surface went into its own
  module (`stable.ts`, 10,598 B) and the copy changes stayed small. The
  largest client module is still `hud/update.ts` at 12,263 B — 25 B under the
  cap. No file was over the cap, so nothing had to be split.
- **A row never repeats itself** (the review fix). A pet's default name is its
  species display name, so the species only joins the meta line when the
  pet's own name does not already say it. The decision lives in the pure
  layer (`stableRow` + `stableMeta`), both surfaces read it, and the browser
  pass drives both cases (an unrenamed pet and a renamed one).
- **The hint copy (P3's quiet half)** now reads the pet's own age. Before
  this phase `growthHint`, `graduationHint` and `branchPath` still read the
  world day while their constants had already been re-purposed to the pet's
  age in Phase 1 — a day-24 hatch was told it was "ready to become a
  champion" on its first night. Fixed here, with the golden strings in
  `hud/copy.test.ts` re-pinned to the pet's age.
- **The dev server was stopped** after the visual pass.

---

## Primary verification

- Tree clean at `a5fb48a`; six task-level commits, none amended.
- Every changed file is inside the Phase 3 Touches list except the four
  deviations above (`hud.ts`, `growth.ts`, `detail/path.ts`,
  `packages/sim/src/index.ts`).
- The phase gate `bun run check && bun test --timeout 120000` is green on the
  head commit; `biome check` and `bun run build` are clean.
- The determinism gate (`bun run gate:determinism`) is Phase 4's: this phase
  touched no voxel asset and no simulation rule (the only sim change is one
  export line), so the 12 creature GLBs are untouched.

## Primary verification

Run by the primary agent, independently of the phase report.

| Check | Command | Exit | Result |
|---|---|---|---|
| Working tree | `git status --porcelain` | 0 | clean — no uncommitted work outside the phase's commits |
| Files vs Touches | `git diff --name-only b5b2944..HEAD` | — | 28 files, all inside Touches or the four reported deviations (`apps/client/src/hud.ts` — top-level, not matched by the `hud/*` glob; `apps/client/src/growth.ts` — same; `apps/client/src/detail/path.ts` — `detail/` is outside the Touches; `packages/sim/src/index.ts` — one export line, so the client can reach the FR-8 seam) |
| Commits reported | `git log --oneline b5b2944..HEAD` | — | 9 commits, all reported; no merge commit, no foreign commit |
| Static (types) | `bun run check` | 0 | voxel 71 files, sim 100 files, client 308 files — no type errors |
| Lint (format) | `biome check` | 0 | 502 files, no fixes applied |
| Unit | `bun test --timeout 120000` | 0 | 2,307 pass / 1 skip / 0 fail across 173 files |

The captures were read by the primary, not only trusted:

- `desktop-2-stable-modal.png` — the Stable chip sits beside Settings/Handbook;
  the modal reads "Every pet you own but the one in the ranch waits here,
  frozen until you bring it forward", and each waiting pet shows its crest,
  name, stage and **age** with a *Bring to the ranch* action.
- `desktop-5-gift-card.png` — the card now says *"Hatching sends the hound to
  the stable — Ember Drake keeps the ranch, and the hound's career starts when
  you bring it forward"*, and the old Hall-of-Fame line is gone. The reward
  promise the track exists to fix is now what the game says.
- `iphone-9-graduation-egg.png` — two honest groups: *From your stable* (the
  pets you already own, each with its age) and *A new hatch* (the starter
  species, with the inherited floor).

**One polish fix was sent back to the phase agent** after the first review: a
waiting pet's row repeated its own name, because the meta line was
`${species} · ${stage} · ${age}` while the title is the pet's name — and a
pet's default name IS its species display name ("Storm Hound / Storm Hound ·
Baby · 1 day"). The fix puts the decision in the pure layer (`stableRow` sets
`species` to null when the pet's own name already says it, case-insensitively;
`stableMeta` builds the line once) and both surfaces consume it. The
re-captured `desktop-2-stable-modal.png` now reads "Storm Hound / Baby · 1
day", and a renamed pet still shows its species ("Rolo / Tide Axolotl · Baby ·
9 days"). Four unit tests cover the two cases.

Verdict: **verified** — the phase's goal, its acceptance criteria and the
review fix are all satisfied, with the module cap held (the largest client
module is 12,263 B against the 12,288 B cap; `stable.ts` is 10,598 B).
