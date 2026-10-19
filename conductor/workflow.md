# Project Workflow — Apex League

## Guiding Principles

1. **The plan is the source of truth.** Every phase, task, result, checkpoint,
   and evidence link lives in `plan.md`.
2. **The tech stack is deliberate.** A change to the stack is recorded in
   `tech-stack.md` with a dated note before the implementation depends on it.
3. **Verification is agent-executed.** The phase subagent runs the configured
   checks and writes evidence. Routine work is never handed back to the user to
   verify.
4. **Evidence over assertion.** A phase is complete only when the configured
   checks pass and the evidence file exists.
5. **Test-driven development — scoped to logic.** Write the failing test first
   for logic-bearing code only: sim, battle resolution, economy, evolution and
   breeding gates, AI policy, save schema and migration, server endpoints. Pure
   rendering, scene dressing, asset wiring, and DOM layout are verified through
   the visual layer instead of unit tests.
6. **Fast, deterministic tests.** The suite must stay in seconds, not minutes.
   No network calls, no real timers, no heavy fixtures. Seed randomness. A slow
   test is a bug in the test.
7. **The determinism gate is absolute.** Generated voxel artifacts must hash
   byte-identically. Never regenerate or hand-edit a committed GLB to make a
   check pass.
8. **Stay inside the phase contract.** `Touches` defines the expected blast
   radius. A required deviation is allowed, recorded, and reviewed.
9. **No silent debt.** A finding is fixed, explicitly accepted with a reason, or
   tracked. Under the strict review policy, Critical, High, and Medium findings
   are fixed before the PR.
10. **Non-interactive and CI-aware.** Prefer commands that terminate. Use
    `CI=true` for watch-mode tools.

## Workflow Config

```yaml
project:
  type: "bun-monorepo-browser-game"
  languages: ["TypeScript", "CSS", "HTML", "JSON"]
commands:
  setup: "bun install"
  dev: "bun run dev"
  test: "bun test --timeout 120000"
  coverage: "none"
  lint: "biome check"
  format: "biome check --write"
  typecheck: "bun run check"
  build: "bun run build"
  verify_phase: "bun run verify && bun run build"
coverage:
  gate: "none"
  scope: "project"
verification:
  layers: ["static", "unit", "determinism", "visual"]
  retry: 2
  manual_exceptions: []
git:
  base_branch: "main"
  fetch: true
  commit_style: "conventional"
  task_commits: true
  phase_squash: true
review:
  strict: true
  issues:
    enabled: false
    auto_create: false
    min_severity: "medium"
    group_low: true
    labels: ["tech-debt", "conductor"]
pr:
  enabled: true
  tool: "gh"
  base: "main"
```

## Development Commands

### Setup

```bash
bun install
```

### Daily Development

```bash
# Vite dev server for the client (http://localhost:5173)
bun run dev

# Run the test suite
bun test --timeout 120000

# Typecheck every workspace package
bun run check

# Lint and format (Biome)
biome check
biome check --write

# Production client build
bun run build

# Voxel artifact determinism
bun run gate:determinism
```

### Before Committing

```bash
bun run verify
```

`bun run verify` is the CI gate: workspace typechecks, typed parallel tests,
Biome, and the voxel determinism gate. The phase verification command adds the
production build on top of it.

## Phase & Task Workflow

Implementation runs one phase at a time through the `conductor-phase`
subagent. The primary agent owns `plan.md`, `metadata.json`, `tracks.md`,
`review.md`, and the PR.

### Task Lifecycle

1. Read the phase contract in `plan.md`, the requirements it cites in
   `spec.md`, and the applicable style guides in `conductor/code_styleguides/`.
2. Work through the phase's tasks in order.
3. For logic-bearing work, write or update the failing test before the
   implementation. For rendering or asset work, plan the visual check instead.
4. Implement the smallest change that satisfies the task.
5. Run the targeted checks for the task.
6. Commit the task with a conventional commit message.
7. Report the task status and commit SHA to the primary agent.

The subagent does **not** edit `plan.md`. The primary marks tasks complete after
it accepts the phase.

### Project-Specific Rules

- **Module size:** every client module stays at or under **12 KB**. The cap is
  enforced by `apps/client/src/module-size.test.ts`; a decomposition that
  quietly re-bloats fails `bun test`.
- **Save schema:** any change to the persisted shape bumps the version, adds a
  migration, and updates `docs/save-schema.md` in the same phase.
- **Single-sourced contracts:** element hues/glyphs live in
  `apps/client/src/ui/element.ts`; tier names in `tier-name.ts`. Do not add a
  second source of truth.
- **No new dependency** without a recorded stack decision. Prefer the existing
  Bun + TypeScript + Three.js + Biome surface.

### Deviations

- If the phase goal requires a file outside `Touches`, make the smallest
  necessary change and record it in the report under `deviations`.
- If the work requires a product or design decision, stop and report `blocked`.
- Do not silently expand scope, add a dependency, or migrate unrelated code.

### Phase Completion

1. Run the phase's `Verification` command exactly as written in `plan.md`.
2. Run `verify_phase` when it is configured and different from the phase
   command. Here it is `bun run verify && bun run build`.
3. Run the visual layer when the phase changes anything a player can see.
4. Write the evidence file using the configured evidence path.
5. Return the structured report to the primary agent.
6. Do not merge, rebase, reset, push, open a PR, or edit Conductor state files.

## Verification Strategy

### Layers

Four layers run for this project. Nothing else is required.

- **Static** — typechecks, lint, format, production build.
- **Unit** — `bun:test` suites for logic-bearing modules, co-located as
  `*.test.ts` and run with typechecking enabled.
- **Determinism** — the voxel artifact gate: all nine creature GLBs and the prop
  digest manifest must hash identically to the committed artifacts.
- **Visual** — a browser pass with `playwright-cli` for any user-facing change:
  screenshot plus console-error check at desktop and phone widths.

Integration, contract, and E2E suites do not exist in this project. The ElysiaJS
server is deferred to Phase 3; when it lands, an HTTP layer is added here before
endpoint work begins.

### Commands

| Layer | Command | Required |
| --- | --- | --- |
| static | `bun run check`, `biome check`, `bun run build` | yes |
| unit | `bun test --timeout 120000` | yes |
| determinism | `bun run gate:determinism` | yes |
| visual | `playwright-cli` against `bun run dev` | when user-facing |

### Services and Fixtures

- **Services:** the Vite dev server, `bun run dev`, at `http://localhost:5173`.
  It is started for the visual layer and stopped afterwards. No backend runs.
- **Containers:** none.
- **Database:** none. The game persists to browser local storage through the
  typed save adapter; SQLite arrives with the Phase 3 server.
- **Fixtures/seed data:** deterministic seeds in unit tests. Browser runs use
  the in-game starter/hatch flow; exported saves under `.playwright-cli/` are
  scratch evidence, not tracked fixtures.
- **Environment variables:** none required for local development.
- **Start/stop commands:** `bun run dev` to start; `playwright-cli close` and
  stop the dev server when the pass is done.

### Visual Layer Procedure

1. Start `bun run dev`.
2. `playwright-cli open http://localhost:5173`.
3. Drive the changed flow with snapshot refs.
4. `playwright-cli screenshot --filename=.conductor/evidence/<track-id>/<phase>-desktop.png`.
5. `playwright-cli open --device="iPhone 15" http://localhost:5173`, repeat,
   and capture the phone-width shot.
6. `playwright-cli console` and confirm no new errors.
7. Record the paths and the console result in the evidence file.

The primary agent runs this layer at phase acceptance; the phase subagent may
run it when the phase brief assigns it. A hardware device-lab pass is not part
of phase verification — it remains a roadmap item.

### Pass Criteria

- Every required command exits `0`.
- No coverage percentage is enforced. Logic-bearing behavior must have tests
  that assert success and failure cases.
- Every acceptance criterion has a test or a recorded evidence artifact.
- User-facing changes have desktop and phone screenshots plus a clean console.
- No Critical, High, or Medium review finding remains open (strict policy).

### Evidence

Write a report to:

```text
conductor/tracks/<track-id>/verification/phase-<n>.md
```

Include: title; track, phase, date, branch, base and head commits; result
(`verified`, `failed`, `blocked`, or `partial`); a commands table (layer,
command, exit, summary); an acceptance-criteria table (ID, criterion, evidence,
status); screenshot paths; deviations; and notes.

Put screenshots, traces, and large reports under `.conductor/evidence/`. That
directory is gitignored. The report itself is committed with the track.

### Fallback Ladder

1. Run the full configured layer.
2. If the dev server fails to start, check the port, run `bun install`, retry
   once.
3. If the visual layer still cannot run, run the narrowest reliable subset
   (unit + static + determinism) and mark the phase `partial` with the reason.
4. Stop and ask the user only for credentials, physical hardware, or an external
   approval.

### Retry Policy

- A failed check may be fixed and re-run at most **2** times.
- If it still fails, report `failed` with the command and output.
- Never mark a phase `verified` when a required check did not run.

### Human-Only Exceptions

- **Physical mobile hardware verification** (the device-lab pass) is tracked on
  the roadmap, not as a phase gate.
- **Release hosting setup** (Cloudflare Pages / Fly.io) requires account
  credentials and is performed manually when release work begins.

## Quality Gates

Before a phase is accepted:

- [ ] `bun run check` passes (types)
- [ ] `biome check` passes (lint + format)
- [ ] `bun run build` passes
- [ ] `bun test --timeout 120000` is green and no slower than the previous run
- [ ] `bun run gate:determinism` passes
- [ ] Logic-bearing code has success and failure tests
- [ ] Client modules stay at or under 12 KB
- [ ] Save-schema changes bump the version, migrate, and update `docs/save-schema.md`
- [ ] User-facing changes have desktop and phone visual evidence
- [ ] Code follows `conductor/code_styleguides/`
- [ ] No secrets, credentials, or PII are introduced
- [ ] Evidence is written to `conductor/tracks/<track-id>/verification/`

## Commit Guidelines

### Message Format

```text
<type>(<scope>): <description>

[optional body]
```

### Types

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation only
- `style`: formatting
- `refactor`: behavior-preserving change
- `test`: tests only
- `chore`: maintenance
- `assets`: generator, spec, or GLB changes

### Examples

```bash
git commit -m "feat(cup): pay the new tier's AP bundle on a gate win"
git commit -m "refactor(ranch): split gait machine behind the scene-logic barrel"
git commit -m "assets(voxel): regenerate creature artifacts at GENERATOR_VERSION 2"
```

Task-level commits are made by the phase subagent. The primary squashes them
into one phase commit on acceptance unless a foreign commit landed in the range.
The plan update is a separate Conductor state commit.

## Documentation Sync

Before a track PR is opened:

- `conductor/tech-stack.md` gets a dated note when a system, module boundary, or
  save version changed.
- `docs/save-schema.md` matches the current persisted shape and migrations.
- `conductor/product.md` roadmap status is updated when a roadmap item lands.
- `conductor/product-guidelines.md` is updated when a visual, tone, or UX rule
  changes.

## Release & Deployment

The client is pre-release. There is no automated deployment: no hosting
workflow exists, and the track workflow never deploys.

- The merge to `main` runs the CI verify gate only.
- Static hosting for the client and the Bun container for the Phase 3 server are
  set up manually when release work begins; add the commands to this file at
  that point.
- A release candidate must pass `bun run verify && bun run build` locally and in
  CI before any manual upload.

## Definition of Done

A track is complete when:

1. Every phase is `verified` with a checkpoint and evidence.
2. The integrated verification on the track branch passes.
3. Review is `PASS` or `PASS WITH FINDINGS` with no Critical, High, or Medium
   finding left open.
4. Documentation sync is complete.
5. The registry and `metadata.json` show the track as complete.
6. The branch is pushed and a PR against `main` is open (or `pr_state` records
   why it could not be created).

## Continuous Improvement

- Review this workflow after each track; a hobby project should not carry
  ceremony that no longer pays rent.
- Update commands and layers when the tooling changes.
- Record recurring review findings as process improvements.
