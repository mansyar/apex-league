# Living Ranch

*Status: **complete** — branch `track/living_ranch_20261010`*

Legend: `[ ]` pending / `[~]` in progress / `[x]` complete

- Dead scenery → living meadow: wind sway on all vegetation, a short cancellable
  feeding ceremony after Feed, and sparse seeded wander trips with camera follow.
- **Type:** Feature (Phase 1 presentation)
- **Spec:** [spec.md](./spec.md)
- **Plan:** [plan.md](./plan.md)
- **Scope:** `apps/client/src/` only — no sim, save, or voxel-data changes; motion is
  runtime transform and digest-identical.

## Outcomes

- Ranch reads as a living, inhabited meadow rather than a dressed diorama.
- Feeding becomes an enacted ritual (walk → nibble → home), cancel-safe by design.
- The creature owns its spot in the world: wanders, pauses, returns; camera follows.
