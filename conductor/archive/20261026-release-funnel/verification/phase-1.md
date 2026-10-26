# Phase 1 — Dev host config

| | |
| --- | --- |
| Track | `20261026-release-funnel` — Release Funnel |
| Phase | 1 — Dev host config |
| Date | 2026-10-26 |
| Branch | `chore/20261026-release-funnel` |
| Base commit | `3cc40e05` |
| Code head | `788aef60` |
| Phase head | last commit on the branch touching this file (`git log -1 --format=%h -- <this file>`) |
| Covers | FR-4, NFR-7, AC-4 |
| **Result** | **verified** |

This evidence file is committed on top of the code head above; the phase
report lists every commit, including this file's. Every command in the tables
below was re-run against the code head after the phase was assembled; the
results reproduced exactly, including the 2808-test count.

## What changed

`apps/client/vite.config.ts` no longer names a machine. The dev-server Host
allowlist is built from `DEV_ALLOWED_HOSTS` by an exported pure helper:

```ts
export function allowedHostsFrom(raw: string | undefined): string[] {
  if (raw === undefined) return []
  return raw
    .split(",")
    .map((host) => host.trim())
    .filter((host) => host.length > 0)
}
```

`server.allowedHosts` is fed by `allowedHostsFrom(process.env.DEV_ALLOWED_HOSTS)`.
Unset or empty yields `[]`, which leaves Vite's localhost-only default in place —
the behaviour a local `bun run dev` had before. The `@apex/sim` alias is
untouched. `.env.example` documents the variable; `.gitignore` gains
`!.env.example` so the file is committable (see Deviations).

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `bunx biome check apps/client/vite.config.ts apps/client/vite.config.test.ts` | 0 | Clean after one formatter fix (a line-wrapped `expect(...).toEqual`). |
| typecheck | `bun run check` | 0 | `sim` 151, `voxel` 118, `client` 389 files — no type errors. |
| unit (red) | `bun test ./apps/client/vite.config.test.ts` | 1 | `SyntaxError: Export named 'allowedHostsFrom' not found`. 0 pass, 1 fail, 1 error. |
| unit (red, source shape) | `bun test ./.conductor/evidence/phase-1-red-repro.test.ts` | 1 | 0 pass, 2 fail — the archived pre-change config matched `/msi-1/i` and did not read the env. |
| unit (red, historical) | `bun test ./.conductor/evidence/phase-1-red-source-shape.test.ts` | 0 | 2 pass — asserts the same two violations *were* present, so the red stays documented on a green suite. |
| unit (green) | `bun test ./apps/client/vite.config.test.ts` | 0 | 8 pass, 0 fail, 10 assertions. |
| unit (behaviour, e2e) | `bun test ./.conductor/evidence/phase-1-behaviour.test.ts` | 0 | 3 pass — the variable reaches `server.allowedHosts` through a real config load. |
| build (before) | `bun run build` | 0 | 314 modules, `index-CI37K-Je.js` 916.63 kB, `index-DdmaZZpS.css` 66.67 kB. |
| build (after) | `bun run build` | 0 | Identical: same 314 modules, same two hashed asset names and sizes. |
| build (compare) | `bun test ./.conductor/evidence/phase-1-dist-compare.test.ts` | 0 | The two recorded `dist` listings are equal, 25 files each. |
| determinism | `bun run gate:determinism` | 0 | All 27 creature GLBs and 5 props regenerate byte-identical. |
| **phase verification** | `bun test --check --parallel=4 --timeout 120000` | **0** | **2807 pass, 1 skip, 0 fail — 2808 tests across 240 files.** |
| verify_phase | `bun run verify && bun run build` | 1 | Stops at `biome check` on a pre-existing `metadata.json` CRLF formatting error; every earlier layer passed. See Notes. |

### The recorded red

The test file as written failed at import on the pre-change config, before its
assertions ran:

```
apps\client\vite.config.test.ts:

# Unhandled error between tests
-------------------------------
SyntaxError: Export named 'allowedHostsFrom' not found in module
'D:\Projects\battle-pets\apps\client\vite.config.ts'.
-------------------------------


 0 pass
 1 fail
 1 error
Ran 1 test across 1 file. [170.00ms]

Exited with code 1
```

That proves the behaviour half was red but skips the source-shape half, so the
same three source assertions were applied to the archived pre-change config
(`git show 3cc40e05:apps/client/vite.config.ts`, saved as
`.conductor/evidence/phase-1-vite-config-before.ts`). Reproduced on demand, so
this is a recorded run rather than a quotation:

```
(fail) names no literal hostname
  Expected substring or pattern: not /msi-1/i
  Received: "... allowedHosts: [\"msi-1.tail7dcc44.ts.net\"], ..."

(fail) feeds the allowlist from the environment, not a literal
  Expected substring or pattern: /allowedHosts:\s*allowedHostsFrom\(...\)/

 0 pass
 2 fail
 2 expect() calls
Ran 2 tests across 1 file. [10.00ms]
Exited with code 1
```

`.conductor/evidence/phase-1-red-source-shape.test.ts` keeps those same two
violations in the suite as *passing* assertions, so a later green run still
records what the red looked like instead of losing it.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-4 (source shape) | `apps/client/vite.config.ts` contains no literal hostname | `vite config source › names no literal hostname` asserts the file matches neither `/msi-1/i`, nor `/ts\.net/i`, nor any quoted `...tail...` literal. The red run above shows the old file violating all three. | pass |
| AC-4 (wiring) | The allowlist comes from the variable, not a literal | `vite config source › feeds the allowlist from the environment` matches `allowedHosts: allowedHostsFrom(process.env.DEV_ALLOWED_HOSTS)` in the source, and `the exported config › wires server.allowedHosts to the variable` compares the loaded config's value against the helper applied to the live variable. | pass |
| AC-4 (behaviour) | Setting the documented environment variable restores the remote-dev behaviour | `allowedHostsFrom` cases: unset → `[]`, `""` → `[]`, one host → one entry, `"a, b ,c"` → trimmed three, `"a,,"` → empties dropped. End-to-end, `.conductor/evidence/phase-1-behaviour.test.ts` sets `DEV_ALLOWED_HOSTS` before the config module is first evaluated and reads `server.allowedHosts` back: unset → `[]`, `pets.example.dev` → `["pets.example.dev"]`, `"a.example.dev, b.example.dev"` → both trimmed. 3 pass. | pass |
| AC-4 (documentation) | The variable is documented | `.env.example` names `DEV_ALLOWED_HOSTS`, gives a commented comma-separated example, and states it is only needed for remote/Tailscale dev and can stay unset locally. | pass |
| NFR-7 | Build output shape unchanged — same entry, same asset layout, `dist/` still gitignored | The two listings below are identical, including every SHA-256. `.gitignore` line 2 is still `dist/`. | pass |

## `apps/client/dist` — before and after

Both builds: `vite v8.3.4`, 314 modules transformed. The listings below are the
literal contents of `.conductor/evidence/phase-1-dist-before.txt` and
`phase-1-dist-after.txt`; `phase-1-dist-compare.test.ts` asserts they are equal
line for line.

| File | Bytes | SHA-256 (before = after) |
| --- | --- | --- |
| `assets/index-CI37K-Je.js` | 916634 | `cc2fe8c6d8be2b9df358a47b796268f9760c2f24da56b6bb2f7be057f2978eb5` |
| `assets/index-DdmaZZpS.css` | 66671 | `16dbb6ca27fe12fd3d9b1a20d8e5af9b6f6aaa564eeae773de1f2ea2e417204a` |
| `audio/CREDITS.md` | 2361 | `7dfb5788a0caa346b745e5796385c823ca16a23de8b2a4593115a541f286e1bf` |
| `audio/jingles/verdict-0.ogg` | 39948 | `1010c9b566d6c090ff03a4aaaf7439e26eb4cc4f20373800d0b7e6a9057b795d` |
| `audio/jingles/verdict-1.ogg` | 16796 | `f396b3bb91cf939b51b64c734db01187d70a59cf74dd83cb9d6746e00552d50e` |
| `audio/music/arena.ogg` | 468099 | `19f37b773f34d093fffede77252b085e03ebb73c79e7a44b8b1f722126c0e1c5` |
| `audio/music/ranch.ogg` | 597983 | `69b19e81e437281e7ee8744bd28c7b4c9de08c2be53e06062860b91c91aaadaa` |
| `audio/sfx/care-feed.ogg` | 9319 | `2b07edafc1f3f49c4813f2b0ae9481c566c1f9962a22d5f5b79da7111e058e56` |
| `audio/sfx/care-pet.ogg` | 6941 | `c977fe249ff42d1c93a552b33abc13a8399df3879fa510475426e5c4bbac1da9` |
| `audio/sfx/care-play.ogg` | 6317 | `be97ec4893a02d6eccfb678daa76c83e34cb2583b834ec2593d2641def739fa4` |
| `audio/sfx/care-rest.ogg` | 11787 | `8a7451193c38bc05483aec25dd193e163a15d44cf7fff04ac7912573231b0201` |
| `audio/sfx/care-treat.ogg` | 5732 | `9a6f16e3c2eff6fe5d017a4755a28306b14555728831cd00d70308e8f9689566` |
| `audio/sfx/dawn-chime.ogg` | 14169 | `33b17a9a9a2397c62b285c52c33a907fdffb476909c99e42dde603f6a7a8b12c` |
| `audio/sfx/fire-0.ogg` | 25566 | `a56d95794cd732d6c2d66ce488c14cf557fe526c282897c9a77675c2bd9b77e6` |
| `audio/sfx/fire-1.ogg` | 27440 | `e5e0b6ccc4d5720c8174a3e5b7cc6f9be3057352a89cbb2e99a00efc6fe5cc11` |
| `audio/sfx/fire-calm.ogg` | 7286 | `72b589eadd41781257ac859e4f4d030222e623390e4a1a83f6d05329a6e026f1` |
| `audio/sfx/hit-plate-0.ogg` | 10921 | `b670d30452983369771081319c268475edaaafe782bf4e8d70bd7eef09d8823c` |
| `audio/sfx/hit-plate-calm.ogg` | 10474 | `6e797cf8a5bfc52d7ed5eb47c227974c1cf2a674954fec5b539cea7d62c7282c` |
| `audio/sfx/ko-0.ogg` | 6110 | `e07045693e4a2b3d165c424e3dab4c781d9ff8880a386880ac89a51315d7f831` |
| `audio/sfx/ko-bell.ogg` | 13915 | `94b8bb5f2d43ab65e4bcc32b28562416e9bc2c51d9fd4be1e333660ee52f977f` |
| `audio/sfx/melee-hit-0.ogg` | 6570 | `49e7ca88743fca974bb8676ea138b751cfd8f9033b5e7af8736c2a215d6edbc1` |
| `audio/sfx/melee-hit-1.ogg` | 8800 | `486988aa2d6440ffc4c62a0e8ccf3c23673ba84424bd4723378d451b7255eb5c` |
| `audio/sfx/melee-hit-2.ogg` | 11617 | `b33a8f14068aec24ec69ba85e5e87fdc41228975f6a1a3e44a6e7d6fc3d9f8d8` |
| `audio/sfx/melee-hit-calm.ogg` | 5351 | `7d3ba0bb5e60a11b5d3e558c141303dcf494256675fbf753c0d252d2cf0481e3` |
| `index.html` | 2139 | `6c592f993b1fd7e97c7933cc934a137d77c9f1525e5609e0be66bf6474e23e3e` |

25 files before, 25 files after, no additions or removals. `dist/` is still
gitignored and was not committed.

## Deviations

| File | Why |
| --- | --- |
| `.gitignore` | `.env.*` (line 7) matches `.env.example`, so the documented file would have been silently untracked. Added `!.env.example` directly after it. Pre-authorized by the brief. The negation is the only `.gitignore` change; `dist/` and `.env` behaviour are untouched. |

No other file outside `Touches` was modified.

## Notes

- **`verify_phase` does not pass, and the cause is not this phase.** The
  configured `verify_phase` is `bun run verify && bun run build`. It exits 1 at
  the `biome check` step on `conductor/tracks/20261026-release-funnel/metadata.json`:
  Biome wants LF and the file was committed with CRLF. `git diff 3cc40e05 --
  conductor/tracks/20261026-release-funnel/metadata.json` is empty, so the file
  is exactly as the base commit left it, and Conductor state is the primary
  agent's to edit. Every layer before `biome check` passed in that same run:
  all three workspaces typechecked, and 2807 tests passed. The remaining layers
  were run separately and passed: `biome check` on the two touched files, and
  `bun run gate:determinism` (27 creature GLBs + 5 props byte-identical).
  `bun run build` also passes. **Suggested fix, for the primary:** re-save
  `metadata.json` with LF, then `bun run verify` will be green.
- `biome check` also reports one warning in `apps/client/src/ranch.css`
  (`noDescendingSpecificity`, pre-existing, untouched by this phase). Warnings
  do not fail the run; the `metadata.json` formatting error does.
- **Why an exported helper rather than only a string match.** A source-shape
  assertion proves the machine name is gone but says nothing about whether the
  variable still works. Exporting `allowedHostsFrom` lets the behaviour be
  checked directly, and one extra test compares the loaded config's
  `server.allowedHosts` to the helper applied to the live variable — so the
  wiring itself, not just the helper, is pinned.
- `server.allowedHosts` is a dev-server-only option and `vite build` never reads
  it, which is why NFR-7 holds. It is proven rather than assumed: the before and
  after listings above carry identical hashes for all 25 files, including both
  content-hashed bundle names, so even the asset filenames are unchanged.
- Both builds report 314 modules transformed, confirming the config change added
  no import to the build graph — the helper is tree-shaken out of the bundle.
- Throwaway helpers live under `.conductor/evidence/` (gitignored, never
  committed): the two `dist` listings, the archived pre-change config, and six
  `*.test.ts` probes. `bun test` does not discover them — they ran only when
  named explicitly with a `./` path, and the phase totals prove it: the first
  full run had three of them on disk and reported 2807 tests, then adding one
  committed test moved it to 2808, not 2811. The phase-verification command
  still reports 2808 at the phase head with all six on disk.
- **Re-verification at the phase head.** After this file was committed, every
  command above was re-run against the code head (`788aef60`) and reproduced: `bun test
  --check --parallel=4 --timeout 120000` → 2807 pass, 1 skip, 0 fail, 2808
  tests; `bun run check` → clean in all three workspaces; `bunx biome check` on
  the two touched files → clean; `bun run build` → 314 modules and the same
  asset names; the re-listing matched `phase-1-dist-before.txt` byte for byte,
  so the third independent build agrees with the first two. The red was
  reproduced live via `phase-1-red-repro.test.ts` (2 fail) rather than quoted.
- Module sizes are well under the 12 KB cap: `vite.config.ts` is 1057 B and
  `vite.config.test.ts` is 2349 B. Both sit outside `src/`, so the cap guard does
  not scan them, but neither is near the limit.
- Nothing under `packages/` changed, and the client runtime is untouched — the
  only client change is a build-time config file.

## Primary verification

- **Date:** 2026-10-26
- **By:** Conductor primary, independent of the subagent report
- **Tree:** clean at `3cc40e05..5311c8db` before this append.

### Squash guard

`git log 3cc40e05..HEAD` = exactly 6 commits, all reported by the subagent,
all linear (each has a single parent), no merge commits and no user commits:

| Commit | Subject | Files |
| --- | --- | --- |
| `d78aa068` | feat(client): read the dev host allowlist from the environment | `vite.config.ts`, `vite.config.test.ts` |
| `788aef60` | docs(client): document DEV_ALLOWED_HOSTS | `.env.example`, `.gitignore` |
| `c4d1d644` | docs(conductor): record phase 1 verification | evidence |
| `efc3e6aa` | docs(conductor): reproduce the phase 1 red and re-verify at head | evidence |
| `4af49202` | docs(conductor): point the phase 1 evidence at its own head commit | evidence |
| `5311c8db` | docs(conductor): describe the phase 1 evidence head without a fixed sha | evidence |

The first three were produced by the initial subagent launch, whose *report*
failed to reach the primary (host concurrency error) after the work was already
committed. The retry re-verified the same tree independently and added the
remaining three. Squash is therefore safe.

### Files changed

`git diff --name-only 3cc40e05..HEAD` = 5 paths, all within Touches:

`.env.example`, `.gitignore`, `apps/client/vite.config.test.ts`,
`apps/client/vite.config.ts`, and the phase evidence file.

`.gitignore` is the one path outside Touches - the sanctioned deviation
(`.env.*` on line 7 would otherwise silently ignore `.env.example`). The
diff is the single negation line `!.env.example`; `dist/` and `.env`
behaviour are untouched.

### Fix spot-check (direct reads by the primary)

- `apps/client/vite.config.ts` - the literal `"msi-1.tail7dcc44.ts.net"` is
  gone; the file now exports `allowedHostsFrom(raw: string | undefined)` and
  wires `server.allowedHosts` to `allowedHostsFrom(process.env.DEV_ALLOWED_HOSTS)`.
  The `@apex/sim` alias is unchanged. The comment explains the variable and
  names no machine.
- `apps/client/vite.config.test.ts` - 63 lines, 8 tests. Two source-shape
  assertions (no `/msi-1/i`, no `/ts\.net/i`, no quoted `...tail...`
  literal; and a regex pinning the env wiring) plus five `allowedHostsFrom`
  cases (unset, empty, single, comma-list-with-spaces, empty-entries) and one
  loaded-config assertion comparing `config.server?.allowedHosts` to
  `allowedHostsFrom(process.env.DEV_ALLOWED_HOSTS)`. The last one proves the
  wiring, not just the helper - it is the reason this is a behavioural pin
  rather than a string match. Genuine coverage, not a tautology.

### Independent gates

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| unit | `bun run test:phase` | 0 | 2807 pass, 1 skip, 0 fail - 2808 tests across 240 files, 267,347 expect() calls, 32.98s |
| static / determinism | `bun run verify` | 0 | typecheck clean in all three workspaces; Biome clean; determinism gate OK - all 27 creature GLBs and 5 props byte-identical |
| build | `bun run build` | 0 | Vite build succeeded; pre-existing >500 kB chunk advisory only |

### Primary fix attempt 1

The first `bun run verify` run failed at `biome check` on
`conductor/tracks/20261026-release-funnel/metadata.json` - the file was
committed with CRLF and Biome wants LF. `git diff 3cc40e05 -- <metadata.json>`
was empty, so it was exactly as the base commit left it; Conductor state is the
primary's to edit. Re-saved the file with LF endings and re-ran: `biome check`
clean, `bun run verify` exit 0.

### Acceptance criteria

- **AC-4** - satisfied on all four readings. Source shape: the config contains
  no literal hostname. Wiring: pinned by regex against the source *and* by
  comparing the loaded config's `server.allowedHosts` to the helper applied to
  the live variable. Behaviour: the helper is exercised across five inputs, and
  the subagent's end-to-end probe set the variable before first module
  evaluation and read the value back. Documentation: `.env.example` names the
  variable, gives a comma-separated example, and states it is only needed for
  remote dev.
- **NFR-7** - satisfied and proven, not assumed. The before and after `dist`
  listings in the evidence are identical across all 25 files with matching
  SHA-256 hashes, including both content-hashed bundle names, and both builds
  report 314 modules. The primary's own rebuild reproduced the same asset
  names, confirming the config change added nothing to the build graph.

**Result:** phase accepted. The dev config is free of machine-specific state,
the remote-dev behaviour is restored by a documented environment variable, and
the production artifact is provably unchanged.
