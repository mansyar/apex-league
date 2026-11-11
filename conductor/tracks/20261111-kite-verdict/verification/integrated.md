# Integrated Verification — 20261111-kite-verdict

- Track: 20261111-kite-verdict — Kite Verdict
- Date (UTC): 2026-11-11
- Branch: feat/20261111-kite-verdict
- Range: 16fae61e..4e4ec64c (track work only; base is main @ 16fae61e)

## Tree equivalence

Phase 1 (diagnose, no production change) → Phase 2 (single lever: Kite aggression 40 → 55, commit e238d2a9) → Phase 3 (confirm on final tree, no production change). All phase checkpoints verified independently; working tree clean at acceptance.

## Final command table (all on the final tree)

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| Full gate | `bun run verify` | 0 | 4113 pass / 1 skip / 0 fail across 373 files; determinism gate byte-identical |
| Client build | `bun run build` | 0 | exit 0, pre-existing chunk-size warning only |
| Balance gate | `bun run balance` | 0 | capShare 197/840 (23.5%), decisive 797/840 (94.9%), median 30.16 s, damage 49/49, all rows ok |
| Telemetry | `bun run telemetry` | 0 | 13/13 checks ok; capShare 7/14 (50.0%) at the bound |

## End-to-end spec coverage

- FR-1/AC-1: baseline pinned — Kite 2/6 doctrine-table (65 paid dodges, 10.83/fight) and 3/6 dodge probe (91 paid, 15.17/fight) on seeds 20261109–11 × both orders (Phase 1).
- FR-2/AC-2: mechanism named "lost in the approach" — ~88% of steps below the 1600 floor, half the press output (7/6/8 vs 12/12/14 commits), dodges buying avoidance without conversion, stamina/fence ruled out (Phase 1).
- FR-3/AC-3: levers measured one at a time — aggression 55 kept as the only effective, pacing-neutral move (Phase 2).
- FR-4/AC-4: tool shipped — fixed probe 5/6 with 16 paid doctrine-table dodges and 58 (9.67/fight) dodge-probe dodges; every pacing bound green (Phase 3).
- FR-5/AC-5: trap branch correctly not taken; no trap copy written.
- FR-6/AC-6: non-zero paid-dodge hold — the kept lever left 16 doctrine-table and 58 (9.67/fight) dodge-probe paid dodges intact; no spec or bound change; guardrails intact.

## Carried items (not misses)

- Spec recording of the verdict (P3.T2.1's "spec records the verdict") is a doc-sync line, not a phase task — handled in the track's doc sync.
- Away from the fixed probe Kite remains the weakest doctrine; the track promised a tool for the fixed matchup, which shipped.
