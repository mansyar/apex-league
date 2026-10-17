# Technology Stack — Apex League

## Runtime & Tooling
- **Runtime / package manager**: Bun (1.3+). All scripts run through `bun`.
- **Language**: TypeScript, strict mode. Single language across client, server,
  and tooling.
- **Type checking**: `bun check` (script: `"check": "bun check"`). Runs in CI
  and before every commit; `tsc` reserved for emitting `.d.ts` only.
- **Lint + format**: Biome (`biome check --write`). Single tool replaces
  ESLint+Prettier.
- **Tests**: `bun test` (bun:test). Pure-logic suites (battle resolution, sim
  economy, evolution gates) are DOM-free and run in CI; `bun test --check --parallel`
  gates types + tests in one step. *2026-10-10: `--parallel` adopted with the
  voxel fuzz suite partitioned into small files (58s → ~11.5s wall; full test
  leg ~14s, floor-bound by per-seed voxelize CPU — a voxelize-perf follow-up
  track is the accepted path below the original 10s target).*

## Client
- **Build/dev server**: Vite (driven by Bun) — HMR, static output.
- **3D rendering**: Three.js — ranch scene and battle arena.
- **UI layer**: DOM/HTML overlay styled with plain CSS, driven by TypeScript
  state bindings (no UI framework at MVP; revisit if HUD complexity demands
  it). All surfaces are built from a shared imperative broadcast kit
  (`apps/client/src/ui/kit.ts` + `ui/kit.css`) with per-surface CSS files
  (ranch/spar/cup/starter/battle-hud); `ui/element.ts` single-sources element
  glyphs + hues.
- **Responsive layout**: mobile-first breakpoint tiers (base phone,
  ≥480, ≥768, ≥1024, ≥1200) documented in `ui/kit.css`, which also
  carries the fluid type-scale and safe-area tokens; surfaces write
  their own media queries against those widths. Overlays use
  `100dvh`/safe-area insets; arena camera framing is portrait-aware via
  `scene-logic.ts` `arenaFramingAdjust` (TDD'd projection tests).
- **State**: central typed game-state store; deterministic sim core separated
  from rendering so battles can run headless (future PvP/ghosts depend on this).
  *2026-10-10: battle core landed in `@apex/sim/battle` — type chart, damage,
  moves/kits/loadout, action clock, projectile resolver, tactic/temperament
  policy, endings, event log, exhibition helper (DOM-free, seeded, snapshot-
  pure); the client Spar panel consumes it without a framework.
  2026-10-10: combat prep landed — `effectiveStats` (rolled + trained),
  unlock-gated kit slicing with 2-4 loadout helpers, save v4 migration crediting
  6 trained days, spar kit gate/picker, fresh-unlock coach callout.*
  2026-10-11: cup day landed - pure `makeBracket`/`resolveCup`/`applyCupRewards`
  in `@apex/sim` (seeded from day + save, mutation-pure), `enterCup` one-sitting
  resolution in the phase machine, save v5 (`cupsWon`, `lastCupDay` with
  v4→v5 migration), full-screen client cup panel with ~1.5s pacing and a
  droopy-idle early-exit hook in the ranch scene.*
  *2026-10-11: hardening pass landed - the central typed game-state store is
  now real: `apps/client/src/store.ts` (`createGameStore`, `commit(state)` =
  persist → notify hud/spar/cup in fixed order); `main.ts` has no
  per-handler fanout. `saveGame` returns a boolean and never throws
  (save-failure surfaces as a HUD notice). Reduced-motion OS reads
  single-sourced in `apps/client/src/motion.ts` (hardened double-report).*
  *2026-10-11: live cup landed - hybrid-resolution session API in `@apex/sim`
  (`prepareCup` opens a session with the player-independent subtree
  pre-resolved byte-identically to `resolveCup`; `resolvePlayerMatch` resolves
  the player's match live from the picked kit + tactic; `completeCup`/
  `forfeitCup`/`finalizeCup` close it), the shared `playbackDriver` extracted
  from spar (timer chain, speed toggle, reduced-motion dump, slow replay -
  no DOM) now powers both Spar and the cup arena, and the client cup flow
  became DOM broadcast screens (strict-order bracket walk, coaching room,
  forfeit modal, results) with commit-at-first-fight phase bookkeeping.
  No save-schema change (v6 stays); `enterCup` remains as the headless
  one-sitting reference.*
  *2026-10-12: hardening rebased onto the live cup - all store commits flow
  through `commit()` including the cup's `onCommit`/`onFinalize`; the cup's
  double-KO advances the higher-remaining-HP slot (`doubleKoWinner`);
  `finalizeCup` maps placement → outcome at the machine boundary; the
  one-sitting cup panel's pace pill (superseded by the arena fast-forward
  control) and the `beginCup` retirement were conceded to the live-cup
  architecture (`beginCup`/`endCup` restored).*
  *2026-10-12: save-safety & QoL pass — save v7 (`CupSession | null` slot
  riding the save so refresh mid-walk never strands rewards;
  `settings.seenHints` ledger), `loadBoot` distinguishes absent vs corrupt
  saves at boot (corrupt → calm kit-notice banner above the starter screen),
  `SaveAdapter` gains `removeItem` + `clearSave` powers the confirm-gated
  "New game" reset, `renameCreature` (trim / ≤16 cap / empty → species
  default, cup-blocked), and `markHintSeen` drives the persisted onboarding
  callout chain (day-1 AP, day-5 training tier, cup-eve). The cup arena cast
  is now stage-aware (`visualSeedOf(stats, stage)`) so a juvenile fights as
  the same individual the ranch shows.*
- *2026-10-12: Bronze ladder landed — save v8 adds the `ladder` slice
  (`{points, subTier}`) with a fresh-start v7→v8 migration (no backfill;
  live cup session forwarded untouched) and load-time validation of
  points/subTier. `@apex/sim/ladder` keeps the placement model pure:
  champion +3 / runner-up +2 / semifinal +1, automatic climbs through
  Bronze III→II→I at 6/12 points, forfeits and losses earn zero — wired
  into both cup paths (`enterCup` legacy and `finalizeCup` live) and
  forwarded through `advanceDay`. The client surfaces the standing as a
  rank plate in the score bug (progress-to-next-sub-tier, aria-labeled),
  the cup entry chip, a promotion-aware results row, and a coach-ticker
  climb announcement that reuses the hint ledger for the Silver teaser.*
-   *2026-10-12: battle animation overhaul landed (track
  `battle_animation_overhaul_20261012`). Sim side: `BattleEvent` grew
  `stagger`/`knockback` kinds plus an optional `actorKey` (stable side key
  so mirror matches stage correctly); heavy/super-effective blows stagger
  (>= 35% max HP, or super-effective >= 15%, with a 3-tick re-stagger grace)
  and knock melee-range fighters apart (the range shift costs a closing
  action); policy prefers the most cinematic lethal special. The playback
  contract is enriched additively: `PLAYBACK_PHASES`
  (windup/contact/recovery per step kind), reaction kinds
  (glance/stagger/knockback/down), dodge direction, terminal `ko` flags -
  battle outcomes untouched. Client side, all pure and unit-tested:
  `anim.ts` (easing/phase/keyframe-track/pose-composition/spring
  primitives), `choreo.ts` (per-archetype `BodyProfile` body language +
  reaction library), `director.ts` (camera-director decision logic from a
  per-step-kind shot table). Battle presentation is split into four client
  modules: `move-fx.ts` holds the declarative registries - `MOVE_FX`
  (per-move launch choreography, shots, muzzle and arrival bursts;
  point-blank specials replay the launch compressed with a micro-flight so
  every special reads at every range) and `SHOT_LOOK` (per-element shot
  identity) - so new moves and elements are single-entry additions;
  `staging-seed.ts` owns `visualSeedOf` (stat+stage folded to a stable
  look seed); `staging-fx.ts` owns every transient effect (hit flash,
  projectiles, element bursts, floor decals, charge orb) behind ONE
  `EffectLoop` frame scheduler plus a `HitStop` object that is the single
  owner of hit-stop time, so the driver clock and the effect clock can
  never disagree; `staging.ts` stays the driver (creature casting,
  `runStep`, action clock). Shared spar-vs-cup screen logic lives in
  `battleUI.ts` (pure helpers + DOM factories) and GPU teardown in
  `scene-utils.ts::disposeObject3D`.
  `playbackDriver` paces the KO signature (2.5x dilation around
  the terminal blow + a stamp-settle hold). The arena camera is
  broadcast/cinematic (director intents ease between framings; bloom post
  pass, element particles, hit decals, big-hit vignette); the style is a
  saved v9 setting with live mid-battle switching, auto-pinned to broadcast
  under reduced motion.*
-   *2026-10-12: cup engine consolidated (track
  `cup_engine_consolidation_20261012`) — the legacy one-sitting path
  (`enterCup`, `resolveCup`, `runRound`, `playerSide`, `CupResult`/
  `CupRoundResult`) is deleted; the live session path
  (`prepareCup`/`resolvePlayerMatch`/`completeCup`/`forfeitCup`/
  `finalizeCup`) is the sole resolver and `resolvePairing` is
  rival-vs-rival only. Contract goldens (`cup-contracts.test.ts`) now pin
  the draw stream, seed formula, placement table and double-KO tiebreak;
  the temporary parity bridge was removed after proving byte-identical
  behavior. Net −520 LOC; save schema unchanged (no migration).*
-   *2026-10-13: legacy & breeding landed (track `legacy_breeding_20261013`)
  — the sim's first cross-generation seam, pure and unit-tested in
  `packages/sim/src/legacy.ts`: `canGraduate` with the precedence
  `no-creature > cup-phase > not-champion > too-young > eligible`
  (`GRADUATION_DAY = 60`, a direction-only hint from day 55),
  `inheritedFloor` (50% of the parent's effective stat, clamped to the
  species bounds, +1 per stat from the Established line),
  `createInheritedCreature` (never below the floor, warm-bond start at the
  Warm bloodline milestone, seed-reproducible) and the mutation-pure
  `graduate` succession; `lineagePrestige = generation + cupsWon` drives the
  milestones. Save v10 adds the `lineage` slice (`generation` +
  `hallOfFame`) with load-time validation and a v9→v10 migration. The client
  adds the graduation flow (confirm modal → ranch send-off ceremony → egg
  screen → successor hatch) plus the lineage plate, Hall of Fame panel and
  the milestone callouts — the ceremony reuses the evolution machinery and
  is reduced-motion aware. No new dependency; the determinism gate is
  untouched.*

-   *2026-10-17: UI-layer refactor landed (track
  `ui_layer_refactor_20261016`) — the client's three oversized presentation
  modules were decomposed behavior-identically behind golden tests. `hud.ts`
  (1394 lines) became `hud/` (copy.ts = the pure copy engine incl. the hint
  table via `selectHint` and the `statusLine` ticker precedence; plates.ts =
  score-bug/lineage/creature-plate builders + `ladderRead`/`apPipPlan`/
  `conditionDelta`/`statCell` view-models; dock.ts = command dock +
  `trainButtonState`/`pickerEntry`; settings.ts = pref chips + reset modal +
  `prefChipView`/`capturePrefChips`), with `hud.ts` kept as a thin
  `update()` fanout that re-exports the old import surface (main.ts and the
  mock page untouched). `spar.ts` delegates its kit-gate/loadout/stats math to
  `spar/loadout-vm.ts` and the log-toggle mapping to `spar/log.ts`. Arena
  effects split into `fx/` (loop.ts = `HitStop`+`EffectLoop`, fx-data.ts =
  constants + element burst physics + decal/trail params, fx-math.ts = flash/
  arc/pulse/sway/decal curves, shot-geometry.ts = mesh factories, flash.ts +
  decal.ts = pref-gated layers), leaving `staging-fx.ts` (442 lines) as pure
  wiring with the `BattleEffects` seam unchanged. All extracted pure modules
  are golden-tested; DOM wiring stays untested per the workflow's logic-only
  TDD rule. CSS: the kit-namespaced modal block (`kit-modal*`,
  `kit-button-danger`) moved from `ranch.css` to `ui/kit.css` (it is
  consumed by every surface), and two declaration-identical focus rules joined
  the shared `:focus-visible` group — drift-free, proven by stylesheet-rule +
  computed-style baselines. Post-track sizes: hud.ts 467, spar.ts 460,
  staging-fx.ts 447 (out-of-scope cup.ts 876 / scene-logic.ts 812 /
  ranch-motion.ts 548 unchanged).*

-   *2026-10-18: Gold & Legend ladder extension landed (track
  `gold_legend_ladder_20261017`) — the ladder is now four tiers: Bronze
  6/12, Silver 18/24, **Gold 30/36, and the Legend plateau** (no ceiling;
  `subTier` pinned at I). Promotion generalized via a `NEXT_TIER` map —
  a Promotion Cup champion ascends one tier until Legend, which never
  promotes. Save v14 adds the `legendTitles` tally (additive v13→v14
  migration; storage validation accepts all four tiers). Tier rewards:
  `TIER_AP_BONUS` stacks the champion cup bonus at `advanceDay` time
  (Gold champion +1 extra AP = +2 total, Legend +2 = +3 total), applied
  after placement in `finalizeCup` so a gate cup pays the NEW tier's
  bundle — this also surfaced and fixed a latent live-path bug where
  `finalizeCup` never passed the cup kind to `applyCupPlacement`, so
  gate-cup champions had never flipped tiers through the live flow. The
  boss registry is tier-scoped (`BossTier`, milestones repeat across
  tiers): six authored rivals — Koda (Bronze→Silver gate), Hesse (Silver
  III checkpoint), Marlow (Silver I apex), Delmar (Silver→Gold gate),
  Fenn (Gold III checkpoint), Thessa (Gold I apex + Legend gate) — all
  probe-tuned to the FR12 bands (fresh disadvantaged species 0%, ≥35% at
  cap). Client: `ladderRead` emits `tierClass` + a ★ titles segment,
  `tier-name.ts` is the one tier-name map (score bug, entry chip, bracket
  head, results rows), results AP rows are tier-stacked with a
  `★ Legend title N` row, `climbAnnouncement(prev, next)` keys the coach
  ticker on the full standing (catching the Gold I → Legend I flip), and
  the hint ledger gains gold/legend teasers + three gatekeeper scalp
  callouts; the Handbook states four-tier truth.*

## Server
- **Framework**: ElysiaJS on Bun (endpoints: save sync, leaderboard, ghost
  data, anonymous device-ID auth).
- **Database**: SQLite via `bun:sqlite`, accessed through Drizzle ORM for a
  typed schema; schema kept Postgres-migratable.

## Asset Pipeline
- **Creatures and ranch props**: species and scenery defined as versioned JSON
  data ("voxel DNA") - a deterministic **pure-TypeScript** generator (run by Bun
  at build time) builds part-labeled voxel meshes (SDF parts → voxel grid →
  greedy mesh) and exports GLB with a rigid hierarchy contract: named nodes +
  pivots, animated procedurally in three.js (no skinning, no baked clips).
  Ranch prop archetypes (tufts, bushes, landmark trees, rocks, food pile) use
  the same generator and are digested by the determinism gate.
  *2026-10-09 deviation: replaced the originally planned Blender Python
  generator — the part-hierarchy rig makes weight painting unnecessary,
  and pure TS keeps the stack single-language, CI-hash-verifiable, and
  browser-capable for runtime seed variants (e.g. live breeding previews).*
  Generator scripts and DNA specs are checked into the repo; generated
  GLBs are committed, not generated at runtime.
- **Icons**: 2D UI portraits rendered offline from the same GLBs
  (headless three.js render step).
- **Audio** *(audio_foundation_20261017, 2026-10-17)*: CC0 assets bundled
  under `apps/client/public/audio` (no runtime network fetch):
  Kenney impact-sounds / sci-fi-sounds / music-jingles for SFX and verdict
  jingles; OpenGameArt CC0 loops (nihilocrat "Peasantry", XCVG/Ville
  Nousiainen "Fast fight" loop, transcoded to OGG) for the two music beds.
  Every file is mapped in `public/audio/CREDITS.md`. Implementation shape:
  DOM-free `cues.ts` event→cue mapping + gate-checked `player.ts`
  (pure, bun-tested) over an imperative `playCue.ts`/`musicBeds.ts` seam
  (manual-verify tier); mute persists in save v13 (`settings.muted`), sound
  defaults ON with first-gesture unlock; reduced motion swaps calm-mix
  variants for SFX and silences instant dumps.

## Quality Gates
- `bun check` clean, `biome check` clean, `bun test` green — required before
  any commit lands (see workflow.md).

## Deployment (target)
- Client: static hosting (Cloudflare Pages or GitHub Pages).
- Server: single small Bun container (Fly.io or equivalent) — deferred until
  Phase 3 per the roadmap.
