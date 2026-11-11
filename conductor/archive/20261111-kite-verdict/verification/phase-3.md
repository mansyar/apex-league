# Phase 3 — Verdict: Kite ships (FR-4 branch)

- Track: 20261111-kite-verdict — Kite Verdict
- Phase: 3 — Verdict
- Date (UTC): 2026-11-11
- Branch: feat/20261111-kite-verdict
- Base: b82214cf
- Head: b82214cf (tree clean; no production change required — the kept Phase-2 lever was confirmed on the final tree)
- Result: verified

## Verdict

The fixed probe on the final tree reads **5/6 doctrine wins** with **paid dodges firing** (16 in the doctrine table, 58 / 9.67 per fight in the dodge probe) and **all pacing bounds green** (balance gate all-ok; telemetry all-ok with capShare 7/14 at the 50.0% bound). That clears the FR-4 bar (at least 2/6), so the **FR-4 branch shipped**: no further production change was needed and none was made. The FR-5 trap-label branch (P3.T2) was not triggered, so no spar/coach-room copy was written.

The shipped tool remains the single kept Phase-2 lever: **Kite aggression 40 → 55** (commit e238d2a9, verified in Phase 2). Phase 3 only re-ran the measurement on the final tree and recorded it here.

## Commands

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| Probe + pacing (telemetry script) | `bun run telemetry` | 0 | 14 seeded matchups, all bounds ok; capShare 7/14 (50.0%) at the bound |
| Client build | `bun run build` | 0 | vite build ok (417 modules, 372 ms) |
| Full gate | `bun run verify` | 0 | check ok; 4113 pass / 1 skip / 0 fail across 373 files; determinism gate ok (all GLBs byte-identical) |

The `bun run verify` run also re-emitted the fixed-probe figures used below (balance-report test prints the doctrine table, dodge probe, and balance gate; the controller-kite test prints the per-fight baselines).

## Fixed-probe figures on the final tree

Doctrine probe — fire_drake (typical) vs electric_hound (press), measured side varies, seeds 20261109–20261111 × orders 0/1:

| Seed / order | Winner | Reason | Paid dodges | Final HP |
|--------------|--------|--------|-------------|----------|
| 20261109 / 0 | measured | ko | 16 | drake 33, hound 0 |
| 20261110 / 0 | opponent | ko | 0 | drake 0, hound 18 |
| 20261111 / 0 | measured | ko | 0 | drake 7, hound 0 |
| 20261109 / 1 | measured | ko | 0 | hound 0, drake 32 |
| 20261110 / 1 | measured | ko | 0 | hound 0, drake 58 |
| 20261111 / 1 | measured | ko | 0 | hound 0, drake 40 |

Doctrine total: **5/6 wins, 16 paid dodges** (vs 0/6 at baseline; Phase-2 kept lever read 5/6 — reproduced on the final tree).

Dodge probe — electric_hound vs earth_tortoise:

| Seed / order | Winner | Reason | Paid dodges |
|--------------|--------|--------|-------------|
| 20261109 / 0 | opponent | time | 12 |
| 20261110 / 0 | opponent | time | 22 |
| 20261111 / 0 | opponent | time | 10 |
| 20261109 / 1 | opponent | time | 14 |
| 20261110 / 1 | measured | ko | 0 |
| 20261111 / 1 | opponent | time | 0 |

Dodge-probe total: **58 paid dodges, 9.67/fight** — dodges still firing; nothing silenced.

Balance Kite row (from the verify run): **Kite 6 fights, 83.3% win rate, median gap 1049 mm, 16 dodges, 2.9% dodge rate, 9.67 probe/fight**. Balance gate: all ok — capShare 197/840 (23.5%), decisive 797/840 (94.9%), median 30.16 s, p05 15.56 s, damage 49/49 in band, all six bosses beatable-and-not-trivial.

Telemetry (from `bun run telemetry` on the final tree): all 13 checks ok — engagement min 380 mm / median 1076 mm / max 3992 mm, exchange 0.32+0.27/s, idle 25.9%, contact 8.5%, retreats 6846/6792, positions min 94 cells, **capShare 7/14 (50.0%) at the bound**, duration 26.76–40.00 s.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| AC-4 (FR-4) | Tool ships: probe ≥ 2/6 with paid dodges firing and all pacing bounds green | Doctrine probe 5/6 with 16 paid dodges; dodge probe 58 (9.67/fight); balance gate all-ok (Kite 83.3%, median gap 1049 mm); telemetry all-ok (capShare 7/14 at 50.0% bound) — `bun run verify` exit 0, `bun run build` exit 0 | Pass — FR-4 branch shipped (lever from e238d2a9, confirmed on final tree) |
| AC-5 (FR-5) | If the probe had read below 2/6 or a pacing bound had gone red: situational copy in the spar picker and coach room, pickable, with spec recording the verdict | Not triggered: probe cleared 2/6 and every bound stayed green, so no trap copy was written; spec untouched (primary owns spec.md) | N/A — branch not taken |

## Evidence paths

- This report: `conductor/tracks/20261111-kite-verdict/verification/phase-3.md`
- Prior: `conductor/tracks/20261111-kite-verdict/verification/phase-2.md` (kept lever + Phase-2 figures), `conductor/tracks/20261111-kite-verdict/verification/phase-1.md` (baseline + mechanism)
- Verify full output (saved by runner): `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_1c9d18f02001Az5CLK9TnkzkAL.out` (first verify run) and `...\sh_1c9d44c5c001NhvfSw51jKWmp6.out` (second verify run, exit 0)

## Deviations

None. No production files touched in Phase 3 — the numbers on the final tree already satisfied FR-4 (no bound needed a nudge). No files outside Touches touched. Spec/plan untouched per rules (spec recording of the verdict is left to the primary).

## Notes

- Frozen constraints held: no stat/move/band/tier/DECISION_MS/stamina/poise/cooldown/MISS_SCALE/DISTINCT_FLOOR changes; other doctrines' rows and identity copy untouched.
- P3.T2 (trap copy in `apps/client/src/spar/*` and `apps/client/src/cup/coach-room.ts` with co-located tests) was evaluated and deliberately not executed — writing trap copy for a doctrine that now wins 5/6 would mislabel a shipped tool.
- Suggested spec line for the primary (not written by this phase): Kite ships — 5/6 fixed probe with paid dodges intact, bounds green; situational note (open ground rewards it; corners/tanks/cap fights remain its worst ground) is flavor, not a trap label.
- Evidence file left uncommitted for the primary state commit; no task commits in this phase (HEAD == base == b82214cf).

## Primary verification

- Independent: `bun run build` exit 0 on the final tree (client build ok, pre-existing chunk-size warning only). The subagent's two `bun run verify` runs (both exit 0, 4113 pass / 1 skip / 0 fail, determinism gate byte-identical) ran on the byte-identical tree (HEAD == base == b82214cf; the only delta is this uncommitted evidence file), so no re-run was needed.
- AC-4 confirmed by the recorded figures: doctrine probe 5/6 with 16 paid dodges, dodge probe 58 paid (9.67/fight), balance gate all-ok, telemetry 13/13 with capShare 7/14 at the bound — FR-4 branch correctly shipped, FR-5 correctly not triggered.
- P3.T2 / P3.T2.1 marked done as evaluated-and-deliberately-not-executed: writing trap copy for a doctrine that wins 5/6 would mislabel a shipped tool (evidence §Notes).
- Not squashed: nothing to squash — no source commits in this phase.
