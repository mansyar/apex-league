# Review — 20261111-minimum-reach (Minimum Reach)

- Reviewer: `conductor-reviewer` subagent, read-only
- Range: `e9a0f4b8..98350325` (43 files, +3,273 / −268)
- Round: 1
- Verdict: **PASS WITH DEBT** — no blocking code defect; four documentation
  findings had to land before the PR under the strict policy, and one test gap
  was worth taking with them.

## Reviewer's own runs

| Command | Result |
| --- | --- |
| `bun test --timeout 120000` | pass — 4,146 pass, 1 skip, 0 fail (4,147 tests / 373 files) |
| `bun run telemetry` | pass — 14/14 bounds, `deadZoneShare` 2.4%, `capShare` 25/42 (59.5%) |
| `bun run balance` | pass — 840 fights, 15/15 species, cap 26.7%, decisive 95.6%, 49/49 band, six bosses |
| `bun run trace --seed 20261111 --check` | pass — `plant_ox v embercub`, hash `0xb6cce858`, 5 invariants |
| `bun run build` | pass — 418 modules, 1,067.43 kB / 293.54 kB gzip |
| `bun run verify`, `biome check` | not run by the reviewer (denied / not on PATH); run by the primary — see below |

## Findings and disposition

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| F1 | Medium | `capShare`'s `why` still said 22/42 (52.4%) with three fights of headroom; the tree reads 25/42 (59.5%) with one. | **Fixed** — restated with the Phase-4 consumption recorded; the bound value did not move. |
| F2 | Medium | `deadZoneShare`'s `why` claimed 0.0% and "no positive value passes both gates". | **Fixed** — restated at 90 mm authored / 2.4% measured, with the 1,000 mm 92.5% comparison kept as the ceiling's justification. |
| F3 | Medium | `telemetry.test.ts` repeated both false claims. | **Fixed** — corrected to the shipped figures. |
| F4 | Medium | FR-3 required the swept contact point; the code judges the launch gap, and the spec's own edge case endorses it. | **Fixed** — FR-3 amended to the launch gap, with a dated note; the `Withdrawn` alternative was unnecessary because the launch-gap reading is the one the geometry can honour. |
| F5 | Low | The dead-zone metric could not detect the mechanic disappearing (0 would pass every gate). | **Fixed** — `expect(measured.deadZone.misses).toBeGreaterThan(0)` pins that the metric can see the blind spot. |
| F6 | Low | `inReach`'s doc claimed 0 rows read "exactly as before"; a sub-contact gap is now refused. | **Fixed** — reworded: 0 rows keep the outer test and gain the contact floor, and only a sub-contact clinch reads outside (which the separation pass keeps from persisting). |
| F7 | Low | The two trace hashes in the evidence are different fixtures, and integrated.md misattributed the difference to a sweep artifact. | **Fixed** — both hashes are named with their matchup; the simulation has not moved since the Phase-4 checkpoint. |
| F8 | Low | `battle-telemetry.ts` header said "45-fight" (45 was rejected); `projectile.test.ts` said the rows author no minimum yet. | **Fixed** — 42, and the projectile comment now says the row value is injected to pin geometry rather than tuning. |
| F9 | Low (nit) | `hurricane_spiral` is the only `FRAME_DATA` row broken over 12 lines. | **Accepted as debt** — cosmetic, and a shared constant would obscure which value each row authors. |
| F10 | Low | NFR-1 said "no new RNG draw"; the backing-shot path adds a conditional `takeCommit`. | **Fixed** — NFR-1 restated as "no new RNG stream", which is the clause the replay hash actually depends on. |

## The two judgement calls the primary referred to the reviewer

1. **`capShare` at 59.5% vs 60.0% — acceptable debt, not a defect.** Fixed seeds
   mean CI cannot flake; the value cannot move down (50/75 mm fail telemetry) or
   up (100 mm fails the roster gate by one `embercub` win), and NFR-2 forbids a
   second widening. Shipping a dead zone at all required the user's approval,
   which was given. What was not acceptable was the rationale text, now fixed.
2. **AC-8 at 90 mm — honestly met.** The criterion is an equality
   (`tellInnerWorld`), it holds, and it is tested both as a value and as drawn
   geometry. The visible hole needs ~155 mm of dead zone; that is disclosed in
   the phase evidence and in `integrated.md` rather than papered over.

## Re-pins outside the declared Touches

All accepted: `cup.golden.test.ts`, `cup-contracts.test.ts`,
`bracket-model.test.ts`, `morning-after/derive.test.ts` and Phase 5's new
`dense-playback.test.ts` are value/seed changes with explanatory comments and no
assertion weakened. `cooldown.test.ts`'s gap re-pin and the `damage.ts`
extraction were already recorded in `phase-2.md`.

## Primary re-verification after the fixes

| Command | Exit | Result |
| --- | --- | --- |
| `bunx biome check` on the four touched files | 0 | no fixes |
| `bun test` on `telemetry.test.ts` + `projectile.test.ts` | 0 | 39 pass, 0 fail |
| `bun run verify` | 0 | see `verification/integrated.md` for the track-wide figures |
| `bun run build` | 0 | 418 modules |
