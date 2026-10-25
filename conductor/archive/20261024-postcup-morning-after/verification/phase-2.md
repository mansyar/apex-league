# Phase 2 — Ceremony Machine & Poses

- **Track:** `20261024-postcup-morning-after` — Post-Cup Morning-After Ritual
- **Phase:** 2 — Ceremony Machine & Poses
- **Date:** 2026-10-25
- **Branch:** `feat/20261024-postcup-morning-after`
- **Base:** `11961d8` → **Head:** `dc71600`
- **Result:** `verified`

## What landed

- **P2.T1 — the ritual machine (`f60954f`)**: `scene-logic/morning-after.ts`
  (pure, dt-driven class-adaptive schedule: title 8.5 s, gatekeep 5.5,
  exit 4.5, withdrawn 3.0 — every beat a 1/16 s multiple; the amplifier's
  overlay beat = 1 s ≤ +1 s; reduced motion collapses everything to the
  2 s glow jump-cut) + `morning-after-ledger.ts` (client-held mint /
  due / take / night-settle day ledger) + store glue (`pendingMorningAfter()`,
  `takeMorningAfterArrival()` with the evolution-yield gate; the ledger
  never touches the persisted save — v25 untouched, NFR-1) + barrel
  exports (robot-pinned surface extended).
- **P2.T2 — poses & tint (`dc71600`)**: `scene-logic/morning-after-poses.ts`
  (the six-archetype temper table over the existing pose vocabulary —
  chest-forward bearing, in-place prance, tail carriage, swagger roll,
  graded sag; the pure tint latch set/retire) + `ranch/poses.ts` writers
  (`applyMorningAfterPose`, `applyMorningAfterIdle` — tint never owns the
  gait) + `ranch/frame.ts` leg (ceremony owns the pose while active; the
  settle edge latches the day tint; the frame's retire check clears it;
  other ceremonies keep advancing silently beneath; pet overlay gated
  out during the ceremony) + `ranch/state.ts` fields.
- **P2.T3 — reduced-motion jump-cut**: machine-covered from `f60954f`
  (schedules ≤ 2 s, no arrival/pose phase ever emitted, stance held from
  frame one, amplifier surfaces inside the 2 s window; tests in
  `morning-after.test.ts` suite 3) — the adapter rides the same writers
  and is pinned by `ranch/frame.test.ts` ("holds the outcome pose from
  the very first frame": head lifted + emissive glow on frame one under
  `begin(..., true)`). No separate adapter commit needed.

## Deviations (recovery)

- **Adoption of recovered work:** the P2.T1 machine, ledger, tests, and
  store glue were recovered uncommitted from crashed attempt 0 (provider
  HTTP 502); this attempt ran the full suite green (2580 pass / 0 fail)
  and style/type gates BEFORE committing them as `f60954f`.
- **Attempt-1 blocker, resolved:** attempt 1 stopped `blocked` — its
  first and only shell call was denied (`permission.rejected`,
  "Permission denied: shell"). The operator confirmed an environment
  artifact (a prompt-time approval timeout, not a policy denial); attempt 2 reran the same plain
  commands successfully. The one command shape still denied: piping
  (`2>&1 | tail`) is treated as a second command by the policy — plain
  invocations were used throughout instead.
- **`cup/results.ts` untouched:** the allowed one-line deviation was
  unnecessary — the store-side finalize-adjacency handoff (`setSession(null)`
  captures the session; the next `commit` derives across it) mints the
  ritual without touching the cup ladder's file.
- **Adapter day-push:** the frame's tint retire reads `s.day`, which the
  app layer pushes down explicitly (the `lastConditions`-cast route was
  rejected as dishonest runtime plumbing); the setter's wiring is
  integration glue (Phase 4/5). The retire contract is tested directly
  (`retireMorningAfterTint` unit tests + the frame test's explicit call).

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit (full) | `bun test --check --parallel=4 --timeout 120000` | 0 | 2580 pass, 1 skip, 0 fail, 202 files (29.6 s) — run BEFORE adopting attempt 0's work; rerun at phase close |
| typecheck | `bun run check` | 0 | voxel 90 / sim 147 / client 376 files clean |
| style | `bunx biome check <phase files>` | 0 (after `--write` safe fixes: import order + formatting only) | no logic changes applied by the formatter |
| unit (T2 slices) | `bun test --check apps/client/src/scene-logic/morning-after-poses.test.ts apps/client/src/ranch/{morning-after,frame}.test.ts ...` | 0 | 31 pass over machine-pose/barrel/size/frame files |

## Acceptance criteria (this phase: AC-2)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-2 | Schedule within class caps | `scene-logic/morning-after.test.ts` suite "class-adaptive schedule": totals 8.5/5.5/4.5/3.0 inside 8–10/5–6/4–5/3 windows; amplifier exactly +1 s (≤ cap+1) | ✅ |
| AC-2 | Dismiss early | `morning-after.test.ts` "player intent dismisses politely": outcome latches "dismissed", glow fades monotonically from where release began, terminal glow 0; dismissal outside a run is a no-op | ✅ |
| AC-2 | No same-day replay | `store.test.ts`: take-once (second take null), next-day commit cannot revive; a stale player-turn session drop mints nothing | ✅ |
| AC-2 | Idle tint set on arrival, cleared at night settle | `scene-logic/morning-after-poses.test.ts` (latch table exact: title strut 1; gatekeep 0.8 / exit 0.5 / withdrawn 0.3 droop; retire same-day no-op, later-day clear) + `ranch/frame.test.ts` (settle edge latches; retired latch writes every move back to rest) | ✅ |
| FR-7 (T3) | Reduced-motion jump-cut ≤ 2 s, pose held, no travel/leap/spin | `morning-after.test.ts` suite 3 (per class: no arrival/pose phase, stance from frame one, ≤ 2 s, amplifier surfaces; dismissal cuts to done) + `ranch/frame.test.ts` first-frame held pose | ✅ |
| FR-9 (yield) | Evolution-reveal day → no ceremony start, debrief derivation stays banked | `takeMorningAfter(ledger, day, yields=true)` returns null, day consumed, pending kept; `takeMorningAfterArrival` gates on `evaluateEvolution` (`store.test.ts` suite 5) | ✅ |
| NFR-1 | Ledger/handoff never persist | `store.test.ts`: every adapter write string lacks "morningAfter" | ✅ |
| NFR-4/5 | No new rigs/GLBs, no randomness in the machine path | `git show dc71600/f60954f` (code + tests only); deterministic expectations throughout | ✅ |

- One machine-level yield guard also tested: `begin` while a ceremony
  runs is a no-op; the drive path survives a dt spike of 0.5 s (clamped;
  scheduled beats cross in order).
- **AC-5 visual deferral:** the Playwright screenshot acceptance
  (champion + subdued mornings at 1440×900 and 393 px wide, clean
  console) is Phase 4's dedicated checklist per the approved plan — its
  evidence lives in `phase-4.md`. The machine/adapter behaviors AC-2
  pins are all unit-verified here.

## Attempt history

1. **Attempt 0 (recovered):** wrote the machine/ledger/store glue +
   tests; crashed on a provider 5xx before verification; work left
   uncommitted in the tree.
2. **Attempt 1:** blocked on the first shell call (permission artifact,
   operator-confirmed environment issue); evidence file recorded the
   block honestly; no work adopted.
3. **Attempt 2 (this):** ran the full gate over attempt 0's recovered
   work (green), committed it as `f60954f`; wrote `morning-after-poses`
   failing-first, then the implementation + ranch adapter + frame leg
   (`dc71600`); refreshed this file.

## Notes

- Farm harness reduced-motion honored: the jump-cut is machine-emitted
  (`morningAfterSchedule(cls, amplified, reducedMotion)`), the adapter
  passes `s.reducedMotion` at the ceremony's start glue, and the frame
  test pins the held first frame.
- The ceremony machine's drive is the single pose authority while
  active; the day tint's weighted idle composes only head, tail, and
  body scale (never the legs), so the normal idle keeps walking.

## Primary verification

- **Date**: 2026-10-25 — **by**: Conductor primary agent (independent)
- `bun run test:phase` → exit **0**, 2605 pass / 1 skip / 0 fail, 205
  files (28.90 s).
- `bun run verify` → exit **0** (typecheck, uncapped tests, Biome clean,
  determinism gate: 18 creature GLBs + 5 props byte-identical).
- `bun run build` → exit **0** (>500 kB chunk warning pre-existing only).
- Squash guard: `11961d8..HEAD` holds exactly `f60954f` + `dc71600` — no
  foreign commits; diff restricted to `scene-logic/**`, `ranch/**`,
  `store.ts` (+ its tests, + track evidence) per the phase Touches.
- Recovery deviations adopted as recorded; adapter-side day-push wiring
  explicitly deferred to the integration phases noted below.
- **Result**: phase accepted. Carry-over for Phase 3: wire the
  `takeMorningAfterArrival` call site (first-arrival detection in the app
  glue) and the adapter's day-push / night-settle path noted above.
