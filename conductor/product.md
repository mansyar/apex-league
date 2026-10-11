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
   single-elimination cup; battles auto-resolve as spectator fights.
3. **Progression**: wins climb the tier ladder (Bronze → Legend) with promotion
   matches; higher tiers gate better opponents, rewards, and rare eggs.
4. **Legacy phase**: creatures retire at ~60-90 in-game days. Retirement passes
   stat inheritance, inheritable traits (with mutation), family prestige
   (account-wide perks), and type affinity into the next egg via breeding.

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
- Full day loop: feeding, rest & sickness, assign-based training, bonding.
  *(Landed: care loop with 5 conditions, AP day phase, 3 starters.)*
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
- Ranch scene (3D) with idle/breathe life. *(Landed.)*
- Retirement → next egg with stat + trait inheritance (minimal legacy).

### Phase 2 — League Depth
- Full ladder: Bronze → Silver → Gold with promotion matches.
- Generated rivals + first 2-3 authored boss characters.
- Breeding between retired pairs; family prestige perks; type affinity drift.
- Evolution hints/threshold discovery UI; 2-3 more species lineages.

### Phase 3 — Content & Meta
- Roster to 20-40 species across 6 types; rare tournament reward eggs.
- ElysiaJS backend: cloud save sync, trainer identity (anonymous ID + name),
  global leaderboards, ghost data.

### Phase 4 — Post-MVP
- Async ghost PvP; live PvP (battle code designed for it from Phase 1).
- Mobile-responsive pass; audio expansion; polish & release funnel.

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
