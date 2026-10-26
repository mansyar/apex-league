# Phase 1 verification — Server workspace & schema

| Field | Value |
| --- | --- |
| Track | `20261026-backend-foundation` (ElysiaJS Backend Foundation) |
| Phase | 1 — Server workspace & schema |
| Date | 2026-10-26 |
| Branch | `feat/20261026-backend-foundation` |
| Phase base | `d3eb651b` |
| Head | `cc59a921` (code) + the commit carrying this file |
| Covers | NFR-4, NFR-5, NFR-6 |
| Result | **verified** |

## What was built

`apps/server` is now a fourth workspace under the existing `apps/*` glob, so
`bun run check` picks it up with no change to the root scripts, and `biome check`
lints it with no change to `biome.json`.

| File | Role |
| --- | --- |
| `apps/server/package.json` | `private`, `type: module`, `check: bun check`; runtime deps `elysia` 1.4.30 and `drizzle-orm` 0.45.4 only |
| `apps/server/tsconfig.json` | Extends `../../tsconfig.base.json`, `types: ["bun"]`, `include: ["src"]` — same shape as `packages/sim` |
| `apps/server/migrations/0001_init.sql` | The schema: `trainers`, `saves`, `displaced_saves`. Committed SQL, not generated journals |
| `src/schema.ts` | Drizzle view of those three tables for typed queries |
| `src/migrate.ts` | Runner: applies pending `.sql` files in filename order, one transaction each, recording the filename in `_migrations`; `schemaVersion` returns the highest applied name |
| `src/db.ts` | `openDatabase(path)` — creates and migrates; throws naming the path when the parent directory is missing or is a file |
| `src/env.ts` | `DATABASE_PATH` resolution with a local-development default; blank counts as unset |
| `src/app.ts` | `createApp({ db })` with `GET /health` → `{ status: "ok", schemaVersion }` |
| `src/main.ts` | Boot: open, build, `Bun.serve`. No `try`/`catch`, so an unreachable database kills the process |
| `src/module-size.test.ts` | 12 KB cap guard with a negative control, mirroring `packages/sim/src/module-size.test.ts` |

Design points worth recording:

- **Payloads are opaque.** The server never parses, validates or migrates the
  save body; a save written by a newer client round trips byte for byte
  (asserted in `schema.test.ts`). `saved_at` is the client clock and the
  ordering authority; `received_at` is the server clock, recorded only so clock
  skew is diagnosable later.
- **Idempotence is structural.** Boot always calls `migrate`; the ledger makes
  the second call return `[]`. There is no separate "is this a first boot?"
  branch to get wrong.
- **Failing loudly is the boot contract.** `main.ts` deliberately has no error
  handling: a server that cannot persist saves must not accept requests. The
  subprocess test in `boot.test.ts` is the only test that leaves the process,
  and it never reaches `Bun.serve`, so it binds no port.
- **The SQL and the Drizzle declaration cannot drift silently.** `schema.test.ts`
  compares `PRAGMA table_info` against `getTableColumns` for all three tables.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| TDD red — P1.T2 | `bun test ./apps/server/src/migrate.test.ts ./apps/server/src/schema.test.ts ./apps/server/src/db.test.ts` | 1 | `Cannot find module './migrate'` / `'./db'` — 0 pass, 3 fail, 3 errors (written before the modules existed) |
| TDD red — P1.T1 | `bun run check` (before any `src` file) | 1 | `@apex/server check: TS18003 No inputs were found` — proves the workspace is in the gate, not merely present |
| TDD red — P1.T1 | `bun test ./apps/server/src/env.test.ts` | 1 | `Cannot find module './env'` — 0 pass, 1 fail |
| TDD red — P1.T3 (guard) | `bun test ./apps/server/src/module-size.test.ts` | 0 | Green including the negative control, which is the guard's own red: it asserts `capReport` rejects a fixture one byte over the cap and an oversized `.tsx` in a temp dir. No separate tree-level red was captured for P1.T3 — the tests were authored before `app.ts`/`main.ts` and their first run after the modules existed was green |
| Server suite | `bun test ./apps/server/src` | 0 | 23 pass, 0 fail, 47 `expect()` calls, 7 files |
| Types | `bun run check` | 0 | `@apex/server ✓ No type errors in 13 files`; sim 151, voxel 118, client 389 all still clean |
| Lint | `bunx biome check apps/server` | 0 | 15 files, no findings |
| Full gate | `bun run verify` | 0 | check + 2873 tests + `biome check` (663 files) + determinism gate all green |
| Build | `bun run build` | 0 | 314 modules, `dist/assets/index-CI37K-Je.js` 916.63 kB — identical to the pre-change build |
| **Phase verification** | `bun test --check --parallel=4 --timeout 120000` | **0** | **2872 pass, 1 skip, 0 fail, 267479 `expect()` calls, 249 files, 48.10 s** |

The single skip is pre-existing (`scripts/smoke`). The `bun run verify` run also
reports one pre-existing Biome *warning* (`apps/client/src/ranch.css:1429`
`noDescendingSpecificity`) that predates this phase and is untouched here.

## Acceptance criteria

| Criterion | Proof |
| --- | --- |
| NFR-4 — routes tested against in-memory SQLite, no network, no fixed ports | `app.test.ts` builds the app with `openDatabase(":memory:")` and dispatches via `app.handle(new Request(...))`; `db.test.ts` "opens in-memory without touching the filesystem"; `boot.test.ts` runs the real entry point in a subprocess with an unreachable path, so it dies before `Bun.serve` and binds nothing. The whole 2873-test gate runs with `--parallel=4` and no port conflicts |
| NFR-5 — same 12 KB module cap, guard with negative control | `module-size.test.ts` (5 tests): recursive walk, cap assertion, at-cap/one-byte-over boundary, largest-first ordering, and the negative control that writes an oversized `.tsx` into `mkdtempSync`, asserts the report names it with byte size and overage, then asserts the directory is gone |
| NFR-6 — `verify` and `build` stay green, client bundle unchanged | `bun run verify` exit 0; `bun run build` exit 0; `apps/client/dist` byte-identical before and after the dependency install and after a rebuild (25 files, same SHA-256 — table below) |
| Schema from a committed migration | `migrate.test.ts` "a fresh database gets the committed schema" — `_migrations`, `displaced_saves`, `saves`, `trainers` and `schemaVersion` `0001_init.sql` |
| Migration idempotent | `migrate.test.ts` "running again applies nothing and keeps the data" — second and third calls return `[]`, the inserted trainer survives, ledger holds one row |
| Missing/unwritable DB path fails loudly at boot | `db.test.ts` missing-parent and parent-is-a-file cases both throw naming the path; `boot.test.ts` asserts a non-zero exit code with the path on stderr |
| `GET /health` reports the applied schema version | `app.test.ts` — 200, JSON content type, `{ status: "ok", schemaVersion: "0001_init.sql" }`, stable across calls, leaks no configuration, `/saves` still 404 |

## Module-size guard measurements

`CAP_BYTES = 12288`. Largest module and headroom at the P1.T3 commit:

| Module | Bytes | Headroom |
| --- | --- | --- |
| `src/migrate.ts` | 2550 | 9738 |
| `src/db.ts` | 1615 | 10673 |
| `src/schema.ts` | 1586 | 10702 |
| `src/env.ts` | 884 | 11404 |
| `src/app.ts` | 738 | 11550 |
| `src/main.ts` | 583 | 11705 |

Six non-test modules; none within 9 KB of the cap. The guard's negative control
proves the rule it enforces: a `CAP_BYTES`-sized fixture passes, `CAP_BYTES + 1`
is reported with its exact overage, and an oversized `.tsx` in a temp directory
is caught by the same `capReport` the real assertion calls.

## `apps/client/dist` — before and after P1.T1.2

Captured with a throwaway manifest script (`.conductor/evidence/`, not
committed) over `apps/client/dist`, sorted, SHA-256 per file. Identical for all
three captures: before the dependency install, after `bun install`, and after a
full `bun run build` at the end of the phase.

```
25 files

apps/client/dist/assets/index-CI37K-Je.js          916634  cc2fe8c6d8be2b9df358a47b796268f9760c2f24da56b6bb2f7be057f2978eb5
apps/client/dist/assets/index-DdmaZZpS.css          66671  16dbb6ca27fe12fd3d9b1a20d8e5af9b6f6aaa564eeae773de1f2ea2e417204a
apps/client/dist/audio/CREDITS.md                    2361  7dfb5788a0caa346b745e5796385c823ca16a23de8b2a4593115a541f286e1bf
apps/client/dist/audio/jingles/verdict-0.ogg        39948  1010c9b566d6c090ff03a4aaaf7439e26eb4cc4f20373800d0b7e6a9057b795d
apps/client/dist/audio/jingles/verdict-1.ogg        16796  f396b3bb91cf939b51b64c734db01187d70a59cf74dd83cb9d6746e00552d50e
apps/client/dist/audio/music/arena.ogg             468099  19f37b773f34d093fffede77252b085e03ebb73c79e7a44b8b1f722126c0e1c5
apps/client/dist/audio/music/ranch.ogg             597983  69b19e81e437281e7ee8744bd28c7b4c9de08c2be53e06062860b91c91aaadaa
apps/client/dist/audio/sfx/care-feed.ogg             9319  2b07edafc1f3f49c4813f2b0ae9481c566c1f9962a22d5f5b79da7111e058e56
apps/client/dist/audio/sfx/care-pet.ogg              6941  c977fe249ff42d1c93a552b33abc13a8399df3879fa510475426e5c4bbac1da9
apps/client/dist/audio/sfx/care-play.ogg             6317  be97ec4893a02d6eccfb678daa76c83e34cb2583b834ec2593d2641def739fa4
apps/client/dist/audio/sfx/care-rest.ogg            11787  8a7451193c38bc05483aec25dd193e163a15d44cf7fff04ac7912573231b0201
apps/client/dist/audio/sfx/care-treat.ogg            5732  9a6f16e3c2eff6fe5d017a4755a28306b14555728831cd00d70308e8f9689566
apps/client/dist/audio/sfx/dawn-chime.ogg           14169  33b17a9a9a2397c62b285c52c33a907fdffb476909c99e42dde603f6a7a8b12c
apps/client/dist/audio/sfx/fire-0.ogg               25566  a56d95794cd732d6c2d66ce488c14cf557fe526c282897c9a77675c2bd9b77e6
apps/client/dist/audio/sfx/fire-1.ogg               27440  e5e0b6ccc4d5720c8174a3e5b7cc6f9be3057352a89cbb2e99a00efc6fe5cc11
apps/client/dist/audio/sfx/fire-calm.ogg             7286  72b589eadd41781257ac859e4f4d030222e623390e4a1a83f6d05329a6e026f1
apps/client/dist/audio/sfx/hit-plate-0.ogg          10921  b670d30452983369771081319c268475edaaafe782bf4e8d70bd7eef09d8823c
apps/client/dist/audio/sfx/hit-plate-calm.ogg       10474  6e797cf8a5bfc52d7ed5eb47c227974c1cf2a674954fec5b539cea7d62c7282c
apps/client/dist/audio/sfx/ko-0.ogg                  6110  e07045693e4a2b3d165c424e3dab4c781d9ff8880a386880ac89a51315d7f831
apps/client/dist/audio/sfx/ko-bell.ogg              13915  94b8bb5f2d43ab65e4bcc32b28562416e9bc2c51d9fd4be1e333660ee52f977f
apps/client/dist/audio/sfx/melee-hit-0.ogg           6570  49e7ca88743fca974bb8676ea138b751cfd8f9033b5e7af8736c2a215d6edbc1
apps/client/dist/audio/sfx/melee-hit-1.ogg           8800  486988aa2d6440ffc4c62a0e8ccf3c23673ba84424bd4723378d451b7255eb5c
apps/client/dist/audio/sfx/melee-hit-2.ogg          11617  b33a8f14068aec24ec69ba85e5e87fdc41228975f6a1a3e44a6e7d6fc3d9f8d8
apps/client/dist/audio/sfx/melee-hit-calm.ogg        5351  7d3ba0bb5e60a11b5d3e558c141303dcf494256675fbf753c0d252d2cf0481e3
apps/client/dist/index.html                          2139  6c592f993b1fd7e97c7933cc934a137d77c9f1525e5609e0be66bf6474e23e3e
```

## Deviations

None. Every file touched is inside `apps/server/**` or `bun.lock`, both named in
the phase `Touches`. `package.json` and `tsconfig.base.json` needed no edit —
workspace discovery and the `check` filter already covered the new workspace.

## Notes for the primary agent

- `drizzle-kit` was deliberately not added; the plan specifies committed SQL, so
  a code generator plus its build step would be unused weight.
- `src/main.ts` reads `PORT` (default 3000) but no test sets a real port: the
  boot test passes `PORT=0` and exits before `Bun.serve`. Phase 5 owns the
  container's actual port and healthcheck wiring.
- The `_migrations` ledger is the source of `schemaVersion`; Phase 2 and 3
  should read it through `schemaVersion(db)` rather than querying SQLite
  directly, so a future migration needs no change at the call sites.
- `apps/server/migrations/` sits beside `src/`, not inside it, so the module cap
  measures TypeScript only and the SQL is reviewed as SQL.
- TDD honesty note: red runs were captured for P1.T1 (`TS18003`, missing
  `./env`) and P1.T2 (missing `./migrate`, `./db`). For P1.T3 the tests were
  written first but the first execution after `app.ts`/`main.ts` existed was
  already green, so no tree-level red exists for it; the guard's negative
  control is the in-suite proof that it can fail.

## Primary verification

Date: 2026-10-26. By: Conductor primary, independent of the phase agent's report.

### Squash guard

`git log d3eb651b..HEAD` returned exactly the five commits the report named -
`8224b929`, `e5dae80d`, `ff2a3a3c`, `cc59a921`, `46308b7c` - and
`git rev-list --parents -n 6 HEAD` showed `parents=1` for every one, so the range
is linear with no merge commits, no unreported commits and no user commits. Squash
is safe.

`git diff --name-only d3eb651b..HEAD` returned 18 paths: 17 under `apps/server/`
plus `bun.lock`, and the evidence file. Every path is inside the phase's
`Touches` (`apps/server/**`, `package.json`, `bun.lock`, `tsconfig.base.json`).
`package.json` and `tsconfig.base.json` were touched by neither, which is the
correct outcome: the `apps/*` workspace glob already discovers the new package.

### Fix spot-check (read directly, not taken from the report)

- `migrations/0001_init.sql` defines the three tables the brief specified.
  `saves.trainer_id` is `PRIMARY KEY`, which is how FR-3's "one save per trainer"
  is enforced by the schema rather than by application logic, and
  `displaced_saves.trainer_id` likewise caps FR-6's recoverable loser at one.
  `payload` is `TEXT` with a comment stating the server never parses the client's
  schema - the property that keeps `SAVE_VERSION` at 25.
- `migrate.ts` runs each file inside `db.transaction(...)` together with its
  ledger row, so a failure cannot leave a half-applied schema next to a filename
  claiming the work happened. Idempotence is structural (the ledger), not a
  separate check.
- `db.ts` throws naming the path when the parent directory is missing or is a
  file, and wraps `new Database` and `migrate` failures with their cause.
  `main.ts` deliberately has no `try`/`catch`, so the process dies rather than
  serving a game whose saves go nowhere - the spec's explicit edge case.
- `app.ts` is 738 B: `createApp({ db })` builds the route from an injected
  database, which is what makes every route test port-free.

### Independent gates

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Phase verification | `bun run test:phase` | 0 | 2872 pass, 1 skip, 0 fail, 267479 `expect()` calls, 2873 tests across 249 files, 39.67 s |
| Static + unit + determinism | `bun run verify` | 0 | typecheck clean in all four workspaces, Biome clean, determinism gate byte-identical for all 27 GLBs + 5 props |
| Build | `bun run build` | 0 | 314 modules, pre-existing >500 kB advisory only |

Test arithmetic: the suite was 2850 tests / 242 files before this phase; it is
now 2873 / 249. The 23 new tests are the server suite, all inside the required
gate - unlike the Release Funnel track's gitignored harnesses, these are
committed and discovered by a bare `bun test`.

### NFR-6 proven, not asserted

The client bundle is byte-identical. `apps/client/dist` is 25 files;
`assets/index-CI37K-Je.js` is 916634 B with SHA-256 prefix `CC2FE8C6D8BE` and
`assets/index-DdmaZZpS.css` is 66671 B with `16DBB6CA27FE` - the same hashes the
Release Funnel track recorded before any server code existed. Adding `elysia`
and `drizzle-orm` to a workspace did not leak into the client graph.

### Independent probes

Two probes run by hand rather than read from the evidence file:

1. `openDatabase("./nope/nope/apex.sqlite")` throws
   `cannot open the database at ./nope/nope/apex.sqlite: directory
   D:\Projects\battle-pets\nope\nope does not exist`. The loud-failure edge case
   is real.
2. `createApp(...).handle(new Request("http://localhost/health"))` returns
   `200 {"status":"ok","schemaVersion":"0001_init.sql"}`.

While running probe 2 the primary noticed that Elysia returns 404 for hostnames
of three characters or fewer: `x`, `ab`, `abc` and `a.b` all 404, while
`abcd`, `a.b.c`, `ab.cd`, `localhost`, `server:3000` and `127.0.0.1` all return
200. It is an upstream offset quirk in Elysia's URL handling, not something this
code can cause (`app.ts` is a bare `new Elysia().get("/health", ...)`), and no
realistic host is short enough to hit it - production is a dotted subdomain and
a Docker service name is at least four characters. Recorded so the next person to
probe the route by hand does not mistake it for a defect. Not a finding against
this phase.

### Acceptance criteria

| AC | Status | Basis |
| --- | --- | --- |
| NFR-4 (routes tested without network or ports) | met | `app.handle(new Request(...))` over `:memory:`; 23 tests bind nothing |
| NFR-5 (12 KB cap with a guard and a negative control) | met | largest module `migrate.ts` at 2550 B, 9738 B of headroom; the guard rejects an oversized fixture one byte over the cap and removes it |
| NFR-6 (verify and build stay green, client behaviour unchanged) | met | both exit 0; `dist` byte-identical across three captures |

**Result:** phase accepted. The fourth workspace is in the gate, the schema is
committed SQL with a ledger runner, boot fails loudly rather than silently, and
the client bundle is provably untouched.
