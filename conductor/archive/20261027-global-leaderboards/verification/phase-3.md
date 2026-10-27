# Phase 3 evidence — Board tab & offline snapshot

- Track: 20261027-global-leaderboards — Global Leaderboards
- Phase: 3 — Board tab & offline snapshot
- Date: 2026-10-27
- Branch: feat/20261027-global-leaderboards
- Base: f5f0d943bd9e995eebe89892181a173e9a2ee5ca
- Head: (phase commits, below)
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| unit (scoped) | `bun test --check apps/client/src/board apps/client/src/cloud --parallel=4 --timeout 120000` | 0 | 119 pass, 0 fail |
| unit (full) | `bun test --check --parallel=4 --timeout 120000` | 0 | 3224 pass, 1 skip, 0 fail, 300 files |
| typecheck | `bun run check` | 0 | all workspaces clean |
| lint/format | `bunx biome check apps/client/src/board apps/client/src/cloud` | 0 | 29 files, no findings |
| gate | `bun run verify` | 0 | check + suite + Biome + determinism green |
| build | `bun run build` | 0 | client builds clean |
| browser | Board pass vs live local server + client dev (steps below) | 0 | live / snapshot / no-snapshot states, desktop + phone, no app errors |

The browser drove a real server (`bun apps/server/src/main.ts` on a scratch
SQLite DB, seeded with one trainer + four submitted scores) and the client dev
server with `VITE_API_ORIGIN` pointed at it:

1. Fresh profile, sign in with the seeded id + passphrase: status settled to
   "Cloud copy is up to date." immediately (this caught and proves the
   uploadLocal fix below — before it, a saveless sign-in read stuck).
2. Boards chip → all four boards live (rank 1, Boardwalk Ada, 3 / 12 / 48 / 7),
   served values verbatim. Screenshots desktop + phone (390×844).
3. Server stopped, panel closed + reopened in the same page (storage intact) →
   the quiet "out of reach" note over the last boards, rows identical.
   Screenshot.
4. Fresh profile (each `open` starts clean storage) + server stopped → the calm
   error line with empty boards, no error plate. Screenshot.
5. Console: only `ERR_CONNECTION_REFUSED` resource entries for the deliberately
   stopped server; no JS exceptions, no app-level errors.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| FR-5 | Board tab with rank/name/value + loading/empty/error | `board/panel.ts` renders all four boards (rank, name, value per row), a loading line on every open, per-board empty words, and a calm error line; `board/copy.ts` owns the wording | verified |
| FR-6 | Fetch on open + offline last-snapshot with quiet note | `board/fetch.ts` `createBoardLoader` fetches all four boards on every open, writes the snapshot only when all four answer, and falls back to the whole snapshot otherwise; the panel paints the quiet offline note on snapshot reads | verified |
| AC-3 | Boards order value-desc, ties share rank deterministically, names current | Served ranks render verbatim (`boardRow` prints `entry.rank`; ties `[1,1,3]` pinned in `panel.test.ts`); ordering and newest-name are server properties proven in Phase 1 route tests; browser showed rank 1 × 4 for the seeded trainer | verified |
| AC-4 | Board renders live + empty state | `panel.test.ts` pins live rows across all four boards and the empty-words state for a board with no entries; browser confirmed the live render | verified |
| AC-5 | Unreachable shows snapshot + quiet note, never error plate | `fetch.test.ts` pins fallback-whole and no-partial-mix; `panel.test.ts` pins the quiet note over live rows and the calm error line (no plate) when no snapshot exists; browser confirmed both states | verified |
| NFR-5 | 12KB client module cap | `board/` mirrors the `cloud/` split (copy/snapshot/fetch/panel/css); `main.ts` registration fit only after trimming its comment (12252 B < 12288); module-size suite green | verified |

## Evidence paths

- `apps/client/src/board/copy.ts` (+ `copy.test.ts`) — titles, labels, quiet state lines
- `apps/client/src/board/snapshot.ts` (+ `snapshot.test.ts`) — `apex.boards` last-good cache beside the save, never inside it
- `apps/client/src/board/fetch.ts` (+ `fetch.test.ts`) — fetch-on-open, all-or-snapshot fallback
- `apps/client/src/board/panel.ts` (+ `panel.test.ts`) — Boards chip + modal, verbatim ranks, generation-guarded repaint
- `apps/client/src/board/board.css` — scoped `board-`/`.boards-chip` styles, no new palette
- `apps/client/src/main.ts` — board loader + panel wiring, narrow diff (construction, chips, append)
- Deviation seam: `apps/client/src/cloud/api.ts` (`BoardEntry`, `BoardPayload`, `readBoard`), `apps/client/src/cloud/api.test.ts` (board-read suite)
- Screenshots (gitignored): `.conductor/evidence/20261027-global-leaderboards/phase-3-boards-desktop.png`, `phase-3-boards-phone.png`, `phase-3-boards-offline-snapshot.png`, `phase-3-boards-offline-error.png`

## Deviations

| File | Reason |
|------|--------|
| `apps/client/src/cloud/api.ts` | Outside Touches. `readBoard` is the required seam: the public ranked-list call every board open goes through. Mirrors the Phase 2 `submitScore` precedent (typed wire + tests accepted). |
| `apps/client/src/cloud/api.test.ts` | Outside Touches. Three board-read tests (public GET path with no passphrase anywhere, offline-as-value, 400-as-rejected). Required cover for the seam above. |
| `apps/client/src/cloud/sync.ts` (+ `sync.test.ts`) | Inside Phase 2 Touches, fixed during Phase 3 verification as a blocking defect (rework, not new scope). The browser pass caught it: signing in (or creating a trainer) with no local save yet left the status stuck on "syncing" — `uploadLocal` early-returned without settling it. It now returns whether anything was uploaded and both callers settle to `synced` when there was nothing to push. Pinned by "a trainer with no local save yet signs in settled, not stuck syncing". The unhappy paths are unchanged: a failed upload still reports through `failureStatus`, and a real save still stamps its own `savedAt`. |
| `apps/client/src/main.ts` comment | Trimmed the board-wiring comment to fit the 12KB cap (12252 B). Meaning preserved; no code change. |

`apps/client/src/cloud/scores.ts` was listed in Touches for the snapshot cache;
the cache lives beside it in `board/snapshot.ts` (as the brief allows), so
`scores.ts` is untouched — the `apex.scores` submitted-values snapshot and the
`apex.boards` ranked-list snapshot stay two separate keys for two separate jobs.

## Primary verification

The executor had no shell for most of the phase, so the primary ran every gate
and the browser pass:

- [x] Unit (scoped + full): 3224 pass, 1 skip, 0 fail.
- [x] Gate: `bun run verify` exit 0; `bun run build` exit 0.
- [x] Typecheck + Biome clean (fixed during verification: `panel.ts`
      `noAssignInExpressions`, a cast in `fetch.test.ts`, the `readBoard`
      stub in `sync.test.ts`, the chip-label assertion, and the `main.ts`
      comment trim — all behavior-preserving).
- [x] Browser Board pass: live, offline-snapshot, and no-snapshot states on
      desktop + phone widths, console free of app errors (steps above).
- [x] Blocking defect found + fixed: saveless sign-in stuck on "syncing"
      (see deviations).
- [x] Single phase commit (clean range, no foreign commits).

## Notes

- **All-or-snapshot (within spec, recorded here):** a partial fetch (three
  boards live, one refused) falls back to the snapshot whole rather than
  painting a mix of fresh and stale. The four boards read as one consistent
  visit with one `fetchedAt`; a mixed render could show a trainer at rank 2
  on one board and rank 5 on another from different moments.
- **Rank verbatim:** the client never recomputes rank — ties already share one
  on the wire (Phase 1 competition ranking), and the panel prints
  `entry.rank` as served. Recomputing client-side would risk diverging from
  the two-device truth in AC-6.
- **Generation guard:** each open bumps a generation; a slow fetch resolving
  after close (or after a newer open) never repaints. Fetch-on-open would
  otherwise flash a previous visit's boards.
- **Local-only builds unchanged:** no `VITE_API_ORIGIN` means no cloud object,
  which means no loader, no panel, no chip, and no snapshot key ever written.
- **No new visual language:** the chip is the dim kit chip, the modal is
  `kit-modal` + `kit-plate kit-modal-box` with a `kit-button` close, the status
  is `role=status`, and the CSS reuses `--ink-dim` + tabular numerals. The
  fifth chip wraps onto the motion-wrap's second row on phones (existing
  behavior); the phone screenshot confirms it stays tidy.
