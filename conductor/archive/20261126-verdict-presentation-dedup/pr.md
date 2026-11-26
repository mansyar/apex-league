## Summary

This refactor gives every sim-battle verdict surface one pure copy model and one
reusable stamp DOM view. Spar, cup battle, and cup results keep their existing
wording, classes, animation restart, and accessibility behavior; the live invite
surface remains separate because it speaks seat/protocol language rather than
`BattleResult`. No sim, save, voxel, CSS, audio, or dependency behavior changed.

## Track

- **ID:** `20261126-verdict-presentation-dedup`
- **Type:** `refactor`
- **Spec:** [`conductor/archive/20261126-verdict-presentation-dedup/spec.md`](conductor/archive/20261126-verdict-presentation-dedup/spec.md)
- **Plan:** [`conductor/archive/20261126-verdict-presentation-dedup/plan.md`](conductor/archive/20261126-verdict-presentation-dedup/plan.md)
- **Review:** [`conductor/archive/20261126-verdict-presentation-dedup/review.md`](conductor/archive/20261126-verdict-presentation-dedup/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Shared verdict copy model | Single pure module for spar/cup/HUD title and sub copy | verified | `d285abbd` | TDD red then green; one formatter rework; transient voxel timeout retried green. |
| 2: Shared stamp view and adapter rewiring | One four-div stamp DOM builder for HUD and cup | verified | `4908fb3a` | Preserved flat cup siblings via `parentChildren: false`; two reworks restored DOM parity and fixed an import path. |
| 3: Visual evidence and integrated gate | Prove all three surfaces at desktop and phone | verified | `30e4dde2` | Six PNGs, clean console, full gate green; no code changed in this phase. |

## Requirements

- [x] `FR-1` ΓÇö one pure module owns spar/cup/battle title and sub copy (`apps/client/src/verdict/copy.ts`)
- [x] `FR-2` ΓÇö no duplicate verdict literals in adapters; `reasonLine` and `resultsView` remain their owners
- [x] `FR-3` ΓÇö one stamp DOM view with configurable classes, rule element, ARIA option and animation restart (`apps/client/src/verdict/stamp.ts`)
- [x] `FR-4` ΓÇö all current spar/cup/HUD strings byte-for-byte unchanged; live copy untouched
- [x] `FR-5` ΓÇö table tests pin every known outcome and mirror qualification
- [x] `FR-6` ΓÇö six captures cover spar, cup battle HUD and cup results at desktop and phone
- [x] `NFR-1` ΓÇö no sim/cup-result, save, voxel, dependency, lockfile, generated, audio or CSS change
- [x] `NFR-2` ΓÇö client module-size caps green
- [x] `NFR-3` ΓÇö accessibility semantics unchanged; one polite status and single cup announcement
- [x] `NFR-4` ΓÇö full configured stack green
- [x] `NFR-5` ΓÇö replay/hide and reduced-motion finish paths retain current lifecycle
- [x] `AC-1` ΓÇö copy table red before the module, green after
- [x] `AC-2` ΓÇö no duplicate literals remain in spar/cup/HUD adapters
- [x] `AC-3` ΓÇö DOM tests pin classes, rule element, animation restart, ARIA and single announcement
- [x] `AC-4` ΓÇö `live/state.ts`, CSS and audio absent from final diff
- [x] `AC-5` ΓÇö six captures exist; console clean in both sessions
- [x] `AC-6` ΓÇö full gate exits 0, module-size green, no banned file class
- [x] `AC-7` ΓÇö five edge cases pinned with no leak, stale text or duplicate announcement

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit (copy) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/copy.test.ts apps/client/src/battleUI.test.ts` | pass | 44 pass / 0 fail, 63 expect() calls |
| unit (adapters) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/stamp.test.ts apps/client/src/battle-session.test.ts apps/client/src/battleHud.test.ts apps/client/src/cup/view-models.test.ts apps/client/src/battleUI.test.ts` | pass | 106 pass / 0 fail, 220 expect() calls |
| unit (full) | `bun test --check --parallel --timeout 120000` | pass | 4581 pass / 1 skip / 0 fail across 445 files |
| lint / typecheck | `bun run check`, `bunx biome check` | pass | clean across all workspaces and touched files |
| determinism | `bun run gate:determinism` | pass | all GLBs and 5 prop digests byte-identical |
| build | `bun run verify && bun run build` | pass | 443 modules, only the pre-existing chunk advisory |
| visual | `playwright-cli` at 1440x900 and forced 393x852 | pass | 6 PNGs, 0 errors / 0 warnings in both sessions |

Full evidence: `conductor/archive/20261126-verdict-presentation-dedup/verification/integrated.md`.

## Media

Spar stamp at desktop size (captured at checkpoint `30e4dde2`):

![Spar verdict stamp](https://github.com/user-attachments/assets/62987aa2-8230-4f02-912d-17b6d63632cc)

Cup battle HUD stamp at desktop size (captured at checkpoint `30e4dde2`):

![Cup battle verdict stamp](https://github.com/user-attachments/assets/76ccf89a-a962-4cdb-b13b-3547903c7e2f)

Cup results stamp at desktop size (captured at checkpoint `30e4dde2`):

![Cup results verdict stamp](https://github.com/user-attachments/assets/3fbb7aa6-ecf1-4d38-974c-6f92120c119e)

## Review

- **Verdict:** `PASS`
- **Rounds:** 1
- **Fixed:** 0 findings
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- `verdict/stamp.ts` gained `parentChildren?: boolean` so cup results keep the original flat siblings under `.cup-result-card`; without it the card's `gap: 1cqw` would have been lost. Verified by DOM tests and captures.
- `cup/results.ts` was intentionally left unchanged; it required no type import, so announcement, `.lost` toggle and animation restart remain byte-identical.
- `stamp.test.ts` and `battleHud.test.ts` each use a local `FakeElement` harness; no shared test helper was introduced.
- Phase 2 needed two reworks (DOM parity, import path) and Phase 1 one formatter rework; all were resolved and verified before acceptance.

## Follow-ups

- none

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commits (newest first)
git revert --no-edit 30e4dde2
git revert --no-edit 4908fb3a
git revert --no-edit d285abbd
```

No migration, save-version, feature-flag or data rollback is needed: this is a presentation-only client refactor.

