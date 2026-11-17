# Phase 1 Verification — Pure cue-table expansion & calm parity

- Track: 20261117-polish-showcase — Polish & Showcase
- Phase: 1 — Pure cue-table expansion & calm parity
- Date: 2026-11-17
- Branch: feat/20261117-polish-showcase
- Base commit: `2d0655b2a53a4832d0823147dc81771d4de9cfe8`
- Head commit (code): `7cdd6525adf4f2bc59a2199ccfb427488ccd1f98`
  - `35828c529969a355f8fc652e2ba74c29d0abf066` — P1.T1: extend the cue mapping (`cues.ts`)
  - `7cdd6525adf4f2bc59a2199ccfb427488ccd1f98` — P1.T2: pure cue tests (`cues.test.ts`)
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| TDD red (targeted) | `bun test apps/client/src/audio/cues.test.ts` | 1 | Expected failure before implementation: `SyntaxError: Export named 'cueForPresentationEvent' not found` (0 pass / 1 fail / 1 error). |
| TDD green (targeted) | `bun test apps/client/src/audio/cues.test.ts` | 0 | 18 pass / 0 fail / 50 expect() calls after implementing the table. |
| Full verify (attempt 1) | `bun run verify && bun run build` | 1 | `bun run check`, `bun test --check --parallel` (4175 pass / 1 skip / 0 fail) and determinism gate passed; Biome failed on import ordering in `cues.test.ts` (`assist/source/organizeImports`, fixable). |
| Full verify (final) | `bun run verify && bun run build` | 0 | check OK; 4175 pass / 1 skip / 0 fail / 491221 expect() calls across 375 files; Biome clean (941 files, no fixes applied); determinism gate OK; client build OK (418 modules transformed, exit 0). |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | DOM-free, gate-checked cue table expanded with UI navigate/confirm, cup-transition and evolution/graduation cues, including calm variants; pure tests | `cues.ts`: `PresentationCueId` (10 ids), `PresentationCueEvent` (5 kinds), `PresentationCueOptions`, `cueForPresentationEvent`; `cues.test.ts`: `cueForPresentationEvent` suite (8 tests) | verified |
| FR-8 | Reduced-motion parity: calm-mix variants and silent instant dumps remain correct after cue expansion | "reduced motion selects the calm variant of every new cue" (5 variants) + "an instant dump stays silent for every event, even under reduced motion" (5 events x plain/reduced) + "gate precedence: mute wins over calm and instant" | verified |
| AC-1 | Pure cue tests cover all new cue types including calm variants | Tests cover mute gate, navigate, confirm, cup-transition, evolution, graduation, all five calm variants, unmapped kind, and gate precedence — 18 tests pass in the file | verified |
| AC-8 | Reduced-motion mode yields calm variants and silent dumps | Calm-variant test asserts all five `-calm` ids; instant-dump test asserts `null` for all five events with and without `reducedMotion` | verified |

Edge case (unmapped failure): "an unmapped event kind stays silent rather than throw" passes `{ kind: "mystery" } as unknown as PresentationCueEvent` and expects `null`, proving the `default:` branch never throws on persisted/replayed data.

## Design note / scope

The ten new ids deliberately stay in a separate `PresentationCueId` union rather than being added to `CueId`: `cueUrls.ts` (Phase 2 Touches) holds an exhaustive `Record<AnyCueId, string>` over `CueId`, so widening that union in Phase 1 would fail the typecheck until Phase 2 bundles the URLs. A doc comment in `cues.ts` records this seam for Phase 2, which folds these ids into `AnyCueId` / `cueUrl` / `CUE_IDS`. `PresentationCueOptions` extends the shared `CueOptions` with an optional `instant` flag, so persisted settings continue to structurally satisfy the unchanged `cueForStep` / `careCueForEvent` call sites. No module outside the two Touches was modified.

## Evidence paths

- `apps/client/src/audio/cues.ts`
- `apps/client/src/audio/cues.test.ts`
- `conductor/tracks/20261117-polish-showcase/verification/phase-1.md`

## Deviations

None. Only the evidence file was added outside the two code Touches, as permitted by the brief.

## Notes

- TDD followed: failing test written first (red), implementation added (green), then full verification.
- One verification fix applied (Biome import ordering in `cues.test.ts`) — within the two-attempt limit; final run is fully green.
- Working tree is clean after the two task-level commits plus this evidence commit. No `--amend`, no push/merge/rebase/reset.
