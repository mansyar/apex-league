# Phase 5 verification — Form in the Fight Surfaces, Handbook and Docs Sync

- **Track:** `20261020-training-programs-form`
- **Phase:** 5 of 5 — form in the fight surfaces, handbook, docs sync (FR-14, FR-15, AC-10)
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-training-programs-form`
- **Phase base:** `0380bb08ba32aa5ea3cbc3b63a4bdbc4f8d989af`
- **Code head:** `92bebfa` (three task commits: `dec6bb0`, `bb8090d`, `92bebfa`)
- **Result:** **blocked** — all phase code and tests are in and green (types clean,
  1917 pass / 1 skip / 0 fail, build clean), but `bun run verify` exits 1 on a
  pre-existing, primary-owned formatter error in
  `conductor/tracks/20261020-training-programs-form/metadata.json` (committed with
  CRLF, `i/crlf w/crlf`), and the two `conductor/` docs edits are rejected by the
  subagent's write permissions. Both need the primary.

## Commands

| Command | Exit | Summary |
| --- | --- | --- |
| `bun run verify` | 1 | `bun run check` clean — `@apex/voxel` 62 files, `@apex/sim` 86, `@apex/client` 297, no type errors. `bun test --check --parallel` — **1917 pass, 1 skip, 0 fail**, 85,328 `expect()` calls, 1918 tests across 149 files (29.66 s). `biome check` — 465 files, scans my files clean; **1 error + 7 warnings**, all outside this phase: the error is `conductor/tracks/20261020-training-programs-form/metadata.json format` (biome wants LF, file is CRLF), the 7 warnings are the pre-existing `noNonNullAssertion` warnings in `cup/view-models.test.ts` (190, 233, 268), `scene-logic/play.test.ts` (57) and `scene-logic/treat.test.ts` (53, 53, 97). Because biome failed, `bun run gate:determinism` did not run in this invocation. |
| `bun run build` | 0 | vite v8.3.4, 241 modules transformed, `dist/index.html` 2.13 kB (0.94 kB gzip), `dist/assets/index-*.css` 59.98 kB (11.67 kB gzip), `dist/assets/index-*.js` 834.94 kB (228.28 kB gzip), 564 ms. Only the standard >500 kB chunk warning. |

The RED step is not caused by this phase: `metadata.json` is unmodified by the
phase (no entry in `git status`), its committed blob is itself CRLF, and the
brief forbids the subagent from editing that file. Fixing it is a one-line
reformat of a Conductor state file owned by the primary.
`bun run gate:determinism` was green in phase 3 and nothing in phase 5 touches
the sim, so determinism is unaffected; it was simply not reached here.

## Module sizes (NFR-4, cap 12,288 B)

Measured from the working tree at the reported run (all files are LF, so bytes
equal blob sizes), via a temporary diagnostic in `module-size.test.ts` that was
removed before the reported run — the guard itself passes (`capReport` returns
null for the whole tree).

| File | Bytes | Headroom | Change |
| --- | --- | --- | --- |
| `apps/client/src/hud/update.ts` | 11,864 | 424 | +177 — paints the form chip |
| `apps/client/src/handbook.test.ts` | 9,724 | 2,564 | +4,000 — Raising-page tests (test file, outside the cap) |
| `apps/client/src/hud/plates-creature.ts` | 7,781 | 4,507 | +874 — chip element + `paintFormChip` |
| `apps/client/src/cup/coach-room.ts` | 7,653 | 4,635 | +1,266 — `battleStats` + form row |
| `apps/client/src/handbook.ts` | 3,404 | 8,884 | −8,414 — now a thin barrel (tabs + modal shell) |
| `apps/client/src/handbook/chart.ts` | 3,297 | 8,991 | new |
| `apps/client/src/handbook/raising.ts` | 2,953 | 9,335 | new |
| `apps/client/src/spar/setup.ts` | 3,220 | 9,068 | +521 — `battleStats` + form line |
| `apps/client/src/handbook/moves.ts` | 2,183 | 10,105 | new |
| `apps/client/src/handbook/common.ts` | 1,734 | 10,554 | new |
| `apps/client/src/handbook/ladder.ts` | 1,021 | 11,267 | new |

Stylesheets are not modules (the cap guard walks `.ts/.tsx/.mts` only); listed
for the record: `ranch.css` 29,173 B, `cup.css` 24,869 B, `spar.css` 8,360 B.

`hud/update.ts` is the only module within 500 B of the cap; the next HUD change
there should split first.

## Acceptance criteria (AC-10)

| Surface | State | Evidence |
| --- | --- | --- |
| Dock program picker (FR-12) | verified in phase 4 | phase-4 evidence, commit `c69f9cf` |
| Training tab (FR-13) | verified in phase 4 | phase-4 evidence, commit `c69f9cf` |
| Coach room form line (FR-14) | implemented, tests green | `.cup-form` block after the four owned stat rows: tier chip + `FORM_COPY[tier].line`, plus the sickness sentence for a sluggish partner under 80 health; owned stats now read `battleStats` |
| Spar prep form line (FR-14) | implemented, tests green | `.spar-form` under the owned card's `battleStats` line; rival card untouched and form-neutral |
| Creature plate form chip (FR-14) | implemented, tests green | `.creature-form` chip stacked under the stage chip; text is the tier, `title`/`aria-label` are `"Sharp: +1 ATK"` form; form is never carried by colour alone (NFR-5) |
| Desktop screenshot of all five surfaces | **primary** | — |
| 393×659 re-measure (no clipping) | **primary** | plate keeps its 300 px width; the chip stack is ~34 px tall inside the 40 px crest row, so the collapsed plate does not grow. `.cup-form` and `.spar-form` wrap under the stat rows |
| Keyboard-only pass | **primary** | chip is not focusable (read-only readout); tab order unchanged |

## Coverage

**FR-14** — coach room: `effectiveStats` replaced by `battleStats`, so the
displayed ATK is the fight's ATK; the form row uses `FORM_COPY` for both the
tier label and the plain-language line, and `FORM_SICK_NOTE` for the pinned
case. Spar prep: owned line uses `battleStats`, plus one `.spar-form` line
`"<Tier> — <line>"`; the rival line stays `statLine(setup.rivalSide.stats)` with
no form mention, matching FR-10 (form never changes rival generation). Plate:
new `.creature-form` chip on the existing chip row, `paintFormChip()` sets
`textContent = FORM_COPY[tier].label` and `title`/`aria-label` to
`` `${label}: ${formDeltaLine(tier)}` `` (`formDeltaLine` from `hud/copy-care`,
`FORM_DELTAS` under the hood), so the consequence survives greyscale and screen
readers.

**FR-15** — the Raising tab (no fifth tab; tab order still Type chart / Ladder
rules / Moves / Raising) gains three headed groups built entirely from sim data:
programs (one `.handbook-rule` per `TRAINING_PROGRAMS` entry: catalog label,
catalog blurb, then `${primary} +1 a paying night; ${trickle} +1 on
breakthrough nights`), the energy gate (10 energy per paying night, 30 energy
before recovery, sick/starving pays and costs nothing), breakthrough nights
(every third trained night, both stats capped at +6), and form (mood/bond/health,
ATK only, all four `FORM_COPY` tier lines verbatim, and the under-80-health
Sluggish pin). Every added sentence is one or two sentences, stats are spelled
in caps, and no line claims anything the sim does not do.

**NFR-4** — the handbook crossed 12,288 B, so it was split into
`handbook/{common,chart,ladder,moves,raising}.ts` with `handbook.ts` as a thin
barrel (3,404 B); every module is under the cap.

**NFR-5** — form is always a word plus a spelled-out stat delta; the new chips
and rows use kit colours only (`--accent`, `--kit-keyline`, `--ink-dim`).

## Tests added

`apps/client/src/handbook.test.ts` — `describe("the handbook's Raising page")`:
the four program labels appear, the blurb text is quoted from the catalog, the
energy gate and cap and sickness pin are spelled with the sim's own constants,
every `FORM_COPY` label and line appears, and every `.handbook-tip` /
`.handbook-rule-copy` node is at most two sentences with no lowercase
`atk|hp|def|spd`. The existing tab-order and keyboard tests are unchanged and
still green.

## Deviations

| File | Reason |
| --- | --- |
| `apps/client/src/ranch.css` | the form chip needs a `.creature-chips` column so the plate does not grow at 393×659. CSS only; no colour outside the kit |
| `apps/client/src/hud/update.ts` | the chip is painted from the HUD update pass (destructure `formChip`, call `paintFormChip`). Required to keep the plate a pure builder |
| `.conductor/evidence/phase-5-docs-sync.md` | the tech-stack and product.md patches could not be applied: writes under `conductor/` are rejected by the subagent permission layer (three attempts, `Permission denied: edit`). Patch text is staged there verbatim for the primary |
| `README.md` | applied as briefed — status paragraph now says four programs shape the cycle and form moves ATK in every fight; Phase 1 roadmap row lists programs, breakthrough nights and derived form |

## Notes for the primary

1. `bun run verify` is red only on
   `conductor/tracks/20261020-training-programs-form/metadata.json` (CRLF vs
   biome's LF). Re-save it with LF and rerun; no code change should be needed.
   The determinism gate will then run.
2. Apply `.conductor/evidence/phase-5-docs-sync.md` to `conductor/tech-stack.md`
   (dated note before `## Quality Gates`) and `conductor/product.md` (Phase 2
   landed line). Both are status-only; no product intent changes.
3. `README.md` is already committed (`92bebfa`).
4. Phase-5 copy is deliberately sim-quoted: `FORM_COPY[...].line` for every tier
   sentence in the coach room, spar card and handbook, so the dock (phase 4),
   coach, spar and handbook cannot drift apart.
5. `hud/update.ts` (11,864 B) is the next module to watch; split before adding
   more to the update pass.

## Primary verification
## Primary verification

Run by the primary after the subagent's blocked report, on branch
`feat/20261020-training-programs-form` (base `0380bb0`).

| Check | Who | Result |
| --- | --- | --- |
| `bun run verify` | primary | exit 0 - 1917 pass / 1 skip / 0 fail across 149 files, 7 pre-existing `noNonNullAssertion` warnings, determinism gate byte-identical |
| `bun run build` | primary | exit 0 - 241 modules, JS 834.94 kB (228.28 kB gzip), CSS 59.98 kB (11.67 kB gzip) |
| Desktop: coach room, spar prep, plate chip, handbook Raising | primary | pass - `.conductor/evidence/phase-5/coach-room-desktop.png`, `spar-desktop.png`, `handbook-desktop.png` |
| 393x659: handbook Raising, plate chip | primary | pass - `handbook-narrow.png` (panel scrolls internally, 1094 / 408), `plate-narrow.png` (chip column ends at x 335 of 393) |
| Keyboard only | primary | pass - Arrow key moves the detail-modal tablist and the picker's roving tabindex leaves exactly one radio at `tabIndex 0`; Escape closes the handbook and folds the picker |

### Findings fixed during verification

1. **Handbook program rows repeated the trickle clause.** Each row read
   "Heavy sets build ATK, with DEF on breakthrough nights. ATK +1 a paying
   night; DEF +1 on breakthrough nights." The closing clause now reads only
   "ATK +1 a paying night." — the blurb still names the trickle stat and the
   Breakthrough section states the cadence and the +1.
   `handbook.test.ts` still asserts every blurb appears, so no test changed.
2. **Coach room form block collapsed into a narrow column.** `.cup-form` was a
   two-column grid (`auto 1fr`), so the consequence sentence wrapped into a
   ~70px strip beside the tier chip. It is now a flex column: the chip hugs its
   word and both sentences use the full card width. Verified against a real
   quarterfinal coaching room with a sick, pinned partner.
3. **`metadata.json` was committed with CRLF.** Normalised to LF with a
   trailing newline; this was the only thing keeping `biome check` red.

### Documents applied by the primary

`.conductor/evidence/phase-5-docs-sync.md` was applied verbatim:
`conductor/tech-stack.md` gained the dated `2026-10-20` note before
`## Quality Gates`, `conductor/product.md` gained the Phase 2 landed line.

### Squash

All phase commits are squashed into one `feat(client)` commit plus one
`docs(conductor)` evidence commit; the tree is unchanged.
