# Plan — Broadcast HUD Overhaul (`broadcast_hud_20261011`)

Methodology: `conductor/workflow.md`. Logic-bearing tasks are test-first;
rendering/asset tasks carry manual verification. Every phase ends with a
workflow checkpoint task.

## Phase A — Mock-first design gate

- [x] Task: Build the mock dev page (`apps/client/mock.html` + `mock.css`) — `90ebfca`
  - [x] Kit primitive showcase: plate, chip, button, tab, meter, bar, stamp (all variants)
  - [x] Score bug cluster: hero day numeral, phase tab, AP segmented meter (full/empty/spent states), trophy tally
  - [x] Creature lower-third cluster: crest + name plate + stage tab, stat cells with `+N` chips, five condition bars (glyph labels, change-feedback states), announcer ticker line
  - [x] Command dock cluster: care plates (glyph + AP badge + rejection reason states), train picker rows, gold Advance Day CTA
  - [x] Top-right chip family (Spar / Cup / Motion) + starter overlay treatment — review moved Cup day into the phase tab and Motion to top-left; rejection reasons became hover tooltips (`data-reason`); dock buttons settled on neutral rect
  - [x] Motion notes: entrance settle / spend flash / bar feedback shown as CSS animations in the mock
- [x] Task: Present mock to the user; iterate until approved; record the approval in the track notes — `2029244`
  - v1→v4 iterations from live in-browser review; user approved final look ("Looks good")
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — `[checkpoint: 2029244]`

## Phase B — Shared kit + shared modules

- [x] Task: Tests first — pure logic for shared modules — `4a8b073`
  - [x] `element.ts` (shared crest + hue module): all 6 elements have glyph + hue; single fallback; fire/plant/water glyphs byte-match the current battleHud set
  - [x] `prefersReducedMotion()` helper (injected media-query matcher): true/false paths, no direct `matchMedia` access
- [x] Task: Implement `element.ts`; delete duplicated `CREST_GLYPHS` (battleHud), `ELEMENT_HUE` (staging) and the `HUES` copy (cup.ts); fix the 40-vs-200 fallback mismatch — `85e43e8`
- [x] Task: Implement the `ui/` kit (factories for plate/chip/button/tab/meter/bar/stamp) + kit.css; wiring stays imperative DOM, factories run at build time — `ac3db7a`
- [x] Task: Split CSS: `kit.css` + per-surface files (ranch / spar / cup / starter / arena); retire `style.css` — `1d69472`
- [x] Task: Repoint the mock page at the real kit so the approved look is reproduced from production code — `ff2e970`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — [checkpoint: ff2e970]

## Phase C — Ranch HUD rebuild

- [x] Task: Score bug on the kit — `185d66a`
  - [x] Hero day numeral + phase tab; AP segmented meter wired to `state.actionPoints` with spend flash
  - [x] Trophy tally from `state.cupsWon` (designed overflow, no silent ×5 cap)
- [x] Task: Creature lower-third on the kit — `2d3c488`
  - [x] Crest + name plate + stage tab (uses shared `element.ts`)
  - [x] Stat cells with `+N` trained chips
  - [x] Five condition bars with glyph labels + up/down change feedback
  - [x] Status line as announcer ticker (existing copy priority chain preserved; copy tests still pass)
- [x] Task: Command dock on the kit — `02ece7e`
  - [x] Care plates: glyph + AP badge + rejection reason; disabled states still derive from `careAction` dry-run
  - [x] Train button + inline four-stat picker styled like the cup kit list
  - [x] Advance Day gold CTA (phase-aware label preserved)
- [x] Task: Chip family + motion wiring (entrance settles, hover/press micro-feedback; everything gated by the reduced-motion setting + OS preference) — `daaf76c`
- [x] Task: Collapsible corner clusters (user-requested during checkpoint review) — `4e7ee7f`
  - [x] Creature head + ACTIONS dock header as accessible toggle buttons
  - [x] Collapsed: head row readout (left) / ACTIONS label (right); session-only
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — [checkpoint: 4e7ee7f]

## Phase D — Spar, starter, cup + arena adoption

- [x] Task: Spar panel onto the kit (kit-gate progress, loadout rows, tactic buttons, log) — interaction unchanged — `f0651d6`
- [x] Task: Starter overlay rebuilt in dome/broadcast language; remove the dead "Coming soon" ribbon — `4ac7fdc`
- [x] Task: Cup overlay + battle HUD chrome adopt kit classes (bracket, coach room, results, placard, lower-third) — layout/behavior unchanged — `1cc5276`
- [x] Task: Cup results AP copy fix — derive from `ACTION_POINTS_PER_DAY` + cup bonus instead of `${3 + 1}` — `2766c26`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase E — Guidelines, docs, final verification

- [ ] Task: Amend `conductor/product-guidelines.md` for the backdrop-blur scrim (dated note)
- [ ] Task: Sync README/docs where the HUD is described
- [ ] Task: Final gate — `bun run verify` green; manual visual pass over all five surfaces with screenshots as evidence; reduced-motion on/off checked
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
