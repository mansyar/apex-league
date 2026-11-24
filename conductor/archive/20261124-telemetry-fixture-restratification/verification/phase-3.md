# Phase 3 Evidence: Audit truth, dated documentation, and final verification

- **Phase:** 3
- **Result:** verified
- **Phase base:** `2c480ef6`
- **Base:** `main` @ `d29042de1c9019189373beb763baa1805dd78541`
- **Date:** 2026-11-24

## 1. Goal and scope

The four-cell audit and current documentation describe both samples and the
D-4 closure; all configured checks are green with unchanged game scope; the
integrated record is committed. Phase 3 touched only `conductor/product.md`,
`conductor/tech-stack.md`, and the two verification reports. The source and
test changes belong to Phase 2 and are unchanged here.

## 2. Dated documentation

- `conductor/product.md`: a 2026-11-24 note after the Phase 4 D-4 closure
  paragraph records the representative gate, the two moved bounds, the
  ungated smoke sample, unchanged matrix/D-1/hash, the named AC-11 artifact,
  the cadence-resonance follow-up, and the still-open hardware device-lab pass.
  The 2026-11-20 wording is preserved.
- `conductor/tech-stack.md`: a 2026-11-24 bullet records the midpoint + press
  gate, the `--smoke` CLI flag (no manifest change), the two bound moves, the
  unchanged matrix/D-1/hash, the cell A/D naming, and unchanged module caps.

## 3. Command table

| Layer / command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4462 pass / 1 skip / 0 fail; Biome 1037 files clean; determinism gate OK; battle hash `0xff6f3d62`. |
| `bun run build` | 0 | 438 modules transformed in 484 ms; advisory only. |
| `bun run balance` | 0 | 1680 fights; cap `370/1680 (22.0%)`; all gates ok. |
| `bun run gate:determinism` | 0 (primary) | All creature GLBs and 5 prop digests byte-identical. |
| `bun run test:fuzz` | 0 (primary) | 139 pass / 0 fail, 129015 expect(), 135 files, 200.76 s. |
| `bun run telemetry` | 0 | Cap `5/42 (11.9%)`; 14/14 bounds ok; one named AC-11 artifact fight. |
| `bun run fixture-audit` | 0 (primary) | A/B/C/D `11/8/7/5` of 42; `1680 / 580 / 370`; `+12.5 points`. |
| `bun packages/sim/scripts/battle-telemetry.ts --smoke` | 0 (primary) | `SMOKE` header; historical `11/42 (26.2%)`; ungated. |
| `git diff --check d29042de..HEAD` | 0 | No whitespace errors. |
| `git status --porcelain` | 0 (empty) | Clean before and after command runs. |
| `git branch --list` | 0 | Only this chore branch and `main`. |
| `git ls-remote --heads origin` | 0 | Read-only; `origin/main` at `d29042de`. |

`git diff --quiet d29042de..HEAD -- packages apps` exits 1 by design: Phase 2
legitimately changed four approved `packages/sim` files. Phase 3 added no source
change. Full command outputs are in
`.conductor/evidence/20261124-telemetry-fixture-restratification/phase-2/**`
and `.../final/**`.

## 4. Acceptance criteria

| ID | Status | Evidence |
| --- | --- | --- |
| AC-1 | satisfied | Phase 1 baseline and four-cell audit unchanged. |
| AC-2 | satisfied | Representative midpoint + press gate, cap `5/42`, duration min 12500 ms. |
| AC-3 | satisfied | `--smoke` historical sample, ungated, no manifest change. |
| AC-4 | satisfied | Only `engagementMax` and `distinctPositions` values moved. |
| AC-5 | satisfied | Failing-first `14 pass / 4 fail` → green `24 pass / 0 fail` in Phase 2. |
| AC-6 | satisfied | Audit names cell A (smoke) and cell D (gate); matrix arithmetic preserved. |
| AC-7 | satisfied | Dated product and tech-stack notes in §2. |
| AC-8 | satisfied | No game/fence/matrix/schema/API/CORS/deploy/dependency change. |
| AC-9 | satisfied | All five configured checks exit 0 with hash `0xff6f3d62`. |
| AC-10 | satisfied | `integrated.md` and this report committed with full command and AC tables. |
| AC-11 | satisfied | One named zero-commit fight pinned; cadence resonance deferred as a follow-up. |

## 5. Subagent denials resolved by primary

The Phase 3 subagent returned `blocked` without writing files or committing.
Its edit tool was denied for `conductor/product.md` and four shell commands
(`bun run gate:determinism`, `bun run test:fuzz`, `bun run fixture-audit`, and
the `--smoke` invocation) were denied with the verbatim envelope
`{"error":{"type":"permission.rejected","message":"Permission denied: shell"},"content":[]}`.
Per phase rules it did not retry or work around them. The primary ran every
denied command unchanged with exit 0 (§3) and wrote the documentation and both
verification reports. No check regressed, no bound or game gate was widened or
re-pinned, and no remote ref, branch, credential, or player data was touched.

## 6. Reported deviation

At the user's explicit 2026-11-24 request, `conductor/workflow.md` was changed
in a separate commit (`526ff5d6`) to make PR merges use a merge commit
(`gh pr merge --merge`) instead of squash. This is a Conductor workflow-policy
edit, not a game, product, or track-state change; it is disclosed here because
it appears in the PR diff outside the phase's declared `Touches`.

## 7. Verdict

**Phase 3 verified.** All acceptance criteria are satisfied and the final tree
is ready for documentation sync and review.
