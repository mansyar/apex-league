# Plan: Live Cup — viewable stepwise tournament

Spec: [spec.md](./spec.md) · Branch: `track/live_cup_20261011`
Type: Feature · Order: mocks first (design gate) → sim (pure logic) → shared
driver → UI flow → gate

Each phase follows workflow.md TDD where logic is pure and ends with a Phase
Verification & Checkpoint gate before moving on.

## Phase A — Screen mocks (design gate, no app code)

- [x] Task: Static screen mocks in the track folder (self-contained
  HTML/CSS, like the arena track's `hud-mock.html`): **bracket HUD**
  (3-column QF/SF/F, slot states: pending/alive/eliminated/player/winner,
  staggered-reveal feel), **coach screen** (rival card, kit picker, tactic
  selector), **give-up modal**, **results screen** (podium/placement +
  reward breakdown) *(4dca029)*
- [x] Task: Iterate mocks with the user toward an AAA-game-grade broadcast
  look (typography, plate/skew language matching the arena's battle HUD,
  motion cues described as annotations) — each screen approved individually
  *(spacing/scaling/header-reveal/crowning iterations → a5d7b28; bracket,
  coach, modal, results all user-approved)*
- [x] Task: Encode approved design decisions (palette accents, plate
  language, reveal motion) as a design-notes addendum in the track folder
  *(design-notes.md)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — user
  sign-off on all mocks *(approved 2026-10-11; [checkpoint: a5d7b28])*

## Phase B — Cup session model in `@apex/sim` (pure, TDD)

- [x] Task: Failing tests — `RoundVerdict`/`CupRoundResult` carry the full
  `BattleResult` (events) for rival pairings; `resolvePairing` stops
  discarding it *(red: 3 fail / 22 pass → green: 25 pass)*
- [x] Task: Implement verdict-carried results *(existing cup tests updated
  for the richer result)* *(eccb2e3)*
- [x] Task: Failing tests — `prepareCup(state)`: returns a cup session
  (bracket + pre-resolved player-independent rival verdicts
  QF2/QF3/QF4/SF2), preserves phase `"cup"`, mutation-pure, deterministic
  from `(day, identity)` *(red: export missing → 8 tests)*
- [x] Task: Implement `prepareCup` (restructures one-sitting `enterCup`)
  *(6554f5c — incl. legacy-equivalence test: rival verdicts byte-identical
  with resolveCup at the same bracket positions)*
- [x] Task: Failing tests — `resolvePlayerMatch(session, loadout, tactic)`:
  resolves the player's current-branch match live; deterministic seed from
  `(day, round, matchup)`; returns `BattleResult` + advanced session;
  `playerSide` accepts loadout **and** tactic (drops the hardcoded
  "balanced") *(red: export missing → 8 tests)*
- [x] Task: Implement player-match resolution + `playerSide`
  parameterization *(72d8578 — default picks reproduce legacy battles
  byte-identically; frozen slot stats honored)*
- [x] Task: Failing tests — `completeCup` (auto-complete after loss:
  remaining player-branch rival matches resolve deterministically; placement
  4/3/2 mapping) and `forfeitCup` (give-up = as-if-lost current round,
  mood +2, no `cupsWon`), and `finalizeCup` (win-path rewards at tournament
  end + phase flip to `"day"`) *(red: exports missing → 8 tests)*
- [x] Task: Implement completion/forfeit/finalize; sim barrel exports
  updated *(91b517e — completion seeds identical with the legacy resolver;
  forfeit verdict carries a null battle)*
- [x] Task: Determinism contract test — same state + same coach picks ⇒
  identical battles/logs across 3 seeded runs; spar/exhibition untouched
  *(8f9c229 — full-run replays identical; pick-sensitivity + spar
  independence guards)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  *(checkpoint: d096b9c — verify green; coverage confirmed on cup.ts/
  machine.ts/index.ts; git note attached; approved by user)*

## Phase C — Shared playback driver extraction (client)

- [x] Task: Extract the playback driver from `spar.ts` (timer chain,
  fast-forward toggle, reduced-motion instant dump, slow-replay fallback,
  step callbacks) into a reusable module; `spar.ts` consumes it with **zero
  behavior change** - all existing spar/HUD tests stay green
  *(0b603cb — playbackDriver.ts + 6 tests; spar rewired via callbacks,
  91 client tests green)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  *(checkpoint: 0b603cb — verify green; spar parity via 91/91 client tests;
  browser smoke deferred to Phase E by user decision)*

## Phase D - Bracket HUD + live cup flow (client, implements the approved mocks)

- [x] Task: Bracket HUD per mock — 3-column QF/SF/F, slot states, staggered
  rival verdicts (300–500 ms), next-player-match highlight; reduced motion =
  instant *(rendering, manual verification at checkpoint)* *(718d00c —
  browser-verified: strict-order reveal, 700 ms stagger, YOUR MATCH highlight,
  solid dome backdrop)*
- [x] Task: Coach screen per mock — rival card (name/species/element/stat
  bars/kit), loadout picker (reuse spar picker rules: 2–4 unique,
  tier-gated locked rows), tactic selector, "Back to bracket" free back-out,
  "Step into the arena" commit *(rendering, manual verification)* *(718d00c —
  browser-verified: scouting report, locked tier rows, 2–4 enforcement,
  free back-out)*
- [x] Task: Arena battle wiring — fight → `resolvePlayerMatch` live →
  swap/staging.cast/battleHud playback of the fresh `BattleResult` → verdict
  stamp → exit to bracket (win) or auto-complete (loss) *(rendering, manual
  verification)* *(718d00c — browser-verified: QF win → walk resumed to SF;
  SF loss → auto-complete → results)*
- [x] Task: Give-up modal + close semantics per mock — free look before
  first fight (chip returns, cup not consumed); confirmation modal after
  commit; forfeit path through `forfeitCup` before persisting *(rendering +
  logic wiring)* *(718d00c — browser-verified: pre-commit close is free;
  post-commit close at SF → modal → forfeit → 3rd-place results)*
- [x] Task: Results screen per mock — champion, placement, reward breakdown;
  rewards shown from `finalizeCup` timing; ranch idle reactions preserved
  (victory bounce / droopy) *(rendering, manual verification)* *(718d00c —
  browser-verified champion run: 1st plate, full reward rows, phase flipped,
  🏆 in the day chip)*
- [x] Task: `main.ts` integration — chip/update semantics, session lifecycle
  in memory, arena-mode HUD suppression during cup battles *(rendering,
  manual verification)* *(718d00c — onFightStart/onStep/onArenaExit mirror
  the spar wiring; chips hidden during battles; onCommit persists the
  endCup flip at the first fight)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  *(checkpoint: 9552e75 — verify green; all six tasks browser-verified live
  incl. a full champion run and a forfeit run; git note attached; approved
  by user)*

## Phase E — Verification gate

- [x] Task: Full gate - `bun run verify` green; manual browser playthrough:
  win path (all 3 arena battles → rewards next day), loss path, give-up
  path, free-look close, reduced-motion pass; evidence recorded
  *(verify green (determinism gate OK); browser evidence: win path — full
  champion run day 63 (1st plate, +1 AP/bond/mood/🏆 in day chip); loss
  path — QF exit → 4th + consolation, SF loss → 3rd + named champion;
  give-up path — forfeit at SF → 3rd; free-look close — chip returns,
  cup unconsumed; reduced-motion pass — fresh save, CTA at ~104 ms,
  instant dump, full cup to results in seconds; solid dome backdrop per
  user preference)*
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

- Diff surface (estimate): `packages/sim/src/{cup.ts, machine.ts, index.ts}`
  + tests; `apps/client/src/{cup.ts, spar.ts, main.ts, hud.ts, style.css}` +
  new `playbackDriver.ts`, bracket/coach/results components + tests; mocks +
  design notes live in `conductor/tracks/live_cup_20261011/`.
- **No save-schema change** (v5 stays); determinism gate untouched; no new
  dependencies.
- Sim dependency insight: the player is bracket slot 1, so only QF2/QF3/QF4/
  SF2 are player-independent and pre-resolvable at entry; player-branch
  matches resolve on demand (post-loss rival continuations resolve at
  auto-complete).
- Spar's pre-resolved spectator model is explicitly unchanged; only the cup
  gains live resolution.
