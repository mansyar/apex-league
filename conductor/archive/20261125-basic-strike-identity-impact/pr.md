## Summary

Gives the innate `basic` move ("Strike") an authored melee-jab FX row instead of
the generic fallback, and makes a terminal knockout land heavier than an
ordinary down. Both changes stay in the client presentation layer: the sim
contract, save shape and generated artifacts are untouched. A review fix also
closed a reduced-motion gap where the authored KO reaction was skipped on the
instant playback path.

## Track

- **ID:** `20261125-basic-strike-identity-impact`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261125-basic-strike-identity-impact/spec.md`](conductor/archive/20261125-basic-strike-identity-impact/spec.md)
- **Plan:** [`conductor/archive/20261125-basic-strike-identity-impact/plan.md`](conductor/archive/20261125-basic-strike-identity-impact/plan.md)
- **Review:** [`conductor/archive/20261125-basic-strike-identity-impact/review.md`](conductor/archive/20261125-basic-strike-identity-impact/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Authored Strike identity | Author `MOVE_FX["basic"]` with a melee-jab grammar and pin the no-regression boundary | verified | `9bb05250` | One test-only widening in `movelab/catalog.test.ts` to allow the innate key |
| 2: Terminal-KO weighted impact | Resolve a heavier hurt-weighted reaction only on `down` steps with `ko: true` | verified | `8bb19400` | Rework 1 formatted `steps/down.test.ts` for Biome |
| 3: Visual evidence and integrated gate | Capture desktop/phone beats and run the full configured stack | verified | `b33d8765` | 12 captures under gitignored `.conductor/evidence/`; console clean |
| R1: Review fixes | Apply the authored KO reaction on the instant reduced-motion path and make `reelPitch` observable | verified | `5e53befd` | TDD red 33/3 → green 36/0; dense stream unchanged |

## Requirements

- [x] `FR-1` — `fxFor("basic", undefined)` resolves an authored melee-jab row (`apps/client/src/move-fx/moves/basic.ts`)
- [x] `FR-2` — all 48 specials and both fallback classes unchanged (`apps/client/src/move-fx.test.ts`)
- [x] `FR-3` — terminal `down` resolves a heavier authored reaction; ordinary row unchanged (`apps/client/src/choreo.ts`, `steps/down.ts`)
- [x] `FR-4` — calm/reduced-motion keeps the dampened response on both paced and instant paths (`apps/client/src/steps/down.test.ts`)
- [x] `FR-5` — desktop and phone captures of Strike and the terminal KO (`verification/phase-3.md`)
- [x] `NFR-1` — specials and unknown-id fallback pixel-identical; determinism gate green
- [x] `NFR-2` — module-size test green in the full gate
- [x] `NFR-3` — no new dependency
- [x] `NFR-4` — full configured stack green
- [x] `NFR-5` — double KO, dense stream and pause/seek leak no state
- [x] `NFR-6` — no save-schema change
- [x] `AC-1` … `AC-7` — mapped to phase and integrated evidence in [`verification/integrated.md`](conductor/archive/20261125-basic-strike-identity-impact/verification/integrated.md)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun test --check --parallel --timeout 120000` | pass — 4499 pass / 1 skip / 0 fail | `conductor/archive/20261125-basic-strike-identity-impact/verification/integrated.md` |
| lint / format | `biome check` | pass — no fixes | same |
| typecheck | `bun run check` | pass — 4 workspaces | same |
| determinism | `bun run gate:determinism` | pass — all GLBs + 5 props | same |
| build | `bun run build` | pass — pre-existing chunk warning only | same |
| visual | `playwright-cli` desktop + iPhone 15 | pass — console 2 messages, 0 errors | `conductor/archive/20261125-basic-strike-identity-impact/verification/phase-3.md` |
| integrated | `bun run verify && bun run build` | pass — exit 0 | `conductor/archive/20261125-basic-strike-identity-impact/verification/integrated.md` |

## Media

- Authored Strike melee jab in a real spar beat at head `b33d8765`: ![Strike melee jab](https://github.com/user-attachments/assets/de1f2928-c41f-44d8-b93a-2526b6b7dc2e)
- Terminal KO with the heavier landing and dust ring at head `b33d8765`: ![Terminal KO](https://github.com/user-attachments/assets/fc9beaa6-9290-49c2-9ccd-a8d03a27e9d1)

## Review

- **Verdict:** `PASS WITH FINDINGS`
- **Rounds:** 2
- **Fixed:** 2 code findings (reduced-motion instant KO path, dead KO reel fields) + 1 non-code registry nit
- **Accepted/deferred:** 0 (strict review; every finding fixed before the PR)

## Deviations and risks

- `apps/client/src/movelab/catalog.test.ts` was widened by one test-only assertion so the innate `"basic"` key can coexist with the 48 kit moves; no lab behavior changed.
- The Move Lab dropdown cannot select the element-less `"basic"` id, so its fallback contrast shot uses a non-catalog probe id. Strike itself is shown from a real spar battle.
- The transient dust-ring frame outran screenshot latency; the heavier landing is pinned by table tests and the terminal-KO capture shows the defeated body and knockout verdict.

## Follow-ups

- none

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit 5e53befd
```

No migration, feature flag or data change is involved; the track is presentation-only.
