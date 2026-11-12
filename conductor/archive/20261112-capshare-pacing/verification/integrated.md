# Capshare Pacing — integrated verification

Track-wide record, written on the track tip after all three phases were accepted.
The phase files (`phase-1.md`, `phase-2.md`, `phase-3.md`) hold the per-phase
evidence; this file holds the track's own claims.

## What shipped

1. **A diagnosis** of the 42-fight telemetry sample's 25 time-outs: which side
   failed to close in each one, and why (`phase-1.md`, Tables A and B). Nine were
   the tortoise's own; sixteen were global throughput (D-1) or opponent conversion.
2. **An identity guard** on `earth_tortoise` (`packages/sim/src/species/identity.test.ts`):
   `spd` bounds exactly `[3, 5]`, `hp`/`def` no lower than shipped,
   `temperament === "slow"`, `archetypeId === "tortoise"`, `element === "earth"`,
   and the kit a set drawn only from the six moves it owns. It was written and made
   green on the untouched tree before any value was touched, so it is a fence and
   not a wish.
3. **A re-composed telemetry sample**: 42 fights on **42 distinct pairings**, one
   seed each, drawn by a written rule (`away = (i * 11 + lap + 1) % 15`) over the
   full 210-pair enumeration, with a pin that proves 42 distinct pairings, no
   mirrors, and every species home and away at least twice.
4. **No simulation change at all.** `rewards.ts` is byte-identical to the phase-2
   base; `SIM_VERSION` stays 3; the trace hash is unmoved.

**A fix inside the tortoise's own data was measured and withdrawn.** Six
identity-preserving rungs were tried (`phase-2.md`): the preferred kit reorder
resolved 0 of the nine collapse fights, reorder + `atk 13` resolved 0, evicting
`boulder_toss` resolved 2 but took the species to 71.4% and the matrix red, and the
same kit at shipped `atk` still read 65.2%. The species sits at **52.7% on the
840-fight matrix as an outlaster**, and this project already rules that a cap win
is an outlasting win — so its caps are its identity working, not a defect. FR-2 and
AC-2 are marked **Withdrawn** in the spec with that evidence attached; FR-2a and
AC-2a ship.

## Gates on the tip

| Command | Exit | Result |
| --- | --- | --- |
| `bun run telemetry` | 0 | 14/14 bounds `ok`; `cap share: 20/42 (47.6%)`; `dead zone: 27 commits (2.9%)`; `durationMin` 14.48 s; `distinctPositions` 46 |
| `bun run balance` | 0 | 840 fights; cap 224/840 (26.7%); decisive 95.6% (615 ko + 188 cap); cap-win quality 83.9%; median 31.21 s; 49/49 moves inside the 4–12% band; 15/15 species in band |
| `bun run verify` | 0 | 4,151 pass / 1 skip / 0 fail; 4,152 tests across 374 files; Biome 935 files clean; determinism gate 46 GLBs + 5 props byte-identical |
| `bun run build` | 0 | only the pre-existing >500 kB chunk warning |
| `bun run trace --seed 20261111 --check` | 0 | hash `0xb6cce858` — identical to the Minimum Reach tip, proving no simulation movement; 5/5 invariants |

## Acceptance criteria

| ID | Criterion | Verdict | Evidence |
| --- | --- | --- | --- |
| AC-1 | The diagnosis names, for every time-out, the stalling side and the reason | met | `phase-1.md` Tables A and B, 25 rows |
| AC-2 | Withdrawn with FR-2 | withdrawn | `rewards.ts` byte-identical (`git diff --stat` empty) |
| AC-2a | A test pins the six identity invariants | met | `identity.test.ts`, 4 tests |
| AC-3 | 42 entries, all distinct, no mirrors, every species home and away ≥ 2, stable across calls | met | `telemetry.test.ts` composition pin |
| AC-4 | `capShare` at most 21/42 | met | 20/42 (47.6%), asserted as `cap.count * 100 <= cap.total * 52` |
| AC-5 | `bun run balance` exits 0 with 15/15 species, cap ≤ 1/3, median in 25–40 s, decisive ≥ 2/3, 49/49 moves in band | met | 26.7% cap, median 31.21 s, decisive 95.6%, 49/49 |
| AC-6 | No `test.failing` whose body now passes; suite green, no `.skip` added | met | `pacing.test.ts` untouched and re-run (4 pass, 0 fail, 87 assertions); its debt pin still fails as designed |
| AC-7 | `SIM_VERSION` is 3 and the ghost tests pass | met | no simulation file in the diff; trace hash `0xb6cce858` unmoved |
| AC-8 | Every other `BOUNDS` value byte-identical; `deadZoneShare` still reports inner-edge misses | met, amended | no `BOUNDS` value edited; the reading is 2.9% on the new sample against 2.4% on the old one — same mechanic, different fight set |
| AC-9 | Both readings side by side with the per-bound verdict | met | `BOUNDS` rationale, test comment, `phase-3.md` §3 and §8 |

## Debt

- **D-1 (global pacing), open.** 16 of the original 25 time-outs had both sides
  converting: 2.5–7.6 damage per second against 160–189 HP pools needs 41–73 s
  against a 40 s cap. Fixing it means damage, pools, exchange cadence or the cap —
  none of which this track was allowed to touch.
- **D-2 (kite band vs `spd`), open.** The kite doctrine's floor (1,472–1,600 mm at
  these edge lengths) is unholdable by a `spd 5` body (0.55 mm/ms) against
  1.0–1.63 mm/ms opponents, so the retreat latch spends decisions backing off
  instead of committing. A shared-rule change touching every species.
- **D-3 (one-in-three target), still owed.** The re-composed sample reads 20/42
  (47.6%) against the spec's own 14/42 target. The `test.failing`-style debt pin is
  kept at `cap.count * 3 > cap.total`, not promoted.
- **D-4 (stat basis and doctrine mix), new.** The fixture reads 47.6% cap while
  the balance matrix reads 26.7% on the same tree, and the two samples differ in
  **two** ways, neither of which has been isolated:

  1. **Stat basis.** The telemetry harness builds both sides from
     `REFERENCE = { hp: 189, atk: 10, def: 10, spd: 10 }` clamped *up* into each
     species' bounds (`atk 10` → 11 for the tortoise, 15 for a striker), whereas
     the balance report fights each species at its **bounds midpoint** (`atk` 13
     for the tortoise). Reference bodies hit softer and carry deeper effective
     pools.
  2. **Doctrine mix.** `measureFight` sets one side `balanced` and the other
     `specials`, which `controller-profile.ts` maps to press and kite, so every
     fixture fight is press-versus-kite; the matrix runs one doctrine (press) on
     both sides for all 840 fights. Phase 1's finding 2 already says the kite band
     is unholdable at `spd 5`, so kite participation is a plausible co-cause of
     longer fights.

  **Attribution unmeasured.** The track did not run a factorial that separates the
  two, and the balance report prints win rates for its reference line but never a
  cap share, so there is no existing figure to compare against. The honest reading
  is "the fixture is not a sample of the matrix's fight population, for at least
  these two reasons" — not "the gap is the stat basis". A future measurement
  redesign should add a reference-line cap share to `battle-balance-report.ts` (one
  diagnostic line) before acting on either variable.
- **Documentary:** the thirteen other `BOUNDS` `why` strings quoted the shipped
  14 × 3 readings. They now quote the 42-distinct readings and name the sample they
  came from, so the gate's rationale and its output agree. The values themselves
  were not touched.
