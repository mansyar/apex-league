# Review: Polish & Showcase

- **Track:** `20261117-polish-showcase`
- **Type:** `feature`
- **Branch:** `feat/20261117-polish-showcase`
- **Range:** `23c6750900cb3285dc36d399a29a15061a73c3cb..543b6191`
- **Date:** 2026-11-18
- **Verdict:** `PASS WITH FINDINGS`

## Summary

All configured checks are green and the pure audio/duck/announcer design is
sound. The read-only reviewer found two Medium gaps: the cup-results verdict
line is synchronously overwritten by the advancement line in the real results
path, and AC-9's literal "committed" requirement for the marquee capture is
unmet because all captures are gitignored/untracked. Both findings are in
scope, objective and fixable; `review.strict: true` requires fixes before the
PR, so a Review Fixes phase is appended.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| typecheck | `bun run check` | pass | 44 server + 528 client files, no type errors |
| lint/format | `bunx biome check` | pass | 945 files, no fixes (`biome` resolves via `bun run verify`) |
| unit | `bun test --timeout 120000` | pass | 4201 pass / 1 skip / 0 fail, 491,422 `expect()` calls, 377 files |
| determinism | `bun run gate:determinism` | pass | 45 species GLBs + 5 prop digests byte-identical, final hash `0xff6f3d62` |
| build | `bun run build` | pass | Vite 420 modules, exit 0 |
| visual | `playwright-cli` against `bun run dev` | pass | 6 screenshots, console 0 errors/0 warnings, single polite region, visible focus, no h-scroll at 393×852 / 852×393 |
| integration | `bun run verify && bun run build` | pass | `verification/integrated.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1/T2 | `cues.test.ts` | covered |
| FR-2 | P2.T1 | `cueUrls.test.ts`, `beds.test.ts` | covered |
| FR-3 | P2.T2/T3 | `CREDITS.md`, provenance test | covered |
| FR-4 | P3.T1/T2 | `duck.test.ts`, `player.ts`, `musicBeds.ts` | covered |
| FR-5 | P4.T1 | `announcer.test.ts`, `results.ts`, visual pass | partial (F1) |
| FR-6 | P4.T2 | visual focus pass | covered |
| FR-7 | P4.T3 | copy audit in `phase-4.md` | covered |
| FR-8 | P1.T2, P4.T1 | `cues.test.ts`, `announcer.test.ts` | covered |
| FR-9 | P5.T1 | `phase-5.md`, `integrated.md` | partial (F2) |
| FR-10 | all phases | diff scope, determinism gate | covered |
| NFR-1 | all phases | determinism gate, hash unchanged | covered |
| NFR-2 | all phases | module-size tests in `verify` | covered |
| NFR-3 | P2.T2/T3 | `CREDITS.md`, provenance test, diff scope | covered |
| NFR-4 | P3.T2 | `player.ts`, `musicBeds.ts`, `app/audio.ts` | covered |
| NFR-5 | P4.T4 | visual pass at both orientations | covered |
| NFR-6 | P3.T1/T2 | `duck.test.ts`, `musicBeds.ts` | covered |
| AC-1 | P1.T2 | `cues.test.ts` | covered |
| AC-2 | P2.T1/T3 | `cueUrls.test.ts` CREDITS completeness test | covered |
| AC-3 | P2.T2/T3 | `CREDITS.md:39,42`, `phase-2.md` | covered |
| AC-4 | P3.T1/T2 | `duck.test.ts` | covered |
| AC-5 | P4.T1 | `announcer.test.ts`, DOM check | partial (F1) |
| AC-6 | P4.T2 | visual focus check | covered |
| AC-7 | P4.T3 | `announcer.test.ts`, copy audit | covered |
| AC-8 | P1.T2, P4.T1 | `cues.test.ts`, `announcer.test.ts` | covered |
| AC-9 | P5.T1 | `phase-5.md`, `integrated.md` | partial (F2) |
| AC-10 | P5.T2 | determinism gate, `verify && build` | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- **F1 — Cup verdict line is overwritten before assistive technology can read it**
  - **File:** `apps/client/src/cup/results.ts:56-62`
  - **What:** `showResults()` calls `announce.announce(verdict)` then
    `announce.announce(advancement)` in the same synchronous tick.
    `createAnnouncer.speak()` writes `region.textContent` immediately
    (`announcer.ts:106`), so only the advancement line is perceivable in the
    real results path. The pure `coalesce()` helper is unused by that path.
  - **Why:** FR-5/AC-5 require a perceivable polite verdict announcement; the
    headline verdict is silenced in the main cup-results flow.
  - **Fix:** Make one perceivable line from the verdict and advancement via a
    pure helper over `announcementFor`, speak it once with `say()`, and test
    that both parts are present.
  - **Requirement:** FR-5, AC-5
  - **Test gap:** Add a pure/imperative test asserting the combined results line
    contains both the verdict and the advancement detail.

- **F2 — Approved AC-9 requires committed captures, but captures are gitignored**
  - **File:** `conductor/tracks/20261117-polish-showcase/plan.md:94`
  - **What:** AC-9 (`spec.md:84`) says "marquee capture committed"; all six
    screenshots and the WebM/GIF capture live under ignored `.conductor/`
    and are untracked (`phase-5.md:100,124`).
  - **Why:** The acceptance criterion is literal; ignored captures are not
    preserved with the branch or PR.
  - **Fix:** Force-add the required screenshots and marquee GIF to the repo
    (the approved spec explicitly requires them committed), then verify with
    `git ls-files` and record the deviating from the general media-binary
    guidance in the PR body.
  - **Requirement:** AC-9
  - **Test gap:** Git-state check (`git ls-files`) plus evidence review.

### Low

- <none>

## Overrides

- <none>

## Plan compliance

P1–P5 statuses, checkpoints and evidence files match the branch. Audited but
unchanged files in P4 Touches are documented. No sim/save/voxel/dependency
changes. The only plan/spec conflict is F2.

## Out of scope

- Physical device-lab verification remains human-only and owner-scheduled.
- Audio/crossfade and volume-slider rewrites were not attempted.
- Roster expansion and global-pacing decisions belong to other tracks.

## Debt

- <none; strict mode requires all findings fixed or explicitly overridden>

## Doc sync

`pending` — post-review sync will update `review.md` and `metadata.json` after
the Review Fixes phase.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 2 | 0 | 0 |
