# Phase 3 Verification — The Deterministic Stage

- **Track:** `20261024-battle-choreography-all-creatures`
- **Phase:** 3 of 4
- **Date:** 2026-10-24
- **Branch:** `feat/20261024-battle-choreography-all-creatures`
- **Phase base:** `7b34477240588c9e9283faedaacd39cd614377ed`
- **Head at first verification:** `e7a1104b47300c5e77bae39dce7c8a5a2471fd1a`
- **Head after rework round 1:** `597e1635a542edc4df6d3ef772ac5c04de62d3a2`
- **Result:** **verified** — FR-7, NFR-1, NFR-6, AC-7, AC-10 satisfied; full gate
  green and the determinism gate byte-identical (re-checked after the rework).

## Commands

| # | Command | Exit | Key output |
|---|---|---|---|
| 1 | `bun test --check --parallel=4 --timeout 120000 apps/client/src/steps apps/client/src/battle-timing.test.ts` | 0 | first round `61 pass / 0 fail` (2146 expects, 3 files, 567 ms); after rework `63 pass / 0 fail` (2150 expects, 658 ms) |
| 2 | `bun run check` | 0 | voxel 90 files, sim 147, client 362 — no type errors |
| 3 | `biome check` | 1 | `biome: The term 'biome' is not recognized…` — the bare binary does not resolve on this machine (see Notes) |
| 4 | `bunx biome check apps/client/src/steps/fire.ts apps/client/src/steps/fire.test.ts apps/client/src/battle-timing.test.ts` | 0 | `Checked 3 files. No fixes applied.` |
| 5 | `bun run verify` | 0 | check green; first round `2514 pass / 1 skip / 0 fail` across 197 files, after rework `2516 pass / 1 skip / 0 fail`; biome `Checked 581 files … No fixes applied`; determinism gate OK |
| 6 | `bun run gate:determinism` (leg 5) | 0 | 18 GLBs byte-identical + 5 props digests match (identical both rounds) |
| 7 | `bun test --check --parallel=4 --timeout 120000 apps/client/src/steps apps/client/src/battle-timing.test.ts && bun run check && bunx biome check` (rework round 1, the brief's command with `biome` → `bunx biome`) | 0 | `63 pass / 0 fail`; check green on 90/147/362 files; biome `Checked 581 files. No fixes applied.` |

The verification command in the brief names the bare `biome` binary, which is
not on `PATH` here. Legs 1–2 run exactly as written; the lint leg was run
through the toolchain binary (`bunx biome check`, leg 4) and through the
house gate (`bun run verify`, leg 5), which is the brief's prescribed
fallback.

## Rework round 1 (2026-10-24)

**Defect.** The first round threaded the tick only through `steps/fire.ts`.
`impact.ts` and `melee.ts` were outside the phase's Touches, so their calls to
`contactReaction` omitted the optional sixth argument and the offset fell back
to `seed ?? 0`, keyed by victim and damage alone. Measured: every basic strike
on the same victim landed at the same lateral offset — `contactJitter(undefined,
"left", 4)` returns `0.100680` (`0.101` once rounded) hit after hit, a constant,
where `Math.random()` used to vary each one. `steps/fire.ts` was
unaffected (it passes `step.tick`). This is a fidelity gap against P3.T1.1
*derive the seed from the step's stable fields including `tick`*, not an
accepted trade-off.

**Fix.** `impact.ts` and `melee.ts` are now in the phase's Touches (plan.md
amended as `980f9c0`). Four call sites gained `step.tick` as the sixth argument
and nothing else changed at them — no other argument added or reordered, and
the calls were only wrapped onto multiple lines because the added argument took
them past biome's 80-column width:

```
diff --git a/apps/client/src/steps/impact.ts b/apps/client/src/steps/impact.ts
@@ -29,7 +29,14 @@ export const impactStep: StepRunner = (step, instant, side, _o, _r, io) => {
   if (instant) {
-    contactReaction(io, step.damage, side.target, heavyHit(step), step.element)
+    contactReaction(
+      io,
+      step.damage,
+      side.target,
+      heavyHit(step),
+      step.element,
+      step.tick,
+    )
@@ -41,6 +48,13 @@
-  contactReaction(io, step.damage, side.target, heavyHit(step), step.element)
+  contactReaction(
+    io,
+    step.damage,
+    side.target,
+    heavyHit(step),
+    step.element,
+    step.tick,
+  )

diff --git a/apps/client/src/steps/melee.ts b/apps/client/src/steps/melee.ts
@@ -25,6 +25,7 @@
         heavyHit(step),
         step.element,
+        step.tick,
       )
@@ -75,7 +76,14 @@
           if (hit) {
-            contactReaction(io, step.damage, at, heavyHit(step), step.element)
+            contactReaction(
+              io,
+              step.damage,
+              at,
+              heavyHit(step),
+              step.element,
+              step.tick,
+            )
```

`contactReaction`'s doc comment was reworded: it now states that every
production call site passes `step.tick`, and that omitting the parameter stays
supported (the offset then keys off victim and damage alone). The parameter
itself stays optional — its type and position are unchanged.

### Proof: all five call sites pass `step.tick`

Native grep over `apps/client/src/steps`, pattern `step\.tick,` — 5 hits, one
per call site, with the current source lines around each call:

| # | File | Call starts | Argument line | Source |
|---|---|---|---|---|
| 1 | `apps/client/src/steps/impact.ts` | 32 | 38 | `contactReaction(` … `step.element,` / **`step.tick,`** (line 38) |
| 2 | `apps/client/src/steps/impact.ts` | 51 | 57 | `contactReaction(` … `step.element,` / **`step.tick,`** (line 57) |
| 3 | `apps/client/src/steps/fire.ts` | 184 | 190 | `contactReaction(` … `step.element,` / **`step.tick,`** (line 190) |
| 4 | `apps/client/src/steps/melee.ts` | 22 | 28 | `contactReaction(` … `step.element,` / **`step.tick,`** (line 28) |
| 5 | `apps/client/src/steps/melee.ts` | 79 | 85 | `contactReaction(` … `step.element,` / **`step.tick,`** (line 85) |

The first two sit inside the impact step (`step` is the runner's parameter), the
next inside `fireSpecial`'s landing beat, and the last two inside
`meleeStep(step, instant, side, _o, _r, io)`; in every case `step` is in scope.

### Proof: a repeat hit now varies

`fire.test.ts`, same victim `"left"` and damage `4`, ticks 1..6:

| tick | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| offset | `-0.061090` | `+0.123666` | `-0.132057` | `+0.052973` | `+0.078501` | `-0.036745` |

Six distinct values (`distinct=6`, asserted `≥ 3`) where the defect produced
`0.101` six times. All inside ±0.15.

Two tests were added, so the suite is now ten tests:

9. `a repeated hit on one victim lands somewhere new each tick` — same victim
   and damage across ticks 1..6, `expect(offsets.size).toBeGreaterThanOrEqual(3)`.
10. `no production caller falls back to the victim-and-damage key` — a source
    guard over every non-test module in `steps/`: it extracts the argument text
    of each `contactReaction(...)` call (balanced-paren scan, skipping the
    declaration in `fire.ts`), asserts three files hold call sites, five call
    sites in total, and that **none** omits `step.tick`. This is the guard for
    the invariant the defect violated — a call site that stops seeding the tick
    fails the suite instead of silently pinning repeat hits.

The first round's `an unseeded call is still deterministic and bounded` test
stays, with its comment corrected: it now documents the optional-parameter
fallback rather than claiming impact/melee rely on it.

## P3.T1 — The seeded contact jitter

### The signature as landed

`contactReaction` keeps its five existing parameters and gains one optional
sixth. All five call sites pass it (round 1: `impact.ts` and `melee.ts` did
not — see *Rework round 1*).

```ts
export function contactReaction(
  io: StepIO,
  damage: number | undefined,
  at: DriveFighter,
  heavy = false,
  element?: string,
  seed?: number,
): void
```

```ts
  if (!heavy) {
    const knock = strikeReach(damage)
    at.stage.x += at.away * knock
    at.stage.z += contactJitter(seed, at.key ?? at.name, damage)
  }
```

The point-blank path (`fire.ts`, the `fireSpecial` landing beat) was the first
call site to pass `step.tick`; the rework round 1 added it to the remaining
four. Nothing else in the reaction path moved:
the knockback, `impulse` (and its 0.4 reduced-motion damping), `startFlash`,
`bigHit`, and `spawnDecal` are byte-identical.

### The helper

Built only on `anim.ts`'s existing `jitter`, which is itself built on
`hashString` — the primitives the brief allows. No new randomness source, no
clock read, no module state.

```ts
/** Lateral spread of a landed hit's contact jitter, in world units (±). */
export const CONTACT_JITTER = 0.15

export function contactJitter(
  seed: number | undefined,
  victimKey: string,
  damage: number | undefined,
): number {
  return jitter(seed ?? 0, `${victimKey}:${damage ?? 0}`, CONTACT_JITTER)
}
```

`CONTACT_JITTER` is exported so the suite asserts the bound directly. The old
range was `(Math.random() - 0.5) * 0.3`, i.e. ±0.15 — unchanged.

Every call site seeds the tick and keys on the victim plus the step's damage:

| Site | Seed | Key |
|---|---|---|
| `steps/fire.ts:184` (point-blank landing beat) | `step.tick` | victim `key`/`name` + `step.damage` |
| `steps/impact.ts:32`, `:51` | `step.tick` | victim `key`/`name` + `step.damage` |
| `steps/melee.ts:22`, `:79` | `step.tick` | victim `key`/`name` + `step.damage` |

Round 1 shipped without the seed at the last four; the rework round 1 section
records the defect, the fix and how the suite now guards it.

The offset is a pure function of stable step fields, so a replay lands
identically while a repeat hit at a later tick still lands somewhere new.

### Determinism and bounds — observed values

`apps/client/src/steps/fire.test.ts`, victim `"left"`, damage `4`:

| tick | offset (world units) |
|---|---|
| 0 | `+0.100680` |
| 1 | `-0.061090` |
| 2 | `+0.123666` |
| 3 | `-0.132057` |
| 4 | `+0.052973` |
| 7 | `+0.007533` |
| 8 | `-0.107437` |

Values differ per tick, all inside ±0.15. Identity matters: at tick 3, victim
`"right"` yields `+0.038005` where victim `"left"` yields `-0.132057`. The
unseeded form (`contactJitter(undefined, "left", 4)`) yields `+0.100680` —
identical to tick 0 by construction (`seed ?? 0`), and repeatable.

Tests in `fire.test.ts` (all pass):

1. identical step fields ⇒ identical offset (ticks 0, 1, 2, 7, 128, 4096);
2. ticks 1..8 produce ≥ 2 distinct offsets (no constant);
3. 2,000 ticks × damage 0..39 all satisfy `|offset| ≤ CONTACT_JITTER`;
4. `CONTACT_JITTER === 0.15` (today's range pinned);
5. a different victim at the same tick ⇒ a different offset;
6. a different damage at the same tick ⇒ a different offset;
7. the optional unseeded form is deterministic and bounded (the parameter's
   documented fallback — no production caller uses it);
8. a repository guard: no non-test module under `steps/` contains
   `Math.random` (`readdirSync` + `readFileSync`, `expect(offenders).toEqual([])`).

Rework round 1 added two more (9: repeat-hit spread, 10: every call site seeds
the tick) — see that section above, for ten tests in total.

### No clock read

Read of `apps/client/src/steps/fire.ts` after the change: the module imports
`clamp01`/`jitter` from `../anim`, `reactionFor`, `fxFor`/`PROJECTILE_LIFE_MS`,
and the `steps/` helpers. There is no `Date.now`, no `performance.now`, no
`Math.random`, and no module-level mutable state. The only inputs to the
offset are the arguments to `contactJitter`.

### `Math.random` search in `apps/client/src/steps/`

Exact search (native grep): pattern `Math\.random`, path
`apps/client/src/steps` — **3 hits, all in the new `fire.test.ts`**:

- `fire.test.ts:3` — the file's header comment describing what was removed;
- `fire.test.ts:121` — the guard test's name;
- `fire.test.ts:123` — the guard's `readFileSync(...).includes("Math.random")`.

Zero hits in any **non-test** module: `fire.ts`, `impact.ts`, `melee.ts`,
`pure.ts`, `reel.ts`, `projectile.ts`, `down.ts`, `approach.ts`, `judge.ts`,
`context.ts`, `index.ts` are all clean. The run passes this as an executable
assertion (test 8 above), not only as a manual search.

## P3.T2 — The timing contract

`apps/client/src/battle-timing.test.ts` asserts today's values; it is a guard,
not a licence to edit. Every expected value below was read from the shipped
code and matched the brief's list — no discrepancy was found.

### Constants

| Constant | Expected | Asserted |
|---|---|---|
| `CONTACT_T` | 0.46 | `toBe(0.46)` — passes |
| `PROJECTILE_LIFE_MS` | 700 | `toBe(700)` — passes |
| `PROJECTILE_ARC` | 0.55 | `toBe(0.55)` — passes |

### `PLAYBACK_PHASES` (one test per row, values in the test name)

| Kind | windup | contact | recovery | Asserted |
|---|---|---|---|---|
| `approach` | 0.15 | 0.7 | 0.15 | pass |
| `idle` | 0.3 | 0.4 | 0.3 | pass |
| `melee` | 0.26 | 0.2 | 0.54 | pass |
| `stagger` | 0.1 | 0.4 | 0.5 | pass |
| `knockback` | 0.1 | 0.3 | 0.6 | pass |
| `projectile` | 0.5 | 0.25 | 0.25 | pass |
| `impact` | 0.2 | 0.3 | 0.5 | pass |
| `down` | 0.2 | 0.35 | 0.45 | pass |
| `judge` | 0.25 | 0.5 | 0.25 | pass |

A tenth test asserts the table covers exactly these nine kinds, so a new kind
added to the sim without a pin fails the suite.

### Movement stays global (`reactionFor`)

For each of the five reaction kinds, `slide` and `dash` are asserted equal
(`toEqual` on `{id, slide, dash}`) across all six archetype profiles and the
neutral `DEFAULT_PROFILE` (`draconic`, `bovine`, `axolotl`, `storm_hound`,
`falcon`, `tortoise`):

| Kind | slide | dash | Invariance |
|---|---|---|---|
| `glance` | 0 | 0 | pass — identical for all six profiles |
| `stagger` | 0.3 | 0 | pass — identical for all six profiles |
| `knockback` | 0.9 | 0 | pass — identical for all six profiles |
| `dodge` | 0 | 0.85 | pass — identical for all six profiles |
| `down` | 0 | 0 | pass — identical for all six profiles |

Amplitudes (`impulse`, `reel`, `reelPitch`) still vary by profile — that is
Phase 1's contract and is covered in `choreo.test.ts`; this suite only pins
that distances do not.

## Acceptance

| Criterion | Requirement | Proving test |
|---|---|---|
| **AC-7** | Jitter helper deterministic (same step ⇒ same offset) and bounded (±0.15); search for `Math.random()` under `apps/client/src/steps/` finds nothing | `fire.test.ts` — "identical step fields always yield the identical offset", "every offset stays inside ±CONTACT_JITTER", "the bound is today's ±0.15 range", "a repeated hit on one victim lands somewhere new each tick", "no production caller falls back to the victim-and-damage key", "no Math.random in any non-test step module"; plus the search recorded above |
| **AC-10** | Determinism gate reports the same 18 GLBs and 5 props byte-identical; timing constants test-pinned to pre-track values | `bun run verify` leg 5 — 18/18 "regenerated byte-identical" + "5 props … digests match"; `battle-timing.test.ts` — the three constants and all nine `PLAYBACK_PHASES` rows |

NFR-1 is additionally covered by the same run: the full suite is green
(`2514 pass / 1 skip / 0 fail` in round 1, `2516 pass / 1 skip / 0 fail` after
the rework) and no game-logic module was touched.
NFR-6 is covered by test 8 (no unseeded randomness under `steps/`) plus AC-7's
determinism and call-site tests (9 and 10).

## Deviations

None. The first round was confined to its three Touches files; the rework
round 1 also edited `steps/impact.ts` and `steps/melee.ts`, which the primary
added to the phase's Touches (plan.md amended as `980f9c0`). No file outside
Touches was modified, no existing test file was edited, and
`packages/sim`, `packages/voxel`, `plan.md`, `spec.md`, `metadata.json`,
`tracks.md`, and `conductor/index.md` are untouched.

## Notes

- **`biome` on `PATH`.** The brief's verification command ends in the bare
  `biome` binary, which this machine does not resolve (`The term 'biome' is
  not recognized`). Per the brief's operational note, the lint leg was run
  through `bunx biome check` (clean) and through `bun run verify`, whose
  `biome check` leg checked 581 files with no fixes applied.
- **Every call site seeds the tick.** All five `contactReaction` callers pass
  `step.tick`, so a repeat hit on one victim varies per hit exactly as it did
  under `Math.random()`-based jitter, while staying a pure function of the step.
  The round-1 gap (impact/melee pinned at `0.101`) and its fix are recorded
  under *Rework round 1*; test 10 now fails if any caller drops the argument.
- **Module cap.** `apps/client/src/module-size.test.ts` (12,288 B) ran in the
  full suite and passed; the two new `*.test.ts` files are exempt. `fire.ts`
  gained 27 lines and lost 2 in round 1, plus 4 reworded comment lines in the
  rework; `impact.ts` and `melee.ts` gained one argument each (7 and 8 lines
  respectively once biome wrapped the calls).
- **Reduced motion.** Untouched: `impulse()`'s 0.4 damping and the instant-dump
  path are unchanged by this phase.
- **No dev server** was started; no visual pass was needed or performed.
- No throwaway files were created. The probes used to read the concrete offsets
  above (round 1 and the rework's ticks 1..6) were temporary `console.log` lines
  inside the new test, removed before the committing run (the file was re-linted
  and the suite re-run afterwards).

---

## Primary verification

### Structural checks

| Check | Result |
| --- | --- |
| Working tree | clean (`git status --porcelain` empty) |
| Commits in the phase range | `2589c28`, `e7a1104`, `e7c41e8`, `597e163`, `59203f0` — matches the two reports plus the rework round, all authored by the phase subagent |
| Files in range | `steps/fire.ts`, `steps/impact.ts`, `steps/melee.ts`, `steps/fire.test.ts`, `battle-timing.test.ts`, `plan.md` (the primary's Touches amendment `980f9c0`), the evidence file — nothing else |
| `packages/sim` / `packages/voxel` | untouched; `SAVE_VERSION` stays 25 |
| Existing tests | none edited — `fire.test.ts` and `battle-timing.test.ts` are both new files |
| Sizes | `steps/fire.ts` 6,930 B, `steps/impact.ts` 1,525 B, `steps/melee.ts` 3,675 B — all under the 12,288 B cap; both new test files exempt |

### The defect I raised, and the fix

My Phase 3 brief restricted Touches to `steps/fire.ts`, which forced the new seed
to default at the other call sites. Measured before the fix:
`contactJitter(undefined, "left", 4)` returned `0.101` on **every** hit, so a
repeated basic strike on one victim landed at a fixed lateral offset — where
`Math.random()` previously varied each one. The plan's P3.T1.1 asks for the seed to
come from the step's stable fields including `tick`, so I treated this as a
fidelity gap rather than an accepted trade-off, widened the phase's Touches
(`980f9c0`, with the reasoning recorded in `plan.md`), and sent the phase back for
rework round 1 of the 2 allowed.

Fix as landed: one argument added at each of the four remaining call sites. I
verified independently that **5 of 5** `contactReaction` call sites pass
`step.tick` (`fire.ts:184`, `impact.ts:32`, `impact.ts:51`, `melee.ts:22`,
`melee.ts:79`) by re-scanning the source myself, and read the `impact.ts` /
`melee.ts` diff hunks: argument addition only, no reordering, no refactor — the
calls were merely wrapped by Biome's 80-column rule.

Independent re-measurement after the fix (ticks 1-6, victim `left`, damage 4):

```
-0.061  0.124  -0.132  0.053  0.079  -0.037
```

Six distinct values where the defect produced `0.101` six times.

The subagent also added a source guard that fails if any call site loses
`step.tick`, and it asserts 3 caller files / 5 call sites before scanning so it
cannot pass vacuously. That is precisely the regression class this defect
represents, pinned.

### Independent command results

| Command | Exit | Result |
| --- | --- | --- |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/steps apps/client/src/battle-timing.test.ts` | 0 | 63 pass / 0 fail, 2,146+ expect() calls, 3 files |
| `bun run check` | 0 | no type errors — voxel 90 / sim 147 / client 362 files |
| `bunx biome check` | 0 | 581 files, no fixes (the bare `biome` binary is not on PATH on this machine — the pre-flagged contingency, not a lint finding) |
| `bun run verify` | 0 | 2,516 pass / 1 skip / 0 fail; determinism gate byte-identical for 18 GLBs + 5 props |
| `bun run build` | 0 | 294 modules, pre-existing chunk-size warning only |

Constants verified independently against the source rather than taken from the
suite: `playback.ts` rows `approach 0.15/0.7/0.15`, `idle 0.3/0.4/0.3`, `melee
0.26/0.2/0.54`, `stagger 0.1/0.4/0.5`, `knockback 0.1/0.3/0.6`, `projectile
0.5/0.25/0.25`, `impact 0.2/0.3/0.5`, `down 0.2/0.35/0.45`, `judge
0.25/0.5/0.25`; `looks.ts` `PROJECTILE_LIFE_MS = 700`, `PROJECTILE_ARC = 0.55`;
`moves.ts` `CONTACT_T = 0.46`. All nine rows and all three constants match the pins
exactly. No `Math.random` and no `Date.now`/`performance` read remains in any
non-test module under `steps/` (my own search).

### Acceptance

**AC-7** (seeded, bounded, deterministic jitter with no `Math.random` under
`steps/`) — met, and strengthened by rework round 1: the offset is a pure function
of the step at all five call sites, every value inside ±0.15 over 2,000 ticks, and
a source guard now fails if any call site drops the tick. **AC-10** (timing
contract pinned) — met: the flight constants and all nine `PLAYBACK_PHASES` rows
are asserted, and `reactionFor`'s `slide`/`dash` invariance is pinned across all six
profiles and all five reaction kinds, which is the "amplitudes may vary; distances
may not" invariant the choreography comments promise.

### Deviation audit

- **`plan.md` Touches extended mid-phase** (primary-owned, `980f9c0`) — correct and
  recorded in the plan itself rather than patched silently; without it the phase
  could not have fixed the defect it introduced.
- **Rework round 1** — one of the two allowed, and the only one needed.
- **`biome` via `bunx`** — environment, not a finding; the same leg is green inside
  `bun run verify`.
- **No visual pass** — deliberate: the jitter bound and the timing pins are
  test-provable, and the full capture matrix is Phase 4.
- **No throwaway files left, no dev server started** — confirmed by a clean tree and
  no listener on :5173.
