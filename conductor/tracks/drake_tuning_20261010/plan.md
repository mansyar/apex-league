# Plan: Drake Template Tuning (`drake_tuning_20261010`)

Workflow: `conductor/workflow.md` (TDD for logic-bearing code; phases end
with a verification & checkpoint task).

## Phase A — Proportion-Budget Guardrail (TDD, logic-bearing)

- [x] Task: Failing tests — budget gate (`5f9a719`)
  - [x] derived dimensional ratios (leg/body-height, neck/body-length, girth/length, head/body) computed from a build
  - [x] 200-seed sweep over every registered archetype stays within declared budgets
  - [x] failure output names offending seeds and ratios
- [x] Task: Implement budget module (ratio derivation from `CreatureBuild` + budgets data on archetype defs) (`5f9a719`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 5f9a719]

## Phase B — Drake Bounds Rebalance (iterate to green)

- [x] Task: Baseline sweep — capture current outlier seeds/ratios with the new gate (`5f9a719`)
- [x] Task: Rebalance `drakeTemplate.proportions` bounds / base multipliers until the guardrail passes (preserve variety) (`5f9a719`)
- [x] Task: Confirm existing drake/voxel fuzz suites stay green (`5f9a719`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 5f9a719]

## Phase C — Vision-Model Silhouette Loop (manual verification)

- [ ] Task: Grey-render outlier + random seed samples; vision-model review ("reads as a drake?")
- [ ] Task: Iterate bounds from feedback until the sampled range passes (return to Phase B edits as needed)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase D — Artifacts & Integration Gate

- [x] Task: Regenerate `artifacts/draconic-42.glb` + manifest if seed-42 output changed (`5f9a719`)
- [x] Task: Full gate — `bun run verify` green (`5f9a719`)
- [ ] Task: Browser gallery spot check (`?archetype=draconic`) with visual evidence
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
