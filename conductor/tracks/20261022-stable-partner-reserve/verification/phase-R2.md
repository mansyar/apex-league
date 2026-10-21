# Phase R2 — Review Fixes (round 2)

- **Track:** 20261022-stable-partner-reserve — Stable & Partner Reserve
- **Phase:** R2 — Review Fixes (the round-2 re-review's findings)
- **Date:** 2026-10-22
- **Branch:** `feat/20261022-stable-partner-reserve`
- **Base commit:** 7bb9c21
- **Head commit:** 9ef1651 (`fix(client): dress the stable's rename editor in the house kit`); this report rides on top of it
- **Result:** **verified**

## What changed

| Finding | What changed | Files | What pins it |
| --- | --- | --- | --- |
| **N1 (Low)** — the rename editor shipped with no CSS | `.stable-pet-input` now wears the same kit as the ranch's own `.creature-name-input`: the panel background, the ink, the keyline border, the 6 px corners, the inherited font and an accent `:focus-visible` outline. `.stable-pet-name-row` is a flex row with `align-items: center` and the house's 6 px gap, and its Save/Cancel are the house's small kit buttons. The pencil's 44 px inline size is gone: it wears the house's own `rename-button` class (26 px on the desktop, the phone tier's 44 px floor). The editor takes the row while it is open, so it no longer spills over the swap action beside it. | `apps/client/src/ranch.css`, `apps/client/src/stable-rename.ts` | The client test "the pencil on the row is a labelled house icon button" (house class, no inline size); the visual pass's "the field wears the kit panel", "the field has the kit's rounded corners", "the rename control wears the house icon size" (desktop) / "meets the phone tier's 44px floor" (phone), "the editor stays inside the pet row", "the editor does not cover the swap action"; the new editor-open captures |
| **G1 (Low)** — two branches of the editor were unproven | Two client tests: "Enter in the field saves the new name" (a `keydown` with `key: "Enter"` on `.stable-pet-input` commits the new name) and "a refused rename keeps the editor open, focused, and says why" (a handler that refuses with `cup-phase`: the note reads `stableRenameRefusalCopy("cup-phase")`, the editor stays open, and the field takes the keyboard back from the Save button). | `apps/client/src/stable.test.ts` | The two tests themselves (2,321 → 2,323 client-suite tests in the full run) |
| **N2 (Low)** — the stale FR-8 row | Nothing to change: the FR-8 row now reads true and this phase does not touch the graduation path. Confirmed against `packages/sim/src/legacy.ts` (`graduateFromStable`) and `apps/client/src/graduation/egg.ts`, both untouched; the visual pass still proves the graduation group, the offered starter and the ranch's new pet. | — | The visual pass's graduation flow (`desktop`/`iphone`: the dock offers the Graduate chip, the confirm modal names the retiree, the stable group is offered, the ranch goes to the pet the player already has) |
| **The pass itself (N1's visual half)** | The pass now asserts the pencil's size the way the house defines it — 26 px on the desktop, the phone tier's 44 px floor on a phone — instead of pinning 44 px at both widths; it captures the editor open at both widths; and it pins the field's kit styling and the editor's layout. | `.conductor/evidence/phase-3/stable-visual-pass.ts` | 146 → 154 visual assertions, all green at both widths with a clean console |

### The judgement call: the pencil's class

The brief left one choice open — whether the new pencil reuses the house's
`rename-button` class or gets a stable-specific class styled the same way.
**I reused the house's `rename-button` class and dropped the
`stable-pet-rename` class entirely**, so the pencil's markup is
`className = "rename-button"` and nothing in the stylesheet sizes it.

Why this option:

- **The markup stays simplest.** The pencil needed no rule of its own, so
  the stable's editor adds no second definition of the house's icon button.
  A `stable-pet-rename` class would have meant copying `.rename-button`'s
  26 px box, its hover and its 13 px svg rule — the house itself does not
  do that: the active pet's pencil (`apps/client/src/hud/plates-creature.ts:104`)
  wears the plain `rename-button` class and nothing else.
- **The house pattern stays intact.** One class, one definition, the same
  affordance ("a pencil that renames") in both places. The phone tier's
  44 px floor then reaches the stable's pencil for free, because
  `base.css:95-99` raises `button.rename-button` — the same way it raises
  the ranch's own pencil.
- The only cost is the selectors that used to read `.stable-pet-rename`
  (the client test and the pass); both now read `.rename-button`, scoped
  to the stable row.

The size is therefore owned by the stylesheet, and the client test pins
that fact directly: the pencil's `style.width` and `style.height` must be
empty, so no inline size can creep back in.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Types | `bun run check` (inside `bun run verify`) | 0 | No type errors — `@apex/sim` 102 files, `@apex/voxel` 71 files, `@apex/client` 309 files |
| Tests | `bun test --check --parallel --timeout 120000` | 0 | 2,323 pass, 1 skip, 0 fail, 90,735 assertions (2,321 → 2,323: the two new client tests) |
| Lint / format | `biome check` (inside `bun run verify`) | 0 | 503 files checked, no fixes applied, **no warnings** |
| Determinism | `bun run gate:determinism` | 0 | 12 regeneration digests match (4 species × 3 stages + 5 props) |
| Build | `bun run build` | 0 | Vite build OK — `dist/assets/index-N3cQ1wle.css` 63.90 kB, `dist/assets/index-B-oOpoFU.js` 870.76 kB |
| Visual pass | `bun test --timeout 120000 ./.conductor/evidence/phase-3/stable-visual-pass.ts` | 0 | 12 flows, 154 assertions, 171.89 s, console clean at 1440×900 and 393×852 |

`bun run verify` and `bun run build` were both re-run on the final tree
(after the last CSS change) and both exited 0.

## The visual pass

- **Flows:** 12 — the stable modal, the gift card and the hatch, the cup's
  refusal, the graduation, the renamed stable, the empty stable, and the
  rename flow.
- **Widths:** 1440×900 (desktop) and 393×852 (iPhone tier). Both tiers were
  exercised; every flow asserts a clean console (`the console is clean`).
- **Assertions:** 154, all passing (R1: 146). The new ones, at both widths:
  - the rename control wears the house icon size (desktop: 26×26 px)
  - the rename control meets the phone tier's 44 px floor (phone: 44×44 px)
  - the field wears the kit panel (computed background `rgb(20 16 12 / 0.72)`)
  - the field has the kit's rounded corners (computed `6px`)
  - the editor stays inside the pet row
  - the editor does not cover the swap action
- **Captures** (`.conductor/evidence/phase-3/shots/`):
  - `desktop-12-stable-rename.png`, `iphone-12-stable-rename.png` — the row
    with its pencil
  - **`desktop-12b-stable-rename-open.png`, `iphone-12b-stable-rename-open.png`
    — new: the editor open, the styled field on the record**
  - `desktop-13-stable-renamed.png`, `iphone-13-stable-renamed.png` — after
    the rename
- **The editor-open capture** shows the field in the kit (panel background,
  keyline border, rounded corners, accent focus ring) with the full name
  legible, Save and Cancel beside it in the house's small kit buttons, and
  the swap action on its own row below — the phone tier's own layout for a
  narrow row, applied while the editor is open.

## Module cap

Cap: 12,288 B (`apps/client/src/module-size.test.ts`, green in the full run).

| Module | Bytes | Headroom |
| --- | --- | --- |
| `apps/client/src/hud/update.ts` | 12,263 B | 25 B |
| `apps/client/src/stable.ts` | 11,379 B | 909 B |
| `apps/client/src/stable-rename.ts` | 5,070 B | 7,218 B |
| `apps/client/src/growth.ts` | 7,015 B | 5,273 B |

`stable-rename.ts` grew by 121 B (the inline size lines went, a comment
about the house's class came); it is 7,218 B under the cap. `stable.ts`
did not change.

## Deviations

| File | Why it was required |
| --- | --- |
| `.conductor/evidence/phase-3/stable-visual-pass.ts` | The pass is the pin for N1's visual half (the pencil's size per tier, the editor-open capture, the field's kit styling and the editor's layout). It is outside the brief's `Touches` list but inside `.conductor/evidence/`, where artifacts are allowed. R1 changed the same file for the same reason. |

Nothing else left `Touches`.

## Notes for the primary

- **Two rows of `verification/integrated.md` are now stale and are yours to
  fix** (Conductor state — I did not touch them):
  - **NFR-1** (line 55) quotes `stable.ts` at 10,598 B. It is **11,379 B**
    (unchanged by this phase; the figure moved in R1). The largest client
    module is still `hud/update.ts` at 12,263 B.
  - **NFR-5** (line 59) says "and 44 px targets — proven by the visual
    pass". On the desktop the rename pencil is now the house's 26 px icon
    size; the 44 px floor is the phone tier's rule (`base.css:95-99`). The
    row should read "44 px targets on the phone tier".
  - The FR-8 row (line 44) still reads true — see N2 above.
- **The editor's field width.** The stable's field is 262 px on the desktop
  and 111 px on the phone; the house's own editor field (the ranch plate's
  inline rename) is 130 px in its 300 px plate. The stable's row shares its
  width with a 183 px swap action, so while the editor is open the row
  belongs to the editor and the swap action steps down to a row of its own —
  the same layout the phone tier already uses for a narrow row. The house's
  own rename form takes the plate's head row while editing
  (`apps/client/src/ranch.css:292-297`, `apps/client/src/hud/shell.ts:218-224`),
  so this is that rule in the stable's voice.
- **One house-parity nit left alone.** The house's editor selects the name
  when it opens (`apps/client/src/hud/shell.ts:220`); the stable's editor
  leaves the caret at the end of the text. No finding asked for it and it is
  a behaviour change, so it was not made here — raising it for the reviewer
  rather than deciding it.
- The dev server on port 5199 was already running and was left running.
- Two scratch probes are left under `.conductor/evidence/phase-3/`
  (`rename-geometry.ts`, `house-editor-geometry.ts`): they are the
  measurements behind the field widths quoted above. The shell here refuses
  file deletion, so they remain as artifacts. Neither is part of the pass
  and neither is committed (`.conductor/` is ignored).

## Primary verification

Run by the primary agent, independently of the phase report.

| Check | Command | Exit | Result |
|---|---|---|---|
| Working tree | `git status --porcelain` | 0 | clean |
| Files vs Touches | `git diff --name-only 7bb9c21..HEAD` | - | `apps/client/src/ranch.css`, `apps/client/src/stable-rename.ts`, `apps/client/src/stable.test.ts`, the visual-pass harness (the pin for N1's visual half) and this evidence file - inside Touches or the one reported deviation |
| Commits reported | `git log --oneline 7bb9c21..HEAD` | - | 2 commits, both reported; no merge commit |
| Gate | `bun run verify` | **0** | types clean (voxel 71 / sim 102 / client 309 files), **2,323 pass / 1 skip / 0 fail** across 173 files, `biome check` clean on 503 files, the determinism gate byte-identical for 12 creature GLBs + 5 props |
| Build | `bun run build` | 0 | exit 0 (only the pre-existing chunk-size warning) |
| Module cap | the module-size gate | 0 | `hud/update.ts` 12,263 B, `stable.ts` 11,379 B, `stable-rename.ts` 5,070 B - the cap was never raised |

The fixes were read, not just trusted:

- **N1** - `ranch.css` now carries `.stable-pet-name-row` (a flex row, the
  house's 6 px gap), `.stable-pet-input` (the kit panel background, the ink
  colour, the keyline border, the accent `:focus-visible` outline) and the
  row-level rules for the editor-open layout. The pencil now wears the house's
  own `rename-button` class - the inline size is gone, so the phone tier's
  44 px floor reaches it the way it reaches the active pet's pencil. The
  capture `desktop-12b-stable-rename-open.png` shows the result: the field
  reads as part of the kit, and the swap action steps down to its own row
  while the editor is open.
- **G1** - two client tests now pin the branches that were open: Enter saves,
  and a refused rename keeps the editor open, focuses the field and writes the
  note.
- **N2** - the stale FR-8 row in `verification/integrated.md` was corrected by
  the primary, with a note recording the round-1 narrowing; the phase
  confirmed the docs still read true.

Verdict: **verified** - the three round-2 findings are closed and the gate is
green.
