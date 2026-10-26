# ElysiaJS Backend Foundation — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Give the game a server: an ElysiaJS service on Bun that issues anonymous
trainer identities and stores cloud saves in SQLite, deployed as a Docker
container to the owner's Coolify VPS. The client gains a second `SaveAdapter`
backed by that API, so the same save path that already writes `localStorage`
can also write the cloud — pulling once at boot, pushing behind the existing
autosave, and resolving conflicts by `savedAt` without ever blocking play.

## Problem / Motivation

Every career in Apex League lives in one browser's `localStorage`. A player is
asked to invest sixty in-game days per graduation, across generations, and the
entire record — ranch, stable, Hall of Fame, ladder, claimed tiers, pending
eggs — disappears if they clear site data, switch machines, or use a browser
that evicts storage under pressure. There is no account, no server, and no
recovery beyond an export file the player has to know to make.

The blast radius is worse than a lost high score. `transfer.ts` can already
export and import a save, so the data model is proven portable — what is
missing is somewhere to put it. And three Phase 4 items (leaderboards, ghost
data, async PvP) are blocked behind exactly the identity and storage this track
creates, so the game's stated roadmap cannot advance without it.

If this is not solved, the deepest system in the game (legacy: retire, breed,
raise) sits on the least durable storage in the stack.

## Goals & Success Metrics

- **Goal:** A player can carry their ranch to a second device and back, without
  an account, an email address, or a blocked boot when the server is down.
- **Metric:** A save written on device A is present and playable on device B
  after sign-in, with `day`, active creature, stable, Hall of Fame, ladder,
  `claimedTiers` and `pendingRewards` intact; and the game boots and plays to
  completion of a day with the API unreachable.

## Scope

### In Scope

- A new `apps/server` workspace: ElysiaJS on Bun, SQLite via `bun:sqlite` and
  Drizzle, typed schema, migrations.
- Anonymous trainer identity: server-issued opaque ID, player-chosen display
  name, optional passphrase for reclaiming a save on another device.
- Cloud save: pull at boot, debounced push behind the existing autosave,
  `savedAt`-based conflict resolution that preserves the losing copy.
- A `CloudSaveAdapter` in the client implementing the existing `SaveAdapter`
  seam, plus the sign-in / trainer surface and a quiet sync status.
- Adoption of an existing local save on first sign-in.
- Docker packaging and a CI job that builds and pushes an image to GHCR for
  Coolify to pull; a Coolify app with a persistent volume for the database.

### Out of Scope

- Global leaderboards. They need identity and storage to exist first; this
  track creates both and stops.
- Ghost data and async PvP.
- Live PvP.
- Email accounts, OAuth, password reset flows, or any personal data.
- Server-authoritative simulation. The client remains the source of truth.
- Anti-cheat. Deferred until there is a leaderboard worth cheating for.
- Migrating the save schema. The cloud stores the same `SaveData` payload the
  client already writes; `SAVE_VERSION` stays 25.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The server issues an opaque trainer ID on first contact, with no personal data collected and no email required. | must |
| FR-2 | A trainer can set a display name, and a passphrase that allows the save to be reclaimed on another device. | must |
| FR-3 | The server stores exactly one save per trainer, replacing it only when the incoming `savedAt` is newer. | must |
| FR-4 | The client pulls the cloud save once at boot and, when it is newer than the local one, adopts it. | must |
| FR-5 | The client pushes to the cloud behind the existing autosave, debounced so a burst of actions becomes one request. | must |
| FR-6 | A conflict keeps the newer save by `savedAt` and writes the losing copy to a recoverable slot rather than discarding it. | must |
| FR-7 | On first sign-in, an existing local save is uploaded as that trainer's first cloud save. | must |
| FR-8 | When the API is unreachable the game plays exactly as today on the local save, and the sync state is reported quietly. | must |
| FR-9 | A passphrase is stored only as a hash and compared in constant time; a wrong passphrase cannot retrieve a save. | must |
| FR-10 | The server runs as a Docker container that reads its database path and allowed origin from the environment. | must |
| FR-11 | The client ships configured with the API origin and degrades to local-only when it is unset. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | `SAVE_VERSION` stays 25 and no file under `packages/sim/` or `packages/voxel/` changes; the cloud stores the payload the client already produces. |
| NFR-2 | The game is fully playable with the API down, slow, or returning errors; no network call blocks boot or a day. |
| NFR-3 | No secret is committed, logged, or echoed: the passphrase is never logged, and the GHCR token and database path arrive through the environment. |
| NFR-4 | Server routes are covered by tests against an in-memory SQLite database, run inside the existing `bun test` gate with no network and no fixed ports. |
| NFR-5 | The server package obeys the same 12 KB module cap as `packages/sim`, enforced by a guard test with a negative control. |
| NFR-6 | `bun run verify` and `bun run build` stay green, and the existing client bundle's behaviour is unchanged when the API origin is unset. |
| NFR-7 | The Docker image builds from a clean checkout and runs as a non-root user. |
| NFR-8 | The database lives on a Coolify persistent volume so a redeploy cannot destroy player saves. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | A fresh client receives a trainer ID, and a second request with that ID returns the same trainer. | FR-1 |
| AC-2 | Setting a name and passphrase, then reclaiming from a second client with the same passphrase, returns the stored save; a wrong passphrase does not. | FR-2, FR-9 |
| AC-3 | Pushing a save with a newer `savedAt` replaces the stored one; pushing an older one leaves the stored one untouched. | FR-3 |
| AC-4 | A client whose cloud save is newer than its local save adopts the cloud save at boot. | FR-4 |
| AC-5 | A burst of autosave writes produces a single push, proven by a request counter. | FR-5 |
| AC-6 | A conflict keeps the newer save and the older copy is still retrievable from the recoverable slot. | FR-6 |
| AC-7 | Signing in with a local save present uploads it, and the round trip returns an equivalent state. | FR-7 |
| AC-8 | With the API unreachable, boot succeeds, a day can be played, and the sync status reports the cloud copy is behind. | FR-8 |
| AC-9 | `docker build` succeeds, the container serves the API, and it reads its database path from the environment. | FR-10, NFR-7 |
| AC-10 | The CI job builds and pushes an image tagged with the commit SHA to GHCR. | FR-10 |
| AC-11 | With no API origin configured, the client behaves exactly as before this track. | FR-11, NFR-6 |

## Edge Cases

- **Server unreachable at boot.** Boot proceeds on the local save; the pull is
  retried on the next boot or the next successful push. Never a modal.
- **Both saves changed since the last sync.** The newer `savedAt` wins and the
  loser is preserved — a player who played offline on a laptop and then on a
  desktop keeps both copies rather than silently losing one.
- **Clock skew.** `savedAt` is the client's clock, so a device with a badly set
  clock can win or lose wrongly. The preserved loser is the mitigation; the
  server records its own `receivedAt` alongside for diagnosis.
- **First sign-in with a local save and an existing cloud save.** The cloud
  save is not overwritten by the adoption path: adoption only applies when the
  trainer has no stored save yet. Otherwise normal conflict resolution runs.
- **Passphrase forgotten.** No reset exists. The local save and the export file
  are the recovery path, and the UI says so before the passphrase is set.
- **Trainer ID lost (cleared storage, new device).** The ID is the credential;
  without it and without the passphrase there is no recovery. Stated plainly in
  the UI rather than implied.
- **Concurrent pushes from two devices.** Last write by `savedAt` wins at the
  server; the losing client re-pulls on its next boot.
- **Save payload too large.** The server rejects an oversized body with a clear
  status rather than truncating it; the client keeps playing locally.
- **Future-version save pushed by a newer client.** The server stores it
  opaquely; a client on an older version that pulls it refuses the payload and
  keeps its local save, matching the existing import behaviour.
- **Database missing or unwritable at container start.** The process fails
  loudly at boot rather than serving a game whose saves silently go nowhere.

## Dependencies

- **Tracks:** none. The release funnel (`20261026-release-funnel`) is merged,
  so the client already deploys and there is a known origin to allow.
- **External:** the owner's Coolify VPS and a DNS record for the API subdomain;
  a GHCR push token for CI. The track is complete and verifiable in the
  repository without the VPS being reachable, with the live deploy recorded as
  a configuration-complete step to be confirmed on the first Coolify deploy.

## Open Questions & Assumptions

- **Assumption:** the API lives on its own subdomain with Coolify terminating
  TLS, so the server allows exactly one configured origin and the client on
  `pages.dev` can call it. The exact hostname is an environment value, not a
  committed literal — the release funnel removed the last hardcoded hostname
  from this repository and this track must not reintroduce one.
- **Assumption:** CI pushes an image to GHCR and Coolify pulls it, so deploy
  cadence belongs to Coolify rather than to a workflow step. The CI job's
  responsibility ends at a pushed, SHA-tagged image.
- **Assumption:** one save per trainer is enough. Multi-slot saves and save
  history are a later concern; the recoverable conflict slot is the only
  history this track keeps.
- **Question (deferred):** whether the trainer ID should be shown to the player
  as a short, human-readable code so it can be written down. Deferred because
  the passphrase already covers the cross-device case.
- **Question (deferred):** whether leaderboards need the server to own the
  ladder state. That decision belongs to the leaderboard track, and this track
  deliberately keeps the server as storage.

## References

- `conductor/product.md` — Phase 3 "Content & Meta": the ElysiaJS backend line.
- `conductor/tech-stack.md` — `## Server`: ElysiaJS on Bun, SQLite via
  `bun:sqlite` through Drizzle, schema kept Postgres-migratable.
- `packages/sim/src/save/storage.ts` — the `SaveAdapter` seam, `SAVE_KEY`,
  `loadBoot`'s absent/corrupt/healthy distinction.
- `packages/sim/src/save/schema.ts` — `SaveData` and its `savedAt` field.
- `packages/sim/src/save/transfer.ts` — the existing export/import path, and
  the stated fallback when there is no account.
- `docs/save-schema.md` — the current v25 schema reference.
