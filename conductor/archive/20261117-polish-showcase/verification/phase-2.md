# Phase 2 Verification — Bundled assets, new CC0 pack & wiring

- Track: `20261117-polish-showcase` (Polish & Showcase)
- Phase: 2 — Bundled assets, new CC0 pack & wiring
- Date: 2026-11-17
- Branch: `feat/20261117-polish-showcase`
- Base commit: `78c8d2893431919bd28f2ae874880f5995f9b076`
- Head commit: `411a393e4b66f88366f3cd31c3a2f03d4eaad2b7`
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Unit (targeted) | `bun test apps/client/src/audio/cueUrls.test.ts apps/client/src/audio/beds.test.ts --timeout 120000` | 0 | 5 pass / 0 fail, 115 expect() calls |
| Full gate (verify + build) | `bun run verify && bun run build` | 1 (first run) | Unit 4176 pass / 1 skip / 0 fail; determinism + build green; **Biome failed on 3 formatting/import-order findings in `beds.ts` and `cueUrls.test.ts`** (no logic failures) |
| Full gate (verify + build) | `bun run verify && bun run build` | 0 (after fix) | Unit 4176 pass / 1 skip / 0 fail (491282 expect() calls, 4177 tests / 375 files); Biome checked 941 files, no fixes; `gate:determinism` OK for all 45 species-stage checks + 5 props; client Vite build OK (418 modules, exited 0) |

Note: `biome` is not on the shell PATH; Biome runs inside the `bun run verify` script. Formatting fixes were applied via edits (no direct `biome` command was possible). The single failed gate was resolved on the first fix attempt and re-run green — no logic failures occurred at any point.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-2 | Ten new SFX + one music bed bundled, wired through `cueUrls`/`beds`, with exact provenance rows | `cueUrls.ts` folds `PresentationCueId` into `AnyCueId` and maps all 10 ids to `/audio/sfx/*.ogg`; `beds.ts` adds `"cup"` → `/audio/music/cup.ogg`; `CREDITS.md` rows for all 11 files; 11 binaries committed (`git diff --stat` base..head) | verified |
| FR-3 | One additional CC0-only pack sourced, license vetted, provenance recorded | Kenney UI Audio vetted CC0 (see License evidence below); all 10 SFX credited to it; no ambiguous-license asset bundled | verified |
| AC-2 | New asset URLs resolve; `CREDITS.md` has a row per bundled file | Automated test in `cueUrls.test.ts` ("every bundled cue and bed URL is named in CREDITS.md") reads `CREDITS.md` and asserts every `cueUrl`/`bedUrl` relative path appears; green in full gate | verified |
| AC-3 | New pack license verified CC0; provenance + transcode documented | Kenney UI Audio CC0 evidence below; `music/cup.ogg` row records OGA page, author, CC0, and "transcoded to OGG q3, metadata stripped" | verified |
| FR-10 | All changes confined to `apps/client/src` and `apps/client/public/audio` | `git diff --stat` base..head lists only those two trees plus this evidence file | verified |

## Evidence paths

- `apps/client/src/audio/cueUrls.ts` — `AnyCueId` now includes `PresentationCueId`; `CUE_IDS` + `cueUrl` carry the 10 new ids.
- `apps/client/src/audio/cueUrls.test.ts` — exhaustive literal list extended to 26 ids; new automated provenance check against `CREDITS.md`.
- `apps/client/src/audio/beds.ts` — third `BedScene` `"cup"` with `/audio/music/cup.ogg`.
- `apps/client/src/audio/beds.test.ts` — expects the three scene beds (`arena`, `cup`, `ranch`).
- `apps/client/public/audio/CREDITS.md` — 10 new SFX rows + `music/cup.ogg` row + source bullet.
- `apps/client/public/audio/sfx/{ui-navigate,ui-navigate-calm,ui-confirm,ui-confirm-calm,cup-transition,cup-transition-calm,evolution,evolution-calm,graduation,graduation-calm}.ogg` — 10 bundled SFX (byte-for-byte copies from Kenney UI Audio `Audio/`).
- `apps/client/public/audio/music/cup.ogg` — 586,308-byte Vorbis q3 music bed.
- Full verification output: `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_1e92cffe30018Ykei5zALOW28R.out`.

## Source license / provenance evidence (exact)

**Kenney UI Audio (new CC0 pack, FR-3)** — https://kenney.nl/assets/ui-audio
- Asset page states "License: Creative Commons CC0".
- In-pack `License.txt` states: "UI SFX Set by Kenney Vleugels (Kenney.nl) — License (Creative Commons Zero, CC0) — http://creativecommons.org/publicdomain/zero/1.0/ — You may use these assets in personal and commercial projects. Credit ... is not mandatory."
- Mapping (`Audio/` original → bundled): `rollover1.ogg`→`ui-navigate.ogg`, `rollover4.ogg`→`ui-navigate-calm.ogg`, `click1.ogg`→`ui-confirm.ogg`, `click4.ogg`→`ui-confirm-calm.ogg`, `switch18.ogg`→`cup-transition.ogg`, `switch20.ogg`→`cup-transition-calm.ogg`, `switch30.ogg`→`evolution.ogg`, `switch32.ogg`→`evolution-calm.ogg`, `switch38.ogg`→`graduation.ogg`, `switch36.ogg`→`graduation-calm.ogg`. Copies are byte-for-byte; `-calm` variants are intentionally distinct, softer source files from the same pack.

**OpenGameArt "8-Bit Victory Loop" by Wolfgang_ (new music bed, FR-2)** — https://opengameart.org/content/8-bit-victory-loop
- Page lists license **CC0**; original file `8bitvictory_0.ogg` (1.8 MB / 53.3 s).
- Bundled `music/cup.ogg` is a Vorbis q3 transcode (586,308 bytes) with metadata stripped; no other edits.
- OpenGameArt is an already-credited source in `CREDITS.md`; no new source family introduced.

## Deviations

None. All changes stayed within the brief's `Touches` paths. The evidence file was written under `conductor/tracks/20261117-polish-showcase/verification/` as instructed and left uncommitted for the primary's state commit.

## Notes

- Task-level commits (no `--amend`): `7617bfc9` assets(audio) binaries + CREDITS.md; `00fcb769` feat(audio) URL-table wiring + tests; `411a393e` style(audio) Biome formatting fixes.
- `AnyCueId` widening was checked against all consumers (`player.ts`, `playCue.ts` use it as a Map key/param type only; no exhaustive switches). `BedScene` widening is consumed generically by `musicBeds.ts` (`Map<BedScene, ...>`, `bedUrl[scene]`) — no player change required, as the brief anticipated.
- The first full gate failed only on Biome formatting/import ordering, fixed in one attempt; the re-run was fully green. No product/design decision was required and no blockers occurred.

## Primary verification

Independent primary-agent check of the squashed phase:

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Full verify + build | `bun run verify && bun run build` | 0 | check OK; 4176 pass / 1 skip / 0 fail (491282 expect() calls, 375 files); Biome clean (941 files); determinism gate OK (all 15 species + 5 props byte-identical); client build exit 0 |
| Worktree | `git status --porcelain` | 0 | only untracked `verification/phase-2.md` (left for the primary state commit) |
| Scope | `git diff --name-only 78c8d289..HEAD` | 0 | 16 files: 11 audio binaries + CREDITS.md + cueUrls/beds source+tests — all within Touches |

Phase accepted: all P2 tasks complete, AC-2 and AC-3 satisfied (automated CREDITS.md provenance test), no unreported files.
