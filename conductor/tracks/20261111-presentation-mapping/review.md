# Review record — Presentation Mapping

## Round 1: PASS WITH FINDINGS (5 findings)
- F1 Medium: slip travel trips the roll pose → fixed in Phase R1 via D1 dodge-burst stream flag.
- F2 Medium: same-startup rows read longest reach → fixed in Phase R1 via D1 move-index stream field.
- F3 Low: forward-only roll tuck → fixed (lateral share channel).
- F4 Low: unjustified `as` at reduced-flash.ts:95 → fixed (typed FlashMesh).
- F5 Low: first-sample default wedge → fixed (hidden while runSteps < 2).

## Round 2: PASS WITH FINDINGS (2 Low)
- Scope: full track range `3c525eae..HEAD`; reviewer confirmed all five round-1 findings genuinely closed and pinned, D1 export behavior-free (spare-bit packing inverts exactly, replay hash `0xc579e9ae` intact, balance bands untouched), full FR/AC/NFR coverage, targeted suites 185/185 green, module-size guards green.
- F6 Low (docs): spec §Out of Scope still bars `packages/sim` changes while D1 ships → fix in Phase R2 (one-line carve-out).
- F7 Low (NFR-2): fighter-driver.ts at 12,272 B (16 B headroom) → fix in Phase R2 (pre-emptive extraction of the pose-application block).

No open Medium/High findings. No bound widened, no `test.failing`, no balance number changed across either round.
