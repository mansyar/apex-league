# Phase R1 — Review Fixes (Round 1)

- **Status:** verified
- **Review basis:** `review.md` round 1 — verdict PASS WITH FINDINGS (0
  Critical / 0 High / 0 Medium / 4 Low)

## Tasks

- [x] **R1.T1 (F1):** Deleted dead `buildGather`/`GATHER_MOTES` + the
  `jitter` import (used only by it) from `fx/shot-geometry.ts`, plus the
  orphaned gather pins in `look-override.test.ts` (commit `e1ae238a`).
  Deviation: also trimmed the test file's header comment, which still named
  the deleted gather effect.
- [x] **R1.T2 (F2):** Reworded the jet-core comment to name Blaze Bolt's
  charged comet head instead of Pyre Wall's pillar (commit `43083ad1`).
- [x] **R1.T3 (F3):** Widened `spawn` (`fx/projectiles.ts`) and
  `spawnProjectile` (`staging-fx.ts`) to accept
  `{ group: { position: THREE.Vector3 } }`; dropped the
  `as THREE.Group` cast in `steps/fire.ts` and its now-unused `THREE`
  type import (commit `22ed0c3b`). No runtime behavior change.
- [x] **R1.T4 (F4, primary):** Fixed the Phase-5 Touches typo in `plan.md`
  (`move-fx/steps/fire.ts` → `steps/fire.ts`); corrected `phase-7.md`'s
  P7.T2 paragraph (spear builder lives in `fx/shot-spear.ts`, reached via
  delegation) and its Files-changed list (added both extraction modules).

## Verification (primary)

- `bun run check`: clean (160+169+44+468 files, no errors).
- Targeted suites (`look-override`, `fallback`, `projectiles`,
  `move-fx`): 91 pass / 0 fail.
- `biome check` on the 5 touched source files: clean.
- Full gate: `bun run verify` exit 0 — 3500 pass / 1 skip / 0 fail
  (3 fewer than the pre-R1 3503: the removed orphaned gather pins),
  determinism gate OK; `bun run build` exit 0.

## Result

VERIFIED — all 4 Lows fixed, gate green, no behavior change.
