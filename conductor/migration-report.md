# Conductor Migration Report

- **Date:** 2026-10-20T10:36:47
- **From:** Conductor 1.x
- **To:** Conductor 2.0
- **Mode:** Upgrade in place

## Context

- **Preserved:** `product.md`, `tech-stack.md`, `product-guidelines.md`,
  `learnings.md`, and `code_styleguides/` (general, html-css, python,
  typescript). No product decision was re-invented.
- **Regenerated:** `workflow.md` with a project-specific `## Workflow Config`,
  the four-layer `## Verification Strategy`, and pruned generic sections.
- **Index:** merged in place; the `conductor-version: 2` marker and a
  Capabilities section were added. Existing custom links (learnings, archive)
  were preserved.
- **Scaffolding:** `tracks.md` gained its `# Tracks` heading, `tracks/` was
  created with `.gitkeep`, and `.conductor/` was added to `.gitignore`.
- **Agents:** installed — `.opencode/agents/conductor-phase.md` and
  `.opencode/agents/conductor-reviewer.md`, with project command allowlists.
- **Skills:** none installed; the catalog covers Firebase and Google Cloud
  tooling, which this project does not use.
- **Project instructions:** the managed Conductor block was added to
  `AGENTS.md`.

## Tracks

All 43 tracks predate Conductor 2.0. None use stable requirement IDs in
`spec.md` (0 of 43) or phase/task IDs in `plan.md` (0 of 43), and all archived
`metadata.json` files use the 1.x shape (`trackId` instead of `id`, no
`base_branch`/`base_sha`, no `progress`, no PR or archive fields). Every track
is completed and archived, so no track is blocked in practice: legacy blocking
applies to work that would be implemented or reviewed, and archived tracks are
historical.

Missing metadata on every row: `priority`, `depends_on`, `spec`, `plan`,
`base_branch`, `base_sha`, `progress`, `last_checkpoint`, `doc_sync`,
`pr_url`, `pr_state`, `merged_at`, `merge_commit`, `reverted_at`,
`revert_commit`, `revert_pr_url`, `archived_at`, `archive_path`, `legacy`,
`migrated_at`, `migrated_from`.

| Track | Status | Plan v2 | Spec v2 | Recommended action |
| --- | --- | --- | --- | --- |
| `arena_playback_20261010` | archived | no | no | Keep as historical |
| `audio_foundation_20261017` | archived | no | no | Keep as historical |
| `axolotl_20261010` | archived | no | no | Keep as historical |
| `battle_animation_overhaul_20261012` | archived | no | no | Keep as historical |
| `battle_core_20261010` | archived | no | no | Keep as historical |
| `battle_presentation_20261012` | archived | no | no | Keep as historical |
| `battle_sim_consolidation_20261013` | archived | no | no | Keep as historical |
| `bovine_20261009` | archived | no | no | Keep as historical |
| `broadcast_hud_20261011` | archived | no | no | Keep as historical |
| `bronze_ladder_20261012` | archived | no | no | Keep as historical |
| `care_loop_20261010` | archived | no | no | Keep as historical |
| `champion_evolution_20261013` | archived | no | no | Keep as historical |
| `client_scene_pass2_20261013` | archived | no | no | Keep as historical |
| `coach_knowledge_20261016` | archived | no | no | Keep as historical |
| `color_helper_20261010` | archived | no | no | Keep as historical |
| `combat_prep_20261010` | archived | no | no | Keep as historical |
| `creature_readability_20261018` | archived | no | no | Keep as historical |
| `cup_day_20261011` | archived | no | no | Keep as historical |
| `cup_engine_consolidation_20261012` | archived | no | no | Keep as historical |
| `cup_module_refactor_20261018` | archived | no | no | Keep as historical |
| `drake_tuning_20261010` | archived | no | no | Keep as historical |
| `dynasty_breeding_20261018` | archived | no | no | Keep as historical |
| `element_chart_20261016` | archived | no | no | Keep as historical |
| `evolution_juvenile_20261011` | archived | no | no | Keep as historical |
| `field_robustness_20261016` | archived | no | no | Keep as historical |
| `foundation_20261009` | archived | no | no | Keep as historical |
| `gold_legend_ladder_20261017` | archived | no | no | Keep as historical |
| `hardening_20261011` | archived | no | no | Keep as historical |
| `legacy_breeding_20261013` | archived | no | no | Keep as historical |
| `live_cup_20261011` | archived | no | no | Keep as historical |
| `living_ranch_20261010` | archived | no | no | Keep as historical |
| `move_pool_20261018` | archived | no | no | Keep as historical |
| `ranch_decomposition_20261018` | archived | no | no | Keep as historical |
| `ranch_dressing_20261010` | archived | no | no | Keep as historical |
| `ranch_rituals_20261018` | archived | no | no | Keep as historical |
| `release_polish_20261018` | archived | no | no | Keep as historical |
| `responsive_foundation_20261013` | archived | no | no | Keep as historical |
| `save_safety_20261012` | archived | no | no | Keep as historical |
| `silver_ladder_bosses_20261016` | archived | no | no | Keep as historical |
| `training_20261010` | archived | no | no | Keep as historical |
| `ui_layer_refactor_20261016` | archived | no | no | Keep as historical |
| `voxel_pipeline_20261009` | archived | no | no | Keep as historical |
| `water_starter_20261010` | archived | no | no | Keep as historical |

No active (`[ ]` or `[~]`) track required conversion. When new work starts,
recreate it through `conductor-new-track` so it gets the v2 spec/plan contract
from the start.

## Legacy Worktrees

`.conductor/worktrees/` does not exist. Conductor 2.0 runs sequentially in the
current worktree and creates no worktrees, so there is nothing to prune.

## Open Questions & Assumptions

- **Coverage:** no coverage tool or threshold existed before this migration.
  Recorded as an explicit decision (`coverage.gate: "none"`), not an omission.
  Revisit if the Phase 3 server adds enough untested surface to justify a gate.
- **Integration/E2E:** none exist. The ElysiaJS server is deferred to Phase 3;
  an HTTP verification layer is added to `workflow.md` before endpoint work.
- **Deployment:** no hosting workflow exists. Tracked as a manual release step,
  not an automated one.
- **Visual layer:** `playwright-cli` is installed globally and was already used
  by hand for this project. The new workflow makes the desktop/phone screenshot
  plus console pass a formal phase requirement for user-facing changes.
- **Archived track metadata** was not bulk-rewritten to the v2 shape. Rewriting
  43 completed records has no operational value and risks corrupting history.
  They stay in `conductor/archive/`. If one is ever reopened, recreate it.

## Limits

- Legacy tracks are blocked by `conductor-implement`, `conductor-review`, and
  phase revert until they are recreated or manually repaired. No archived track
  is active, so nothing is blocked today.
- Old specs and plans were not rewritten automatically.
- When a track is repaired, remove `legacy: true` from its metadata and update
  the spec/plan to the v2 contract.
- The pre-migration directory is backed up at
  `.conductor/backups/conductor-v1-20261020-103647/` (242 files, gitignored).
- v2 runs sequentially in the current worktree and creates no worktrees.
