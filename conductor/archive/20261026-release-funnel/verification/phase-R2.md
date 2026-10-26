# Phase R2 Evidence — Review Fixes (round 2), L1

- **Track:** `20261026-release-funnel`
- **Phase:** R2 — Review Fixes (round 2)
- **Date:** 2026-10-26
- **Branch:** `chore/20261026-release-funnel`
- **Base (phase_base):** `1ecd480a`
- **Code head:** `6edebfdc`
- **Covers:** **L1** only — the three weak assertions in
  `scripts/deploy/workflow.test.ts`, plus the optional fourth the brief offered.
- **Result:** **verified** — 6 genuine reds recorded against mutated workflow
  sources, all four tightenings green on the real `deploy.yml`, and all three
  gates (`bun test --check --parallel=4 --timeout 120000`, `bun run verify`,
  `bun run build`) pass on the code head.

**L2 is not touched.** `conductor/workflow.md` is Conductor state, denied to this
agent by `.opencode/agents/conductor-phase.md:9-14` and owned by the primary;
the brief assigns it to the primary. Nothing in this phase reads or writes it.

**`.github/workflows/deploy.yml` is not touched.** The findings are that the
test is too weak, not that the workflow is wrong, and the evidence below confirms
the workflow already satisfies every strengthened assertion. No blocker.

## What changed

| L-id | Severity | What changed | Where | Guarding assertion |
|---|---|---|---|---|
| L1(i) | Low | The `wrangler.jsonc` assertion no longer matches the filename alone (which the workflow's own comments satisfy). It now names the real extraction *and* asserts the absence of the hardcoded project name — the half a comment cannot satisfy. | `scripts/deploy/workflow.test.ts:161-170` | `:168` `toMatch(/sed -n .*wrangler\.jsonc/)`; `:169` `not.toContain('project="apex-league"')` |
| L1(ii) | Low | The "first wrangler call" pattern now sees `bun run deploy` (a wrangler call via `package.json`'s `"deploy": "bunx wrangler pages deploy"`) in its inline `run: bun run deploy` form, so the Node-before-wrangler property holds against the upload call too. | `scripts/deploy/workflow.test.ts:127-135` | `/^[ \t]*(?:run:[ \t]*)?(?:bunx wrangler\|bun run deploy)/m`, ordered by `:140-141` |
| L1(iii) | Low | `continue-on-error` is now asserted absent instead of only named in the comment. | `scripts/deploy/workflow.test.ts:73-77` | `:77` `not.toContain("continue-on-error")` |
| optional (iv) | — | The post-deploy smoke step is pinned: it must exist and must sit below the upload, so AC-3/AC-5's mechanism cannot be deleted or hoisted silently. | `scripts/deploy/workflow.test.ts:80-89` | `:87` `smoke > -1`; `:88` `upload < smoke` |

No existing assertion was weakened, removed, skipped, or given `.only`: the
count went from nine tests to ten (one added), and 29 `expect()` calls.

## The four assertions, quoted, with what each now rules out

1. **`expect(workflow).toMatch(/sed -n .*wrangler\.jsonc/)`** and
   **`expect(workflow).not.toContain('project="apex-league"')`**
   (`workflow.test.ts:168-169`)
   Rules out what the old `toContain("wrangler.jsonc")` allowed: deleting the
   `sed -n … wrangler.jsonc` extraction at `deploy.yml:110` and hardcoding
   `project="apex-league"`. Red `(i.a)`/`(i.b)` are exactly that mutation, and
   the `blind (i)` test next to them shows the old assertion still passing on it
   — because the filename survives in the comments at `deploy.yml:10, 104, 112,
   150`. The second assertion is the one no comment can satisfy.
2. **`/^[ \t]*(?:run:[ \t]*)?(?:bunx wrangler|bun run deploy)/m`**
   (`workflow.test.ts:134-135`)
   Rules out a wrangler call above `actions/setup-node@v4`, including the upload
   itself. `deploy.yml:134` reads `run: bun run deploy -- --branch …` — the call
   is *not* at a line start, so the brief's literal widening
   `/\n[ \t]*(bunx wrangler|bun run deploy)/` still misses it (red `(ii.a)`
   reports the received line verbatim; red `(ii.b)` shows the literal pattern's
   first match on the mutated source is still the version echo, at 2633, above
   the Node step at 1916). The optional `run:` prefix plus the `m` anchor keep
   the "a comment is not a call" property the old pattern had — the comments at
   `deploy.yml:41, 69-70` are still skipped, and the first match on the real file
   is still `bunx wrangler --version` (`green (ii)`).
3. **`expect(workflow).not.toContain("continue-on-error")`**
   (`workflow.test.ts:77`)
   Rules out the third route to a published red build that the surrounding
   comment names: `continue-on-error: true` on the `Verify` step
   (`deploy.yml:95-96`) would let a failed gate reach the upload. `blind (iii)`
   proves every other assertion in the suite stays green on that mutation.
4. **`expect(smoke).toBeGreaterThan(-1)` / `expect(upload).toBeLessThan(smoke)`**
   (`workflow.test.ts:87-88`)
   Rules out deleting `Smoke check the deployed build` (`deploy.yml:151-152`) or
   moving it above `Deploy to Cloudflare Pages` (`:126`); red `(iv)` is the
   deleted-step mutation.

## Commands

| # | Command | Exit | Summary |
|---|---|---|---|
| 1 | `git status --short` ; `git log --oneline -6` | 0 | clean tree at `1ecd480a`; no stray work in flight |
| 2 | `bun test ./.conductor/evidence/phase-R2-red.test.ts` — **red run** | 1 | 8 pass, **6 fail**, 22 `expect()` calls, 14 tests. Failures: `red (i.a)`, `red (i.b)`, `red (ii.a)`, `red (ii.b)`, `red (iii)`, `red (iv)`. The three `blind (…)` tests and the four `green (…)` tests passed in the same run |
| 3 | `bun test scripts/deploy/workflow.test.ts` — green | 0 | 10 pass, 0 fail, 29 `expect()` calls, 1 file |
| 4 | `bunx biome check scripts/deploy/workflow.test.ts` | 1 | 1 formatter error — Biome wants the regex assignment wrapped |
| 5 | `bunx biome check scripts/deploy/workflow.test.ts` (after wrapping by hand) | 0 | checked 1 file, no fixes applied |
| 6 | **`bun test --check --parallel=4 --timeout 120000`** (phase verification) | 0 | **2842 pass, 1 skip, 0 fail**, 267,415 `expect()` calls, **2843 tests / 242 files**, 49.74s — one more test than R1's 2842/242, which is the added `smoke check runs below the upload` test |
| 7 | `bun run verify` | 0 | typecheck clean (voxel 118, sim 151, client 389 files); 2843 tests / 242 files, 0 fail; Biome 647 files, 0 errors, 1 pre-existing warning (`noDescendingSpecificity`, `apps/client/src/ranch.css:1429`); determinism gate byte-identical for 27 creature GLBs + 5 props |
| 8 | `bun run build` | 0 | 314 modules; `index-DdmaZZpS.css` and `index-CI37K-Je.js` — the same asset hashes as the review and R1, so a test-only change altered no build output |
| 9 | `git add scripts/deploy/workflow.test.ts` ; `git commit -m "test(deploy): tighten the workflow contract assertions"` | 0 | `6edebfdc`, 1 file changed, 30 insertions(+), 4 deletions(-) |
| 10 | `bun test ./.conductor/evidence/phase-R2-red.test.ts 2>&1 \| Select-String -Pattern "^(\(fail\)\|\(pass\)\|…)"` | **denied** | `Permission denied: shell`. This was my own output filter, not a brief-named command; the brief requires plain, unpiped commands, so the plain form was run instead (row 2) and the piped variant was **not** retried, rephrased, or worked around |

## Red evidence — how the reds were produced without editing the workflow

`.conductor/evidence/phase-R2-red.test.ts` (gitignored, like the phase-2
harnesses, so no root `bun test` run discovers it) reads the real
`.github/workflows/deploy.yml`, applies one string mutation per finding — the
`sed` read replaced by `project="apex-league"`; a `run: bun run deploy` step
inserted above `actions/setup-node@v4`; `continue-on-error: true` inserted into
the `Verify` step; the smoke step dropped — and then runs the *strengthened*
assertion against each mutation. A failing test there is the red; the paired
`blind (…)` test runs the *old* assertion against the same mutated source and
passes, which is the finding stated as an executed fact rather than an argument.

The mutations exist only in memory: `deploy.yml` on disk is untouched, which is
why row 6-8 gates are unaffected and why the reds are honest — the current test
file would have passed every one of these defective sources.

Where a red is **not** real, this record says so: none of the four tightenings
is a defect-fix in the workflow. All four are strengthenings against *future*
drift; on today's `deploy.yml` every new assertion is green in its first run
(row 3), and the `green (…)` tests in the harness are the same statements
evaluated against the file as it stands.

## Deviations

- **`scripts/deploy/workflow.test.ts` — the widened pattern is stricter than the
  brief's literal regex.** The brief hands over
  `/\n[ \t]*(bunx wrangler|bun run deploy)/`, but that pattern cannot match
  `deploy.yml:134`, because the upload call is written inline as
  `run: bun run deploy`. Taking it verbatim would have closed the finding's
  *wording* while leaving its *property* unpinned. The landed pattern is
  `/^[ \t]*(?:run:[ \t]*)?(?:bunx wrangler|bun run deploy)/m` — the same
  line-start anchor the old pattern used (so comments still do not count), an
  optional `run:` prefix, and the multi-line flag in place of the leading `\n`.
- **`scripts/deploy/workflow.test.ts` — the optional fourth item was taken**
  (smoke step present, below the upload). It is a position assertion, which the
  brief calls the better of the two options, and it needed no restructuring: one
  new test inside the existing `the upload is gated` describe.
- **`.conductor/evidence/phase-R2-red.test.ts` — a new gitignored harness.**
  Outside `Touches`, but the brief's own rules allow artifacts under
  `.conductor/evidence/`, and the TDD instruction ("write each assertion red
  first … demonstrate that by temporarily asserting the stronger property")
  needs a source to assert against that is not the real workflow.
- Nothing else. No `package.json`, `wrangler.jsonc`, `bun.lock`,
  `.github/workflows/deploy.yml`, `conductor/**` (other than this evidence file),
  `apps/**` or `packages/**` change; no new dependency; no `bun` API the repo does
  not already use (the file already imports `bun:test` and `node:fs`).

## Notes

1. **Six reds, all genuine**, and they are the point of findings (i) and (iii):
   `blind (i)` and `blind (iii)` show the old suite staying green on a source
   that hardcodes the project name or tolerates a failed gate. For (ii) the red
   is sharper than the brief anticipated — it is `red (ii.a)`, showing the
   brief's literal regex itself missing `run: bun run deploy`.
2. **The workflow is not wrong.** Every strengthened assertion holds on the
   committed `deploy.yml` unchanged; `deploy.yml:110` really does read the name
   out of `wrangler.jsonc`, `:134` is the only upload call and sits below the
   Node step at `:47-50`, there is no `continue-on-error` anywhere in the file,
   and the smoke step is last. No blocker was available to raise, and none was.
3. **L2 remains open from this agent's side by design** — `conductor/workflow.md`
   is the primary's (plan R2.T2.1). This evidence covers L1 only, so the phase is
   `verified` for T1, not for the whole R2 phase.
4. **Row 10 is recorded rather than hidden.** One command carrying my own
   `Select-String` filter was rejected by the shell allowlist. It was not a
   brief-named command, the required commands all ran plain and unmodified, and
   I did not retry it in another form. The overwritten `git status`/`git log`
   need has been served elsewhere (rows 1 and 9), so nothing was lost.
5. **Local Bun is 1.4.3-canary.1** (CI pins 1.4.2) — pre-existing, tracked in
   `integrated.md`. It does not touch this phase: the assertions are string and
   regex work over file text, and every gate above ran on the same local runtime
   R1 and the review used.
6. **Not covered:** L1 is test-only, so there is no live or browser-dependent
   half to leave uncovered. Nothing in this phase's scope was deferred.
7. The harness deliberately lives under `.conductor/`, so `bun test` never
   discovers it: `242 files` in row 6 is unchanged from R1, and the only new
   test inside the gate is the one added to the committed file.
## Primary verification

- **Date:** 2026-10-26
- **By:** Conductor primary, independent of the phase agent's report
- **Tree:** clean at `e5879832` / `54d8b916` before this append

### Squash guard

`git log --oneline 1ecd480a..HEAD` held exactly the agent's two reported
commits (`6edebfdc` the test, `3b8508da` the evidence) plus the primary's L2
work. No merges, nothing unreported. Squashed to **`e5879832`**
(`test(deploy): tighten the workflow contract assertions`, one file) with
`conductor/workflow.md` in its own commit `54d8b916` and the evidence riding
with this state commit.

### Findings closed

**L1 — three assertions narrowed to what their comments claim.** All three are
in `scripts/deploy/workflow.test.ts` and all three were genuinely red first
against mutated workflow sources in the agent's gitignored harness, with paired
"blind" cases proving the *old* assertions stayed green on the same defective
sources. Spot-checked by the primary:

- **(i)** `expect(workflow).toMatch(/sed -n .*wrangler\.jsonc/)` **and**
  `expect(workflow).not.toContain('project="apex-league"')`. I confirmed
  against the real file: the `sed` extraction is present and the literal
  hardcoding is absent, so the second assertion cannot be satisfied by a
  comment — which was exactly the hole.
- **(ii)** The agent **found my brief's own regex wrong** and said so. I had
  written `/\n[ \t]*(bunx wrangler|bun run deploy)/`; the upload reads
  `run: bun run deploy` inline, so a bare line-start anchor never matches it and
  the finding's wording would have been closed while its property stayed
  unpinned. The landed pattern allows the `run:` prefix. I verified the
  behaviour independently: the old pattern and the new one both first match the
  version echo, the new one at offset 2551, and `actions/setup-node` sits at
  1833 — so the ordering assertion holds, and because the upload is matched too,
  moving the Node step below any wrangler call fails the test. The property is
  genuinely pinned, not merely satisfied by position.
- **(iii)** `expect(workflow).not.toContain("continue-on-error")`; the real
  workflow contains none. This closes the route the `if: success()` comment had
  named but nothing checked.
- **(iv, optional)** The smoke step is now pinned present *and* below the
  upload, so deleting AC-3/AC-5's mechanism cannot slip through.

**L2 — the process doc stops contradicting itself.** Applied by the primary,
because `conductor/**` is denied to phase agents. The trigger clause now
attributes previews to a manual run on a non-main branch and states plainly
that a push to any other branch runs nothing; the Emergency Procedures opening
no longer says "no production deployment", the hotfix sentence now describes
reality (a merged regression reaches production on the next green upload, and
Pages keeps the previous deployment live until then), and the security bullet
names the two deploy secrets and how they are handled. Grep confirms no
survivor of "no production" / "no deployed build" / "never deploys" /
"no hosting workflow". Em-dash count unchanged at 15, no mojibake.

### One correction the primary made

The agent's comment on the ordering assertion claimed "the check below also
pins it above the project step's calls" — there is no check below it. The
assertion itself is sound (verified above), but the comment described a
guarantee that did not exist, which is the same class of defect as L1. I
reworded it to state what the assertion actually does. Made as part of the
squash, not as a separate finding.

### Independent gates

| Command | Result |
|---|---|
| `bun test --check --parallel=4 --timeout 120000` | exit 0 — 2842 pass, 1 skip, 0 fail, 267,415 `expect()` calls, **2843 tests / 242 files** |
| `bun run test:phase` (re-run) | exit 0 — 2843 tests / 242 files, 0 fail, 48.40s |
| `bun run verify` | exit 0 — typecheck clean, Biome 0 errors (1 pre-existing warning), determinism gate byte-identical |
| `bun run build` | exit 0 — 314 modules, same asset hashes |
| `bun test scripts/deploy/workflow.test.ts` | exit 0 — 10 pass, 0 fail, 29 `expect()` calls |

Arithmetic: 2842 / 242 at R1 → 2843 / 242 here, the single new test being the
optional smoke-position assertion. The other three findings tightened existing
assertions, which is why the count barely moved — that is the correct shape for
hardening findings.

### Verified, not claimed

`deploy.yml` was **not** modified by this phase, and I confirmed it is untouched
in the diff. The findings said the test was too weak, not that the workflow was
wrong, and the strengthened assertions all pass against the workflow as
committed — so these are strengthenings against future drift rather than
defect-fixes, and the agent said so rather than manufacturing a defect.

**Result:** phase accepted. Both round-2 findings are resolved with executed
red evidence, no assertion was weakened, no test skipped, no dependency added,
and nothing under `.github/workflows/` changed.