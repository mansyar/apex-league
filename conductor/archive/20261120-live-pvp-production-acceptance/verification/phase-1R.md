# Phase 1R Verification — Container runtime module resolution

- Track: `20261120-live-pvp-production-acceptance` (Live PvP Production Acceptance)
- Phase: 1R — Container runtime module resolution (owner-approved deviation)
- Date: 2026-11-20
- Branch: `fix/20261120-live-pvp-production-acceptance`
- Base commit: `59aada7168106ac6852b509a4bbc397c3188f243`
- Head commit: the Phase 1R checkpoint recorded in `plan.md` (the fix and this
  evidence file are committed together in that single conventional commit).
- Result: **verified by primary** — the canonical fix is applied, the
  deploy-contract test is proven failing-first → passing, all five configured
  verification commands exit 0, and the image-like boot proof passes in an
  isolated temp layout. The production redeploy/browser proof remains Phase 1.

## What changed

- `apps/server/package.json`: added `"@apex/sim": "workspace:*"` to
  `dependencies` (existing entries and formatting preserved).
- `bun.lock`: regenerated with `bun install` from the repo root; the only diff is
  `workspaces["apps/server"].dependencies["@apex/sim"] = "workspace:*"`. No other
  manifest or lockfile entry moved.
- `apps/server/Dockerfile`: runtime stage now copies
  `packages/sim/package.json` and `packages/sim/src` after the root
  `package.json`/`bun.lock` copy and before `COPY apps/server/src`. The `deps`
  stage, `apps/server/tsconfig.json`, client/sim/voxel sources, module caps and
  deploy workflow YAML were not touched.
- `scripts/deploy/server-image.test.ts`: new
  `describe("the server image resolves its workspace imports", ...)` with three
  tests asserting the manifest entry, the lockfile entry and both Dockerfile
  `COPY` lines. Because `bun.lock` is JSONC (trailing commas), a small
  `parseLockfile` helper strips trailing commas before `JSON.parse`; no comments
  exist in the lockfile.

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Failing-first (pre-fix) | `bun test scripts/deploy/server-image.test.ts --timeout 120000` | 1 | 10 pass / 3 fail / 41 expect() calls. All three new assertions failed: manifest `undefined`, lockfile `undefined`, Dockerfile missing `COPY packages/sim/src ./packages/sim/src`. |
| Lockfile regen | `bun install` | 0 | `Saved lockfile`; `Checked 90 installs across 195 packages (no changes)`; only `bun.lock` changed beyond the manifest. |
| Deploy contract (post-fix) | `bun test scripts/deploy/server-image.test.ts --timeout 120000` | 0 | 13 pass / 0 fail / 41 expect() calls. |
| Static/unit | `bun run verify` | 0 | 4446 pass / 1 skip / 0 fail; 4447 tests across 435 files; 665687 expect() calls; Biome: 1029 files clean, no fixes; final sim hash `0xff6f3d62`; determinism gate ran internally (all species/props byte-identical). |
| Build | `bun run build` | 0 | Vite 8.3.4 built 438 modules in 997 ms; pre-existing >500 kB chunk warning only. |
| Balance | `bun run balance` | 0 | 21 species / 1680 matrix fights / 24 doctrine / 252 boss; all species, capShare 30.8%, decisiveShare 93.7%, capWinQuality 80.3%, duration and damage-band gates OK. |
| Determinism | `bun run gate:determinism` | denied | Shell permission rejected this exact command; not retried or worked around. Its substance ran inside `bun run verify` (all 21 species × 3 stages + 5 props byte-identical). |
| Fuzz | `bun run test:fuzz` | denied | Shell permission rejected this exact command; not retried or worked around. |
| Image-like boot | temp-layout setup + `bun install --frozen-lockfile --production` + `DATABASE_PATH=<temp>/boot.sqlite PORT=3461 ALLOWED_ORIGIN=http://localhost:5174 bun apps/server/src/main.ts` (from the temp root) | denied | The filesystem setup command was rejected by shell scope before install/boot could run; no boot claim is made. See "Blocked boot proof" below. |

### Failing-first output (captured verbatim, key lines)

```
error: expect(received).toBe(expected)
Expected: "workspace:*"
Received: undefined
(fail) the server image resolves its workspace imports > the server manifest declares the sim workspace dependency

error: expect(received).toBe(expected)
Expected: "workspace:*"
Received: undefined
(fail) the server image resolves its workspace imports > the lockfile records the sim dependency for the server workspace

error: expect(received).toContain(expected)
Expected to contain: "COPY packages/sim/src ./packages/sim/src"
(fail) the server image resolves its workspace imports > the runtime stage carries the sim source into the image

 10 pass
 3 fail
 41 expect() calls
Ran 13 tests across 1 file. [51.00ms]

Exit code: 1
```

### Post-fix output

```
 13 pass
 0 fail
 41 expect() calls
Ran 13 tests across 1 file. [24.00ms]
Exit code: 0
```

### Blocked boot proof

The brief's step 4 could not be started. The exact command rejected by the shell
scope (first step — create the temp root and copy the five manifests) was:

```
$root = "C:\Users\Ansyar\AppData\Local\Temp\opencode\phase-1r-boot"
New-Item -ItemType Directory -Force -Path "$root\apps\client","$root\apps\server","$root\packages\sim","$root\packages\voxel"
Copy-Item "D:\Projects\battle-pets\package.json" "$root\package.json"
Copy-Item "D:\Projects\battle-pets\bun.lock" "$root\bun.lock"
Copy-Item "D:\Projects\battle-pets\apps\client\package.json" "$root\apps\client\package.json"
Copy-Item "D:\Projects\battle-pets\apps\server\package.json" "$root\apps\server\package.json"
Copy-Item "D:\Projects\battle-pets\packages\sim\package.json" "$root\packages\sim\package.json"
Copy-Item "D:\Projects\battle-pets\packages\voxel\package.json" "$root\packages\voxel\package.json"
```

Result: `{"error":{"type":"permission.rejected","message":"Permission denied: shell"}}`.

Expected, had it been permitted: after `bun install --frozen-lockfile
--production`, copying `apps/server/src`, `apps/server/migrations`,
`apps/server/package.json`, `packages/sim/package.json` and `packages/sim/src`
into the temp layout, and booting with a temp SQLite database on port 3461, the
log line `apex server listening on :3461, database ..., allowed origin ...`
with no `Cannot find module '@apex/sim'` error. This remains unverified here and
is a blocker for the primary.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| FR-6 | Published image declares, locks and carries the sim source so `main.ts` resolves every import | Manifest/lockfile/Dockerfile assertions pass post-fix (13/13); boot proof not runnable under shell scope | partial |
| AC-6 | All five commands exit 0 with hash `0xff6f3d62`, caps pass, only the approved deviation changed | `verify`, `build`, `balance` exit 0; `gate:determinism` and `test:fuzz` denied; hash `0xff6f3d62` in verify; no module-cap allowlist change; no protocol/save/balance/pacing/CORS change | blocked (2 commands denied) |
| AC-9 | Deploy-contract test fails before and passes after the fix; `main.ts` boots with imports resolved | Failing-first 3-fail run and post-fix 13-pass run recorded above; boot half denied | partial |

## Deviations

- The brief's "use `JSON.parse`" instruction needed a small adaptation: `bun.lock`
  is JSONC with trailing commas, so a strict `JSON.parse` of the raw text threw
  `SyntaxError: Property name must be a string literal` before any assertion
  ran. The test now strips trailing commas with
  `text.replace(/,(\s*[}\]])/g, "$1")` before `JSON.parse`. It still uses
  `readFileSync` + `JSON.parse`, named exports, `const`, double quotes and no
  `any`.
- Two named verification commands and the boot-proof filesystem setup were
  denied by the subagent shell scope; they are reported as blockers, not
  retried, decomposed or worked around.

## Notes

- No Docker invocation was attempted; the brief's temp-layout simulation was
  the intended image-like proof and is blocked as recorded above.
- No visual/browser proof was attempted. The production redeploy and two-client
  browser proof remain **Phase 1** work and are **not claimed here**; this
  phase only closes the module-resolution defect found in the container boot
  error.
- No module-cap allowlist was changed and the final sim hash stayed
  `0xff6f3d62` in `bun run verify`.
- Working tree contains only the four code/test files in the brief's Touches
  plus this evidence file; they are committed together in the single commit
  that follows this report.

## Primary verification (independent re-run)

All commands were run separately by the primary on the final Phase 1R tree;
outputs are under `C:\Users\Ansyar\AppData\Local\Temp\opencode\p1r-verify\`.

| Command | Exit | Summary |
|---|---|---|
| `bun run verify` | 0 | 4446 pass / 1 skip / 0 fail, 665687 `expect()` calls, 4447 tests across 435 files, Biome + typecheck clean, final hash `0xff6f3d62` |
| `bun run build` | 0 | Vite build OK (pre-existing >500 kB chunk warning only) |
| `bun run balance` | 0 | 1680 fights, capShare 30.8% <= 33.3%, all 34 gates OK |
| `bun run gate:determinism` | 0 | All 21 species x 3 stages + 5 props byte-identical |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls |
| `bun test scripts/deploy/server-image.test.ts --timeout 120000` | 0 | 13 pass / 0 fail, 41 `expect()` calls |

### Image-like boot proof

- Temp layout at `C:\Users\Ansyar\AppData\Local\Temp\opencode\phase-1r-boot`
  reproduced the Dockerfile runtime stage: all workspace manifests plus root
  `package.json`/`bun.lock`, `bun install --frozen-lockfile --production` (exit
  0), then `apps/server/src`, `apps/server/migrations`,
  `packages/sim/package.json` and `packages/sim/src`.
- Boot with `DATABASE_PATH=<temp>/boot.sqlite PORT=3461 ALLOWED_ORIGIN=http://localhost:5174 bun apps/server/src/main.ts`
  produced exactly:
  ```
  apex server listening on :3461, database ...\boot.sqlite, allowed origin http://localhost:5174
  ```
  with empty stderr and no module-resolution error.
- Negative control: deleting `packages/sim` from the same temp layout and
  rebooting on port 3462 reproduced the original failure verbatim:
  ```
  error: Cannot find module '@apex/sim' from '...\apps\server\src\live\route.ts'
  ```
  This proves the Dockerfile copies are load-bearing, not decorative.

**Verdict:** AC-6 and AC-9 satisfied. Phase 1R accepted. This does not claim a
production redeploy or browser proof — those remain Phase 1 work.

## Follow-up: CI image build exposed the dockerignore gap

After PR #83 merged, the `Server image` workflow at commit `45211d83` failed at
`COPY packages/sim/src ./packages/sim/src` with:

```
ERROR: failed to calculate checksum ... "/packages/sim/src": not found
Dockerfile:55
```

`apps/server/Dockerfile.dockerignore` excludes `packages/sim/**` and re-includes
only `package.json`; the build context therefore never contained `src`. The
runtime fix was extended with:

```
!packages/sim/src
!packages/sim/src/**
```

and the deploy-contract test now also asserts both exceptions, so a future
removal fails locally. This is part of the same owner-approved deviation; no new
scope. The follow-up fix ships in a separate PR because PR #83 was already
merged.


