# Plan: Bronze Ladder (`bronze_ladder_20261012`)

Workflow: `conductor/workflow.md` (TDD for logic-bearing code, phase
checkpoints, git notes, `bun run verify` before commits).

## Phase A — Sim ladder core (TDD)

- [x] Task: Write failing tests for the ladder core (`packages/sim/src/ladder.test.ts`)
  - [x] Placement→points table: champion +3, runner-up +2, semifinal +1, earlier exit +0
  - [x] Threshold crossings: promote at 6 (III→II) and 12 (II→I), including one-point-below cases
  - [x] Top of Bronze I: points keep banking; the Silver-awaits flag fires exactly once
  - [x] Losses and forfeits award 0 and never subtract
- [x] Task: Implement `ladder.ts` — `LadderState`, `POINTS_BY_PLACEMENT`, `SUBTIERS`, `applyCupPlacement` (pure, DOM-free)
- [x] Task: Wire the ladder into the cup rewards seam (`applyCupRewards` / `completeCup` / `forfeitCup` paths) so legacy and live cup flows stay in parity; extend `GameState` with `ladder`
- [x] Task: Refactor & commit (`feat(sim): bronze ladder core — placement points, sub-tier climbs`) — b93e2ef
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — [checkpoint: b93e2ef] (automated gates green; visual verification deferred to Phase C)

## Phase B — Save v8 (TDD)

- [x] Task: Write failing tests — v8 schema validation, v7→v8 migration initializing points at 0, round-trip save/load, corrupt-save tolerance unchanged
- [x] Task: Implement `SAVE_VERSION=8` + migration step + storage validator for ladder state
- [x] Task: Update `docs/save-schema.md` with the v8 field and migration note
- [x] Task: Refactor & commit (`feat(save): save v8 — ladder state, v7→v8 migration`) — 692d37c
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — [checkpoint: 692d37c] (full verify gate green; visual verification deferred to Phase C)

## Phase C — Client presentation (manual-verification track)

- [ ] Task: Broadcast-kit rank plate on the ranch HUD (sub-tier, points, progress-to-next; aria-label; reduced-motion aware)
- [ ] Task: Cup tie-ins — standing on the entry chip, points + climb callout on the results screen, ticker announcement via the existing precedence chain
- [ ] Task: Store wiring through `commit()` fanout; hud subscriber update
- [ ] Task: Commit (`feat(client): ladder rank plate + cup results tie-ins`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase D — Final verification & docs

- [ ] Task: `bun run verify` green; determinism gate untouched (no voxel/artifact changes in the diff)
- [ ] Task: Browser-tool verification of the full loop — win a cup → points land → climb fires → plate updates → save v8 round-trips
- [ ] Task: Update `README.md` phase table + `conductor/product.md` landed note; mark Phase 1 fully complete
- [ ] Task: Commit (`docs(readme): bronze ladder lands — phase 1 complete`) + Track Verification & Checkpoint (Refer to workflow.md)
