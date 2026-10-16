# Plan — Element Chart & Battle Length (`element_chart_20261016`)

TDD applies to all logic-bearing work (chart, clock, training, save schema);
presentation audits are manually verified. Workflow rules govern task
lifecycle, checkpoints, and commit format.

## Phase 1 — Probe: sweep & pin the constants

- [ ] Task: Baseline doc — `probe-before.md` in the track folder (current-chart
  tables: mirrors, cross cells, rival-relative cells, climb cadence,
  placement distribution — measured 2026-10-16 on the boss branch)
- [x] Task: Red — `chart.balance.test.ts` encoding the acceptance bands as
  tripwires (equal-stat sweep, all six ordered pairs: ≥35% at full training /
  ≤25% at trained+0; mirror curves unchanged; draw ceiling 20%) — confirm red
- [x] Task: Sweep — for each candidate (3/2·2/3, 4/3·3/4, 5/4·4/5 × HP
  1.5×/2×/3×): patch chart + bounds, run the probe report, record tables
- [x] Task: Green — pin the winning factor pair in `chart.ts`, double species
  `statBounds.hp`, trained-HP +2/day cap +12; make the band tripwires green;
  `probe-after.md` with rationale — 80db5c2 (probe-after doc 3ef224f)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Battle mechanics & re-golden

- [ ] Task: Red+Green — tick cap scales with HP scale (clock tests first);
  draw-rate ceiling holds
- [ ] Task: Tactics meta re-baseline — `tactics.balance.test.ts` cross cells /
  draw rates verified or re-baselined with documented rationale (mirrors
  untouched)
- [ ] Task: Parked-tripwire hygiene — `bosses.balance.test.ts` parked
  `test.failing` tests → `test.skip` with a pointer to boss-track Phase 3
  resume (keeps the suite green; the boss track decides the final form on
  fresh data)
- [ ] Task: Single re-golden commit — all battle transcript goldens with a
  mapping note; no behavior edits alongside
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Save v12

- [ ] Task: Red — version pins, migration tests (v11 → v12: creature HP ×2,
  in-flight session slot stats ×2, lineage/HoF records ×2), validator tests
  (new bounds)
- [ ] Task: Green — schema v12 + migration + validator + `docs/save-schema.md`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Client & presentation audit (manual-verify)

- [ ] Task: HP display audit — creature plates, growth copy, any hardcoded
  HP assumptions. Manual verification note.
- [ ] Task: Longer-battle playback sanity — browser verification at
  390/768/1280 widths. Manual verification note.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Final gates

- [ ] Task: Full `bun run verify`; docs final pass; README/learnings updates;
  `conductor-review` handoff
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
