# Review: ElysiaJS Backend Foundation

- **Track:** `20261026-backend-foundation`
- **Type:** `feature`
- **Branch:** `feat/20261026-backend-foundation`
- **Range:** `5d7bf207793c7a43df6e111ee2a81619c63f527b..e0d34db9`
- **Date:** `2026-10-26`
- **Verdict:** `PASS`

## Summary

Five phases verified with green gates, but the reviewer found one real client↔server contract break: the client types the push `winner` as a number while the server sends `"incoming" | "stored"`, so the synced status timestamp is wrong against the real API and every unit test masks it with a numeric fake. Nothing else blocks. Fix the type, derive the timestamp from the pushed payload's own clock, and make the fakes use the wire shape.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| typecheck | `bun run check` | pass | all 4 workspaces clean |
| test | `bun run test:phase` | pass | 3037 pass, 1 skip, 0 fail, 3038 tests / 265 files |
| determinism | `bun run gate:determinism` | pass | 27 GLBs + 5 props identical |
| lint | `bunx biome check` | fail (pre-existing, out of scope) | `apps/client/src/ranch.css:1429` noDescendingSpecificity; file untouched by this track |
| format | `bunx biome check conductor/.../metadata.json` | pass | after CRLF normalization |
| typecheck | `bun run check` | pass | see above |
| build | `bun run build` | pass | 314 modules, pre-existing chunk advisory |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P2.T1 | `identity/routes.test.ts`, `id.test.ts` | covered |
| FR-2 | P2.T2 | `passphrase.test.ts`, `trainer.test.ts`, `routes.test.ts` | covered |
| FR-3 | P3.T1 | `saves/store.test.ts`, `saves/routes.test.ts` | covered |
| FR-4 | P4.T2 | `cloud/sync.test.ts`, `cloud-save.test.ts` | covered |
| FR-5 | P4.T3 | `cloud/push-queue.test.ts` | covered |
| FR-6 | P3.T2 | `saves/store.test.ts` | covered |
| FR-7 | P4.T2 | `sync.test.ts` guarded adoption | covered |
| FR-8 | P4.T4 | `cloud-save.test.ts` + live CORS-failure run | covered |
| FR-9 | P2.T2 | Argon2id + decoy verify + sentinel tests | covered |
| FR-10 | P5.T1/T2 | Dockerfile + live run + `server-image.test.ts` | covered |
| FR-11 | P4.T1 | `cloud/config.test.ts` + no-origin browser run | covered |
| NFR-1 | P4.T1 | empty `packages/` diff, SAVE_VERSION 25 | covered |
| NFR-2 | P4.T4 | 5s timeout, background pull, side-channel adapter | covered |
| NFR-3 | P2.T2/P5.T2 | sentinel + spyOn sweep, env-only token test | covered |
| NFR-4 | P1.T3 | in-memory `app.handle` tests, no port | covered |
| NFR-5 | P1.T3/P5 | module-size guards both workspaces | covered |
| NFR-6 | P4.T1/P5 | verify+build green, byte-identical no-origin bundle | covered |
| NFR-7 | P5.T1 | uid 1000 live, clean-checkout build | covered |
| NFR-8 | P5.T1/T3 | named volume writable, README warning | covered |
| AC-1 | P2.T1 | create + second GET identical | covered |
| AC-2 | P2.T1 | reclaim + wrong-passphrase refusal | covered |
| AC-3 | P3.T1 | newer replaces, older `stored:false` at 200 | covered |
| AC-4 | P4.T2 | newer cloud adopted at boot | covered |
| AC-5 | P4.T3 | burst = one push via counter | covered |
| AC-6 | P3.T2 | displaced retrievable with savedAt | covered |
| AC-7 | P4.T2 | first sign-in upload, never overwrite | covered |
| AC-8 | P4.T4 | boot+day with unreachable API, quiet status | covered |
| AC-9 | P5.T1 | live `/health`, env paths, uid 1000 | covered |
| AC-10 | P5.T2 | SHA-tag push job, pinned tests | covered (repo; first run pending) |
| AC-11 | P4.T1 | zero requests, no cloud DOM | covered |

## Findings

### Critical

- none

### High

- **F1 — Push receipt `winner` type contradicts the wire**
  - **File:** `apps/client/src/cloud/api.ts:47-50`
  - **What:** `PushReceipt` declares `winner: number`, but the server returns `winner: "incoming" | "stored"` (`apps/server/src/saves/store.ts:28-30`, confirmed live: `{"stored":true,"winner":"incoming"}`). `sync.ts:171` and `:204` then store that string into `{kind:"synced", at: <number>}`.
  - **Why:** Against the real API the synced status holds a string where a timestamp belongs. All unit tests mask it by faking `winner` as the numeric `savedAt`, so the suite never exercises the wire shape.
  - **Fix:** Change `PushReceipt` to `{stored: boolean; winner: "incoming" | "stored"}` and set synced status from the pushed payload's own clock (e.g. `{kind:"synced", at: savedAt}`) in both `pushNow` and `uploadLocal`; update fakes to return the string union.
  - **Requirement:** FR-3/FR-5
  - **Test gap:** Add an `api.test.ts` case asserting a real server-shaped body parses to the string union, and a sync test driving `pushNow` against that shape asserting `status()` is `{kind:"synced", at:<savedAt number>}`.

### Medium

- none

### Low

- none

## Overrides

- none

## Plan compliance

Every phase has Result, Checkpoint and Evidence. All 15 tasks marked [x] were implemented and verified. The diff stays within the union of phase Touches (plus recorded deviations: `tech-stack.md` product-doc correction, `Dockerfile.dockerignore` filename, `cors.ts` added to close the Phase-4 CORS gap). No task silently dropped. Large-review strategy used: 63 files / ~6165 insertions reviewed per-phase then cross-phase.

## Out of scope

- `apps/client/src/ranch.css:1429` Biome `noDescendingSpecificity` — pre-existing, file untouched by this track, left alone.
- AC-10 first workflow run — configuration-complete in repo, pending first Coolify/main push by design.

## Debt

- none — the single High finding goes to the fix phase below.

## Doc sync

`complete` at review time — product.md roadmap note, tech-stack server note, README container section all applied before review. Post-fix sync will be `updated` only if the fix changes docs.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 0 | 0 | 0 |
| 2 | PASS | 0 | 0 | 0 | 0 | 1 |

## Round 2

Re-reviewed fix range `f4a7907a..HEAD`. F1 resolved: `PushReceipt.winner`
is `"incoming" | "stored"`, both sync sites stamp the payload's `savedAt`,
tests pin the wire shape. No new findings. Full suite green per
`verification/phase-R1.md` (3038 pass / 0 fail).
