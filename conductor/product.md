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
  branching landed 2026-10-20 — two forms per starter, earned from training.)*
- Full day loop: feeding, rest & sickness, assign-based training, bonding.
  *(Landed: care loop with 5 conditions, AP day phase, 3 starters. 2026-10-18:
  a healthy night restores no energy — REST (+40) is now the way to refill,
  making it a real AP decision; relief tiers kept.)*
- Continuous arena battle: the action gauge is replaced by a fixed-step,
  real-time simulation where fighters occupy real space. *(Landed 2026-11-08:
  20 ms fixed step, mm-precision 3-vector positions, bodies with radius and
  height, authored frame data on all 49 moves, swept melee arcs and
  segment-versus-capsule projectiles, commitment with startup interruption and
  recovery counters, simultaneous trades, poise break and stamina, mass-scaled
  knockback with hitstun, a real dodge burst, a six-verb real-time controller,
  dense stream playback with startup telegraphs, and a telemetry harness whose
  bounds are enforced in CI. Fights run 25–40 s with both sides landing. The
  gauge clock is frozen as a replay-only path and `SIM_VERSION` is 2. Cup and
  Spar both resolve on the new engine.)*
- Battle agency and balance: the player decides *how* a fight is fought, and the
  numbers are measured rather than assumed. *(Landed 2026-11-10: four positioning
  doctrines - Press, Circle, Kite, Counter - plus one conditional coach's note,
  with temperament shading execution inside the doctrine's band rather than
  setting it; a controller that executes competently (opponent reach model,
  whiff-and-punish, commitment timing, stamina reserve, bounded pattern memory);
  a real per-move cooldown so a kit is a rotation and specials out-damage the
  basic; a symmetric type chart of two 3-cycles at 1.5x / 0.667x; the HP scale
  and blow weight folded into the stats and move power so the sheet shows the
  numbers the fight uses (save v26 migrates in place); damage on every move
  inside 4-12% of the reference pool; seeded accuracy rolls and a bounded damage
  spread so a rematch is a different fight while a replay still repeats exactly;
  and a deterministic balance gate that measures each species at its own typical
  roll and holds every species to a two-sided 95% test on a matrix measured at its bounds
  midpoint. Shipped figures are in the balance-gate bullet below.)*
- Balance gate: `bun run balance` measures every species at its bounds midpoint across a seeded matrix and fails on any row that misses the two-sided 95% test or cannot be judged. An outlasting win is a legitimate victory: a tank that survives and holds more HP at the cap wins, so the gate bounds cap share (<= 1/3), the median duration (25-40 s), the fastest fifth (>= 8 s), a decisive share (knockouts plus cap wins with a real HP margin, >= 2/3) and cap-win quality (>= 2/3 of cap wins clear the margin floor), and prints the knockout-only band as a diagnostic. Shipped: 15/15 species pass, 23.5% decided at the cap, median 30.2 s, decisive share 94.9%. The roster re-tune then moved every row point-wise toward the printed 45-55% band: fourteen of fifteen sit inside it (plant_ox 46.4% at the edge via a matrix-coupled keystone, not a direct shift), with water_axolotl 57.1% held as a recorded waiver because every tune direction pops a fire row or the telemetry cap. Three waivers stand (ox margin, water band, galeheron/cindermoor edge margins test-locked): the gate is green and the roster is inside the band except the one named exception.
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
  climb is playable; dual-parent breeding landed 2026-10-18; earned evolution
  branching landed 2026-10-20; extra prestige perks and type affinity drift
  landed 2026-10-21 — Refined Blood at prestige 7 raises the stronger-parent
  inheritance floor to 0.55, Champion Stable at prestige 9 adds a head-start
  AP bonus and a wider mutation band, and breeding can roll a secondary type
  affinity that defends via the cancel-to-neutral rule.)*
- Generated rivals + first 2-3 authored boss characters. *(Exceeded:
  six authored bosses now gate the climb at every tier.)*
- Breeding between retired pairs *(landed 2026-10-18: any two Hall records,
  dual-parent stat floor, trait inheritance, seeded mutation, save v15)*;
  family prestige perks *(landed 2026-10-21: Refined Blood at prestige 7
  raises the stronger-parent floor to 0.55; Champion Stable at prestige 9
  grants +1 max AP for the hatchling's first 5 in-game days and widens the
  mutation band to +1..+3)*; type affinity drift *(landed 2026-10-21: seeded
  15% roll at breeding attaching the other parent's element as a secondary
  affinity defending via cancel-to-neutral; save v20)*.
- Evolution hints/threshold discovery UI; 2-3 more species lineages.
  *(Branching landed 2026-10-20: the two champion forms grow out of the
  training record, with a day-5 direction preview and a reveal on the
  evolution morning rather than a menu. Six reward lineages landed
  2026-10-22..26 — the roster is now nine species (three starters, six reward
  lines across Silver/Gold/Legend), and rivals draw them at every tier that
  has unlocked them.)*
- Evolution branches *(landed 2026-10-20: each starter species has two champion
  forms with equal effective budgets — one leans ATK + SPD, one HP + DEF — and
  the form is earned from the training the player gave, not chosen from a menu.
  The Growth panel shows the lean as a direction from day 5, the evolution
  morning names the form, each form adds one signature special to the move
  pool, and a per-instance accent wash plus a plate label carry the form into
  the ranch and arena. Old saves keep their straight line as `legacy`; save
  v19 with v18 migration).*
- Training programs + form *(landed 2026-10-20: four programs with an energy
  gate and breakthrough nights, save v18, and a derived ATK-only form that
  reaches the arena - surfaced on the dock picker, Training tab, coach room,
  spar prep card, creature plate and the handbook's Raising page).*
- Battle follow-ups, in this order (recorded 2026-11-11 — the sim is correct
  but not yet fully readable or robust):
  1. Presentation mapping: the animation set predates the continuous sim —
     map hitstun and poise-break poses, a dodge roll, knockback recoil with
     planted feet, body scale from the body table, one shared facing model,
     and height-band swing variation onto the simulated state. The fight
     moves correctly before it reads correctly. *(Landed 2026-11-11:
     client-only stream-to-pose mapping with a byte-identical replay hash,
     telegraph wedge derived from reach, bounded effects, reduced-motion
     language, one justified 9-bit stream addition carrying paid-dodge
     identity and move index.)*
  2. Kite verdict: decide whether Kite (2/6 wins) is a trap doctrine or
     missing a tool — blocks doctrine credibility; do not tune around it.
     *(Landed 2026-11-11: the missing tool was engagement — Kite
     aggression 40 → 55, fixed probe 2/6 → 5/6 with paid dodges intact
     and every pacing bound green; trap branch evaluated and not shipped.)*
  3. Band-margin hardening: only when relative-matrix drift actually breaks
     a row (plant_ox 46.4% / voltfox 45.5% margins are thin, water_axolotl
     57.1% is waived) — never pre-emptive.
  4. Minimum reach / dead zones: long moves need a blind spot, but it
     changes outcomes, so it ships with the balance track alongside, not
     as a presentation tweak. **Landed 2026-11-12:** every frame row carries
     an authored `minReachMm` (90 mm on all 42 rows with `reachMm >= 5000`,
     `0` on the short rows and the innate basic), strikes and shots resolve
     only inside `[minReach + both radii, reach + both radii]`, and a blow
     that fails only the inner edge reports a `range` miss. The chooser judges
     the gap at the move's active frame rather than the current one, and a
     fighter with no landing move fires a backing shot that gives ground so the
     launch opens past the inner edge, falling back to a step back. Telemetry
     grew from 14 to 42 fights, all thirteen bounds were re-derived with
     before/after figures, and a fourteenth metric (`deadZoneShare`, 2.4%)
     gates the blind spot; the tell wedge derives its inner edge from the same
     authored value. `SIM_VERSION` is 3. Balance holds at 840 fights: 15/15
     species, cap 26.7%, decisive 95.6%, 49/49 moves in band. The authored
     value is gate-limited to a narrow window (~85-99 mm), and `capShare` sits
     at 59.5% against a 60.0% ceiling — recorded as debt, not widened.
   5. Cap-share pacing: the telemetry fixture measured its own composition.
      **Landed 2026-11-12:** a diagnosis of all 25 time-outs showed nine were the
      tortoise's own and sixteen were global throughput, and six identity-
      preserving rungs then showed the tortoise cannot be helped from inside its
      own data — the preferred kit reorder resolved none of the nine, and the
      cheapest rung that resolved any took it to 65.2% and the matrix red. The
      species sits at 52.7% on the 840-fight matrix *as an outlaster*, and a cap
      win is an outlasting win, so its caps are its identity working: the fix was
      withdrawn and an identity guard now pins `spd` `[3, 5]`, `temperament`,
      `archetypeId` and its own six moves so no future pacing pass can delete the
      species to make a number go down. The fixture itself was the defect: the old
      walk had `gcd(5, 15) = 5`, so only three species ever appeared on the away
      side and ten stalled pairings were replayed three times each. `matchups()`
      now draws 42 **distinct** pairings, one seed each, by a written stride-11
      rule, and the gate reads 20/42 (47.6%) against a 21/42 target with every
      other bound untouched. No simulation code changed and `SIM_VERSION` stays 3.
      Still owed: the one-in-three target (20/42), the global throughput
      shortfall, and the kite band at `spd 5`.
      **Audited 2026-11-13:** the fixture-versus-matrix gap is now decomposed
      instead of guessed. On the fixture's 42 pairings the four cells read 47.6%
      (reference stats, press-versus-kite), 40.5% (reference, press-versus-press),
      31.0% (midpoints, press-versus-kite) and 11.9% (midpoints,
      press-versus-press); the balance report's own reference pass over 840
      fights reads 44.9%. The **stat basis** is therefore worth 28.6 points at
      press doctrine (18.2 on the 840-fight population) against **7.1 points for
      the doctrine mix** at reference stats — and the two do not add: doctrine is
      worth 19.0 points once the stats sit at midpoints, so 11.9 points of the
      35.7-point gap is interaction. The remaining 14.8 points are the pairing
      walk itself, measured rather than assumed: the same 42 pairings over 168
      fights with the matrix's own seeds still read 17.9% (z ≈ −2.6), so the
      telemetry walk is a systematically more decisive subset than the roster and
      every telemetry bound describes that walk. Re-stratifying it is a gate
      redesign with its own before/after, not a fix to smuggle in.
      **Infrastructure, same date:** the CI gate now triggers on every pull
      request and skips its heavy steps when the diff touches only `conductor/`.
      A workflow-level path filter had meant a conductor-only PR created no run at
      all — so the required check never existed and such a PR could only merge by
      an admin bypass this project forbids. The gate now always reports, and a
      docs-only PR costs a runner spin-up instead of the full gate.

### Phase 3 — Content & Meta
- Roster to 20-40 species across 6 types; rare tournament reward eggs.
  *(Started 2026-10-21: the first reward line — the Electric storm hound — was
  granted once at Silver as a pure gift egg, raised through the same
  three-stage, two-branch life as the starters, and joins generated rival
  fields from Silver up. **Landed 2026-10-22: the ranch keeps one partner at
  a time and every other pet the player owns waits in the stable**, so the
  Storm Gift now *joins* the collection instead of replacing the pet you
  already have - this closes the known issue the Electric storm hound line
  left open ("the Storm Gift takes the pet in the ranch with it"). **Landed
  2026-10-26: six reward lines ship** - Silver pays a Storm Hound and a
  Whistlefern, Gold a Zephyr Falcon and a Coral Claw, the Legend plateau a
  Basalt Tortoise and a Moor Cinder - taking the roster to nine species
  across all six types, each hatching from the nursery into the
  stable-backed collection. **Landed 2026-10-27: three breeding-discovery
  lines ship** — Voltfox (Breed Electric with Wind), Galeheron (Breed Water
  with Wind), Shalemole (Breed Earth with Fire) — taking the roster to
  twelve species; recipes are listed openly in the handbook, discovery lines
  join non-Bronze rival fields, and each line ships two branch forms.
  **Landed 2026-10-27: three more breeding-discovery lines ship** — Embercub
  (Breed Fire with Plant), Mossboar (Breed Plant with Water), Mistkit
  (Breed Fire with Water) — taking the roster to fifteen species, each with
  two branch forms.
  Still open: the roster's climb toward 20-40
  species.)*
- ElysiaJS backend: cloud save sync, trainer identity (anonymous ID + name),
  global leaderboards, ghost data. *(Landed 2026-10-26: anonymous trainer
  identity and cloud save sync ship as an ElysiaJS container on Coolify —
  boot pull, debounced push, conflict loser preserved. Still open:
  leaderboards and ghost data. Landed 2026-10-27: per-trainer-best boards for
  cup wins, ladder, AP, and collection with plausibility caps; Board tab with
  offline snapshot; auto-submit alongside the save push. Landed 2026-10-27
  (track `20261027-ghost-data-async-rivals`): ghost data — cup-winning replay
  bundles (seed + both kits + event log, sim-version pinned, byte-identical
  verify), per-trainer-best ghost store with a top-100 board, and a Board
  Ghost rivals section with preview + Fight opening a local-only spar bout.)*

### Phase 4 — Post-MVP
- Async ghost PvP; live PvP (battle code designed for it from Phase 1).
- Mobile-responsive pass (foundation landed 2026-10-13: breakpoint
  tiers + responsive surfaces + portrait-aware arena camera; touch
  ergonomics landed 2026-10-16 — touch orbit/pinch, camera input locked
  during fights, hidden-tab pause, graphics-failure plate, 44px phone tap
  targets and a fixed spar-chip collision, visible keyboard focus; still
  open: the hardware device-lab verification pass); audio expansion;
  polish & release funnel. *(Release funnel landed 2026-10-26: the client
  deploys to Cloudflare Pages from a GitHub Actions workflow gated on the
  same `bun run verify` that protects pull requests, and a Playwright smoke
  check runs against the deployed URL after the upload; the site itself goes
  live on the owner's first push with the two repository secrets in place.
  Still open: the device-lab pass, audio expansion and polish.)*

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
