## Summary

The client now has a deploy path: push to `main` and a GitHub Actions workflow
verifies, builds and uploads `apps/client/dist` to Cloudflare Pages, then runs a
Playwright smoke check against the deployed URL. The deploy is gated on exactly
the same `bun run verify` that protects pull requests, so a drifted GLB or a
failing test cannot reach production. The dev config no longer hardcodes a
machine hostname, and the release documentation has been corrected to match the
code.

**No game behaviour changed.** `SAVE_VERSION` is still 25 and nothing under
`packages/` or `apps/client/src` was touched.

## Track

- **ID:** `20261026-release-funnel`
- **Type:** `chore`
- **Spec:** [`conductor/archive/20261026-release-funnel/spec.md`](conductor/archive/20261026-release-funnel/spec.md)
- **Plan:** [`conductor/archive/20261026-release-funnel/plan.md`](conductor/archive/20261026-release-funnel/plan.md)
- **Review:** [`conductor/archive/20261026-release-funnel/review.md`](conductor/archive/20261026-release-funnel/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Dev host config | No machine hostname in `vite.config.ts`; allowlist from `DEV_ALLOWED_HOSTS`; build output unchanged | verified | `2406c88e` | `.gitignore` gained one line (`!.env.example`) because `.env.*` would have silently ignored the file. `dist` proven byte-identical across all 25 files. |
| 2: Deploy workflow | Workflow deploys `apps/client/dist` on push to `main`, gated on `bun run verify` | verified | `bb9a3c89` | `wrangler pages deploy` will not create a missing Pages project non-interactively, so the workflow creates it. `--branch` is explicit because a detached HEAD would otherwise publish a preview. |
| 3: Live smoke check | Playwright check drafts a starter, asserts the ranch renders, reports zero console errors and zero failed asset requests | verified | `50f89c99` | The live `pages.dev` URL does not exist yet, so this ran against the real `dist` served over HTTP plus a negative run with the bundle removed. |
| 4: Release documentation | README and tech stack describe the deploy accurately | verified | `fd50569c`, `6e2feb47` | Seven stale README claims corrected; `## Deploying` added; server deferral preserved. `conductor/product.md` updated at the docs-sync gate with owner approval. |
| R1: Review fixes | Resolve all eight round-1 findings at root cause | verified | `4e740b72`, `8ca3959d` | Added the committed `scripts/deploy/workflow.test.ts`; Node 22 provisioned before any wrangler call; smoke check fails an empty request log. |
| R2: Review fixes (round 2) | Tighten three assertions and remove a self-contradiction in `workflow.md` | verified | `e5879832`, `54d8b916` | Two Low findings from the round-2 re-review. |

## Requirements

- [x] `FR-1` — A workflow deploys `apps/client/dist` to Cloudflare Pages when `main` moves, using `wrangler pages deploy` authenticated by repository secrets
- [x] `FR-2` — A failing verification prevents the deploy step from running
- [x] `FR-3` — The deployed URL loads with zero failed asset requests, verified in the smoke run's request log *(in-repo proven; live half pending the secrets)*
- [x] `FR-4` — `vite.config.ts` contains no literal hostname; the documented environment variable restores remote-dev behaviour
- [x] `FR-5` — The smoke run drafts a starter, asserts a rendered ranch and a clean console, with output recorded as evidence
- [x] `FR-6` — `README.md` references no save v24, links the URL, and its checklist matches the code
- [x] `FR-7` — `conductor/tech-stack.md` records the hosting target, the deploy mechanism, the secrets and pinned `wrangler` with a dated note
- [x] `FR-8` — A simulated deploy failure leaves the previously deployed build reachable *(reasoning; see the caveat below)*
- [x] `FR-9` — A fresh maintainer can reproduce the one-time secret setup from the README alone
- [x] `NFR-1` — No game behaviour change; `SAVE_VERSION` stays 25
- [x] `NFR-2` — `wrangler` stays a root dev dependency and out of the client bundle
- [x] `NFR-3` — No credential committed, logged or echoed
- [x] `NFR-4` — The deploy cannot bypass the voxel determinism gate
- [x] `NFR-5` — The deployed artifact is static files only
- [x] `NFR-6` — `ci.yml` is unchanged in behaviour
- [x] `NFR-7` — Build output shape is unchanged
- [x] `AC-1` — Pushing to `main` produces a successful deploy run *(in-repo; live half pending)*
- [x] `AC-2` — A failing verification prevents the deploy step from running
- [x] `AC-3` — The live URL loads with zero failed asset requests *(in-repo; live half pending)*
- [x] `AC-4` — `vite.config.ts` contains no literal hostname; the documented variable restores remote dev
- [x] `AC-5` — The smoke run drafts a starter, asserts a rendered ranch and a clean console, recorded as evidence
- [x] `AC-6` — `README.md` contains no `v24`, links the URL, and its checklist matches the code
- [x] `AC-7` — `conductor/tech-stack.md` has a dated deployment note naming Cloudflare Pages, the workflow, the two secrets and `wrangler`
- [x] `AC-8` — A simulated deploy failure leaves the previously deployed build reachable *(reasoning only — see the caveat)*

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun test --check --parallel=4 --timeout 120000` | pass — 2842 pass / 1 skip / 0 fail, 2843 tests across 242 files | `conductor/archive/20261026-release-funnel/verification/integrated.md` |
| unit (full) | `bun test --timeout 120000` | pass — 2829 pass / 1 skip / 0 fail, 2830 tests across 241 files | `verification/integrated.md` |
| static | `bun run check` | pass — voxel 118, sim 151, client 389 files, no type errors | `verification/integrated.md` |
| lint / format | `bunx biome check` | pass — 0 errors, 1 pre-existing warning | `verification/integrated.md` |
| determinism | `bun run gate:determinism` | pass — 27 creature GLBs + 5 props byte-identical | `verification/integrated.md` |
| build | `bun run build` | pass — 314 modules, pre-existing >500 kB advisory only | `verification/integrated.md` |
| visual | `bun scripts/smoke/smoke.ts --url <served dist>` | pass — canvas 1280×720, 130 HUD nodes, 0 console messages, 4 requests / 0 failed | `conductor/archive/20261026-release-funnel/verification/phase-3.md` |
| visual (negative) | same, with the bundle removed | fail as intended — exit 1, naming the 404'd asset | `verification/phase-3.md` |

## Media

The smoke check running against the locally served production build — the
starter drafted and the ranch rendered from the real `apps/client/dist`,
captured at `50f89c99`:

![The smoke check against the locally served production build](https://github.com/user-attachments/assets/71575e10-361d-4299-8c6b-47d6ccd0413e)

## Review

- **Verdict:** `PASS`
- **Rounds:** 3
- **Fixed:** 10 findings (4 Medium, 6 Low)
- **Accepted/deferred:** 0

## Deviations and risks

- **The deploy has never run.** `deploy.yml` is not on `main` yet, the two
  repository secrets are the owner's to create, and `https://apex-league.pages.dev/`
  does not resolve today. The README says so in the first line of `## Deploying`.
  **AC-1, AC-3 and AC-8 keep their live halves partial** and the first push after
  the secrets are added is what settles them. AC-8 is platform reasoning —
  Cloudflare Pages is understood to keep the last successful deployment live
  until a new upload completes — and it has **never been drilled**; do not read
  its checkbox above as a passed test.
- **`wrangler` pinned at exactly `4.152.0`**, not a range, so a local `bun run
  deploy` and CI cannot drift.
- **Node 22 is provisioned explicitly.** The pinned wrangler's bin wrapper
  refuses anything below Node 22 and the runner image defaults to 20; without
  the step, every wrangler call would fail on the first live push.
- **`.gitignore` gained `!.env.example`** — `.env.*` would otherwise have
  silently ignored the file documenting `DEV_ALLOWED_HOSTS`.
- **`scripts/` is linted but not type-checked.** It sits outside every tsconfig
  `include`, matching the pre-existing `packages/voxel/scripts/` precedent.
- **Process note carried out of this track:** `.opencode/agents/conductor-phase.md`
  denies phase agents `edit` on `conductor/**`, so a `Touches` path assigned by
  a brief can be unwritable to the agent meant to write it. This happened three
  times here (`tech-stack.md`, `workflow.md` twice) and the primary applied the
  prepared text each time. Either widen the policy or stop listing those files
  in phase `Touches`.

## Follow-ups

None. `review.issues` is disabled in this project's workflow config, so the
findings were all resolved in-track rather than filed as issues.

## Rollback

```bash
# Squash commit
git revert --no-edit <squash-commit>
```

No migration and no data concerns: nothing under `packages/` changed, the save
schema is untouched at v25, and the client bundle is byte-identical to the
pre-track build. Reverting removes the workflow and the smoke check and leaves
the game exactly as it was.