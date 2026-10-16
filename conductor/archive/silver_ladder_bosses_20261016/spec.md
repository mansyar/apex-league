# Spec — Silver Ladder & Rival Bosses

**Track ID:** `silver_ladder_bosses_20261016`
**Type:** Feature (Phase 2 — League Depth)
**Status:** Draft
**Date:** 2026-10-16

## Overview

The Bronze ladder landed with an explicit door left open: points bank past
Bronze I, a one-time "Silver awaits" callout fires, and the code says Silver
is Phase 2. This track opens that door and gives the league its first authored
characters. The Bronze→Silver climb becomes a **Promotion Cup** — a weekly cup
whose final rival is a hand-authored **boss** — and Silver's three sub-tiers
climb automatically on points as Bronze does. Two further bosses mark the
Silver journey: a non-blocking checkpoint rival at Silver III and a recurring
apex rival at Silver I. Boss defeats are remembered: a save ledger feeds
callouts, coach lines, and Hall of Fame scalps.

No new voxel content, no new species, no demotion. Battles stay the exam;
bosses raise the stakes of the exam without changing the resolver.

## Decisions (user-confirmed 2026-10-16)

1. **Promotion Cup at the gate.** Once points bank past the Bronze I ceiling,
   the *next cup the player enters* is the Promotion Cup. Losing it changes
   nothing except points banked; the following cup is regular until a
   promotion succeeds.
2. **Silver climbs are automatic on points** (no promotion cups inside
   Silver); thresholds are tuned in a probe/balance task, not fixed here.
3. **3 authored bosses**, one per milestone (placements below).
4. **Bosses are pinned builds** of existing archetypes: fixed seed, absolute
   stats within species legal bounds, hand-authored kit from the existing
   move pool, fixed tactic. Probe-tuned like existing balance work.
5. **No demotion, no decay.** A Silver loss earns its placement points or
   zero — never subtracts, never drops the sub-tier.
6. **Defeat ledger** persists in the save and surfaces as callouts, coach
   lines, and Hall of Fame scalps.

## Boss roster (personas drafted for approval)

| # | Milestone | Name | Archetype / Element | Persona |
|---|-----------|------|---------------------|---------|
| 1 | Promotion Cup final (Bronze→Silver gate) | **Sear Marshal Koda** | Fire drake | A brash drill-sergeant of the minor leagues. "Everyone climbs through me. Nobody's climbed past me yet." |
| 2 | Silver III checkpoint | **Verdant Dame Hesse** | Plant ox | A stoic veteran who has guarded this rung for years. "Show me a plan, not a temper." |
| 3 | Silver I apex rival | **Tide Regent Marlow** | Water axolotl | The calm, untouchable summit of Silver. "The tide does not hurry. It merely arrives." |

Names and personas are editable at spec review; stat/kit/tactic pins are
tuned in the plan's balance task.

## Functional Requirements

### FR1 — Ladder tier model (sim, pure)

- `LadderState` gains a `tier: "bronze" | "silver"` field alongside
  `subTier`. Points remain monotonically increasing.
- `initialLadder()` starts at Bronze III. `subTierFor` becomes tier-aware;
  Silver sub-tiers derive from new `SILVER_THRESHOLDS` (probe-tuned values
  landed as constants with rationale comments).
- `applyCupPlacement` keeps its byte-parity contract with the live CupSession
  path: pure, no RNG, same placement-points table. A promotion cup's
  champion placement additionally flips the tier.

### FR2 — Promotion eligibility (sim, pure, derived)

- Eligibility is a derived predicate, not stored state:
  `promotionEligible = tier === "bronze" && subTier === "I" && points >
  LADDER_THRESHOLDS.bronzeI` (points banked past the Bronze I ceiling).
- The sim exposes the predicate; the client derives HUD copy from it.

### FR3 — Promotion Cup (sim, pure)

- When the player enters a cup while `promotionEligible`, the bracket's
  final rival slot is substituted with Boss 1's pinned build and the bracket
  is flagged `kind: "promotion"` (regular cups: `kind: "championship"`).
- **RNG stream invariant:** substitution happens *after* the existing draw
  sequence completes — no draws added or pruned, so regular-cup brackets for
  existing saves stay byte-identical. The golden stream test
  (`cup.test.ts` "draw stream is stable") must stay green or be deliberately
  re-goldened with a documented reason.
- Promotion cup presentation metadata (banner label, boss intro) is carried
  on the bracket so the client never re-derives it.

### FR4 — Promotion resolution (sim, pure)

- Winning a promotion cup as champion sets `tier: "silver"`, `subTier:
  "III"`, fires a promotion presentation flag on `LadderUpdate`, and banks
  the champion points as usual.
- Losing the promotion cup banks the placement points and changes nothing
  else — the next entered cup is regular (eligibility persists).

### FR5 — Silver sub-tier climbs (sim, pure)

- Silver III → II → I climb automatically when total points cross the tuned
  `SILVER_THRESHOLDS`. Reuses the `climbed` flag path; coach ticker and rank
  plate announce climbs as Bronze does.

### FR6 — Checkpoint boss (sim, pure)

- When `tier === "silver" && subTier === "III"` and Boss 2 has no scalp in
  the ledger, the next entered cup's final rival is Boss 2 (same
  substitution mechanism as FR3, bracket `kind: "championship"` — it is a
  regular cup with an authored final).
- **Non-blocking:** losing to Boss 2 has no consequence beyond points; the
  checkpoint stays offered until beaten.

### FR7 — Apex boss (sim, pure)

- When `tier === "silver" && subTier === "I"` and Boss 3 has no scalp, every
  entered cup's final rival is Boss 3 until defeated.
- After the scalp, final rivals return to the generated pool.

### FR8 — Boss definitions (sim)

- A `BOSSES` registry: id, name, speciesId, pinned stats, move kit, tactic,
  coach quips, intro copy, milestone tag.
- Pinned stats are absolute (not player-relative) and within species legal
  roll bounds, so bosses are legal creatures by construction.
- Kits reuse the existing move pool and equip rules; tactics reuse the
  existing tactic set.

### FR9 — Boss defeat ledger (sim, pure)

- `GameState.bossDefeats: string[]` — boss ids, in defeat order.
- Beating a boss slot in any player cup match appends the id (idempotent).
- The `LadderUpdate`-style result carries a `bossDefeated` presentation flag
  for the callout; coach ticker gains a boss-specific line.

### FR10 — Save v11 (sim)

- Schema v11 adds `ladder.tier` and `bossDefeats`. Migration v10 → v11:
  existing saves map to `tier: "bronze"`, empty ledger. Follows the
  established migration + validator + fresh-start fallback pattern
  (see `docs/save-schema.md` conventions).
- Corrupt/older saves keep the existing notices and fallbacks.

### FR11 — Client presentation (client)

- **Rank plate** shows tier + sub-tier ("Silver II") with tier-appropriate
  styling; progress-to-next line follows the current tier's thresholds.
- **Cup entry chip** reflects reality: "Promotion Cup awaits" when eligible;
  checkpoint/apex boss framing when those finals are pending.
- **Bracket:** boss matches carry a distinct banner label; the Promotion Cup
  bracket gets its own header treatment.
- **Arena:** a signature lower-third intro before each boss match (name,
  persona quip) — reduced-motion aware, no camera choreography, no scene
  changes.
- **Callouts:** promotion, boss defeat (one-time via seenHints dedupe),
  coach ticker lines for climbs and boss wins.
- **Hall of Fame:** lineage entries can show boss scalps earned in that
  career.

### FR12 — Determinism & tests (sim)

- All new sim logic pure and deterministic; boss substitution is a pure
  function of state (no RNG).
- Table-driven tests for: eligibility predicate, promotion win/loss paths,
  Silver threshold climbs, checkpoint/apex substitution and un-substitution
  after scalp, ledger idempotency, v10→v11 migration (success + corrupt
  cases), and bracket-stream stability.
- A probe/balance test (style of `tactics.balance.test.ts`) tunes
  `SILVER_THRESHOLDS` and boss stat pins with before/after reports.

## Non-Functional Requirements

- `bun run verify` green (types, tests, biome, determinism gate). The
  determinism gate is untouched — no voxel changes.
- Test suite stays fast (< 10 s, no I/O, seeded).
- TDD for all sim logic; presentation verified manually per the workflow.
- Style guides and public-function JSDoc conventions apply.

## Acceptance Criteria

1. A fresh save that banks points past Bronze I sees its next entered cup
   branded as the Promotion Cup with Sear Marshal Koda as the final rival;
   winning it lands the creature in Silver III with a promotion ceremony
   callout.
2. Losing the Promotion Cup: points bank, no tier change, next cup is
   regular, the offer repeats.
3. Silver climbs trigger automatically at the tuned thresholds with rank
   plate + coach ticker feedback.
4. At Silver III, the first entered cup's final is Verdant Dame Hesse; at
   Silver I, finals are Tide Regent Marlow until beaten.
5. Boss defeats persist across reload (save v11), appear in callouts, coach
   lines, and Hall of Fame scalps, and un-substitute the apex rival.
6. Existing v10 saves migrate cleanly; corrupt saves hit the existing
   fallbacks; no regular-cup bracket changes for pre-existing saves.
7. `bun run verify` passes; the bracket golden stream test is green
   (or re-goldened with a documented, spec-cited reason).

## Out of Scope

- Gold tier content or any tier above Silver (teaser copy only, if any).
- Promotion cups inside Silver; demotion or inactivity decay.
- New voxel content, new species, or boss-specific visual identity (beyond
  existing archetype rendering).
- Camera choreography or arena scene changes for boss matches.
- Full breeding between retired pairs; prestige perk changes.
- Multiplayer or backend features.
