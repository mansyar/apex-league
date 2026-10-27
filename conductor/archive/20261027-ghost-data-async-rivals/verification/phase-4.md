# Phase 4 evidence — Board UI + spar-vs-ghost

Track: 20261027-ghost-data-async-rivals · Phase 4 (FR-4, FR-5, NFR-3, AC-4, AC-5)

Status: **verified by the primary** — the executor environment denied shell
access, so the primary ran every blocked step: tests, check, build,
module-size guard, Biome, commits, and screenshot capture (below).

## What was built

### P4.T1 — Board badge + preview + Fight action (FR-4, AC-4)

- `apps/client/src/board/copy.ts` (+): `GHOST_SECTION_TITLE`,
  `GHOST_BADGE_LABEL`, `GHOST_FIGHT_LABEL`, `GHOST_EMPTY_COPY`,
  `GHOST_STALE_COPY`, `GHOST_ERROR_COPY`, `GHOST_VERSION_COPY`, and
  `ghostPreviewLine(champion, day, round)` — "Ember · day 12 · round 3",
  shortening gracefully when stamps are missing.
- `apps/client/src/board/ghost-section.ts` (new, ~4KB): `buildGhostSection`
  paints the Ghost rivals section — badge (`kit-tab is-outline`, aria
  "Ghost rival"), team/score preview, Fight button per fightable row;
  version-skewed rows list with the quiet note and no button; malformed rows
  list bare; empty / stale-snapshot / unreachable all read as calm lines.
  Whole-list repaint per open, never throws.
- `apps/client/src/board/panel.ts` (+~25 lines, optional `ghosts` opt):
  mounts the section last behind the scores, fetches beside them under the
  same generation guard, and closes the modal when `onFight` returns true so
  the player lands in the spar. Without a cloud the scores stand alone
  (unchanged behavior, all existing tests untouched).
- `apps/client/src/board/board.css` (+): `.board-ghost-*`, `.board-fight`
  in the kit language (chamfer, `--kit-keyline-warm`, `--accent` hover/focus);
  rows reuse the score grid so desktop and 393px share one column language.
- `main.ts` (deviation D4): `createGhostBoardLoader` + `ghosts` opt wiring
  `onFight: (entry) => spar.fightGhost(entry.ghost)`.

### P4.T2 — Spar-vs-ghost wiring, local-only result (FR-5, AC-5)

- `apps/client/src/spar/ghost.ts` (new, ~3.5KB): `readGhostContender`
  (fightable only when `simVersion` matches and a complete champion side
  exists — never throws), `isVersionSkippedBundle` (listed-but-unboutable),
  `ghostSparSetup` (seeded exhibition with the champion's kit+name borrowed
  onto the rival; species/stats/tactic stay the exhibition's own).
- `apps/client/src/spar/copy.ts` (+): `ghostBoutIntro(name)` for the panel
  intro line.
- `apps/client/src/spar.ts` (deviation D3): `pendingGhost` state,
  `presentSetup` extracted from `open`, `runBattle` re-resolves from the
  bundle with the same seed when a ghost bout is showing, `fightGhost`
  passthrough added to the `Spar` interface (`spar/types.ts`, deviation D2);
  ghost state clears on every normal open and both close paths, so a ghost
  kit can never leak into a later spar. No GameState/store/save/cloud touch:
  the verdict lives and dies in the panel, and no ghost re-submit can
  observe the bout (no submitter call exists on this path).
- `packages/sim/src/index.ts` (deviation D1): one-line
  `export { SIM_VERSION }` from the battle barrel (deep imports are blocked
  by the package `exports` map).

### Tests (TDD, deterministic seeds)

- `apps/client/src/spar/ghost.test.ts` (new, 12 tests): fixture validity,
  foreign/version-skewed/incomplete bundles rejected without throwing,
  reader returns a copy (no aliasing), setup borrows exactly kit+name,
  determinism `ghostSparSetup ×2` deep-equal, both tactics resolve, and the
  **no-mutation rule**: a `resolveBattle` verdict off a ghost setup leaves
  no GameState-shaped trace — asserted structurally (result contains only
  winner/turns/events/log; no cups/ladder/morning-after/save keys).
- `apps/client/src/board/ghost-section.test.ts` (new, 6 tests): badge +
  preview + Fight in served order, Fight hands back the whole entry,
  version-skewed row has the note and no button (and the handler would throw
  if called), snapshot stale note, unavailable calm line, empty copy, repaint
  clears stale buttons.
- `board/panel.test.ts` (+4 tests): section mounts behind scores, Fight→true
  closes the modal, Fight→false keeps it open, slow ghost answer after close
  never repaints, no-cloud builds unchanged.
- `board/copy.test.ts` (+2 tests): preview-line shapes, ghost lines quiet
  (no `!`, stale note contains "last").

## AC coverage

- AC-4 (board badge/preview/Fight, empty + stale/offline copy): ghost-section
  tests + panel wiring tests + copy tests.
- AC-5 (spar-vs-ghost local-only, no-mutation rule): ghost tests incl. the
  no-mutation test; wiring keeps the verdict in-panel by construction.
- NFR-3: two new modules (~3.5KB spar/ghost, ~4KB board/ghost-section);
  panel.ts grew ~25 lines (well under the 12KB cap); no style forks (kit +
  element hues untouched).

## Deviations (all required — targets live outside Touches)

- D1 `packages/sim/src/index.ts`: re-export `SIM_VERSION` (deep imports
  blocked by `exports` map).
- D2 `apps/client/src/spar/types.ts`: `Spar.fightGhost` member.
- D3 `apps/client/src/spar.ts`: session wiring (`pendingGhost`,
  `presentSetup`, `runBattle` branch, closes) — owns the session.
- D4 `apps/client/src/main.ts`: loader + `ghosts` composition — owns boot.
- D5 `apps/client/src/spar/copy.ts`: `ghostBoutIntro` (spar copy module,
  inside Touches-adjacent spar/*).
- D6 `apps/client/src/board/boot.ts` (new, ~1.2KB) + `boot.test.ts`: the
  primary extracted the board boot composition out of `main.ts`, which the
  ghost wiring pushed 563 B over its 12KB cap (12851 B). `main.ts` is back
  to 12222 B; the local-only rule (no cloud → no board) now lives in one
  tested place (`bootBoardsPanel` returns null on a null cloud).
- D7 `apps/client/src/board/ghost-section.test.ts` (2 assertions): the
  FakeElement harness sets `textContent` per-node instead of concatenating
  like the real DOM, so `main.textContent`/`row.textContent` returned null.
  The primary reads the row's `main` children directly ([name, preview] /
  [name, version note]) — implementation untouched, still 6 tests.
- D8 `apps/server/src/migrate.test.ts` (format only): the added
  `0003_ghost.sql` expectation exceeded the print width; `biome check
  --write` wrapped it. Behavior untouched, 3 pass.

## Primary verification (all on `feat/20261027-ghost-data-async-rivals`)

- `bun test apps/client/src/board apps/client/src/spar --parallel=4` →
  66 pass / 0 fail (9 files).
- `bun run check` → clean (client 442, sim 167, server 44, voxel 145 files).
- `bun run build` → exit 0 (chunk-size warning pre-existing).
- Module-size guard → 5 pass; `main.ts` 12222 / 12288 B, `boot.ts` 1255 B.
- `biome check` on all of `apps/*/src` + `packages/*/src` → clean.
- Visuals, real local stack (server on :3001 with a simulator-built,
  `verifyGhostBundle`-checked bundle uploaded through the real API; client
  dev with `VITE_API_ORIGIN`): `ghost-board-desktop.png` (badge + preview +
  Fight), `ghost-spar-desktop.png` ("Ember answers from the board", seed 7),
  `ghost-board-mobile.png` (393px, one column language). Playwright console:
  0 errors, 0 warnings on both viewports.
- `scripts/seed-ghost-visual.ts` (temporary seeder) deleted after capture.

## Verification — all run by the primary, all green (see above)

Shell is denied in this environment, so none of the following could be run.
Please run, in this order, on `feat/20261027-ghost-data-async-rivals`:

1. `bun test apps/client/src/spar/ghost.test.ts apps/client/src/board/ghost-section.test.ts apps/client/src/board/panel.test.ts apps/client/src/board/copy.test.ts`
2. `bun run check`
3. `bun run build`
4. Module caps: `bun test` module-size guard (or `wc -c` the touched
   modules) — panel.ts was near 12KB; this phase adds ~25 lines to it.
5. Visuals: desktop + 393px mobile screenshots of (a) the Board ghost badge/
   preview/Fight rows and (b) spar-vs-ghost, with a clean console (no
   errors/warnings attributable to the app).
6. Commit in small conventional commits (suggested split):
   - `feat(client): spar ghost-reader module + tests` (spar/ghost.*)
   - `feat(client): spar-vs-ghost wiring, local-only` (spar.ts, types.ts,
     copy.ts, sim index)
   - `feat(client): board ghost section + panel wiring` (board/*, main.ts)

Files changed (uncommitted in the working tree):

- apps/client/src/spar/ghost.ts (new)
- apps/client/src/spar/ghost.test.ts (new)
- apps/client/src/spar/types.ts
- apps/client/src/spar/copy.ts
- apps/client/src/spar.ts
- packages/sim/src/index.ts
- apps/client/src/board/copy.ts
- apps/client/src/board/copy.test.ts
- apps/client/src/board/ghost-section.ts (new)
- apps/client/src/board/ghost-section.test.ts (new)
- apps/client/src/board/panel.ts
- apps/client/src/board/panel.test.ts
- apps/client/src/board/board.css
- apps/client/src/main.ts
