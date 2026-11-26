## Summary

Fix the reproduced Rename and mobile SPAR pointer interception defects and route spar through the shared modal lifecycle. Spar now isolates the background HUD from pointer and assistive-technology input, traps focus, supports Escape/scrim dismissal, and reliably returns focus to the visible SPAR control across desktop and both phone orientations.

## Track

- **ID:** `20261127-hud-pointer-modal-input`
- **Type:** `bug`
- **Spec:** [`conductor/archive/20261127-hud-pointer-modal-input/spec.md`](conductor/archive/20261127-hud-pointer-modal-input/spec.md)
- **Plan:** [`conductor/archive/20261127-hud-pointer-modal-input/plan.md`](conductor/archive/20261127-hud-pointer-modal-input/plan.md)
- **Review:** [`conductor/archive/20261127-hud-pointer-modal-input/review.md`](conductor/archive/20261127-hud-pointer-modal-input/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Shared modal background isolation | Add opt-in inert/aria-hidden background isolation with exact restoration | verified | `a878a967` | Existing modal callers keep their default behavior. |
| 2: HUD pointer ownership and spar modal adapter | Repair Rename/SPAR hit ownership and adopt the shared modal lifecycle | verified | `540d26b8` | Minimal CSS/DOM changes only; no copy or layout redesign. |
| 3: Visual evidence and integrated gate | Prove normal input, focus, isolation, dismissal and clean consoles at three viewports | verified | `9775267f` | Desktop 1440├ù900, portrait 393├ù852, landscape 852├ù393. |
| R1: Board ghost-spar focus return | Add an explicit visible return-focus target for every spar entry path | verified | `59551de5` | Resolves High F1 from board ΓåÆ ghost spar ΓåÆ close. |
| R2: Production-faithful nested regression | Mirror the real board-close options and inert opener focus attempt | verified | `5484e811` | Test-only resolution of Low F2. |

## Requirements

- [x] `FR-1` ΓÇö Rename and SPAR receive normal pointer events at all supported viewports.
- [x] `FR-2` ΓÇö Rename opens, focuses/selects the input, and preserves Save/Cancel/Escape behavior.
- [x] `FR-3` ΓÇö Spar is a labelled `aria-modal` dialog with inert/aria-hidden background for its full lifetime.
- [x] `FR-4` ΓÇö Focus enters and stays trapped; Escape/scrim close; focus returns to visible SPAR without leaks.
- [x] `FR-5` ΓÇö Minimal layout changes preserve visible/tappable controls with no horizontal page overflow.
- [x] `FR-6` ΓÇö Unit regressions and real Playwright CLI evidence cover desktop, portrait and landscape.
- [x] `NFR-1` ΓÇö Presentation-only diff; no sim/state/save/balance/audio/voxel/dependency/generated-file or copy changes.
- [x] `NFR-2` ΓÇö Existing styling, spacing and animation preserved except minimal structural hit-target changes.
- [x] `NFR-3` ΓÇö Keyboard/AT focus is visible and contained; background controls are not exposed.
- [x] `NFR-4` ΓÇö Client module caps and the full configured verification stack remain green.
- [x] `NFR-5` ΓÇö No per-frame work, retained global modal state, or listener leaks after repeated cycles.
- [x] `AC-1` ΓÇö Desktop normal-click Rename proof passes.
- [x] `AC-2` ΓÇö Portrait and landscape normal-click SPAR proof passes.
- [x] `AC-3` ΓÇö Dialog semantics and 18/18 background isolation verified.
- [x] `AC-4` ΓÇö Focus trap, dismissal, repeated/mid-fight close, ghost-spar return and nested regression pass.
- [x] `AC-5` ΓÇö Three-viewport captures show no page overflow/control occlusion; consoles are clean.
- [x] `AC-6` ΓÇö Genuine base-red/fixed-green regression commands are recorded.
- [x] `AC-7` ΓÇö Full gates, module caps and approved diff scope pass; terminal archive/review/PR proof is recorded by the completion commit.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` | pass | 68 pass / 0 fail / 155 expect(), exit 0 |
| unit | `bun test --check --parallel --timeout 120000` | pass | 4603 pass / 1 skip / 0 fail; 676395 expect(); 446 files |
| typecheck | `bun run check` | pass | voxel 214, sim 253, server 185, client 561 files clean |
| lint | `biome check` | pass | Checked 1062 files; no fixes |
| determinism | `bun run gate:determinism` | pass | Every archetype stage byte-identical; 5 prop digests match |
| module size | `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts` | pass | 5 pass / 0 fail / 15 expect() |
| build | `bun run build` | pass | Vite build exit 0; only pre-existing chunk advisory |
| visual | `playwright-cli` at 1440├ù900, 393├ù852, 852├ù393 | pass | Normal pointer/keyboard proof; 2 messages, 0 errors, 0 warnings per session |

Full evidence: `conductor/archive/20261127-hud-pointer-modal-input/verification/integrated.md`.

## Media

Captured at Phase 3 checkpoint `9775267f`; later review fixes changed no production visuals.

![Ranch HUD with reliable pointer ownership](https://github.com/user-attachments/assets/f814e880-770c-44b7-8d68-f6d1ad5751e6)

![Rename opens through a normal pointer click](https://github.com/user-attachments/assets/f4c1bb71-140e-480b-953d-7574ba6e629f)

![Spar opens as an isolated modal dialog](https://github.com/user-attachments/assets/cdc41096-f3f2-4fb8-b30b-ee52c343b61c)

## Review

- **Verdict:** `PASS`
- **Rounds:** 3
- **Fixed:** 2 findings (High F1, Low F2)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- No requirement was withdrawn and no override was used.
- Existing portrait/landscape spar-panel internal scrolling and narrow inline Rename input text scrolling remain unchanged; they are documented in review and are not page-overflow or pointer-ownership regressions from this diff.
- One transient full-suite run reported four failures under parallel load; an unfiltered diagnostic rerun passed 4603/1/0, and the final required verify/build chain passed. No code change was made for that transient.

## Follow-ups

- none

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Phase checkpoints, if individual rollback is preferred
git revert --no-edit 9775267f
git revert --no-edit 540d26b8
git revert --no-edit a878a967
```

No save migration, feature flag, dependency, generated artifact or persisted-state rollback is required.
