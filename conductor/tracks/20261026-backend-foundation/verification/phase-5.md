# Phase 5 — Container, image pipeline & Coolify

| Field | Value |
| --- | --- |
| Track | `20261026-backend-foundation` |
| Phase | 5 of 5 — Container, image pipeline & Coolify |
| Date | 2026-10-26 |
| Branch | `feat/20261026-backend-foundation` |
| Base | `940fcb37` |
| Head | `cdc93fd0` |
| Covers | FR-10, NFR-3, NFR-7, NFR-8, AC-9, AC-10 |
| Result | **verified** — cleared by the primary: the image was built and run locally (uid 1000, `/health` 200, preflight 204, foreign and lookalike origins refused) and `conductor/tech-stack.md` was applied verbatim. See [Primary verification](#primary-verification). |

## What was built

### CORS (the gap Phase 4 hit)

`apps/server/src/cors.ts`, ~100 lines including comments, no new dependency.

`ALLOWED_ORIGIN` is the single configured origin. `configuredOrigin()` trims and
drops trailing slashes (a browser never sends one, so a value pasted from the
address bar would otherwise never match), and returns `null` for unset, blank,
`/` and `*`. A configured `*` is refused rather than honoured: reading it as
"allow everything" would widen the API to every page on the internet, and the
honest reading of the misconfiguration is "allow no browser origin".

`corsHeaders(configured, requestOrigin)` compares **exactly** and echoes the
configured origin back with `Vary: Origin`. `preflightHeaders()` adds
`Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS`,
`Access-Control-Allow-Headers: content-type, x-trainer-passphrase` and
`Access-Control-Max-Age: 600`. Neither sets
`Access-Control-Allow-Credentials` — the client authenticates with a header, not
a cookie, so credentials mode buys nothing and would only widen a mistake.

The Elysia plugin uses `onRequest`, which runs before routing. That is what puts
the headers on error responses too: a 404 without them is indistinguishable from
a network failure in the browser, and the client's "the cloud is behind" status
would hide a real bug behind a CORS block. `OPTIONS` is answered 204 from the
same hook; a foreign preflight falls through to the router's unadorned 404.

`apps/server/src/app.ts` gained `allowedOrigin?: string` on `AppOptions` and
`.use(cors({ allowedOrigin }))` as the first plugin. `apps/server/src/main.ts`
passes `process.env.ALLOWED_ORIGIN` and now logs the effective origin, because a
silent default deny is the one failure mode a browser reports as "network
error" — the boot line is what a Coolify log shows.

### The image

`apps/server/Dockerfile` — two stages on `oven/bun:1.4.4` (pinned, never
`:latest`).

- **No compile stage, deliberately.** `main.ts` is executed by Bun; nothing
  emits JavaScript, so a build stage would have nothing to hand over. Stated in
  a comment rather than inventing a `tsc` step.
- **Context is the repository root.** Bun's isolated linker installs `elysia`
  and `drizzle-orm` into `apps/server/node_modules`, and `bun.lock` is at the
  root, so the deps stage copies every workspace manifest and runs
  `bun install --frozen-lockfile --production` once.
- **`apps/server/Dockerfile.dockerignore`** — Docker reads the
  `<Dockerfile>.dockerignore` variant, which is what lets the context be the
  root while the file lives beside the Dockerfile. Client and package sources
  are excluded; their manifests are kept.
- **Non-root.** `USER bun` (uid 1000). `/data` is `mkdir -p`'d and
  `chown bun:bun`'d before the switch, so a **named** volume seeded from the
  image is writable at boot. A **bind** mount inherits nothing and must be
  `chown -R 1000:1000`'d first; otherwise `openDatabase` throws and the
  container dies. Both the Dockerfile comment and the README say this.

### The pipeline

`.github/workflows/server-image.yml` — `permissions: contents: read` +
`packages: write`, `concurrency` per ref with `cancel-in-progress`, checkout,
`oven-sh/setup-bun@v2` pinned to `1.4.4`, Bun cache, `--frozen-lockfile`, then
`bun run verify` **before** the build. Pushes
`ghcr.io/${{ github.repository_owner }}/apex-league-server:${{ github.sha }}`,
plus `latest` on `main`. The token reaches the shell through `env:`
(`GHCR_TOKEN`) and `--password-stdin`; no `run:` body interpolates a secret.

`scripts/deploy/server-image.test.ts` — 10 tests pinning the gate order, the
secret hygiene (with positive assertions so it cannot pass vacuously), the
`packages: write` permission, the SHA tag, the four-workflow Bun agreement, the
`oven/bun:<pinned>` base, `USER bun`, `ENV DATABASE_PATH`, and that the `chown`
precedes `USER bun`.

### Docs

`README.md` gained "The API container (Coolify)" — the SHA tag to pin, the port
and `/health` probe, both environment variables with `ALLOWED_ORIGIN`'s default
deny spelled out, and both volume strategies. The tech-stack table row and the
repository layout block were updated to match.

## Commands

| # | Command | Result |
| --- | --- | --- |
| 1 | `bun test --check --parallel=4 --timeout 120000 apps/server/src/cors.test.ts` (red) | exit 1 — see below |
| 2 | same, after `cors.ts` existed | exit 1 — `Argument of type 'null' is not assignable to parameter of type 'string \| undefined'` ×3 |
| 3 | same, after widening the parameter types | **16 pass, 0 fail**, 51 `expect()` calls |
| 4 | `bun test --check --parallel=4 --timeout 120000 apps/server` | 112 pass, 0 fail, 316 expect() calls, 14 files |
| 5 | `bun test ... scripts/deploy` | 23 pass, 0 fail |
| 6 | `bun test ... scripts/deploy/server-image.test.ts` (order inverted by mistake) | exit 1 — `Expected: < 1763 / Received: 1871` |
| 7 | `bun run verify` (before formatting) | exit 1 — 3 biome errors (see below) |
| 8 | `bunx biome check --write` on the five touched files | 5 checked, 2 fixed |
| 9 | `bun test --check --parallel=4 --timeout 120000` | **3037 pass, 1 skip, 0 fail**, 267969 expect() calls, 265 files, 40.62s |
| 10 | `bun run verify` | **exit 0** — typecheck 4 workspaces, 3037 pass, biome clean (1 pre-existing `noDescendingSpecificity` warning in `apps/client/src/ranch.css`), determinism gate OK |
| 11 | `docker build -f apps/server/Dockerfile -t apex-league-server .` | **not run — permission denied** |

### Red run 1 (verbatim)

```
bun test v1.4.4 (38afee6c8) 4x PARALLEL
<error file="apps/server/src/cors.test.ts" line="10" column="8" code="TS2307">
Cannot find module './cors' or its corresponding type declarations.
<source>
 7 |   configuredOrigin,
 8 |   corsHeaders,
 9 |   preflightHeaders,
10 | } from "./cors"
            ^^^^^^^^
11 | import { openDatabase } from "./db"
12 | import { PASSPHRASE_HEADER } from "./saves/routes"
</source></error>
<error file="apps/server/src/cors.test.ts" line="24" column="52" code="TS2353">
Object literal may only specify known properties, and 'allowedOrigin' does not exist in type 'AppOptions'.
</error>
<error file="apps/server/src/cors.test.ts" line="115" column="58" code="TS7006">
Parameter 'name' implicitly has an 'any' type.
</error>
Found 3 errors in 1 file, checked 13 files [97.37ms]

Exited with code 1
```

### The ordering failure (verbatim, #6)

```
scripts\deploy\server-image.test.ts:
65 |     const build = workflow.indexOf("docker build")
70 |     expect(verify).toBeLessThan(build)
                        ^
error: expect(received).toBeLessThan(expected)

Expected: < 1763
Received: 1871

      at <anonymous> (D:\Projects\battle-pets\scripts\deploy\server-image.test.ts:70:20)
(fail) the published image is gated > verification runs before the build and before either push [0.39ms]

 9 pass
 1 fail
Ran 10 tests across 1 file. [56.00ms]

Exited with code 1
```

The test caught a real inversion: an edit had put the build step above the
verify step. That is exactly the failure AC-10's gate exists to prevent, and the
test refused it.

### Biome failures (verbatim, #7, abridged)

```
scripts\deploy\server-image.test.ts:87:48 lint/suspicious/noTemplateCurlyInString
  ! Unexpected template string placeholder.
  > 87 │     expect(workflow).toContain("--tag \"$IMAGE:${{ github.sha }}\"")

apps\server\src\cors.ts format
  × Formatter would have printed the following content:
     41     │ - export·function·configuredOrigin(raw:·string·|·null·|·undefined):·string·|·null·{

apps\server\src\cors.test.ts format
  × Formatter would have printed the following content: (3 hunks)

Found 3 errors.
error: script "verify" exited with code 1
```

The `noTemplateCurlyInString` hits were fixed by matching those two lines as
regexes instead of string literals, so the workflow's `${{ }}` text stays
literal and the rule is satisfied rather than suppressed.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| FR-10 — container reads database path and allowed origin from the environment | **Met** | `ENV DATABASE_PATH=/data/apex.sqlite` in the Dockerfile, overridable; `main.ts` passes `process.env.ALLOWED_ORIGIN`; boot log names both. Unit-tested via `configuredOrigin`. |
| NFR-3 — no secret committed, logged or echoed | **Met** | Token passed via `env:` + `--password-stdin`; test asserts no `run:` body matches `secrets.` with positive assertions that the secret and `--password-stdin` are present. No passphrase is logged anywhere; the boot line prints the origin and path only. |
| NFR-7 — clean-checkout build, non-root | **Partly met** | Dockerfile is `USER bun`, base `oven/bun:1.4.4`, and the test pins both. The clean-checkout build itself is **unverified** — Docker is denied here. |
| NFR-8 — database on a persistent volume | **Documented, unverified** | `/data` created and chowned to uid 1000; README documents the named-volume and bind-mount strategies. The actual redeploy-survives-saves behaviour needs a running Coolify app. |
| AC-9 — `docker build` succeeds, container serves the API, reads path from env | **Unverified** | Blocked: `docker` permission denied. Every static property the build depends on is pinned by `server-image.test.ts`. |
| AC-10 — CI builds and pushes a SHA-tagged image to GHCR | **Met (as configuration)** | `server-image.yml`: verify → build → login → push `:<sha>`, `packages: write`, pinned Bun. Never executed on a runner; the committed test pins the contract. |

## The three CORS cases, as asserted

1. **A matching origin is echoed.** `corsHeaders(CLIENT, CLIENT)` equals
   exactly `{ "access-control-allow-origin": CLIENT, vary: "Origin" }` — a
   wildcard is not a value the function can produce. Through the app:
   `GET /health` with `Origin: https://apex-league.pages.dev` returns 200 with
   `access-control-allow-origin` equal to that origin, `vary` containing
   `Origin`, and `access-control-allow-credentials` null.
2. **A non-matching origin gets nothing.** `corsHeaders(CLIENT, CLIENT +
   ".evil.test")`, `https://evil.test`, the same host with `http:`, and the
   same host with a trailing slash all return `{}`. Through the app the header
   is null. A preflight from `https://evil.test` is denied too.
3. **Unset `ALLOWED_ORIGIN` denies everything.** For `undefined`, `""` and
   `"  "`, `GET /health` with a matching `Origin` returns **no**
   `access-control-allow-origin` and **no** `vary`. `corsHeaders("*", CLIENT)`
   and `corsHeaders(CLIENT, "*")` also return `{}`.

Plus: a 404 carries the header (`GET /trainers/trn_missing` → 404 with
`access-control-allow-origin`), and a preflight returns 204 with the methods,
the passphrase header and a positive max-age.

## Blockers

Both were cleared by the primary; kept as written so the record shows what the phase could and could not reach.

1. **Docker is not permitted in this sandbox.** Both
   `docker version --format '{{.Server.Version}}'; docker buildx version` and
   `docker --version` returned
   `{"error":{"type":"permission.rejected","message":"Permission denied: shell"}}`,
   as did a background `bun apps/server/src/main.ts` with `PORT`/`DATABASE_PATH`/
   `ALLOWED_ORIGIN` set. Per the brief's rule, a denied action is not retried or
   worked around, so **P5.T1.2 is not done**: there is no verbatim `docker
   build` output, no `curl` from a running container, no measured image size and
   no confirmed container uid. **Resolved by the primary — see
   [Primary verification](#primary-verification).**
2. **`conductor/tech-stack.md` is not writable.** The edit returned
   `{"error":{"type":"permission.rejected","message":"Permission denied: edit"}}`.
   **P5.T3.2 is therefore not done**; the dated note is drafted in full below and
   needs only to be applied by the primary. Note this also leaves the existing
   "Server — deferred" wording in the Deployment section untouched, which
   contradicts what now exists. **Applied by the primary, along with that
   Deployment bullet.**

### The drafted tech-stack note (to apply under `## Server`)

> *2026-10-26 — Container and Coolify (track `20261026-backend-foundation`):
> the API ships as a two-stage image, `apps/server/Dockerfile`, built from the
> repository root because Bun's isolated linker installs `elysia` and
> `drizzle-orm` into `apps/server/node_modules` and `bun install
> --frozen-lockfile` needs the root `bun.lock`. There is deliberately no compile
> stage — `main.ts` is executed by Bun, so nothing emits JavaScript. The runtime
> stage is `oven/bun:1.4.4` (pinned like the workflows, never `latest`), drops
> to the base image's `bun` user (uid 1000), and takes `DATABASE_PATH` (default
> `/data/apex.sqlite`), `PORT` and `ALLOWED_ORIGIN` from the environment. `/data`
> is created and chowned to uid 1000 in the image, so a named volume seeded from
> it is writable at boot; a host bind mount must be `chown`ed to 1000 first, or
> `openDatabase` throws and the container dies rather than serving saves it
> cannot persist. CORS is hand-written (~30 lines, `apps/server/src/cors.ts`)
> rather than `@elysiajs/cors`: exactly one configured origin, compared exactly
> and echoed with `Vary: Origin`, no credentials mode, and **no
> `ALLOWED_ORIGIN` means no CORS headers at all** — never `*`. `OPTIONS` is
> answered 204 with `content-type` and `x-trainer-passphrase` allowed, because a
> pull sends its passphrase as a header and would otherwise be blocked before it
> was sent. `.github/workflows/server-image.yml` runs `bun run verify` before the
> build and pushes `ghcr.io/<owner>/apex-league-server:<sha>` (plus `latest` on
> `main`) with `packages: write` and the built-in token passed through `env:`,
> never interpolated into a `run:` body. Coolify pulls the SHA tag and owns the
> deploy cadence. `scripts/deploy/server-image.test.ts` pins all of that. The
> image has not been built on this machine — Docker is unavailable in the
> phase-5 sandbox — so the container run is configuration-complete, not
> observed.*

## Deviations

| File | Reason |
| --- | --- |
| `apps/server/src/main.ts` | Not in `Touches`, but it is the only place `process.env` is read. `createApp` cannot receive `ALLOWED_ORIGIN` without it, so FR-10 is unreachable otherwise. Also logs the effective origin. |
| `apps/server/Dockerfile.dockerignore` | The brief names `apps/server/.dockerignore`, but Docker only applies that file when the Dockerfile is at the context root. Since the context must be the repository root (lockfile + hoisted deps), the working filename is `<Dockerfile>.dockerignore`. Same content and intent, correct filename. |
| `scripts/deploy/server-image.test.ts` | P5.T2.2 did not name a path; placed beside `workflow.test.ts` to reuse its text-scanning precedent. Discovered by a bare `bun test`. |
| `README.md` tech-stack row, repository layout | Both said the server was a roadmap item and omitted `apps/server`. Left unchanged they would contradict the section added below them. |

## Notes

- **The CORS block Phase 4 saw is now fixable from configuration alone.** With
  `ALLOWED_ORIGIN` unset the server still refuses every browser origin, by
  design. The Coolify app must set it to the Pages origin or the client stays
  broken in exactly the way the browser run recorded.
- **`--production` in the deps stage** keeps the test, lint, type-check and
  deploy tooling out of the image. Nothing at runtime imports them.
- **`main.ts` still has no try/catch**, deliberately. An unwritable volume kills
  the process naming the path; that is the loud failure the spec's edge case
  asks for, and it is not softened.
- **Not touched:** `ci.yml`, `nightly.yml`, `deploy.yml`, `packages/**`,
  `apps/client/**`, `SAVE_VERSION` (still 25), `plan.md`, `spec.md`,
  `metadata.json`, `tracks.md`, `conductor/index.md`, `review.md`, `pr.md`.
- **No new dependencies.** `package.json` and `bun.lock` are unchanged; the
  workflow test reads the YAML as text precisely to avoid adding a parser.
- `bun run verify` exit 0 and the determinism gate is unchanged (27 species
  digests byte-identical, 5 props).

## Primary verification

Date 2026-10-26. By the Conductor primary, independent of the phase agent's
report. Tree clean at `940fcb37..c063988e` before this section was written.

### Squash guard

`git log --oneline 940fcb37..HEAD` returned exactly the six commits the report
listed — `bd31ef4f` (CORS), `3fc68be2` (image), `d8ebfdd9` (pipeline),
`b4930b41` (README), `cdc93fd0` (biome formatting), `c063988e` (evidence) — with
no merges, no unreported commits and no commits of mine. `git diff --name-only`
returned ten paths: `.github/workflows/server-image.yml`, `README.md`,
`apps/server/Dockerfile`, `apps/server/Dockerfile.dockerignore`,
`apps/server/src/{app,cors,cors.test,main}.ts`,
`scripts/deploy/server-image.test.ts`, and the evidence file. All inside
Touches except the four recorded deviations.

`git diff --stat 940fcb37..HEAD -- packages apps/client .github/workflows/ci.yml
.github/workflows/nightly.yml .github/workflows/deploy.yml` was **empty**:
`packages/`, `apps/client/`, and the three existing workflows are untouched, so
`SAVE_VERSION` is still 25 and the determinism surface is unchanged.

### Both blockers, cleared

The phase agent was denied `docker` and denied `edit` on
`conductor/tech-stack.md`. Both are things the primary can do, and neither was
worked around by the agent — it stopped and reported, which is the correct
behaviour.

**Docker.** Docker 28.3.0 was available to the primary. Ran verbatim:

```
docker build -f apps/server/Dockerfile -t apex-league-server:test .
```

It completed: all 23 steps, `exporting to image ... naming to
docker.io/library/apex-league-server:test done`. Image size **306 MB**. Then:

```
docker run -d --name apex-test -p 3000:3000 \
  -e ALLOWED_ORIGIN=https://apex-league.pages.dev \
  -v apex-data:/data apex-league-server:test
```

Boot log, verbatim:

```
apex server listening on :3000, database /data/apex.sqlite, allowed origin https://apex-league.pages.dev
```

`docker exec apex-test id` → `uid=1000(bun) gid=1000(bun) groups=1000(bun)` —
non-root confirmed, NFR-7.

`curl -i localhost:3000/health` →

```
HTTP/1.1 200 OK
Content-Type: application/json;charset=utf-8
Content-Length: 47

{"status":"ok","schemaVersion":"0001_init.sql"}
```

Preflight from the configured origin →

```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://apex-league.pages.dev
Vary: Origin
Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS
Access-Control-Allow-Headers: content-type, x-trainer-passphrase
Access-Control-Max-Age: 600
```

Preflight from `https://evil.test` → `404`, no access-control headers. Preflight
from `https://apex-league.pages.dev.evil.test` → `404`, no access-control
headers. The lookalike is the one a substring check would have let through, so
this is the exact-match guard proven against a real server rather than only
against its unit test.

Full round trip through the container: `POST /trainers` → `{"id":"trn_thjh…"}`;
`PUT /trainers/:id` → `{"id":"trn_thjh…","name":"Rin","hasPassphrase":true}`;
`PUT /trainers/:id/save` → `{"stored":true,"winner":"incoming"}`;
`GET /trainers/:id/save` → the payload and `savedAt` verbatim;
`GET` with a wrong passphrase → `401`. And `docker exec apex-test ls -l /data`
showed `apex.sqlite` owned by `bun bun`, so the named volume seeded from the
image's `/data` is writable at uid 1000 — the trap the Dockerfile comments
about, confirmed rather than assumed.

Container and volume removed afterwards; nothing left running.

**`conductor/tech-stack.md`.** The drafted note was applied verbatim under
`## Server`, plus one correction the agent flagged but could not make: the
`## Deployment` section still carried a "**Server — deferred.** … no host yet"
bullet, which the track falsifies. It now records the GHCR image and the
Coolify application. The `## Server` framework line was also narrowed — it
listed leaderboard and ghost endpoints as if they existed; they do not, and the
line now says so.

`README.md` got two further corrections in the same pass, both drift the phase
introduced: the roadmap row for Phase 2 still said "what remains is Phase 3's
wider roster and backend" (the backend is no longer missing), and Phase 3's row
still ended "the ElysiaJS backend remain". Both now name only what is actually
open — the wider roster, leaderboards, ghost data.

### Independent gates

| Layer | Command | Result |
| --- | --- | --- |
| unit (phase gate) | `bun test --check --parallel=4 --timeout 120000` | exit 0 — 3037 pass, 1 skip, 0 fail, 267969 `expect()` calls, 3038 tests / 265 files, 42.60 s |
| static | `bun run verify` | exit 0 — typecheck clean in all four workspaces, Biome clean, determinism gate OK (27 creature GLBs + 5 props byte-identical) |
| build | `bun run build` | exit 0 — 314 modules, pre-existing >500 kB chunk advisory only |
| container | `docker build` + `docker run` + `curl` | exit 0 — see above |

Test arithmetic: 3012/263 → 3038/265. The 26 new tests are the CORS suite and
`scripts/deploy/server-image.test.ts`, both discovered by a bare `bun test`, so
they are inside the required gate rather than beside it. The single skip is the
pre-existing `smoke: not an http(s) URL: file:///tmp/x` fixture.

### Acceptance criteria

| ID | Status | Evidence |
| --- | --- | --- |
| AC-9 | **met** | `docker build` completed; container answered `GET /health` 200 with `schemaVersion 0001_init.sql`; `DATABASE_PATH` and `ALLOWED_ORIGIN` both read from the environment (boot log prints the resolved values); `id` reports uid 1000 |
| AC-10 | **met in repo, pending first run** | `.github/workflows/server-image.yml` gates on `bun run verify` and pushes `:<sha>` to GHCR; ten committed assertions pin it; the workflow has not executed yet, exactly as the spec's assumption allows |
| FR-10 | **met** | image + env-driven database path and allowed origin, both proven live |
| NFR-3 | **met** | the token is passed through `env:` only, never interpolated into a `run:` body; the committed test asserts that positively and negatively so it cannot pass vacuously |
| NFR-7 | **met** | `uid=1000(bun)`, image builds from a clean checkout |
| NFR-8 | **met** | named volume writable by uid 1000 with no manual step; bind-mount requirement documented in both Dockerfile and README |

### One thing this phase proved by accident

The CORS gap was real and the browser was right to refuse. Phase 4 recorded
`No 'Access-Control-Allow-Origin' header is present`; before this phase the
server emitted no CORS headers at all, so the deployed client could never have
reached the API no matter how correct its own code was. With `ALLOWED_ORIGIN`
unset the server still refuses every browser origin — deliberately, because the
alternative is `*` — so the Coolify app must set it. That is a deployment
setting, not a code fix, and it is now the first line of the README's
environment list.

**Result:** phase accepted. Both blockers were real, both were cleared by the
primary, and neither was papered over: the container run is observed output
rather than an expectation, and the tech-stack note is applied rather than
drafted.
