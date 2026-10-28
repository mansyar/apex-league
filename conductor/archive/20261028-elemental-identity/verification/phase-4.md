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

## Primary evidence (P4.T3 lab capture)

- 32 Move-Lab frames in `verification/phase-4/`: 8 moves × travel/impact ×
  desktop (1280×800) / phone (390×844). Attacker Bramble Ox (bovine),
  defender Tide Axolotl (axolotl, plant→water SE), far range, 1× pace,
  seeded particles. Anchors: travel = projectile-staged +500ms, impact =
  impact-staged +100ms.
- Reads: seed_shot single seed cluster + drift motes; thorn_volley green
  shard fan; bramble_dart workhorse streak; spore_burst wide spore fan;
  vine_lash simultaneous 3-streak rake (see rework note); root_quake wide
  bramble-ring eruption; thorn_charge dash flash; bramble_guard green
  barrier eruption on the foe (barrier rule, no shove, no travel projectile).
- Rework (primary, post-handoff): the first `vine_lash` row was a slightly
  bigger `seed_shot` (single shot, same anchors) — travel/impact frames were
  near-identical, violating the per-move-distinctness bar. Reworked to a
  true lash: 3 simultaneous streaks (spread −0.5/0/0.5, same `at` — vs the
  volley's staggered beats), wide sideways sweep pose, quick slash-ring
  arrival. First attempt used life 440 and the streaks expired before the
  +500ms travel anchor (empty frame — anchor lesson, not a row bug);
  lengthened to life 620 and re-captured: the rake now reads clearly on
  desktop and phone.
- Viewport lesson: the shared runner session kept a narrow viewport between
  runs with no code change (one full 8-move desktop pass captured portrait).
  Fix: explicit `setViewportSize` in capture scripts (1280×800 desktop,
  390×844 phone); affected pass re-ran. Future element phases should set
  the viewport explicitly in every capture script.
