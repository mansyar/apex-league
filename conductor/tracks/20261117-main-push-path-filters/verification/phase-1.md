# Phase 1 — Main Push Path Filters: The filters and the written rule

- **Track:** `20261117-main-push-path-filters`
- **Phase:** 1 (of 2)
- **Date:** 2026-11-17
- **Branch:** `chore/20261117-main-push-path-filters`
- **Base commit:** `a103e3c9`
- **Head commit at verification:** `bd568192` (Deploy commit `0a0767f1`, Server image commit `bd568192`)
- **Result:** verified

## Summary

Both `push: main` workflows now carry the same six-entry `paths-ignore` list with a
written rule beside it. Every code-push, manual-dispatch, permission, concurrency,
step, Bun pin and verify-gate line is byte-identical: the diff is 28 insertions and
zero deletions across the two files.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| git inspection (scope) | `git diff --stat` | 0 | Only `deploy.yml` and `server-image.yml`; 28 insertions(+), 0 deletions(-) |
| git inspection (content) | `git diff -- .github/workflows/deploy.yml .github/workflows/server-image.yml` | 0 | 14 insertions in each file, all inside the `push:` block; no existing line changed |
| full local gate | `bun run verify` | 0 | Typecheck + 4161 tests pass / 1 skip / 0 fail (491188 `expect()` calls, 375 files) + Biome 939 files, no fixes applied + voxel determinism gate OK for all 15 species and 5 props |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 / AC-1 | `deploy.yml` `push: main` ignores exactly `conductor/**`, `docs/**`, `.opencode/**`, `README.md`, `AGENTS.md`, `*.png`, with no `paths:` allow-list | "After" block below; `git diff` shows nothing removed and no `paths:` key added | verified |
| FR-2 / AC-1 | `server-image.yml` ignores the same six entries under `push:` | "After" block below; the six `- ` lines are identical in both files | verified |
| FR-3 / AC-3 | Both keep `workflow_dispatch`; no allow-list, no new step gating, no changed steps | "After" blocks below; `workflow_dispatch:` unchanged in both; diff has no deletions | verified |
| NFR-2 / AC-2 | A written rule beside each filter names and justifies every entry for its own artifact (Vite bundle / Pages upload or API image) | Comment above each `paths-ignore:` block, reproduced below | verified |
| NFR-4 / AC-3 | A mixed diff still triggers both workflows | GitHub evaluates every changed file in the push; a non-ignored path anywhere in the diff matches. See "Mixed diffs" below | verified |
| AC-5 | Live proof that a docs-only push creates no runs | Primary-executed after merge; deliberately not attempted in this phase | not attempted (primary, post-merge) |

## Before / after — `.github/workflows/deploy.yml`

Before (`a103e3c9`):

```yaml
on:
  push:
    branches: [main]
  # Manual re-run. Anything other than main lands as a Pages preview
  # deployment, not on the production URL.
  workflow_dispatch:
```

After (`0a0767f1`):

```yaml
on:
  push:
    branches: [main]
    # Path filter for pushes only. None of these paths feeds the Vite client
    # bundle, so none can change what this job verifies or uploads to Pages:
    # `conductor/**` is specs, plans and evidence; `docs/**` is prose;
    # `.opencode/**` is local agent config; `README.md` and `AGENTS.md` are root
    # documentation; `*.png` is a root screenshot. Anything under `apps/`,
    # `packages/` or `scripts/`, or a root config file, still triggers. Path
    # filters do not apply to `workflow_dispatch`, so manual runs are unaffected.
    paths-ignore:
      - conductor/**
      - docs/**
      - .opencode/**
      - README.md
      - AGENTS.md
      - '*.png'
  # Manual re-run. Anything other than main lands as a Pages preview
  # deployment, not on the production URL.
  workflow_dispatch:
```

## Before / after — `.github/workflows/server-image.yml`

Before (`a103e3c9`):

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

After (`bd568192`):

```yaml
on:
  push:
    branches: [main]
    # Path filter for pushes only. None of these paths is an input to the API
    # container image, so none can change what this job builds and pushes:
    # `conductor/**` is specs, plans and evidence; `docs/**` is prose;
    # `.opencode/**` is local agent config; `README.md` and `AGENTS.md` are root
    # documentation; `*.png` is a root screenshot. Anything under `apps/`,
    # `packages/` or `scripts/`, or a root config file, still triggers. Path
    # filters do not apply to `workflow_dispatch`, so manual runs are unaffected.
    paths-ignore:
      - conductor/**
      - docs/**
      - .opencode/**
      - README.md
      - AGENTS.md
      - '*.png'
  workflow_dispatch:
```

## Cost being removed

The doc-only commit `e2038303` started two full runs on 2026-11-13:

- Deploy: run `43178773457`
- Server image: run `43178773306`

Neither run rebuilt or published anything that the commit could have changed — the
commit touched only documentation — yet both paid for the full verify/build/upload
path. Those two runs are the recurring cost this filter removes. This is safe only
here: unlike `ci.yml` (a required check, where a filtered push creates no run and
therefore no check), Deploy and Server image are not required checks, so suppressing
their push runs never blocks a merge.

## Mixed diffs

GitHub evaluates **all** changed files in a push against the filter. A push is
suppressed only when every changed file matches an ignore pattern. A mixed diff that
contains at least one non-ignored path — anything under `apps/`, `packages/`,
`scripts/`, or a root config file — still triggers both workflows, so a real code
change cannot slip past the gate by bundling documentation with it. `workflow_dispatch`
is not subject to path filters at all and remains available on demand.

## Evidence paths

- `.github/workflows/deploy.yml`
- `.github/workflows/server-image.yml`
- `conductor/tracks/20261117-main-push-path-filters/verification/phase-1.md`

## Deviations

- `.github/workflows/deploy.yml`, `.github/workflows/server-image.yml` — the last
  entry is written `- '*.png'` rather than a bare `- *.png`. In YAML a leading `*` is
  the alias indicator, so an unquoted `*.png` parses as an alias to an undefined
  anchor and GitHub rejects the workflow file. Quoting is syntax only: the ignore
  pattern's value is still exactly `*.png`, and the line is character-for-character
  identical in both files. Phase 2's text-based regression test must account for the
  quotes (e.g. strip surrounding quotes before comparing, or match `'*.png'`).

## Notes

- Phase 2 owns the regression test in `scripts/deploy/workflow.test.ts`, the stale
  comment in `ci.yml`, and `bun run build`; none of those were touched here.
- `ci.yml` was not touched. Its header records why a workflow-level path filter is
  forbidden on a required check.
- AC-5's live push proof is primary-executed after merge and was not attempted.

## Primary verification

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4,161 pass / 1 skip / 0 fail; 4,162 tests across 375 files in 51.15 s; four package typechecks clean; Biome 939 files, no fixes; voxel determinism gate byte-identical for all species and props |
| `bun run build` | 0 | 418 modules transformed, client built in 951 ms; only the pre-existing >500 kB chunk warning |

Independent diff review: `git diff --name-only a103e3c9..HEAD` listed exactly three paths —
`.github/workflows/deploy.yml`, `.github/workflows/server-image.yml` and this evidence file — with
`14 0` insertions/deletions in each workflow. The full diff adds only the written rule and the
six-entry `paths-ignore` block under `push:`; no existing line was removed or changed, so
`workflow_dispatch`, permissions, concurrency, every step, the Bun pin and the production verify
gate are byte-identical (AC-3).

Independent syntax check: `Bun.YAML.parse` on both files returns
`['conductor/**','docs/**','.opencode/**','README.md','AGENTS.md','*.png']` with
`workflow_dispatch` present, confirming the quoted `*.png` is a pattern value rather than an
undefined YAML alias and that the two lists are identical (AC-1, AC-2).

AC-1, AC-2, AC-3 and NFR-2, NFR-4 are met. AC-5 remains post-merge by construction: the
conductor-only commit that records this track's merge is the probe, and the run lists will be
appended to this file in the archived copy.
