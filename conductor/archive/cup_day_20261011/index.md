# Cup Day — weekly 8-bracket tournament

*Status: **in progress** — branch `track/cup_day_20261011`*

Legend: `[ ]` pending / `[~]` in progress / `[x]` complete

- Weekly optional cup: filled-in cup phase machine, seeded 8-bracket single
  elimination against named ramped rivals, spar-style text resolution in a
  cup panel, positive-stakes rewards (+1 AP / bond / mood / `cupsWon`), save
  v5 with migration.
- **Type:** Feature (Phase 1 MVP completion)
- **Spec:** [spec.md](./spec.md)
- **Plan:** [plan.md](./plan.md)
- **Scope:** `packages/sim/src/` (pure cup logic, machine, save v5) +
  `apps/client/src/` (cup panel, HUD chip/banner, integration). No
  `@apex/voxel` changes; determinism gate untouched; battles presented as
  text (arena visualization is the parallel arena_playback track's scope).

## Outcomes

- Cup day 7/14/21 becomes a real tournament the player can enter: 3 rounds,
  named rivals, a champion, and rewards that carry into the next day.
- The raise→train→compete loop acquires its "exam" moment; product.md's
  core loop phase 2 stops being a placeholder.
- The headless battle resolver gets its first large-scale consumer, proving
  the seeded/pure contract at bracket scale.
