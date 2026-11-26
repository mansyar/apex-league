# Phase R2 verification — Final review fix F2 (board-close test fidelity)

- **Track:** `20261127-hud-pointer-modal-input`
- **Phase:** R2 (`Review Fixes`) — F2, AC-4, NFR-3
- **Date:** 2026-11-27
- **Branch:** `fix/20261127-hud-pointer-modal-input`
- **Base:** `a5a53945077c7f5dc0fdcd7cee3c78fe1f859beb` (HEAD at phase start)
- **Head at verification:** `7aeb397b3dbb797e6480c8312fd4131d8d1d81fe`
- **Task commit:** `7aeb397b3dbb797e6480c8312fd4131d8d1d81fe` — `test(ui): mirror production board close in spar focus regression`
- **Result:** **verified** for F2, AC-4 and NFR-3 at the exact phase command: genuine red before correcting the close options, green after. This is a test-only fidelity correction; no production code changed. The full gate (`bun run verify && bun run build`) and terminal AC-7 proof remain primary-owned and are not claimed here. One ancillary scoped-Biome invocation was denied by permissions and is recorded under Blockers.

## F2 contract

- **Finding (Low, `review.md`):** the nested regression in `apps/client/src/ui/modal.test.ts` called `closeModal(boardRoot, { returnFocus: false })`, while production `apps/client/src/board/panel.ts::close()` calls `closeModal(root)` with default focus restoration. The test therefore never exercised the board opener focus attempt while spar isolates the HUD, and the evidence claim that its options matched production was inaccurate.
- **Required behavior:** with the board closed the way production closes it, `closeModal` attempts exactly one `focus()` on the board opener (the HUD chip). That chip is inert while spar isolates the HUD, so the attempt is modeled as a counter-backed no-op rather than a real focus change. Spar close must still focus the visible `.spar-button` and must never focus the hidden board Fight button.
- **Correction (test-only):** added a no-op `boardOpener.focus` that increments `isolatedBoardOpenerFocusCalls`; asserted that counter is `1` immediately after the board close; changed that close to `closeModal(of(boardRoot))`. The hidden Fight button counter assertion (`hiddenFocusCalls === 0`) and the final `sparButton.focused === true` assertion are unchanged. No production abstraction or global state was introduced.

## Commands

| Step | Command | Exit | Result |
| --- | --- | --- | --- |
| Red (fidelity assertion before option change) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` | 1 | `67 pass`, `1 fail`, `152 expect() calls`, `Ran 68 tests across 4 files. [584.00ms]`; `expect(received).toBe(expected)` — `Expected: 1`, `Received: 0` at `modal.test.ts:309` because `returnFocus: false` disabled the board opener focus attempt. |
| Green (default production options) | same exact command | 0 | `bun test v1.4.4 (38afee6c8) 4x PARALLEL`; `68 pass`, `0 fail`, `155 expect() calls`, `Ran 68 tests across 4 files. [524.00ms]`. |
| Scoped Biome (read-only) | `bunx biome check apps/client/src/ui/modal.test.ts` | — | Denied: `permission.rejected` / `Permission denied: shell`. Not retried or worked around; see Blockers. |
| Scope check | `git diff --name-status a5a53945077c7f5dc0fdcd7cee3c78fe1f859beb..HEAD` | 0 | Only `M apps/client/src/ui/modal.test.ts`. |
| Working tree | `git status --short` | 0 | Empty after the commit; the two verification files below are written afterwards and left uncommitted for the primary. |

## Red/green output

Red, with the new isolated-opener focus count assertion but before changing the close options:

```text
bun test v1.4.4 (38afee6c8) 4x PARALLEL

apps\client\src\ui\modal.test.ts:
304 |     })
305 |
306 |     // board/panel.ts closes the board modal; its Fight button stays
307 |     // connected but hidden, so spar close must not focus it.
308 |     closeModal(of(boardRoot), { returnFocus: false })
309 |     expect(isolatedBoardOpenerFocusCalls).toBe(1)
                                               ^
error: expect(received).toBe(expected)

Expected: 1
Received: 0

      at <anonymous> (D:\Projects\battle-pets\apps\client\src\ui\modal.test.ts:309:43)
(fail) openModal / closeModal > board-close then spar-close focuses the SPAR chip [1.64ms]

 67 pass
 1 fail
 152 expect() calls
Ran 68 tests across 4 files. [584.00ms]

Exit code: 1
```

Green, after changing only the close call to `closeModal(of(boardRoot))`:

```text
bun test v1.4.4 (38afee6c8) 4x PARALLEL

 68 pass
 0 fail
 155 expect() calls
Ran 68 tests across 4 files. [524.00ms]
```

The red run stopped inside the target test at the failed assertion, so its three later assertions were not counted; the green run executes all of them, which explains `152` → `155` expect() calls. All pre-existing modal/focus/panel/plates tests stayed green on both runs.

## Acceptance mapping

| Requirement | Evidence | Result |
| --- | --- | --- |
| F2 — nested regression must mirror production board close | Genuine red (`Received: 0` with `returnFocus: false`) then green (`isolatedBoardOpenerFocusCalls === 1`) after `closeModal(of(boardRoot))`; production `board/panel.ts` confirmed to call `closeModal(root)` with default restoration. | PASS — finding resolved at test level. |
| AC-4 — focus returns to SPAR on repeated / nested closes | The nested board-close → spar-close test keeps `hiddenFocusCalls === 0` and `sparButton.focused === true`; `spar/panel.test.ts` and the other three phase files are green. | PASS — focus handoff to the visible SPAR control is preserved through the production close sequence. |
| NFR-3 — visible focus, contained order, no exposed background controls | Diff review: one local counter and one no-op `focus()` override in the test harness only; no production listener, global state, isolation attribute or focus-order change. Full dialog/isolation proof remains in Phase 3 and R1 evidence. | PASS — no regression to keyboard/AT behavior; no new runtime work. |

## Scope, deviations, blockers and notes

- **Scope:** only `apps/client/src/ui/modal.test.ts` changed. No edits to `modal.ts`, `spar.ts`, CSS, artifacts, sim, state, save, balance, audio, voxel, dependencies, lockfiles, generated files, plan, metadata, review, roadmap, registry or any other Conductor state. Only the two verification files named in the brief were written under Conductor state.
- **Deviations:** none. The commit message is conventional and task-scoped. No full `bun run verify && bun run build` was run; the primary owns it.
- **Blockers:** `bunx biome check apps/client/src/ui/modal.test.ts` returned `permission.rejected` / `Permission denied: shell`. It was needed for scoped lint/format diagnostics on the touched test file; expected result is a clean `Checked 1 file ... No fixes applied.` (as in earlier phases). Not retried or worked around; the primary owns running scoped or full Biome diagnostics.
- **Notes:** the exact phase command is green. This is the final allowed review-fix round and is test-only: the production focus contract is intentionally untouched. Evidence files are intentionally uncommitted. Terminal AC-7 registry/metadata/review/PR proof remains primary-owned.

## Primary verification

- **Scope:** `git diff --name-only a5a53945077c7f5dc0fdcd7cee3c78fe1f859beb..HEAD` contains only `apps/client/src/ui/modal.test.ts`; the range contains the single reported task commit `7aeb397b`, with no merge or user commits. The only working-tree changes were this evidence file and the R2 pointer in `verification/integrated.md`.
- **Exact phase command:** primary re-ran `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` → `68 pass / 0 fail / 155 expect() calls`, exit 0.
- **Scoped Biome:** `bunx biome check apps/client/src/ui/modal.test.ts` → `Checked 1 file in 36ms. No fixes applied.`, exit 0. This resolves the subagent's permission-denied ancillary check.
- **Full gate:** primary re-ran `(bun run verify && bun run build)` in shell `sh_21a2546140013NzPFF85TyH6Z4` → `gate_exit=0`. Typechecks were clean in voxel 214, sim 253, server 185 and client 561 files; `4603 pass / 1 skip / 0 fail`, `676395 expect() calls`, `Ran 4604 tests across 446 files [140.74s]`; Biome checked 1062 files with no fixes; every archetype stage and all 5 prop digests regenerated byte-identically; Vite built `index-Cc3Jh0VM.js` at 1,110.57 kB in 669ms with only the pre-existing chunk advisory.
- **Diff validation:** `git diff --check` passed. The regression now uses the real default board-close options, asserts one inert-opener focus attempt, keeps the hidden Fight button unfocused, and still proves spar close focuses the visible SPAR chip.
- **Conclusion:** F2, AC-4 and NFR-3 are independently verified. No production code changed; R2 is ready for final delta review and acceptance bookkeeping.
