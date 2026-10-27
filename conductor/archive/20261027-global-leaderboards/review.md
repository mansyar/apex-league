# Review — 20261027-global-leaderboards (Global Leaderboards)

- Track: `20261027-global-leaderboards`, type `feature`, priority `high`
- Branch: `feat/20261027-global-leaderboards`
- Range: `0e5e006d..HEAD` (per-phase: `0e5e006d..34a26385`, `9b53829d..df16447c`, `f5f0d943..3fdc8b69`, `6f674696..c43d90eb`)
- Date: 2026-10-27 (UTC)
- Verdict: **PASS** — round 1 BLOCK (F1) fixed and confirmed in round 2. No open findings.
- Strategy: 30 files / ~2859 lines → per-phase checkpoint review (P1 `34a26385`, P2 `df16447c`, P3 `3fdc8b69`, P4 `c43d90eb` evidence-only) + cross-phase integration check. Reviewer ran without shell; primary validated F1 against the code and confirmed it.

## Summary

Four boards (cup wins, ladder, AP, collection) with per-trainer-best storage,
plausibility caps, competition ranking, top-100 lists, and newest-name refresh
on the server; quiet auto-submit riding the save push; a Board tab with live,
empty, loading, offline-snapshot, and calm-error states plus a two-profile
browser-proven two-device check. Full gate green at acceptance: check 0, suite
3224/0, Biome clean, verify 0, build 0. One blocking defect found in review:
the P3 saveless-signin fix conflates a failed first upload with nothing to
upload, letting the caller overwrite the failure status with "synced".

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| static | `bun run check` | exit 0, all workspaces | primary run 2026-10-27 |
| unit | `bun test --check --parallel=4 --timeout 120000` | exit 0: 3224 pass, 1 skip, 0 fail (300 files) | primary run 2026-10-27 |
| gate | `bun run verify` (exact CI gate) | exit 0 | primary run 2026-10-27 |
| build | `bun run build` | exit 0 | primary run 2026-10-27 |
| visual | playwright-cli live/snapshot/error boards + two-device check | desktop + phone, 0 console errors both sessions | `.conductor/evidence/20261027-global-leaderboards/phase-{3,4}-*.png` |

## Requirements

All FR/NFR/AC covered (reviewer-confirmed against spec + in-suite pins):

- FR-1 auto-submit alongside the save push — covered (`submitIfChanged` in `pushNow`, derivation + quiet tests, push-path tests).
- FR-2 per-trainer best keyed by anonymous ID — covered (PK `(trainer_id, category)`, upsert keeps best).
- FR-3 plausibility caps + keep-last-valid — covered (`SCORE_CAPS`, 400 `invalid_value`, last-valid-stands).
- FR-4 ranked lists, newest name — covered (value-desc / updatedAt-asc / trainerId-asc, competition ranking, limit 100, public GET).
- FR-5 Board tab + states — covered (four lists, loading/empty/error, browser live render).
- FR-6 fetch-on-open + offline snapshot — covered (all-or-snapshot fallback, quiet note, calm error line, browser offline states).
- FR-7 name carried + refreshed — covered (name in submit body, store refreshes on every submit).
- NFR-1 save v25 untouched — covered (only server-side `0002_leaderboard.sql`; snapshots beside the save).
- NFR-2 non-blocking quiet submit — covered (never throws/awaits, snapshot moves only on ok; F1 affects the first-upload status line, not the save push).
- NFR-3 no PII — covered (id + name + scores only; passphrase in body/header, never URL; reads passphrase-free).
- NFR-4 in-process route tests — covered (no ports).
- NFR-5 module caps — covered (`board/` split, main.ts trimmed to 12252 B).
- AC-1..AC-7 — covered (AC-6 via the two-profile browser check + submit/best-keep pins; AC-7 via green gate + build with no save migration).

## Findings

### F1 (High) — failed first upload reports "synced"

- File: `apps/client/src/cloud/sync.ts:211-214` (callers: sign-in not-found branch, createTrainer tail)
- What: `uploadLocal()` returns `false` both when there is nothing to upload and when the first-upload push fails. Both callers run `if (!(await uploadLocal())) setStatus({ kind: "synced", at: now() })`, so a failed first upload overwrites the just-set `failureStatus` with `synced`.
- Why High: a sign-in or trainer creation with a local ranch on an unreachable/refusing server reports "up to date" while the cloud copy was never stored — a correctness bug in the status contract, hiding the failure. Introduced by the P3 saveless-signin fix (this diff).
- Fix: distinguish handled-failure from nothing-to-upload — return `true` after `failureStatus(result)` (status already settled), keep `false` only for the payload/credentials/savedAt early returns; add a test that a rejected push on sign-in leaves the failure status, not synced. Phase R1.
- Test gap: no test pins the failed-first-upload status (the new P3 test pins only the nothing-to-upload path).

## Plan compliance

- All 4 phases verified with Result/Checkpoint/Evidence; 4/4 tasks `[x]`, none dropped.
- Diff stays within the union of phase Touches except accepted deviations:
  - P2: `api.ts` typed `submitScore` seam + tests (smallest seam, no duplication) — accepted.
  - P3: `api.ts`/`api.test.ts` `readBoard` seam (same precedent); `sync.ts` saveless-signin fix (blocking defect found in verification) + `sync.test.ts` pin; `main.ts` comment trim for the 12 KB cap — accepted.
  - P4: evidence only, Dockerfile 0-delta confirmed (migrate.ts auto-discovers `0002`) — accepted.
- Review-fix phase R1 appended for F1.

## Out of scope

- Ghost data, seasons, friend lists, live PvP, share buttons, server-side replay verification (spec Out of Scope; untouched).
- Biome unpinned via bunx (pre-existing, independent of this track).

## Debt

None. F1 was fixed in Phase R1 and confirmed in round 2; no issues filed (`review.issues.enabled` false path — everything resolved in-track).

## History

| Round | Verdict | C | H | M | L | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 0 | 0 | — |
| 2 | PASS | 0 | 0 | 0 | 0 | F1 fixed in R1 (`72f8440d`), confirmed by re-review |

## Doc sync

`conductor/product.md` Phase 3 roadmap carries the leaderboard landing note (approved, committed `ee358b93`); `metadata.json` `doc_sync: complete`. No product change needed for R1 (status-line-only fix).
