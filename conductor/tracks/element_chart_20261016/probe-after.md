# Probe After — Element Chart & Battle Length (Phase 1 pin)

**Pinned:** factor pair **3/2·2/3** (advantage ×1.5, resist ×2/3) with the global
**HP ×2** scale (species bounds + boss pins) and **trained HP pays double**
(+2 per trained point, cap 6 points = +12 HP).

## Acceptance bands (FR5) — disadvantaged player, equal stats, 12 seeds

Canonical probe stats: hp 88 (2× base 44), atk 10, def 9, spd 8; training
+2 hp / +1 others per level; both sides "balanced", full kits.

| disadvantaged matchup | +0 | +2 | +4 | +6 (cap) |
|---|---|---|---|---|
| plant_ox ← fire_drake | 8.3% | 25.0% | 91.7% | 100% |
| water_axolotl ← plant_ox | 0% | 33.3% | 100% | 100% |
| fire_drake ← water_axolotl | 0% | 0% | 100% | 100% |

- **Cap band (≥35%):** all three matchups at 100% ✓
- **Base ceiling (≤25%):** 0–8.3% ✓
- **Draw ceiling (≤20%):** max observed 8.3% (one double-ko cell) ✓

## Candidate matrix considered (all band-compliant)

| candidate | +0 | +2 | +4 | +6 |
|---|---|---|---|---|
| **3/2·2/3, HP×2 (pinned)** | 0–8.3% | 0–33.3% | 91–100% | 100% |
| 4/3·3/4, HP×2 | 0–8.3% | 8–83% | 100% | 100% |
| 3/2·2/3, HP×3 | 0% | 25–33% | 100% | 100% |
| 4/3·3/4, HP×3 | 0% | 67–83% | 100% | 100% |

**Why 3/2·2/3 + HP×2:** the softer 4/3 pair lets ~+2 training erase the type
tax (weak type identity); 3/2 keeps the tax expensive (~+4 balanced training ≈
12 AP ≈ 4+ days to overcome — "grindable to win", the user's stated intent).
HP×2 over HP×3 keeps numbers readable (76–104) with the same curve shape.

## Shape notes

- The curve is a **step, not a ramp**: below the flip threshold the
  disadvantaged side loses nearly everything; above it, wins are near-uniform.
  The engine is deterministic per (stats, chart, seed) — once the stat-product
  ratio passes the type swing, tempo dominance (knockback/stagger cadence)
  flips outcomes wholesale. HP×2 lengthens battles (more accuracy/dodge rolls)
  but did not grade the middle; accepted as learnable ("train ~2× the stat
  budget before challenging your bad matchup").
- Saturation at 100% is acceptable: the bands are a floor, and real cups add
  rival ramps (±5%) and mixed stat rolls on top of the equal-stat baseline.

## Probe instrumentation notes

- **Bug found and fixed during red phase:** the probe originally tallied
  `result.winner === player.id`, but `BattleResult.winner` is the fighter's
  *name* — every battle was scored a loss, producing flat 0% tables. The boss
  probe (`bosses.balance.test.ts`) was unaffected (compares by name).
- A 9-cell scripted sweep produced the same flat tables and was discarded as
  invalid (same bug); the pinned tables above come from clean single-candidate
  runs, cross-checked with a direct `resolveBattle` duel harness.
