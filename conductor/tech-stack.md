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
-   *2026-10-25 — Mobile layout pass (track `20261025-mobile-layout-pass`): the
  UI kit gains two width tiers (phone ≤767.98px with 40px touch floors,
  tablet 768–1023.98px) plus an orientation-gated landscape-short block used
  by `kit.css` and `ranch.css`; ranch panels become mutually exclusive on
  phone widths via `:has()`; dock collapse is a pure client-held session
  seam in `apps/client/src/hud/dock-collapse.ts` (collapsed by default on
  phone widths only, nothing persisted — save stays **v25**); cup, battle,
  spar and the secondary surfaces are adapted inside their existing
  stylesheets; the measurable bar is recorded as UX Principle 8 in
  product-guidelines.md. CSS-only adaptation except that one small module;
  no new dependencies; no sim or save-schema change.*

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
  *2026-10-20 extension (`20261020-branching-evolution-champion-forms`): earned
  champion forms need no new geometry or artifacts. Each branch carries an
  `accentHue` in the sim catalog, and the client writes one near-white
  `material.color` multiplier per mesh at build time (`branchTint` /
  `applyBranchTint`, threaded through the ranch rebuild path and
  `FightCasting`/`CastInfo` for the arena). Vertex colours keep the coat and AO,
  `legacy` is never tinted, and the count of meshes, materials and draw calls
  is unchanged, so the nine GLBs and the determinism gate stay byte-identical.*
  *2026-10-21 extension (`20261021-electric-species-line`): a fourth archetype
  (`storm_hound`) ships three stage artifacts, taking the gate to twelve
  creature GLBs — the nine pre-existing ones regenerate byte-identical. The
  archetype is authored in the same template → seeded DNA → SDF → voxel →
  mesh pipeline, with a proportion budget calibrated on a 200-seed × 3-stage
  audit-lattice sweep; the branch forms of the reward line stay accent tints,
  so no further geometry is committed.*
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

- **2026-10-20 (track `20261020-detail-modal-tabs`):** The partner-details
  modal is now three pages — Stats (stat rows + context), Growth (the gate
  section), Moves (the kit) — behind one shared tab controller. New
  `apps/client/src/ui/tabs.ts` owns the tablist contract (`role=tablist`/`tab`/
  `tabpanel`, ids `<prefix>-tab-<i>`/`-panel-<i>`, `aria-controls`/
  `aria-labelledby`, roving tabindex, ArrowLeft/Right with wrap, Home/End,
  `is-outline` on inactive tabs); the Coach's Handbook was migrated onto it and
  its own tab block deleted. `creature-detail.ts` uses a pinned shell
  (`.creature-detail-box`, anchored to the top, same 4-row grid and
  `min(86dvh, 720px)` cap as `.handbook-box`), so only `.detail-panel`
  scrolls and the header and tab strip stay put when a shorter page is picked;
  the selected tab is marked
  by a filled plate, heavier weight and an inset bar, never colour alone. `open`
  always lands on Stats, `sync` keeps Growth current from the remembered state
  and repaints it on re-entry. No save change, no new dependency, no animation;
  `creature-detail.ts` is 10,818 B against the 12,288 B cap.

- `2026-10-20` - **Client module decomposition** (`20261020-client-decomposition`):
  the client's eleven over-cap production modules were split along the seams they
  already mixed, with every original file kept as the same public surface. Composition
  moved out of `main.ts` (25,204 → 8,690 B) into `app/{scene-sync,audio,arena,screens,
  hud-screen,screen-deps,runtime}.ts`, preserving the boot and `store.subscribe` order.
  The HUD became `hud/{types,shell,update,hints}.ts` plus one module per plate and per
  copy domain; `scene.ts`, `staging-fx.ts` and `orbit-camera.ts` became facades over
  `scene/{types,dressing,pet,frame}.ts`, `fx/{projectiles,bursts,charge}.ts` and
  `camera/{types,presets,input,shake,rig}.ts`. The cup, spar, graduation and dev-harness
  modules split into `cup/screens/`, `spar/`, `graduation/` and `mock/`. No save change,
  no dependency change, no rendering or copy change; the determinism gate is unchanged.
- `2026-10-20` - **Client size guard, whole tree** (`20261020-client-decomposition`
  Phase 5): `apps/client/src/module-size.test.ts` now walks every `.ts`, `.tsx` and
  `.mts` file under `apps/client/src` recursively and fails on anything over 12,288 bytes,
  reporting each offender as `hud.ts - 15121 B (2833 B over the 12288 B cap)`, largest
  first, under a header naming the cap and a footer naming the exemptions. The walk
  follows linked folders too and measures `.ts`, `.tsx` and `.mts`; the only exemptions
  are co-located `*.test.*` suites and the Vite shim `vite-env.d.ts`, so there is no allowlist by
  name. The interim four-file `size-probe.test.ts` from `20261020-evolution-discovery-ui`
  is retired. A self-cleaning negative control builds an oversized `oversized.tsx` in an
  OS temp folder, asserts the guard rejects it, and removes the folder in a `finally`,
  so the rule itself is tested rather than only the clean tree and a killed run cannot
  leave an offender behind. Modules near the line: `battleHud.ts` 12,064 B,
  `staging.ts` 11,640 B, `graduation/nursery.ts` 11,613 B.
- `2026-10-20` - **Training programs and form** (`20261020-training-programs-form`):
  the single training focus became four catalog programs - Power Lifting (ATK, DEF
  trickle), Endurance Circuit (HP, DEF), Sprint Work (SPD, ATK) and Ring Craft (ATK,
  DEF, plus mood and bond on a paying night). A paying night costs 10 energy and needs
  30 energy before recovery; a sick or starving night pays nothing and costs nothing.
  Every third trained night also adds +1 to the program's trickle stat, both capped at
  +6, and `TrainingResult` gained `"exhausted"`. `form.ts` derives a tier from
  `0.6*mood + 0.4*bond` (sharp >= 65, steady 40-64, flat 20-39, sluggish < 20), pins a
  partner under 80 health to sluggish, and applies an ATK-only delta (sharp +1,
  steady 0, flat -1, sluggish -2, ATK floored at 1); SPD is deliberately untouched
  because a single SPD point flips initiative. `battleStats` is the single seam between
  `effectiveStats` and the resolver: the owned spar side, the cup entry snapshot, the
  coach room, the spar prep card and the Training tab all read it, so a displayed ATK
  cannot disagree with the fight. Save v18 replaces `trainingFocus` with
  `trainingProgram` (hp to endurance, atk/def to power, spd to sprint). No dependency
  change; `handbook.ts` split into `handbook/{common,chart,ladder,moves,raising}.ts` to
  stay under the 12,288 B cap.
- `2026-10-21` - **Type affinity drift & prestige perks** (`20261021-affinity-drift-prestige-perks`):
  save v20 adds an additive `affinity: Element | null` to the active creature and
  `RetiredRecord` — v19→v20 stamps `null` with no backfill, and load/import validation
  rejects a secondary equal to the primary or an unknown element. Breeding gains a seeded
  15% drift roll (own salted RNG constant) that attaches the other parent's element as a
  secondary affinity; same-element parents never roll, and the nursery preview reads the
  same roll so previewed = hatched. The resolver's incoming-only cancel-to-neutral rule
  collapses an ×2-vs-primary + ×0.5-vs-secondary matchup to ×1 — rivals and bosses never
  carry secondaries, so boss win-rate bands are unchanged. `lineagePerks` gains two
  cumulative milestones: Refined Blood (prestige ≥ 7) raises the stronger-parent
  inheritance floor to 0.55, and Champion Stable (prestige ≥ 9) grants +1 max AP for the
  hatchling's first 5 in-game days (derived from hatch-day data, no extra save field) and
  widens the mutation band to +1..+3 via a milestone-gated extra draw that keeps
  pre-perk RNG streams byte-identical. The client surfaces the roll in the nursery
  preview, a dual-element crest on the plate and detail modal, a coach ticker drift
  callout, and Handbook docs; `creature-detail.ts` was slimmed by extracting
  `detail/kit-rows.ts` to hold the module cap. No new dependency; the determinism gate
  is untouched.
- `2026-10-21` - **Electric species line** (`20261021-electric-species-line`): a fourth
  species (`electric_hound`, storm hound) ships as the first reward line — a fast-striker
  SPD specialist with six kit moves plus two signature specials written against the
  existing effect vocabulary, and two champion branches whose forms are accent tints over
  the stage meshes. Acquisition is a pure gift egg: the Storm Gift is granted once when a
  non-forfeit cup finalizes at Silver or above (`stormGiftClaimed`), and the egg has
  `affinity: null` with no drift draw, so the species is always electric. Save v21 adds
  the claim flag and `giftEgg`, with a linear migration. Generated rival pools take an
  optional species list; `prepareCup` widens the field to the reward line only from Silver
  up, keeping every Bronze bracket byte-identical to the pre-track draw. The client needed
  no species special-casing — the handbook's Moves page iterates the whole catalog, and
  ranch/plate/detail resolve `archetypeId` — aside from a phone-only handbook reflow
  (wrapping tabs, two-row move lines) that a 393 px pass exposed. No new dependency; the
  gate now hashes twelve creature GLBs, all byte-identical.
  *Review round 1 (same track):* the grant now delivers an egg instead of a flag.
  Save v22 adds `pendingGift` - the granted species plus the roll seed - so the
  egg survives a reload, the nursery can preview the exact individual, and the
  hatch rolls that same seed (`stormGiftPreview` / `hatchGiftEgg`); the hatch
  archives the outgoing partner in the Hall of Fame before the hound takes the
  ranch. A v21 save that had already claimed the gift receives the egg it was
  promised through the v21 → v22 migration. The client gained a Storm Gift card
  (`apps/client/src/gift.ts`): a ranch chip that shows only while an egg waits,
  a card that previews the rolled stats, and a reward row on the cup results
  screen. The species catalog now carries an explicit `rewardFromTier` per
  species, so the rival pool reads the contract instead of the locked-species
  array; breeding creates any known species through the unchecked seam, so a
  hound pair breeds a hound while the starter gate stays shut. The storm hound
  gained the same boundary/budget/determinism fuzz partitions as the other
  archetypes, and the two heavy face tests were split per archetype so their
  20 s budgets hold again. No new dependency.
- `2026-10-22` - **Stable & partner reserve** (`20261022-stable-partner-reserve`): the
  ranch keeps one partner and every other pet the player owns waits in the stable.
  Two linear save steps: v23 adds `ageDays` to the creature (the pet's own age - the
  world day used to be the effective age) with a v22 → v23 migration that stamps the
  world day on the active pet, and v24 adds `state.stable` with a v23 → v24 migration
  that stamps an empty stable. The growth gates (juvenile, champion, graduation) read
  the pet's own age, and only the active pet is settled at night, so a pet waiting in
  the stable neither ages nor decays. The sim seams are pure and consume no RNG:
  `packages/sim/src/stable.ts` (`sendToStable` / `bringToRanch` - free, instant,
  lossless, refused during a live cup by the day-phase lock), `graduateFromStable`
  in `legacy.ts`, and the gift hatch that installs the hound in the stable and leaves
  the ranch pet in place. The client gained the Stable chip and modal
  (`apps/client/src/stable.ts`), an age row in the partner-details modal, a gift card
  that says the hound waits in the stable, and a graduation screen that offers the
  waiting pets as successors. No new dependency; no new voxel artifacts; the
  determinism gate still hashes twelve creature GLBs, all byte-identical. Gate on the
  branch head: `bun run check` clean (voxel 71, sim 102, client 309 files), 2,323 tests
  pass / 1 skip / 0 fail across 173 files, `biome check` clean on 503 files,
  `bun run build` green, and the visual pass re-run at 1440x900 and 393x852 with a
  clean console.
  *Review rounds (same track):* round 1 closed the gaps between the spec and
  what shipped - a waiting pet can now be renamed from the stable modal
  (`renameStablePet` in `packages/sim/src/stable.ts`, a pure seam with the
  same trim/clamp and `cup-phase` refusal as `renameCreature`, and a rename
  control in `apps/client/src/stable-rename.ts`), the Stable chip stays
  visible while the stable is empty so the modal's empty state is reachable,
  the growth panel calls the pet's own age "Age", and `evaluateEvolution`
  dropped the day argument it no longer read. FR-8 was narrowed to the
  delivered successor options (a stashed pet or a starter); the pending gift
  is a pure gift with no inherited floor, so it waits in the stable like any
  other pet. Round 2 dressed the rename editor in the house kit (the field
  mirrors `.creature-name-input`, the row mirrors `.creature-name-edit`, and
  the pencil wears the house's own `rename-button` class so the phone tier's
  44 px floor reaches it). The final gate: 2,323 tests pass / 1 skip / 0 fail,
  the largest client module 12,263 B against the 12,288 B cap, and the visual
  pass at 12 flows / 154 assertions, console clean.

- `2026-10-22` - **Sim & voxel size guards + save-migration split**
  (`20261022-sim-voxel-size-guard`): the 12 KB module cap now covers
  `packages/sim` as well as `apps/client`, and `packages/voxel` gets its own
  24 KB cap — a voxel module is one hand-authored creature model, so the
  client's "a module that has stopped owning one concern" rationale does not
  describe them; none exceeds it today (largest `axolotl.ts` 20,598 B).
  `packages/sim/src/module-size.test.ts` and
  `packages/voxel/src/module-size.test.ts` mirror the client guard: a
  recursive byte-size walk, no name allowlist, only `*.test.*` exempt, and a
  self-cleaning negative control that proves each guard can fail. Six sim
  modules were over 12 KB and were split along the seams they already had:
  `save/migrate.ts` 40,587 → 1,370 B (the 24 versioned steps moved to one
  module each under `packages/sim/src/save/migrations/`, composed in order by
  that folder's barrel), `battle/clock.ts` 20,933 → 2,798 B, `save/storage.ts`
  20,271 → 4,520 B, `legacy.ts` 17,229 → 1,970 B, `breeding.ts` 16,930 →
  1,839 B, `cup/session.ts` 12,661 → 1,150 B. No behaviour change, no
  save-schema change (`SAVE_VERSION` stays 24), no dependency change, no
  existing test edited; the determinism gate is unchanged.

- `2026-10-23` - **Earth & wind species line** (`20261023-earth-wind-species-line`):
  the roster reaches one species per element. Two species join as tier rewards -
  `wind_falcon` (**Zephyr Falcon**) unlocks at Gold, `earth_tortoise` (**Basalt
  Tortoise**) at Legend - each with a full three-stage lifecycle, champion branch
  forms (Squall Diver / Aerie Warden, Landslide Ram / Rampart Keeper) and an
  eight-move pool (six kit rows plus two signatures) on the existing effect
  vocabulary. The one-time Storm Gift generalizes into a per-tier league reward
  record: save v25 replaces `stormGiftClaimed` / `pendingGift` with `claimedTiers`
  plus a `pendingRewards` queue (the v24 → v25 step maps the old boolean and egg
  onto the Silver claim slot and the queue head), `grantLeagueRewards` pays every
  tier the ladder has reached exactly once on a non-forfeit finalize, and the
  hatch stays a pure egg (affinity null, no drift RNG draw, preview equals
  hatch). Two voxel archetypes join the registry (`falcon`, `tortoise`) with
  proportion budgets, face plans, stage signatures and fuzz suites; the
  determinism gate now hashes eighteen creature GLBs, all byte-identical - the
  twelve pre-existing ones unchanged. The lifecycle is proven end to end for
  both reward species (finalize → queue hatch → care nights → champion branch
  → clock-driven cup win) and the visual pass covers ranch, nursery, handbook,
  detail, coaching and battle HUD at desktop and iPhone 15 widths with a clean
  console.

- `2026-10-24` - **Test suite speedup** (`20261023-test-suite-speedup`): the
  phase test leg drops 206 s → 53 s via two levers. The `test_phase` workflow
  command runs the suite under `bun test --check --parallel=4 --timeout 120000`
  (a deliberate 4-worker cap: the dev machine runs ~3 projects at once, and the
  measured worker sweep showed a cap only costs speed on heavy files, so seeds
  must shrink too). Every voxel fuzz suite now slices its seeds: a fixed,
  documented first-quarter smoke slice runs in the PR gate (89 of 303 seeds)
  while the full lists run nightly through the new `test:fuzz` script
  (`APEX_FUZZ_SWEEP=full bun test --check --parallel … packages/voxel/src/fuzz`,
  POSIX-prefix form, runtime-proven cross-platform) wired as one `Fuzz sweep`
  step in nightly.yml beside the determinism gate. Assertions are never
  weakened — the sweep restores exactly the sliced expects (+92); slices are
  deterministic and documented in each suite header; the three module-size
  guards' negative controls are proven to fire under parallel workers. Final
  numbers: phase leg 53 s (target ≤ 150 s), `bun run verify` 77 s (≤ 120 s),
  full nightly sweep 41 s, CI unchanged.
- `2026-10-24` - **Battle choreography for all creatures** (`20261024-battle-choreography-all-creatures`):
  every arena archetype now has an authored identity on all three choreography layers. The
  `BodyProfile` table in `choreo.ts` covers all six archetypes (`storm_hound`, `falcon`,
  `tortoise` were riding `DEFAULT_PROFILE`) and gains three attack-character knobs
  (`windupMult`/`recoilMult`/`strikeMult` - amplitude only; timing and the sim-agreeing
  slide/dash stay global pins defended by the new `battle-timing.test.ts`). `move-fx.ts`
  is split into a barrel over `move-fx/looks.ts` (per-element `SHOT_LOOKS`: Earth = new
  non-luminous `boulder` geometry + `dust` trail, Wind = stretched high-spin flat-arc
  teardrop, electric promoted to an explicit fallback-equal row) and `move-fx/moves.ts`
  (per-element `MOVE_FX` tables; `quake_stomp`/`cyclone_dive` got bespoke finishers) with
  the export surface proven unchanged. The battle stage is now fully deterministic - the
  one `Math.random()` under `apps/client/src/steps/` was replaced by a pure seeded
  `contactJitter` on `anim.ts` primitives, wired at all five `contactReaction` call sites.
  Timing constants (`CONTACT_T`, projectile life/arc, every `PLAYBACK_PHASES` row) are
  test-pinned. Visual pass: 6 archetypes x 4 moments x 2 viewports with a clean console
  and the reduced-motion instant dump re-proven.

## Quality Gates
- `bun check` clean, `biome check` clean, `bun test` green — required before
  any commit lands (see workflow.md).
- **Module size caps**, each enforced by a guard test that runs on every
  `bun test`:
  - `apps/client/src` — 12,288 B (`apps/client/src/module-size.test.ts`)
  - `packages/sim/src` — 12,288 B (`packages/sim/src/module-size.test.ts`)
  - `packages/voxel/src` — 24,576 B (`packages/voxel/src/module-size.test.ts`)
  The rule is bytes, not lines. Only co-located `*.test.*` suites are exempt —
  there is no allowlist by name. A voxel module is one hand-authored creature
  model, so it gets 24 KB; a logic module gets 12 KB.

## Deployment (target)
- Client: static hosting (Cloudflare Pages or GitHub Pages).
- Server: single small Bun container (Fly.io or equivalent) — deferred until
  Phase 3 per the roadmap.
