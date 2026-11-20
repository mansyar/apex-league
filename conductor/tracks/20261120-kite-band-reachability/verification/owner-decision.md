# Owner decision — D-2 unblock

- **Track:** `20261120-kite-band-reachability`
- **Date:** 2026-11-20
- **Decision owner:** project owner (native question tool)
- **Status:** accepted; recorded in `spec.md` as the "Owner decision 2026-11-20 - D-2 unblock" section.

## Decision

Continue the track. Do **not** accept D-2 as open debt and do **not** open a separate product-decision track.

1. Re-apply the Phase 2 speed-aware Kite clamp from checkpoint `7fb66b04`.
2. Extend the fight cap and its matching duration-band fences from 40s to 45s:
   `FIGHT_CAP_MS`, `BAND_MAX_MS`, `DURATION_MAX_MS`, and their pinned tests.
3. Keep the `capShare <= 1/3` fence unchanged. All other balance fences stay unchanged.
4. Bump `SIM_VERSION` 3 -> 4 with a dated v4 replay note and update ghost pins 3/4 -> 4/5.
5. Ship only if all 34 gates are green **and** `capShare` is strictly lower than
   the Phase 1 baseline `30.8% (517/1680)` on the same 1680-fight matrix.

## Why

Phase 2 already made the Kite band speed-reachable (median gap 1145 mm -> 1123 mm)
and kept all gates green, but `capShare` stayed at 517/1680. The archived diagnosis
identified both the unholdable Kite band and the 40s cap as the two contributors to
the nine unresolved tortoise pairings. Moving the cap fence with the clamp reapplied
addresses both halves while keeping the measured cap-share bound intact.

## Boundary

No other fence, target, dependency, save schema, protocol version, CORS, deploy,
client, or server change is authorized. If AC-11 or AC-12 fails, the track
hard-stops as `blocked` with the measured grid; no further workaround is allowed
without a new owner decision.
