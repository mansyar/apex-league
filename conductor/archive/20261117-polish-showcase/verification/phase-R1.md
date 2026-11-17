# Phase R1 Verification — Review fixes (F1, F2)

- **Track:** `20261117-polish-showcase`
- **Phase:** R1 — Review Fixes
- **Date:** 2026-11-18
- **Branch:** `feat/20261117-polish-showcase`
- **Phase base commit:** `3854d6815f1ce1502fe21f7c17e0bbe366ac2d95`
- **Implementation head commit:** `ee2056f431bfbb03084cb442a7d7d54ea306ac7a`
- **Result:** **verified** — F1 (one perceivable results line) and F2 (committed captures) both resolved; mandatory gate green.

## Commands

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| Mandatory | `bun run verify && bun run build` | 0 | `4205 pass`, `1 skip`, `0 fail`, `491435 expect() calls`; `Ran 4206 tests across 377 files. [67.39s]`. Biome: `Checked 945 files in 633ms. No fixes applied.` Determinism gate OK (15 species × 3 stages + 5 props). Build: `✓ 420 modules transformed`, `✓ built in 306ms`; only the non-fatal >500 kB chunk warning. `announcer.test.ts` F1 tests green inside this run. |
| Capture tracking | `git ls-files .conductor/evidence/20261117-polish-showcase .conductor/media/20261117-polish-showcase` | 0 | Exactly the 6 target PNGs + the marquee GIF are tracked; no WebM, `.keep`, or phase-4 captures (output below). |

## Findings fixed

| Finding | Fix | Test evidence |
|---------|-----|---------------|
| **F1** — cup verdict silenced: `showResults()` made two synchronous `announce()` calls, so the advancement line overwrote the verdict in the single live region (`results.ts:56-62`, `announcer.ts:106`). | New pure `resultsAnnouncement(verdict, advancement, options)` in `announcer.ts` folds both through `announcementFor` into one line; `results.ts` now calls `announce.say(line)` once. `coalesce()` deliberately not used (it keeps only the last line). Instant dumps stay silent; reduced motion keeps calm wording. | Pure tests in `announcer.test.ts` assert both parts are present, `null` on `{instant:true}`, no `!` under `{reducedMotion:true}`, and no `·`; an imperative test asserts one polite atomic region holds the full combined line with zero focus calls. Commit `1db3e611`. |
| **F2** — AC-9 marquee capture uncommitted: captures lived under gitignored `.conductor/`. | `git add -f` on exactly the six `phase-5-*.png` screenshots and `phase-5-cup-run.gif`; verified with `git ls-files`. Commit `ee2056f4`. | `git ls-files` output below lists exactly those seven files. No other `.conductor/` artifacts committed. |

## `git ls-files` output

```
.conductor/evidence/20261117-polish-showcase/phase-5-desktop-graduation.png
.conductor/evidence/20261117-polish-showcase/phase-5-desktop-hud.png
.conductor/evidence/20261117-polish-showcase/phase-5-desktop-results.png
.conductor/evidence/20261117-polish-showcase/phase-5-phone-graduation.png
.conductor/evidence/20261117-polish-showcase/phase-5-phone-hud.png
.conductor/evidence/20261117-polish-showcase/phase-5-phone-results.png
.conductor/media/20261117-polish-showcase/phase-5-cup-run.gif
```

## Deviations

- `.conductor/` is gitignored, and general guidance is not to commit media binaries. Phase R1 force-adds seven captures as an explicit exception because owner-approved **AC-9** requires the marquee capture to be committed. `.gitignore` was not edited (outside Touches). The WebM, `.keep` files and phase-4 PNGs remain untracked.

## Notes

- Task commits: `1db3e611` (R1.T1), `ee2056f4` (R1.T2). No `--amend`; no other behavior changes.
- The brief's Touches entry `verification/phase-R1.md` resolves to this file under the track's `verification/` directory, per its Evidence section.
- The primary should carry the AC-9 binary-commit exception into the PR body.

## Primary verification

| Check | Command | Result |
| --- | --- | --- |
| mandatory | `bun run verify && bun run build` | exit 0 — 4205 pass / 1 skip / 0 fail (491,435 `expect()` calls, 377 files), Biome 945 files clean, determinism gate OK (45 species GLBs + 5 prop digests), Vite build 420 modules exit 0. |
| scope | `git status --porcelain` + `git diff --name-only 3854d681..HEAD` | clean tree; 11 files, all within Touches (3 client source/test + 7 captures + this evidence). |
| commits | `git log --oneline --max-count=5 3854d681..HEAD` | `c412f398` evidence, `ee2056f4` captures, `1db3e611` F1 fix. |
| AC-9 proof | `git ls-files .conductor/evidence/20261117-polish-showcase .conductor/media/20261117-polish-showcase` | exactly the six `phase-5-*.png` screenshots and `phase-5-cup-run.gif` tracked; no WebM or other artifacts. |
| AC-5 proof | `results.ts` source inspection + `announcer.test.ts` assertions | `resultsAnnouncement()` composes a single `say()` line containing verdict + advancement; tests assert both parts, instant silence and reduced-motion calm wording. |

F1 and F2 are resolved. Result: verified.
