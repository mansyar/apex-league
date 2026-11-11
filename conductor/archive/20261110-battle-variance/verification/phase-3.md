# Phase 3 verification — Kite Finds a Win

- Track: `20261110-battle-variance`, Phase 3 (FR-6, AC-6)
- Branch: `feat/20261110-battle-variance`
- Base: `d7e5af3c` (track base on `main`)
- Phase-start head: `34a08a86` (plan marker "Mark phase 'Kite Finds a Win' as in progress")
- Change commit: test pin below (see `git log`; head = latest commit listed in report JSON)
- Production diff: none (zero — see "Final lever")

## Commands and exit codes

| Command | Exit | Result |
|---|---|---|
| `bun test packages/sim/src/battle/continuous/controller-kite.test.ts --timeout 120000` | 0 | 2 pass, 0 fail |
| `bun run verify` | 1 | 3983 pass, 1 skip, 4 fail — all 4 in `balance-report.test.ts`, Phase-4-owned (inventory below); typecheck clean, Biome + determinism not reached (chain stops, same as Phase 2) |
| `bun run build` | 0 | client builds, 411 modules, only the known >500 kB chunk warning |
| `bun run telemetry` | 0 | 13/13 green, cap 7/14 = 50.0% exactly at bound (zero headroom, unchanged) |
| `bun run balance` | 1 | red only on the 4 known species rows (Phase 4); every other target ok |

## Diagnosis — why Kite was losing, and what changed

- R1 verdict: Kite 0/6 in the fixed probe (fire_drake, measured side varies,
  electric_hound on press, 3 seeds x both orders). It dodged the most per
  fight and won nothing — it avoided everything and finished nothing. The
  brief's assumption held: Kite lacked a way in (a tool), not a strategy.
- At this phase's head, before any Phase-3 edit, the probe reads:
  Press 33.3% (2/6), Circle 66.7% (4/6), **Kite 33.3% (2/6)**,
  Counter 100.0% (6/6). All four doctrines non-zero; Kite above zero.
- Kite's row still shows the old shape — median gap 1162 mm (holds the long
  band), 65 dodges filed at 10.3% in the fixed matchup, dodge probe 99 total
  / 16.50 per fight (highest of the four) — but the wins now come with it.
  What moved between R1 and now was not a doctrine: Phase 1 re-authored the
  accuracy ladder (100/99/88/95/99/100, MISS_SCALE deleted) so Kite's
  long-band shots resolve honestly, and Phase 2's per-seed execution jitter
  (cadence hold 1/16, press-commit skip 1/32, punish skip 1/16, dodge-side
  mirror) varies commit phasing per seed. Across 6 fights that is enough for
  two of Kite's shots to land first instead of none. No band, strafe intent,
  dodge policy, or move-selection strategy changed.

## Tried levers

No production lever was applied — the probe was measured first and is
already green, so any tuning would be gratuitous and would risk the frozen
constraints. Candidates considered and rejected without a code change:

| Candidate | Verdict | Reason |
|---|---|---|
| Nudge Kite floor/ceiling/aggression in `controller-profile.ts` | rejected | Doctrine bands are frozen — a redesign by definition, and the smallest-lever rule forbids it while the probe is green |
| Raise Kite `dodgeThresholdMm` or shade | rejected | Dodge policy frozen (FR-13); Kite already dodges most per fight — more avoidance never scored a win |
| Kit/stat tool for a Kite species in `discovery.ts` | rejected | Roster re-tune beyond Kite/variance scope; telemetry cap sits at 7/14 = 50.0% exactly at bound with zero headroom, so any damage/tempo shift risks pushing it over |
| Convert a gate assertion to `test.failing` | rejected | Explicitly forbidden; bounds never widened |

## Final lever and probe table

- Final lever: none (zero production change). The R1 0/6 verdict was already
  overturned by Phases 1+2 at this head; Phase 3 pins the outcome with a
  co-located regression test instead of retuning.
- New test: `packages/sim/src/battle/continuous/controller-kite.test.ts`
  replicates the probe's fixed matchup (typical lines, first-four kit,
  branch, temperament; 3 seeds x both orders = 6 fights per doctrine) and
  asserts AC-6 directly: Kite strict wins > 0, every doctrine
  (wins + draws/2) > 0.

Probe table (`bun run balance`, this head):

| doctrine | fights | win rate | rear-or-flank | rear | median gap | dodges | dodge rate | probe/fight |
|---|---|---|---|---|---|---|---|---|
| Press | 6 | 33.3% | 0.0% | 0.0% | 831 mm | 0 | 0.0% | 2.00 |
| Circle | 6 | 66.7% | 20.0% | 0.0% | 998 mm | 0 | 0.0% | 1.67 |
| Kite | 6 | 33.3% | 0.0% | 0.0% | 1162 mm | 65 | 10.3% | 16.50 |
| Counter | 6 | 100.0% | 0.0% | 0.0% | 802 mm | 0 | 0.0% | 8.00 |

Dodge probe (paid, where observable): Press 12 (2.00/fight), Circle 10
(1.67), Kite 99 (16.50), Counter 48 (8.00). Kite still pays the most
dodges per fight — and now wins with them.

## `bun run balance` vs Phase-2 baseline

- Same as Phase-2 baseline throughout: capShare 176/840 = 21.0% PASS,
  decisive 97.1% (662 ko + 154 cap wins >= 5 pts), cap-win quality 87.5%,
  median 30.04 s, p05 16.38 s, max 40.00 s, damage 49/49, diversity 34.8%,
  distinct medians ~100-112, all 6 bosses in range.
- 4 species rows red (Phase 4 owns the file — untouched):
  plant_ox 67.9%, earth_tortoise 29.5%, cindermoor 59.8%, galeheron 33.9%.
  `bun run balance` exits 1 on exactly these four.

## `bun run telemetry` vs baseline

- 13/13 green, identical to baseline: engagement min 379 / median 1085 /
  max 3992 mm, exchange home 0.30 / away 0.27 / combined 0.56 /s,
  idle 25.5%, contact 6.7%, retreats 7084/7003, positions min 106 /
  median 178 cells, duration 33.52-40.00 s.
- Cap share 7/14 = 50.0%, exactly at bound with zero headroom: the fix
  (no production change) does not push it over. Reported as required.

## Forced re-pins

- None. Zero production change, zero golden churn: no co-located golden
  re-pinned, no other file's golden moved (verify inventory matches the
  Phase-2 baseline exactly — same 4 `balance-report.test.ts` pins).
- `balance-report.test.ts` not touched (Phase-4-owned); its 4 red pins are
  carried to Phase 4 under the existing owner waiver.

## AC-6 table

| AC | Statement | Evidence | Result |
|---|---|---|---|
| AC-6a | Kite wins at least one sampled fight | probe 2/6; new test asserts strict wins > 0 | PASS |
| AC-6b | No other doctrine goes to zero | Press 2/6, Circle 4/6, Counter 6/6; new test asserts rate > 0 for all four | PASS |

## Primary verification

- Independently confirmed at `5df9cdab`: verify exit 1 with 4 fail of 3988, exactly the 4 known balance-report pins (distinct-fight, gate end-to-end, design-band list, KNOWN_MISSES). New `controller-kite.test.ts` 2/2 pass. Build exit 0.
- Probe claim holds: Kite 2/6 (Press 2/6, Circle 4/6, Counter 6/6) — all non-zero, Kite above zero. Zero production change is the correct minimal lever; the pin asserts floors (>0), not tuned values, so it cannot go brittle.
- Owner pattern (Phases 1–2 waivers extended): gate red carried to Phase 4. Phase NOT squashed: single test+evidence commit kept for audit.
| AC-6c | Without a doctrine redesign | zero production change; bands/intents/policy/strategy untouched (`git status` shows only the new test + this evidence) | PASS |
