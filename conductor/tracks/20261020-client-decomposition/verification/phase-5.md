# Phase 5 — The guard

- **Track:** `20261020-client-decomposition` — Client Module Decomposition & Size Guard
- **Phase:** 5 — The guard
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-client-decomposition`
- **Base:** `f6bf39a` (phase base)
- **Checkpoint:** `57ac657` - the phase commits (guard `5c61406`, evidence
  `6b81c01`) were squashed into this checkpoint, so it is the tree this report
  describes
- **Result:** verified for P5.T1 and P5.T2; P5.T3 (integrated verification) is the
  orchestrator's, left open in `plan.md` on purpose.

## What changed and why

`apps/client/src/module-size.test.ts` used to scan `scene-logic/` and `ranch/`
only. Everything outside those two folders — `main.ts`, `hud.ts`, `scene.ts`,
`staging-fx.ts` and the rest of the offender list in `spec.md` — could cross the
cap without failing a check, which is why `20261020-evolution-discovery-ui`
added `size-probe.test.ts` as a four-file manual pin. Phases 1–4 brought every
module under the cap; this phase replaces both pin mechanisms with the rule the
project actually states.

The guard now:

1. **Walks the tree.** `moduleFiles()` recurses from `import.meta.dir` with
   `readdirSync(dir, { withFileTypes: true })`, so nested folders
   (`hud/`, `cup/screens/`, `scene-logic/`, `steps/`, `ui/`, …) are covered and a
   new folder needs no registration. Paths are reported relative to `src/` with
   `/` separators.
2. **Excludes exactly two names.** `*.test.ts` (co-located suites) and
   `vite-env.d.ts` (the Vite type shim). No allowlist by name, no per-folder
   exception, no `// size-ignore` escape hatch.
3. **Measures bytes.** `CAP_BYTES = 12 * 1024` compared against `statSync().size`
   — bytes, not lines, so a dense one-line module cannot hide and a
   heavily-commented one is not punished.
4. **Fails with an actionable report.** `capReport()` returns `null` when the
   tree is clean and otherwise a message with a header, one line per offender of
   the form `<path> — <bytes> B (<overage> B over the <cap> B cap)` sorted
   largest first, and a footer restating the rule and the two exemptions. The
   assertion is `expect(report).toBeNull()`, so Bun prints the whole report.
5. **Proves itself.** A negative control writes
   `__guard-negative-control-<pid>.ts` into `src/`, asserts the *same*
   `moduleFiles()` walk sees it and the *same* `capReport()` flags it with its
   path, byte count and overage, removes it in a `finally`, and then asserts
   `existsSync` is false so a leaked fixture fails the run.

`apps/client/src/size-probe.test.ts` is deleted. Its four pins
(`creature-detail.ts`, `growth.ts`, `growth-panel.ts`, `ui/tabs.ts`) are
measured by the tree walk, with no name list to drift.

The suite was 143 files / 1788 tests before the phase and is 142 files / 1789
tests after it (1,788 pass, 1 skip): the guard grew from three tests to five (recursion sanity, the
whole-tree assertion, the at-cap/one-byte-over boundary, largest-first ordering,
and the negative control) while `size-probe.test.ts`'s single test retired, for
a net +1.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Final phase gate | `bun run verify && bun run build` | 0 | all five legs green; 1788 pass, 1 skip, 0 fail |
| static (types) | `bun run check` (inside verify) | 0 | voxel 62 files, sim 79 files, client 286 files, no type errors |
| unit | `bun test --check --parallel --timeout 120000` (inside verify) | 0 | 1788 pass / 1 skip / 0 fail; 84,605 `expect()` calls; 1789 tests in 142 files; 23.77 s |
| lint + format | `biome check` (inside verify) | 0 | 448 files, 0 errors, 7 warnings — all pre-existing `noNonNullAssertion` warnings in `cup/view-models.test.ts` and `scene-logic/{play,treat}.test.ts`, untouched by this phase |
| determinism | `bun run gate:determinism` (inside verify) | 0 | nine creature GLBs byte-identical, five prop digests match |
| build | `bun run build` | 0 | vite 8.3.4, 232 modules, `dist/assets/index-*.js` 824.34 kB / 224.81 kB gzip |
| Failing-path demo (first pass) | `bun run verify` with `CAP_BYTES` temporarily set to `11 * 1024` | 1 | guard failed and printed the full sorted report — see below; cap restored to `12 * 1024` immediately after |
| Targeted single file | `bun test apps/client/src/module-size.test.ts` | n/a | **not run** — the sandbox rejects the bun binary outside the configured verification command (`permission.rejected`), same as Phases 1–3; the guard's five tests run inside `bun run verify` |

The first verification attempt exited 1 on `biome check` only: the new file was
not formatter-clean (import list, one predicate, one ternary). Formatting was
hand-applied in the formatter's own shape and the phase gate re-run green. No
test failed at any point.

## Failing-then-passing evidence

The in-suite negative control is the required control (it runs on every suite
run and passed). To also prove the *real* assertion path fails loudly rather
than only `capReport()` returning a string, the cap was temporarily lowered to
`11 * 1024` so the tree genuinely contained over-cap modules:

```text
apps\client\src\module-size.test.ts:
93 |   test("every non-test module is at most 12 KB", () => {
94 |     const report = capReport(moduleFiles())
95 |     expect(report).toBeNull()
                        ^
error: expect(received).toBeNull()

Received: "3 client module(s) exceed the 11264 B cap. Split each one along the seams it already has:\n  battleHud.ts — 12064 B (800 B over the 11264 B cap)\n  staging.ts — 11640 B (376 B over the 11264 B cap)\n  graduation/nursery.ts — 11613 B (349 B over the 11264 B cap)\nThe cap counts bytes, not lines. Only *.test.ts and vite-env.d.ts are exempt."

      at <anonymous> (D:\Projects\battle-pets\apps\client\src\module-size.test.ts:95:20)
(fail) client module size cap > every non-test module is at most 12 KB [29.76ms]

 1787 pass
 1 skip
 1 fail
Ran 1789 tests across 142 files. [24.04s]
```

That output is the reviewer's view of a real failure: offender paths, byte
counts, overage per file, sorted largest first, header and footer naming the
rule and the exemptions. Only the tree assertion failed — the fixture,
boundary, ordering and negative-control tests still passed, which is what makes
the report trustworthy. `CAP_BYTES` was then restored to `12 * 1024` and
`bun run verify && bun run build` exited 0.

## Acceptance

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-2 | `module-size.test.ts` scans the whole client tree, excludes `*.test.ts` and `vite-env.d.ts`, fails with offender paths + sizes | recursive `moduleFiles()` over `import.meta.dir`; 167 measured modules listed below (nested folders included); failing-path demo above | met |
| AC-3 | A deliberately oversized module makes the guard fail (negative control), and the control leaves no artifact behind | in-suite control: writes `__guard-negative-control-<pid>.ts`, asserts the walk sees it and the report names it with bytes + overage, `finally` removes it, then `expect(existsSync(path)).toBe(false)`; green in the final suite | met |
| AC-8 | `size-probe.test.ts` is gone and its guarantee is covered by the new guard | `git rm -- apps/client/src/size-probe.test.ts`; suite file count 143 → 142; the four pinned modules are in the measured list with no name list | met |
| NFR-3 | No new dependency, no `package.json` change | imports are `bun:test`, `node:fs`, `node:path` only; no manifest touched | met |
| NFR-4 | Suite stays green; no test weakened or deleted except retiring `size-probe.test.ts` | 1788 pass / 1 skip / 0 fail; the old boundary tests (one byte over, exactly at cap) are kept and a largest-first ordering test is added | met (see deviation 1 for the `tech-stack.md` note) |
| NFR-5 | The guard's failure message lists offender paths and byte counts | transcript above: `path — bytes B (overage B over the cap B cap)`, largest first | met |
| NFR-7 | No new import cycles; dependency direction unchanged | the guard is a leaf test file; no production module was opened in this phase | met |

## What the guard measures

167 non-test modules, from `git ls-tree -r -l HEAD -- apps/client/src` at the
phase head (the guard's own view is the same list; `*.test.ts` and
`vite-env.d.ts` are excluded, CSS and HTML are not `.ts`).

```text
anim.ts                        7969
app/arena.ts                   4923
app/audio.ts                   2074
app/hud-screen.ts              7134
app/runtime.ts                 2660
app/scene-sync.ts              2705
app/screen-deps.ts              628
app/screens.ts                 7612
arena.ts                       7735
audio/beds.ts                   648
audio/careCues.ts              2113
audio/cueUrls.ts               1692
audio/cues.ts                  2772
audio/musicBeds.ts             5847
audio/playCue.ts               1438
audio/player.ts                3519
battle-session.ts              7006
battleHud.ts                  12064
battleUI.ts                    8676
bracket-model.ts               9507
camera/input.ts                4957
camera/presets.ts               620
camera/rig.ts                  7079
camera/shake.ts                2634
camera/types.ts                1735
choreo.ts                      5811
creature-detail.ts            11007
creature.ts                    3917
cup-screens.ts                  826
cup.ts                        10683
cup/arena.ts                   6553
cup/board.ts                   5113
cup/coach-room.ts              6242
cup/entry.ts                   5224
cup/results.ts                 2256
cup/screens/battle-chips.ts     660
cup/screens/bracket.ts         5380
cup/screens/coach.ts           2264
cup/screens/giveup.ts          2567
cup/screens/results.ts         2203
cup/shared.ts                  4987
cup/view-models.ts             7472
director.ts                    6919
element.ts                     2600
environment.ts                  547
face-motion.ts                 6110
failure-plate.ts               1863
fighter-driver.ts             11011
fx/bursts.ts                   5882
fx/charge.ts                   1983
fx/decal.ts                    2989
fx/flash.ts                    2655
fx/fx-data.ts                  2097
fx/fx-math.ts                  2782
fx/loop.ts                     5136
fx/projectiles.ts              5870
fx/shot-geometry.ts            2925
gallery.ts                     5343
graduation.ts                   884
graduation/copy.ts             3062
graduation/egg.ts              3480
graduation/flow.ts             4277
graduation/hall.ts             3469
graduation/modal.ts            2010
graduation/nursery-vm.ts       7721
graduation/nursery.ts         11613
graduation/types.ts            1396
growth-panel.ts                4826
growth.ts                      6492
handbook.ts                   11193
hud.ts                         5081
hud/copy-care.ts               5329
hud/copy-cup.ts                5462
hud/copy-growth.ts             5076
hud/copy.ts                    1000
hud/dock.ts                    7031
hud/hints.ts                   1409
hud/ladder-read.ts             5541
hud/plates-callout.ts           831
hud/plates-creature.ts         6513
hud/plates-lineage.ts           926
hud/plates-score.ts            2966
hud/plates.ts                  1122
hud/settings.ts                4686
hud/shell.ts                   7110
hud/types.ts                   2237
hud/update.ts                 10568
lifecycle.ts                   3236
main.ts                        8690
mock.ts                        1267
mock/data.ts                   3097
mock/sections.ts               9089
mock/showcase.ts               4156
motion.ts                      1972
move-fx.ts                    10999
orbit-camera.ts                1062
orbit-logic.ts                 4434
playbackDriver.ts             10641
playbackSpeed.ts                533
preview.ts                     6628
prop.ts                        1104
ranch/api.ts                   9578
ranch/effects.ts               3585
ranch/frame.ts                 5871
ranch/idle.ts                  4124
ranch/mood.ts                  1255
ranch/motion.ts                 971
ranch/mount.ts                 3005
ranch/poses.ts                 6501
ranch/state.ts                 3948
ranch/types.ts                 4023
recovery.ts                    4035
roster.ts                      5354
save-transfer.ts               3910
scene-logic.ts                  914
scene-logic/evolution.ts       4601
scene-logic/feed.ts            4941
scene-logic/framing.ts         1886
scene-logic/gait.ts            2436
scene-logic/math.ts            1706
scene-logic/pet.ts             4049
scene-logic/play.ts            5776
scene-logic/rest.ts            3745
scene-logic/stage.ts            801
scene-logic/treat.ts           4083
scene-logic/walk.ts            2809
scene-logic/wander.ts          8496
scene-logic/wind.ts            2061
scene-setup.ts                 7668
scene-utils.ts                 1016
scene.ts                       6365
scene/dressing.ts              4066
scene/frame.ts                 5390
scene/pet.ts                   4073
scene/types.ts                 5676
settings-modal.ts             10911
spar.ts                        7675
spar/casting.ts                1772
spar/copy.ts                   1158
spar/loadout-vm.ts             2557
spar/log.ts                     362
spar/panel.ts                  6155
spar/setup.ts                  2705
spar/types.ts                  2554
staging-fx.ts                  4843
staging-seed.ts                1074
staging.ts                    11640
starter.ts                     2098
steps/approach.ts               596
steps/context.ts               1833
steps/down.ts                  1704
steps/fire.ts                  6001
steps/impact.ts                1525
steps/index.ts                 1637
steps/judge.ts                  989
steps/melee.ts                 3356
steps/projectile.ts             475
steps/pure.ts                  6037
steps/reel.ts                  1005
store.ts                       3852
swap.ts                        3457
tier-name.ts                    419
ui/focus.ts                    2190
ui/icons.ts                    3177
ui/kit.ts                      9543
ui/labels.ts                   1283
ui/tabs.ts                     4004
```

Per folder: root 50, `app/` 7, `audio/` 7, `camera/` 5, `cup/` 12 (incl.
`cup/screens/` 5), `fx/` 9, `graduation/` 8, `hud/` 16, `mock/` 3, `ranch/` 10,
`scene/` 4, `scene-logic/` 13, `spar/` 7, `steps/` 11, `ui/` 5.

### Largest five

| Module | Bytes | Headroom to 12,288 |
| --- | --- | --- |
| `battleHud.ts` | 12,064 | 224 B |
| `staging.ts` | 11,640 | 648 B |
| `graduation/nursery.ts` | 11,613 | 675 B |
| `handbook.ts` | 11,193 | 1,095 B |
| `fighter-driver.ts` | 11,011 | 1,277 B |

Next in line: `creature-detail.ts` 11,007, `move-fx.ts` 10,999,
`settings-modal.ts` 10,911, `cup.ts` 10,683, `playbackDriver.ts` 10,641.

Every one of the 167 is at or under 12,288 B, so the guard passes on the phase
head with no exemption.

## Deviations

1. **`conductor/tech-stack.md` was not edited.** The sandbox rejects writes to
   that path (`permission.rejected` on `edit`, three attempts with different
   anchors and content), the same class of denial that blocks shell commands
   outside the configured verification set. The note is written and ready —
   exact text for the primary to insert after the
   `20261020-detail-modal-tabs` bullet in `## Client`:

   ```markdown
   -   *2026-10-20 (track `20261020-client-decomposition`):* The 12 KB rule is now
       a whole-tree guard, not a two-folder one. `apps/client/src/module-size.test.ts`
       walks every `.ts` file under `apps/client/src` recursively (`readdirSync`
       with `withFileTypes`; paths reported relative to `src/`), so a module
       anywhere in the client — `main.ts` and friends included — fails the run
       that pushes it over. Exactly two names are exempt: co-located `*.test.ts`
       suites and the Vite type shim `vite-env.d.ts`. There is no allowlist by
       name and no per-folder exception. The rule is `CAP_BYTES = 12 * 1024` of
       **bytes**, not lines. On failure the message names every offender as
       `<path> — <bytes> B (<overage> B over the <cap> B cap)`, sorted largest
       first, under a header telling the author to split along the seams the
       module already has. A negative control in the same file writes
       `__guard-negative-control-<pid>.ts` into `src/`, asserts the *same* walk
       and report catch it, and removes it in a `finally`, so the guard is
       proven to reject an oversized module and to leave no artifact behind.
       `size-probe.test.ts` — the interim four-file pin from
       `20261020-evolution-discovery-ui` — is retired and its guarantee is
       subsumed. No new dependency, no runtime change.
   ```

   Consequence: P5.T2 is done except this note; the code part of P5.T2 is
   committed.

2. **`git rm apps/client/src/size-probe.test.ts` is denied; `git rm -- …`
   works.** Recorded only because the delete is part of P5.T1 and the flag is
   not cosmetic.

No production code changed, no dependency or config was added, and nothing
outside `Touches` was modified.

## Notes

- The guard's own file is excluded by the `*.test.ts` rule, so the largest test
  suite in the tree cannot shadow the rule it enforces.
- `bun test <file>` is rejected by this sandbox, so the guard's tests were
  exercised through `bun run verify` (all 142 files) rather than in isolation;
  the failing-path demo above names the single test by id and line.
- The three largest modules (`battleHud.ts` 224 B headroom, `staging.ts`,
  `graduation/nursery.ts`) are Phase 4 outputs. They pass, but the next edit to
  any of them will trip the guard first — worth watching in review.
- A 6-byte scratch file (`write-probe.md`) was left in the gitignored
  `.conductor/evidence/20261020-client-decomposition/` because file deletion is
  denied outside `git rm`; it is not tracked.

## Integrated verification — orchestrator (P5.T3)

> **TO BE FILLED BY THE ORCHESTRATOR.** This section is intentionally empty: the
> phase subagent does not run the integrated pass. Expected contents: full
> suite, CI-mode suite (`CI=true bun test --timeout 120000`), `biome check`,
> `bun run gate:determinism`, `bun run build`, and the browser smoke of every
> surface (draft → starter → care actions → detail modal tabs → spar → cup run →
> graduation, plus `mock.html`), with desktop and phone screenshots under
> `.conductor/evidence/20261020-client-decomposition/` and a clean console.

_Phase subagent: report written 2026-10-20; P5.T3 left `[ ]` in `plan.md`._
