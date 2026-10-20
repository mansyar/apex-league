# feat(detail): reveal evolution thresholds as each gate is cleared

## Summary

The detail modal now tells a coach what the next evolution gate actually needs.
Before a player clears a gate once, the panel speaks in qualitative coach copy
("still a few days off", "needs a lift"); after that first clear, the same rows
switch to the real numbers ("6 / 10", "35 / 40", "0 / 1"). Discovery is
per gate, save-wide, and permanent.

## What changed

- **Save v17** — `GameState.evolutionKnowledge { juvenile, champion }`, set by
  `advanceDay` only when `settleCreature` actually changes the stage, so a
  blocked gate or a quiet night never unlocks anything. The v16→v17 migration
  infers knowledge from the persisted stage (juvenile ⇒ juvenile known,
  champion ⇒ both) instead of trusting a payload field, and `isValidSaveState`
  rejects a malformed record.
- **`apps/client/src/growth.ts`** — pure view-model that mirrors
  `evaluateEvolution`'s constants, picks the active gate's rows (age, clean
  nights, mood; plus bond and cups at the champion gate), and renders
  digit-free copy until a gate is discovered.
- **`apps/client/src/growth-panel.ts`** — the DOM layer plus a tested repaint
  seam (`createGrowthHost`) that no-ops while the modal is closed and swaps only
  its own children when open.
- **`creature-detail.ts` / `hud.ts`** — a `role="group"` Growth section with
  shape-distinct glyph + status word (never colour alone), refreshed in place on
  every commit so a gate unlocked at settlement appears without reopening.

## Verification

- `bun run verify` exit 0 — typechecks, 1762 pass / 1 skip / 0 fail across 141
  files, biome 0 errors (7 pre-existing warnings), determinism gate
  byte-identical for all nine creature artifacts and five prop digests.
- `bun run build` exit 0.
- Panel wiring is covered by a fake-DOM suite that drives
  `buildCreatureDetail` end to end; mutation probes (dropping the show call or
  the sync paint) fail by name.
- Review: two rounds, final verdict PASS (`conductor/archive/20261020-evolution-discovery-ui/review.md`).

## Notes

- No new dependency, no generator or published-artifact change, and the Hall of
  Fame surface is untouched.
- `apps/client/src/size-probe.test.ts` pins the three Growth modules at 12 KB
  because `module-size.test.ts` scans only `scene-logic/` and `ranch/`.
