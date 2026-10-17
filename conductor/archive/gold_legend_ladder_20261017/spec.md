# Spec: Gold & Legend Ladder Extension

**Track ID:** `gold_legend_ladder_20261017` · **Type:** Feature · **Status:** new

## Overview

Complete the product's ladder promise (Bronze → Legend) by extending the tier
system above Silver: a Gold tier (III→I) with three authored gatekeeper bosses,
a Legend capstone tier entered by beating the Gold I apex in a promotion final,
and small tier-gated cup rewards. Save-safe (v13 → v14 additive migration),
draw-stream-preserving (boss substitution stays post-draw).

## Background

- `packages/sim/src/ladder.ts` currently stops at Silver I — `subTierFor`
  explicitly documents "there is no Gold tier"; a "Gold teaser" coach line
  fires at Silver I.
- `packages/sim/src/bosses.ts` holds 3 authored bosses (Koda / Hesse / Marlow);
  `bossForCup` returns null above Silver I. The registry and the
  post-draw `substituteFinalBoss` pattern are proven and extendable.
- Save is at v13 (`packages/sim/src/save/schema.ts`); the load validator
  actively rejects `tier: "gold"`.

## Functional Requirements

### 1. Ladder tiers (sim: `ladder.ts`)
- Extend `LadderTier` to `"bronze" | "silver" | "gold" | "legend"`.
- Gold sub-tiers III/II/I at thresholds **30 / 36** points (uniform +6
  spacing: Bronze 6/12, Silver 18/24).
- At Gold I with points banked past 36, the next cup becomes the
  **Legend Promotion Cup**; beating its final's substituted gate boss
  promotes to **Legend**.
- Legend is a single plateau tier — no sub-tiers. Cups continue; a Legend
  championship increments a **`legendTitles`** tally (glory, shown on the
  lineage plate). No demotion anywhere (existing rule preserved).
- The Silver I "Gold teaser" coach line becomes real Gold progression; a new
  Legend teaser fires at Gold I (reusing the hint ledger).

### 2. Authored gatekeepers (sim: `bosses.ts`) — 3 bosses, proven pattern
- **Gold promotion gate** — substituted into the Promotion Cup final when
  Silver I promotion-eligible (mirrors Koda's role for Bronze→Silver).
  Blocking: lose = stay in Silver.
- **Gold III checkpoint** — non-blocking, substituted into a regular Gold cup
  final (mirrors Hesse).
- **Gold I apex / Legend gate** — appears non-blocking in regular Gold I
  finals (mirrors Marlow), and becomes the **blocking Legend gate**
  substituted into the Legend Promotion Cup final when Legend-eligible.
- Personas drafted original (names, quips, elemental kits) reusing the 3
  existing species — new species is out of scope. Substitution stays
  **post-draw** (`substituteFinalBoss` pattern) so draw-stream goldens and
  save-compat are untouched; scalps record in `bossDefeats`.

### 3. Tier rewards (sim: `cupRewards.ts`)
- Gold cup win: **+1 extra AP** next day (champion win bonus becomes +2 total).
- Legend cup win: **+2 extra AP** (+3 total) **and +1 `legendTitles`**.
- Loss/forfeit rewards unchanged; applies on the live cup path
  (`finalizeCup`).

### 4. Save schema v14
- `ladder.tier` domain extended; new `legendTitles` counter (default 0).
- Additive v13→v14 migration; load-time validation accepts `gold`/`legend`
  (today's validator actively rejects them — the negative test is re-pinned).

### 5. Client surfaces (manual-verify tier)
- Rank plate/score bug renders Gold/Legend standings and Legend titles; cup
  entry chip, results rows, and coach ticker announce climbs/promotions;
  Coach's Handbook ladder-rules copy updated to the four-tier truth;
  reduced-motion behavior unaffected.

## Non-Functional Requirements

- All sim logic TDD'd (success + failure cases), deterministic, suite stays
  fast (< 10 s target).
- Existing golden cup draw-stream tests remain byte-identical.
- `bun run verify` green before every commit; commit style + git notes per
  `conductor/workflow.md`.

## Acceptance Criteria

1. Points climbing Silver I → Gold III→I works; the Legend promotion cup at
   Gold I promotes via the apex gate boss.
2. All three new bosses appear at the right cups with correct substitution
   and scalp ledger entries.
3. Tier rewards apply exactly at Gold/Legend champion placements and nothing
   else.
4. A v13 save migrates to v14 with zero data loss; legacy pre-ladder saves
   still load.
5. Rank plate, entry chip, results, ticker, and handbook reflect the new
   tiers correctly on the ranch and in cups.

## Out of Scope

- New species/elements (separate track), breeding, Legend sub-tiers, rival
  persona expansion, spectator mode, server/cloud, economy rebalancing beyond
  the specified bonuses.
