# Review — Presentation Mapping

## Round 1: PASS WITH FINDINGS

- Range: `3c525eae..ff78be76` · Reviewer: conductor-reviewer (read-only).
- Replay parity holds (empty sim diff confirmed by reviewer via git; hash
  `0xc579e9ae` unchanged; no wall clock or randomness in new code — the only
  `Math.random` nearby is pre-existing burst scatter that never feeds the sim).
- Reduced-motion contract holds (identical pose/stage/verdict, parity test +
  live reduced spars at both widths).
- Module seams clean; all touched files under 12,288 B
  (`fighter-driver.ts` 12,147 B closest — 141 B headroom).

## Findings

- **F1 Medium (FR-3, open):** slip cuts (~50–90 mm/step) trip `ROLL_TRAVEL_MM`
  (50), so routine Circle footwork plays a dodge tuck. No threshold separates
  slip from dodge (floor 60); honest fix needs a dodge flag on `StreamFrame`
  — a sim change barred by this track's scope.
- **F2 Medium (FR-6, open):** longest-reach collisions overstate guard/wall tells
  by ~40–55% (ion_wall 4400→6200 etc.). A per-startup override cannot fix it
  without a move id; honest fix is a stream move-id/reach export in a follow-up.
- **F3 Low (FR-3):** roll tuck always forward, even for lateral dodges.
- **F4 Low (style):** unjustified `as` assertion, `reduced-flash.ts:95`.
- **F5 Low (FR-6):** first startup frame paints the basic default for one step.

## Reviewer needs (primary to confirm)

- `bun run verify` on the final tree (running in background at review time).
- Module-size guard on the final tree.
