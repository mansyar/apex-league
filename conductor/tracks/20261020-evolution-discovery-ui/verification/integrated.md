# Integrated Verification

- **Track:** `20261020-evolution-discovery-ui` — Evolution Threshold Discovery UI
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-evolution-discovery-ui`
- **Range:** `b97cb37` (base) → `df07788`
- **Result:** verified, with one open visual check (AC-7)

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Static | `bun run check` | 0 | sim 79, voxel 62, client 230 files, no type errors |
| Static | `bunx biome check` | 0 | 0 errors, 7 pre-existing `noNonNullAssertion` warnings |
| Unit | `bun test --timeout 120000` | 0 | 1751 pass, 1 skip, 0 fail, 139 files |
| Unit | `bun test --check --parallel --timeout 120000` | 0 | same suite, CI mode, 24s |
| Determinism | `bun run gate:determinism` | 0 | 9 creature artifacts + 5 prop digests reproduce |
| Build | `bun run build` | 0 | client bundle builds (pre-existing chunk-size warning) |
| Full | `bun run verify` | 0 | check + test + biome + determinism |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Baby panel covers age, recovery, mood | `growth.test.ts:92` (rows by gate, in order); `creature-detail.ts` renders it after the context rows | met |
| AC-2 | Undiscovered rows carry no digits or threshold words | `growth.test.ts:125`, `:146` (digit scan over every string); `creature-detail.test.ts:129` | met |
| AC-3 | Discovered rows show current over target | `growth.test.ts:176` (`Day 6 / 10`, `Mood 35 / 40`), `:192` (`52 / 60`, `0 / 1`), `:207` (recovery countdown) | met |
| AC-4 | Baby→juvenile sets one flag, champion sets both | `evolutionKnowledge.test.ts:100`, `:110`, `:120`, `:141` | met |
| AC-5 | v16 juvenile/champion/no-creature infer correctly | `evolutionKnowledge.test.ts:194`, `:206`, `:216`, `:223`; v15 `:255`; v1 `:265` | met |
| AC-6 | Champion reads as final stage with no rows | `growth.test.ts:267` | met |
| AC-7 | Open panel repaints when a settlement evolves the creature | Code path verified: `hud.ts` calls `creatureDetail.sync(state)` in the commit subscriber; `creature-detail.ts` gates it on `visible` and swaps only the growth host. **No automated DOM test, and no browser run.** | verified by inspection; live behaviour unchecked |
| AC-8 | Hall of Fame rendering byte-identical | No file under `apps/client/src/graduation/` or `legacy*` appears in `git diff --name-only b97cb37..HEAD`; the champion path renders zero rows, so no record surface is reached | met |
| AC-9 | Status readable without colour, section named | Glyph differs by shape (`✓` / `○`), status word present (`Met` / `Not yet`), section is `role="group"` with `aria-label` from `summary`; `creature-detail.test.ts:100`, `growth.test.ts:479` | met |
| AC-10 | Suite stays green, module-size guard included | `module-size.test.ts` green in the full run | met |

## Requirements

| ID | Where |
| --- | --- |
| FR-1 | `growth.ts` + `creature-detail.ts` Growth section |
| FR-2 | Undiscovered copy, digit-free by test |
| FR-3 | Discovered `current / target` pairs |
| FR-4 | `state.ts` per-gate flags, set in `advanceDay` only on a real stage change |
| FR-5 | `SAVE_VERSION` 17, migration infers from stage, ignores pre-existing payload fields |
| FR-6 | Final-stage branch in `growth.ts` |
| FR-7 | `hud.ts` → `creatureDetail.sync` → `renderGrowth` (see AC-7 caveat) |
| FR-8 | Untouched |
| NFR-1 | Glyph + word + `aria-label` |
| NFR-2 | `growth.ts` 6.8 KB, `creature-detail.ts` and `hud.ts` under cap, guard green |
| NFR-3 | Determinism gate green, no generator or artifact change |
| NFR-4 | v1, v15, v16 chains; round-trip and re-migration idempotence tests |
| NFR-5 | Coach-voiced copy, at most two sentences (`growth.test.ts:159`) |
| NFR-6 | No dependency added |

## Deviations accepted

- `packages/sim/src/save/storage.ts` — `isValidSaveState` now requires the v17
  record. Outside Phase 1 Touches, not initially flagged, accepted as the
  smallest change that keeps load and import validating the same shape.
- `apps/client/src/save-transfer.test.ts`, `corruptRecovery.test.ts`,
  `save.test.ts`, `transfer.test.ts` — version fixtures raised to 17.
- `main.ts` untouched: `hud.update` was the sufficient seam for FR-7.

## Open items

- AC-7 has no automated coverage and was not exercised in a browser. Verify by
  opening the panel on a creature one night short of evolving, then advancing.
