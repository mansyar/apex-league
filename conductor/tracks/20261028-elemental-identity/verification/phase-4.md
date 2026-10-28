# Phase 4 verification — Plant (4 new + 4 upgrades)

## Tasks

- **P4.T1 (done)** — 4 new bespoke rows in `apps/client/src/move-fx/moves/plant.ts`:
  `seed_shot` (quick seed flick, power 6), `thorn_volley` (fan/volley, power 8),
  `vine_lash` (lash strike, power 7), `bramble_guard` (foe-targeted barrier
  eruption, power 9, no shove — barrier rule).
- **P4.T2 (done)** — 4 existing rows upgraded to verb + identity grammar:
  `bramble_dart` (workhorse), `spore_burst` (cone), `root_quake` (eruption),
  `thorn_charge` (dash).
- **P4.T3 (done)** — plant pins in `apps/client/src/move-fx/moves/fallback.test.ts`
  (AC-1: all 8 resolve bespoke; AC-3: verb-family reads) with dot access
  (`MOVE_FX.seed_shot`), plus the Phase-2/3-style guard trim in
  `apps/client/src/move-fx.test.ts` (`bramble_guard` left the default-body list,
  whose test was vacuous and removed). Lab screenshots are the primary's
  handoff (P4.T3 evidence capture).

## Grammar

All 8 rows carry plant identity: seed drift (gravity 1.8, sway 1), coiling
bramble-ring arrivals (`ring: true`), held coils with a slight dip
(`rise` negative), verb builders from `verbs.ts` (`volleyFanBody`,
`coneBody`, `eruptionBody`, `dashBody`, `barrierBody`).

## Verification

- `bun run verify` — exit 0: type checks clean (463 client files), 3443 tests
  pass / 1 skip / 0 fail across 330 files, biome clean (826 files), determinism
  gate OK.
- `bun run build` — exit 0: client production build succeeds.
- One fix round: biome collapsed three throw-narrowing guards to single lines
  (formatting only, no behavior change).

## Commits

- `0face2b0` feat(client): phase 4 bespoke plant rows for all 8 moves (P4.T1 + P4.T2)
- `c14b23f5` test(client): phase 4 plant AC-1 and verb-family pins (P4.T3)
- `343a2cee` style(client): collapse phase 4 pin guards to biome format
