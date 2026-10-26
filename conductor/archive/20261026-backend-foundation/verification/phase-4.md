# Phase 4 — Client cloud adapter

| Field | Value |
| --- | --- |
| Track | `20261026-backend-foundation` (ElysiaJS Backend Foundation) |
| Phase | 4 — Client cloud adapter |
| Date | 2026-10-26 |
| Branch | `feat/20261026-backend-foundation` |
| Base | `f8139806` |
| Head | `1fcd69af` |
| Covers | FR-4, FR-5, FR-7, FR-8, FR-11, NFR-1, NFR-2, NFR-6, AC-4, AC-5, AC-7, AC-8, AC-11 |
| Result | **verified** |

## What was built

The client gains a cloud side channel that hangs off the save seam the game already
had, and nothing about the game's read or write path changed shape.

`apps/client/src/cloud/` (14 modules + tests):

- **`config.ts`** — `cloudOrigin(raw)` is the construction-time switch. `undefined`,
  `""` and `"   "` all return `null`; anything else is trimmed and stripped of
  trailing slashes. Also holds `CLOUD_TIMEOUT_MS = 5000`, `PUSH_DEBOUNCE_MS = 2000`,
  `PUSH_CAP_MS = 10_000` and a deliberately duplicated `MIN_PASSPHRASE_LENGTH = 8`
  (importing the server's constant would drag server code into the bundle).
- **`credentials.ts`** — trainer id, ranch name and passphrase live in their own
  `apex.trainer` key, read through the same `Storage` `main.ts` already holds. They
  are **not** in the save, because `save-transfer.ts` exports and imports the save:
  a credential inside it would travel with every file a player shares. `SAVE_VERSION`
  therefore stays 25.
- **`api.ts`** — `createCloudApi({origin, fetch, signal})` over the Phase 3 routes.
  Push carries the passphrase in the body, pull in the `x-trainer-passphrase` header
  (a query string would land in proxy access logs). Every request asks for
  `AbortSignal.timeout(5000)`. A thrown `fetch` is `{ok: false, reason: "offline"}`,
  never an exception; status codes map to `unauthorized` / `not-found` / `conflict` /
  `rejected`.
- **`adapter.ts`** — `createCloudSaveAdapter(local, note)`: `getItem`/`removeItem`
  delegate straight to local storage, `setItem` writes local **first** (uncaught, so a
  quota failure still reaches `onPersistError`) and only then hands the payload to the
  queue, and only when the key is `SAVE_KEY`. `SaveAdapter` is synchronous, so this is
  the only shape that works; the cloud is never the read path.
- **`push-queue.ts`** — `note(payload)` resets a 2 s debounce and starts a 10 s cap on
  the burst's first write, whichever fires first. Injected `schedule`/`cancel`, so
  tests drive it without sleeping. A failed `send` is swallowed: it is a status, not
  an error state.
- **`sync.ts`** — the coordinator: boot `start()` (idempotent, one pull, `reconcile`),
  `signIn`, `createTrainer`, `signOut`, `noteLocalWrite`, `adoptWith`, `subscribe`,
  `status`. Conflict resolution is `savedAt`: a cloud copy that is not strictly newer
  is not adopted; an adopted payload is fingerprinted so it is not echoed straight
  back as a push.
- **`cloud-save.ts`** — the composition-root seam. `createCloudSave(...)` returns
  `null` when there is no origin, so a local-only build has no cloud object, no
  adapter, no sync, no chip and no request. With an origin it returns
  `{adapter, sync, api}` and nothing awaits the network.
- **`copy.ts`** — the two hard copy requirements as pure functions:
  `PASSPHRASE_NOTICE` (stated above the fields, before a passphrase exists) and
  `cloudStatusLine(status)` (eight states, none of them an alarm).
- **`panel.ts` / `cloud.css`** — the trainer surface: a `Cloud` chip in the existing
  chip cluster, and a `kit-modal` with ranch name / trainer id / passphrase, the
  notice, a `role="status"` line, Sign in + Create trainer, Sign out + Done. The chip's
  dot only reinforces its `title`, which carries the same sentence — colour is never
  the only carrier.

`apps/client/src/store.ts` gains `replaceState(state, session)`: adoption has to land
in the **same** store instance, because the subscribers, the persist path and the
morning-after ledger live there; a fresh store would strand all three and the HUD
would keep painting the replaced ranch. It swaps state and session, resets the
morning-after ledger (an adopted ranch inherits no ritual day), persists, and notifies
through the same loop `commit` uses — extracted into one `notify` closure so the two
paths cannot drift.

`apps/client/src/main.ts` makes one adapter swap at the store construction, builds the
panel only when `cloud` is non-null, and after the first paint fires
`void cloud?.sync.start()` with `adoptWith` wired to `store.replaceState` plus a
re-render. Boot stays synchronous and identical.

`apps/client/src/hud/**` gains an optional `extraChips?: HTMLElement[]` so the
composition root owns the cloud chip's seat instead of the HUD knowing about clouds.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| TDD red 1 | `bun test --check --parallel=4 --timeout 120000` | 1 | 5 typecheck errors: `api.test.ts:111` `reason: string` not assignable to `ApiFailure`; `now` not in `PushQueueOptions` ×4 (`push-queue.test.ts`) |
| TDD red 2 | `bun test --check --parallel=4 --timeout 120000` | 1 | 1 typecheck error: `schedule` missing in `push-queue.test.ts` "a failed send does not wedge the queue" |
| TDD red 3 | `bun test --check --parallel=4 --timeout 120000` | 1 | 2997 pass / 1 skip / **6 fail**. `cloud-save.test.ts` burst: `Expected savedAt 3800, received 1600`; `cloud-save.test.ts` first sign-in: `Expected length 1, received 0`; `push-queue.test.ts` "nothing is scheduled until a write arrives": `Expected 1, received 2`; `sync.test.ts` ×3 push: `Expected "synced"/"offline"/"ahead", received undefined` |
| TDD green | `bun test --check --parallel=4 --timeout 120000` | 0 | 3003 pass / 1 skip / 0 fail (cloud modules only) |
| Static | `bun run check` | 0 | `@apex/voxel` 118, `@apex/sim` 151, `@apex/server` 27, `@apex/client` 406 files, no type errors |
| Format/lint | `bunx biome check --write` then `bunx biome check` | 0 | 11 files fixed; final run reports 1 **warning** only — `apps/client/src/ranch.css:1429 lint/style/noDescendingSpecificity`, pre-existing and in a file this phase did not touch |
| Phase test | `bun test --check --parallel=4 --timeout 120000` | 0 | **3011 pass, 1 skip, 0 fail**, 267 881 `expect()` calls, 3012 tests across 263 files in 71.14 s |
| Verify | `bun run verify` | 0 | check + full suite (3011 pass, 66.73 s) + biome (1 pre-existing warning) + determinism gate green |
| Build | `bun run build` | 0 | vite 8.3.4, 324 modules, `dist/assets/index-hyRIghcr.js` 926.77 kB (gzip 254.27), CSS 67.76 kB (gzip 12.89), 528 ms |
| Determinism | `bun run gate:determinism` | 0 | 9 species × 3 stages byte-identical at seed 42, 5 prop digests match |
| Visual | `playwright-cli` against `bun run dev` | — | see screenshots below |

The smoke test prints `smoke: RESULT fail (the check could not complete)` and
`not an http(s) URL: file:///tmp/x` as its expected output; it does not fail the run.

`git diff --stat f8139806..HEAD -- packages apps/server` returns **no output**: nothing
under `packages/` or `apps/server/` changed, so `SAVE_VERSION` is untouched at 25.

Module sizes (12 KB cap, `apps/client/src/module-size.test.ts`): largest new modules are
`cloud/sync.ts` 11 055 B and `cloud/panel.ts` 6 726 B; the store change grew
`store.ts` from 6 826 B to 7 837 B and `main.ts` sits at 11 626 B. The cap test passes.

## Acceptance criteria

| Criterion | Proven by |
| --- | --- |
| FR-4 / AC-4 — a newer cloud save is adopted at boot | `sync.test.ts` › "a newer cloud save is adopted at boot (AC-4)" (`h.adopted[0].state.day === 4`, status `synced`); `cloud-save.test.ts` proves boot is not awaited in "a hanging api cannot hold boot or a day (NFR-2)" |
| FR-5 / AC-5 — push behind the existing autosave, a burst is one request | `push-queue.test.ts` › "a burst of autosave writes is exactly one push (AC-5)"; `cloud-save.test.ts` › "a burst of autosaves is one push on the wire (AC-5)" |
| FR-7 / AC-7 — first sign-in uploads the local save; an existing cloud save is never overwritten | `sync.test.ts` › "a trainer with no cloud save receives the local ranch", "an existing cloud save is never overwritten by signing in (AC-7)"; `cloud-save.test.ts` › "the first sign-in uploads the local save, and the round trip matches" |
| FR-8 / AC-8 — API unreachable: boot succeeds, a day completes, sync reports the cloud copy behind | `cloud-save.test.ts` › "a day completes while the api is unreachable (AC-8, NFR-2)"; `sync.test.ts` › "an unreachable api at boot is a quiet status, not a throw (AC-8)"; `copy.test.ts` › "an unreachable cloud reports the cloud copy behind, quietly" |
| FR-11 — ships configured with the API origin, degrades when unset | `config.test.ts` › "unset means no cloud at all", "keeps a configured origin and trims the trailing slash"; `cloud-save.test.ts` › "an empty origin is the same as unset (AC-11)" |
| NFR-1 — `SAVE_VERSION` stays 25, nothing in `packages/sim` or `packages/voxel` changes | `config.test.ts` › "the cloud never changes the save schema (NFR-1)"; `credentials.test.ts` › "live beside the save, never inside it"; `sync.test.ts` › "credentials never enter the save"; `git diff --stat f8139806..HEAD -- packages apps/server` empty |
| NFR-2 — no network call blocks boot or a day | `cloud-save.test.ts` › "constructing the cloud makes no request (NFR-2)", "a hanging api cannot hold boot or a day (NFR-2)" |
| NFR-6 / AC-11 — no origin means zero requests, behaviour exactly as before | `cloud-save.test.ts` › "no origin means no cloud object and zero requests (AC-11, NFR-6)"; wire-level: the no-origin dev build's full static request list contains no API host and `find "Cloud"` returns no match |
| Trainer surface states no-reset and lost-id limits before a passphrase is set | `copy.test.ts` › "the passphrase notice says there is no reset, before any is set", "the passphrase notice names the recovery path", "the passphrase notice stays within two sentences" |

### The assertion that a burst is exactly one push

`apps/client/src/cloud/cloud-save.test.ts` — four commits 200 ms apart, counted on the
wire rather than in the queue:

```ts
for (let day = 0; day < 4; day++) {
  store.commit(advanceDay(store.get()))
  clockRef.advance(200)
}
const pushes = () => requests.filter((request) => request.method === "PUT").length
expect(pushes()).toBe(0)
clockRef.advance(2000)
expect(pushes()).toBe(1)
expect(requests.length - before).toBe(1)
expect(JSON.parse(push?.body ?? "{}")).toMatchObject({ passphrase: TRAINER.passphrase, savedAt: 1600 })
```

`requests.length - before` being 1 also rules out a pull riding along on the flush.

### The assertion that an unreachable API still boots and completes a day

`apps/client/src/cloud/cloud-save.test.ts` — `fetch` throws `ECONNREFUSED`:

```ts
const started = cloud?.sync.start()      // fired, never awaited
store.commit(advanceDay(store.get()))    // a day played to completion
expect(store.get().day).toBe(2)
expect(storage.getItem(SAVE_KEY)).not.toBeNull()
await started
expect(statuses[statuses.length - 1]).toBe("offline")
```

### The assertion that no origin means zero requests

`apps/client/src/cloud/cloud-save.test.ts`:

```ts
const { cloud, store } = mount({ origin: undefined, storage, fetch, clock: clock() })
expect(cloud).toBeNull()
store.commit(advanceDay(store.get()))
expect(store.get().day).toBe(2)
expect(requests).toEqual([])
```

`createCloudSave` branches on `cloudOrigin(origin) === null` at construction, so there is
no object to call — the zero is structural, not a caught failure.

### The assertion that adoption does not overwrite an existing cloud save

`apps/client/src/cloud/sync.test.ts` › "an existing cloud save is never overwritten by
signing in (AC-7)" — local `savedAt: 300`, cloud `savedAt: 200`:

```ts
const result = await h.sync.signIn(TRAINER.id, TRAINER.passphrase)
expect(result).toEqual({ ok: true })
expect(api.pushes).toHaveLength(0)
expect(h.adopted).toHaveLength(0)
expect(readCredentials(h.storage)).toEqual(TRAINER)
```

The upload path is only reachable from `pull → not-found`, i.e. the trainer genuinely
has no cloud save.

## Screenshots

Served by `bun run dev` (vite 8.3.4). All paths are under
`.conductor/evidence/20261026-backend-foundation/`.

| File | Viewport | Shows |
| --- | --- | --- |
| `phase-4-trainer-desktop.png` | 1440×900 | Trainer surface with the no-reset / trainer-id notice, three fields, and the quiet offline status line |
| `phase-4-offline-phone.png` | 393×852 | Same surface at phone width: no horizontal scroll, actions on two rows, nothing clipped |
| `phase-4-offline-desktop.png` | 1440×900 | The HUD with the `Cloud` chip in the existing cluster, day played while the API refuses connections |
| `phase-4-hud-phone.png` | 393×852 | Chip cluster at phone width — Settings / Handbook + Stable / Cloud, clear of the score bug |
| `phase-4-chip-desktop.png` | element | The chip beside Settings, Handbook and Stable |
| `phase-4-offline-landscape.png` | 852×393 | Landscape phone: the box scrolls internally, Done reachable at 373 px of 393 px |
| `phase-4-no-origin-desktop.png` | 1440×900 | Build with no `VITE_API_ORIGIN`: no chip, no status, no modal — the pre-track client |
| `phase-4-no-origin-phone.png` | 393×852 | Same, at phone width |

Console:

- API-origin build (`VITE_API_ORIGIN=http://127.0.0.1:9`, an origin that refuses
  connections): **1 error**, `net::ERR_UNSAFE_PORT @ http://127.0.0.1:9/trainers/trn_demo/save`
  — the deliberate unreachable origin, and the point of the run.
- No-origin build: **0 errors, 0 warnings**. Its request list is 321 entries, all
  `localhost:5177` static assets plus `audio/music/ranch.ogg` — no API host at all.

Layout was measured rather than eyeballed: at 393×852 `scrollX === 393` (no horizontal
overflow), `lineage` at y 176, `stack` at y 228, `callout` display-none, and the chip
cluster ending at 158 px, above the lineage seat. In landscape the box is 391 px tall in
a 393 px viewport with `overflow-y: auto` and `Done` at 333–373 px.

## Deviations

None. Every changed file is inside the phase's `Touches` paths
(`apps/client/src/cloud/**`, `main.ts`, `app/**`, `hud/**`, `store.ts`), plus
`store.test.ts` as the test of a touched module.

## Notes

- The store change is the only edit to a shared module. `replaceState` is deliberately
  the same instance, and the notification loop was extracted into `notify` so
  `commit` and `replaceState` cannot diverge — 57 lines added to `store.ts`, well
  inside the 12 KB cap.
- `cloudStatusLine` returns eight states. `pending` (a local write is queued) and
  `ahead` (the cloud copy lost the conflict) are the two that say "the cloud copy is
  behind" without saying anything is wrong.
- `MIN_PASSPHRASE_LENGTH` is duplicated in `cloud/config.ts` rather than imported from
  `apps/server`, so the client bundle never reaches into server code. If the server
  constant changes, this one has to follow — the `sync.test.ts` "a short passphrase is
  refused before any request" test is the guard.
- The phone chip cluster needed an exact `max-width` (199 px) to wrap into three rows
  that end above the 176 px lineage seat and stay clear of the score bug at x 213. That
  is a number, not a principle: it moves if a fifth chip joins the cluster.
- `apps/client/src/environment.ts` was not touched — it is the ranch/arena colour
  palette and has nothing to do with configuration.
- Nothing under `packages/` or `apps/server/` needed to change.

## Primary verification

Date: 2026-10-26. By: Conductor primary, independent of the phase agent's report.

### Squash guard

`git log f8139806..HEAD` returned exactly the four commits the report named -
`01df9547`, `c6ea3082`, `1fcd69af`, `8fe0049c` - and each was checked with
`git rev-list --parents -n 1`: all four have a single parent, so the range is
linear with no merge commits, no unreported commits and no user commits. Squash
is safe.

`git diff --name-only f8139806..HEAD` returned 26 paths: 24 under
`apps/client/src/` (the new `cloud/` module tree, `main.ts`, `store.ts` plus its
test, and the `hud` wiring) and the evidence file. All inside the phase's
`Touches`. `git diff --stat f8139806..HEAD -- packages apps/server` is **empty**,
so `packages/sim`, `packages/voxel` and the server are untouched and
`SAVE_VERSION` is still 25 at `packages/sim/src/save/schema.ts:5`.

### Fix spot-check (read directly, not taken from the report)

- **The seam stays synchronous.** `cloud/adapter.ts` (1,147 B) is 31 lines:
  `getItem` and `removeItem` delegate straight to local storage, and `setItem`
  writes through first and *then* calls `note(value)` — and only for `SAVE_KEY`,
  so credentials stored through the same object are never push candidates. The
  local write is deliberately not caught, so a quota failure still reaches the
  store's `onPersistError` exactly as before. That is the composition the brief
  required: the cloud is a side channel, never the read path.
- **The debounce is a real cap, not just a delay.** `cloud/push-queue.ts` keeps
  one `latest` payload, resets the debounce on every write, and starts the cap
  timer **only on the first write of a burst** (`cap ??= schedule(...)`), so a
  player who never stops committing still ships every ten seconds. "Debounced"
  cannot degrade into "never while you are playing".
- **A failed push is a status, not an error state.** `flush()` catches around
  `send` with the comment that the local save is already on disk and the next
  write will try again. FR-8 in one line of code.
- **Unset origin is a construction-time branch.** `cloud/config.ts`'s
  `cloudOrigin(raw)` returns `null` for `undefined` *and* for a blank string,
  and the doc comment states the reasoning: a runtime catch would still pay for
  a failed connection on every boot and would show a status the player never
  asked for. That is AC-11 and NFR-6 by construction.
- **The copy states the limits before the player commits.** The panel's
  paragraph reads: "Pick a passphrase you'll remember — there's no reset, so your
  local save and an export file are the way back. Your trainer id is the
  credential, so keep it somewhere safe: without it and without the passphrase,
  the cloud copy can't be reached." That is the spec's requirement, in warm coach
  voice, before the passphrase is set rather than after it is needed.

### Independent browser verification

Built twice and driven through a real browser against a real server.

**No-origin build** (served at `127.0.0.1:5191`, drafted a starter by a real
click, waited past the debounce): the request log held **exactly four** entries -
the document, the JS bundle, the CSS bundle and the music bed - and **zero**
requests to any API host. Console: `Total messages: 0 (Errors: 0, Warnings: 0)`.
No `[class*=cloud]` element existed in the DOM at all. AC-11 and NFR-6 proven in
the artifact, not just in a unit test.

**API-origin build** (`VITE_API_ORIGIN` set, rebuilt, served at `127.0.0.1:5192`,
with the real `apps/server` running on `:5999` over `:memory:`): the Cloud chip
appeared, the panel opened, and the request log showed
`[POST] http://127.0.0.1:5999/trainers => [FAILED]` — a CORS block, because the
server allows one configured origin and this probe pointed the client at a
different port. That is the correct behaviour for a misconfigured origin, and it
exercised the failure path for real: the panel reported

> Can't reach the cloud — playing on the local save, and the cloud copy is behind.

with no modal, no blocked screen, and the ranch still interactive behind it.
AC-8's "boot succeeds and the player is told the cloud copy is behind" seen live.
The two console errors were the browser's own CORS refusal and its
`ERR_FAILED` companion, both caused by the deliberate mismatch, not by app code.

Also confirmed: the origin is genuinely baked in at build time. A build with
`VITE_API_ORIGIN=https://api.example.test` produced a bundle containing that
literal (`origin baked in: yes`); the unset build produced `index-hyRIghcr.js`
(926,776 B) containing none of it, and the origin-carrying build differed by
20 bytes.

Both probe servers and the API server were stopped afterwards; ports 5191, 5192
and 5999 are free and `git status --porcelain` is clean.

### Independent gates

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Phase verification | `bun run test:phase` | 0 | 3011 pass, 1 pre-existing skip, 0 fail, 267881 `expect()` calls, 3012 tests across 263 files, 84.54 s |
| Static + unit + determinism | `bun run verify` | 0 | typecheck clean in all four workspaces, Biome clean, determinism gate byte-identical for all 27 GLBs + 5 props |
| Build (no origin) | `bun run build` | 0 | `index-hyRIghcr.js` 926,776 B; pre-existing >500 kB advisory only |
| Build (with origin) | `bun run build` | 0 | 926,796 B, origin literal present |

Test arithmetic: 2946 tests / 263 files after Phase 3 → 3012 / 263. The 66 new
tests are the `cloud/` suite, committed and discovered by a bare `bun test`.

Module caps hold with no near-misses introduced by this phase: the largest cloud
module is `cloud/sync.ts` at 11,055 B (1,233 B headroom); `store.ts` grew 6,826 B
→ 7,837 B and `main.ts` sits at 11,626 B, both under 12,288 B. `hud/update.ts`
(12,263 B) remains the tightest file in the client and was not touched.

### Acceptance criteria

| AC | Status | Basis |
| --- | --- | --- |
| AC-4 (a newer cloud save is adopted at boot) | met | `sync.test.ts` adoption test plus the browser run showing boot never waits on the network |
| AC-5 (a burst of autosave writes is one push) | met | `push-queue.test.ts` with an injected scheduler and a request counter; no real timer in the test |
| AC-7 (first sign-in uploads the local save; never overwrites an existing cloud save) | met | `sync.test.ts` both directions; the guarded-adoption assertion is the one that matters |
| AC-8 (unreachable API: boot succeeds, a day completes, status reports the cloud copy behind) | met | `cloud-save.test.ts` day-completion test, plus the live CORS-failure run above with the exact status copy |
| AC-11 / NFR-6 (no origin = zero requests, unchanged behaviour) | met | `cloud-save.test.ts` zero-request test, plus the browser request log holding exactly the four static assets |
| FR-4, FR-5, FR-7, FR-8, FR-11, NFR-1, NFR-2 | met | mapped in the evidence table to named tests; NFR-1 additionally proven by the empty `packages`/`apps/server` diff |

### Notes for the next phase

The one design decision worth carrying forward: `store.ts` gained
`replaceState(state, session)` so a cloud adoption lands in the **same** store
instance rather than a new one, because subscribers, the persist path and the
morning-after ledger all live in that instance. The notification loop was
extracted into a single `notify` closure so `commit` and `replaceState` cannot
drift apart. Phase 5 must not need to touch it.

**Result:** phase accepted. The cloud is a side channel that cannot block a day,
an unset origin means no cloud at all, an unreachable API is a quiet status, and
the client's save schema and the server are untouched.
