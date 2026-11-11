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

## Findings (round 1 — all closed in Phase R1)

- **F1 Medium (FR-3, closed):** slip cuts (~50–90 mm/step) tripped `ROLL_TRAVEL_MM`
  (50), so routine Circle footwork played a dodge tuck. Fixed via the D1
  dodge-burst flag on the stream (squash `5705f603`).
- **F2 Medium (FR-6, closed):** longest-reach collisions overstated guard/wall tells
  by ~40–55% (ion_wall 4400→6200 etc.). Fixed via the D1 move-index stream field.
- **F3 Low (FR-3, closed):** roll tuck always forward, even for lateral dodges.
  Fixed with the lateral-share channel.
- **F4 Low (style, closed):** unjustified `as` assertion, `reduced-flash.ts:95`.
  Fixed with typed `FlashMesh`.
- **F5 Low (FR-6, closed):** first startup frame painted the basic default for one step.
  Fixed (wedge hidden while `runSteps < 2`).

## Round 2: PASS WITH FINDINGS (2 Low)

- Scope: full track range `3c525eae..HEAD`; reviewer confirmed all five round-1
  findings genuinely closed and pinned, D1 export behavior-free (spare-bit
  packing inverts exactly, replay hash `0xc579e9ae` intact, balance bands
  untouched), full FR/AC/NFR coverage, targeted suites 185/185 green,
  module-size guards green.
- **F6 Low (docs):** spec §Out of Scope still bars `packages/sim` changes while
  D1 ships → fix in Phase R2 (one-line carve-out).
- **F7 Low (NFR-2):** `fighter-driver.ts` at 12,272 B (16 B headroom) → fix in
  Phase R2 (pre-emptive extraction of the pose-application block).

No open Medium/High findings. No bound widened, no `test.failing`, no balance
number changed across either round.
