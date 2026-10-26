# Phase evidence — Client submit path

- Track: 20261027-global-leaderboards — Global Leaderboards
- Phase: 2 — Client submit path
- Date: 2026-10-28
- Branch: feat/20261027-global-leaderboards
- Base: 9b53829d63d3a24cd0ce09ca5fce5507799ab1b4
- Head: (phase commit, below)
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| unit (scoped) | `bun test --check apps/client/src/cloud --parallel=4 --timeout 120000` | 0 | 86 pass, 0 fail, 9 files |
| unit (full, brief gate) | `bun test --check --parallel=4 --timeout 120000` | 0 | 3189 pass, 1 skip, 0 fail, 296 files |
| typecheck | `bun run check` | 0 | all 4 workspaces clean (client 424 files) |
| lint/format | `bunx biome check apps/client/src/cloud` | 0 | 20 files, no findings |
| build | `bun run build` | 0 | client builds clean |

The smoke lines in the full run (`smoke: RESULT fail ... not an http(s) URL`)
are intentional-failure-path console noise from a passing smoke test —
the suite reports 0 fail.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| FR-1 | Cup/ladder results auto-submit alongside the save push | `scores.submitIfChanged` is called first in `pushNow` (`sync.ts`); every result flow reaches it through commit → adapter → push queue. Test: "a result push submits the changed scores next to the save" (`sync.test.ts`) | verified |
| AC-1 | Winning a cup produces a submission; the server keeps the best | Derivation test: cups read `cupsWon`; sync test pushes `cupsWon: 1` and asserts the submit carries `{ value: 1, name: "Ana" }`. Best-kept server-side (Phase 1) | verified |
| NFR-2 | Submit is non-blocking and quiet | Submitter never throws, never awaits, never touches sync status; snapshot moves only on `ok`, so a failed entry retries on the next push. Tests: throw/offline, 400 rejection, 401-style refusal — saves land `synced` every time; no user-visible copy added | verified |

## Evidence paths

- `apps/client/src/cloud/scores.ts` — derivation + `createScoreSubmitter` + snapshot
- `apps/client/src/cloud/scores.test.ts` — derivation and quiet-submitter tests
- `apps/client/src/cloud/sync.ts` — `scores.submitIfChanged(payload)` at the top of `pushNow`
- `apps/client/src/cloud/api.ts` — `ScoreCategory`, `ScoreSubmission`, `SubmitReceipt`, `submitScore`
- `apps/client/src/cloud/sync.test.ts` — fake `submitScore` + three push-path tests
- `apps/client/src/cloud/api.test.ts` — submit wire tests (path, body, 400 value)
- `apps/client/src/cloud/cloud-save.test.ts` — burst test pins 1 PUT + 4 score POSTs

## Deviations

| File | Reason |
|------|--------|
| `apps/client/src/cloud/api.ts` | In Touches-adjacent by necessity: the submit needs a typed wire method (`submitScore` + `ScoreCategory`/`ScoreSubmission`/`SubmitReceipt`), mirroring the existing push/pull pattern. Smallest change that keeps the union in one place (scores imports it; no duplicated constants). |
| `apps/client/src/cloud/api.test.ts` | Same seam's test: pins the submit wire contract. |
| `apps/client/src/cloud/cloud-save.test.ts` | The burst assertion counted every request as exactly one; the submit legitimately rides the same flush, so it now pins 1 PUT + 4 score POSTs (categories asserted). |

Product/design decisions resolved inside the phase (no blockers):

- **AP derivation:** no lifetime-AP counter exists in the save, so `ap` totals
  lifetime AP invested in training — the active pet's plus the stable's
  `trainingDays` (the sim stamps one per AP-spending program night). A
  graduation banks the retiree's past in the Hall while the server keeps the
  peak, so the board never slides backwards.
- **Collection breadth:** distinct `speciesId|stage|branch` identities across
  the active pet, the stable, and the Hall of Fame (a retired career counts as
  a champion of its archived branch). Duplicates collapse; forms split.
- **Hook point:** `pushNow`, not the cup screens — every result (cup, ladder,
  training, collection) already flows through the debounced push, so one hook
  covers all four boards with no cup-file changes.
- **Snapshot storage:** `apex.scores` beside the credentials, never inside the
  save; keyed by trainer id, so sign-out/signed-out states submit nothing and
  a different trainer starts fresh. A rename resubmits all four boards once.

## Notes

- First flush after sign-in submits all four boards (snapshot empty); later
  pushes submit only changed boards, proven by the no-resubmit tests.
- The submitter takes `Pick<CloudApi, "submitScore">`, so the fake surface in
  `sync.test.ts` stays one method.
