# Verification — Global Pacing, Phase 3 (Combined cadence and species correction)

- Track: `20261117-global-pacing`
- Phase: 3 — Combined cadence and species correction
- Date: 2026-11-17
- Branch: `chore/20261117-global-pacing` (never switched)
- Phase base / final tree: `8164616d9a20591372d0641c5bf0b75f05653600`
- Result: **BLOCKED** — the combined fix meets both cap targets and all 15 species rows,
  but it cannot be shipped inside the phase's `Touches` set: the cadence change turns
  green assertions in files outside `Touches` red, and making them green requires either
  widening scope or weakening / re-designing assertions, both forbidden by the brief.

## 1. Verdict

`DECISION_MS = 200` / `DECISION_STEPS = 10` (Phase 2 R5a) is still the only controller
rung that meets both cap targets: fixture **13/42 (31.0%)** and matrix **188/840 (22.4%)**.
A minimum set of in-envelope species narrowings restored all four broken species rows
and kept every matrix gate green (fixture baseline remains 20/42 at the shipped tree
because the change was not shipped).

However, `bun run verify` on the combined tree fails **30 assertions**:

- **12** are in files outside `Touches` and are caused by the cadence change alone
  (reproduced with every species value restored to base: 17 failures total, of which 5
  are in `balance-report.test.ts`, inside `Touches`).
- **13+** are additional golden/digest/band pins broken by the species narrowings, also
  outside `Touches` (absolute boss and rival stat pins, hound-vs-starter relation tests,
  breeding/clamp goldens, frame/stream digests, sibling-band test).
- **5** are in `balance-report.test.ts` (inside `Touches`) and are value-only re-pins.

Two of the cadence failures are **not stale goldens**: `controller-doctrine.test.ts`
asserts `circleEdge > pressEdge` and `circleFlanks > pressFlanks`, and at 200 ms both
sides measure **0**. Circle no longer earns flank-or-rear hits in that fixed matchup.
Restoring it means changing controller behaviour or re-authoring the doctrine probe —
a product/design decision the brief says to stop on. The derive/bracket/cup fixtures
similarly flip from `champion` to `eliminated`, so re-pinning them would change what the
tests assert about gameplay rather than record a moved number.

Per the brief (P3.T5, "if any row is still red, report blocked") and the Phase 1 block
condition that a rung turning green gates red is a block, Phase 3 reports blocked. The
tree was restored to the phase base and **no code, pin, version or bound was changed**.

## 2. Five verification commands (final, restored base tree)

All five run exactly as named in the brief; exit codes are real.

| # | Command | Exit | Headline result |
| --- | --- | --- | --- |
| 1 | `bun run telemetry` | 0 | cap 20/42 (47.6%); 14/14 bounds `ok`; dead zone 27 commits (2.9%); idle 25.7%; positions min 46 / median 163; exchange 0.32/0.32; duration 14.48–40.00 s |
| 2 | `bun run balance` | 0 | 840 fights; cap 224/840 (26.7%); decisive 803/840 (95.6%); cap-win quality 188/224 (83.9%); median 31.21 s; p05 16.60 s; max 40.00 s; damageBand 49/49; 15/15 species `ok`; 6/6 bosses `ok`; reference line 377/840 (44.9%, diagnostic) |
| 3 | `bun run trace --seed 20261111 --check` | 0 | final hash `0xb6cce858` (unchanged from base); 5/5 invariants `ok`; ko — Embercub wins; blows 8/9; damage 82/196; 31,000 ms; gap 499/961/3984 mm |
| 4 | `bun run verify` | 0 | 4167 pass / 1 skip / 0 fail; 491,194 expect() calls; 4168 tests across 375 files; Biome 940 files no fixes; determinism gate OK (all species byte-identical) |
| 5 | `bun run build` | 0 | 418 modules transformed; built in 906 ms; only the pre-existing >500 kB chunk warning |

## 3. P3.T1 — R5a reproduction (before any species edit)

With `DECISION_MS = 200`, `DECISION_STEPS = 10` and all species at base values:

- `bun run telemetry`: **13/42 (31.0%)**, all 14 bounds `ok`.
- `bun run balance`: exit 1 — cap **188/840 (22.4%)**, decisive 809/840 (96.3%),
  cap-win quality 158/188 (84.0%), median 28.95 s, p05 14.48 s, max 40.00 s,
  damageBand 49/49, all 6 bosses `ok`, reference line 280/840 (33.3%, diagnostic).
  Exactly four species rows red:

| Species | Observed | Published bound | Direction |
| --- | --- | --- | --- |
| fire_drake | 59.8% (67/112) | ≤ 59.4% | lower ≥ 0.4 pts |
| plant_ox | 62.5% (70/112) | ≤ 59.6% | lower ≥ 2.9 pts |
| voltfox | 39.3% (44/112) | ≥ 40.7% | raise ≥ 1.4 pts |
| shalemole | 60.7% (68/112) | ≤ 59.5% | lower ≥ 1.2 pts |

All other 11 species rows `ok`. This reproduces Phase 2 R5a exactly.

## 4. P3.T2 — species rung table (one whole-point move at a time)

Every rung obeys `newLo >= oldLo && newHi <= oldHi`; no envelope widened.
`identity.test.ts` stayed byte-identical and green; `earth_tortoise` untouched.

| Rung | Edit (midpoint shift) | fire_drake | plant_ox | voltfox | shalemole | Cap | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| base | — | 59.8% | 62.5% | 39.3% | 60.7% | 188/840 | REJECTED — 4 rows red |
| S1 | fire_drake atk [11,15]→[11,14] (13→12) | 59.8% | 62.5% | 40.2% | 60.7% | 189/840 | REJECTED — atk not an effective lever |
| S2 | + fire_drake hp [145,178]→[145,176] (161→160) | 58.9% ok | 62.5% | 40.2% | 60.7% | 189/840 | REJECTED — 3 rows red; later found to break content pins |
| S3 | + plant_ox def [11,15]→[11,14] (13→12) | 58.9% ok | 51.8% ok | 42.9% ok | 61.6% | 185/840 | REJECTED — only shalemole red |
| S4 | + shalemole hp [151,181]→[151,180] (166→165) | 58.9% ok | 51.8% ok | 42.9% ok | 61.6% | 185/840 | REJECTED — 1 HP flipped no wins |
| S5 | + shalemole atk [8,11]→[8,9] (9→8) | 59.8% | 54.5% ok | 42.9% ok | 44.6% ok | 194/840 | REJECTED — weakening shalemole gives fire_drake wins |
| S6 | + fire_drake def [10,13]→[10,11] (11→10) | 50.4% ok | 54.5% ok | 43.8% ok | 45.5% ok | 190/840 | **all 15 species green**, but verify red (see §5) |
| S7 | restore fire_drake hp [145,178] (content pins) | 51.3% ok | 54.5% ok | 43.8% ok | 45.5% ok | 190/840 | all 15 species green; verify still red |

S6/S7 non-species gates (all green): decisive 808/840 (96.2%), cap-win quality
160/190 (84.2%), median 28.98 s, p05 14.72 s, max 40.00 s, damageBand 49/49,
all 6 bosses `ok`, reference line 306/840 (36.4%, diagnostic). Final narrowed
envelopes at S7: fire_drake hp [145,178] (unchanged), atk [11,14], def [10,11],
spd [9,12]; plant_ox def [11,14]; shalemole hp [151,180], atk [8,9],
def [10,13], spd [5,8]; voltfox untouched. Every pair is a subset of the
original envelope.

S7 was required because narrowing fire_drake hp to 176 broke authored content pins
outside `Touches`: `bosses.test.ts:66` (boss hp 178), `cup/rival-roster.test.ts:136`
(rival hp 178), `species.test.ts:130` (electric_hound hp 177 must be below the
minimum starter hp ceiling), and `legacy.test.ts:321` (clamp maximum hp 178).
Restoring hp kept balance green.

## 5. Why `verify` cannot be green inside `Touches`

Diagnostics: with `DECISION_MS = 200` and **all species restored to base**, `bun run
verify` still failed 17 assertions (4150 pass / 1 skip / 17 fail). Therefore 17
failures come from the cadence change and 13 more from the species narrowings.

Cadence-only failures (12 outside `Touches`, 5 inside):

| File | Count | Inside Touches | Nature |
| --- | --- | --- | --- |
| `controller-doctrine.test.ts` | 2 | no | **behavioural regression** — `circleEdge`/`circleFlanks` both 0 vs `toBeGreaterThan(0)`; cannot re-pin without weakening or re-authoring the probe |
| `apps/client/src/morning-after/derive.test.ts` | 1 | no | champion → eliminated fixture flip |
| `apps/client/src/bracket-model.test.ts` | 1 | no | champion → eliminated fixture flip |
| `cup/engine.test.ts` | 4 | no | placement / draw-stream goldens |
| `cup/session-golden.test.ts` | 1 | no | seed-1 crown golden |
| `cup/fixture-audit.test.ts` | 1 | no | four-cell numbers |
| `battle-trace.test.ts` | 2 | no | KO fixture ends in time; missing strike event |
| `balance-report.test.ts` | 5 | yes | value-only re-pins (distinct/misses/margin/KNOWN_MISSES/gate) |

Species-caused failures outside `Touches` (from the full combined-tree run):
`bosses.test.ts:66`, `cup/rival-roster.test.ts:136`, `species.test.ts:130`,
`legacy.test.ts:321`, `breeding.test.ts:107` (fire_drake child golden
{hp 167, atk 13, def 13} → {hp 166, atk 12, def 11}),
`branch-balance.test.ts:164` (sibling 58.3% > 55% band), plus
`clock.contract.test.ts`, `event-stream.test.ts`, `exhibition.test.ts`,
`makeExhibition` and `cup.test.ts:198` digests/goldens. S7 removed the absolute
stat-pin failures, but the atk/def golden, sibling band and digests remain.

Re-pinning 12 files outside `Touches` would require scope expansion; the doctrine
and champion-fixture failures additionally require a product/design decision
(whether Circle should still earn flanks at 200 ms, and which cup runs must remain
winnable). The brief forbids both, so the phase stops here.

## 6. Debt pins and version guard — NOT applied

Nothing was shipped, so no pin was promoted and no version was bumped:

- `telemetry.test.ts` one-in-three expectation restored to
  `expect(cap.count * 3).toBeGreaterThan(cap.total)` with its original debt comment.
  It would have been promoted to `.toBeLessThanOrEqual(cap.total)` (13×3 = 39 ≤ 42)
  had the tree shipped.
- `pacing.test.ts` KO-majority test restored to `test.failing(...)`. Promotion was
  **attempted and measured invalid**: with `DECISION_MS = 200` the 42-fight sample
  read only **16/42 by KO** (`byKo * 2 = 32`, expected `> 42`), so the body does not
  pass and the marker must stay. No `.skip` was introduced.
- `cup/ghost.ts` `SIM_VERSION` stays **3**; `ghost.test.ts` pins stay `toBe(3)` and
  `SIM_VERSION + 1 === 4`. The 200 ms candidate produced hash `0xe00a0782` with
  5/5 invariants `ok` and byte-identical replay, but it is not shipped.
- `balance-report.test.ts` unchanged; the reference-line cap share stays 377/840
  (44.9%) at base. No assertion was weakened.

## 7. Before/after gate table (all values unchanged at the shipped tree)

| Gate / value | Before (phase base) | After (final tree) | Moved? |
| --- | --- | --- | --- |
| `DECISION_MS` / `DECISION_STEPS` | 240 / 12 | 240 / 12 | no |
| Fixture cap share | 20/42 (47.6%) | 20/42 (47.6%) | no |
| Matrix cap share / target | 224/840 (26.7%) / ≤ 1/3 | 224/840 (26.7%) / ≤ 1/3 | no |
| Decisive share / floor | 95.6% / ≥ 2/3 | 95.6% / ≥ 2/3 | no |
| Cap-win quality / floor | 83.9% / ≥ 2/3 | 83.9% / ≥ 2/3 | no |
| Median duration / band | 31.21 s / 25–40 s | 31.21 s / 25–40 s | no |
| Species rows / tolerance | 15/15 `ok`, slack = Z·√(0.25/distinct) | same | no |
| Damage band | 49/49 in 4–12% | 49/49 in 4–12% | no |
| `BOUNDS`, `CAP_MAX`, `DISTINCT_FLOOR`, cap duration | unchanged | unchanged | no |
| Species roll envelopes (all) | authored base | authored base | no |
| `identity.test.ts` / `earth_tortoise` | byte-identical | byte-identical | no |
| Telemetry one-in-three pin | missed/debt | missed/debt | no |
| `SIM_VERSION` / trace hash | 3 / `0xb6cce858` | 3 / `0xb6cce858` | no |
| `git diff --stat` | — | empty | tree == base |

## 8. AC verdicts

| AC | Requirement | Verdict |
| --- | --- | --- |
| AC-2 | Full sweep recorded | met — §3–§5 record every rung and rejection |
| AC-3 | Fixture ≤ 14/42 | not met on shipped tree (20/42); demonstrated at 13/42 but unshippable inside Touches |
| AC-4 | Matrix ≤ 1/3 | met at base (224/840); combined candidate 188/840 also met |
| AC-5 | Both debt pins promoted | not met — telemetry reverted; pacing body measured failing (16/42 by KO) |
| AC-6 | Version 4 + both ghost pins + new hash | not met — no policy shipped; version stays 3, hash `0xb6cce858` |
| AC-7 | Before/after table with no moved bound | met — §7 |
| AC-8 | Balance rows and 14 telemetry bounds | met at restored base — §2 |
| AC-9 | `verify` + `build` green, no weakened assertion | met at restored base — §2 |
| AC-10 | Blocked with full sweep if unmet | met — this file |
| AC-11 | Combined tree green with 15 species, 49 moves, identity fence, v4 | not met — verify red outside Touches |

## 9. Deviations

None. No file outside `Touches` was modified; `identity.test.ts` is byte-identical.
All temporary candidate edits were reverted, and the final tree is byte-identical to
the phase base.

## 10. Blockers

- **Design/scope decision (not a tool denial).** Making the combined tree pass
  `bun run verify` requires (a) editing at least 12 test files outside `Touches`, and
  (b) deciding whether Circle's flank behaviour and the champion cup fixtures should
  change at 200 ms. Both are forbidden by the brief. No command was denied by the
  environment.

## 11. Notes

- All candidate edits were made and measured; none was silently kept. The final
  `git diff --stat` is empty and `HEAD` remains at `8164616d` before this evidence
  commit.
- The matrix cap target was never the obstacle: base 224/840 already meets ≤ 1/3.
  The fixture one-in-three target is the structural shortfall identified in Phase 1.
- Reopening this work needs a primary-agent decision that expands `Touches` to the
  cadence-sensitive golden/relation tests and settles the doctrine-fixture question,
  or a different controller policy that raises fixture throughput without changing
  Circle's flank behaviour or cup outcomes.

## Primary verification

| Check | Result |
| --- | --- |
| `git status --porcelain` | empty |
| `git diff --stat 8164616d..HEAD` | 1 file, +213/−0 — evidence only; no code or test shipped |
| `bun run verify` (primary re-run) | exit 0 on the restored base; candidate hash `0xe00a0782` was measured but never shipped |

The blocker is a design/scope decision, not a tool denial or a failed environment
check. AC-10 is met because the phase reports blocked with the full sweep rather
than moving a line.
