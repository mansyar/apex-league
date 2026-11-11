# Phase R1 evidence — Review Fixes (round 1)

- Track: 20261111-presentation-mapping
- Phase: R1 (Review Fixes, round 1)
- Date: 2026-11-11
- Branch: feat/20261111-presentation-mapping
- Base: 07a6d11e
- Head: 81d5fe4b (sim export 1be1a79e, client fixes 81d5fe4b)
- Result: PASS — all five round-1 findings closed and pinned; `bun run verify` and `bun run build` green, no regressions.

## Commands

- `bun run verify` → exit 0. Full suite: 4111 pass, 1 skip, 0 fail across 373 files; `biome check` clean over 928 files; determinism gate OK (all voxel/seed digests byte-identical; battle-trace replay hash `0xc579e9ae` unchanged).
- `bun run build` → exit 0 (`@apex/client`, 416 modules, built in ~390 ms; only the pre-existing >500 kB chunk warning).

Verification took four `verify` runs: (1) two type errors from the new imports/optional field — fixed via root barrel + `?? 0`; (2) stale barrel — fixed via `packages/sim/src/index.ts`; (3) three test failures — the reduced-flash dodge-roll re-pin, two module-size cap overflows, one biome format/import-sort pass; (4) green. A fifth run confirmed green after the biome fixes. No check was retried without a fix between runs.

## Findings

### F1 (Medium) — slip travel trips the dodge roll

- Fix: the roll pose now keys on a genuine dodge, not travel alone. The sim rides a paid dodge burst on the spare phaseT bit (see Deviation D1); `poseForFrame` rolls when `dodgeBurst === true` regardless of travel, falls through to footwork when it is explicitly `false` in the roll band, and keeps the legacy travel threshold only for hand-built frames where the flag is absent. `createPoseTracker` threads the flag through from each streamed frame.
- Pinning tests: `choreo-poses.test.ts` "the dodge flag outranks travel" + "the dodge flag and the lateral" (flagged 20 mm rolls, flagged rest rolls at intensity 0, unflagged 70 mm reads as footwork, absent flag keeps the threshold); `dense-playback.test.ts` flagged-30 mm dodge rolls end-to-end while unflagged 60 mm does not.
- Why no regress: priority order and every threshold are untouched; legacy/hand-built frames behave exactly as before (all pre-existing roll/recoil/press pins pass unchanged).

### F2 (Medium) — same-startup rows read the longest reach

- Fix: the stream carries the committed move's 1-based index in the spare phase bits (see Deviation D1); the tell wedge prefers `reachForMoveIdx` (exact row reach) and only falls back to the startup estimator when the frame carries no index.
- Pinning tests: `tell-scale.test.ts` `reachForMoveIdx` (ion_wall → 4400, sky_bolt → 6200, 0/invalid → undefined); `dense-playback.test.ts` "a wall startup reads its own reach" (500 ms wall paints (4400+220)·0.0008, same-bucket bolt still clamps at 4.0); the 49-move ↔ 49-row 1:1 coverage is pinned in `stream.test.ts` ("names the committed move on every attack window").
- Why no regress: estimator path, bucket table, and goldens are untouched; frames without an index (legacy, hand-built, non-attack) read exactly as before.

### F3 (Low) — roll tucks forward instead of along travel

- Fix: the tracker measures the step's signed lateral share across the facing (−1..1) and attaches it to the roll pose; `poseAdjust` tips the tuck from pitch into roll with it (sideways dodge → full lateral tip, forward dodge → unchanged forward tuck); the driver copies `poseLateral` through to `poseAdjust` every frame.
- Pinning tests: tracker lateral (+1 sideways, ~0 forward), `poseAdjust` sideways/forward/other-pose-ignores cases, `fighter-driver.test.ts` "a sideways roll tips the body into the roll" (rotation.z > 0.2 with less forward pitch than a straight tuck).
- Why no regress: default lateral is 0 (identical output to the old forward tuck); no other pose reads the new channel.

### F4 (Low) — unjustified `as` in reduced-flash.ts:95

- Fix: the flash marker mesh is now a typed `THREE.Mesh<SphereGeometry, MeshBasicMaterial>` (`FlashMesh`), so eviction disposes via the typed `material.dispose()` — the cast is gone, not justified.
- Pinning tests: the pre-existing eviction-cap test plus a new "an evicted flash leaves the arena consistent" test (arena children and live count agree, oldest freed).
- Why no regress: identical FIFO cap-4 behavior; no runtime path changed.

### F5 (Low) — first startup frame shows the default wedge

- Fix: the wedge (and its pulse ring) stays hidden on the first startup sample (`runSteps < 2`) and only appears once the run firms up — via the exact move index immediately, or via the estimator from the second sample.
- Pinning tests: dense-playback "first startup sample stays hidden" plus re-pins of the telegraph-growth, long-startup, reset-hides, and pulse-ring tests to the settled-visibility rule.
- Why no regress: steady-state growth/yaw/opacity/ring math untouched; only sample 1 visibility changed (previously the knowingly-wrong default wedge).

## Mechanical re-pins (no behavior change)

- `playbackDriver-dense.test.ts`: raw phase-field read now masks `& 3` (phase still the low two bits with the move index above them).
- `reduced-flash.test.ts`: stream builder packs the dodge bit; the dodge-roll flash test flags its dodge step (it models a dodge, which now carries the flag).
- `stream.test.ts` verdict-keys test now expects the `"dodges"` paid-count tuple on the resolved verdict (plain data, survives the save round-trip; the stream itself still does not).
- Module sizes: trimmed added comments in `choreo-poses.ts`/`fighter-driver.ts` to stay under the 12 KB cap (both caps green; sim cap green).

## Deviations

- D1 (required, minimal, recorded): client-only inference was attempted first and proven insufficient in a test — a held-dodge unit scenario through `advance` pays dodges, but the Ember-vs-Brook controller matchups used for the wire-through pin paid zero dodges across 100 seeds, so no client-side travel/timing signature can separate a genuine dodge from a slip in the 60–91 mm overlap band (information-theoretic, not a tuning gap). The sim therefore exports two additive, behavior-free fields on the dense stream with zero frame-data changes: a paid-dodge burst on the spare phaseT bit (bit 9, progress stays 0–255) and the committed move's 1-based index above the phase bits. `STREAM_FIELDS` stays 9, byte size unchanged, replay hash byte-identical (`0xc579e9ae`), all 5 stream invariants and all balance bands hold. Threading: `resolve.ts` passes `result.dodges` (paid-filtered) into `recorder.push`; `controller-doctrine.test.ts` blank literal extended.

## Notes

- No sim behavior, frame data, moves, controller, doctrines, or balance tests touched; no bound widened; no `test.failing` used.
- Shell policy note: ad-hoc shell (e.g. `git diff --stat`, bare `bunx`) is denied for this executor; all diagnosis and verification ran through the brief's own `bun run verify` / `bun run build` commands plus one scoped `bun test` run per failing file. Raw `git diff` output was not reviewable, so the per-finding summary above is reconstructed from the authored edits and the green suite, not from a diff read.
