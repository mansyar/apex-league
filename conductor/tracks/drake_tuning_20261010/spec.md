# Spec: Drake Template Tuning

**Track ID:** `drake_tuning_20261010` · **Type:** Bug/Chore (quality fix) · **Branch:** `track/drake_tuning_20261010`

## Overview

Fix the review finding from the care-loop track: wild-variation DNA on the
**draconic** archetype produces leggy/unbalanced individuals at some seeds
(e.g. max leg-length + min girth combinations), violating the intent of the
±20–30% wild-variation guideline — every individual must still *read as a
drake*. Fix by **rebalancing proportion bounds only** (no SDF reshaping),
validated by a vision-model silhouette loop plus a new automated
proportion-budget gate.

## Functional Requirements

1. **Proportion-budget guardrail (shared test, `@apex/voxel`)**
   - A test asserting that for every registered archetype across a seed sweep
     (200 seeds), derived dimensional ratios (leg-length vs body height,
     neck vs body length, girth vs length, head vs body) stay within declared
     budgets.
   - Budgets are data-driven (declared per archetype or derived from template
     bounds × base geometry) so **future archetypes inherit the gate
     automatically**.
   - On failure, the test reports offending seeds and their ratios.
2. **Drake bounds rebalance**
   - Adjust `drakeTemplate.proportions` bounds and/or base multipliers so the
     guardrail passes across seeds.
   - Preserve genuine variety — do not flatten toward uniformity; the failure
     mode is extreme *combinations*, not any single parameter.
3. **Vision-model silhouette loop**
   - Grey silhouette renders of outlier seeds iterated through the vision
     model (the proven bovine-track workflow) until silhouettes read as drakes
     across the sampled range.
4. **Artifact regeneration**
   - If the rebalance changes seed-42 output, regenerate
     `artifacts/draconic-42.glb` + manifest; determinism gate re-verified.

## Non-Functional Requirements

- Pure-TS pipeline untouched structurally; determinism preserved; test suite
  stays < 10s; no sim/client behavior changes.

## Acceptance Criteria

1. Proportion-budget test passes for both archetypes across the sweep and
   fails with actionable output when violated.
2. Vision-model review of outlier seeds reads them as drakes (evidence
   recorded in git notes).
3. All existing gates green (`bun run verify`); artifacts regenerated if
   needed.
4. Bovine output unchanged.

## Out of Scope

Bovine tuning, SDF part reshaping, new style slots, sim/client changes, new
archetypes.
