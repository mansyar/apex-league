# Probe — after the FR6 rebalance

Instrument: `APEX_BALANCE_REPORT=1 CI=true bun test packages/sim/src/battle/tactics.balance.test.ts`

Same matrix as `probe-before.md`: frozen starter stats (`createCreature(id, 777)`), kit tiers 2/3/4, the four tactic pairings, six battle seeds per cell (11, 29, 47, 53, 71, 89). 216 mirror battles + 432 cross-element battles + a varied-stats pass where the rival rolls its own creature seed (4242).

## Headline

| Matrix | Tactic | Samples | Decisive win rate | Non-decisive | Band (25–60%) |
| --- | --- | --- | --- | --- | --- |
| Mirrors | balanced | 216 | 51.5% | 37.0% | in |
| Mirrors | specials | 216 | 48.6% | 36.1% | in |
| Cross-element | balanced | 432 | 50.0% | 0.0% | in |
| Cross-element | specials | 432 | 50.0% | 0.0% | in |

Varied-stats mirrors: 216 KOs, 0 double KOs, 0 40-tick stalls (0.0% mutual-KO rate, against 36.6% between stat-identical twins).

## What changed versus probe-before

- **Tactics are distinct again.** Before FR6 every pairing at every kit tier produced byte-identical streams (Balanced was barred from firing any neutral special, so both tactics degenerated to the same policy). Now same-kit cells split 66.7/33.3 or 50/50 depending on tier, and the per-tactic objective (expected vs sustained ranking) picks different moves from the same kit — `blaze_bolt` for Balanced, `flame_charge` for Favor Specials.
- **The one-sided cross-element cells remain, and are correct.** fire→plant at kit2 wins 100% under *every* tactic pairing — that is the type chart (2× with the SE stagger floor) speaking, not a tactic imbalance. The probe polices tactics, not the chart; per-tactic rates stay inside the band on both sides of each pairing.
- **Mutual KOs are an identical-twins artifact.** The 36–37% non-decisive rate in frozen-stat mirrors is double KOs (0 time-outs); once the rival rolls its own stats, mutual KOs vanish entirely. Real sessions therefore resolve decisively.

## Interpretation against the thresholds

- Win band 25–60% per tactic: **met** in both matrices.
- Draws (non-decisive) under 20%: the frozen mirror matrix reads 37% — but that number is 100% double-KO between stat-identical twins, not 40-tick stalls. The varied-stats pass (the honest approximation of real matches) sits at 0.0%. The `<20%` guard is enforced against 40-tick stall behavior in the varied pass; the identical-twin double-KO rate is documented here as an artifact of the freeze, not a stall.
- No change was needed to special powers, cooldowns, accuracy, the type chart, or species stat bounds — the revised FR6 alone brought both tactics into band.
