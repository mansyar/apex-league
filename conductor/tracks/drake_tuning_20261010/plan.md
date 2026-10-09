# Plan: Drake Template Tuning (`drake_tuning_20261010`)

Workflow: `conductor/workflow.md` (TDD for logic-bearing code; phases end
with a verification & checkpoint task).

## Phase A — Proportion-Budget Guardrail (TDD, logic-bearing)

- [ ] Task: Failing tests — budget gate
  - [ ] derived dimensional ratios (leg/body-height, neck/body-length, girth/length, head/body) computed from a build
  - [ ] 200-seed sweep over every registered archetype stays within declared budgets
  - [ ] failure output names offending seeds and ratios
- [ ] Task: Implement budget module (ratio derivation from `CreatureBuild` + budgets data on archetype defs)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase B — Drake Bounds Rebalance (iterate to green)

- [ ] Task: Baseline sweep — capture current outlier seeds/ratios with the new gate
- [ ] Task: Rebalance `drakeTemplate.proportions` bounds / base multipliers until the guardrail passes (preserve variety)
- [ ] Task: Confirm existing drake/voxel fuzz suites stay green
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase C — Vision-Model Silhouette Loop (manual verification)

- [ ] Task: Grey-render outlier + random seed samples; vision-model review ("reads as a drake?")
- [ ] Task: Iterate bounds from feedback until the sampled range passes (return to Phase B edits as needed)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase D — Artifacts & Integration Gate

- [ ] Task: Regenerate `artifacts/draconic-42.glb` + manifest if seed-42 output changed
- [ ] Task: Full gate — `bun run verify` green
- [ ] Task: Browser gallery spot check (`?archetype=draconic`) with visual evidence
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
