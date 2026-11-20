## Summary

This track accepts live PvP against the deployed origins and hardens the thin-slice invite flow. It proves a two-client room reaches a natural verdict and a clean forfeit with zero console errors, fixes the container image so the production server actually boots with its `@apex/sim` workspace dependency, and resets the invite panel so a second spar needs no page reload.

## Track

- **ID:** `20261120-live-pvp-production-acceptance`
- **Type:** `bug`
- **Spec:** [`conductor/archive/20261120-live-pvp-production-acceptance/spec.md`](conductor/archive/20261120-live-pvp-production-acceptance/spec.md)
- **Plan:** [`conductor/archive/20261120-live-pvp-production-acceptance/plan.md`](conductor/archive/20261120-live-pvp-production-acceptance/plan.md)
- **Review:** [`conductor/archive/20261120-live-pvp-production-acceptance/review.md`](conductor/archive/20261120-live-pvp-production-acceptance/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1R: Container runtime module resolution | Make the server image boot with `@apex/sim` resolved | verified | `f9c116bb` | Owner-approved deviation: manifest + lockfile + Dockerfile sim-source copy + dockerignore exception; failing-first deploy-contract test. Published via prerequisite PRs #83/#84 after owner redeploy. |
| 1: Deployed two-client proof and forfeit acceptance | Prove room → fight → verdict → return, and disconnect forfeit, in production | verified | `0dd03a7d` | Original 404 then 503 outage recorded as blocked with probe evidence; after owner redeploy at `8c773f54`, rooms `QXGCY3` / `XH8D8K` passed with 0 console errors. |
| 2: Invite panel reset and second-bout proof | Reset invite state on `open()` / `leave()` and prove a second bout without reload | verified | `32f88e59` | Failing-first regression 0p/2f → 2p/0f; production rooms `75EWUX` → `RL3ZH4` using the fixed local bundle served at the real Pages origin. |
| 3: Integrated evidence and documentation truth | Record integrated verification, update product roadmap, mark ADR line superseded | verified | `8fc63e4f` | `product.md:339` dated landed note; archived ADR untouched. |
| R1: Review Fixes | Resolve the single Low documentation-truth finding | verified | `7d6b9bea` | `integrated.md` now records two concurrent throwaway identities per proof (six total across attempts) and the accepted NFR-2 interpretation. |

## Requirements

- [x] `FR-1` — Deployed two-client create/join/ready/snapshots/verdict/return (test: `conductor/archive/20261120-live-pvp-production-acceptance/verification/production-proof.md`)
- [x] `FR-2` — Deployed mid-bout disconnect forfeits immediately with clean return (test: `production-proof.md`, room `XH8D8K`)
- [x] `FR-3` — Invite panel starts fresh after a bout without reload (test: `apps/client/src/live/panel.test.ts`)
- [x] `FR-4` — Integrated evidence committed (`verification/integrated.md`)
- [x] `FR-5` — Product roadmap landed note and ADR supersession recorded (`product.md:339`, `phase-3.md`)
- [x] `FR-6` — Published server image boots with `@apex/sim` resolved (`scripts/deploy/server-image.test.ts`, `phase-1R.md`)
- [x] `NFR-1` — No new runtime dependency; only the approved container-runtime manifest/lockfile/Dockerfile deviation
- [x] `NFR-2` — Throwaway identities only; no credentials, passphrases or real player data in tracked artifacts
- [x] `NFR-3` — Desktop 1440×900 and phone 393×852 proof, 0 console errors, module caps pass
- [x] `NFR-4` — Repository writes confined to client `live/`, tests, Conductor/docs and the approved container-runtime deviation
- [x] `NFR-5` — Repo-external 404/503 outage recorded as blocked with exact probe output, no config workaround
- [x] `NFR-6` — Five configured commands green, hash `0xff6f3d62`
- [x] `AC-1` .. `AC-9` — see `review.md` and `verification/integrated.md`

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun test --timeout 120000` | pass | 4448 pass / 1 skip / 0 fail, 665709 `expect()` calls |
| lint | `bun x biome check` | pass | 1030 files, no fixes applied |
| typecheck | `bun run check` | pass | server 185 / client 549 files, no errors |
| build | `bun run build` | pass | Vite 438 modules; pre-existing >500 kB chunk warning |
| verify | `bun run verify` | pass | hash `0xff6f3d62`, typecheck + Biome + determinism gate included |
| balance | `bun run balance` | pass | 1680 fights, capShare 30.8%, 34 gates ok |
| determinism | `bun run gate:determinism` | pass | 21 species × 3 stages + 5 props byte-identical |
| fuzz | `bun run test:fuzz` | pass | 139 pass / 0 fail, 129015 `expect()` calls |
| panel regression | `bun test apps/client/src/live/panel.test.ts --timeout 120000` | pass | 2 pass / 0 fail after 0 pass / 2 fail before fix |
| deploy contract | `bun test scripts/deploy/server-image.test.ts --timeout 120000` | pass | 13 pass / 0 fail after 10 pass / 3 fail before fix |

Full detail: `conductor/archive/20261120-live-pvp-production-acceptance/verification/integrated.md` (available after archive).

## Media

Production two-client fight at 1440×900, captured at the deployed origin:

![Desktop fight live](https://github.com/user-attachments/assets/6126221e-1a3c-4e22-ac0f-31b92c9e60c6)

Production two-client fight at 393×852:

![Phone fight live](https://github.com/user-attachments/assets/777a57fa-e509-4e1a-b1e2-b07e42ea83c2)

Production mid-bout forfeit verdict (survivor's view):

![Desktop forfeit verdict](https://github.com/user-attachments/assets/2f4839e8-4cc4-47f0-9df8-3fcf1641067b)

## Review

- **Verdict:** `PASS`
- **Rounds:** 2 (initial review + final delta review); 1 fix round (R1)
- **Fixed:** 1 finding (F1, Low documentation count)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- Owner-approved container-runtime fix: `@apex/sim` declared in the server workspace with matching `bun.lock`, Dockerfile copy of `packages/sim/src`, and dockerignore exception. Required to boot the production image; no protocol, sim, save, balance, pacing or CORS change.
- Plan `P2.T2.1` said call `reset()` from `finish()`; the phase brief superseded this to `open()` + `invite.ts::leave()` so the verdict text stays visible until the panel is reopened. Documented in `phase-2.md`.
- Build hash drift: local bundle `index-BR1jNXG_.js` vs deployed `index-90kZBnoO.js`. The Phase 2 second-bout proof served the fixed local bundle at the real Pages origin; a post-merge production spot-check is a follow-up.
- The initial production proof was blocked by a repo-external `/live` 404 and then a 503/no-upstream outage. No deploy, proxy or CORS workaround was attempted; the owner redeployed a healthy image and the proof was repeated.

## Follow-ups

- Post-merge production spot-check of the fixed invite-reset bundle once Cloudflare Pages serves the new build.
- Physical-device-lab pass remains a roadmap item, not a phase gate.

## Rollback

```bash
# Squash commit (this PR)
git revert --no-edit <squash-commit>

# Merge commit (after merge)
git revert --no-edit -m 1 <merge-commit>
```

Prerequisite PRs #83/#84 are already merged on `main`; rolling back this PR does not undo those container-runtime fixes. No save-schema migration or feature flag is involved.
