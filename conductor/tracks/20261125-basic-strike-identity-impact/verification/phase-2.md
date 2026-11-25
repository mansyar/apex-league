# Phase 2 Verification — Terminal-KO weighted impact

- Track: `20261125-basic-strike-identity-impact`
- Phase: 2 — Terminal-KO weighted impact
- Date: 2026-11-25
- Branch: `feat/20261125-basic-strike-identity-impact`
- Base: `dd1fafd6819d3dd1e3f4aec1884221e345f8639b`
- Head: `db05ae7eb2a4bce9f10ff58b18aca206e593a09f`
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Unit (TDD red) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/choreo.test.ts apps/client/src/steps/down.test.ts` | 1 | 27 pass / 5 fail. Every failure is the missing authored terminal reaction: `reactionFor("ko", …)` falls back to `glance` (0.85 < the ordinary down's 0.9), so both the library assertions and the KO-branch landing assertions fail. |
| Unit (green) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/choreo.test.ts apps/client/src/steps/down.test.ts` | 0 | 32 pass / 0 fail, 1342 `expect()` calls across the two files; TypeScript check enabled by `--check`. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-3, AC-3 | A `down` with `ko === true` resolves a heavier authored reaction than a non-terminal `down`; the ordinary row keeps its current values. | `choreo.test.ts` → "the ordinary down row keeps its shipped values" pins `{ impulse: 0.9, reel: 0.7, reelPitch: 0, slide: 0, dash: 0 }`; "the terminal reaction is heavier for every archetype, weighted by hurtMult" asserts `ko.impulse/reel/reelPitch > down` for all 21 archetypes plus exact `koBase × hurtMult` weighting, frozen specs and unchanged global slide/dash. `down.test.ts` → "a KO down lands heavier than an ordinary down and kicks a dust ring" asserts the KO landing impulse equals `reactionFor("ko", p).impulse`, exceeds the soft-fall impulse, fires exactly one dust ring, and latches the thud only once. | verified |
| FR-4, AC-4 | Calm/reduced-motion stays dampened and introduces no new cue. | `down.test.ts` → "reduced motion dampens the weighted landing and adds no cue" asserts the heavier impulse is still multiplied by the existing 0.4 dampener and that `cueForStep` still returns the existing `"ko"` id (and `null` for ordinary down). `audio/cues.ts` is untouched; no new `CueId` or cue row was added. | verified |
| AC-6, NFR-5 | Double KO weights both bodies; dense stream and mid-beat pause/seek leak neither the heavier reaction nor dilation state into subsequent beats. | `down.test.ts` → "double KO weights both downed bodies" runs two KO steps in one beat and checks both fighters receive the weighted impulse and one dust ring each; "a mid-beat pause/seek leaves no reaction state in the next beat" abandons a pre-thud KO action, stages an ordinary down, and asserts the ordinary impulse with zero bursts, then a later KO is heavy again — each action owns its own `thudded` latch, no module/fighter state; "an instant KO down leaves the stream's bodies alone" checks `down`/`fall` are set while `smooth`/`velocity` and bursts are untouched. Pacing (`pacing.ts`) and the driver were not edited. | verified |

## Evidence paths

- `apps/client/src/choreo.ts` — authored `ko` reaction row (`impulse: 1.5`, `reel: 0.85`, `reelPitch: 0.3`, `weight: "hurt"`) and `ReactionKind` extension.
- `apps/client/src/steps/down.ts` — the KO branch resolves `reactionFor("ko", profile)`; the instant and soft-fall branches are byte-for-byte unchanged.
- `apps/client/src/choreo.test.ts` — ordinary-row regression pin and per-archetype KO weighting assertions.
- `apps/client/src/steps/down.test.ts` — new suite for KO landing, double KO, pause/seek, reduced motion and dense stream.
- Commits: `190e849d` (red-phase tests), `cb4b8a59` (implementation + cast cleanup), `db05ae7e` (Biome formatting rework).

## Deviations

None. All edits are inside the phase's Touches.

## Notes

- TDD was followed literally: the red run (27 pass / 5 fail) preceded the authored row and the KO-branch wiring; the green run followed them.
- The heavier reaction is presentation-only and stateless: it is recomputed from the actor's profile on each KO step, and the existing local `thudded` latch prevents a second kick within one beat. No state is stored on the fighter or module, and pacing/KO dilation stays owned by `pacing.ts` / `playbackDriver.ts`.
- An exploratory `git cat-file -s HEAD:apps/client/src/choreo.ts` byte-size probe was rejected by the shell allowlist. It was informational only; module size remains governed by `apps/client/src/module-size.test.ts` in the primary's full `bun run verify && bun run build` gate. The authored addition is one row plus one union member.

## Primary verification

Run by the primary agent after rework 1, before acceptance:

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Phase command | `bun test --check --parallel=4 --timeout 120000 apps/client/src/choreo.test.ts apps/client/src/steps/down.test.ts` | 0 | 32 pass / 0 fail, 1342 `expect()` calls across the two files. |
| Full verification | `bun run verify && bun run build` | 0 | 4495 pass / 1 skip / 0 fail across 441 files; `bun run check` and `biome check` (1048 files) clean; determinism gate green for all 18 GLB stages and 5 prop digests; client Vite build succeeded. |
| Scope check | `git diff --name-only dd1fafd6..HEAD` and `git log --oneline --no-merges dd1fafd6..HEAD` | 0 | Four files in Touches plus the evidence file; commits are only the phase's task commits, its format rework, and the evidence records. No merge or unrelated user commit. Module cap is green in the full gate (`apps/client/src/choreo.ts` is 12020 bytes, under 12 KB). |

The initial primary `bun run verify && bun run build` failed at `biome check`
on formatting in `steps/down.test.ts`; rework 1 applied Biome's exact requested
formatting and the re-run is green. All Phase 2 acceptance criteria (FR-3, FR-4,
AC-3, AC-4, AC-6, NFR-5) are confirmed.

## Rework 1 — formatting

The primary's required gate (`bun run verify && bun run build`) exited 1 after all tests passed (4495 pass / 1 skip / 0 fail across 441 files) and the TypeScript check succeeded. The only failure was `biome check`: `Checked 1048 files in 4s. No fixes applied. Found 1 error.` — `apps/client/src/steps/down.test.ts` was not formatter-clean:

- the `let staged:` union annotation needed to be a single wrapped declaration (break after `=`, not inside the union);
- the multi-line `downStep(stepOf(true), false, …)` calls that fit inside the configured 80-column width needed to be single-line calls;
- two multi-line `expect(…).toBeCloseTo(…)` assertions needed to be single-line.

`bunx biome check --write apps/client/src/steps/down.test.ts` was denied by the shell allowlist (recorded as informational in the report's `blockers`), so the exact formatter output was applied by hand in `apps/client/src/steps/down.test.ts`: one wrapped `let staged:` declaration, three single-line KO `downStep(...)` calls, and two single-line `toBeCloseTo(...)` assertions. The two remaining multi-line calls exceed 80 columns when written on one line and were left in Biome's wrapped form.

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Primary gate (reported by primary) | `bun run verify && bun run build` | 1 | All tests/TS green; `biome check` found 1 formatting error in `apps/client/src/steps/down.test.ts`. |
| Formatter fix (rejected) | `bunx biome check --write apps/client/src/steps/down.test.ts` | permission denied | Shell allowlist rejection; formatting applied manually instead. |
| Unit (post-rework) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/choreo.test.ts apps/client/src/steps/down.test.ts` | 0 | 32 pass / 0 fail, 1342 `expect()` calls. |

Rework commit: `db05ae7e` — `style(client): format terminal-KO down tests`. The primary re-runs `bun run verify && bun run build`; this agent did not run it.
