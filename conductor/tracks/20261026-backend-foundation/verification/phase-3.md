# Phase 3 — Cloud save API

| Field | Value |
| --- | --- |
| Track | `20261026-backend-foundation` — ElysiaJS Backend Foundation |
| Phase | 3 — Cloud save API |
| Date | 2026-10-26 |
| Branch | `feat/20261026-backend-foundation` |
| Base | `2ef1237c` |
| Head | `339db15a` |
| Covers | FR-3, FR-6, AC-3, AC-6 |
| Result | **verified** — `bun test --check --parallel=4 --timeout 120000`: 2945 pass, 1 skip, 0 fail |

## What was built

Three modules under `apps/server/src/saves/`, mounted beside the identity routes.

- **`limits.ts`** — `MAX_PAYLOAD_BYTES = 256 KiB`, `payloadBytes()` (UTF-8 byte
  length), `isWithinPayloadLimit()`. A server decision, not a schema one: the
  client's own storage has no cap, so the only thing the server needs is a
  number above which it refuses to store.
- **`store.ts`** — `pushSave`, `readSave`, `readDisplacedSave`. The whole
  conflict path is one `db.transaction(...)`: read the stored row, compare
  `savedAt`, then insert / displace-and-overwrite / leave alone. `receivedAt` is
  stamped from the server's clock at push time and is never compared with
  anything.
- **`routes.ts`** — `PUT /trainers/:id/save`, `GET /trainers/:id/save`,
  `GET /trainers/:id/save/displaced`, plus `PASSPHRASE_HEADER`.

`apps/server/src/app.ts` gains one line: `.use(saveRoutes({ db }))`. No
migration, no schema change, no new dependency.

### The endpoints

| Route | Auth | Success | Refusals |
| --- | --- | --- | --- |
| `PUT /trainers/:id/save` | `passphrase` in body | `200 { stored, winner }` | `400 invalid_passphrase` / `invalid_payload` / `invalid_saved_at`, `401 wrong_passphrase`, `404 trainer_not_found`, `409 passphrase_required`, `413 payload_too_large` |
| `GET /trainers/:id/save` | `x-trainer-passphrase` header | `200 { payload, savedAt }` | `401`, `404 trainer_not_found`, `404 save_not_found`, `409` |
| `GET /trainers/:id/save/displaced` | `x-trainer-passphrase` header | `200 { payload, savedAt, displacedAt }` | `401`, `404 trainer_not_found`, `404 no_displaced_save`, `409` |

A pull carries its passphrase in a **header**, not a query string: a query
string is recorded by every proxy and access log on the way here, and NFR-3 says
the passphrase is never logged. A push carries it in the body because a push
already has one.

`stored: false` is a `200`. Nothing failed — the client's copy is simply behind,
and it keeps playing on its own copy.

### Two design decisions

**The tie.** Equal `savedAt` (two pushes in the same millisecond) keeps the
stored copy: `incoming.savedAt <= stored.savedAt` → `{ stored: false, winner:
"stored" }`. The alternative — replace on a tie — is not wrong about the save
itself, but it is wrong about the *displaced* slot: it would overwrite a genuine
earlier loser with a near-duplicate of the winner, destroying the one thing FR-6
exists to preserve. Refusing loses nothing, because the pushing client still
holds its own copy. A tie therefore displaces nothing, which is asserted.

**Auth refusals are distinguishable here, unlike `claim`.** Phase 2's
`claimTrainer` deliberately returns one `false` for three causes so `POST
/trainers/:id/claim` cannot enumerate ids. The save routes reuse `claimTrainer`
for the comparison itself but answer `404` / `409` / `401` separately. That does
not restore the enumerator: `GET /trainers/:id` already answers "does this
trainer exist" and "has it set a passphrase" publicly, so the save routes reveal
nothing the identity surface does not, and the `409` is actionable for a caller
that owns the trainer it just created. The constant-time comparison is not
re-implemented and not weakened.

## Commands

| # | Layer | Command | Exit | Summary |
| --- | --- | --- | --- | --- |
| 1 | unit (red) | `bun test --check --parallel=4 --timeout 120000` | 1 | `Found 3 errors in 2 files, checked 655 files across 5 projects` |
| 2 | unit | `bun test --check --parallel=4 --timeout 120000` | 1 | `2938 pass, 1 skip, 6 fail, 267684 expect()` — `Ran 2945 tests across 255 files. [57.11s]` |
| 3 | unit | `bun test --check --parallel=4 --timeout 120000` | 0 | `2944 pass, 1 skip, 0 fail, 267693 expect()` — `[68.11s]` |
| 4 | unit | `bun test --check --parallel=4 --timeout 120000` | 0 | `2945 pass, 1 skip, 0 fail, 267697 expect()` — `[47.04s]` |
| 5 | static | `bun run check` | 0 | 27 server files, no type errors (655 files across the workspace) |
| 6 | static | `bunx biome check apps/server/src` | 0 | `Checked 27 files. No fixes applied.` |
| 7 | phase | `bun run verify` | 0 | check + uncapped tests (2945 pass) + biome (1 pre-existing CSS warning) + determinism gate OK |
| 8 | build | `bun run build` | 0 | `dist/assets/index-CI37K-Je.js 916.63 kB` — byte-identical name, client unchanged |
| 9 | unit (final) | `bun test --check --parallel=4 --timeout 120000` | 0 | `2945 pass, 1 skip, 0 fail, 267697 expect()` — `Ran 2946 tests across 255 files. [61.46s]` |

### The red runs, in full

Run 1 — the tests were written before any implementation existed, so the
typechecker could not resolve the modules they import:

```
apps/server/src/saves/routes.test.ts:5:49  TS2307: Cannot find module './limits' or its corresponding type declarations.
apps/server/src/saves/routes.test.ts:6:35  TS2307: Cannot find module './routes' or its corresponding type declarations.
apps/server/src/saves/store.test.ts:4:55   TS2307: Cannot find module './store' or its corresponding type declarations.
error: "bun test --check" exited with code 1
```

Run 2 — first implementation run, six failures, one real bug:

```
error: Your "payload" field references a column "saves"."payload", but the table "saves" is not part of the query! Did you forget to join it?
    at buildSelectQuery (drizzle-orm@0.45.4/sqlite-core/dialect.js:260)
    at apps/server/src/saves/store.test.ts:63:12
SyntaxError: JSON Parse error: Unexpected identifier "Your"  (routes.test.ts:210, :250, :265)
expect(received).toBe(404)  Received: 500  (routes.test.ts:159, :233)
```

`readDisplacedSave` had spread the `saves` column references into a
`.from(displacedSaves)` query. Fixed by naming `displacedSaves`' own columns.
The remaining two lines in that run are the pre-existing
`smoke: not an http(s) URL: file:///tmp/x` skip, listed but not counted as a
failure.

The one skip in every green run is that same pre-existing smoke case; it is not
introduced by this phase.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-3 | One save per trainer, replaced only when the incoming `savedAt` is newer | `saves(trainer_id)` is the primary key (Phase 1, unchanged); `store.test.ts` "keeps exactly one save per trainer" asserts `COUNT(*) = 1` after three pushes; `routes.test.ts` "a newer push replaces the stored save" and "an older push leaves the stored save untouched and reports which one won" | met |
| FR-6 | The losing copy is written to a recoverable slot rather than discarded | `routes.test.ts` "the displaced save survives a conflict and is retrievable" and "keeps exactly one displaced copy, replaced on the next conflict" | met |
| AC-3 | A newer `savedAt` replaces; an older one leaves the stored save untouched | `routes.test.ts` "an older push leaves the stored save untouched and reports which one won" — quoted below | met |
| AC-6 | The newer save is kept and the older copy is still retrievable from the slot | `GET /trainers/:id/save/displaced` returns the exact displaced payload and its `savedAt`, while `GET .../save` still returns the winner | met |
| NFR-1 | No change to `packages/sim` or `packages/voxel` | `git status` after the phase: only `apps/server/src/saves/**` and `apps/server/src/app.ts` | met |
| NFR-3 | The payload is never logged | `routes.test.ts` "nothing is written to the console while a payload is in flight" | met |
| NFR-4 | No network, no fixed port | every route test goes through `app.handle(new Request("http://localhost…"))` over `openDatabase(":memory:")` | met |
| NFR-5 | 12 KB module cap | `apps/server/src/module-size.test.ts` passes on the run that added these modules | met |
| NFR-6 | `verify` and `build` stay green; client bundle unchanged | commands 7 and 8: `index-CI37K-Je.js` at 916.63 kB, the same name and size as Phase 2 | met |

### The assertion that an older push does not overwrite a newer stored save

```ts
await push(app, id, newer, 2_000)
const response = await push(app, id, older, 1_000)

// 200, not 409: nothing failed. The client's copy is simply behind, and it
// keeps playing on its own copy without treating this as an error.
expect(response.status).toBe(200)
expect(await response.json()).toEqual({ stored: false, winner: "stored" })
expect(await (await pull(app, id)).json()).toEqual({
  payload: newer,
  savedAt: 2_000,
})
```

The pull at the end is the load-bearing line: the status alone would still pass
if the route answered `stored: false` and then wrote the older payload anyway.

### The assertion that the displaced copy survives and is retrievable

```ts
await push(app, id, laptop, 1_000)
await push(app, id, desktop, 2_000)

const response = await pullDisplaced(app, id)
const body = (await response.json()) as SaveBody & { displacedAt: number }

expect(response.status).toBe(200)
// The loser is preserved rather than discarded (FR-6)...
expect(body.payload).toBe(laptop)
expect(body.savedAt).toBe(1_000)
expect(typeof body.displacedAt).toBe("number")
// ...and the winner is still the newer copy, not the preserved one.
expect((await (await pull(app, id)).json()) as SaveBody).toEqual({
  payload: desktop,
  savedAt: 2_000,
})
```

Both halves matter: a route that returned the *current* save from the displaced
endpoint would satisfy the first two assertions and fail the third.

And exactly one copy is kept, the most recent loser rather than the first:

```ts
await push(app, id, payloadAt(1_000, "a"), 1_000)
await push(app, id, payloadAt(2_000, "b"), 2_000)
await push(app, id, payloadAt(3_000, "c"), 3_000)

expect(db.query("SELECT COUNT(*) AS n FROM displaced_saves").get()).toEqual({ n: 1 })
expect(((await (await pullDisplaced(app, id)).json()) as SaveBody).payload)
  .toBe(payloadAt(2_000, "b"))
```

### The assertion that an oversized body is refused rather than truncated

```ts
const huge = `{"version":25,"pad":"${"x".repeat(MAX_PAYLOAD_BYTES)}"}`
expect(payloadBytes(huge)).toBeGreaterThan(MAX_PAYLOAD_BYTES)
const response = await push(app, id, huge, 2_000)

expect(response.status).toBe(413)
expect(await response.json()).toEqual({
  error: "payload_too_large",
  field: "payload",
  limitBytes: MAX_PAYLOAD_BYTES,
})
// Refused, not truncated: the stored save is exactly what it was, and the
// refused body did not displace it on its way out.
expect(await (await pull(app, id)).json()).toEqual({ payload: kept, savedAt: 1_000 })
expect(db.query("SELECT COUNT(*) AS n FROM displaced_saves").get()).toEqual({ n: 0 })
```

The body names the limit so the client can report something actionable. The
byte/character distinction has its own case: `"é".repeat(MAX / 2 + 1)` has
`.length < MAX` but `payloadBytes > MAX`, and is refused — a character count
would have let it through and then stored more than the limit allows. A payload
of exactly `MAX_PAYLOAD_BYTES` is accepted, so the boundary is inclusive and the
cap is not quietly 255 KiB.

### The payload is never parsed

```ts
const future =
  '{"version":99,"state":{"species":["voltaic","lumen"],"unicode":"🐉 é ✓"},"session":{"seed":12345},"savedAt":1700000000000,"unknownField":{"nested":[1,2,3]}}'
...
expect(pulled.payload).toBe(future)
expect(pulled.savedAt).toBe(1_700_000_000_000)
```

Version 99, an unknown species, an unknown field and multi-byte text all survive
byte for byte. A second case pushes `"{not json at all, and deliberately so"` and
gets it back unchanged, which proves the route never reaches for `JSON.parse` —
a parser would have thrown before the insert.

## Deviations

None. The phase touched only `apps/server/src/saves/**` and the one mount line in
`apps/server/src/app.ts`, both inside `Touches`.

## Notes

- **The transaction is tested, not assumed.** `store.test.ts` installs a
  `BEFORE UPDATE ON saves` trigger that aborts, then asserts the failed conflict
  left *neither* a displaced row *nor* a changed save. A displace-then-overwrite
  written as two statements outside a transaction would leave the displaced row
  behind and fail that test.
- **`receivedAt` is proven separate.** `store.test.ts` reads both columns back
  and asserts `received_at >= before` and `received_at !== saved_at`, so a
  future refactor that "simplifies" the two clocks into one fails immediately.
- **`savedAt` must be an integer.** `savedAt: "yesterday"` is a `400
  invalid_saved_at` decided before any write, so a malformed push cannot land a
  row with a nonsense ordering key.
- **Refusal order.** The size check runs before the Argon2 verification: a body
  that cannot be stored should not cost a hash. A wrong passphrase still costs
  one, because the payload check happens first but the refusal for a valid-sized
  body does not.
- **Displaced saves are behind the same passphrase** as the live save. The loser
  is a whole career too, so it is not a lesser secret; both a missing and a
  wrong header are `401` and neither body contains the payload.
- **No new dependency.** `elysia`, `drizzle-orm`, `bun:sqlite` and Bun built-ins
  only. `Buffer.byteLength` comes from Bun's Node compatibility.
- **Carried into Phase 4:** the client is untouched, so nothing in the client
  knows these routes exist yet. FR-4, FR-5, FR-7 and FR-8 are all client-side and
  unblocked by this phase; the displaced endpoint is the recovery path those
  flows will need on a conflict, and it takes the same header as the pull.

## Primary verification

Date: 2026-10-26. By: Conductor primary, independent of the phase agent's report.

### Squash guard

`git log 2ef1237c..HEAD` returned exactly the two commits the report named -
`339db15a` (implementation) and `f200397c` (evidence) - and both were checked
with `git rev-list --parents -n 1`: single parent each, so the range is linear
with no merge commits, no unreported commits and no user commits. Squash is safe.

`git diff --name-only 2ef1237c..HEAD` returned 7 paths: `saves/limits.ts`,
`saves/store.ts`, `saves/routes.ts`, their two test files, `app.ts`, and the
evidence file. All inside the phase's `Touches`. `git diff --stat` against
`apps/server/migrations`, `apps/server/src/identity`, `packages` and
`apps/client` is **empty** - the schema, the identity module, the sim and the
client are all untouched.

### Fix spot-check (read directly, not taken from the report)

- `pushSave` wraps read, compare and write in one `db.transaction(...)`. The
  displaced insert uses `onConflictDoUpdate` on `displacedSaves.trainerId`, so the
  primary key keeps exactly one loser rather than accumulating history - FR-6's
  bound is enforced by the schema, not by cleanup code.
- The `if (!replaced) throw` at `store.ts:105` is not defensive noise: inside a
  transaction it is the only way to roll the displace back if the update somehow
  misses, so the half-applied conflict the brief called "worse than refusing the
  request" cannot survive.
- `refuse()` reuses `claimTrainer` for the actual comparison rather than
  re-implementing constant-time verification, and returns 404 / 409 / 401
  distinctly. That does not reopen the Phase 2 enumerator, because
  `GET /trainers/:id` already answers existence and `hasPassphrase` publicly -
  the save routes reveal nothing new. The reasoning is sound and is written down
  at the point of the decision rather than in a commit message.
- The payload limit is checked **before** the Argon2 verification
  (`routes.ts:84-94`), so a body that cannot be stored never costs a hash. That
  is the right order and it is commented as such.

### Independent probes (not read from the evidence file)

Three probes written and run by the primary against the real app.

1. **The conflict path behaves.** Newer replaces, older does not, and the loser
   is retrievable with its original `savedAt`:

   ```
   first push        : 200 {"stored":true,"winner":"incoming"}
   older push        : 200 {"stored":false,"winner":"stored"}
   save after stale  : {"payload":"OLD","savedAt":1000}
   newer push        : 200 {"stored":true,"winner":"incoming"}
   save now          : {"payload":"NEW","savedAt":2000}
   displaced         : {"payload":"OLD","savedAt":1000,"displacedAt":1793009194084}
   stale kept out    : true
   loser preserved   : true
   ```

   The older push returned **200**, not an error status, which is what the brief
   required: the client keeps playing on its own copy and must not see a failure.

2. **The size limit counts bytes, not characters.** A payload of 100,000 `漢`
   characters is 300,000 bytes in UTF-8 and was refused:

   ```
   oversized status : 413
   body             : {"error":"payload_too_large","field":"payload","limitBytes":262144}
   nothing stored   : 404
   ```

   This is the check that would have passed had the implementation used
   `payload.length` (100,000 < 262,144). It does not. Nothing was stored and
   nothing displaced.

3. **The payload is genuinely opaque.** A payload claiming `"version":99` with an
   unknown field and a non-ASCII character round-tripped byte for byte
   (`round-trips: true`). The server did not parse it, validate it, or migrate it
   - the property that lets `SAVE_VERSION` stay at 25 while the server exists.

A note on my own first attempt: probe 1 initially failed with
`invalid_passphrase` because I sent the passphrase as a header on a push. Pushes
carry it in the body, pulls in the header (documented in `PASSPHRASE_HEADER` and
chosen so a passphrase never lands in a proxy access log). The route was right
and my probe was wrong; recorded so the next person writing a probe reads the
brief's auth note first.

### Independent gates

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Phase verification | `bun run test:phase` | 0 | 2945 pass, 1 pre-existing skip, 0 fail, 267697 `expect()` calls, 2946 tests across 255 files, 45.60 s |
| Static + unit + determinism | `bun run verify` | 0 | typecheck clean in all four workspaces, Biome clean, determinism gate byte-identical for all 27 GLBs + 5 props |
| Build | `bun run build` | 0 | `dist/assets/index-CI37K-Je.js` 916634 B, unchanged; pre-existing >500 kB advisory only |

Test arithmetic: 2919 / 253 after Phase 2; 2946 / 255 now. The 27 new tests are
the save suite, committed and discovered by a bare `bun test`.

Largest new module: `saves/routes.ts` at 5,064 B against the 12,288 B cap, 7,224 B
of headroom.

### Acceptance criteria

| AC | Status | Basis |
| --- | --- | --- |
| AC-3 (newer push replaces, older push leaves the stored save untouched) | met | proven by the primary's probe above: `stored:false` at 200, stored payload still `OLD` at `savedAt` 1000 |
| AC-6 (conflict keeps the newer save and the older copy is retrievable) | met | `displaced` returns `{"payload":"OLD","savedAt":1000}` while `/save` returns `NEW`; both halves asserted, so returning the current save would fail |
| FR-3 (one save per trainer, replaced only when newer) | met | `trainer_id` is the `PRIMARY KEY`; the upsert cannot create a second row |
| FR-6 (loser preserved, retrievable) | met | `onConflictDoUpdate` on the displaced table keeps exactly one, most recent |

### Decisions recorded rather than deferred

- **Tie on equal `savedAt` keeps the stored copy and displaces nothing.** The
  reasoning in `store.ts:43-47` is that replacing would overwrite a genuine
  earlier loser with a near-duplicate of the winner - destroying the one thing
  FR-6 exists to protect - while refusing loses nothing, since the pushing client
  still holds its own copy. That is the right trade and it is documented at the
  decision point.
- **Pull carries the passphrase in `x-trainer-passphrase`, push in the body.**
  A query parameter would be recorded by every proxy and access log on the way
  in, which NFR-3 forbids. Push already has a body, so it uses it.

**Result:** phase accepted. The conflict path is atomic and proven to be, the
loser survives and is retrievable, the size limit counts bytes, and the payload
is never parsed - the three things that would have made this phase look finished
while being wrong.
