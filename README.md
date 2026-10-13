# Apex League

> Raise the champion. Win the league.

Apex League is a browser-based creature-raising game with a professional
sports-league frame. The player raises voxel-styled creatures on a 3D ranch —
feeding, resting, treating sickness, bonding — and sends them into
auto-battled championship cups to climb a ranked ladder from Bronze to
Legend. **Battles are the exam; raising is the game.**

The player's skill is expressed through preparation: care quality, training
focus, move loadouts, and evolution planning. Battles resolve as spectator
events — the tension is in watching a plan come together.

Status: **pre-release vertical slice.** The raise-and-care loop is playable
end to end, training programs shape the stats cycle by cycle, and weekly cups
put your creature in a broadcast arena. The golden-hour
ranch is dressed with voxel scenery that feeds back on care (a food pile appears
when the creature is fed). Every cup run banks ladder points: climb from
Bronze III to Bronze I, one promotion at a time.

## Core loop

1. **Day phase** — accelerated in-game days with a fixed action-point budget.
   Feed, rest, treat sickness, and play. Care quality shapes mood and bond.
2. **Night settlement** — advancing the day means the creature sleeps. Hunger
   falls, energy recovers (sleep quality depends on care), sickness rolls or
   worsens, mood settles, bond decays without bonding. The nightly check also
   watches for growth: a well-cared-for baby evolves into its juvenile form
   (stat boost, new signature feature, a third move slot) ten days in. No
   permadeath: the worst case is misery, and recovery is always possible.
3. **Cup phase** — every 7th day, an optional 8-bracket
   single-elimination cup: scout the rival, re-pick your kit, and step into
   the arena for each of your matches. Rival-vs-rival matches resolve as
   spectator verdicts.
4. **Legacy** *(roadmap)* — creatures retire and pass stat inheritance,
   traits, and family prestige into the next egg.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime & package manager | Bun 1.3+ |
| Language | TypeScript, strict mode, single language across the stack |
| Client | Vite + Three.js, DOM/CSS overlay (no UI framework at MVP) |
| Simulation | Pure, deterministic, DOM-free TypeScript (`@apex/sim`) |
| Creatures | Deterministic pure-TS voxel pipeline (`@apex/voxel`): archetype + seed → SDF → voxel grid → greedy mesh → GLB |
| Lint & format | Biome |
| Tests | `bun test` (bun:test) |
| Server *(roadmap, Phase 3)* | ElysiaJS on Bun, SQLite via `bun:sqlite` + Drizzle ORM |

The simulation core is deliberately headless and seeded: the same inputs
always produce the same outputs, which is what future replay, ghost, and
async-PvP features depend on.

## Repository layout

```
apps/
  client/        @apex/client — Vite + Three.js browser app (ranch, HUD, dev gallery)
packages/
  sim/           @apex/sim    — headless deterministic simulation core
  voxel/         @apex/voxel  — deterministic creature generator and GLB exporter
artifacts/       committed generated GLBs + sha256 manifests (CI-gated, not runtime)
conductor/       spec-driven planning: product definition, tech stack, workflow, tracks
```

## Getting started

**Prerequisites:** [Bun](https://bun.sh) 1.3 or newer.

```bash
git clone https://github.com/mansyar/apex-league.git
cd apex-league
bun install
bun run dev
```

The dev server prints a local URL (Vite, default `http://localhost:5173`).
A fresh save opens the starter choice — pick a Fire drake or a Plant ox and
begin the day loop. Each day you get 3 AP for care actions plus one training
focus: a full night's rest adds +1 to the focused stat, capped at +6 above
the rolled base. Small comforts: the pencil by your partner's name renames
them (free, anytime outside a cup), the "New game" chip beside the motion
toggle resets the ranch behind a confirm, and one-time onboarding hints
teach AP, training tiers, and cup eve exactly when they first matter.
The ranch itself is golden-hour lit — gradient dusk sky,
moss ground, drop shadows - and dressing reacts to care: feeding your creature
places a voxel food pile beside it until the night resets. Dev pages are
available at `/gallery.html` (creature lineup, `?archetype=draconic|bovine|mixed`),
`/preview.html` (grey silhouette viewer, `?seed=&archetype=&angle=`), and
`/mock.html` (broadcast HUD design mock built from the production kit).

## Development

| Command | What it does |
|---|---|
| `bun run dev` | Vite dev server with HMR |
| `bun run build` | Production client build |
| `bun run check` | Type check across all workspaces |
| `bun test` | Fast deterministic test suite |
| `bun run gate:determinism` | Regenerates committed GLBs and requires byte-identical output |
| `bun run verify` | The full gate: types + tests + lint + determinism |

`bun run verify` is the definition of done — it must pass before any commit
lands. The suite is deliberately fast (seconds, no I/O, seeded randomness)
and the determinism gate guarantees that committed creature assets can be
reproduced exactly from source.

## Design principles

- **Determinism everywhere.** Seeded RNG seams, pure functions, mutation-purity
  tests, and a byte-level asset gate. A slow or flaky test is treated as a bug
  in the test.
- **Test-driven where it pays.** Logic-bearing code (simulation, economy,
  evolution gates, save schema) is written test-first. Rendering and asset
  wiring are verified visually instead.
- **The plan is the source of truth.** Features are specified and planned in
  `conductor/tracks/` before implementation, following the workflow in
  `conductor/workflow.md`.
- **Death-free stakes.** Failure states are setbacks — condition, form, rank —
  never the loss of a creature.

## Roadmap

| Phase | Scope | State |
|---|---|---|
| 0 — Foundation | Workspaces, sim core, day ticker, versioned save/load, app shell | Done |
| 1 — Vertical slice | Care loop, training, one lineage, battle system, one cup, Bronze ladder | Done — care loop, training, baby→juvenile→champion evolution, arena battles, live cups, and the Bronze ladder playable |
| 2 — League depth | Full ladder, rivals and bosses, breeding, evolution discovery | Planned |
| 3 — Content & meta | 20–40 species, ElysiaJS backend, cloud saves, leaderboards | Planned |
| 4 — Post-MVP | Async ghost PvP, live PvP, mobile pass, audio | Planned |

## Contributing

This is a hobby project developed with a spec-driven workflow. If you'd like
to contribute:

1. Read `conductor/product.md` and `conductor/workflow.md` first.
2. New work starts as a track: a `spec.md` and `plan.md` under
   `conductor/tracks/` before any code.
3. Keep `bun run verify` green. Logic gets tests; rendering gets a manual
   verification note.
4. Follow the style guides in `conductor/code_styleguides/` (Biome is the
   formatter of record).

## License

All rights reserved. Apex League is original IP — no third-party creature
designs, names, or likenesses. Non-commercial at launch.
