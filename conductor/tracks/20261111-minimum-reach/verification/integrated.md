# Integrated verification — Minimum Reach (20261111-minimum-reach)

Run on the track tip after all five phases were verified. Branch
`feat/20261111-minimum-reach`, base `main` @ `e9a0f4b8`.

## What shipped

- `FrameData` carries an authored `minReachMm`, validated `0 ≤ minReach < reach`,
  and every row with `reachMm >= 5000` authors **90 mm**; the six short rows and
  the innate basic stay `0`.
- One interval test (`gapInReachInterval` / `reachVerdict` in `contact.ts`)
  gates strikes and shots alike: a blow resolves only when the centre gap is
  inside `[minReach + r₁ + r₂, reach + r₁ + r₂]`. A blow that fails only the
  inner edge reports `reason: "range"`, never `accuracy` and never a dodge.
- The chooser judges the gap **at the active frame** (current gap minus closing
  travel over the row's startup), and when nothing lands it fires a **backing
  shot** — a shot whose intent gives ground so the launch opens outside the
  inner edge — falling back to a step back to the landing edge, and to the basic
  when cornered.
- `SIM_VERSION` is 3; the ghost note and pins are updated.
- Telemetry's sample is 42 fights (14 pairings × 3 seeds), all 13 original bounds
  re-derived with before/after figures, and a 14th metric, `deadZoneShare`,
  is gated.
- The client's tell wedge cuts its inner edge from the authored value
  (`tellInnerWorld`), client-only, stream untouched.

## Gate table (track tip)

| Command | Exit | Result |
| --- | --- | --- |
| `bun run balance` | 0 | 840 matrix fights + 24 doctrine + 180 boss; 15/15 species inside the statistical bound; 49/49 moves in the 4–12% damage band; cap 26.7%, decisive 95.6%, median ~30 s; all six bosses ok |
| `bun run telemetry` | 0 | 14/14 bounds ok; `deadZoneShare` 2.4% (≤ 50.0%); `capShare` 59.5% (≤ 60.0%); idle 26.6%, contact 7.1%, engagement 379/1,087/3,992 mm, distinct 63 cells, retreats 20,977/20,263, duration 18.44–40.00 s |
| `bun run verify` | 0 | 4,146 pass, 1 skip, 0 fail — 4,147 tests / 373 files (73.12 s); four typechecks; biome 933 files; determinism gate 46 GLBs + 5 props |
| `bun run build` | 0 | vite 418 modules, `built in 301ms`, only the pre-existing >500 kB chunk warning |
| `bun run trace --seed 20261111 --check` | 0 | 17 landed blows (8 owned / 9 rival), final hash `0xb6cce858`, 5 invariants ok including "same seed replays to the same hash and event sequence" |

The trace hash at the tip is `0xb6cce858`. The phase 4 evidence records
`0xff6f3d62` for its own run; `git diff 32e1044f..HEAD` touches only client and
conductor files, so no simulation change separates the two — the earlier figure
was captured during the value sweep rather than at the checkpoint, and the tip
value above is the authoritative one.

## Acceptance criteria

| AC | Verdict | Evidence |
| --- | --- | --- |
| AC-1 | met | `frames.test.ts`: `0 ≤ minReach < reach` on every row, basic `0`, long rows `90`, short rows `0` |
| AC-2 | met | `contact.test.ts` / `strike.test.ts` land at `minReach + radii` and whiff 1 mm inside with `reason: "range"` |
| AC-3 | met | `projectile.test.ts`: inside the inner edge reports `range`, boundary hits |
| AC-4 | met | `controller.test.ts`: point-blank returns the basic, the same gap returns a long move once the foe clears its dead zone, and a legal-now move whose active-frame gap falls inside is refused |
| AC-5 | met | `bun run balance` exit 0, 15/15 species, every moved figure recorded in `phase-4.md` |
| AC-6 | met, thin on one row | 14/14 printed; `deadZoneShare` has 47.6 points of headroom, `capShare` has 0.5 (see debt) |
| AC-7 | met | `ghost.test.ts` pins `SIM_VERSION === 3` / `+1 === 4`; trace passes |
| AC-8 | met | `tell-scale.test.ts` pins the derived inner radius, inner < outer on every row, and the `0`-row sector |
| AC-9 | met | `controller.test.ts` proves the backing shot is what a ranged kit commits from inside the inner edge (inner-edge refusal → `pyre_lance`, outer-edge overshoot refused, melee never backs off); telemetry shows commits and hits above zero with `idleShare` 26.6% and `deadZoneShare` 2.4% |
| AC-10 | met | 42-fight sample, before/after table and headroom in `phase-3.md`; the value window in `phase-4.md` |

Functional requirements FR-1…FR-10 and NFR-1…NFR-4 are all covered by the
phases' evidence files; NFR-1 is proven by the trace invariant and by the
byte-identical telemetry table at `minReachMm = 0`, and NFR-4 by the fact that
no stream word was added (the `range` outcome is reported, not streamed).

## Debt recorded for the review

1. **`capShare` has 0.5 points of headroom** (59.5% vs the 60.0% ceiling) on the
   42-fight sample, while the 840-fight matrix reads 26.7%. The 14-fight fixture
   is chaotic and the two samples disagree; the ceiling was re-derived once
   (Phase 3, approved) and must not be widened again. Any future mechanic that
   lengthens fights will trip it first.
2. **The authored value is gate-limited, not tuned.** The accepted window is
   ~85–99 mm: 100 mm fails `bun run balance` by one win (`embercub` 45/112), and
   75 mm or 50 mm fails telemetry by one fight. 90 mm sits in the middle of a
   narrow window; the dead zone is a switch near the basic's standoff, not a
   dial, because the effective blind spot is `minReachMm + closing × startup`.
3. **The wedge's hole is invisible at 90 mm.** `(90 + 220) mm × MM_TO_WORLD` is
   0.248 world, below the wedge's fixed `TELL_INNER` of 0.3, so the drawn tell is
   unchanged on screen. The derivation is correct and the hole appears once an
   authored value clears ~155 mm; widening it now would paint ground the fighter
   occupies.
4. **Four files outside Phase 4's Touches were re-pinned** (`cup-contracts`,
   `cup.golden`, `bracket-model`, `morning-after/derive`) plus a new playback test
   file in Phase 5 — values and seeds only, each with a comment, all recorded as
   deviations in the phase evidence.
