# Phase R1 Evidence — Review Fixes (Battle Choreography for All Creatures)

- **Track:** `20261024-battle-choreography-all-creatures`
- **Phase:** R1 — resolve review finding F1
- **Date:** 2026-10-24
- **Branch:** `feat/20261024-battle-choreography-all-creatures`
- **Base:** `3dcb2ca` (`3dcb2cac9d16375b44f3512b2da5341ee3817b9d`)
- **Head:** `a90c2f2` (`fix(client): orient stretched shots at spawn so wind's authored spin renders`)
- **Result:** **verified** — F1 resolved; water and earth pinned byte-identical; all gates green.

## F1 acceptance

| What changed | Why it resolves the finding | The spawn-predicate guard |
| --- | --- | --- |
| `fx/projectiles.ts` `spawn()`: after `core.position.copy(origin)`, a stretched look is oriented **once** with `core.lookAt(target.x, origin.y, target.z)` — the horizontal `target − origin` aim with y held at the origin, matching the old per-frame branch's semantic exactly. | The old per-frame `else if ((p.look.stretch ?? 1) > 1.2)` called `p.mesh.lookAt(...)` every frame, rewriting the full quaternion **after** the spin branch had added `rotation.z += spin·dt` / `rotation.x += spin·0.6·dt` — so wind's authored `spin: 0.03` was discarded before render (dead config, FR-5's "high-spin streak" never read). The flight line is fixed per shot, so orienting once at spawn is equivalent for orientation and lets the spin accumulate genuinely. | The spawn guard reproduces the per-frame branch's effective predicate **exactly**: `!(look.pulse !== undefined && look.pulse > 0) && (look.stretch ?? 1) > 1.2`. The old code only reached the stretch branch when the pulse branch did not fire, so the spawn orientation applies iff `!(pulse > 0) && (stretch ?? 1) > 1.2`. Over today's table that is **wind only**. The per-frame stretch branch was then deleted (the spin branch itself is byte-identical). |

Per-look derivation over `move-fx/looks.ts` (untouched — table row values are correct; only the interpreter was wrong):

| Look | pulse | stretch | spin | Before (per frame) | After (spawn + per frame) | Identical? |
| --- | --- | --- | --- | --- | --- | --- |
| fire | 0.18 | — | 0.012 | pulse branch; spin accumulates from identity; no lookAt | spawn guard false (pulse > 0) → no orientation; spin accumulates from identity | yes |
| water | 0.05 | 1.5 | — | pulse branch every frame; **never** faced downrange; identity quaternion forever | spawn guard false (pulse > 0) → no orientation; no per-frame lookAt remains; identity forever; pulse scale still driven per frame | yes (pinned by test) |
| plant | — | — | 0.02 | spin accumulates from identity; no other branch | spawn guard false (stretch 1) → no orientation; spin accumulates identically | yes |
| electric | — | — | — | position/arc only | spawn guard false (stretch 1) → unchanged | yes |
| earth | — | — | 0.004 | spin accumulates from identity; no stretch → no lookAt | spawn guard false (stretch 1) → no orientation; spin accumulates identically | yes (pinned by test) |
| wind | — | 2.1 | 0.03 | spin added then **overwritten** by per-frame lookAt every frame → dead | spawn guard true → `lookAt` downrange at t=0; spin branch (untouched) accumulates `0.03·dt`/`0.018·dt` over that orientation → corkscrew renders | **intended visible change** (see below) |
| fallback (orb) | — | — | — | position/arc only | spawn guard false (stretch 1) → unchanged | yes |

**The one intended visible change (recorded per R1.T1.3):** a wind spawn now orients downrange at t=0 — its first frame is already streak-aligned. Before this change the wind core spent its whole flight unoriented by the interpreter (identity at spawn, lookAt-driven from frame 2's position), so frame 1 rendered the streak misaligned. Every other look's render path is byte-identical.

## Before/after orientation proof (wind)

- **Before:** at each frame the spin branch mutated `rotation`, then `lookAt(shotPos.x + shotDir.x, mesh.position.y, shotPos.z + shotDir.z)` re-derived the full quaternion from the (constant-direction) flight line, discarding the spin increments before rendering. Net orientation across the whole flight: constant; `spin` invisible.
- **After:** the same orientation is applied once at spawn (identical geometry: horizontal direction, y held constant), and the spin branch — byte-identical, lines 93–97 — accumulates on top of it every frame. Proof: `projectiles.test.ts` "golden: wind's authored spin renders - the streak corkscrews (F1)" asserts `mesh.quaternion.angleTo(before) > 0` after two 100 ms `projectileStep` ticks (spin 0.03 rad/ms ⇒ 3 rad + 1.8 rad of Euler delta per tick), and "golden: wind's streak faces downrange from its first frame" asserts the local +Z axis maps to the lane direction (1, 0, 0) immediately after spawn.

## Water / earth preservation evidence

- **Water** (`golden: water's teardrop still never faces downrange (pulse path)`): quaternion stays identity across two ticks (angleTo identity = 0 both before and after ticking) and `mesh.scale.x === pulseScale(200, 0.05)` — the pulse branch still drives the core every frame; no orientation was added.
- **Earth** (`golden: earth's boulder still tumbles but never faces downrange`): identity at spawn (no stretch ⇒ no orientation), and the quaternion demonstrably changes across two ticks (spin still accumulates), matching the pre-change behavior exactly.

## New tests

File: `apps/client/src/fx/projectiles.test.ts` (new; the plan's named home for the interpreter-level test). Real `three` objects driven through a real `EffectLoop` with the injected fake clock pattern from `staging-fx.test.ts` (manual RAF pump, 100 ms frames):

1. `golden: wind's streak faces downrange from its first frame`
2. `golden: wind's authored spin renders - the streak corkscrews (F1)` — the reviewer's identified test gap
3. `golden: water's teardrop still never faces downrange (pulse path)`
4. `golden: earth's boulder still tumbles but never faces downrange`

No existing test file was edited.

## Commands

| Leg | Command | Exit | Notes |
| --- | --- | --- | --- |
| unit (scoped, iterating) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/fx` | 0 | 21 pass / 0 fail / 67 expect, 3 files (17 pre-existing + 4 new) |
| typecheck | `bun run check` | 0 | voxel 90 / sim 147 / client 363 files, 0 errors |
| lint (literal) | `biome check` | 1 | command not on PATH ("not recognized") — substituted per the brief's operational notes |
| lint (substituted) | `bunx biome check` | 0 | 582 files clean |
| **Verification (full)** | `bun test --check --parallel=4 --timeout 120000 apps/client/src/fx && bun run check && bunx biome check` | **0** | the brief's Verification command with the sanctioned `bunx` substitution on the lint leg |
| size guard | `bun test apps/client/src/module-size.test.ts` | 0 | 5 pass — the 12,288 B cap holds for every client module incl. `fx/projectiles.ts` |
| timing pins | `bun test apps/client/src/battle-timing.test.ts` | 0 | 18 pass — untouched and green |
| byte-size probe | `(Get-Item ...).Length` | denied | permission-denied; not retried per the brief. Informational only (exact byte count for the evidence table) — the size-guard run above proves the cap holds |

## Constraints audit

- No timing change: `PROJECTILE_LIFE_MS`, `PROJECTILE_ARC`, `CONTACT_T`, `PLAYBACK_PHASES` untouched; `battle-timing.test.ts` unedited and green.
- No table change: `move-fx/looks.ts` not touched (not in Touches).
- No new dependency, no `any`, no `@ts-ignore`, named exports, explicit return types on exported functions; `biome` clean.
- `packages/sim` and `packages/voxel` untouched; `SAVE_VERSION` untouched.
- Module-size guard green for `fx/projectiles.ts`.
- Reduced-motion paths untouched (no damping code modified; spin/orientation is not impulse-driven).

## Deviations

1. **Additive API hook:** `ProjectileLayer.firstMesh(): THREE.Object3D | null` added to the interface and the returned object in `fx/projectiles.ts`. The plan's Touches text names only the interpreter change; R1.T1.2 sanctions exactly this hook and requires recording it. Nothing existing was removed or renamed; the only consumer (`staging-fx.ts`) is unaffected.
2. **Lint leg substitution:** the Verification command's literal `biome check` does not resolve on PATH; ran the sanctioned `bunx biome check` instead (operational notes) and recorded both attempts above.

## Notes

- First shell attempt `git status --porcelain; git log -3; git branch --show-current` was permission-denied (chained form); single git commands work and were used throughout.
- Evidence committed separately as `docs(conductor): record phase R1 evidence` (stated choice per the brief).
- Doc sync (`tech-stack.md` dated entry) remains the primary's pending item, as noted in `review.md`.

## Primary verification (discharged 2026-10-24)

**Structural checks:** working tree clean; the phase range `3dcb2ca..HEAD` contains exactly the two reported commits (`a90c2f2` code, `ba59f6b` evidence); the file set is exactly the two Touches files plus the evidence file; `projectiles.ts` diff is +18/−7 — the per-frame `lookAt` stretch branch deleted, the spin branch (lines 93-97) byte-identical, the spawn hook inserted after `core.position.copy(origin)`.

**Code-level audit of the fix (read in full by the primary):** the spawn predicate is `!(look.pulse !== undefined && look.pulse > 0) && (look.stretch ?? 1) > 1.2` — exactly the set the per-frame branch caught (wind only over today's table). `core.lookAt(target.x, origin.y, target.z)` holds y at the origin, matching the old branch's horizontal-aim semantic. Water (pulse branch) never faced downrange before and still must not; earth (spin, no stretch) accumulates spin with no orientation, unchanged. The intended visible change is wind-only: streak-aligned at t=0 plus a real corkscrew thereafter.

**Independent command results:**

| Command | Result |
| --- | --- |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/fx` | exit 0 — 21 pass / 0 fail / 67 expect / 3 files |
| `bun run check` | exit 0 — voxel 90 / sim 147 / client 363 files (the new test adds one) |
| `bunx biome check` | exit 0 — 582 files clean |
| `bun run verify` (verify_phase) | exit 0, 90 s — 2,520 pass / 0 fail; determinism gate 18 GLBs + 5 props byte-identical |
| `bun run build` | exit 0 |

**Acceptance:** F1 resolved — wind's authored spin now renders (orientation changes across ticks, proven by the new interpreter-level test rather than the table-row pin), water and earth preserved byte-identically, the additive `firstMesh()` hook is sanctioned by R1.T1.2 and recorded as a deviation. No timing constant touched; `battle-timing.test.ts` green inside verify. No existing test edited (the diff contains only the new `projectiles.test.ts`).
