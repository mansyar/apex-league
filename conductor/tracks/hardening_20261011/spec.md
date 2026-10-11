# Spec — Hardening & Quality Pass (`hardening_20261011`)

**Type:** Chore/Refactor
**Status:** New

## Overview
A pre-content hardening pass over the freshly-landed Phase 1 codebase. The three
upcoming feature tracks (Champion stage, Ladder & Tiers, Retirement/Breeding)
will all stress the same three pressure points — the `main.ts` manual re-sync
fanout, the save migration chain, and duplicated helper logic. This track
collapses those risks, fixes known robustness gaps, and banks small UX/docs
wins. No new gameplay; **strict behavior parity** is the acceptance bar for all
refactors.

## Functional Requirements

### A. Structural refactors (behavior-identical)
- **FR-A1 — Typed store + `commit()`:** New DOM-free typed store module in
  `apps/client/src` (get/set/subscribe). All `main.ts` handlers route state
  changes through `commit(state)`, which performs: persist → `hud.update` →
  `spar.update` → `cup.update` → scene sync/visuals, preserving today's update
  order and per-panel semantics exactly.
- **FR-A2 — Shared migration validator:** Extract
  `validateStateShape(raw, version)` in `packages/sim/src/save/migrate.ts`; the
  six migration entries become pure field-shapers. Also reorder the `Record`
  keys to ascending version.
- **FR-A3 — Dedupe pass:** single canonical `clampCondition` (imported by
  `cupRewards.ts`); one shared reduced-motion predicate module (consumed by
  `spar.ts`, `cup.ts`, `swap.ts`); remove the duplicated creature-condition
  check in `storage.ts` (`:125`/`:135`).
- **FR-A4 — Type-color contract:** Move `ELEMENT_HUE` from
  `apps/client/src/staging.ts` into `@apex/sim` (beside `typeFactor`);
  `battleHud`/`staging` import from the package.
- **FR-A5 — Cup outcome boundary:** `CupOutcome` mixed string/number union
  resolved to `"won" | "lost"` at the machine boundary (`machine.ts`); the
  reward layer receives a clean union only.
- **FR-A6 — Retire vestigial machine paths:** Remove `beginCup`/`endCup`
  (bypassed by `enterCup`); update their tests.
- **FR-A7 — Pin champion constants:** Define
  `CHAMPION_STAT_BOOST {hp:6, atk:4, def:4, spd:2}` in `@apex/sim` (value
  unchanged, unused-by-sim is fine and documented); `staging.ts` consumes it
  instead of hardcoding.
- **FR-A8 — Cup draw tiebreak:** On `double_ko` in `resolvePairing`, implement
  the stated higher-remaining-HP tiebreak using `BattleResult.finalHp`
  (deterministic: exact tie → lower seed index wins). This is the one
  deliberate behavior change; TDD-covered.

### B. Robustness
- **FR-B1:** `saveGame` wraps `setItem` in try/catch; failure surfaces a
  non-blocking HUD notice (coach voice).
- **FR-B2:** `loadGame` validation rejects creatures whose `speciesId` doesn't
  exist in the species catalog (currently only checked as non-empty string).
- **FR-B3:** Reduce/replace the deliberate dead RNG draws in `cup.ts` only if
  stream-stability is preserved — otherwise document (investigate, don't
  force).

### C. UX/Polish
- **FR-C1:** Favicon + `<meta name="description">`, `theme-color`, Open Graph
  tags in `index.html`.
- **FR-C2:** `aria-live="polite"` on the ranch `status-callout`.
- **FR-C3:** Cup panel pacing toggle reusing `playbackSpeed.ts` (parity with
  Spar).
- **FR-C4:** Fix stale comments: `starter.ts:42-43` ("Water locked"), `cup.ts`
  draw-fallback comment now matches implemented rule.

### D. Docs
- **FR-D1:** `docs/save-schema.md` — hand-written, distilled from `schema.ts` +
  `migrate.ts`: current v6 shape, field meanings, migration chain summary,
  "how to add v7" recipe.

## Non-Functional Requirements
- All refactors are behavior-identical except FR-A8; existing test suites must
  pass **unchanged** (except tests for removed FR-A6 paths and new FR-A8
  tests).
- Suite runtime unchanged or faster; no new dependencies.
- New store module is DOM-free and unit-tested with a fake `SaveAdapter`
  (deterministic, <10s suite contribution).
- `bun run verify` green before every commit; styleguides followed.

## Acceptance Criteria
1. Every `main.ts` state mutation path routes through `commit()`; grep shows no
   raw `persist()+update` fanout pairs remain.
2. `migrate.ts` migrations contain no copy-pasted shape validation; all save
   tests (v0→v6 chains) pass.
3. `double_ko` cup pairing resolves by `finalHp` with a seeded test covering
   win/loss/exact-tie.
4. Simulated save-failure (quota throw) shows the HUD notice and does not crash
   the loop; a save with unknown `speciesId` is rejected at load with a
   friendly error, not a downstream throw.
5. `beginCup`/`endCup` gone; `CHAMPION_STAT_BOOST` exported from sim and
   consumed by staging.
6. Favicon/meta present; callout announces via `aria-live`; cup panel exposes
   speed toggle.
7. `docs/save-schema.md` exists and matches `SAVE_VERSION = 6`.

## Out of Scope
- Champion stage implementation, ladder/tiers, breeding (future tracks)
- `scene.ts`/`staging.ts` monolith splits (tracked separately — larger risk)
- rAF-loop consolidation in `staging.ts`; audio; i18n; responsive/mobile pass
- Changing RNG streams or any deterministic digest (artifact gate must stay
  byte-identical)
