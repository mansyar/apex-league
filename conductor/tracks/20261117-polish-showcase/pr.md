## Summary

This track gives the deployed vertical slice a bounded polish and showcase
pass: ten new CC0 presentation cues (with reduced-motion calm variants), a
third music bed, a pure music-ducking envelope, and a single polite live-region
announcer with visible keyboard focus. The result is proven with desktop and
393 px mobile captures, a marquee cup-run clip, and an unchanged determinism
gate — no simulation, save-schema, voxel or dependency changes.

## Track

- **ID:** `20261117-polish-showcase`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261117-polish-showcase/spec.md`](conductor/archive/20261117-polish-showcase/spec.md)
- **Plan:** [`conductor/archive/20261117-polish-showcase/plan.md`](conductor/archive/20261117-polish-showcase/plan.md)
- **Review:** [`conductor/archive/20261117-polish-showcase/review.md`](conductor/archive/20261117-polish-showcase/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Pure cue-table expansion & calm parity | UI navigate/confirm, cup, evolution and graduation cues with calm variants | verified | `69d1da09` | Pure presentation cue union kept separate until URLs existed. |
| 2: Bundled assets, new CC0 pack & wiring | New SFX + bed from credited packs, one new CC0 pack, URL-resolvable and attributed | verified | `975ab968` | Kenney UI Audio + OGA "8-Bit Victory Loop"; automated `CREDITS.md` completeness test. |
| 3: Ducking mix envelope | Music dips under priority cues and restores exact user volume | verified | `578ec550` | Reworked to exclude routine UI clicks from ducking. |
| 4: Accessibility & legibility | Four event classes announced politely, focus visible, 393 px bar holds | verified | `8eb89f6f` | One shared polite region; KO already covered by existing regions. |
| 5: Showcase evidence & capture | Desktop/mobile screenshots, clean console, one marquee cup-run capture | verified | `ae6d6ee0` | Six screenshots + WebM/GIF capture; determinism, module caps and full verify green. |
| R1: Review Fixes | Fix review findings F1 and F2 | verified | `1655bb57` | Combined perceivable results line + committed captures; full gate re-run green. |

## Requirements

- [x] `FR-1` — DOM-free, gate-checked presentation cue table with calm variants (`apps/client/src/audio/cues.test.ts`)
- [x] `FR-2` — Bundle new SFX and a music bed from credited packs, wired through `cueUrls`/`beds` (`cueUrls.test.ts`, `beds.test.ts`)
- [x] `FR-3` — Source one additional CC0-only pack, transcode to `.ogg`, record exact provenance (`CREDITS.md`, automated completeness test)
- [x] `FR-4` — Pure, unit-tested ducking envelope that restores user volume without changing public APIs (`duck.test.ts`)
- [x] `FR-5` — Polite live-region announcements for verdict, KO, cup advancement and save/load (`announcer.test.ts`, visual pass)
- [x] `FR-6` — Visible keyboard focus on changed surfaces (visual pass)
- [x] `FR-7` — Guideline-compliant tooltip/stat copy (copy audit in `verification/phase-4.md`)
- [x] `FR-8` — Reduced-motion calm variants and silent instant dumps stay correct (`cues.test.ts`, `duck.test.ts`)
- [x] `FR-9` — Desktop + iPhone screenshots, clean console and one marquee cup-run capture (`verification/phase-5.md`)
- [x] `FR-10` — Changes confined to client code and audio assets (diff scope + determinism gate)
- [x] `NFR-1` — Determinism byte-identical, `SIM_VERSION` unchanged (`gate:determinism`, final hash `0xff6f3d62`)
- [x] `NFR-2` — Module-size caps honored (module-size tests in `verify`)
- [x] `NFR-3` — CC0-only assets with provenance; no new dependency (`CREDITS.md`, provenance test)
- [x] `NFR-4` — Audio failures swallowed; first-gesture unlock preserved (`player.ts`, `musicBeds.ts`)
- [x] `NFR-5` — UX principle 8 holds at 393×852 and 852×393 (visual pass)
- [x] `NFR-6` — Ducking restores exact user volume across mute/scene changes (`duck.test.ts`)
- [x] `AC-1` — Pure cue tests including calm variants (`cues.test.ts`)
- [x] `AC-2` — Every cue/bed URL resolves and has a `CREDITS.md` row (`cueUrls.test.ts`)
- [x] `AC-3` — New pack license vetted CC0 and transcode documented (`CREDITS.md`)
- [x] `AC-4` — Duck/restore/mute/scene tests pass (`duck.test.ts`)
- [x] `AC-5` — All four live-region events observed without focus theft (visual pass)
- [x] `AC-6` — Focus visible in the visual pass (screenshots)
- [x] `AC-7` — Copy audit complete (`verification/phase-4.md`)
- [x] `AC-8` — Calm variants and silent dumps verified (`cues.test.ts`, `duck.test.ts`)
- [x] `AC-9` — Screenshots, console check and capture committed (`verification/phase-5.md`)
- [x] `AC-10` — Determinism, module-size and full verify green (`verification/integrated.md`)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| typecheck | `bun run check` | pass | 44 server + 528 client files, no type errors |
| lint/format | `bunx biome check` | pass | 945 files, no fixes (`biome` resolves via `bun run verify`) |
| unit | `bun test --timeout 120000` | pass | 4205 pass / 1 skip / 0 fail, 491,435 `expect()` calls (final R1 run) |
| determinism | `bun run gate:determinism` | pass | 45 species GLBs + 5 prop digests byte-identical |
| build | `bun run build` | pass | Vite 420 modules, exit 0 |
| visual | `playwright-cli` against `bun run dev` | pass | 6 screenshots, console 0 errors/0 warnings, 393×852 / 852×393 |
| integrated | `bun run verify && bun run build` | pass | `conductor/archive/20261117-polish-showcase/verification/integrated.md` |

## Media

Marquee cup run — arena entry through Champion verdict into the graduation
confirm modal, captured at `07c04c50` (8 fps, 6.1 MB):

![Marquee cup run](.conductor/media/20261117-polish-showcase/phase-5-cup-run.gif)

## Review

- **Verdict:** PASS (round 1 PASS WITH FINDINGS, round 2 delta PASS)
- **Rounds:** 2
- **Fixed:** 2 Medium findings — F1 (cup verdict line overwritten in the
  single live region) and F2 (AC-9 captures uncommitted).
- **Accepted/deferred:** none; no overrides required. See `review.md`.

## Deviations and risks

- Cloud status paragraph dropped its implicit `role="status"` to avoid
  double-speaking with the shared announcer; the queue count paragraph keeps
  its own status role.
- The graduation screenshot used a crafted in-browser save because natural
  eligibility needs 60 in-game days; no product code or config changed.
- The cup music bed is bundled and addressable but not switched on; no
  in-scope file owns a bed handle, and cross-layer coupling was avoided.
- AC-9 explicitly requires the marquee capture to be committed, so six
  screenshots and the marquee GIF were force-added under `.conductor/` despite
  the general no-media-binaries guidance. `.gitignore` was not modified; the
  WebM and phase-4 screenshots remain untracked.
- Physical device-lab verification remains human-only and is deferred to the
  owner after merge.

## Follow-ups

- Owner schedules the human-only physical device-lab pass.

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit <squash-commit>
```

No migration, feature flag, or data change is introduced by this track.
