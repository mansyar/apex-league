# Phase 1 evidence — Ratify stable and ranch decisions

- **Track:** `20261126-stable-capacity-ranch-release`
- **Phase:** 1
- **Date:** 2026-11-26
- **Branch:** `chore/20261126-stable-capacity-ranch-release`
- **Phase base:** `42c9b0975f9ee3745aa3a1c03dbb116ebbd977b7`
- **Head at verification:** `42c9b0975f9ee3745aa3a1c03dbb116ebbd977b7` (clean tree; head == phase base)
- **Result:** `verified` for the assigned phase scope (baseline pinned, ratification edits drafted, both configured gates green). The product/save-schema doc edits are **not applied by this agent** — they are drafted below and owned by the primary per agent policy. The primary re-runs the full chained gate `bun run verify && bun run build` after applying them.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Static + unit + lint + determinism | `bun run verify` | 0 | `4531 pass / 1 skip / 0 fail` (4532 tests across 443 files, ~110–136 s); Biome "Checked 1054 files … No fixes applied"; voxel determinism gate OK for all 18 creature GLBs and the 5 prop digests. Explicit `VERIFY_EXIT=0`. |
| Static (production build) | `bun run build` | 0 | `@apex/client build` — 441 modules transformed, `dist/index.html` + CSS/JS emitted, `✓ built in 1.33s`, "Exited with code 0". Only the standard Vite >500 kB chunk advisory (non-fatal). Explicit `EXITCODE=0`. |

Note: per the phase brief, the two commands were run separately here. The primary runs the chained form `bun run verify && bun run build` after applying the doc edits; this evidence does not substitute for that re-run.

## P1.T1 — Doc truth baseline (exact current statements)

### `conductor/product.md`

- **Core Loop item 4 — lifecycle (lines 28–32):**
  > 4. **Legacy phase**: creatures retire at ~60-90 in-game days. Retirement passes stat inheritance, inheritable traits (with mutation), and family prestige (account-wide perks) into the next egg via breeding; type affinity drift landed 2026-10-21 — a bred egg can carry the other parent's element as a secondary affinity that defends via the cancel-to-neutral rule.
- **Core Loop item 5 — active partner / stable (lines 33–36):**
  > 5. **The ranch and the stable**: the player owns several pets, but only one partner lives in the ranch at a time; every other pet waits in the stable, frozen until it is brought forward. A tournament reward now joins that collection instead of replacing the partner already in the ranch.
- **Key Systems → Acquisition (lines 45–48):**
  > - **Acquisition**: Fire/Water/Plant starter choice; new creatures via breeding retired pairs and tournament reward eggs. The ranch holds one partner at a time; every other pet the player owns waits in the stable, frozen, and any of them can be brought forward when the player wants it.

**Baseline finding:** the one-active-partner rule and frozen stable are stated, and retirement/breeding are the lifecycle path. There is **no explicit statement that the stable is unlimited** and **no explicit statement that no permanent release seam exists** — the doc implies both but does not ratify them (the drift risk this track closes). No capacity counter, cap, or delete/release command is described anywhere in the doc.

### `docs/save-schema.md`

- **Save payload version comment (line 11) — stale:**
  ```ts
  version: number // current: 25 (SAVE_VERSION)
  ```
- **Section header (line 18) — stale:**
  ```
  ## GameState at v25
  ```
- **`stable` field row (line 36) — already states the low-risk options, but no explicit "no release path":**
  > | `stable` | `Creature[]` | The stable (v24+): every pet the player owns that is not in the ranch. There is no capacity limit, and exactly one pet is active (`creature`); a swap between the ranch and the stable is free, instant and lossless - every field of a pet travels with it. A stashed pet is frozen: the night settlement touches neither its conditions nor its age, and it cannot train, evolve, graduate or compete until it returns. Migrated saves stamp `[]`: a pre-v24 save owns one pet, and it is the ranch pet. |

**Baseline finding:** the save-schema doc already carries "no capacity limit", "exactly one pet is active (`creature`)", and the frozen-stable rule, but (a) its current-version statements say `25`, and (b) it never states that there is no permanent delete/release path or that stabled pets may only be brought forward.

### `SAVE_VERSION` in sim source (code truth)

- `packages/sim/src/save/schema.ts` line 5:
  ```ts
  /** Current save schema version. Bump and add a migration on every change. */
  export const SAVE_VERSION = 26
  ```
- Corroborated by many sim tests asserting `expect(SAVE_VERSION).toBe(26)` (e.g. `save.test.ts`, `cupSave.test.ts`, `branchesSave.test.ts`, `legacySave.test.ts`). The doc's `25` is stale; **code is not to be bumped**.

**Important for the applying agent:** only the two *current-version* statements (line 11 comment, line 18 header) are stale. The many other `v25` mentions in `docs/save-schema.md` are correct historical references (`claimedTiers`/`pendingRewards` v25+ at lines 34–35, `giftEgg` "since v25" at lines 50 and 122, the `v24 → v25` migration at line 156, and the "At v25" validation paragraph at line 249). Do **not** blanket-replace `25` → `26`.

## P1.T2 — Ready-to-apply ratification edits (drafted, NOT applied by this agent)

### Edit A — `conductor/product.md`

Insert the following new subsection immediately after the Core Loop numbered list (after item 5, before `## Key Systems`). It ratifies the three RM-7 policies without adding new vision, balance, or progression rules (NFR-3) and preserves the existing one-partner statements at Core Loop 5 and Key Systems → Acquisition.

```md
### Ratified stable & ranch policy (2026-11-26)

The three open RM-7 policy questions are ratified here to match the shipped save
contract (`docs/save-schema.md`, save v26):

- **The stable is unlimited.** There is no cap on how many pets the stable holds;
  no over-cap save exists and no capacity counter is planned.
- **Exactly one active ranch partner.** Only one `creature` is active in the
  ranch at a time; every other owned pet waits frozen in `stable` and may be
  brought forward, never active alongside the partner.
- **No release seam.** There is no path that permanently deletes a pet. A stabled
  pet may only be brought forward; retirement and breeding remain the lifecycle
  path.
```

### Edit B — `docs/save-schema.md`

**B1** — line 11 (current-version comment only):

```diff
-  version: number // current: 25 (SAVE_VERSION)
+  version: number // current: 26 (SAVE_VERSION)
```

**B2** — line 18 (section header only):

```diff
-## GameState at v25
+## GameState at v26
```

**B3** — line 36 (the `stable` row): replace the whole row with the following, which keeps "no capacity limit", "exactly one active `creature`", and the frozen-stable rule while adding the explicit no-release-path clause:

```md
| `stable` | `Creature[]` | The stable (v24+): every pet the player owns that is not in the ranch. **There is no capacity limit** — the stable is unlimited, so no over-cap save exists and no capacity counter is planned. **Exactly one pet is active** (`creature`, the ranch partner); every other owned pet waits in `stable`, and a swap between the ranch and the stable is free, instant and lossless — every field of a pet travels with it. A stashed pet is **frozen**: the night settlement touches neither its conditions nor its age, and it cannot train, evolve, graduate or compete until it returns. **There is no release path**: a stabled pet may only be brought forward, never permanently deleted; retirement and breeding remain the lifecycle path. Migrated saves stamp `[]`: a pre-v24 save owns one pet, and it is the ranch pet. |
```

No code, save field, migration, or `SAVE_VERSION` change is proposed. The revisit trigger and roadmap-only follow-up handling (FR-5 / AC-3) belong to Phase 2 and are intentionally not part of these doc edits.

## Acceptance-criteria mapping (phase scope)

| ID | Criterion | Evidence in this phase | Status |
| --- | --- | --- | --- |
| FR-1 | Unlimited stable explicitly stated in product + save-schema docs | Baseline: implied, not explicit (product.md Core Loop 5 / Acquisition; save-schema line 36 has "no capacity limit"). Edit A and Edit B3 add the explicit ratification. | `prepared` — primary applies edits; re-check doc truth after |
| FR-2 | Exactly one `creature` active, others frozen in `stable` | Baseline already states this in both docs (product.md line 34 / 47; save-schema line 36). Edits A and B3 restate/ratify it; no change to shipped behavior. | `prepared` — primary applies edits; re-check after |
| FR-3 | No permanent release seam; retirement/breeding remain the lifecycle path | Baseline: lifecycle path present (product.md line 28–32), no release seam unstated. Edits A and B3 add "no release path / only brought forward". | `prepared` — primary applies edits; re-check after |
| FR-4 | Save-schema doc reports `SAVE_VERSION` as `26` | Code confirmed `SAVE_VERSION = 26` in `packages/sim/src/save/schema.ts` line 5; doc is stale at `25` (lines 11, 18). Edits B1/B2 correct exactly those two statements; historical v25 references left intact. No code bump. | `prepared` — primary applies edits; re-check after |
| AC-1 | product.md states unlimited stable, one active partner, no release seam | Baseline quoted above; Edit A is the ready-to-apply ratification note. | `prepared` |
| AC-2 | save-schema doc: v26, no capacity limit, one active `creature`, frozen stable, no release path | Edits B1/B2/B3 cover all five claims. | `prepared` |
| AC-6 | Doc truth check: no remaining stable cap, release seam, multiple active partners, or version `25` in edited docs | Baseline grep/read found no cap/multi-partner/release claims; only stale version `25` at lines 11 and 18 (B1/B2 fix those). Re-run the doc truth check after the primary applies edits. | `prepared` — re-check pending primary |
| NFR-1 | No sim/client/server/save/generated diff; only Conductor state + two approved docs | This agent touched only this evidence file; `git status --short` was clean at verification head. No code/generated files changed. | `verified` |
| NFR-3 | Product-doc edits only ratify decided policies; no new vision/balance/progression | Edit A restates the three ratified policies and the existing lifecycle path only; no new mechanic introduced. | `verified` (draft review) |

## Evidence paths

- Evidence file: `conductor/tracks/20261126-stable-capacity-ranch-release/verification/phase-1.md`
- `bun run verify` captured output (exit 0): `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_21501ca70001fNNc5rQsuZJoyh.out`
- `bun run build` captured output (exit 0): shell result of `bun run build; "EXITCODE=$LASTEXITCODE"` (Vite client build, 441 modules, built in 1.33 s)
- Baseline reads: `conductor/product.md`, `docs/save-schema.md`
- Code truth: `packages/sim/src/save/schema.ts` (line 5, `SAVE_VERSION = 26`)

## Deviations

- **primary applies product-doc edits due agent policy:** `conductor/product.md` and `docs/save-schema.md` are outside the writable `conductor/tracks/*/verification/**` path for this agent. All required edits are drafted verbatim above; the primary must apply them.
- No files outside the brief's `Touches` were changed by this agent (only the evidence file was written). No other deviations.

## Notes

- Working tree was clean at head `42c9b097…`, which equals the phase base; verification ran against that exact tree.
- Both configured gates were green before any doc edits (docs-only changes cannot affect typecheck/tests/build/determinism), so the primary's post-edit chained run should be a formality; it is still required for the phase record.
- The doc truth check here was performed by reading the edited docs directly (no cap/multi-partner/release statement found; stale `25` only at the two current-version lines). No dedicated doc-truth script exists in the configured command set.

## Primary verification

- Scope check: `git diff --name-only 42c9b097..HEAD` shows exactly the two approved docs (`conductor/product.md`, `docs/save-schema.md`) and this evidence file. Range commits are `784b764d` (baseline/draft evidence) and `06b6ec65` (primary doc ratification); no merge or user commits.
- Doc edits applied exactly as drafted: `conductor/product.md` gained the “Ratified stable & ranch policy (2026-11-26)” subsection; `docs/save-schema.md` line 11 now says `current: 26`, the header is ``## `GameState` at v26``, and the `stable` row states no capacity limit, one active `creature`, frozen stabled pets, and no release path. Historical `v25` references elsewhere in the doc were left intact.
- Doc truth re-check: grep found no remaining `current: 25` or ``GameState` at v25``, and confirmed the ratification lines in `conductor/product.md` and the no-cap/no-release wording in `docs/save-schema.md`.
- Primary re-ran the full chained gate `bun run verify && bun run build` after the doc edits: exit 0. Typecheck/tests/Biome green, voxel determinism OK for all creature GLB regenerations and all 5 prop digests, client build emitted `dist/assets/index-DADRLmAJ.js` (1,108.81 kB) with only the pre-existing chunk-size advisory.
- Conclusion: FR-1–FR-4, AC-1, AC-2, AC-6, NFR-1 and NFR-3 are satisfied; Phase 1 is ready to accept. FR-5/AC-3 revisit-trigger evidence remains for Phase 2 by plan.
