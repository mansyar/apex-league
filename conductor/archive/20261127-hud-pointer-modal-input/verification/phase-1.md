# Phase 1 Verification — Shared modal background isolation

- **Track:** 20261127-hud-pointer-modal-input
- **Phase:** 1 — Shared modal background isolation
- **Date:** 2026-11-27
- **Branch:** `fix/20261127-hud-pointer-modal-input`
- **Phase base:** `a16150ab23f9a18a00527eefccbd9dc76a119c5b`
- **Head:** `5269f7cb3615f97c97655b800bfa7c076b12c5f8`
- **Result:** Passed — TDD red then green; both task commits made.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Unit tests (TDD red, before implementation) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts` | 1 | `Found 10 errors in 1 file, checked 4 files [148.54ms]`; every error `TS2353: Object literal may only specify known properties, and 'background' does not exist in type 'OpenModalOptions'` at `modal.test.ts` lines 267, 280, 294, 311, 327, 336, 360, 366, 394, 408. |
| Unit tests (verification, exact brief command) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts` | 0 | `bun test v1.4.4 (38afee6c8) 4x PARALLEL` — `23 pass`, `0 fail`, `64 expect() calls`, `Ran 23 tests across 2 files. [339.00ms]`. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-3 / AC-3 | Dialog surface can hide the background from assistive tech: chosen targets become `inert` and `aria-hidden="true"` for the overlay lifetime. | `modal.test.ts`: "isolates one background target while the modal is open", "isolates several background targets while the modal is open". `modal.ts` `isolateBackground()` sets `target.inert = true` and `aria-hidden="true"`. | Pass (helper contract; spar UI proof belongs to Phases 2–3). |
| FR-4 / AC-4 | Focus/trap/Escape/scrim/return-focus behavior is preserved and focus returns to an opener in the restored background. | Green run: all 9 pre-existing tests plus "restores background before handing focus to an opener inside it", "restores background even when onClose cleanup throws". `restoreBackground()` runs before `returnFocusTo()` and inside `try/finally`. | Pass (helper contract; spar UI proof belongs to Phases 2–3). |
| NFR-3 | No background controls exposed while the overlay is open. | Isolation tests assert `inert === true` and `getAttribute("aria-hidden") === "true"` on every target; default-path test confirms untouched elements stay untouched. | Pass. |
| NFR-5 | No retained global modal state or leaks after repeated open/close cycles; nested opens share targets safely. | "closing the inner modal keeps the outer modal's isolation", "repeated open/close cycles do not retain stale isolation", "close removes isolation attributes that were absent before", "close restores pre-existing inert and aria-hidden values exactly". Bookkeeping uses a `WeakMap` keyed by target with a per-target reference count, deleted when the count reaches zero. | Pass. |
| AC-6 | New regression tests fail against base and pass after the fix, with exact commands recorded. | Red command/exit 1/10 errors above; green command/exit 0/23 pass above. Commits `07ce58e7` (tests only) and `5269f7cb` (implementation) are separate. | Pass. |

## Evidence paths

- `apps/client/src/ui/modal.test.ts` — FakeElement harness extended with `inert`/`removeAttribute`; 11 new tests added; 9 existing tests preserved.
- `apps/client/src/ui/modal.ts` — `OpenModalOptions.background?: HTMLElement | readonly HTMLElement[]`, exact-prior-state capture, nested-safe reference counting, restoration before cleanup/focus.
- `apps/client/src/ui/focus.test.ts` — unchanged; included in the verification command and passing.
- Commits: `07ce58e7` (`test(ui): pin opt-in modal background isolation contract`), `5269f7cb` (`feat(ui): add opt-in background isolation to openModal`).

## Deviations

None. `focus.ts` needed no change, as expected. `focus.test.ts` is listed in Touches but required no edits; it remains covered by the verification command.

## Notes

- The opt-in option is omitted by every existing caller, so default modal behavior is byte-for-byte unchanged on the tested paths.
- Duplicate targets inside one call are de-duplicated so a single close cannot leave a stale reference count.
- This evidence file is intentionally left uncommitted for the primary's state commit.

## Primary verification

- Scope check: `git diff --name-only a16150ab23f9a18a00527eefccbd9dc76a119c5b..HEAD` contains only `apps/client/src/ui/modal.ts` and `apps/client/src/ui/modal.test.ts`; `git log --oneline` in that range contains exactly the two reported task commits (`07ce58e7`, `5269f7cb`) and no merge/user commits. The only working-tree change is this untracked evidence directory.
- Exact phase command re-run: `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts` → **23 pass / 0 fail / 64 expect() calls**, exit 0.
- Scoped Biome: `bunx biome check apps/client/src/ui/modal.ts apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts` → **Checked 3 files. No fixes applied.**, exit 0.
- Typecheck: `bun run check` → no type errors in voxel (214), sim (253), client (560), or server (185) files, exit 0.
- Mandatory phase gate: `(bun run verify && bun run build)` → **exit 0**. Typecheck, full unit suite, Biome, and determinism passed; every archetype stage regenerated byte-identical and all 5 prop digests matched. Vite built `dist/assets/index-CTZ_4zXd.js` (1,110.50 kB) with only the pre-existing chunk-size advisory.
- Conclusion: Phase 1 is independently verified. The opt-in isolation contract, exact restoration, nested reference counting, focus ordering, and default-path compatibility are evidenced; ready for squash and acceptance.
