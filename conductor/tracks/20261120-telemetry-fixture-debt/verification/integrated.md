# Integrated Verification — Telemetry Fixture Debt Reconciliation

- Track: 20261120-telemetry-fixture-debt (Telemetry Fixture Debt Reconciliation)
- Phase: 3 — Documentation truth and integrated evidence
- Date: 2026-11-20
- Branch: chore/20261120-telemetry-fixture-debt
- Phase base / HEAD at capture: 691926dfbeb8772bbe21edfc5497696ba2f2b754
- Phase 2 checkpoint: 2c31115f
- Result: **verified by primary** — the exact owner-approved documentation edits were
  applied, all eight commands were independently re-run on the final tree with exit 0,
  and the game-contract scope proof is empty. The earlier subagent denials are resolved
  by the primary verification section at the end of this file.

## D-3 / D-4 disposition to land in current documentation

- **D-3 — closed as met.** The approved D-2 45 s fight cap side effect moved the
  42-pairing telemetry fixture to `cap share: 11/42 (26.2%)`, below the old 21/42
  (50.0%) smoke ceiling and the historical 20/42 (47.6%) reading. No pacing change,
  fixture edit, bound move or controller change was made in this track.
- **D-4 — closed as diagnosed and bounded, not fixed.** The 42-pairing fixture is
  deliberately unchanged. Its sampling bias stays measurable through the four-cell
  `fixture-audit` decomposition (A `11/42`, B `8/42`, C `7/42`, D `5/42`) and the
  telemetry stability re-pool at 14/30/42 fights. Re-stratification is deferred to a
  future product-decision track with its own before/after. Historical 20/42 and
  840-fight prose is preserved as 2026-11-12/13 history, not silently rewritten.
- **Audit truth (Phase 2, already landed):** `fixture-audit` prints
  `same-doctrine check at 1680 fights ... reference 580/1680 34.5% -> midpoint
  370/1680 22.0% = +12.5 points`; JSON `recordedStatPoints` is `12.5`; the audit
  remains a diagnostic and is never gated.

## Commands table (final tree, each run separately)

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| verify | `bun run verify` | 0 | 4459 pass, 1 skip, 0 fail, 670479 `expect()` calls, 4460 tests across 437 files [190.10s]; 1033 files Biome-clean; determinism gate OK; sim hash `0xff6f3d62` |
| build | `bun run build` | 0 | Vite 8.3.4, 438 modules, built in 1.30s; chunk-size warning only |
| balance | `bun run balance` | 0 | 1680 fights (ko 1306, time 370, draw 4); `cap share 370/1680 (22.0%)`; diagnostic reference `580/1680 (34.5%)`; 34/34 gates ok |
| telemetry | `bun run telemetry` | 0 | `cap share: 11/42 (26.2%)`; 14/14 bounds ok; stability re-pool 14/30/42 |
| trace | `bun run trace --owned earth_tortoise --rival embercub --doctrine kite --rival-doctrine press --seed 20261120 --check` | 0 | 45000 ms, 5/5 invariants ok, hash `0x1d0cc2ed` |
| gate | `bun run gate:determinism` | 0 | all species/stages byte-identical; props digests match (primary re-run) |
| fuzz | `bun run test:fuzz` | 0 | 139 pass / 0 fail / 129015 expect() calls (primary re-run) |
| audit | `bun run fixture-audit` | 0 | cells A-D 11/42, 8/42, 7/42, 5/42; `reference 580/1680 34.5% -> midpoint 370/1680 22.0% = +12.5 points` (primary re-run) |

No `&&` chains, pipes, wrapper binaries, or Code Mode routing were used.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-2 | product.md records D-3 met by D-2 side effect on 2026-11-20, no new pacing claim | dated reconciliation note applied by primary | pass |
| AC-3 | product.md records D-4 diagnosed/bounded, re-stratification deferred, fixture unchanged | dated reconciliation note applied by primary | pass |
| AC-6 | No telemetry/controller/ghost/SIM_VERSION/fence change | `git diff <base>..HEAD -- <game-contract paths>` empty | pass |
| AC-7 | tech-stack.md has dated note covering D-3/D-4, audit repair, unchanged contracts | dated note applied by primary | pass |
| AC-8 | All checks green, hash `0xff6f3d62`, telemetry `11/42`, audit + focused test pass | eight commands re-run by primary, all exit 0 | pass |
| AC-9 | integrated.md committed with commands, counts, N/A screenshots, scope proof, disposition | this file | pass |
| NFR-5 | No player data, credentials or passphrases introduced | only evidence/report text written; no secrets | pass |
| NFR-6 | Configured checks pass on final tree | see AC-8 | pass |

## Scope proof

```
git diff d5baa0abcd9b827e94d72ed31831c9a237a5ccf3..HEAD -- \
  packages/sim/scripts/battle-telemetry.ts \
  packages/sim/src/battle/continuous/telemetry.test.ts \
  packages/sim/src/battle/continuous/controller-*.ts \
  packages/sim/src/cup/ghost.ts
```
Output: empty (exit 0). After the primary applied the owner-approved documentation
edits, the phase diff is confined to `conductor/product.md`,
`conductor/tech-stack.md`, `verification/integrated.md`, `verification/phase-3.md`,
and `.conductor/evidence/**`. No game gate, fixture, fence, replay, species or
dependency contract changed.

## Module caps and screenshots

- Caps unchanged: 12,288 B client/sim and 24,576 B voxel, no allowlist; `bun run verify`
  passed with no module-cap error.
- Screenshots: **N/A** — documentation/evidence-only phase, no user-facing change.

## Evidence paths

- `.conductor/evidence/20261120-telemetry-fixture-debt/phase-3-commands.txt` — command exits and key lines
- `.conductor/evidence/20261120-telemetry-fixture-debt/verify-build.txt` — prior verify/build capture
- `.conductor/evidence/20261120-telemetry-fixture-debt/fixture-audit.txt` — Phase 1/2 audit captures
- `verification/phase-1.md`, `verification/phase-2.md`, `verification/owner-decision.md`

## Pending primary actions — exact documentation edits

All three `edit` calls returned `permission.rejected: Permission denied: edit`.
The documents were left unchanged. Apply these exact replacements:

### 1. conductor/product.md — reconciliation note after the D-4 audit paragraph

OLD:
```
      decisive subset than the roster — every telemetry bound therefore describes
      that walk, and re-stratifying it is a gate redesign with its own
      before/after, not a fix to smuggle in.
      **Infrastructure, same date:** the CI gate now triggers on every pull
```
NEW:
```
      decisive subset than the roster — every telemetry bound therefore describes
      that walk, and re-stratifying it is a gate redesign with its own
      before/after, not a fix to smuggle in.
      *(Reconciled 2026-11-20, track `20261120-telemetry-fixture-debt`: D-3 is
      closed as met by the approved D-2 45 s fight cap side effect — the 42-pairing
      telemetry fixture now reads `11/42 (26.2%)`, below the old 21/42 smoke ceiling,
      and no pacing or fixture change was made in this track. D-4 is closed as
      diagnosed and bounded, not fixed: the same 42-pairing fixture is deliberately
      unchanged, its sampling bias stays visible through the four-cell audit and the
      14/30/42 stability re-pool, and re-stratification is deferred to a future
      product-decision track with its own before/after. The historical 20/42 and
      840-fight figures above describe the 2026-11-12/13 measurements and remain
      accurate as history.)*
      **Infrastructure, same date:** the CI gate now triggers on every pull
```

### 2. conductor/product.md — roadmap D-3/D-4 clause

OLD:
```
  fence stays on the 840-fight matrix, the 20/42 fixture miss (D-3) and its
  population bias (D-4) remain recorded debt, the kite band (D-2) closed 2026-11-20 with a speed-aware Kite clamp, a 45 s fight cap and a two-species re-tune (track `20261120-kite-band-reachability`),
  and both debt pins remain in place.)*
```
NEW:
```
  fence stays on the 840-fight matrix, the 20/42 fixture miss (D-3) and its
  population bias (D-4) were recorded debt on 2026-11-18 and both closed on
  2026-11-20 (track `20261120-telemetry-fixture-debt`): D-3 met by the D-2 45 s cap
  side effect at `11/42 (26.2%)` with no new pacing change; D-4 diagnosed and bounded,
  fixture unchanged and re-stratification deferred to a future product-decision track.
  The kite band (D-2) closed 2026-11-20 with a speed-aware Kite clamp, a 45 s fight cap and a two-species re-tune (track `20261120-kite-band-reachability`),
  and both debt pins remain in place.)*
```

### 3. conductor/tech-stack.md — dated reconciliation note after the D-2 note

OLD:
```
  CORS or deploy change; no fence other than the 45 s cap moved.*

## Asset Pipeline
```
NEW:
```
  CORS or deploy change; no fence other than the 45 s cap moved.*
- *2026-11-20 — Telemetry fixture debt reconciliation (track
  `20261120-telemetry-fixture-debt`): `fixture-audit` now prints the live matrix
  comparison `1680 / 580 / 370` and the derived `+12.5 points` instead of the stale
  840-fight arithmetic; its historical 2026-11-12 figures are kept only as an
  explicitly labelled note. D-3 is closed as met by the D-2 cap side effect at
  `11/42 (26.2%)` and D-4 as diagnosed and bounded; telemetry bounds and the
  42-pairing fixture are unchanged, and no gate, fence, controller, species,
  `SIM_VERSION` (4), ghost pins (4/5), save schema, protocol or dependency changed.
  Battle hash remains `0xff6f3d62`, balance stays 34/34 green at `370/1680 (22.0%)`,
  and the audit remains a diagnostic with no pass/fail gate.*

## Asset Pipeline
```

## Deviations

None. No write outside the five Touches was attempted.

## Notes

- The denied documentation edits are not a product decision: the owner approved them
  during planning and the exact replacement text is supplied above.
- The three denied shell commands were not retried, wrapped, piped or rerouted.
  Determinism is independently covered inside the passing `bun run verify`; the
  audit and fuzz results are covered by the Phase 2 primary handoff on the same
  repaired source tree (no source diff since).
- The simulation hash `0xff6f3d62` and pinned trace hash `0x1d0cc2ed` are unchanged.

## Primary verification (final tree, HEAD `b7f36e2a`)

The primary applied the exact owner-approved documentation edits recorded in the
"Pending primary actions" section above, then independently re-ran all eight
commands on the final tree. Output directory:
`C:\Users\Ansyar\AppData\Local\Temp\opencode\d3d4-p3-final\`.

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| 1 | `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail, 670479 `expect()` calls, 4460 tests / 437 files, Biome clean, sim hash `0xff6f3d62`; expected non-gating smoke diagnostic only |
| 2 | `bun run build` | 0 | Vite 438 modules, pre-existing >500 kB chunk warning only |
| 3 | `bun run balance` | 0 | 1680 fights, `370/1680 (22.0%)`, decisiveShare 95.1%, 34/34 gates |
| 4 | `bun run gate:determinism` | 0 | all 21 species × 3 stages + 5 props byte-identical |
| 5 | `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls |
| 6 | `bun run fixture-audit` | 0 | cells A-D `11/42`, `8/42`, `7/42`, `5/42`; live line `reference 580/1680 34.5%  ->  midpoint 370/1680 22.0%  =  +12.5 points` |
| 7 | `bun run telemetry` | 0 | `11/42 (26.2%)`; 14/14 bounds; re-pool 14/30/42 |
| 8 | `bun run trace --owned earth_tortoise --rival embercub --doctrine kite --rival-doctrine press --seed 20261120 --check` | 0 | 45000 ms, 5/5 invariants, hash `0x1d0cc2ed` |

Final scope proof after all edits:
`git diff --quiet d5baa0abcd9b827e94d72ed31831c9a237a5ccf3..HEAD -- packages/sim/scripts/battle-telemetry.ts packages/sim/src/battle/continuous/telemetry.test.ts packages/sim/src/battle/continuous/controller-*.ts packages/sim/src/battle/continuous/resolve.ts packages/sim/src/battle/continuous/resolve.test.ts packages/sim/src/cup/ghost.ts packages/sim/src/cup/ghost.test.ts` exits 0. No game gate, fixture, fence, replay, species or dependency contract changed.

**Final verdict: VERIFIED.** D-3 is met by the D-2 side effect; D-4 is diagnosed
and bounded with the fixture deliberately unchanged; the audit reports the live
matrix arithmetic; all configured checks are green with hash `0xff6f3d62`.
