# Phase R1 Verification — Review Fixes (F1)

| Item | Value |
| --- | --- |
| Track | `20261026-backend-foundation` |
| Phase | R1 (Review Fixes, finding F1) |
| Branch | `feat/20261026-backend-foundation` |
| Phase base | `f4a7907a` |
| Verification command | `bun test --check --parallel=4 --timeout 120000` |
| Final exit code | 0 |
| Final result | 3038 pass, 1 skip, 0 fail, 3039 tests / 265 files |

## Finding addressed

F1 (High, BLOCK) — `apps/client/src/cloud/api.ts:47-50` declared
`PushReceipt { stored: boolean; winner: number }` while the server returns
`winner: "incoming" | "stored"` (`apps/server/src/saves/store.ts:28-30`).
Both `setStatus` call sites in `sync.ts` (`pushNow`, `uploadLocal`) stored
that string into `{ kind: "synced", at: <number> }`.

## Red run (tests first, source unfixed)

Ran the verification command after updating only the tests/fakes to the wire
shape. It failed at typecheck with 5 errors in 2 files:

- `api.test.ts:54,77` — `{ stored: true, winner: "incoming" }` not assignable
  to `PushReceipt` (`winner: number`); the new union-assertion test
  (`api.test.ts:79`) flagged `Type 'number' is not assignable to type
  '"incoming" | "stored"'`.
- `sync.test.ts:108,432` — fakes returning `"incoming"` / `"stored"` not
  assignable to the old `PushReceipt`.

This reproduces F1: the suite now exercises the real wire shape, which the old
types reject.

## Fix applied

- `apps/client/src/cloud/api.ts` — `PushReceipt` is now
  `{ stored: boolean; winner: "incoming" | "stored" }`.
- `apps/client/src/cloud/sync.ts` — `pushNow` and `uploadLocal` set
  `{ kind: "synced", at: savedAt }` (the pushed payload's own clock, already
  extracted via `savedAtOf`) instead of `result.value.winner`. The
  stored/ahead branching is unchanged — no other behavior change.
- Fakes updated to the string union: `sync.test.ts` default push
  (`winner: "incoming"`), the ahead case (`{ stored: false, winner: "stored" }`),
  `api.test.ts` push body, and the three `cloud-save.test.ts` fetch doubles.

## Green run

`bun test --check --parallel=4 --timeout 120000` → exit 0, 3038 pass,
1 skip, 0 fail across 265 files (the `smoke.test.ts` "RESULT fail" line is an
in-test log of an intentional negative case, not a test failure).

## AC mapping for F1

| Requirement | Verified by |
| --- | --- |
| FR-3/FR-5 — push receipt matches the wire | `api.test.ts` "a push receipt carries the wire's winner union, not a timestamp" parses `{stored:true,winner:"incoming"}` and `{stored:false,winner:"stored"}` bodies to the string union |
| FR-5 — synced stamp is a timestamp after a push | `sync.test.ts` AC-5 case drives `pushNow` against `{stored:true,winner:"incoming"}` and asserts `{kind:"synced", at:104}` (payload's clock) plus `typeof at === "number"` |
| FR-7 — first upload reports the payload's clock | `sync.test.ts` sign-in case drives `uploadLocal` against the wire shape and asserts `{kind:"synced", at:300}` |
| No regression | full suite green (3038 pass / 0 fail) |

## Deviations

None — all changes are within the phase Touches
(`api.ts`, `sync.ts`, `api.test.ts`, `sync.test.ts`, `cloud-save.test.ts`)
plus this evidence file.

## Notes

The client `call<T>` helper performs no runtime validation (body is cast),
so the contract is enforced at the type level; the new tests pin the wire
shape on both sides so a future drift fails loudly at `--check` time and at
runtime via the `at` assertions.
