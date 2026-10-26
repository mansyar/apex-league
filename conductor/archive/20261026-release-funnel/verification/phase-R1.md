# Phase R1 Evidence — Review Fixes (round 1)

- **Track:** `20261026-release-funnel`
- **Phase:** R1 — Review Fixes
- **Date:** 2026-10-26
- **Branch:** `chore/20261026-release-funnel`
- **Base:** `cfa38f57` (branch head when Phase R1 started)
- **Code head:** `65d5f3a7`
- **Covers:** F1, F2, F4, F5, F6, and the `integrated.md` half of F8
- **Result:** **verified** — all six findings in this agent's scope are resolved,
  each with a guard, and the phase's verification command, `bun run verify` and
  `bun run build` all pass on the code head.

Two findings were **not** touched because the brief assigns them to the primary:
**F3** (`conductor/workflow.md`, denied to this agent by
`.opencode/agents/conductor-phase.md:9-14`) and **F7** (`plan.md`, already
applied). Both remain open from this agent's side by design.

## What changed

| F | Severity | What changed | Where | Guard |
|---|---|---|---|---|
| F1 | Medium | `violations()` now reports an empty request log as a violation, mirroring `parseConsoleReport`'s fail-loud rule next door. A CLI output-format change can no longer print `requests 0 · failed 0` and exit 0. | `scripts/smoke/smoke.ts:175-182` | `scripts/smoke/smoke.test.ts:93` — "an empty request log is a violation, not a silent pass" |
| F2 | Medium | The deploy job provisions `actions/setup-node@v4` with `node-version: 22` before any wrangler call, and the install step echoes `bunx wrangler --version` so a bad runtime fails in seconds instead of at the upload. | `.github/workflows/deploy.yml:41-50` (step), `:66-71` (version echo) | `scripts/deploy/workflow.test.ts:103` and `:123` |
| F4 | Medium | The phase-2 contract assertions are now committed: `scripts/deploy/workflow.test.ts` reads `deploy.yml` and `wrangler.jsonc` and pins nine properties. `bun test` discovers it with no configuration change (242 files, was 241). | `scripts/deploy/workflow.test.ts` (new, 145 lines) | the file itself |
| F5 | Low | A bare `--url` with no value now fails with `--url needs a value` instead of silently falling through to `SMOKE_URL` — or, in CI, to the production Pages URL. | `scripts/smoke/smoke.ts:206-209` | `scripts/smoke/smoke.test.ts:243` — "a url flag with no value is rejected" |
| F6 | Low | (a) The catch path's `gather()` is guarded, so a broken build can no longer replace its own reason with a second failure; the gathering error is logged and the original message survives. (b) The config read, the target and the browser CLI moved inside `main`'s `try`, so a missing `wrangler.jsonc` or an absent `playwright-cli` yields the documented `RESULT fail` + JSON envelope instead of an uncaught stack trace. | `scripts/smoke/smoke.ts:331-344` (a), `:356-399` (b) | `scripts/smoke/smoke.test.ts:259` — "an unresolvable target exits 1 instead of throwing" (b); (a) is live-browser only, see Notes |
| F8 | Low | The stale `conductor/product.md` known-gap bullet is removed and the remaining four are renumbered. The head sha is deliberately left at `f41022fa` for the primary to set at acceptance. | `conductor/tracks/20261026-release-funnel/verification/integrated.md:83-104` | n/a (prose) |

## Commands

| # | Command | Exit | Summary |
|---|---|---|---|
| 1 | `git status --short; git log --oneline -8` | 0 | Only `conductor/workflow.md` modified (the primary's F3); branch head `cfa38f57` |
| 2 | `bun test scripts/smoke/smoke.test.ts` — **F1 red** | 1 | 22 pass, 1 fail: `expect(found).toHaveLength(1)` → received 0 — the empty log was a silent pass |
| 3 | `bun test scripts/smoke/smoke.test.ts` — F1 green | 0 | 23 pass, 0 fail |
| 4 | `bun test scripts/smoke/smoke.test.ts` — **F5 red** | 1 | 23 pass, 1 fail: `targetUrl(["--url"])` returned `https://apex-league.pages.dev` instead of throwing — the defect reproduced exactly |
| 5 | `bun test scripts/smoke/smoke.test.ts` — F5 green | 0 | 24 pass, 0 fail |
| 6 | `bun test scripts/smoke/smoke.test.ts` — **F6 red** | 1 | 24 pass, 1 fail: `SmokeError: not an http(s) URL: file:///tmp/x` escaped `main()` — a stack trace where the envelope belongs |
| 7 | `bun test scripts/smoke/smoke.test.ts` — F6 green | 0 | 25 pass, 0 fail; stdout shows `{"smoke":"fail","target":null,"reason":"not an http(s) URL: file:///tmp/x"}` |
| 8 | `bun test scripts/deploy/workflow.test.ts` — **F4 red** | 1 | 7 pass, 2 fail: no `actions/setup-node@v4` and no `bunx wrangler --version` in the workflow |
| 9 | `bun test scripts/deploy/workflow.test.ts` — after F2's edit, still red | 1 | 8 pass, 1 fail: `setup` (1833) was not `< firstWrangler` (1377) — the search matched the phrase inside the new step's own comment, not an invocation. The assertion was tightened to match a line-start invocation (`/\n[ \t]*bunx wrangler/`), which is what the property actually means |
| 10 | `bun test scripts/deploy/workflow.test.ts` — F4 green | 0 | 9 pass, 0 fail |
| 11 | `bunx biome check scripts/deploy/workflow.test.ts scripts/smoke/smoke.ts scripts/smoke/smoke.test.ts` | 1 | 2 formatter errors, 2 `noTemplateCurlyInString` warnings |
| 12 | `bunx biome check --write scripts/deploy/workflow.test.ts scripts/smoke/smoke.ts scripts/smoke/smoke.test.ts` | 0 | Fixed 2 files (formatting only). The two warnings were removed by hand — as regexes, because Biome's suggested fix (a template literal) would have changed the assertion's meaning |
| 13 | `bun test scripts/deploy/workflow.test.ts scripts/smoke/smoke.test.ts` | 0 | 34 pass, 0 fail |
| 14 | **`bun test --check --parallel=4 --timeout 120000`** (phase verification) | 0 | **2841 pass, 1 skip, 0 fail**, 267,411 `expect()` calls, **2842 tests / 242 files**, 56.33s — twelve more tests and one more file than the review's 2830/241 |
| 15 | `bun run verify` | 0 | Typecheck clean (voxel 118, sim 151, client 389); 2842 tests 0 fail; Biome 647 files, 1 pre-existing warning (`noDescendingSpecificity`, `ranch.css:1429`), 0 errors; determinism gate byte-identical |
| 16 | `bun run build` | 0 | 314 modules; `index-DdmaZZpS.css` and `index-CI37K-Je.js` — the same asset hashes as the review's run; pre-existing chunk-size advisory only |
| 17 | `git log --oneline cfa38f57..HEAD` | 0 | Seven commits, listed below |
| 18 | `git diff`, `git switch`-free inspection via the native read/grep tools | 0 | Line numbers for this report |

`Get-ChildItem -Force .conductor -Recurse` was **denied** by the shell
allowlist (only Git, the configured verification commands, and `bun test` are
permitted). The `.conductor/evidence/` phase-2 harnesses therefore could not be
read this session; nothing in F1–F8 required them, so this is not a blocker. It
is recorded because it is the one command in this phase that did not run.

## Commits

| Commit | Subject |
|---|---|
| `d8902adb` | `fix(smoke): fail the smoke check when no requests were observed` (F1) |
| `8339d8cc` | `fix(smoke): reject a url flag without a value` (F5) |
| `e24cdc9a` | `fix(smoke): keep the smoke failure diagnosis` (F6) |
| `87c2a7b7` | `style(smoke): apply the repository formatter to the new test` (housekeeping — see Deviations) |
| `79b7cc63` | `fix(ci): provision Node before the wrangler calls` (F2) |
| `5a2b4292` | `test(deploy): pin the deploy workflow contract` (F4) |
| `65d5f3a7` | `docs(conductor): correct the integrated verification record` (F8) |

## The committed workflow test's assertions

Each assertion carries this reasoning as a comment in the source, so the pin
explains itself where it is read.

| # | Assertion (`scripts/deploy/workflow.test.ts`) | The reason it exists |
|---|---|---|
| 1 | `:54` `- name: Verify` occurs before `- name: Deploy to Cloudflare Pages` | AC-2. The gate protects production only while the verification step sits above the upload; a reorder publishes builds the pull-request gate would have rejected. |
| 2 | `:65` the deploy step carries `if: success()` | The gate written out in the source. `always()`, `failure()`, or a `continue-on-error` on the verification step would publish red builds. |
| 3 | `:75` no `run:` body interpolates `${{ secrets.* }}` | NFR-3. Secrets reach the shell through `env:` only, so nothing can echo a value — not even under `set -x`. The same test also asserts both secret names *are* still interpolated somewhere, so it cannot pass vacuously once the wiring is deleted. |
| 4 | `:87` `bun install --frozen-lockfile` is present | A lockfile that drifts during a release run installs versions nobody tested. |
| 5 | `:93` the job is gated on `github.repository == 'mansyar/apex-league' && github.event.repository.fork == false` | A fork's push carries no secrets and must not attempt an upload against the canonical project. |
| 6 | `:103` `actions/setup-node@v4` and `node-version: 22` both precede the first line-start `bunx wrangler` | F2 in one assertion. wrangler's bin is `#!/usr/bin/env node` and refuses Node < 22, while the runner's default `node` is 20 — every wrangler call would die before reaching the API, and only on the first live push. |
| 7 | `:123` `bunx wrangler --version` is present and comes after `bun install --frozen-lockfile` | Converts a bad runtime into a failure in seconds rather than one at the upload step, after the whole gate has run. Placed after the install so the echo cannot reach for the network. |
| 8 | `:134` `wrangler.jsonc` sets `pages_build_output_dir` to `apps/client/dist` | NFR-5. Pages publishes exactly this directory; a rename would upload a stale or empty tree while every other check stayed green. |
| 9 | `:140` the workflow references `wrangler.jsonc` for the Pages project name | The upload and the post-upload smoke check must agree on the target, so the name is read from the config rather than repeated in the workflow. |

The helper `runBodies()` (`:22-51`) extracts `run:` bodies by indentation, both
the block and the inline form, because the secret-hygiene assertion has to look
inside the shell text rather than at the file as a whole — a `${{ secrets.* }}`
in a comment or an `env:` block is not a leak, and one inside a `run:` body is.

## Deviations

**None outside `Touches`.** One in-scope item is recorded here because it is
more than the literal fix:

- `scripts/smoke/smoke.test.ts` receives a second, formatting-only commit
  (`87c2a7b7`). The F5 test landed with a line Biome's formatter wants wrapped,
  and `biome check` — a required layer of `bun run verify` — exits non-zero on
  formatter errors. `--amend` is forbidden, so the fix is its own commit rather
  than a rewrite of `8339d8cc`. No assertion changed.
- `scripts/smoke/smoke.ts`'s failure envelope now reports `target: null` instead
  of `target: ""` when the run failed before the target was known. Strictly
  beyond F6(b), but F6(b) is exactly what makes that state reachable, and an
  empty string reads as a real target in the Actions log.

## Notes

1. **F6(a) has no committed test, and I am not claiming one.** The guarded
   `gather()` in the catch path is reachable only through a live browser run
   (`main` + `playwright-cli`), which the committed suite deliberately does not
   drive. F1, F5, F6(b) and every workflow assertion are covered through exported
   functions. The F6(a) change is verified by inspection of the two shapes it
   handles, as the brief permits.
2. **`integrated.md` head sha left at `f41022fa`** — the brief reserves that
   line for the primary's acceptance pass. `plan.md:119` (R1.T8.1) still reads
   "Update the recorded head", so the two disagree; the brief wins here, and the
   primary owns that file.
3. **`integrated.md` known-gap entry 1 may now be stale in one sentence.** The
   brief said only the third bullet was stale, and I followed that: entry 1
   still reads "*a future edit that moved `Deploy` above `Verify` would be
   caught by nothing committed*" and "*A committed workflow-contract suite would
   need its own `Touches`; it is out of this track's scope and is left to the
   reviewer*". After F4 the first claim about the *workflow* is false (the
   gitignored-harness fact in the same bullet remains true, and the entry stays
   as the brief instructed). Recommend the primary reword that one bullet at
   acceptance — the committed suite is `scripts/deploy/workflow.test.ts`.
4. **F1's choice of mechanism.** The brief offered a violation in `violations()`
   or a `fail()` in `parseRequests`. I took `violations()`: it is what
   `plan.md:104` (R1.T1.2) names, it keeps `parseRequests` a pure reader, and it
   preserves the documented `RESULT fail` + JSON envelope — a `fail()` from the
   final `gather()` would also have thrown inside the F6(a) catch path, where the
   guard would have swallowed it. The property that matters — never silently pass
   on an empty request log, the rule `parseConsoleReport` already follows — is
   identical.
5. **Local Bun is 1.4.3-canary.1**, CI pins 1.4.2 (pre-existing, tracked in
   `integrated.md`). The workflow's YAML was not machine-parsed: no YAML parser
   exists in this repository and adding one would be a new dependency, which the
   brief forbids. Both edits are simple block additions whose indentation is
   visible in the diff (`deploy.yml:41-50`, `:66-71`).
6. `bun run build` reproduces the same asset filenames as the review's run, so
   the F2 and F4 changes altered no build output; `wrangler.jsonc` was read, not
   changed.
## Primary verification

- **Date:** 2026-10-26
- **By:** Conductor primary, independent of the phase agent's report
- **Tree:** clean at `4e740b72` / `8ca3959d` before this append

### Squash guard

`git log --oneline cfa38f57..HEAD` held exactly the commits reported — the
agent's eight (`d8902adb` F1, `8339d8cc` F5, `e24cdc9a` F6, `87c2a7b7` the
formatter follow-up, `79b7cc63` F2, `5a2b4292` F4, `65d5f3a7` F8,
`c6a8fbd8` evidence) plus the primary's own F3 (`d6347cf3`, moved to its own
commit as `8ca3959d`). No merges, no unreported commits, no user commits.
Squashed to **`4e740b72`** — `fix(track): resolve all eight round-1 review
findings for the release funnel` (4 files: `deploy.yml`, `workflow.test.ts`,
`smoke.ts`, `smoke.test.ts`), with `conductor/workflow.md` deliberately
committed separately as `8ca3959d` and the evidence files riding with this
state commit.

### Findings closed

| F | Closed by | Spot-checked how |
|---|---|---|
| F1 | primary | Read the diff: `violations()` now pushes `"no network requests were observed (the request log was empty)"` when `requests.length === 0`, with the comment tying it to `parseConsoleReport`'s existing rule. |
| F2 | primary | Read the diff: `actions/setup-node@v4` / `node-version: 22` added as its own step ahead of every wrangler call, with the `MIN_NODE_VERSION` reasoning in a comment; the version echo lands after `bun install`, so it cannot reach the network. |
| F3 | primary | Applied by the primary (the phase agent's policy denies `conductor/**`). `## Release & Deployment` now records the trigger, the verify gate, the post-upload smoke check, `wrangler.jsonc` as the single declaration site, the two owner secrets, pinned `wrangler`, Node 22, first-deploy project creation, and the explicit statement that no deploy has run yet. |
| F4 | primary | Read `scripts/deploy/workflow.test.ts` — 9 assertions across three describes, each carrying its rationale; `bun test` discovers it with no config change (241 → 242 files). I also ran it independently. |
| F5 | primary | Read the diff: `if (at !== -1 && fromFlag === undefined) fail("--url needs a value")`, with the production-in-CI reasoning in a comment. |
| F6 | primary | Read the diff: the catch-path `gather()` is wrapped, the gathering error is logged, and `found` stays `[]` so the original reason survives; the config read, `targetUrl` and `resolveCli` moved inside `main`'s `try` with a `binary !== null` guard on the session close. |
| F7 | primary | Grepped `plan.md`: exactly one `**Result:** verified` per phase (lines 24, 46, 66, 87) and no `` `bb9a3c89`r `` anywhere. |
| F8 | primary | The `product.md` known-gap bullet is gone and the four survivors are renumbered. **I also corrected a fifth stale claim the agent flagged against itself:** known-gap entry 1 still asserted that nothing committed would catch a `Deploy`-above-`Verify` reorder, which F4 falsifies — it now names `scripts/deploy/workflow.test.ts` as the replacement and records the old gitignored harnesses as dead weight. The head line now reads `8ca3959d` rather than a sha that was already stale. |

### Independent gates

| Command | Result |
|---|---|
| `bun test --check --parallel=4 --timeout 120000` | exit 0 — 2841 pass, 1 skip, 0 fail, 267,411 `expect()` calls, **2842 tests / 242 files** |
| `bun run verify` | exit 0 — typecheck clean, Biome 0 errors (1 pre-existing warning), determinism gate byte-identical |
| `bun run build` | exit 0 — 314 modules, no change to the built asset set |
| `bun run test:phase` (re-run after the integrated.md correction) | exit 0 — 2842 tests / 242 files, 0 fail, 54.36s |

Test arithmetic reconciles: 2830 / 241 at the review → 2842 / 242 here. The
twelve new tests are F1, F5, F6(b), the nine workflow assertions, and the
tightened F2 assertion — all inside the required gate, unlike Phase 2's
gitignored harnesses.

### Honest gaps I am not papering over

- **F6(a) has no committed test.** The guarded `gather()` in the catch path is
  reachable only through a live browser run. Verified by inspection of both
  shapes it handles, and stated as uncovered in the evidence rather than
  claimed.
- **The live halves of AC-1, AC-3 and AC-8 remain credential-pending**, as
  recorded at Phase 4. AC-8 stays *partial*: it rests on Cloudflare Pages
  keeping the last successful deployment live, which no one has drilled.
- **`conductor/workflow.md`'s Emergency Procedures** still opens "no production
  deployment and no backend" — literally true today, deliberately left alone.

**Result:** phase accepted. All eight round-1 findings are resolved at their
root cause with guards where a guard is possible; no assertion was weakened, no
test skipped, no `.only`, no dependency added, nothing under `packages/` or
`apps/` touched.