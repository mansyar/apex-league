# Phase R1 Verification — Review fixes (F1, F2)

- Track: `20261125-basic-strike-identity-impact`
- Phase: R1 — Review Fixes
- Date: 2026-11-25
- Branch: `feat/20261125-basic-strike-identity-impact`
- Base: `4f1617680ecd9d45e4ec510549f34457ca270334`
- Head: `203df806bf625e6e458f7e8a5e1c2e99fbb547cf`
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Phase command (TDD red) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/steps/down.test.ts apps/client/src/choreo.test.ts` | 1 | 33 pass / 3 fail. One initial authoring error (`leans[1]` typed `number \| undefined` under `noUncheckedIndexedAccess`) was corrected before the behavioral red was observed; the corrected red then fails exactly the three new assertions: paced KO lean equals the unamplified `koFall(t).pitch` (F2), instant KO squash is the damped `down` impulse 0.45 instead of the KO impulse 0.75 (F1), and the second member of an instant double KO likewise gets 0.468 instead of 0.78 (F1). |
| Phase command (green) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/steps/down.test.ts apps/client/src/choreo.test.ts` | 0 | 36 pass / 0 fail, 1357 `expect()` calls across the two files; TypeScript check enabled by `--check`. |
| Integrated gate | `bun run verify && bun run build` | 0 | 4499 pass / 1 skip / 0 fail across 441 files; `bun run check` and `biome check` (1048 files) clean; determinism gate green for all 18 GLB stages and 5 prop digests; client Vite build succeeded (439 modules, exit 0). |

## Review findings

| ID | Finding | Fix | Status |
| --- | --- | --- | --- |
| F1 (High) | `down.ts` always resolved `reactionFor("down", …)`; the `instant` branch used that spec, so a terminal down dumped by `dumpInstant` for calm/reduced motion never received the authored KO weight. | Resolve once from the step flag — `reactionFor(step.ko === true ? "ko" : "down", side.actor.profile)` — before branching, and use the same spec in both the instant and paced branches. The paced KO branch keeps its impulse, dust ring and local `thudded` latch; the ordinary down keeps `down` values; the dense-stream guard stays. | verified |
| F2 (Low) | The authored `ko.reelPitch` was dead data: the staged KO lean used `koFall(t).pitch` with a fixed pitch. | In the KO branch only, `ao.lean.pitch = f.pitch * (1 + spec.reelPitch)`. `koFall`'s signature and the `dense-playback.ts` `topple()` call site are untouched; the ordinary down path never writes `lean.pitch`. | verified |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-3, AC-3 | A terminal `down` resolves a heavier authored reaction than a non-terminal `down`; the ordinary row is unchanged; impulse/reel/landing differ. | `down.ts` now resolves `reactionFor("ko", …)` when `step.ko === true` for both branches. `down.test.ts` → "authored KO reelPitch amplifies the KO lean" asserts the KO lean magnitude exceeds baseline `koFall(KO_THUD).pitch`, equals `baseline * (1 + reactionFor("ko", p).reelPitch)` for both a heavy (bovine, hurtMult 1.25) and a light (tortoise, hurtMult 0.6) profile, that the heavy body leans further, and that the ordinary down leaves `lean.pitch` at 0. `choreo.test.ts` continues to pin the unchanged ordinary row and per-archetype KO weighting. | verified |
| FR-4, AC-4 | Calm/reduced-motion resolves the dampened response with no new cue. | `down.test.ts` → "instant reduced-motion KO keeps the authored KO impulse" asserts the KO impulse equals `reactionFor("ko", p).impulse * 0.4` (the existing `impulse()` dampener in `fire.ts`) and exceeds the damped ordinary down; "instant reduced-motion ordinary down keeps the down impulse" asserts `reactionFor("down", p).impulse * 0.4`; the existing "reduced motion dampens the weighted landing and adds no cue" test still passes. No audio cue or `cueForStep` row was changed. | verified |
| AC-6, NFR-5 | Double KO weights both bodies; dense stream and ownership assertions are unaffected. | `down.test.ts` → "an instant double KO weights both bodies" asserts both fighters receive the damped KO impulse and no burst on the instant path; "an instant KO down leaves the stream's bodies alone" (existing) still passes, confirming `down`/`fall` are set without touching `smooth`/`velocity` when the stream owns bodies. `dense-playback.ts`, `pure.ts`, `choreo.ts`, `fire.ts` and pacing files were not edited. | verified |

## Evidence paths

- `apps/client/src/steps/down.ts` — reaction resolved once from `step.ko`; KO lean scaled by the authored `reelPitch`.
- `apps/client/src/steps/down.test.ts` — new instant-KO, ordinary-instant, instant-double-KO and KO-lean regression tests; `koFall` imported from `./pure`.
- Commit `203df806` — `fix(client): weight instant KOs and apply authored KO reelPitch`.

## Deviations

None. All edits are inside the phase's Touches; no Conductor state file other than this evidence file was modified.

## Notes

- TDD was followed literally: the failing tests were committed together with the fix after the red run was observed (33 pass / 3 fail), then the same exact phase command returned green (36 pass / 0 fail). The initial TypeScript-only test-authoring failure was corrected before the behavioral red, so the red output reflects the original production defects only.
- The fix is presentation-only and stateless: no module or fighter state was added, the per-action `thudded` latch remains local, and the shared FR8 `koFall` pose used by the dense stream is byte-for-byte unchanged.
- Plan-compliance nits from `review.md` (Phase 3 Status in `plan.md`, and a `tracks.md` line) are owned by the primary and were not touched in this phase.

## Primary verification

Run by the primary agent before accepting the fix phase:

| Check | Command | Exit | Result |
| --- | --- | --- | --- |
| Phase command | `bun test --check --parallel=4 --timeout 120000 apps/client/src/steps/down.test.ts apps/client/src/choreo.test.ts` | 0 | 36 pass / 0 fail, 1357 `expect()` calls across 2 files |
| Full gate | `bun run verify && bun run build` | 0 | all required layers green; determinism OK for all GLBs and 5 props; client build `index-DBYBs8-0.js`, only the pre-existing chunk warning |
| Scope | `git diff --name-only 4f161768..HEAD` and `git log --oneline --no-merges 4f161768..HEAD` | 0 | exactly the two Touches files plus the evidence file; commits are the fix and its evidence record |

The diff resolves the reaction once from `step.ko` before branching, keeps the
KO dust ring and local latch, and scales the staged lean by the authored
`reelPitch` without changing the shared `koFall` pose or `dense-playback.ts`.
F1 and F2 are resolved; the phase is ready for delta re-review.
