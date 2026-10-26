# Phase 2 — Trainer identity

| | |
|---|---|
| Track | `20261026-backend-foundation` (ElysiaJS Backend Foundation) |
| Phase | 2 — Trainer identity |
| Date | 2026-10-26 |
| Branch | `feat/20261026-backend-foundation` |
| Phase base | `ec312122` |
| Head | `44e3576d` (code) — evidence recorded in `f8146f68` |
| Covers | FR-1, FR-2, FR-9, NFR-3, AC-1, AC-2 |
| Result | **verified** |

## What was built

A client can now obtain a trainer id, name the trainer, set a reclaim
passphrase, and reclaim the same trainer from a second device. A wrong
passphrase retrieves nothing, and the claim endpoint cannot be used to learn
which ids exist.

New modules under `apps/server/src/identity/`:

| Module | Bytes | Role |
|---|---|---|
| `id.ts` | 952 | `newTrainerId()` — 20 Crockford base32 symbols (100 bits) from `crypto.getRandomValues`, prefix `trn_` |
| `name.ts` | 657 | `normalizeName()` — trims, refuses blank/non-string, caps at 64, strips nothing |
| `passphrase.ts` | 2 848 | `hashPassphrase`, `verifyPassphrase`, `decoyHash`, `isPassphrase`, scheme + length constants |
| `trainer.ts` | 3 701 | Store: `createTrainer`, `findTrainer`, `renameTrainer`, `replacePassphrase`, `claimTrainer` |
| `routes.ts` | 4 319 | The four HTTP routes |

`apps/server/src/app.ts` (817 B) now mounts `identityRoutes({ db })` beside
`GET /health`. Largest non-test module is `routes.ts` at 4 319 B, 7 969 B under
the 12 288 B cap; `module-size.test.ts` walks `src/` recursively and passed
unchanged, negative control included.

Routes:

| Route | Success | Failures |
|---|---|---|
| `POST /trainers` | `201 {"id"}` — body accepted and ignored, nothing stored | — |
| `GET /trainers/:id` | `200 {id, name, hasPassphrase}` | `404 {error:"trainer_not_found"}` |
| `PUT /trainers/:id` | `200 {id, name, hasPassphrase}` | `400 invalid_name` / `invalid_passphrase` / `nothing_to_update`, `401 wrong_current_passphrase`, `404` |
| `POST /trainers/:id/claim` | `200 {"ok":true}` | `401 {"ok":false}` — identical for every failure; `400 passphrase_required` decided before any lookup |

Design decisions worth recording:

- **No client-supplied id.** `createTrainer(db)` takes no arguments, so there
  is no parameter through which an id, name, passphrase or email could enter the
  table on creation. A request body carrying `email`, `name`, `passphrase` or
  `id` gets `201` and those fields are dropped, not refused — a refusal would
  tell a caller which fields exist.
- **No row id exposure.** `Trainer` is `{id, name, hasPassphrase}`; the hash and
  salt never leave `trainer.ts`, and `project()` drops the hash before a route
  sees a row.
- **Hash scheme.** `Bun.password.hash(passphrase, {algorithm:"argon2id"})`.
  Argon2id embeds its own random salt in the hash string, so the full string is
  stored in `passphrase_hash` and `passphrase_salt` holds `argon2id-embedded` as
  a scheme marker. A future scheme that salts separately can write its own salt
  there without a migration. Verification is `Bun.password.verify` only —
  constant-time by construction. No dependency added.
- **Uniform failure cost.** `claimTrainer` resolves the row, then verifies
  against `row?.passphraseHash ?? ""`. An empty hash routes to `decoyHash()`, a
  lazily built Argon2 hash of a random UUID, so "no such trainer", "no
  passphrase set" and "wrong passphrase" each pay for one real verification
  instead of an early `return false`.
- **Replacement needs the current passphrase.** Without it, anyone who learned
  an id could set a passphrase and lock the owner out. The first passphrase
  needs no current one, so a fresh trainer can still be locked.
- **Hand validation, not schemas.** Elysia's validation errors can echo the
  offending value; a passphrase must not appear in a response, so these routes
  validate by hand and answer `{error, field}` — a field name, never a value.

## Commands

Every command below was run from the repository root on the phase branch.
Red runs are listed with their actual output.

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `bun test ./apps/server/src/identity` (red, P2.T1.1/T2.1/T2.2) | 1 | `0 pass, 4 fail, 4 errors` — `error: Cannot find module './id' from '...id.test.ts'`; `error: Cannot find module './passphrase' from '...passphrase.test.ts'`; `error: Cannot find module './name' from '...routes.test.ts'`; `error: Cannot find module './name' from '...trainer.test.ts'` |
| 2 | `bun test ./apps/server/src/identity` (green, primitives) | 0 | `45 pass, 0 fail, 138 expect() calls` |
| 3 | `bun test ./apps/server/src/identity` (red, P2.T2.2 wiring) | 1 | `44 pass, 1 fail` — `expect(received).not.toEqual(expected)` at `routes.test.ts:69`, sorted ids equalled generation order. A defect in my own assertion, not the code: three samples sort ascending 1 time in 6. Fixed to twelve samples. |
| 4 | `bun test ./apps/server/src/identity` (green, after fix) | 0 | `46 pass, 0 fail, 141 expect() calls` |
| 5 | `bun run check` (red) | 1 | `src/identity/trainer.ts(77,17): error TS2339: Property 'changes' does not exist on type 'void'` and the same at `(93,17)`. The bun-sqlite driver types `run()` as `void`; switched both updates to `.returning({id}).get()` and tested `!== undefined`. |
| 6 | `bun run check` (green) | 0 | `@apex/server check: ✓ No type errors in 22 files`; client, sim, voxel also clean |
| 7 | `bunx biome check apps/server/src` (red) | 1 | `Found 6 errors` — 5 formatter diffs (`app.ts`, `routes.ts`, `routes.test.ts`, `passphrase.test.ts`, `trainer.test.ts`) and `trainer.test.ts:5 assist/source/organizeImports`. Applied Biome's own fixes; no manual restyling. |
| 8 | `bunx biome check apps/server/src` (green) | 0 | `Checked 22 files. No fixes applied.` |
| 9 | `bun test ./apps/server/src` | 0 | `69 pass, 0 fail, 188 expect() calls`, 11 files |
| 10 | **`bun test --check --parallel=4 --timeout 120000`** (phase verification) | 0 | `2918 pass, 1 skip, 0 fail, 267620 expect() calls`, 2919 tests / 253 files, 40.60 s |
| 11 | `bun run verify` (`verify_phase`) | 0 | check + full suite + `biome check` (1 pre-existing CSS warning, `ranch.css:1429` `noDescendingSpecificity`) + determinism gate OK |
| 12 | `bun run build` | 0 | `dist/assets/index-CI37K-Je.js 916.63 kB`, `dist/assets/index-DdmaZZpS.css 66.67 kB` — same hashes as Phase 1, client bundle unchanged |

The single skip is the pre-existing `scripts/smoke` case recorded in Phase 1
(`smoke: not an http(s) URL: file:///tmp/x`), unchanged by this phase.

## Acceptance criteria

| Criterion | What it requires | Proof |
|---|---|---|
| FR-1 | Server issues an opaque trainer id on first contact, no personal data, no email | `POST /trainers` → `201`, `Object.keys(body)` is exactly `["id"]`, `body.id` matches `/^trn_[0-9a-hjkmnp-tv-z]{20}$/`; 12 calls give 12 distinct ids in non-generation order; a body with `email`/`name`/`passphrase`/`id` is accepted and ignored, and the attacker-chosen id is not stored (`GET` of it → 404) — `routes.test.ts` "issues an opaque id and returns nothing else", "issues a fresh id on every call", "collects no personal field…"; `id.test.ts` (opaque, never repeats, not sequential, no personal data) |
| FR-2 | Display name and reclaim passphrase | `PUT` sets `name` trimmed (`"  Ada Lovelace  "` → `"Ada Lovelace"`), refuses blank and over-64 with `400 {error:"invalid_name", field:"name"}`, sets a first passphrase, replaces one only with the current passphrase, keeps the name when only the passphrase changes — `routes.test.ts` `PUT` block; the name rules themselves in `trainer.test.ts` "display names" |
| FR-9 | Stored only as a hash, constant-time compare, wrong passphrase retrieves nothing | `passphrase.test.ts` "stores an argon2id hash, never the passphrase itself" + "verifies the right passphrase and rejects every wrong one"; `trainer.test.ts` asserts the stored `passphrase_hash` starts `$argon2id$` and does not contain the passphrase; `routes.test.ts` wrong passphrase → `401 {"ok":false}`, and the timing test asserts both failure modes cost >10 ms of real Argon2 work |
| NFR-3 | No secret committed, logged or echoed | `routes.test.ts` "NFR-3" block: nine responses on nine paths each asserted not to contain the sentinel; a `spyOn` sweep over `console.log/info/warn/error/debug` with a positive control; the database dump contains `$argon2id$` and not the passphrase |
| AC-1 | Fresh client receives an id; a second request with that id returns the same trainer | `routes.test.ts` "a second request with the id returns the same trainer" — first and second `GET` both `200` with identical `{id, name:"", hasPassphrase:false}` |
| AC-2 | Setting name + passphrase then reclaiming from a second client returns the stored save; wrong passphrase does not | `routes.test.ts` "reclaims the trainer from a second client with the right passphrase" — laptop and phone are two `createApp` instances over one `:memory:` database; the phone claims with the passphrase and then reads the name the laptop set. Wrong passphrase → `401 {"ok":false}` and nothing else. (The save payload itself arrives in Phase 3; what this phase proves is that the identity the save hangs off is reachable from the second client and only with the passphrase.) |

## The claim endpoint is indistinguishable between its two failure modes

The assertion, verbatim from `routes.test.ts`:

```ts
const wrongPassphrase = await send(app, "POST", `/trainers/${id}/claim`, {
  passphrase: "not the passphrase",
})
const unknownTrainer = await send(
  app,
  "POST",
  "/trainers/trn_00000000000000000000/claim",
  { passphrase: PASSPHRASE },
)

expect(wrongPassphrase.status).toBe(unknownTrainer.status)
expect(wrongPassphrase.headers.get("content-type")).toBe(
  unknownTrainer.headers.get("content-type"),
)
expect(await wrongPassphrase.text()).toBe(await unknownTrainer.text())
expect(unknownTrainer.status).toBe(401)
```

The last line is the guard against a vacuous pass: if both sides 500'd or both
404'd, the first three assertions would still hold while the endpoint was
broken. Two further pairs are covered the same way — a malformed id against an
unknown id, and a trainer with no passphrase against an unknown trainer — so the
three distinct internal reasons all collapse to one wire answer.

Shape alone is not enough, since a fast `return false` would still let a caller
count ids. `trainer.test.ts` therefore asserts the cost:

```ts
expect(unknownElapsed).toBeGreaterThan(10)
expect(wrongElapsed).toBeGreaterThan(10)
```

A one-off measurement with a temporary assertion in the same test (removed
before commit) reported `unknownElapsed 74.78 ms` and `wrongElapsed 89.20 ms` —
both a full Argon2id verification, no shortcut on the unknown-id path.

## The passphrase never appears in a response or a log

Response side — every path that touches a passphrase, including the two most
likely to echo input, an invalid-length value and a body Elysia cannot parse:

```ts
for (const response of responses) {
  const text = await response.text()
  expect(text).not.toContain(SENTINEL)
}
```

where `SENTINEL = "sentinel-passphrase-9f3a"` and `responses` covers
`POST /trainers`, `PUT` (valid and too-short), `GET`, `claim` (right, wrong,
too-short, unknown trainer) and a truncated JSON body.

Log side, with a positive control so an unwired spy cannot pass:

```ts
const logged = JSON.stringify(calls)
expect(logged).toContain("control line")
expect(logged).not.toContain(SENTINEL)
expect(logged).not.toContain("$argon2id$")
```

Storage side: `SELECT * FROM trainers` is asserted to have one row, to contain
`$argon2id$`, and not to contain the sentinel.

## Deviations

None. Every changed file is under `apps/server/src/identity/**` or
`apps/server/src/app.ts`. `apps/server/migrations/**` was read and not edited —
the committed `trainers` table already has `id`, `name`, `passphrase_hash`,
`passphrase_salt`, `created_at`, which is everything this phase needed. No
dependency was added. The client bundle is byte-identical to Phase 1
(`index-CI37K-Je.js`, 916.63 kB).

## Notes for the next phase

- `trainer.ts` exposes `findTrainer` / `claimTrainer` for the save routes to
  reuse; a save route should call `claimTrainer` rather than re-verifying, so
  the uniform-cost property is not re-implemented and accidentally weakened.
- `claimTrainer` returning one `false` for three causes is deliberate. If a
  caller ever needs to distinguish them (for example to prompt "set a
  passphrase"), that must be a separate authenticated route, not a change here.
- There is no passphrase reset and no id recovery, matching the spec's edge
  cases; nothing in this phase introduced a path that could grow one.
- The decoy hash is built lazily on first failing claim, so the very first
  unknown-id claim is slower than later ones. Tests warm it explicitly; if a
  timing side channel ever matters, build it at boot instead.
- `Bun.password` embeds its salt, so `passphrase_salt` currently holds a marker
  rather than a secret. A future scheme with a separate salt can use that column
  without a migration.

## Primary verification

Date: 2026-10-26. By: Conductor primary, independent of the phase agent's report.

### Squash guard

`git log ec312122..HEAD` returned exactly the four commits the report named -
`810e97b3`, `44e3576d`, `f8146f68`, `d0c3c22d` - and each was checked with
`git rev-list --parents -n 1`: all four have a single parent, so the range is
linear with no merge commits, no unreported commits and no user commits. Squash
is safe.

`git diff --name-only ec312122..HEAD` returned 11 paths: ten under
`apps/server/src/` (`identity/**` plus the `app.ts` wiring) and the evidence
file. All inside the phase's `Touches` (`apps/server/src/identity/**`,
`apps/server/src/app.ts`). `apps/server/migrations/**` is untouched, which is
what the brief required - the Phase 1 schema was sufficient. `apps/client/` and
`packages/` are untouched (`git diff --stat ec312122..HEAD -- apps/client
packages` is empty).

### Fix spot-check (read directly, not taken from the report)

- `claimTrainer` in `identity/trainer.ts` selects only `passphrase_hash` and
  returns `verifyPassphrase(passphrase, row?.passphraseHash ?? "")`. A missing row
  therefore yields `""`, and `verifyPassphrase` sends an empty hash to
  `verifyAgainstDecoy`, which runs a real Argon2 verify against a lazily built
  hash of a random UUID. The three failure cases are uniform in both shape and
  cost by construction rather than by three parallel branches that could drift.
- `verifyPassphrase` wraps `Bun.password.verify` in a `try`/`catch` returning
  `false`. A malformed or truncated stored hash therefore cannot produce a 500 -
  which would itself be a distinguishable answer. That is a real security
  property, not defensive noise.
- `PUT /trainers/:id` requires `currentPassphrase` before replacing an existing
  passphrase (`routes.ts:85-99`). Without it, learning an id would be enough to
  lock the owner out of their own career.
- `POST /trainers` takes no arguments in `createTrainer(db)` and accepts and
  ignores a request body rather than rejecting unknown fields - an error naming
  an unknown field would confirm which fields exist.
- `MAX_PASSPHRASE_LENGTH = 128` is documented as a denial-of-service bound, not
  a policy: hashing is deliberately expensive, so an unbounded input would let
  one request burn the server's memory. That is the right reason.

### Independent probes (not read from the evidence file)

Two probes written and run by the primary against the real app:

1. **The claim endpoint collapses both failures.** Wrong passphrase on a real
   trainer and a claim against a nonexistent id both returned
   `401`, `application/json;charset=utf-8`, body `{"ok":false}` - byte-identical
   on status, content-type and body:

   ```
   wrong-passphrase : {"status":401,"type":"application/json;charset=utf-8","body":"{\"ok\":false}"}
   unknown-trainer  : {"status":401,"type":"application/json;charset=utf-8","body":"{\"ok\":false}"}
   identical        : true
   ```

2. **The passphrase never leaves the server.** After `PUT` with the sentinel
   `sup3rSecretSentinel`, both the `PUT` response and a subsequent `GET` returned
   `{"id":"trn_...","name":"Rin","hasPassphrase":true}` with
   `sentinel in PUT body: false` and `sentinel in GET body: false`.

Both probes were throwaway files under `.conductor/evidence/` (gitignored) and
are not part of the tree.

### Independent gates

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Phase verification | `bun run test:phase` | 0 | 2918 pass, 1 pre-existing skip, 0 fail, 267620 `expect()` calls, 2919 tests across 253 files, 43.96 s |
| Static + unit + determinism | `bun run verify` | 0 | typecheck clean in all four workspaces, Biome clean, determinism gate byte-identical for all 27 GLBs + 5 props |
| Build | `bun run build` | 0 | `dist/assets/index-CI37K-Je.js` 916634 B, unchanged; pre-existing >500 kB advisory only |

Test arithmetic: 2873 tests / 249 files after Phase 1; 2919 / 253 now. The 46
new tests are the identity suite, committed and discovered by a bare `bun test`.

Largest new module: `identity/routes.ts` at 4,319 B against the 12,288 B cap,
9,969 B of headroom.

### Acceptance criteria

| AC | Status | Basis |
| --- | --- | --- |
| AC-1 (id issued, second request returns the same trainer) | met | `routes.test.ts` first and second `GET` identical; primary probe created a trainer and read it back |
| AC-2 (name + passphrase, reclaim from a second client, wrong passphrase does not) | met for identity | two `createApp` instances over one `:memory:` database; the save payload itself is Phase 3, and the evidence file says so rather than implying otherwise |
| FR-1, FR-2, FR-9 | met | mapped in the evidence table to named tests; the two headline security claims independently re-proven above |
| NFR-3 (no secret committed, logged or echoed) | met | nine response paths plus a `spyOn` sweep over all five console levels with a positive control, and a database dump showing `$argon2id$` |

### Carried into Phase 3

`claimTrainer` deliberately returns one `false` for three causes (no such id, no
passphrase set, wrong passphrase). Phase 3 must call it rather than re-verify,
and must not make it distinguish those cases on this route - doing so would
restore the enumerator. If a UI ever needs the distinction, it belongs on a
separate authenticated route. Recorded here because it is the kind of thing a
later phase "fixes" without knowing why it was built this way.

**Result:** phase accepted. Identity is issued, named, locked and reclaimable;
both security properties are asserted by tests and independently re-proven by the
primary; the schema and the client are untouched.
