# Apex League

> Raise the champion. Win the league.

Apex League is a browser-based creature-raising game with a professional
sports-league frame. The player raises voxel-styled creatures on a 3D ranch —
feeding, resting, treating sickness, bonding — and sends them into
auto-battled championship cups to climb a ranked ladder from Bronze to
Legend. **Battles are the exam; raising is the game.**

The player's skill is expressed through preparation: care quality, training
programs, move loadouts, and evolution planning. Battles resolve as spectator
events — the tension is in watching a plan come together.

Status: **pre-release vertical slice.** The raise-and-care loop is playable
end to end, four training programs shape the stats cycle by cycle, and form —
read from mood, bond, and health — moves ATK in every fight. Weekly cups
put your creature in a broadcast arena. The golden-hour
ranch is dressed with voxel scenery that feeds back on care (a food pile appears
when the creature is fed). Every cup run banks ladder points: climb from
Bronze III to Bronze I, one promotion at a time. Top the Bronze ceiling and
the next cup is the Promotion Cup — beat the gate boss to enter Silver, then
climb Silver III to Silver I through three more authored gatekeepers. When a
champion's career is
full, graduate them into a successor — the bloodline keeps the family name,
inherits a stat floor from the champion's peak, and earns prestige perks that
make the next run start a little stronger. The ranch keeps one partner at a
time; every other pet you own waits in the stable, frozen and ready to be
brought forward. Saves can be exported and imported, the audio mix has
separate music and SFX levels, and every surface has a keyboard and
reduced-motion pass.

## Core loop

1. **Day phase** — accelerated in-game days with a fixed action-point budget.
   Feed, rest, treat sickness, and play. Care quality shapes mood and bond.
2. **Night settlement** — advancing the day means the creature sleeps. Hunger
   falls, energy recovers (sleep quality depends on care), sickness rolls or
   worsens, mood settles, bond decays without bonding. The nightly check also
   watches for growth: a well-cared-for baby evolves into its juvenile form
   (stat boost, new signature feature, a third move slot) on its own tenth
   night, and the training you give it decides which of the species' two
   champion forms it grows into. No permadeath: the worst case is misery, and
   recovery is always possible.
3. **Cup phase** — every 7th day, an optional 8-bracket
   single-elimination cup: scout the rival, re-pick your kit, and step into
   the arena for each of your matches. Rival-vs-rival matches resolve as
   spectator verdicts.
4. **Legacy** — a champion that has lived a full career can be **graduated**
   (a proud send-off, never death): its career is archived to the Hall of Fame
   and its stats seed a **stat floor** for the next egg, while the family name,
   generation, and derived **prestige** carry into a dynasty. Breeding pairs
   any two retired partners: the egg inherits a weighted floor from both, a
   trait, a seeded mutation, and — on a seeded 15% roll — the other parent's
    element as a secondary affinity.
5. **The stable** — the ranch holds one partner at a time. Every other pet you
   own waits in the stable, frozen: its conditions, its training and its own
   age do not move while it waits, and it resumes exactly where it left off.
   Bring any of them forward whenever you like — the swap is free, instant and
   lossless.

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
| Hosting | Cloudflare Pages — static client, deployed by GitHub Actions (see [Deploying](#deploying)) |
| Server *(live since 2026-10-27)* | ElysiaJS on Bun, SQLite via `bun:sqlite` + Drizzle ORM — a non-root container on Coolify at `https://apex-api.ansyar-world.top` (see [The API container](#the-api-container-coolify)) |

The simulation core is deliberately headless and seeded: the same inputs
always produce the same outputs, which is what future replay, ghost, and
async-PvP features depend on.

## Repository layout

```
apps/
  client/        @apex/client — Vite + Three.js browser app (ranch, HUD, dev gallery)
  server/        @apex/server — ElysiaJS API on Bun (identity, save sync) + its Dockerfile
packages/
  sim/           @apex/sim    — headless deterministic simulation core
  voxel/         @apex/voxel  — deterministic creature generator and GLB exporter
scripts/         smoke check for the deployed build, plus a local static server
artifacts/       committed generated GLBs + sha256 manifests (CI-gated, not runtime)
.github/         CI, the nightly sweep, and the deploy workflow
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
A fresh save opens the starter choice - pick the Fire drake, the Plant ox or
the Water axolotl and begin the day loop. The cup ladder pays a reward egg at
every tier it promotes you into, and it pays each tier's lines rather than a
choice between them: Silver pays a Storm Hound and a Whistlefern, Gold a
Zephyr Falcon and a Coral Claw, the Legend plateau a Basalt Tortoise and a
Moor Cinder. Each egg waits in the nursery, previewed down to its rolled
stats, and hatches into a line raised through the same three stages and two
champion forms as the starters. A new pet waits in the stable rather than
taking your ranch pet's place. Your partner keeps the ranch, and the Stable
chip beside Settings brings any waiting pet forward whenever you want it.
Each day you get 3 AP for care
actions plus one of four training programs — Power Lifting, Endurance
Circuit, Sprint Work, Ring Craft — each training its own stats night by
night, capped at +6 above the rolled base. Small comforts: the pencil by your partner's name renames
them (free, anytime outside a cup), the "New game" chip beside the motion
toggle resets the ranch behind a confirm, and one-time onboarding hints
teach AP, training tiers, and cup eve exactly when they first matter.
The ranch itself is golden-hour lit — gradient dusk sky,
moss ground, drop shadows - and dressing reacts to care: feeding your creature
places a voxel food pile beside it until the night resets. Dev pages are
available at `/gallery.html` (creature lineup; `?archetype=<id>` picks a
registered archetype, `mixed` rotates them all),
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

## Deploying

Apex League's **API is live** at `https://apex-api.ansyar-world.top` (Coolify).
The client deploy is configured and ready, but it has never run, so the URL
below does not resolve today.

- **What deploys, and when.** `.github/workflows/deploy.yml` runs on every push
  to `main`, and can be re-run from the Actions tab with **Run workflow**
  (`workflow_dispatch`). It installs, checks the secrets, runs
  `bun run verify`, builds, creates the Pages project if it does not exist,
  uploads `apps/client/dist`, and then smoke-checks the deployed URL. A newer
  push cancels a run still in flight, so production never lands on a stale
  build.
- **The URL.** `https://apex-league.pages.dev/` — the production address the
  Pages project will be served at. This is the URL the first deploy will
  create, not one that is up now.
- **The API origin.** Production builds inject
  `VITE_API_ORIGIN=https://apex-api.ansyar-world.top` from the
  `APEX_API_ORIGIN` repository variable (Settings → Secrets and variables →
  Actions → Variables). The build fails fast on `main` when it is missing;
  preview deployments carry no origin and run offline-only.
- **The gate.** `bun run verify` — types, tests, Biome, and the voxel
  determinism gate — runs before the upload, so a red gate never reaches the
  site. The smoke check runs after it against the deployed URL: it drafts a
  starter, asserts the ranch renders, and fails the run on any console error
  or warning or on a failed asset request.

### One-time setup

The two repository secrets plus one repository variable are the manual setup,
and only the repository owner can create them:

1. In Cloudflare, create an API token with the **Pages: Edit** permission (My
   Profile → API Tokens → Create Token → "Cloudflare Pages — Edit") and copy
   it, then copy the account id from the dashboard's overview page.
2. In GitHub, open **Settings → Secrets and variables → Actions → New
   repository secret** and add both:
   - `CLOUDFLARE_API_TOKEN` — the token from step 1.
   - `CLOUDFLARE_ACCOUNT_ID` — the account id from step 1.
3. In GitHub, open **Settings → Secrets and variables → Actions → Variables
   → New repository variable** and add:
   - `APEX_API_ORIGIN` — `https://apex-api.ansyar-world.top`. A public origin,
     hence a variable rather than a secret; `deploy.yml` fails fast on `main`
     when it is missing.
4. Push to `main`. The run creates the `apex-league` Pages project if it does
   not exist — no manual project creation is needed — then uploads the build
   and smoke-checks it.

After that, `main` deploys itself and no further setup is required.

### Changing the deploy

- **The project name and the upload directory are declared once**, in
  `wrangler.jsonc`: `"name": "apex-league"` and
  `"pages_build_output_dir": "apps/client/dist"`. The workflow and the smoke
  check read both from there rather than repeating them.
- **Renaming the project is a one-line change** — edit `"name"` in
  `wrangler.jsonc`. The URL follows the name.
- **`wrangler` is pinned** to exactly `4.152.0` in `package.json`, so a new
  wrangler release cannot change deploy behaviour silently. It is a dev
  dependency and never enters the client bundle.
- **The workflow runs `bun run deploy`** (`bunx wrangler pages deploy`), so a
  local deploy and a CI deploy cannot drift.

### The API container (Coolify)

The API is a single Bun container built by
`.github/workflows/server-image.yml` and published to GHCR. Coolify runs it on
its own, which is why the image has to be correct on its first boot — nothing
here can observe it afterwards.

- **The image.** `docker build -f apps/server/Dockerfile .` — the context is
  the repository root on purpose: `bun.lock` lives there and Bun installs each
  workspace's dependencies into that workspace's own `node_modules`, so a
  server-only install would leave `elysia` and `drizzle-orm` unresolvable.
  There is no compile stage; Bun runs `apps/server/src/main.ts` directly.
- **The tag Coolify pulls.** `ghcr.io/mansyar/apex-league-server:<commit sha>`.
  CI pushes that tag on every push to `main`, after `bun run verify` passes. Pin
  the SHA tag in Coolify — `latest` is published too, but it moves, and a
  moving tag makes a rollback impossible.
- **The port.** The container listens on `3000` (`PORT`); Coolify's proxy
  terminates TLS and forwards to it. `GET /health` is the probe: it is
  unauthenticated, read-only, and reports the applied migration.
- **The environment.** Two variables, both set in Coolify rather than in the
  repository (live values since 2026-10-27):
  - `DATABASE_PATH=/data/apex.sqlite` — where the SQLite file lives, on the
    named volume `apex-data:/data` (single writer — replicas exactly 1).
  - `ALLOWED_ORIGIN=https://apex-league.pages.dev` — the one browser origin
    the API answers. **Unset means no CORS headers at all**, so the client is
    blocked before its request leaves the browser — this is exactly what the
    `allowed origin none (same-origin only)` boot line means. It is never `*`:
    the value is compared exactly against the request's `Origin` and echoed
    back, so a lookalike host does not pass.

**The database volume.** The container runs as `bun` (uid 1000), not root, and
`openDatabase` throws at boot when it cannot create the file — the server dies
rather than serving saves that go nowhere. Attach a persistent volume at
`/data`:

- A **named volume** (`apex-data:/data`) works with no manual step: Docker
  seeds it from the image's `/data`, which the Dockerfile creates and chowns to
  uid 1000.
- A **bind mount** inherits nothing. Run `chown -R 1000:1000 <host dir>` before
  starting the container, or the first boot fails with
  `cannot open the database at /data/apex.sqlite: ...`.

Either way the volume is what makes a redeploy non-destructive: without it every
deploy starts from an empty database and every player's saves are gone.

## Release checklist

Before tagging a build, walk this list on a clean browser profile:

- [ ] **Fresh boot** — the starter picker appears, the first card has focus,
      and Enter drafts a partner.
- [ ] **Save round-trip** — Settings → Download save on a played ranch; import
      that file into a fresh profile and confirm day, partner, Hall, ladder, AP,
      volumes, and reduced-motion state match.
- [ ] **Older saves** — import a v23 (or older) export and confirm it migrates
      to v25 with an empty stable, a valid age on the active pet (a v23 export
      keeps its own age; an older one takes the world day it already played),
      and everything else unchanged.
- [ ] **Bad saves** — newer-version and malformed files are refused with a calm
      notice and the live save is unchanged.
- [ ] **Corrupt boot** — the recovery dialog downloads the exact broken bytes
      before "Clear and start over" is allowed to wipe them.
- [ ] **Audio** — music and SFX sliders change live, survive reload, and the
      mute chip still overrides both.
- [ ] **Keyboard-only** — starter → care → training → cup entry/coach room →
      stable → graduation/nursery → Hall → detail → handbook → settings; focus
      is never lost, and each overlay returns it to its opener.
- [ ] **Reduced motion** — both the in-app Motion: reduced setting and OS
      `prefers-reduced-motion` remove shake/flash/travel while the cup and
      battle stay legible.
- [ ] **Narrow device** — 393×852 and 852×393 emulation (and a real phone when
      available) shows no horizontal page scroll, no panel occluding an
      interactive element or the scene's action area, and readable text.
- [ ] **Gates** — `bun run verify` is green, the console is clean, and
      `docs/save-schema.md` matches the current `SAVE_VERSION`.

The real-device pass (iOS Safari and Android Chrome: starter, sliders, save
download, touch targets, safe areas) is still a manual follow-up; record the
device, OS, and screenshots when it runs.

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
| 1 — Vertical slice | Care loop, training, one lineage, battle system, one cup, Bronze ladder | Done — care loop, four training programs with breakthrough nights, derived form (ATK) in the arena, baby→juvenile→champion evolution with two champion forms per starter earned from training, arena battles, live cups, the Bronze ladder, and the minimal legacy loop (graduation → inherited next egg) playable |
| 2 — League depth | Full ladder, rivals and bosses, breeding, evolution discovery | In progress — the full Bronze→Legend climb, six authored bosses, dual-parent breeding with trait inheritance, earned evolution branches, type affinity drift, the prestige 7/9 perks, and six reward lineages are playable; what remains is Phase 3's wider roster |
| 3 — Content & meta | 20–40 species, ElysiaJS backend, cloud saves, leaderboards | In progress — the roster is fifteen species: the three starters, six reward lines the ladder pays out (Silver pays a Storm Hound and a Whistlefern; Gold a Zephyr Falcon and a Coral Claw; Legend a Basalt Tortoise and a Moor Cinder), and six breeding-discovery lines (Voltfox, Galeheron, Shalemole, Embercub, Mossboar, Mistkit), each hatching from the nursery into your collection while the stable holds the rest. The backend now exists: anonymous trainer identity and cloud save sync, containerised on Coolify. The wider roster, leaderboards and ghost data remain |
| 4 — Post-MVP | Async ghost PvP, live PvP, mobile hardware pass, audio expansion | Planned |

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
