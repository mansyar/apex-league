# Presentation Mapping — pull request body

Client-only stream-to-animation mapping for the continuous battle sim.
Zero production `packages/sim` behaviour change (one justified additive
9-bit stream export, D1); the replay hash is byte-identical before and
after (`0xc579e9ae`).

## What changed

- **Pose foundation (P1):** stream-driven flinch (hitstun), crumple
  (poise break) and crouch (startup telegraph) with a priority table
  (ko > crumple > flinch > crouch > none), wired through the fighter
  driver and dense playback. 28 new tests.
- **Dodge, knockback, contact (P2):** stream-driven dodge roll
  (paid, client-real), knockback recoil with planted feet and fence pins,
  contact squash with a render offset so bodies no longer interpenetrate.
  Pose application split into `pose-track.ts` to respect the 12 KB cap.
- **Telegraph + shader accents (P3):** telegraph wedge derived from the
  move's `reachMm` plus body radius (clamped, wide-short vs narrow-lance),
  bounded concurrent effects (bursts 8, flash 1, decals 6, rings 2).
- **Reduced motion + visual pass (P4):** flash language with replay
  parity, playwright desktop + phone pass with clean console,
  frame-time profile.
- **Review fixes (R1):** slip-vs-roll disambiguation via a spare phaseT
  bit + 1-based move index (D1, hash-identical); honest wall tells;
  forward-only roll tuck; `as`-free code; no first-frame default wedge.
- **Review fixes (R2):** spec wording records the D1 export; the pose
  seam extracted to `pose-apply.ts` (driver 12,272 B → 8,759 B) with a
  7-channel identity test.

## Verification

- `bun run verify` exit 0 (4,111+ pass, biome clean, determinism gate
  byte-identical), `bun run build` exit 0 — on the final tree.
- Round-3 review: **PASS WITH FINDINGS** (1 Low, closed on the tree).

## Known and recorded, not claimed fixed

- Dodge-vs-slip identity needs the stream bit; wall tells for shared
  startup rows read longest reach (documented approximation).
- Kite 2/6, telemetry cap share at its bound, thin band margins — owned
  by the balance track, untouched here.
- Deferred per roadmap: verticality, blocking, ring-out, minimum reach,
  full animation set.
