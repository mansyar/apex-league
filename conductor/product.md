# Product Definition — Apex League

## Summary
Apex League is a browser-based creature-raising game with a professional sports
league frame. The player raises voxel-styled creatures on a 3D ranch — feeding,
resting, treating sickness, assigning training, and building bonds — and sends
them into auto-battled championship cups to climb a ranked ladder from Bronze to
Legend. Battles are the exam; raising is the game. The player's skill is
expressed through preparation: care quality, training focus, move loadouts, and
evolution planning.

## Vision
- **Fantasy**: Being the coach/agent of a champion athlete creature — the
  satisfaction of a plan coming together when your creation wins.
- **Emotional core**: Attachment built through daily care; tension of watching
  (not controlling) the battle; legacy pride across generations.
- **Reference**: Digimon World Championship's raise→evolve→compete loop,
  softened into a friendlier roguelite cadence.

## Core Loop
1. **Day phase** (accelerated in-game days, action points per day):
   feed, rest/medicine, assign training programs, play/bond, plan evolution.
2. **Cup phase** (every 7 in-game days): optional entry into an 8-bracket
   single-elimination cup; rival matches resolve as spectator verdicts while
   the player's matches are fought in the broadcast arena.
3. **Progression**: wins climb the tier ladder (Bronze → Legend) with promotion
   matches; higher tiers gate better opponents, rewards, and rare eggs.
4. **Legacy phase**: creatures retire at ~60-90 in-game days. Retirement passes
   stat inheritance, inheritable traits (with mutation), and family prestige
   (account-wide perks) into the next egg via breeding; type affinity drift
   remains on the roadmap.

## Key Systems
- **Creatures**: 20-40 original species in 3-stage branching evolution trees
  (Baby → Juvenile → Champion). Branch requirements partially hidden — hints
  shown, thresholds discovered. 6 elements: Fire / Water / Plant / Electric /
  Earth / Wind. Classic 4 stats (HP/ATK/DEF/SPD) + type.
- **Moves**: learnable move pool (via training focus + evolution); equip 4
  pre-battle. Battle AI picks moves by type matchup, HP, and cooldown logic.
- **Acquisition**: Fire/Water/Plant starter choice; new creatures via breeding
  retired pairs and tournament reward eggs.
- **Opponents**: generated rival rosters from the same creature data + 3-5
  hand-authored rival characters as tier bosses.
- **Presentation**: Three.js; 3D ranch scene and top-down 3D arena with
  procedurally generated voxel creatures (species-as-data → pure-TS voxel
  pipeline: archetype template + seeded DNA → SDF parts → voxel grid →
  per-part greedy mesh → GLB with a rigid hierarchy rig; deterministic,
  CI-hash-gated), rendered 2D icons from the same models.
- **Meta**: local save + ElysiaJS backend for cloud save sync, leaderboards,
  and ghost data (async-PvP-ready design, PvE at launch).

## Roadmap

Phased delivery plan (each phase is independently playable):

### Phase 0 — Foundation
- Project scaffolding (Vite + TS + Three.js), core game loop skeleton,
  in-game calendar/day ticker, save/load to local storage.

### Phase 1 — Vertical Slice (MVP) ✅ *first playable target*
- One full lineage: 3-stage evolution tree, one species family (starter tier).
  *(Landed 2026-10-11: care-gated baby→juvenile evolution on the night of day
  10 — no sickness in the last 3 settled nights, mood ≥ 40; neglect delays but
  never blocks. Evolution applies +3 HP / +2 ATK / +2 DEF / +1 SPD, unlocks
  tier-3 moves, and the juvenile keeps its identity (seed, palette family,
  horn/snout plan) while gaining a per-archetype signature feature (drake horn
  nubs, bovine horn buds, axolotl gill frills) plus matured proportions at
  1.0× world scale (baby 0.6×). Ranch ceremony with glow/swap (reduced-motion
  aware), stage badge, growth hint from day 5, save v6 with v5 migration.
  Landed 2026-10-13: the champion stage completes the 3-stage tree — prestige
  gate on the night of day 25 (mood ≥ 40, clean sickness nights, bond ≥ 60,
  at least one cup win), pinned +6 HP / +4 ATK / +4 DEF / +2 SPD, voxel
  champion build with per-archetype signature upgrades (drake crown horns,
  bovine full horn curls, axolotl grand frills + tail fin) at 1.15× holder
  scale, grander ceremony, day-20 hint, stage-aware arena cast. Stage
  branching still open.)*
- Full day loop: feeding, rest & sickness, assign-based training, bonding.
  *(Landed: care loop with 5 conditions, AP day phase, 3 starters. 2026-10-18:
  a healthy night restores no energy — REST (+40) is now the way to refill,
  making it a real AP decision; relief tiers kept.)*
- Battle system: 4 stats + 6 types, move pool + equip-4, type/HP battle AI.
  *(Landed core 2026-10-10: headless deterministic resolver — speed-gauge action
  clock, type chart, projectile specials with travel/accuracy/dodge, equip-4
  starter kits, cooldowns, tactic + temperament policy, ko/double_ko/time
  endings, announcer event log, and a free ranch Spar between the creature and
  a seeded rival. Landed prep 2026-10-10: battles read stats + trained, kits
  grow at tier 3 @3 / tier 4 @6 trained days, Spar-panel loadout picker with
  locked rows, save v4. Landed arena playback 2026-10-10: a top-down 3D
  arena that swaps in on Spar and replays the deterministic event stream —
  broadcast placard HUD (element crests, damage-lag HP bars, rangefinder
  chevrons), hit juice behind a reduced-motion toggle, play/fast-forward
  pacing, collapsible battle log, gold verdict stamp, save v5. Cup/ladder
  still open.)*
- Top-down 3D arena with voxel creatures (procedural generator online).
  *(Landed.)*
- One weekly cup (8-bracket), Bronze tier ladder, ~5 opponent creatures.
  *(Landed 2026-10-11: seeded 8-bracket cup on days 7/14/21 - enter from the
  ranch chip; the bracket is free to view and the cup commits at the first
  arena step. The bracket fills in strict match order with a broadcast
  presentation; a coaching room re-picks kit + tactic before each of the
  player's three matches, which play in the 3D arena via the shared playback
  driver; rival-vs-rival matches resolve as instant verdicts. Give up =
  forfeit the current round with an as-if-lost placement; a loss
  auto-completes the bracket to a named champion; a results screen shows
  placement + rewards - win +1 AP next day / bond +10 / mood +15 / cupsWon
  tally, loss +2 mood consolation. Save v5, no schema change. Bronze ladder
  still open.)*
- Bronze ladder. *(Landed 2026-10-12: placement points — champion +3,
  runner-up +2, semifinal +1 — climb Bronze III → II → I at 6 and 12 points,
  automatically on points with no demotion; forfeits and losses earn zero.
  A rank plate on the ranch HUD shows the standing and progress to the next
  sub-tier, the cup entry chip reads it live, the results screen reports the
  run's points and any promotion, and the coach ticker announces climbs.
  Wins beyond Bronze I bank points toward Silver (Phase 2, hinted once).
  Save v8 with a fresh-start migration — no backfill for pre-ladder cups.)*
- Ranch scene (3D) with idle/breathe life; living-ranch dressing (wind sway,
  feeding ceremony, seeded wandering with camera follow). *(Landed 2026-10-10.
  Extended 2026-10-18: rest/treat/play care ceremonies with reduced-motion
  variants, a CC0 care SFX pack plus a dawn chime, and ambient petting — a tap
  on the creature (distinct from an orbit drag) answers with a mood-aware
  reaction and a chirp. Petting is free and AP-less: no sim state, no save
  change, spam-cooldowned.)*
- Retirement → next egg with stat + trait inheritance (minimal legacy).
  *(Landed 2026-10-13: the legacy phase opens the core loop — a champion at
  day 60+ can be graduated by the player (never automatic, never death) with
  an eligibility gate, a Hall of Fame archive, and a 50% parent-derived stat
  floor carried into the next egg plus a warm-bond start, family name and
  generation, and derived family prestige (generations + cups) granting
  milestone perks. Confirm → ranch send-off ceremony → egg screen → successor
  hatch, reduced-motion aware; save v10. Full breeding between retired pairs
  landed in Phase 2 on 2026-10-18.)*

### Phase 2 — League Depth
- Full ladder: Bronze → Silver → Gold → Legend plateau with promotion
  matches. *(Gold tier + Legend plateau with tier rewards and six
  authored gatekeeper bosses landed 2026-10-18 — the full four-tier
  climb is playable; dual-parent breeding landed 2026-10-18; extra
  prestige perks, affinity drift, and evolution branching remain open.)*
- Generated rivals + first 2-3 authored boss characters. *(Exceeded:
  six authored bosses now gate the climb at every tier.)*
- Breeding between retired pairs *(landed 2026-10-18: any two Hall records,
  dual-parent stat floor, trait inheritance, seeded mutation, save v15)*;
  family prestige perks; type affinity drift.
- Evolution hints/threshold discovery UI; 2-3 more species lineages.

### Phase 3 — Content & Meta
- Roster to 20-40 species across 6 types; rare tournament reward eggs.
- ElysiaJS backend: cloud save sync, trainer identity (anonymous ID + name),
  global leaderboards, ghost data.

### Phase 4 — Post-MVP
- Async ghost PvP; live PvP (battle code designed for it from Phase 1).
- Mobile-responsive pass (foundation landed 2026-10-13: breakpoint
  tiers + responsive surfaces + portrait-aware arena camera; touch
  ergonomics landed 2026-10-16 — touch orbit/pinch, camera input locked
  during fights, hidden-tab pause, graphics-failure plate, 44px phone tap
  targets and a fixed spar-chip collision, visible keyboard focus; still
  open: the hardware device-lab verification pass); audio expansion;
  polish & release funnel.

## Target Audience
Creature-collector fans who love the raising sim subgenre (Digimon World
Championship, Pokémon, Ooblets adjacent) and want a spectator-battle twist;
desktop browser players, including casual/portfolio-site visitors.

## Scope & Positioning
- Hobby/portfolio project — optimized for shipping a polished vertical slice
  fast, then widening content.
- Non-commercial at launch; original IP, no fan-game assets.
- Success criteria for MVP: one lineage (3 stages) playable end-to-end through
  the full raise→train→battle→cup loop, one ladder tier, ~5 opponent creatures.
