# Save Schema Creature Fields — Implementation Plan

> **Branch:** `chore/20261124-save-schema-creature-fields`
> **Base:** `main` @ `dda6b8ad9832f3c1870151aafab0d982f036df25`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Document persisted creature fields

- **Goal:** The `Creature` table documents `element` and `bondedToday` accurately, with every other row and all runtime behavior unchanged.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, NFR-1, NFR-2, NFR-3, AC-1, AC-2, AC-3
- **Touches:** `docs/save-schema.md`, `conductor/tracks/20261124-save-schema-creature-fields/verification/phase-1.md`, `.conductor/evidence/20261124-save-schema-creature-fields/**`
- **Verification:**
  - `bun run verify`
  - `bun run build`
  - `git diff --check dda6b8ad9832f3c1870151aafab0d982f036df25..HEAD`
  - `git diff --quiet dda6b8ad9832f3c1870151aafab0d982f036df25..HEAD -- . ':!docs/save-schema.md' ':!conductor/**'`
  - `git status --porcelain`
- **Status:** in_progress

- [ ] **P1.T1: Correct the Creature table** — covers: FR-1, FR-2
  - [ ] **P1.T1.1:** Add the persisted `element` row with type, creation/validation, and type/affinity semantics.
  - [ ] **P1.T1.2:** Add the persisted `bondedToday` row with boolean type and nightly-reset semantics.
- [ ] **P1.T2: Verify scope and record evidence** — covers: FR-3, NFR-1, NFR-2, NFR-3, AC-1, AC-2, AC-3
  - [ ] **P1.T2.1:** Re-read the updated table against `Creature` and the creature validator; confirm no other table row changed.
  - [ ] **P1.T2.2:** Run the configured checks, record the command results and scope proof in `verification/phase-1.md`, and commit the documentation change.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-save-schema-creature-fields/verification/phase-1.md
-->
