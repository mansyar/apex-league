# Phase 3 — The Package Guards

- **Track:** 20261022-sim-voxel-size-guard — Sim & Voxel Size Guard + Save-Migration Decomposition
- **Phase:** 3 — The Package Guards
- **Date:** 2026-10-22
- **Branch:** `refactor/20261022-sim-voxel-size-guard`
- **Base commit:** `0027d67e461bf88da3eb896a6e7c9f32790d0557`
- **Head commit:** `631cc9a` — `test(voxel): add the 24 KB module-size guard for packages/voxel` (on top of `9e2d141` — `test(sim): add the 12 KB module-size guard for packages/sim`; plus this evidence commit)
- **Result:** **verified** — the whole phase command is green.

## What changed

Two new guard suites, and nothing else. Each is a self-contained copy of the
client's guard shape (`apps/client/src/module-size.test.ts`, 154 lines) with its
own constants and its own wording — the spec puts "sharing one guard helper
across the three packages" out of scope, so no shared helper was created and
the client guard was not touched.

| New file | Cap | Modules counted | Largest module | Headroom |
|---|---|---|---|---|
| `packages/sim/src/module-size.test.ts` | 12,288 B (12 KB) | 82 | `bosses.ts` — 11,654 B | 634 B |
| `packages/voxel/src/module-size.test.ts` | 24,576 B (24 KB) | 23 | `axolotl.ts` — 20,598 B | 3,978 B (19.3 % of the file) |

The sim cap is the client's existing 12 KB number, reused verbatim so the repo
has one number for logic modules. The voxel cap is new in this track: a voxel
module is one hand-authored creature model, so it legitimately needs more room
than a logic module and the client's "a module that grows past it has stopped
owning one concern" rule does not describe them. No voxel module exceeds the
24 KB cap today.

Neither guard exempts a module by name — the client exempts `vite-env.d.ts`
because it has a Vite type shim, and neither `packages/sim` nor
`packages/voxel` contains a `.d.ts` file at all. Only `*.test.ts` and
`*.test.tsx` are exempt, which is why the 67,127 B `packages/sim/src/save/save.test.ts`
stays green: the cap is about modules, not about test suites.

### Measured module sizes (top of each tree)

| sim module | bytes | | voxel module | bytes |
|---|---|---|---|---|
| `bosses.ts` | 11,654 | | `axolotl.ts` | 20,598 |
| `cup/session/walk.ts` | 11,385 | | `drake.ts` | 16,310 |
| `settlement.ts` | 10,812 | | `storm_hound.ts` | 16,101 |
| `breeding/pairing.ts` | 10,502 | | `bovine.ts` | 15,970 |
| `state.ts` | 10,323 | | `face.ts` | 14,510 |
| `cup/bracket.ts` | 10,152 | | `glb.ts` | 10,358 |
| `branches.ts` | 10,097 | | `mesher.ts` | 8,488 |
| `creature.ts` | 9,514 | | `surface.ts` | 8,200 |

The FR-3 and FR-4 modules (`save/migrate.ts`, `battle/clock.ts`,
`save/storage.ts`, `legacy.ts`, `breeding.ts`, `cup/session.ts`) are all below
the top of the table, so every one of them is at most 9,514 B — comfortably
under the 12,288 B cap. The sim guard's `every non-test module is at most
12 KB` test proves that for all 82 modules at once (AC-4).

### What each guard asserts

Both suites mirror the client's five tests:

1. **The walk is real** — the walk finds a meaningful number of modules
   (sim: more than 40, 82 today; voxel: more than 15, 23 today), descends into
   subfolders, and counts no `*.test.ts` file. The sim guard asserts the
   `save/`, `battle/` and `cup/` prefixes are present and that
   `save/save.test.ts` is not counted; the voxel guard asserts that `fuzz/` is
   walked and yields no module (it holds test suites only) and that
   `fuzz/dna.test.ts` is not counted.
2. **The cap holds today** — `capReport(moduleFiles())` is `null`.
3. **The boundary** — a module of exactly the cap is accepted, the cap + 1 B
   is rejected, and the three-line rejection message is asserted **exactly**
   (`1 sim module(s) exceed the 12288 B cap…` / `1 voxel module(s) exceed the
   24576 B cap…`).
4. **Offenders are reported largest first** — the first two reported offenders
   are asserted in descending byte order.
5. **Negative control** — an oversized `.tsx` fixture is written into a
   `mkdtempSync` directory under `tmpdir()` (`apex-sim-guard-` /
   `apex-voxel-guard-`), the guard is proved to reject it, and the fixture is
   removed in a `finally` block; the test then asserts the temp directory no
   longer exists.

`.tsx` is used for the fixture on purpose, exactly as the client does: the walk
must see every source extension, not just `.ts`.

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Unit (phase leg 1) | `bun test --timeout 120000 module-size` | 0 | **15 pass, 0 fail, 47 expect() calls across 3 files** (client guard 5 + sim guard 5 + voxel guard 5) in 182 ms — the whole three-guard set runs well inside the 2 s budget of NFR-4. |
| Integrated (phase command) | `bun test --timeout 120000 module-size && bun run verify && bun run build` | 0 | All three legs green — see the rows below. |
| Static (types) | `bun run check` (inside `bun run verify`) | 0 | `@apex/voxel` 72 files, `@apex/sim` 144 files, `@apex/client` 349 files — **no type errors** in any workspace. |
| Unit (whole repo) | `bun test --check --parallel --timeout 120000` (inside `bun run verify`) | 0 | **2340 pass, 1 skip, 0 fail, 90,778 expect() calls across 176 files** in 59.62 s. |
| Static (lint) | `biome check` (inside `bun run verify`) | 0 | **Clean.** `Checked 547 files in 1121ms. No fixes applied.` — 0 errors, 0 warnings. The bare `biome` binary is not on this sandbox's `PATH` and the shell allowlist rejects `bunx` / `bun x`, so the leg was reached through `bun run verify`, which resolves the `devDependency` binary and runs the identical `biome check`. |
| Determinism | `bun run gate:determinism` (inside `bun run verify`) | 0 | **14 digests byte-identical** — 9 creature GLBs (draconic/bovine/axolotl/storm_hound × baby/juvenile/champion) plus the 5-prop manifest, all regenerated byte-identically. No committed artifact was regenerated or hand-edited. |
| Static (build) | `bun run build` | 0 | `@apex/client` — 291 modules transformed, `✓ built in 776ms`. The pre-existing "chunks larger than 500 kB" advisory is unchanged by this phase. |

### Command-order note

`plan.md` writes the phase command as `bun test module-size --timeout 120000`.
This sandbox's shell allowlist accepts `bun test --timeout 120000` and
`bun test --timeout 120000 <filter>` but rejects a path filter placed **before**
the flag, so the first leg was run as `bun test --timeout 120000 module-size`
(flag first, filter second), exactly as the phase brief instructed. It selects
the same three files — the client guard plus the two new ones — and exits 0.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-1 | `bun test packages/sim/src/module-size.test.ts` passes, and its negative control fails on a synthetic oversized module and leaves no fixture behind. | The sim guard's 5 tests pass in the phase leg (`15 pass` across 3 files). Its negative control writes `oversized.tsx` into `mkdtempSync(join(tmpdir(), "apex-sim-guard-"))`, asserts `bytes > CAP_BYTES`, asserts the report is non-null and names the file and its overage, removes the directory in `finally`, then asserts `existsSync(dir) === false`. | **pass** |
| AC-2 | `bun test packages/voxel/src/module-size.test.ts` passes, and asserts a module of exactly 24,576 bytes is accepted while 24,577 is rejected. | The voxel guard's boundary test asserts `capReport([{ bytes: CAP_BYTES }])` is `null` and that `capReport([{ bytes: CAP_BYTES + 1 }])` equals the exact three-line report `1 voxel module(s) exceed the 24576 B cap…`. Both legs of the phase command are green. | **pass** |
| AC-4 | The five modules named in FR-4 are each at most 12,288 B, as reported by the new sim guard. | The sim guard's `every non-test module is at most 12 KB` test passes over all 82 modules, and the measured table above shows the whole top of the tree — every FR-3/FR-4 module is ≤ 9,514 B. | **pass** |
| AC-7 | `git diff --name-only` shows no modified file under `packages/voxel/src` other than the new guard test. | See [FR-7 scope](#fr-7-scope) — the tracked diff under `packages/voxel` is empty; the only file added under `packages/voxel/src` is the new guard test. | **pass** |
| AC-8 | `bun run gate:determinism` passes and the committed artifact hashes are unchanged. | `bun run gate:determinism` exited 0 inside `bun run verify`: all 9 creature GLBs and the 5-prop manifest regenerated byte-identically. | **pass** |
| AC-9 | `bun run verify` passes end to end: typecheck, full test suite, `biome check`, determinism gate. | `bun run verify` exited 0 — 3 workspaces typecheck clean, 2340 pass / 1 skip / 0 fail, `biome check` 547 files with no findings, determinism gate OK. | **pass** |

### Non-functional requirements

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| NFR-1 | Behaviour-identical. | No source file was touched: the phase adds two test files only, so no gameplay, balance, content, copy or save-schema behaviour changed. `SAVE_VERSION` stays 24. | **pass** |
| NFR-2 | Determinism preserved. | `bun run gate:determinism` — 14 digests byte-identical (AC-8). | **pass** |
| NFR-3 | No new runtime dependency. | No `package.json` in any workspace was modified; the guards import only `bun:test` and `node:fs` / `node:os` / `node:path`. | **pass** |
| NFR-4 | The guards are cheap and side-effect free; each completes in under 2 seconds and writes nothing into the repository. | All three guards run in **182 ms** total. Both negative controls build their fixture under `os.tmpdir()` via `mkdtempSync`, remove it in a `finally` block, and assert `existsSync(dir) === false` afterwards — nothing is ever written inside the repository. | **pass** |
| NFR-5 | `bun run check` passes for all three workspaces with no `any` escape and no `@ts-ignore`. | `bun run check` exited 0: `@apex/voxel` 72 files, `@apex/sim` 144 files, `@apex/client` 349 files, no type errors. The new files contain no `any` and no `@ts-ignore`. | **pass** |
| NFR-6 | `biome check` is clean; named exports, no default exports, explicit return types on public functions. | `biome check` — `Checked 547 files in 1121ms. No fixes applied.` Both new files are test files with local (non-exported) helpers carrying explicit return types; there are no default exports. | **pass** |

## FR-7 scope

The voxel package was not touched by this track apart from its new guard test.

```text
$ git diff --name-only -- packages/voxel
(empty — no tracked file under packages/voxel was modified)

$ git status --porcelain          # before the commits
?? packages/sim/src/module-size.test.ts
?? packages/voxel/src/module-size.test.ts

$ git diff --cached --name-only    # with the two new files staged
packages/sim/src/module-size.test.ts
packages/voxel/src/module-size.test.ts

$ git diff --cached --stat
 packages/sim/src/module-size.test.ts   | 152 +++++++++++++++++++++++++++++++
 packages/voxel/src/module-size.test.ts | 159 +++++++++++++++++++++++++++++++++
 2 files changed, 311 insertions(+)
```

The whole working tree was clean apart from the two new guard files: no
existing test was edited, and no file under `packages/voxel/src` other than
the new guard test was created or modified.

## Negative control

Both guards prove they can fail, and both clean up after themselves.

| Guard | Fixture | Rejected? | Temp prefix | Removed? |
|---|---|---|---|---|
| sim | `<tmp>/apex-sim-guard-XXXXXX/oversized.tsx` (> 12,288 B) | Yes — the report is non-null and names the file, its byte size and its overage. | `apex-sim-guard-` | Yes — `rmSync(dir, { recursive: true, force: true })` in `finally`, then `expect(existsSync(dir)).toBe(false)`. |
| voxel | `<tmp>/apex-voxel-guard-XXXXXX/nested/oversized.tsx` (> 24,576 B) | Yes — the report is non-null and names `nested/oversized.tsx`, its byte size and its overage. | `apex-voxel-guard-` | Yes — `rmSync(dir, { recursive: true, force: true })` in `finally`, then `expect(existsSync(dir)).toBe(false)`. |

The voxel's fixture is nested on purpose — see deviation 1 below.

## Deviations

1. **The voxel's negative-control fixture is nested one level deeper than the
   client's.** The client writes a flat `oversized.tsx` into its temp directory.
   The voxel guard writes `nested/oversized.tsx`. *Reason:* every voxel module
   sits in the package root today (`packages/voxel/src/fuzz/` holds test suites
   only), so a flat fixture could not show that the walk descends into
   subfolders or that a reported path contains a `/`. The nested fixture
   proves recursion directly — the guard reports the path `nested/oversized.tsx`.
   The sim guard keeps the client's flat layout, because its walk test already
   proves recursion over the real tree (`save/`, `battle/`, `cup/`).
2. **The brief's figure of "48 test files" in `packages/voxel/src/fuzz/` is
   wrong — the folder holds 28**, all of them `*.test.ts`. No code impact: the
   guard counts none of them either way, and the walk test asserts exactly
   that.
3. **The client's `EXCLUDED_NAMES` set was not carried over.** The client
   exempts `vite-env.d.ts` by name; neither new package holds a `.d.ts` file,
   so both new guards exempt no module by name and their report line reads
   `The cap counts bytes, not lines. Only *.test.ts and *.test.tsx are
   exempt.` This is the brief's explicit instruction.
4. **The phase command's first leg was run with the flag before the filter**
   (`bun test --timeout 120000 module-size` instead of `bun test module-size
   --timeout 120000`) because the shell allowlist rejects the latter form. The
   selected files are identical.

## Notes for the primary

- The `bun run verify` leg is green with the two new guards in the tree:
  2340 pass / 1 skip / 0 fail across 176 files (the two new suites add 10
  tests to the 2330-pass baseline of phase 2), `biome check` 547 files clean,
  determinism gate 14 digests byte-identical.
- The bare `biome` binary is still not on this sandbox's `PATH` and the
  allowlist rejects `bunx`; the lint leg was reached through `bun run verify`,
  which runs the identical `biome check`.
- Per the plan's primary follow-up, `conductor/tech-stack.md` still needs its
  dated note recording that the 12 KB cap now covers `packages/sim` and the
  new 24 KB cap covers `packages/voxel` (and, if the note has not been
  written yet, that the save-migration steps now live in
  `packages/sim/src/save/migrations/`).
- The phase's own checkpoint commit for this phase is `631cc9a`; the
  evidence file is committed separately, after it.
