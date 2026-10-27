# Review — UI Cleanliness & Clarity Pass

- **Track:** `20261027-ui-cleanliness-clarity-pass` (refactor, high)
- **Branch:** `refactor/20261027-ui-cleanliness-clarity-pass`
- **Range:** `6ba33421..9a213c26` (code only, `-- . ':!conductor'`)
- **Date:** 2026-10-27
- **Verdict:** PASS (round 2 — F1 resolved, no findings remain)

## Summary

Large behavior-preserving refactor (+1816/−892 across 77 files, 5 phases)
meets the spec: one modal helper, token z-layers, consolidated kit, grouped
ranch HUD, flow/grid ranch layout, honest Board/Ghost/Cloud states, and a
voice-consistent copy pass. Gates are green and every FR/NFR/AC is covered
except FR-16/AC-13, partial via one Medium a11y gap: the trophy's
`aria-label` sits on a role-less `<span>`, so assistive tech ignores it.
The fix is mechanical (one attribute + one test assertion) and goes through
Phase R1 below. A second candidate (duplicate focus rule on `.board-fight`)
was refuted as pre-existing code outside the diff.

## Verification table

| Layer | Command | Result | Evidence |
|---|---|---|---|
| static | `bun run check` (4 workspaces) + `biome check` + `bun run build` | pass | `.conductor/review-verify.log` (review run): 449 client files clean, build exit 0 |
| unit | `bun test --timeout 120000` (via `bun run verify`) | pass | 3317 pass / 0 fail |
| determinism | voxel gate (via `bun run verify`) | pass | 12 species × 3 stages + 5 props byte-identical |
| visual | Playwright matrices per phase | pass | `verification/phase-{1..5}.md` + PNGs + JSON reports; 0 pageerrors |

Coverage gate: none configured. `review.issues.enabled: false` — no issues
created; debt recorded below.

## Requirements table

| ID | Status | Evidence |
|---|---|---|
| FR-1 | covered | `ui/modal.ts` + 8 tests; P1 Playwright open/close × 6 classes × 2 viewports |
| FR-2 | covered | `kit.css` `--z-*` tokens; grep shows token-only usage |
| FR-3 | covered | `kit-surface/kit-line` utilities; P2 before/after screenshot diff |
| FR-4 | covered | single 44px floor in `kit.css` responsive tiers |
| FR-5 | covered | generic `button:focus-visible` rule; new controls covered by construction |
| FR-6 | covered | `hidden`/`is-hidden` on board/cloud/ghost/modal paths; trophy inline is documented non-modal residual |
| FR-7 | covered | `hud/overflow.ts`; 393px overflow open/shut shots |
| FR-8 | covered | `plates-lineage.ts` summary/detail + keyboard + Escape |
| FR-9 | covered | `paintScoreBug` hierarchy; screenshots |
| FR-10 | covered | `ranch.css` grid/flow + `seatRanchFlow`; no hardcoded tops |
| FR-11 | covered | gift-chip inside More panel; P4 gift matrix |
| FR-12 | covered | `boardOfflineLine`/`ghostStaleLine` age sentences; P5 matrix shots |
| FR-13 | covered | preview kit from `readGhostContender` → display names; Fight parity check |
| FR-14 | covered | `cloudQueueLine` + `queue-depth.ts` + tests; offline-queue shots |
| FR-15 | covered | `ladderTeaser` template; copy tests |
| FR-16 | **partial (F1)** | form chip + blurb inline covered; trophy `aria-label` inert without role |
| NFR-1..6 | covered | no sim/save/voxel change; caps green; reduced-motion untouched; focus/return-focus tests; 393px + desktop shots; kit-only palette |
| AC-1..AC-12, AC-14 | covered | mapped to FR evidence above + green gates |
| AC-13 | **partial (F1)** | teaser template covered; trophy meaning only via F1 fix |

## Findings

### F1 — Medium — trophy accessible name never exposed

- **File:** `apps/client/src/hud/plates-score.ts:156-158` (element built `:47-53`)
- **What:** `trophy` is a plain `<span class="score-trophy">` (svg + `× N`
  text); P5 sets `trophy.setAttribute("aria-label", "Cup championships: N")`
  with no `role`, and assistive tech ignores `aria-label` on generic
  elements. The comment claims FR-16 coverage the code does not deliver.
- **Why it matters:** the one-line a11y enhancement is inert; a screen-reader
  user hears only "times N" with no context. Strict policy blocks on Medium.
- **Fix:** add `role="img"` to the trophy at build so the label is exposed;
  keep the visible text unchanged.
- **Requirement:** FR-16 / AC-13 (partial).
- **Test gap:** extend `hud/plates.test.ts` — trophy has `role="img"` and
  `aria-label` containing the count, at `cupsWon` 0 and 3.

No Critical, High, or Low findings. Candidate C2 (`.board-fight:focus-visible`
duplicating the kit rule) refuted: the rule is pre-existing, P5 did not touch
it, and removal would be an out-of-scope refactor.

## Plan compliance

| Phase | Result | Checkpoint | Evidence | Touches |
|---|---|---|---|---|
| P1 | verified | `14966520` | `verification/phase-1.md` | matches; no deviation |
| P2 | verified | `94cc830b` | `verification/phase-2.md` | matches; whole-rule non-consolidation recorded |
| P3 | verified | `eabfe5a6` | `verification/phase-3.md` | `hud/*` + `ranch.css`; score-bug extraction recorded |
| P4 | verified | `8965e7d3` | `verification/phase-4.md` + matrix | `ranch.css` + `hud/*`; measured-seat approach recorded |
| P5 | verified | `da696dd9` | `verification/phase-5.md` + 12-shot matrix | `board/*`, `cloud/*`, `hud/*`; queue-depth extraction + dock-aria fix recorded |

All 16 tasks marked `[x]` are implemented; no task dropped; final diff stays
within the union of `Touches` plus recorded deviations.

## Out of scope

- Day-one hint callout briefly overlapping the open More panel (one
  dismissible click; P3/P4 interplay) — noted in `phase-5.md`, revisit only
  with a callout-system rework.
- Snapshot "Nh ago / Nd ago" buckets unit-pinned, not screenshotted.
- `PushQueue.flush` drops failed payloads by design (pre-existing cloud-track
  behavior); the queue sentence reads inside the retry window only.

## Debt

None deferred — strict policy. The out-of-scope items above are discoveries,
not findings; `review.issues.enabled` is false so no issues are filed.

## History

- Round 1 (2026-10-27): BLOCK — 1 Medium (F1), 0 High/Critical, 0 Low.
  Independent reviewer (`conductor-reviewer` subagent) + primary diff pass
  agreed; C2 refuted.
- Round 2 (2026-10-27): PASS — F1 fixed (`role="img"` + 3 tests, full gate
  3320/0 green). No findings remain.

## Doc sync

`pending` at review time. Post-fix sync updates `metadata.json`
(`review_verdict`, round history) per the implement handoff.

## Phase R1: Review Fixes

- **Goal:** resolve F1 (trophy `role="img"` + test).
- **Depends on:** Phase 5
- **Covers:** F1
- **Touches:** `apps/client/src/hud/plates-score.ts`, `apps/client/src/hud/plates.test.ts`
- **Verification:** `bun run verify && bun run build` + focused `plates.test.ts`
- **Status:** pending

- [ ] **R1.T1: Resolve F1** — covers: F1
