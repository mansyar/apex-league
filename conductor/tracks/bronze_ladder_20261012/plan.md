# Plan: Bronze Ladder (`bronze_ladder_20261012`)

Workflow: `conductor/workflow.md` (TDD for logic-bearing code, phase
checkpoints, git notes, `bun run verify` before commits).

## Phase A — Sim ladder core (TDD)

- [ ] Task: Write failing tests for the ladder core (`packages/sim/src/ladder.test.ts`)
  - [ ] Placement→points table: champion +3, runner-up +2, semifinal +1, earlier exit +0
  - [ ] Threshold crossings: promote at 6 (III→II) and 12 (II→I), including one-point-below cases
  - [ ] Top of Bronze I: points keep banking; the Silver-awaits flag fires exactly once
  - [ ] Losses and forfeits award 0 and never subtract
- [ ] Task: Implement `ladder.ts` — `LadderState`, `POINTS_BY_PLACEMENT`, `SUBTIERS`, `applyCupPlacement` (pure, DOM-free)
- [ ] Task: Wire the ladder into the cup rewards seam (`applyCupRewards` / `completeCup` / `forfeitCup` paths) so legacy and live cup flows stay in parity; extend `GameState` with `ladder`
- [ ] Task: Refactor & commit (`feat(sim): bronze ladder core — placement points, sub-tier climbs`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase B — Save v8 (TDD)

- [ ] Task: Write failing tests — v8 schema validation, v7→v8 migration initializing points at 0, round-trip save/load, corrupt-save tolerance unchanged
- [ ] Task: Implement `SAVE_VERSION=8` + migration step + storage validator for ladder state
- [ ] Task: Update `docs/save-schema.md` with the v8 field and migration note
- [ ] Task: Refactor & commit (`feat(save): save v8 — ladder state, v7→v8 migration`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

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
