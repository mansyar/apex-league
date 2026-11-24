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
   landed 2026-10-21 — a bred egg can carry the other parent's element as a
   secondary affinity that defends via the cancel-to-neutral rule.
5. **The ranch and the stable**: the player owns several pets, but only one
   partner lives in the ranch at a time; every other pet waits in the stable,
   frozen until it is brought forward. A tournament reward now joins that
   collection instead of replacing the partner already in the ranch.

## Key Systems
- **Creatures**: 20-40 original species in 3-stage branching evolution trees
  (Baby → Juvenile → Champion). Branch requirements partially hidden — hints
  shown, thresholds discovered. 6 elements: Fire / Water / Plant / Electric /
  Earth / Wind. Classic 4 stats (HP/ATK/DEF/SPD) + type.
- **Moves**: learnable move pool (via training focus + evolution); equip 4
  pre-battle. Battle AI picks moves by type matchup, HP, and cooldown logic.
- **Acquisition**: Fire/Water/Plant starter choice; new creatures via breeding
  retired pairs and tournament reward eggs. The ranch holds one partner at a
  time; every other pet the player owns waits in the stable, frozen, and any
  of them can be brought forward when the player wants it.
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

-   [Conductor Roadmap](./roadmap.md) — forward-looking work and owner decisions.

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
