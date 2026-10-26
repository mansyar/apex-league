# ElysiaJS Backend Foundation — Implementation Plan

**Branch:** `feat/20261026-backend-foundation`
**Base:** `main` @ `5d7bf207`

> Phase states: `pending` → `in_progress` → `verified`. Only the primary agent
> writes this file.

---

## Phase 1: Server workspace & schema

- **Goal:** `apps/server` is a fourth workspace that typechecks, lints, obeys a
  12 KB module cap, serves a health route, and creates its SQLite schema from a
  committed migration — all proven by tests that need no network and no port.
- **Depends on:** none
- **Covers:** NFR-4, NFR-5, NFR-6
- **Touches:** `apps/server/**`, `package.json`, `bun.lock`, `tsconfig.base.json`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **P1.T1: Workspace scaffold** — covers: NFR-6
  - [x] **P1.T1.1: Add `apps/server` with a `check` script and a tsconfig extending the base, so `bun run check` picks it up with no root change beyond the workspace glob**
  - [x] **P1.T1.2: Add the runtime dependencies (`elysia`, `drizzle-orm`) and confirm the client bundle is byte-identical afterwards**
- [x] **P1.T2: Schema and migrations** — covers: NFR-4
  - [x] **P1.T2.1: Write the Drizzle schema for trainers and saves, with a migration runner that applies committed SQL to a fresh database**
  - [x] **P1.T2.2: Prove the migration is idempotent and that a missing or unwritable database path fails loudly at boot**
- [x] **P1.T3: Test harness and health route** — covers: NFR-4, NFR-5
  - [x] **P1.T3.1: A route-level test harness that builds the app against an in-memory SQLite database, so tests never bind a port**
  - [x] **P1.T3.2: `GET /health` reporting the schema version it applied**
  - [x] **P1.T3.3: A module-size guard for `apps/server` with a negative control, matching the sim's 12 KB cap**

---

**Result:** verified
**Checkpoint:** `e6fbab89`
**Evidence:** conductor/tracks/20261026-backend-foundation/verification/phase-1.md

---

## Phase 2: Trainer identity

- **Goal:** A client can obtain a trainer ID, set a display name and passphrase,
  and reclaim its save on another device with that passphrase — and a wrong
  passphrase retrieves nothing.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-9, NFR-3, AC-1, AC-2
- **Touches:** `apps/server/src/identity/**`, `apps/server/src/app.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **P2.T1: Trainer creation** — covers: FR-1, AC-1
  - [x] **P2.T1.1: Failing tests: a fresh request yields an opaque ID, and a second request with that ID returns the same trainer**
  - [x] **P2.T1.2: Issue and look up trainer IDs; no personal field is collected or accepted**
- [x] **P2.T2: Name and passphrase** — covers: FR-2, FR-9, AC-2
  - [x] **P2.T2.1: Failing tests: set a name and passphrase, reclaim with the right passphrase, and confirm a wrong one returns nothing**
  - [x] **P2.T2.2: Hash the passphrase with a salted slow hash and compare in constant time**
  - [x] **P2.T2.3: Assert the passphrase never appears in a log line or an error response** — covers: NFR-3

---

**Result:** verified
**Checkpoint:** `7b17d0a1`
**Evidence:** conductor/tracks/20261026-backend-foundation/verification/phase-2.md

---

## Phase 3: Cloud save API

- **Goal:** One save per trainer, replaced only by a newer `savedAt`, with the
  displaced copy preserved and retrievable; oversized bodies refused rather than
  truncated.
- **Depends on:** Phase 2
- **Covers:** FR-3, FR-6, AC-3, AC-6
- **Touches:** `apps/server/src/saves/**`, `apps/server/src/app.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **P3.T1: Push and pull** — covers: FR-3, AC-3
  - [x] **P3.T1.1: Failing tests: a newer push replaces the stored save; an older push leaves it untouched and reports which one won**
  - [x] **P3.T1.2: Implement push/pull with `savedAt` comparison and a server-side `receivedAt` recorded for diagnosis**
- [x] **P3.T2: The recoverable loser** — covers: FR-6, AC-6
  - [x] **P3.T2.1: Failing test: after a conflict the displaced save is still retrievable from its own slot**
  - [x] **P3.T2.2: Keep exactly one displaced copy per trainer, replaced on the next conflict**
- [x] **P3.T3: Payload limits** — covers: FR-3
  - [x] **P3.T3.1: Failing test: an oversized body is refused with a clear status, and a future-version payload is stored opaquely rather than parsed**

---

**Result:** verified
**Checkpoint:** `2551ee9a`
**Evidence:** conductor/tracks/20261026-backend-foundation/verification/phase-3.md

---

## Phase 4: Client cloud adapter

- **Goal:** With an API origin configured, a client pulls at boot, pushes behind
  the existing autosave, adopts an existing local save on first sign-in, and
  plays exactly as today when the API is unreachable. With no origin
  configured, behaviour is unchanged.
- **Depends on:** Phase 3
- **Covers:** FR-4, FR-5, FR-7, FR-8, FR-11, NFR-1, NFR-2, NFR-6, AC-4, AC-5, AC-7, AC-8, AC-11
- **Touches:** `apps/client/src/cloud/**`, `apps/client/src/main.ts`, `apps/client/src/app/**`, `apps/client/src/hud/**`, `apps/client/src/store.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **P4.T1: The adapter** — covers: FR-11, NFR-1, AC-11
  - [x] **P4.T1.1: Failing tests: with no origin configured the adapter is a no-op, and `SAVE_VERSION` is still 25**
  - [x] **P4.T1.2: `CloudSaveAdapter` implementing the existing `SaveAdapter` seam over `fetch`, with the origin read from build-time configuration**
- [x] **P4.T2: Boot pull and adoption** — covers: FR-4, FR-7, AC-4, AC-7
  - [x] **P4.T2.1: Failing tests: a newer cloud save is adopted at boot; an existing local save is uploaded on first sign-in; adoption never overwrites an existing cloud save**
  - [x] **P4.T2.2: Wire the pull into the boot path ahead of the first render**
- [x] **P4.T3: Debounced push** — covers: FR-5, AC-5
  - [x] **P4.T3.1: Failing test: a burst of autosave writes produces exactly one push, proven by a request counter**
  - [x] **P4.T3.2: Debounce behind the existing autosave rather than adding a second write path**
- [x] **P4.T4: Degrade and report** — covers: FR-8, NFR-2, AC-8
  - [x] **P4.T4.1: Failing tests: with the API unreachable boot succeeds, a day completes, and the status reports the cloud copy is behind**
  - [x] **P4.T4.2: A quiet sync status and a trainer surface (name, passphrase, sign-in) with the no-reset and lost-ID limits stated plainly**
  - [x] **P4.T4.3: Confirm no network call can block boot or a day** — covers: NFR-2

---

**Result:** verified
**Checkpoint:** `aa548c5e`
**Evidence:** conductor/tracks/20261026-backend-foundation/verification/phase-4.md

---

## Phase 5: Container, image pipeline & Coolify

- **Goal:** A multi-stage Dockerfile builds a non-root container that serves the
  API and reads its database path and allowed origin from the environment; CI
  pushes a SHA-tagged image to GHCR; the README documents the Coolify app and
  its persistent volume.
- **Depends on:** Phase 4
- **Covers:** FR-10, NFR-3, NFR-7, NFR-8, AC-9, AC-10
- **Touches:** `apps/server/Dockerfile`, `apps/server/.dockerignore`, `.github/workflows/server-image.yml`, `README.md`, `conductor/tech-stack.md`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **P5.T1: The image** — covers: FR-10, NFR-7, AC-9
  - [x] **P5.T1.1: Multi-stage Dockerfile on a Bun base, running as a non-root user, with the database path and allowed origin from the environment**
  - [x] **P5.T1.2: Prove `docker build` succeeds and the container answers `GET /health`**
- [x] **P5.T2: Image pipeline** — covers: FR-10, NFR-3, AC-10
  - [x] **P5.T2.1: A workflow that builds and pushes `ghcr.io/<owner>/apex-league-server:<sha>` behind the same verify gate, authenticating with the workflow token and printing no secret**
  - [x] **P5.T2.2: A committed test pinning that the image job is gated on `bun run verify` and that no `run:` body interpolates a secret**
- [x] **P5.T3: Coolify documentation** — covers: NFR-8
  - [x] **P5.T3.1: README section: the Coolify app, the persistent volume for the database, the environment variables, and the warning that a redeploy without the volume destroys every cloud save**
  - [x] **P5.T3.2: A dated `conductor/tech-stack.md` note recording the server host, the image pipeline and the persistent-volume requirement**

---


**Result:** verified - CORS, the non-root image, the GHCR pipeline and the Coolify docs all landed. Two blockers were cleared by the primary: the image was built and run (uid 1000, `/health` 200, preflight 204, foreign and lookalike origins refused, named volume writable) and the `conductor/tech-stack.md` note was applied verbatim, along with the stale Server-deferred bullet it contradicted.
**Checkpoint:** `9d024444` (code) and the tech-stack commit that follows it
**Evidence:** conductor/tracks/20261026-backend-foundation/verification/phase-5.md

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 5
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
