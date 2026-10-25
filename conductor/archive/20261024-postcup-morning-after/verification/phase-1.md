# Phase 1 Verification — Derivation & Copy (pure logic, TDD)

- **Track**: `20261024-postcup-morning-after` — Post-Cup Morning-After Ritual
- **Phase**: 1 — Derivation & Copy
- **Date**: 2026-10-24
- **Branch**: `feat/20261024-postcup-morning-after`
- **Base**: `6be15b3`
- **Head**: `42e7dc0` (`4a7fbb3` P1.T1, `a161a1d` P1.T2, `42e7dc0` P1.T3; phase
  evidence file left uncommitted per the brief's option)
- **Result**: `verified`

## What was built

Pure module `apps/client/src/morning-after/` — no DOM, no Three.js, no
localStorage, no randomness (NFR-5), no sim changes (NFR-1 — save stays v25:

- `derive.ts` — `deriveMorningAfter(session, preState, postState)` →
  `MorningAfterDerivation | null` (FR-1): null for non-cup input (null
  session, still-live session, un-completed bracket); forfeit (last
  `playerVerdict.battle === null`, the machine's exact fact) overrides every
  class → `withdrawn`; `champion` status → `title` (drawn final crowns per
  the existing results rule); elimination whose last-verdict opponent slot
  carries a `bossId` → `gatekeep` with that id; any other completed loss →
  `exit`. Placement is never read (FR-4 rationale).
- `milestones.ts` — `milestoneAmplifiers(pre, post)` → `Amplifier[]` (FR-4):
  persisted firsts only — `cupsWon` 0→n, `legendTitles` 0→n, `bossDefeats`
  crossing from empty, each newly-gained `claimedTiers` entry — returned in
  the copy priority order (first_title > first_legend_title > first_scalp >
  new_tier; ascending tier within claims). Composed into every derivation.
- `copy.ts` — the single ritual copy table `MORNING_AFTER_COPY` (FR-10),
  the four class debrief lines and four amplifier lines transplanted from
  the brief's approved scaffold; `interpolate` (plain replace-all for
  `{name}`/`{boss}`); `pickDebriefCopy(derivation, context)` applying the
  priority order with `{boss}` degrading to the classifier's boss id when
  no display name is supplied, so no bare braces reach the player.

Sim imports in module sources are type-only (`CupSession`, `GameState`,
`LadderTier`); test files import the sim's value fixture API the way the
established client tests do (`view-models.test.ts` pattern).

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| TDD red (P1.T1.1) | `bun test --check --timeout 120000 apps/client/src/morning-after/derive.test.ts` | 1 | TS2307 `./derive` missing — failing test first |
| TDD green (P1.T1.2) | `bun test --check --timeout 120000 apps/client/src/morning-after/derive.test.ts` | 0 | 8 pass / 0 fail |
| TDD red (P1.T2.1) | `bun test --check --timeout 120000 apps/client/src/morning-after/milestones.test.ts` | 1 | 4 fail (first_scalp, new_tier, multi-first, legend crown) |
| TDD green (P1.T2.2) | `bun test --check --timeout 120000 apps/client/src/morning-after` | 0 | 20 pass / 0 fail (incl. classifier+snapshot composition case) |
| TDD red (P1.T3.1) | `bun test --check --timeout 120000 apps/client/src/morning-after/copy.test.ts` | 1 | TS2307 `./copy` missing — failing test first |
| TDD green (P1.T3.2) | `bun test --check --timeout 120000 apps/client/src/morning-after` | 0 | 34 pass / 0 fail |
| Lint per task | `bunx biome check --write apps/client/src/morning-after` | 0 | clean, fixed formatting only |
| **Phase gate** | **`bun test --check --parallel=4 --timeout 120000`** (via `bun run test:phase`) | **0** | **2554 pass / 1 skip / 0 fail, 201 files — includes `apps/client/src/module-size.test.ts` enforcing the ≤ 12 KB module caps over the new sources** |

## Acceptance criteria

| AC | Evidence |
| --- | --- |
| AC-1 — classifier unit tests: each class, forfeit precedence, non-cup null, gatekeeper by boss id | `apps/client/src/morning-after/derive.test.ts`: "a champion session derives title", "a drawn final (double KO) still crowns — title", "a plain elimination derives exit — placement never read", "a final lost to a plain rival derives exit", "elimination by the authored gatekeeper surfaces the boss id" (`koda` from the sim registry via a promotion-cup session), "forfeit overrides every class — even forfeiting the boss final", "forfeit in an ordinary round is withdrawn", "non-cup input derives null" (null session, `player-turn` live session, un-completed bracket), plus "the finalize's persisted firsts ride along as amplifiers" |
| AC-3 — amplifier tests: each first fires exactly on the qualifying finalize, never on later days; copy overrides class copy | `apps/client/src/morning-after/milestones.test.ts`: first title fires on cupsWon 0→1 and 0→3, later titles silent; first Legend title fires at legendTitles 0→1, a later one silent even next to another title; first scalp fires on `bossDefeats` []→["koda"], later scalps silent; new_tier fires per gained claimedTiers entry, pre-existing/reset-ledger cases silent; a nothing-crossing finalize is silent; multiple firsts return together in priority order (bronze-gate cup, legend-crown overlay); `apps/client/src/morning-after/copy.test.ts`: "each amplifier overrides the class copy with its own line" (one host case per amplifier), "the priority order picks one line from several firsts" (FR-6 single debrief) |
| FR-1 | classifier module + AC-1 cases |
| FR-4 | milestones module + AC-3 cases; no new persistence (snapshot pair only) |
| FR-10 | `copy.ts`+`copy.test.ts`: golden full-table, token placement, two-sentence coach tone, single-source spot-check (ritual lines exist only in the table and its golden test) |

## Deviations

None. Phase Touches respected: only `apps/client/src/morning-after/**` was
created; no store wiring, no sim edits, no config changes.

## Notes

- Determinism: the module contains zero randomness (grep-clean for
  `Math.random`); derivations are pure functions of session facts + snapshot
  pairs.
- An informational shell compound (byte-size listing + `git status` +
  `git log`) was permission-denied and, per the phase rules, was not retried
  or reworked. Nothing it carried is unverified: the 12 KB module caps are
  enforced by `module-size.test.ts` inside the green phase run; task commit
  SHAs come from the commit outputs; all phase work was committed in
  sequence.
- For Phase 2: `deriveMorningAfter` is the pure public surface; the results
  handoff in `apps/client/src/cup/results.ts` (`finalizeCup` +
  `onFinalize`) is the integration seam — no store barrel was registered in
  this phase, per the brief.

## Primary verification

- **Date**: 2026-10-24 — **by**: Conductor primary agent (independent)
- `bun run test:phase` (`bun test --check --parallel=4 --timeout 120000`) →
  exit **0**, 2554 pass / 1 skip / 0 fail, 201 files (141.28 s, within the
  ≤ 150 s budget).
- `bun run verify` → exit **0** (workspace typechecks, tests 65 s uncapped,
  `biome check` clean over 589 files, determinism gate: 18 creature GLBs +
  5 prop digests byte-identical).
- `bun run build` → exit **0** (301 modules; pre-existing >500 kB chunk
  warning only, no new messages).
- Working tree clean except the evidence file; diff `6be15b3..HEAD` touches
  only `apps/client/src/morning-after/**` (Matches Touches, matches report).
- Squash guard passed — the range holds exactly the three reported task
  commits (`4a7fbb3`, `a161a1d`, `42e7dc0`), no merges or foreign commits.
- **Result**: phase accepted.
