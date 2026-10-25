# Phase 4 — Visual Verification & Docs Sync

- **Track:** 20261024-postcup-morning-after
- **Phase:** 4 (P4.T1 edge rules · P4.T2 visual evidence · P4.T3 tech-stack note)
- **Date:** 2026-10-25
- **Branch:** `feat/20261024-postcup-morning-after`
- **Base:** `e70926ce` · **Head at evidence time:** `ae1c73e4` (P4.T1 commit)

## Result

**verified** — all phase-4 checks green. Visual evidence captured through the real
dev server (`bun run dev`) driving the actual app: one full champion cup at
1440×900 and one exit cup at 1440×900, then (after clearing the save) one exit
cup and one full champion cup at 393px (iPhone 15 device emulation). Console
clean in both sessions.

## How each state was reached

No save hand-editing and no test-only mock page — every state was reached by
playing the real app through supported seams:

1. Desktop champion: fresh save → drafted Ember Drake → advanced days 1→7
   (feed/rest as AP allowed) → day 7 cup entered via the "Enter Cup" chip →
   quarterfinal, semifinal, final all won via the coach room ("Specials"
   tactic) with playback "Fast-forward" → results screen → "Back to the
   ranch" → title ceremony captured at fixed delays.
2. Desktop exit: continued the same save → advanced days 8→13 → day 14 cup →
   semifinal loss (genuine in-app loss, "Ash-ledger takes the Bronze Cup") →
   results → "Back to the ranch" → exit ceremony captured.
3. Mobile exit: `playwright-cli delete-data` cleared localStorage → fresh
   save on iPhone-15 emulation → days 1→7 → day 7 cup → semifinal loss
   (genuine) → "Back to the ranch" → captured.
4. Mobile champion: advanced days 8→27 (nightly training; Power Lifting until
   the Juvenile ATK cap) → day 28 cup → quarterfinal, semifinal, final won →
   "Back to the ranch" → title ceremony captured.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Unit (targeted) | `bun test apps/client/src/morning-after/derive.test.ts apps/client/src/store.test.ts apps/client/src/scene-logic/morning-after.test.ts` | 0 | 53 pass / 0 fail, 1070 expect calls |
| Unit (full gate) | `bun test --check --parallel=4 --timeout 120000` | 0 | 2629 pass / 1 skip / 0 fail, 130541 expect calls, 207 files |
| Static/format | `bunx biome check apps/client/src/morning-after/derive.test.ts apps/client/src/store.test.ts apps/client/src/scene-logic/morning-after.test.ts` | 0 | 1 formatting autofix applied, re-check clean |
| Verify + build (P4.T1 point) | `bun run verify && bun run build` | 0 | see P4.T1 gate record below (final re-run recorded at bottom) |
| Visual | `bun run dev` (background) + `playwright-cli open http://localhost:5173` / `resize 1440 900` / `open --device "iPhone 15"` + `run-code` drive + `screenshot` | 0 | 4 ceremonies captured (see paths) |
| Visual console | `playwright-cli console` (after desktop run; after mobile run) | 0 | Total messages 2, Errors 0, Warnings 0 — both sessions |

Final gate at phase close (after P4.T2/P4.T3, commit `09853a51`):
`bun run verify && bun run build` — **exit 0**. Type checks clean across
voxel/sim/client; full test suite 2629 pass / 1 skip / 0 fail (130541 expect
calls, 207 files); biome clean (599 files); determinism gate byte-identical
for all six species × three stages plus 5 props; production build succeeded
(308 modules, 894.96 kB JS — pre-existing chunk-size advisory only).

## Screenshots (gitignored under `.conductor/evidence/`)

Desktop (1440×900):

- `.conductor/evidence/20261024-postcup-morning-after/phase-4-exit-ceremony-desktop.png` — exit pose mid-ceremony (warm/red tint, debrief visible)
- `.conductor/evidence/20261024-postcup-morning-after/phase-4-exit-morning-desktop.png` — settled subdued morning, exit tint held through the day
- `.conductor/evidence/20261024-postcup-morning-after/phase-4-exit-tint-cleared-day8-desktop.png` — next morning after night settle: tint cleared, ordinary care copy returned
- `.conductor/evidence/20261024-postcup-morning-after/phase-4-title-ceremony-desktop.png` — title pose mid-ceremony (proud strut, 1 cup)
- `.conductor/evidence/20261024-postcup-morning-after/phase-4-title-glow-desktop.png` — title glow pulse (full-body emissive wash)
- `.conductor/evidence/20261024-postcup-morning-after/phase-4-champion-morning-desktop.png` — settled champion morning, golden tint held

Mobile (393px, iPhone 15 emulation):

- `.conductor/evidence/20261024-postcup-morning-after/phase-4-exit-ceremony-mobile.png` — exit ceremony t≈1.3s
- `.conductor/evidence/20261024-postcup-morning-after/phase-4-exit-glow-mobile.png` — exit glow bloom visible in the panel gap
- `.conductor/evidence/20261024-postcup-morning-after/phase-4-subdued-morning-mobile.png` — settled subdued morning (tint halo + warm sky)
- `.conductor/evidence/20261024-postcup-morning-after/phase-4-title-ceremony-mobile.png` — title pose mid-ceremony (Prestige 1 · 1 cup)
- `.conductor/evidence/20261024-postcup-morning-after/phase-4-title-glow-mobile.png` — title glow pulse through the panel gap
- `.conductor/evidence/20261024-postcup-morning-after/phase-4-champion-morning-mobile.png` — settled champion morning

## Acceptance criteria touched by this phase

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-5 | Champion + subdued morning screenshots at 1440×900 and 393px; console clean | Screenshot paths above; `playwright-cli console` clean both sessions | done |
| AC-6 | Edge tests: evolution collision yields; first-ever forfeited cup → withdrawn, zero amplifiers | `apps/client/src/morning-after/derive.test.ts` (forfeited-cup zero-amplifier case), `apps/client/src/store.test.ts` (evolution-yield full flow incl. debrief gate, reload skip) | done |
| FR-9 | Reload loses ritual gracefully; evolution collision yields (debrief still renders); state never persists past night settle | `store.test.ts` reload/yield/debrief-gate/night-settle tests; `derive.test.ts` forfeit cases; `scene-logic/morning-after.test.ts` NFR-7 cleanup tests | done |
| NFR-7 | No lingering timers; deterministic cleanup | `scene-logic/morning-after.test.ts` — ceremony run to done + dismissed, 64 post-done advances stable, zero setTimeout/setInterval scheduled | done |

## P4.T3 addendum — tech-stack note (write blocked)

The `conductor/tech-stack.md` edit was permission-denied twice in a row by the
operator layer; the note text below is prepared and ready to apply to the
**Client** section, immediately before `## Server` (i.e. as the last dated
bullet of the Client notes). Recording it here so the primary agent can apply
it without re-deriving the content.

```markdown
-   *2026-10-24 — Post-cup morning-after ritual (track
  `20261024-postcup-morning-after`): after every completed cup, the first ranch
  arrival plays a short outcome-aware ceremony derived purely from the
  finalized in-memory cup session plus persisted milestone firsts — **no sim or
  save-schema change** (save stays **v25**). The classification lives in a new
  pure client module `apps/client/src/morning-after/` (`deriveMorningAfter`
  over `title` / `gatekeep` / `exit` / `withdrawn` classes and persisted-first
  amplifiers); the ceremony beats/pose/glow machine lives in
  `apps/client/src/scene-logic/morning-after.ts` with its one-per-day
  client-held ledger in `scene-logic/morning-after-ledger.ts` (minted at cup
  finalize, consumed once on arrival, cleared at night settle, **never
  persisted** — reloads skip the ritual gracefully and evolution-reveal days
  yield to it while the debrief still renders through the existing ticker).
  Ranch (`ranch/state.ts`, `ranch/api.ts`), HUD debrief gate
  (`hud/copy-morning-after.ts`), pet handling and audio care cues read the
  ceremony state; copy is single-sourced in `copy.ts`. No new dependencies;
  module caps respected; the ritual is dt-driven with zero timers.*
```

Per the brief, `docs/save-schema.md` and product docs were **not** touched
(NFR-1 held); the primary may surface the mobile-training observation above in
product docs if desired.

## Deviations

- None beyond the brief for P4.T1/P4.T2. Screenshots live only under
  `.conductor/evidence/` (gitignored, per workflow); only this evidence file
  is committed. For P4.T3: `conductor/tech-stack.md` edit permission-denied
  twice in a row — note text staged in the addendum above instead of applied
  (recorded as the phase's single deviation).

## Notes

- The 393px mobile layout puts large pet-panel/action sheets over the scene;
  the ceremony (pose, glow, day tint) shows through the gap between panels and
  in the sky. This is the honest mobile view — desktop captures are the
  primary visual evidence; mobile captures document that the ritual runs and
  tints at 393px too.
- Reduced-motion jump-cut capture (FR-7): not captured in the browser this
  phase. The reduced-motion schedule is fully pinned by unit tests
  (`scene-logic/morning-after.test.ts` reduced-motion describe: glow-only,
  total 2s). Skipped to keep the phase focused after two full cup runs per
  breakpoint; the unit coverage pins the behavior deterministically.
- Battles were played with the built-in "Fast-forward" playback button and
  "Specials" tactic — both are shipped app features, not test hooks.
- Mobile training note (recorded for the primary agent): "Choose tonight's
  training" costs 1 AP per night and does not persist across nights; the
  Juvenile stage caps ATK growth (Power Lifting and Ring Craft both show
  "ATK capped"). Worth a docs check outside this track's scope.

## Primary verification

- **Date**: 2026-10-25 — **by**: Conductor primary agent (independent)
- `bun run test:phase` → exit **0**, 2629 pass / 1 skip / 0 fail, 207 files
  (42.72 s).
- `bun run verify` → exit **0** (typecheck, Biome, determinism gate
  byte-identical: 6 species × 3 stages + 5 props).
- `bun run build` → exit **0** (pre-existing chunk advisory only).
- Squash guard: `e70926ce..HEAD` holds exactly the four reported commits;
  diff touches only the three test files + this evidence file.
- **P4.T3 resolution**: the primary applied the staged tech-stack note
  verbatim (Client section, before `## Server`) and commits it with the
  phase acceptance; the executor's permission denial is accepted as
  recorded. `docs/save-schema.md` and `product.md` untouched (correct —
  schema unchanged, no roadmap claim).
- Reduced-motion jump-cut browser capture accepted as skipped: the
  schedule is pinned by unit tests; per the workflow's fallback ladder
  this does not downgrade the phase.
- Mobile training observations (nightly 1-AP training cost, Juvenile ATK
  cap) recorded for the primary — potential input for a future
  product/UX track, out of scope here.
- **Result**: phase accepted (T3 completed by primary).
