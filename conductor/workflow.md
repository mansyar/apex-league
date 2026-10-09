# Project Workflow — Apex League

## Guiding Principles

1.  **The Plan is the Source of Truth:** All work must be tracked in `plan.md`
2.  **The Tech Stack is Deliberate:** Changes to the tech stack must be
    documented in `tech-stack.md` *before* implementation
3.  **Test-Driven Development — scoped to logic:** Write unit tests before
    implementing functionality, **for logic-bearing code only** (sim, battle
    resolution, economy, evolution gates, AI, save schema, server endpoints).
    Pure rendering, scene dressing, and asset wiring are verified manually, not
    unit-tested.
4.  **Fast, Efficient Tests:** The test suite must run in seconds. No network
    calls, no real timers, no heavy fixtures in unit tests. Simulation logic is
    deterministic — seed randomness in tests. A slow test is a bug in the test.
5.  **User Experience First:** Every decision should prioritize user experience
    (see `product-guidelines.md`)
6.  **Non-Interactive & CI-Aware:** Prefer non-interactive commands. Use `CI=true`
    for watch-mode tools (tests, linters) to ensure single execution.

## Task Workflow

All tasks follow a strict lifecycle:

### Standard Task Workflow

1.  **Select Task:** Choose the next available task from `plan.md` in
    sequential order

2.  **Mark In Progress:** Before beginning work, edit `plan.md` and change the
    task from `[ ]` to `[~]`

3.  **Write Failing Tests (Red Phase) — logic-bearing tasks only:**

    -   Create a new test file for the feature or bug fix.
    -   Write one or more unit tests that clearly define the expected behavior
        and acceptance criteria for the task.
    -   **CRITICAL:** Run the tests and confirm that they fail as expected.
        Do not proceed until you have failing tests.
    -   For non-logic tasks (rendering, assets, UI wiring): skip to step 4 and
        note the manual verification path instead.

4.  **Implement to Pass Tests (Green Phase):**

    -   Write the minimum amount of application code necessary to make the
        failing tests pass.
    -   Run the test suite again and confirm that all tests now pass.

5.  **Refactor (Optional but Recommended):**

    -   With the safety of passing tests, refactor to improve clarity and
        performance without changing external behavior. Rerun tests after.

6.  **Document Deviations:** If implementation differs from tech stack:

    -   **STOP** implementation
    -   Update `tech-stack.md` with new design and a dated note
    -   Resume implementation

7.  **Commit Code Changes:**

    -   Stage all code changes related to the task.
    -   Propose a clear, concise commit message e.g.
        `feat(battle): implement type-effectiveness resolution`.
    -   Perform the commit.

8.  **Attach Task Summary with Git Notes:**

    -   **Step 8.1: Get Commit Hash:** `git log -1 --format="%H"`
    -   **Step 8.2: Draft Note Content:** Task name, summary of changes,
        created/modified files, and the core "why".
    -   **Step 8.3: Attach Note:** `git notes add -m "<note content>" <hash>`

9.  **Get and Record Task Commit SHA:**

    -   **Step 9.1: Update Plan:** In `plan.md`, update the task from `[~]` to
        `[x]` and append the first 7 characters of the commit hash.
    -   **Step 9.2: Write Plan:** Write the updated content back to `plan.md`.

10. **Commit Plan Update:**

    -   Commit `plan.md` with e.g.
        `conductor(plan): Mark task 'Type effectiveness table' as complete`.

### Phase Completion Verification and Checkpointing Protocol

**Trigger:** Executed immediately after a task is completed that also concludes
a phase in `plan.md`.

1.  **Announce Protocol Start.**

2.  **Ensure Test Coverage for Phase Changes:**

    -   Determine phase scope via the previous phase checkpoint SHA in
        `plan.md` (`git diff --name-only <prev_sha> HEAD`).
    -   For each changed **logic-bearing** code file, verify a corresponding
        fast test exists; create one if missing, matching existing test style.
    -   Rendering/asset files are verified through the manual plan below.

3.  **Execute Automated Tests:** Announce the exact command (see Development
    Commands), run it. If tests fail, propose a fix at most twice; then stop
    and ask the user.

4.  **Propose a Detailed, Actionable Manual Verification Plan** covering the
    user-facing goals of the phase (commands, URLs, expected outcomes).

    -   For user-facing changes, the agent performs its own browser-tool
        verification first: open the app with `browser.tabs.open`, capture a
        `browser.screenshot`, and check `browser.console` for errors. Present
        the screenshot and console result as evidence alongside the manual
        steps.

5.  **Await Explicit User Feedback** before checkpointing. Do not proceed
    without an explicit yes or change requests.

6.  **Attach Verification Report** as a git note on the last functional commit
    of the phase (no empty checkpoint commits).

7.  **Record Phase Checkpoint SHA** in `plan.md` as `[checkpoint: <sha>]` and
    commit the plan update: `conductor(plan): Mark phase '<PHASE>' as complete`.

### Quality Gates

Before marking any task complete, verify:

-   [ ] `bun check` passes (types)
-   [ ] `biome check` passes (lint + format)
-   [ ] `bun test` green; suite runtime unchanged or faster
-   [ ] Logic-bearing code is tested; rendering/asset code has a manual
        verification note
-   [ ] Code follows `code_styleguides/`
-   [ ] Public functions/methods documented (JSDoc where non-obvious)
-   [ ] No security issues introduced (server: input validation, no injection)

## Development Commands

### Setup

```bash
bun install
```

### Daily Development

```bash
bun run dev          # Vite dev server (client)
bun run dev:server   # ElysiaJS dev server (when backend exists)
bun test             # run test suite (fast, deterministic)
bun run check        # bun check (types)
biome check --write  # lint + format
```

### Before Committing

```bash
bun run verify       # bun check && bun test --check && biome check
```

## Testing Requirements

- **Scope:** logic-bearing modules only — battle resolution, sim/day economy,
  evolution gates, inheritance/breeding math, opponent generation, save schema
  migration, server endpoints.
- **Style:** deterministic (seeded RNG), no I/O in unit tests, table-driven
  where natural. Target suite time: < 10 seconds.
- **Success AND failure cases** for every rule (e.g. invalid loadouts,
  impossible evolutions).

## Code Review Process

### Self-Review Checklist

1.  **Functionality** — works as specified; edge cases handled; friendly errors
2.  **Code Quality** — style guide, DRY, clear names, no speculative code
3.  **Testing** — logic covered, fast, deterministic
4.  **Security** — no hardcoded secrets; server input validated
5.  **Performance** — no per-frame allocations in render loops; assets cached

## Commit Guidelines

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `assets`
(for generator/spec/GLB changes).

Examples:

```bash
git commit -m "feat(battle): implement type-effectiveness matrix"
git commit -m "assets(voxel): add ember pup species spec + generated GLB"
```

## Definition of Done

A task is complete when:

1.  Code implemented to specification
2.  Logic-bearing tests written, passing, and fast
3.  `bun run verify` passes
4.  Documentation updated if applicable
5.  Changes committed with proper message; git note attached
6.  `plan.md` updated

## Continuous Improvement

- Review workflow per phase, not weekly — a hobby project should not carry
  ceremony that no longer pays rent.
- Document lessons learned in `plan.md` phase notes.
- Keep things simple and maintainable.
