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
- **Scene module layout**: ranch motion is decomposed by machine, not by
  convenience. `apps/client/src/scene-logic/` holds the pure, DOM-free
  machines (`evolution`, `feed`, `framing`, `gait`, `math`, `pet`, `play`,
  `rest`, `stage`, `treat`, `walk`, `wander`, `wind`) behind one stable
  barrel (`scene-logic.ts`); `apps/client/src/ranch/` holds the Three.js
  adapter split into `types`, `state`, `mount`, `mood`, `poses`, `effects`,
  `idle`, `frame`, `api`, and the `motion` composition root. Every module
  stays at or under **12 KB** — `apps/client/src/module-size.test.ts`
  enforces the cap and `apps/client/src/scene-logic.test.ts` pins the barrel
  surface, so a decomposition that quietly re-bloats fails `bun test`
  (ranch_decomposition_20261018).
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
-   *2026-10-18: Dynasty breeding landed (track `dynasty_breeding_20261018`) —
  no new dependencies or stack deviations. Sim additions stay pure: `traits.ts`
  (four canonical lineage traits derived from the highest trained stat),
  `breeding.ts` (pool/pair validation, the dual-parent floor
  `round(0.5*stronger + 0.1*weaker)` + trait/milestone bonuses, one seeded
  `+1..+2` mutation, `graduateWithPair`), and save v15 (additive v14→v15
  migration adds empty `traits`/`parents` to the active creature and every Hall
  record; storage validates both arrays). Client additions are DOM-only:
  `graduation/nursery-vm.ts` (pure selection/preview state) and
  `graduation/nursery.ts` (overlay built from the shared kit, no new palette);
  the seeded preview seed is handed to the sim unchanged, so previewed stats
  are the hatched stats. No per-frame work was added.*
-   *2026-10-18: Release polish landed (track `release_polish_20261018`) — no
  new dependencies. Save v16 is additive: `settings.musicVolume`/`sfxVolume`
  (0–1, default 1.0, strict validation) persist the audio mix; `save/transfer.ts`
  builds session-free exports and validates imports (malformed / future-version /
  invalid reasons, newer files refused, live save untouched on failure), and
  `readRawSave` keeps a corrupt payload downloadable until an explicit reset.
  The audio gate passes an SFX gain to the cue seam and the music beds follow
  their own level within the existing mute contract. Accessibility is shared
  rather than per-overlay: `ui/focus.ts` owns the trap (disabled controls
  skipped, escaped focus recovered, pure wrap rules tested) and
  `body.is-reduced` now carries the saved motion preference to CSS surfaces;
  cup entry/coach/results are focus-managed full screens. No per-frame work was
  added.*

-   *2026-10-18: Ranch decomposition landed (track
  `ranch_decomposition_20261018`) — the two over-cap scene files became
  per-machine modules. `scene-logic.ts` (43.1 KB) is now a barrel over 13
  pure modules (`evolution`, `feed`, `framing`, `gait`, `math`, `pet`,
  `play`, `rest`, `stage`, `treat`, `walk`, `wander`, `wind`); the
  `ranch-motion.ts` closure (39.8 KB) became `ranch/` with an explicit
  `RanchState` object (`types`, `state`, `mount`, `mood`, `poses`,
  `effects`, `idle`, `frame`, `api`, plus the 0.9 KB `motion` composition
  root). Behaviour-preserving: no save-schema, `@apex/sim`, or public-API
  change, and the determinism gate stays byte-identical. The 12 KB
  per-module cap is enforced by `module-size.test.ts` and the barrel
  surface is pinned by `scene-logic.test.ts`; the largest modules are
  `ranch/api.ts` at 9.4 KB and `scene-logic/gait.ts` at 8.3 KB.*

-   *2026-10-19: Learnable move pool landed (track `move_pool_20261018`) —
  every playable species now knows **six** moves (indices 0-1 from birth,
  index 2 at three trained days or on evolution, indices 3-5 at six trained
  days) while a fighter still fields at most four. `knownMoves`/`knownCount`
  replace `tierCount`, and `defaultLoadout` slices the first four, so a
  pre-pool save with `loadout: null` (v15 or earlier) resolves to the same ids
  it always did. Move
  knowledge is **derived, never stored**: `requiredTierDays(stage)` over
  `species.kit` is the only gate table, which is why this track needed no save
  bump (v16 belongs to the audio mix, not the pool; see
  `docs/save-schema.md`). Rival kits are deterministic, not
  authored: `rivalKit` draws four distinct moves from the six using an RNG
  derived from the existing battle/cup seed under a distinct constant, so the
  parent stream is untouched and a fixed seed still fields the same four —
  spar and cup goldens were re-baselined once for that reason (Phase 2).
  Boss kits stay hand-authored, one wider-pool row each, and are re-tuned
  against the probe bands. Client: picker, coaching room, creature detail and
  a Handbook Moves tab all render the six rows from `species.kit`; `move-fx`
  adds bespoke reads only for the heavy finishers (Pyre Lance, Root Quake,
  Maelstrom) while the steady moves inherit element `SHOT_LOOK` plus
  `DEFAULT_FX`. Catalog and gate rules are TDD-pinned; the Phase 5 matrix
  reproduces kit2/3/4 rates byte-identically and the three six-move mirrors sit
  within 4 points of the four-move baseline.*

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
  *2026-10-19 extension (`creature_readability_20261018`): the surface pass is
  still pure TS and still part of the same deterministic pipeline — no new
  dependency, no runtime work. Ambient occlusion is baked per-vertex at mesh
  time (four quantised levels, 0.72 floor, quad triangulation flipped to the
  darker diagonal) and folded into the glTF `COLOR_0` attribute together with
  the per-voxel surface classes (zones + seeded dappling) and the face kit's
  painted features, so the client keeps one unlit-ish Lambert material per
  part and adds no shadow pass; eyes are separate named parts under `head`
  with their own pivots, which is what makes the idle lid a `scale.y` write
  rather than a skinning or morph-target feature. `GENERATOR_VERSION` is 2
  and the committed artifacts/manifests are regenerated from it; the GLB
  budget test is a 320 KiB tripwire (largest shipped artifact 244 KiB), and
  the determinism gate still hashes all nine creature artifacts and the prop
  digest manifest.*
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
  (manual-verify tier); mute persists in save v13 (`settings.muted`) alongside
  the v16 music/SFX levels, sound defaults ON with first-gesture unlock; reduced motion swaps calm-mix
  variants for SFX and silences instant dumps. *(ranch_rituals_20261018,
  2026-10-18: the same gate now carries the care cues — a pure event→cue
  table (`audio/careCues.ts`) over the existing player, with
  `care-feed`/`care-rest`/`care-treat`/`care-play`, `care-pet` and a
  `dawn-chime`, all CC0 and mapped in CREDITS.md. No new dependency and no
  save-schema change.)*

-   *2026-10-20: Evolution threshold discovery landed (track
  `20261020-evolution-discovery-ui`) - save v17 is additive:
  `evolutionKnowledge { juvenile, champion }` records which evolution gates the
  player has seen cleared, and it is save-wide and permanent. `advanceDay`
  compares the creature's stage across `settleCreature` and marks a gate only on
  a real stage change (baby→juvenile sets one, juvenile→champion sets both), so
  a blocked gate or a quiet night never unlocks anything. The v16→v17 migration
  never trusts a pre-existing payload field: it infers from the persisted stage
  (juvenile ⇒ juvenile known, champion ⇒ both, none ⇒ none), which also covers
  veterans mid-ladder. `isValidSaveState` now rejects a missing or non-boolean
  record, so load and import validate the same shape. The panel side is a new
  pure module `apps/client/src/growth.ts` (6.5 KB) that maps the active gate to
  labelled rows and mirrors `evaluateEvolution`'s constants rather than
  restating them; undiscovered gates render digit-free coach copy, discovered
  gates render `current / target`. `apps/client/src/growth-panel.ts` (4.8 KB)
  stamps that view into a `role="group"` section with a shape-distinct glyph
  plus a status word and owns the repaint seam (`createGrowthHost`, which
  remembers the last state, no-ops while closed, and swaps only its own
  children), so `creature-detail.ts` (9.3 KB) keeps layout only and both
  modules stay under the 12 KB cap. `hud.update` calls `creatureDetail.sync` so
  an open panel repaints in place when a settlement resolves.
  `apps/client/src/size-probe.test.ts` pins those three sizes because
  `module-size.test.ts` still scans only `scene-logic/` and `ranch/`. No new
  dependency, no generator or artifact change, and the Hall of Fame surface is
  untouched.*

## Quality Gates
- `bun check` clean, `biome check` clean, `bun test` green — required before
  any commit lands (see workflow.md).

## Deployment (target)
- Client: static hosting (Cloudflare Pages or GitHub Pages).
- Server: single small Bun container (Fly.io or equivalent) — deferred until
  Phase 3 per the roadmap.
