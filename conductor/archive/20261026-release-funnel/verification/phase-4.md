# Phase 4 — Release documentation

| Field | Value |
|---|---|
| Track | `20261026-release-funnel` (Release Funnel) |
| Phase | 4 — Release documentation |
| Date | 2026-10-26 |
| Branch | `chore/20261026-release-funnel` (checked out; not switched) |
| Phase base | `c4161317` |
| Head (at report time) | `6df99df7` |
| Covers | FR-6, FR-7, FR-9, AC-6, AC-7 |
| Touches | `README.md`, `conductor/tech-stack.md` |

## Result

**verified** — P4.T1 (README) is complete, committed, and green. P4.T2
(`conductor/tech-stack.md`) was blocked inside the phase: the phase agent's
permission policy denies `edit` on `conductor/**` except the track's own
verification directory, so a `Touches` path assigned by the brief was not
writable by that agent. The primary applied the prepared replacement verbatim
and verified it (see "Primary verification" below). No retry and no workaround
was attempted inside the phase, per the brief's permission-denied rule.

## Claims corrected (P4.T1.1)

Every row is a claim the shipped code contradicts — not just a number change.

| # | Location | Old text | New text | What in the code makes the old text false |
|---|---|---|---|---|
| 1 | README `## Release checklist`, "Older saves" | "import a v23 (or older) export and confirm it migrates to **v24** with an empty stable, the active pet's own age intact" | "import a v23 (or older) export and confirm it migrates to **v25** with an empty stable, a valid age on the active pet (a v23 export keeps its own age; an older one takes the world day it already played)" | `SAVE_VERSION = 25` (`packages/sim/src/save/schema.ts:5`) and `migrate()` loops `while (version < SAVE_VERSION)`, so a v23 payload lands on 25, not 24. The "own age intact" clause was only true for the v23→v24 step: `ageDays` arrived at v23 and the migration table records that *older* saves stamp the world day. |
| 2 | README `## Release checklist`, "Narrow device" | "**393×659** emulation … shows no clipped overlays, overlapping chips, or horizontal scroll" | "**393×852 and 852×393** emulation … shows no horizontal page scroll, no panel occluding an interactive element or the scene's action area, and readable text" | UX Principle 8 in `conductor/product-guidelines.md` defines the adopted bar as "fully playable at 393px in both orientations", passing at 393×852 and 852×393 on four named conditions. 393×659 was an older single-portrait measurement and the checklist asserted a bar the project no longer uses. |
| 3 | README `## Roadmap`, row 2 | "…and the prestige 7/9 perks are playable; **extra lineages remain**" | "…the prestige 7/9 perks, **and six reward lineages are playable**; what remains is Phase 3's wider roster and backend" | `REWARD_SPECIES` in `packages/sim/src/species.ts` lists six reward lines with per-species `rewardFromTier`; `branch-catalog.ts` carries two champion branches for all nine species (18 branches). The roster is nine, so "extra lineages remain" was false. |
| 4 | README `## Roadmap`, row 3 | "the first reward line (Electric storm hound, a Silver tier gift egg) is playable end to end …; **the wider roster** and the backend remain" | "the roster is **nine species**: the three starters plus six reward lines the ladder pays out (Silver pays a Storm Hound and a Whistlefern; Gold a Zephyr Falcon and a Coral Claw; Legend a Basalt Tortoise and a Moor Cinder) … the wider roster and the ElysiaJS backend remain" | Same catalog: three starters + six reward lines, two per tier from Silver up. `apps/client/src/species-roster.test.ts` pins the shipped UI copy for those exact pairings, and `lifecycle-integration.test.ts` proves the queue order. Row 3's "first reward line only" claim was false. |
| 5 | README `## Getting started` | "Reaching Silver … grants the league's **Storm Gift once**: a pure electric-hound egg … Hatching it adds a **fourth line** to your collection" | "The cup ladder pays a reward egg **at every tier** it promotes you into, and it pays each tier's lines rather than a choice between them: Silver pays a Storm Hound and a Whistlefern, Gold a Zephyr Falcon and a Coral Claw, the Legend plateau a Basalt Tortoise and a Moor Cinder. Each egg waits in the nursery …" | Same root cause as rows 3–4, in the player-facing prose rather than the table. `claimedTiers`/`pendingRewards` (save v25) generalize the old single `stormGiftClaimed`/`pendingGift`, and `grantLeagueRewards` queues one egg per species of the tier. "Once" and "fourth line" were both false. |
| 6 | README `## Repository layout` | lists `apps/`, `packages/`, `artifacts/`, `conductor/` only | adds `scripts/` ("smoke check for the deployed build, plus a local static server") and `.github/` ("CI, the nightly sweep, and the deploy workflow") | `scripts/smoke/{smoke.ts,smoke.test.ts,probe.js,serve.ts}` exist (Phase 3) and `.github/workflows/` holds `ci.yml`, `nightly.yml`, `deploy.yml`. The layout predated both. |
| 7 | README `## Tech stack` table | no hosting row; the table stopped at "Server *(roadmap, Phase 3)*" | adds `\| Hosting \| Cloudflare Pages — static client, deployed by GitHub Actions (see [Deploying](#deploying)) \|` | The deploy pipeline is now part of the stack (`deploy.yml`, `wrangler.jsonc`, pinned `wrangler`). Leaving hosting out made the table disagree with `tech-stack.md`. |

Claim 5 was found while checking claim 4 — it is the same staleness in a second
place and would have contradicted the corrected roadmap two sections later.

## The `## Deploying` section (P4.T1.2, as written)

Placed after `## Development`, before `## Release checklist`. It carries an
anchor (`#deploying`) that the tech-stack row links to.

```markdown
## Deploying

Apex League is **not live yet**. The deploy is configured and ready, but it
has never run, so the URL below does not resolve today.

- **What deploys, and when.** `.github/workflows/deploy.yml` runs on every push
  to `main`, and can be re-run from the Actions tab with **Run workflow**
  (`workflow_dispatch`). It installs, checks the secrets, runs
  `bun run verify`, builds, creates the Pages project if it does not exist,
  uploads `apps/client/dist`, and then smoke-checks the deployed URL. A newer
  push cancels a run still in flight, so production never lands on a stale
  build.
- **The URL.** `https://apex-league.pages.dev/` — the production address the
  Pages project will be served at. This is the URL the first deploy will
  create, not one that is up now.
- **The gate.** `bun run verify` — types, tests, Biome, and the voxel
  determinism gate — runs before the upload, so a red gate never reaches the
  site. The smoke check runs after it against the deployed URL: it drafts a
  starter, asserts the ranch renders, and fails the run on any console error
  or warning or on a failed asset request.

### One-time setup

The two repository secrets are the only manual step, and only the repository
owner can create them:

1. In Cloudflare, create an API token with the **Pages: Edit** permission (My
   Profile → API Tokens → Create Token → "Cloudflare Pages — Edit") and copy
   it, then copy the account id from the dashboard's overview page.
2. In GitHub, open **Settings → Secrets and variables → Actions → New
   repository secret** and add both:
   - `CLOUDFLARE_API_TOKEN` — the token from step 1.
   - `CLOUDFLARE_ACCOUNT_ID` — the account id from step 1.
3. Push to `main`. The run creates the `apex-league` Pages project if it does
   not exist — no manual project creation is needed — then uploads the build
   and smoke-checks it.

After that, `main` deploys itself and no further setup is required.

### Changing the deploy

- **The project name and the upload directory are declared once**, in
  `wrangler.jsonc`: `"name": "apex-league"` and
  `"pages_build_output_dir": "apps/client/dist"`. The workflow and the smoke
  check read both from there rather than repeating them.
- **Renaming the project is a one-line change** — edit `"name"` in
  `wrangler.jsonc`. The URL follows the name.
- **`wrangler` is pinned** to exactly `4.152.0` in `package.json`, so a new
  wrangler release cannot change deploy behaviour silently. It is a dev
  dependency and never enters the client bundle.
- **The workflow runs `bun run deploy`** (`bunx wrangler pages deploy`), so a
  local deploy and a CI deploy cannot drift.
```

FR-9 check — a fresh maintainer can reproduce the setup from the README alone:
the section names both secret keys, where in Cloudflare each value comes from
(API token with Pages: Edit; account id), the exact GitHub screen to add them
on, and what to do afterwards (push to `main`; no project creation step). It
also answers the two questions that follow a first deploy: how to re-run it
(`workflow_dispatch`) and how to rename the project.

## `conductor/tech-stack.md` — APPLIED (P4.T2)

The phase agent's `edit` on `conductor/tech-stack.md` was rejected with
`Permission denied: edit` — the phase agent's policy denies `conductor/**`
except the track's own verification directory. The primary applied the
replacement verbatim; the text below is what is now committed:

```markdown
## Deployment
- **Client — Cloudflare Pages.** The client is a static bundle
  (`apps/client/dist`), uploaded by `.github/workflows/deploy.yml` on push to
  `main`; the production URL is `https://apex-league.pages.dev/`.
- **Server — deferred.** A single small Bun container (Fly.io or equivalent)
  stays the Phase 3 roadmap item: ElysiaJS endpoints, cloud save sync, trainer
  identity, leaderboards and ghost data have no host yet.
-   *2026-10-26 - Release funnel (track `20261026-release-funnel`): the client
    deploy is configuration now rather than a target. `deploy.yml` runs on push
    to `main` (plus `workflow_dispatch`) and uploads `apps/client/dist` with
    `wrangler pages deploy`, behind the same gate that protects pull requests -
    `bun run verify` (types, tests, Biome, the voxel determinism gate) runs
    before the build and the upload, so a drifted GLB or a failing test cannot
    reach production; a `concurrency` group per ref cancels a superseded run.
    Two repository secrets are required, both the repository owner's to create:
    `CLOUDFLARE_API_TOKEN` (Pages: Edit) and `CLOUDFLARE_ACCOUNT_ID`.
    `wrangler` is a root devDependency pinned to exactly `4.152.0` (no range
    operator), and it stays out of the client bundle - the built asset names
    are unchanged by it. `wrangler.jsonc` is the single declaration site for
    the Pages project name (`apex-league`) and the upload directory
    (`apps/client/dist`); the workflow and the smoke check both read them from
    there instead of repeating them. The first deploy creates the Pages project
    if it does not exist (wrangler will not do it non-interactively), so no
    manual `pages project create` is needed. After the upload,
    `scripts/smoke/smoke.ts` loads the deployed URL in a fresh browser context,
    drafts a starter, asserts the ranch canvas and HUD render, and fails the run
    on any console error/warning or failed asset request. The client deploy is
    configuration-complete but **has not run yet**: `deploy.yml` has never been
    on `main`, and the two secrets are the owner's to add, so
    `https://apex-league.pages.dev/` does not resolve today. The server half
    stays deferred, unchanged.*
```

Why it is shaped that way: the dated bullet is italic and uses the em dash /
hyphen convention of the neighbouring Client entries; the heading drops
"target" because the client half is no longer a target; the server bullet keeps
the deferral line the brief requires; AC-7's four names (Cloudflare Pages, the
workflow, the two secrets, `wrangler`) each appear explicitly.

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| phase verification | `bun test --check --parallel=4 --timeout 120000` | 0 | 2829 pass, 1 skip, 0 fail, 267382 expect() calls; 2830 tests across 241 files in 33.82 s |
| static + unit + lint + determinism | `bun run verify` | 0 | typecheck clean (voxel 118, sim 151, client 389 files); 2829 pass / 1 skip / 0 fail; `biome check` 646 files with the one pre-existing `noDescendingSpecificity` warning at `apps/client/src/ranch.css:1429`; determinism gate 27 creature GLBs + 5 props byte-identical |
| build | `bun run build` | 0 | vite 8.3.4, 314 modules, `dist/index.html` 2.13 kB, `dist/assets/index-DdmaZZpS.css` 66.67 kB, `dist/assets/index-CI37K-Je.js` 916.63 kB — identical asset names and sizes to Phases 1–3 |

A docs-only change cannot move any of these; they were run anyway as the brief
requires, and the identical asset hashes confirm nothing under `packages/` or
the client runtime moved.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-6 | `README.md` contains no reference to save v24, links the live URL, and its checklist items match what the code actually does | `grep` over the committed README: no `v24` occurrence; `https://apex-league.pages.dev/` present in `## Deploying`; the "Older saves" item now says v25 with the age rule from the migration table; the "Narrow device" item now states UX Principle 8's 393×852 / 852×393 bar; the roadmap rows match `REWARD_SPECIES` | pass |
| AC-7 | `conductor/tech-stack.md` has a dated deployment note naming Cloudflare Pages, the workflow, the two secrets, and `wrangler` | Not written — the file is denied to this agent (`Permission denied: edit`). Text ready in the section above | blocked |

FR status: FR-6 pass (README describes the deployment accurately, states save
v25, links the URL without claiming it is live). FR-9 pass (one-time setup
reproducible from the README alone). FR-7 blocked with the exact text prepared.

## How the "no claim the code contradicts" bar was satisfied

Checked, and each corrected above: `SAVE_VERSION` and the migration table
(v25; the v23→v24 age rule vs. older saves), `REWARD_SPECIES` +
`branch-catalog.ts` + `lifecycle-integration.test.ts` + `species-roster.test.ts`
(nine species, two reward lines per tier, all with two champion forms),
`conductor/product-guidelines.md` UX Principle 8 (393×852 / 852×393), the
on-disk tree (`scripts/`, `.github/`), and the Phase 2/3 evidence for the deploy
pipeline (gate order, secrets, pinned `wrangler`, `wrangler.jsonc` as the single
declaration site, the smoke check).

Deliberately **not** claimed, and why:

- Not "live", "up", "deployed", or "serving a build" — `deploy.yml` has never
  been on `main` (`git rev-parse main` is still `02ff20c9`, before this track's
  first change) and `https://apex-league.pages.dev/` does not resolve
  (`getaddrinfo ENOTFOUND`, recorded in Phase 3).
- Not that the smoke check "passes against production" — it was proven against
  the real built artifact served over local HTTP plus a deliberate negative
  case (Phase 3). Its first live run is the first deploy.
- Not that the release checklist has been walked against a deployed build — it
  remains unchecked, which is honest: nobody has walked it against production
  because there is no production yet.
- The URL is stated as *the address the first deploy will create*, which is
  what `wrangler.jsonc`'s `"name": "apex-league"` actually determines.

## Deviations

None. Both files touched are inside the phase's `Touches`. `README.md` was
modified by the phase agent; `conductor/tech-stack.md` was modified by the
primary after the phase agent's `edit` on it was denied (the policy carve-out
covers only `conductor/tracks/*/verification/**`). The replacement was applied
verbatim from the section above.

## Notes

1. **Blocker detail for the primary.** `edit` on `conductor/tech-stack.md` is
   rejected by the phase agent's permission policy
   (`.opencode/agents/conductor-phase.md` lines 9–14 deny `conductor/**` and
   `**/conductor/**`, with an allow-list carve-out only for
   `conductor/tracks/*/verification/**` and `.conductor/evidence/**`). Expected
   result: the dated note in the section above replaces lines 650-653. Either
   apply it as the primary, or widen the policy for `conductor/tech-stack.md`
   and re-run P4.T2. Note that the same policy is why this evidence file
   (allowed) could be written while `tech-stack.md` (not allowed) could not.
2. **`conductor/product.md` is stale and was not touched** (Conductor state,
   docs-sync gate, user approval). Its Phase 3 section still reads "the
   remaining five types and the wider roster are still open" and stops at the
   Storm Gift, while all six reward lines ship. Suggested wording for the
   docs-sync gate: replace *"*(Started 2026-10-21: the first reward line — the
   Electric storm hound — is granted once at Silver … The remaining five types
   and the wider roster are still open.)*"* with *"*(Started 2026-10-21; landed
   2026-10-22..26: six reward lines now ship — Silver pays a Storm Hound and a
   Whistlefern, Gold a Zephyr Falcon and a Coral Claw, the Legend plateau a
   Basalt Tortoise and a Moor Cinder — taking the roster to nine species across
   all six types, each hatching into the stable-backed collection. Still open:
   the roster's climb toward 20–40 species.)*"*
3. `docs/save-schema.md` was not edited: the schema is unchanged and already
   documents v25. The README's v25 correction brings the checklist into line
   with it.
4. `.github/workflows/deploy.yml` already points readers at
   `README, "Deploying"` for the one-time setup (comment near line 45); the new
   section is now the target that comment names.
5. `biome check` does not lint Markdown, so this phase could not have moved the
   gate; the one warning it reports (`noDescendingSpecificity` in
   `apps/client/src/ranch.css:1429`) is pre-existing and untouched here.

## Primary verification

Date: 2026-10-26
By: Conductor primary, independent of the subagent report.

**Squash guard.** `git log c4161317..HEAD` = exactly the 2 reported commits
(`6df99df7` docs(readme); `1904b307` docs(conductor) evidence), both linear
with a single parent — no merges, no unreported commits. The primary's own
`conductor/tech-stack.md` edit is a separate commit below, recorded as the
unblock of P4.T2 rather than folded into the squash.

**P4.T2 applied by the primary.** The phase agent's `edit` on
`conductor/tech-stack.md` was denied by its permission policy
(`.opencode/agents/conductor-phase.md` denies `conductor/**` except
`conductor/tracks/*/verification/**`). The replacement was prepared verbatim in
the evidence above; I applied it exactly as prepared — no re-wording — and
verified:

- The `## Deployment (target)` heading and its two placeholder bullets are
  gone, replaced by `## Deployment` with the Client/Server bullets plus the
  dated 2026-10-26 entry.
- **AC-7's four required names all present** (checked by literal search over
  the section): `Cloudflare Pages`, `deploy.yml`, `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`, `wrangler`, and the pin `4.152.0`.
- The **server deferral is preserved**, as the brief required — the Server
  bullet still records ElysiaJS, cloud saves, trainer identity, leaderboards
  and ghost data as having no host yet.
- The note states plainly that the client deploy "is configuration-complete but
  **has not run yet**" and that the URL "does not resolve today". No claim that
  a deploy succeeded.
- The dated bullet matches the neighbouring Client entries' italic style.

**Independent claim-by-claim check of the README corrections** (the point of
FR-6 is that no statement in the README is falsified by the code, so I checked
each against the source rather than accepting the table):

| Claim | Verified against |
| --- | --- |
| v24 → v25 | `SAVE_VERSION = 25` at `packages/sim/src/save/schema.ts:5`; `migrate()` walks `while (version < SAVE_VERSION)`, so a v23 payload lands on 25. A grep for `v24` across `README.md` now returns **0 hits**. |
| The age clause | Correct and more precise than the original. `migrations/v22.ts` (v22→v23) stamps the **world day** onto the active creature because a v22 payload has no `ageDays`; `migrations/v23.ts` (v23→v24) forwards the creature untouched, so a v23 export **keeps its own age**. The new text says exactly that, where the old text claimed "own age intact" for v23 *and older* — which was false for older saves. |
| The tier pairings | Verified against `packages/sim/src/species.ts`: `electric_hound` (Storm Hound, silver), `fernstag` (Whistlefern, silver), `wind_falcon` (Zephyr Falcon, gold), `reefclaw` (Coral Claw, gold), `earth_tortoise` (Basalt Tortoise, legend), `cindermoor` (Moor Cinder, legend). Every name and every tier pairing in the README matches the catalog. |
| 393×852 / 852×393 | Matches UX Principle 8 in `conductor/product-guidelines.md` verbatim, including the four pass conditions (no horizontal page scroll; no panel occluding an interactive element or the scene's action area; readable text; clean console). The old 393×659 was a single-portrait measurement asserting a bar the project no longer uses. |
| `scripts/` and `.github/` in the layout | Both exist: `scripts/smoke/{smoke.ts,smoke.test.ts,probe.js,serve.ts}` and `.github/workflows/{ci.yml,nightly.yml,deploy.yml}`. |
| The Hosting row | `deploy.yml` + `wrangler.jsonc` + pinned `wrangler` are all real and committed. |

**The honesty bar — what I checked and what I deliberately did not claim.**
The README's `## Deploying` section opens with "Apex League is **not live yet**.
The deploy is configured and ready, but it has never run, so the URL below does
not resolve today." and describes the URL as "the production address the Pages
project will be served at… the URL the first deploy will create, not one that is
up now." I grepped the README for `pages.dev` — one hit, at line 159, inside
that qualified description. There is no sentence anywhere claiming a live site,
a smoke check passing against production, or a walked release checklist: the
checklist items remain `- [ ]` unchecked, which is the honest state given there
is no production to walk them against.

**Independent gates.**

| Gate | Result |
| --- | --- |
| `bun run test:phase` | exit 0 — 2829 pass, 1 skip, 0 fail, 267,382 expect() calls, 2830 tests across 241 files, 33.53s |
| `bun run verify` | exit 0 — typecheck clean, Biome clean, determinism gate OK (27 creature GLBs + 5 props byte-identical) |
| `bun run build` | exit 0 — pre-existing >500 kB chunk advisory only |

The docs-only change moved nothing: the build's asset names and sizes are
identical to Phases 1–3, and `SAVE_VERSION` is still 25.

**AC status as accepted.**

| AC | Primary reading |
| --- | --- |
| AC-6 | **Pass.** No `v24` anywhere in the README; the URL is linked and correctly qualified; the checklist's save-version and device-bar items now match what the code does; the two other stale claims the subagent found while in there (the Getting-started "Storm Gift once / fourth line" prose and the roadmap rows) are corrected too, each with the code that falsifies it recorded in the evidence table. |
| AC-7 | **Pass.** The dated note names Cloudflare Pages, the workflow, both secrets, and `wrangler` (with its exact pin), and keeps the server deferral. |

**One item deliberately left for the docs-sync gate.** `conductor/product.md`'s
Phase 3 section is stale — it still says the Storm Gift is the first reward
line and that "the remaining five types and the wider roster are still open",
while six reward lines ship. The product document is Conductor state, updated
at the docs-sync gate with explicit user approval, not in a phase; the exact
suggested wording is recorded in the evidence notes for the primary to apply at
that gate.

**Result:** phase accepted. The README and the tech stack now describe the
deployment accurately, and the one claim that could have misled a reader — that
a live site exists — is explicitly disclaimed.
