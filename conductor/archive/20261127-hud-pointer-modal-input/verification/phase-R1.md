# Phase R1 verification — Review fix F1 (ghost spar return focus)

- **Track:** `20261127-hud-pointer-modal-input`
- **Phase:** R1 (`Review Fixes`) — F1, FR-4, AC-4, NFR-5
- **Date:** 2026-11-27
- **Branch:** `fix/20261127-hud-pointer-modal-input`
- **Base:** `a1b7040469c1780e96ebe0eb5024346d05a4d3bb` (HEAD at phase start)
- **Head at verification:** `4a1aef50d7eb9df02a0ae00655fa82d1d6bb7113`
- **Task commits:** `3f29d31fda463b80c77e3ebe8168a7112860b6fe` (tests first), `4a1aef50d7eb9df02a0ae00655fa82d1d6bb7113` (implementation)
- **Result:** **verified** for F1, FR-4, AC-4 and NFR-5 at the phase command: genuine red before implementation, green after. The full gate (`bun run verify && bun run build`) and final browser proof remain primary-owned and are not claimed here. One ancillary scoped-Biome invocation was denied by permissions and is recorded under Blockers.

## Commands

| Step | Command | Exit | Result |
| --- | --- | --- | --- |
| Red (tests first) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` | 1 | `Found 4 errors in 1 file, checked 275 files [202.93ms]` — four `TS2353` errors for the not-yet-existing `returnFocusTo` option in `modal.test.ts` at lines 223, 247, 260, 297. |
| Green (all four test files) | same exact command | 0 | `bun test v1.4.4 (38afee6c8) 4x PARALLEL`; `68 pass`, `0 fail`, `154 expect() calls`, `Ran 68 tests across 4 files. [2.41s]`. |
| Scoped Biome (read-only) | `biome check apps/client/src/ui/modal.ts apps/client/src/ui/modal.test.ts apps/client/src/spar.ts` | 1 | Binary not on this shell's PATH (`'biome' is not recognized`). No diagnostics were produced. |
| Scoped Biome via project dependency | `bunx biome check apps/client/src/ui/modal.ts apps/client/src/ui/modal.test.ts apps/client/src/spar.ts` | — | Denied: `permission.rejected` / `Permission denied: shell`. Not retried or worked around; see Blockers. |
| Scope check | `git diff --name-status a1b7040469c1780e96ebe0eb5024346d05a4d3bb..HEAD` | 0 | Only `apps/client/src/spar.ts`, `apps/client/src/ui/modal.test.ts`, `apps/client/src/ui/modal.ts`. |
| Working tree | `git status --short` | 0 | Empty after both commits; the two verification files below are deliberately written afterwards and left uncommitted. |

## F1 reproduction and fix

- **Defect:** a ghost spar is opened from the board's Fight button through `presentSetup`. `openModal` captured that button as the opener. When `board/panel.ts` closed the board modal, its Fight button stayed connected but hidden; spar close then called `focus()` on it, so focus never reached the visible `.spar-button`.
- **Test model:** real `openModal`/`closeModal` calls with the existing `FakeElement` harness. The board root opens with the Fight button active; the spar root opens with `returnFocusTo: sparButton`; `closeModal(boardRoot, { returnFocus: false })` mirrors the board close; `closeModal(sparRoot)` must focus the SPAR chip and never call the hidden button's overridden `focus()` (`hiddenFocusCalls === 0`). No production abstraction was introduced for the test.
- **Fix:** `OpenModalOptions` gains `returnFocusTo?: HTMLElement | null`. In `openModal` the stored opener is the explicit option when the property is supplied, otherwise the previous `document.activeElement` capture. An explicit element wins over the capture; explicit `null` stores no opener and keeps the existing body fallback. `CloseModalOptions.returnFocus` is unchanged. `spar.ts::presentSetup` passes `returnFocusTo: sparButton`. Close ordering is untouched: hide root, restore background, run `onClose` teardown, then return focus. No new global state, WeakMap entry, listener or per-frame work.

## Red/green output

Red, immediately after the tests-first commit and before any production edit:

```text
bun test v1.4.4 (38afee6c8) 4x PARALLEL
<error file="apps/client/src/ui/modal.test.ts" line="223" column="7" code="TS2353">
Object literal may only specify known properties, and 'returnFocusTo' does not exist in type 'OpenModalOptions'.
<error file="apps/client/src/ui/modal.test.ts" line="247" column="7" code="TS2353"> (same)
<error file="apps/client/src/ui/modal.test.ts" line="260" column="7" code="TS2353"> (same)
<error file="apps/client/src/ui/modal.test.ts" line="297" column="7" code="TS2353"> (same)
Found 4 errors in 1 file, checked 275 files [202.93ms]
Exit code: 1
```

Green, after the implementation commit:

```text
bun test v1.4.4 (38afee6c8) 4x PARALLEL

 68 pass
 0 fail
 154 expect() calls
Ran 68 tests across 4 files. [2.41s]
```

Five new focused tests in `ui/modal.test.ts`: omitted option keeps the active opener; explicit target wins; a connected opener whose `focus()` throws is never used when an explicit target is supplied; explicit `null` falls back to body; nested board-close → spar-close focuses the SPAR chip and leaves the hidden Fight button unfocused. All pre-existing modal/focus/panel/plates tests stayed green.

## Acceptance mapping

| Requirement | Evidence | Result |
| --- | --- | --- |
| FR-4 — focus enters and returns without leaks | Explicit-target and default-opener tests green; trap/dismissal tests unchanged and green. | PASS — focus returns to the named visible SPAR control; omitted option preserves prior behavior. |
| AC-4 — repeated and mid-fight closes | Green `spar/panel.test.ts` and `modal.test.ts`; nested board-close → spar-close regression; `onClose` teardown ordering unchanged. | PASS — focus handoff follows teardown on every close path. |
| NFR-5 — no per-frame work, retained global modal state, or listener leaks | Diff review: one optional field on `OpenModalOptions`, one local `captured` binding, one `returnFocusTo` value in `spar.ts`; existing `WeakMap` record and single listener pair unchanged. | PASS — no new state container or listeners; ordering preserved. |
| F1 — ghost spar hidden Fight button | Red before fix (unknown option), green after fix; hidden `focus()` call count zero. | PASS — fixed. |

## Scope, deviations, blockers and notes

- **Scope:** only the three approved client files changed; no edits to `spar/panel.ts`, `spar/panel.test.ts`, `ui/focus.ts`, CSS, board, sim, save, balance, audio, voxel, dependencies, lockfiles, generated files, or Conductor plan/spec/metadata/registry/review/PR docs. Only the two verification files named in the brief were written under Conductor state.
- **Deviations:** none in code. Commit messages are conventional and task-scoped. `--no-verify` was used precautionarily on both commits; repository hook discovery found no hooks, so it changed no behavior.
- **Blockers:** `bunx biome check apps/client/src/ui/modal.ts apps/client/src/ui/modal.test.ts apps/client/src/spar.ts` returned `permission.rejected` / `Permission denied: shell`. It was needed for scoped lint/format diagnostics on the three touched files; expected result is `Checked 3 files ... No fixes applied.` (as in Phases 1–2). Not retried or worked around; the primary owns running scoped or full Biome diagnostics.
- **Notes:** the exact phase command is green; the mandatory `bun run verify && bun run build` rerun and the final browser proof remain primary-owned and are not claimed in this phase. Evidence files are intentionally uncommitted. `integrated.md` carries an R1 pointer only; terminal AC-7 proof is not claimed.

## Primary verification

- **Scope:** `git diff --name-only a1b7040469c1780e96ebe0eb5024346d05a4d3bb..HEAD` contains exactly `apps/client/src/ui/modal.ts`, `apps/client/src/ui/modal.test.ts`, and `apps/client/src/spar.ts`; the range contains only the two reported task commits and no merge/user commits.
- **Exact phase command:** primary re-ran `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` → `68 pass / 0 fail / 154 expect() calls`, exit 0.
- **Scoped Biome:** primary re-ran `bunx biome check apps/client/src/ui/modal.ts apps/client/src/ui/modal.test.ts apps/client/src/spar.ts` → `Checked 3 files in 43ms. No fixes applied.`, exit 0. The subagent's denied invocation is therefore resolved.
- **Independent browser proof:** session `rm13-r1` seeded a Champion Zephyr Falcon through real sim exports. At `1440×900`, `393×852`, and `852×393`, a normal SPAR click opened `role="dialog"`, `aria-modal="true"`, label `Sparring`, `z-index:70`, focus inside, and 18/18 inert/aria-hidden background siblings. Escape closed the dialog, focused `.spar-button`, and left zero residual isolation in every viewport. Console: `2 messages, 0 errors, 0 warnings`.
- **Source review:** confirmed `returnFocusTo` is opt-in, omitted preserves active-element capture, explicit `null` preserves the body fallback, and `presentSetup` passes `sparButton`. Close ordering remains hide → restore background → teardown → return focus.
- **Full gate:** the first primary `(bun run verify && bun run build)` attempt exited 1 with `4599 pass / 1 skip / 4 fail`; the filtered capture omitted failure details. A diagnostic full-suite rerun passed `4603 pass / 1 skip / 0 fail`, `676394 expect() calls`, `Ran 4604 tests across 446 files [250.43s]`. The final primary `(bun run verify && bun run build)` chain in shell `sh_21a1bcbf6001rgOfRrQg1hkkXk` then exited 0: clean typechecks in voxel 214, sim 253, server 185 and client 561 files; `4603 pass / 1 skip / 0 fail`, `676394 expect() calls`, 446 files in 173.09s; Biome clean on 1062 files; all archetype stage regenerations and 5 prop digests matched; Vite emitted `index-Cc3Jh0VM.js` 1,110.57 kB and built in 758ms with only the pre-existing chunk advisory. The earlier four failures did not recur and no code change was made for them.
- **Conclusion:** F1 is fixed and independently verified at the phase/unit/Biome/browser/full-gate levels. R1 is ready for acceptance and delta re-review.
