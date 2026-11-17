# Integrated verification — 20261117-polish-showcase

- **Track:** 20261117-polish-showcase — Polish & Showcase
- **Branch:** `feat/20261117-polish-showcase`
- **Base:** `main` @ `23c6750900cb3285dc36d399a29a15061a73c3cb`
- **Head at verification:** `dc90e3a2` (all five phases verified)
- **Date:** 2026-11-18
- **Result:** PASS

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit + lint + determinism (configured `verify`) | `bun run verify && bun run build` | 0 | 4201 pass / 1 skip / 0 fail (491,422 `expect()` calls, 377 files); Biome 945 files clean; determinism gate OK (15 species × 3 stages + 5 props byte-identical); Vite build 420 modules, exit 0. |
| determinism (standalone) | `bun run gate:determinism` | 0 | `determinism gate OK`: 45 species GLBs byte-identical; 5 prop seed-42 digests match. |
| module caps | included in `bun run verify` (module-size tests) | 0 | Client/sim 12,288 B and voxel 24,576 B caps honored; no new module added above cap. |
| visual | `playwright-cli` against `bun run dev` (desktop 1440×900, iPhone 15 393×852) | 0 | 6 screenshots on disk, console 0 errors / 0 warnings, single polite live region, visible focus, no horizontal scroll at 393×852 or 852×393. |
| marquee capture | `playwright-cli video-start` / `video-stop`, ffmpeg GIF transcode | 0 | WebM + ≤10 MB / ≤10 fps GIF of arena → Champion verdict → graduation confirm on disk (gitignored). |

## Phase checkpoints

| Phase | Name | Checkpoint | Evidence |
| --- | --- | --- | --- |
| 1 | Pure cue-table expansion & calm parity | `69d1da09` | `verification/phase-1.md` |
| 2 | Bundled assets, new CC0 pack & wiring | `975ab968` | `verification/phase-2.md` |
| 3 | Ducking mix envelope | `578ec550` | `verification/phase-3.md` |
| 4 | Accessibility & legibility | `8eb89f6f` | `verification/phase-4.md` |
| 5 | Showcase evidence & capture | `ae6d6ee0` | `verification/phase-5.md` |

## Invariants

- `SIM_VERSION` unchanged; no sim, battle, save-schema, voxel or dependency
  changes (FR-10). Final determinism hash stays `0xff6f3d62`; balance cap share
  stays 224/840 (26.7%).
- All new audio is CC0 with exact `CREDITS.md` provenance and an automated
  completeness test over every `cueUrl`/`bedUrl` path.
- Ducking restores the exact user music volume and applies only to punctuation
  cues (KO/verdict/cup/evolution/graduation), never routine UI clicks.
- Reduced-motion calm variants and silent instant dumps remain correct.
- Accessibility pass keeps the shared polite live region singular and never
  steals focus; UX principle 8 holds at 393×852 and 852×393.
- Physical device-lab verification remains human-only and out of scope.

## Conclusion

The full configured verification strategy is green on the completed branch. The
integrated check is independent of the per-phase runs and confirms that the
combined change set preserves determinism, module caps, build, console and
mobile layout. Result: PASS.
