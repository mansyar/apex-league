# Phase 3 Verification — Ducking mix envelope

- Track: `20261117-polish-showcase` (Polish & Showcase)
- Phase: 3 — Ducking mix envelope
- Date: 2026-11-17
- Branch: `feat/20261117-polish-showcase`
- Base commit: `78ee1e9b42d23c87f7d0e05b21c2a3c9bc5b2520`
- Implementation head commit: `cd8a68533dfed4a91dc2024f76c6f5309df8b368`
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Full gate (verify + build), run 1 | `bun run verify && bun run build` | 1 | `check` failed: 13 × `TS18048` in `duck.test.ts` (`noUncheckedIndexedAccess` on `FakeAudio.created[0/1]`). No logic/test failures. |
| Full gate (verify + build), run 2 | `bun run verify && bun run build` | 1 | Type-check green; 4188 pass / 1 skip / 0 fail; Biome found 3 formatting/import-order issues (`duck.test.ts` imports, `musicBeds.ts` two expressions). |
| Full gate (verify + build), run 3 (final) | `bun run verify && bun run build` | 0 | `check` ✓ all packages; 4188 pass / 1 skip / 0 fail, 491369 `expect()` calls across 4189 tests / 376 files; Biome checked 943 files, no fixes; `gate:determinism` OK (45 species-stage + 5 prop checks); `@apex/client build` ✓ 419 modules, exited 0. |

Both failures were style/type strictness in the newly authored test file, not behaviour; each was resolved with one edit batch (2 fixes total, within the brief's retry limit). No lockfiles or generated files were touched.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-4 | Pure, bun-tested ducking envelope dips music under verdict/KO/evolution cues and restores the user music volume; no breaking public-contract change to `AudioPlayer`/`MusicBeds` | `duck.ts` exports `DUCK_FACTOR=0.28`, `DUCK_MS=900`, `ducksFor`, `DuckEnvelope` (no DOM, no internal clock). `duck.test.ts` covers factor/expiry/clear, exhaustive `ducksFor` over `CUE_IDS`, and `AudioPlayer`'s optional hook firing only past the unlock/mute/SFX gates. `AudioPlayer` keeps its one-arg constructor; `MusicBeds.setDuck` is additive. Full gate green. | verified |
| NFR-6 | Ducking restores the exact user volume after mute toggles or scene changes mid-duck | DOM-free composed-contract tests in `duck.test.ts` stub `window` timers, `Audio` and `Date.now`, drive the single mixer ticker, and assert `arena.volume` returns to the identical captured `userLevel` float after mute→unmute→scene change mid-duck and window expiry. Second test covers a volume change + new bed mid-duck. | verified |
| AC-4 | Ducking unit tests (duck, restore, mute toggle, scene change) pass | `bun run verify && bun run build` final run: 4188 pass / 0 fail, including all `duck.test.ts` cases; build and determinism gate green. | verified |

## Evidence paths

- `apps/client/src/audio/duck.ts` — pure envelope + priority-cue set.
- `apps/client/src/audio/duck.test.ts` — pure envelope tests, exhaustive `ducksFor`, player-hook gating tests, and two DOM-free `MusicBeds` composition tests.
- `apps/client/src/audio/player.ts` — additive `CueHook` type and optional second constructor parameter; notify is gated and exception-swallowed.
- `apps/client/src/audio/musicBeds.ts` — `setDuck`, duck-aware `target()`, `retargetDuck`, per-fade `delta`, single-ticker boundary detection.
- `apps/client/src/app/audio.ts` — one `DuckEnvelope` wired to the player hook and `beds.setDuck`, exposed as `AudioWiring.duck`; stale "two music beds" comment corrected to three.
- Full verification output: `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_1e93bf9ff001GWzj336KIj3Xuh.out`

## How exact restoration is guaranteed

1. `DuckEnvelope.gain(now)` returns the literal `1` outside the window (not a gradient), so there is no residual attenuation to accumulate.
2. `MusicBeds.target(gain)` recomputes `BED_VOLUME * this.volume * gain` from the stored user `volume` on every composition; a duck only changes the `gain` argument, never the stored `volume`, `muted` or `current` state.
3. Fades write `el.volume = fade.target` verbatim on arrival, so the element lands on the exact recomputed value rather than an incremental approximation.
4. `setMuted` and `setScene` both call `target()` with the *current* envelope gain, so mute toggles and scene changes compose with a duck instead of clearing it; when the window ends, the current bed is re-targeted through the existing ticker to `BED_VOLUME * volume * 1`.
5. The single 100 ms mixer ticker stays alive while a bed is current, so a duck start/end is observed even when no crossfade is in flight — no second timer is used, and the 1200 ms crossfade delta is untouched (duck re-targets use a separate 200 ms delta).

## Deviations

None. All code/test changes stayed inside the brief's `Touches` paths; this evidence file is the only write outside them. No product or design decision required escalation.

## Notes

- Task-level commit (no `--amend`): `cd8a6853` `feat(audio): duck music under priority cues with exact restoration`.
- `ducksFor` treats only the punctuation cues as priority ducks: `ko`, `ko-bell`, `verdict-0`, `verdict-1`, plus `cup-transition`, `evolution`, `graduation` and their `-calm` variants. Routine `ui-navigate`/`ui-confirm` (and their `-calm` variants), ordinary battle hits and care cues are excluded — ducking UI clicks would pump the music on every interface interaction. Narrowed from the earlier full presentation-cue set to match FR-4's punctuation scope.
- The player hook is invoked with every audible cue, and `ducksFor` is applied in `createAudioWiring`, keeping `duck.ts` pure and letting every `player.play()` call site (including cup/evolution/graduation cues from other phases) duck automatically.
- The single-ticker design keeps the interval alive while a bed is current; this is required so a window boundary is detected when no crossfade is in flight. It does not add a timer and preserves first-gesture `resume()` and the silent no-op fallback.

## Rework (FR-4 scope narrowing)

- Removed `ui-navigate`, `ui-navigate-calm`, `ui-confirm`, `ui-confirm-calm` from `DUCK_CUES` so routine interface clicks no longer pump the music; updated the `duck.ts` doc comment to describe the KO/verdict/cup-transition/evolution/graduation punctuation scope (and calm variants), excluding routine UI navigation/confirm.
- `duck.test.ts` now asserts `ducksFor` is true for `ko`, `ko-bell`, `verdict-0/1`, `cup-transition*`, `evolution*`, `graduation*`, and false for `ui-navigate*`, `ui-confirm*` and ordinary battle/care cues; the exhaustive `CUE_IDS` test still matches the narrowed set.
- Re-ran `bun run verify && bun run build`: exit 0 — 4189 pass / 1 skip / 0 fail (491369 `expect()` calls across 376 files), Biome checked 943 files with no fixes, `gate:determinism` OK, `@apex/client build` ✓ 419 modules. Green.
- Rework commit: `fix(audio): narrow ducking to punctuation cues, not UI clicks` (no `--amend`, no push).

## Primary verification

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Static/unit/determinism/build | `bun run verify && bun run build` | 0 | 4189 pass / 1 skip / 0 fail (491,369 `expect()` calls, 376 files); Biome 943 files clean; determinism gate OK (15 species + 5 props byte-identical); client build 419 modules, exit 0. |
| Scope | `git status --porcelain`, `git diff --name-only 78ee1e9b..HEAD` | 0 | Clean tree; only the five `Touches` code files plus this evidence file changed. |
| Commits | `git log --oneline --max-count=6 78ee1e9b..HEAD` | 0 | `1943fd13` rework, `bbb050c1` evidence, `cd8a6853` implementation — all task-level, no `--amend`. |

Primary independently re-ran the exact verification command after the FR-4 scope rework and confirmed the narrowed `DUCK_CUES` set (`ko`, `ko-bell`, `verdict-0/1`, cup-transition/evolution/graduation incl. calm variants; UI navigation/confirm excluded). Result: verified.
