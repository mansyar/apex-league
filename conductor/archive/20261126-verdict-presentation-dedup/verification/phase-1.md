# Phase 1 Verification — Shared verdict copy model

- Track: `20261126-verdict-presentation-dedup` — Deduplicate verdict presentation across spar, cup, and battle HUD
- Phase: 1 — Shared verdict copy model (FR-1, FR-2, FR-4, FR-5, AC-1, NFR-2)
- Date: 2026-11-26
- Branch: `refactor/20261126-verdict-presentation-dedup`
- Base commit: `e4cfc671026d729ef5e819c41f39eb782eb15398`
- Head commit: `aca92bfbe1be5eb0daebcc515ed7ae4a9fd8f648` (short `aca92bfb`)
- Result: **Phase verification green; full gate incomplete** — the exact phase command passes, but `bun run verify` was stopped by an unrelated voxel test timeout, and the Biome + determinism subcommands were denied to this subagent. The primary must run the remaining full-gate checks (see Blockers / Notes).

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Red — types + unit (before module) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/copy.test.ts apps/client/src/battleUI.test.ts` | 1 | TS2307 `Cannot find module './copy' or its corresponding type declarations.` — verbatim output in Notes |
| Green — exact phase verification (after module) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/copy.test.ts apps/client/src/battleUI.test.ts` | 0 | `44 pass`, `0 fail`, `63 expect() calls`, 2 files, 427 ms |
| Static — typecheck | `bun run check` | 0 | All four workspaces clean: voxel 214, sim 253, client 558, server 185 files |
| Unit — size budget | `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts` | 0 | `5 pass`, `0 fail` — new module within the 12 KB cap |
| Build | `bun run build` | 0 | Vite production build, 441 modules, built in 1.39 s (pre-existing large-chunk warning only) |
| Full gate | `bun run verify` | 1 | `4555 pass`, `1 skip`, `1 fail` in 444 files (330.72 s). Sole failure: `packages/voxel/src/stage.test.ts` → `stage-variant build API > champion builds pass the proportion-budget audit across seeds` timed out after 120000 ms. Unrelated to client copy. Chain stopped before Biome and determinism. |
| Static — lint | `biome check apps/client/src/verdict/copy.ts apps/client/src/verdict/copy.test.ts` | 1 | `biome` is not on PATH in this shell |
| Static — lint | `bunx biome check apps/client/src/verdict/copy.ts apps/client/src/verdict/copy.test.ts` | denied | `Permission denied: shell` — primary must run |
| Static — determinism | `bun run gate:determinism` | denied | `Permission denied: shell` — primary must run |

## Acceptance criteria

| ID | Evidence | Status |
|---|---|---|
| FR-1 | `copy.ts` exports `battleStampCopy` (spar/cup titles + reason subline) and `cupResultCopy` (champion/eliminated title + sub) as the single shared copy model; adapters remain unwired until Phase 2 by design. | Pass |
| FR-2 | `copy.ts` imports `reasonLine` from `../battleUI` and uses it for every stamp `sub`; reason rows pin `time`, `double_ko`, default KO for both flows. | Pass |
| FR-4 | Table rows pin mirror-name qualification for spar (`Victory — your …` / `Victory — rival …`) and cup (`Victory — your fighter` / `Defeat — the rival`), plus distinct-name and unknown-key fallbacks. | Pass |
| FR-5 | Table rows pin `Champion` / `${player} takes the ${cupName}!`, `Eliminated` / `${championName} takes the ${cupName}.`, and `Eliminated` / `The cup ends without a champion.` | Pass |
| AC-1 | Exact-string table test: 44 pass, 0 fail across `copy.test.ts` + `battleUI.test.ts`; includes null winner, `fight: null`, empty `finalHp` via the `winningSideKey` import, and frozen-result assertions. | Pass |
| NFR-2 | Pure module: no DOM, state, or side effects; both seams return `Object.freeze({ title, sub })`; structural `StampFight` avoids importing the playback driver; typecheck and module-size test pass. | Pass |

## Evidence paths

- `apps/client/src/verdict/copy.ts` — pure shared copy module.
- `apps/client/src/verdict/copy.test.ts` — table test pinning all authoritative strings.
- Commits: `524fe371` (tests first, red observed), `aca92bfb` (module + test-fixture fix, green).
- Full-gate output: `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_215e815430011ECVXnGu94zSQq.out`
- This report: `conductor/tracks/20261126-verdict-presentation-dedup/verification/phase-1.md`

## Deviations

None. No file outside the two `Touches` paths was modified.

## Notes

Red-state output, verbatim (exact phase command run immediately after the test-only commit `524fe371`, before `copy.ts` existed):

```text
bun test v1.4.4 (38afee6c8) 4x PARALLEL
<error file="apps/client/src/verdict/copy.test.ts" line="3" column="65" code="TS2307">
Cannot find module './copy' or its corresponding type declarations.
<source>
1 | import { describe, expect, test } from "bun:test"
2 | import type { BattleResult } from "@apex/sim"
3 | import { battleStampCopy, cupResultCopy, type StampFight } from "./copy"
                                                                    ^^^^^^^^
4 |
5 | /**
</source>
Found 1 error in 1 file, checked 236 files [2.27s]

Exit code: 1
```

Intermediate green attempt: two distinct-name cup rows initially failed because the cup table reused the `mirror` fight fixture for every row, yielding `Victory — your fighter` / `Defeat — the rival` instead of `Victory` / `Defeat`. Fixed by adding a per-row `fight` field (`distinct` vs `mirror`); committed together with the module in `aca92bfb`. No authoritative string was changed.

Full gate: `bun run verify` reached the test leg after a clean `bun run check`, then failed only on a pre-existing, slow voxel test (`stage.test.ts` proportion-budget audit, timeout after 120000 ms). It never reached `biome check` or `bun run gate:determinism`. The phase-scoped command, typecheck, module-size test, and build are all green. The primary should run `biome check` on the two touched files, `bun run gate:determinism`, and re-run the full gate once machine load permits; none of these failures involve the verdict copy module.

The evidence file is intentionally left uncommitted.

## Rework 1 — Biome formatter fix

- Trigger: the primary independently re-ran the exact phase command (44 pass, 0 fail, exit 0) and then ran `bunx biome check apps/client/src/verdict/copy.ts apps/client/src/verdict/copy.test.ts`, which found exactly one formatter error at `apps/client/src/verdict/copy.ts:78`.
- Denied command: `bunx biome check apps/client/src/verdict/copy.ts apps/client/src/verdict/copy.test.ts` returned `Permission denied: shell` for this subagent during Phase 1 (see Commands table); the scoped `--write` variant was therefore not attempted. The primary's exact requested diff was applied by hand instead; no new command was denied during this rework.
- Exact edit applied at `apps/client/src/verdict/copy.ts:78` (formatting only; no behavior change):

```diff
-    title: flow === "spar" ? sparTitle(verdict, fight) : cupTitle(verdict, fight),
+    title:
+      flow === "spar" ? sparTitle(verdict, fight) : cupTitle(verdict, fight),
```

- Re-run result: `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/copy.test.ts apps/client/src/battleUI.test.ts` → exit 0; `44 pass`, `0 fail`, `63 expect() calls`, 2 files, 477 ms.
- Commit: `10e8ea30468b3aecf192b579f827f2c38dc2af1c` (short `10e8ea30`) — `style(verdict): format shared copy module`; 1 file changed, 2 insertions(+), 1 deletion(-). This is the new phase head; earlier commits remain `524fe371` and `aca92bfb`.
- Scope: only `apps/client/src/verdict/copy.ts` was changed by this rework; no other file, behavior, or Conductor state was touched. The evidence file remains untracked/uncommitted for the primary. The full gate was not re-run by this subagent.

## Primary verification

- Scope check: `git status --porcelain` showed only the untracked `verification/` directory; `git diff --name-only e4cfc671026d729ef5e819c41f39eb782eb15398..HEAD` listed exactly the two declared `Touches` (`apps/client/src/verdict/copy.ts`, `apps/client/src/verdict/copy.test.ts`). The range contains exactly three reported commits (`524fe371`, `aca92bfb`, `10e8ea30`) and no merge/user commits, so the squash guard passes.
- Sizes: `copy.ts` 3,366 B and `copy.test.ts` 7,524 B, both far below the 12 KB client cap.
- Exact phase command re-run: `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/copy.test.ts apps/client/src/battleUI.test.ts` → exit 0, `44 pass / 0 fail / 63 expect() calls` across 2 files.
- Lint: `bunx biome check apps/client/src/verdict/copy.ts apps/client/src/verdict/copy.test.ts` → exit 0, `Checked 2 files in 138ms. No fixes applied.` The earlier formatter error is resolved.
- Determinism: standalone `bun run gate:determinism` → exit 0; every archetype baby/juvenile/champion GLB regenerated byte-identically and all 5 prop digests matched.
- Full suite: `bun test --check --parallel --timeout 120000` → exit 0, `4556 pass / 1 skip / 0 fail`, `Ran 4557 tests across 444 files [200.67s]`. The first subagent-observed `stage.test.ts` timeout was transient on a loaded machine; the primary's retries were green.
- Full gate: `(bun run verify && bun run build)` → exit 0, with typecheck and Biome clean, determinism OK for all GLBs and 5 props, and the client Vite build emitting `dist/assets/index-DADRLmAJ.js 1,108.81 kB`, `index-D45x_3yC.css`, `lab-CKonYV42.js`, `lab-B2IkTbut.css`; only the pre-existing large-chunk advisory remains.
- Acceptance: FR-1, FR-2, FR-4, FR-5, AC-1 and NFR-2 are confirmed by the exact-string table and the pure, bounded module. No adapter was changed in this phase, as planned.

Conclusion: Phase 1 is verified and ready for acceptance and squash.
