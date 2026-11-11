# Integrated verification — Presentation Mapping

- Track: 20261111-presentation-mapping · Branch: `feat/20261111-presentation-mapping`
- Head: `a31e20ec` · Code checkpoint: `df2d8261`
- Date: 2026-11-11

## Tree equivalence

`git diff df2d8261..HEAD -- . ':!conductor'` is empty: everything after the
Phase 4 squash is Conductor bookkeeping (plan, metadata, evidence). The final
tree's code is byte-identical to the tree Phase 4 verified, so the Phase 4
command results stand for the final tree.

## Commands (on the final code tree)

| Command | Exit | Summary |
|---|---|---|
| `bun run verify` | 0 | 4089 pass, 1 skip, 0 fail (4090 tests, 373 files); biome clean (928 files); determinism gate OK (otter stages + 5 props byte-identical); battle-trace hash `0xc579e9ae`, 5/5 invariants |
| `bun run build` | 0 | 416 modules, chunk-size warning only (pre-existing) |
| playwright visual pass, desktop + iPhone 15 | 0 | real spar at both widths, console 0 errors / 0 warnings; end-screen + mid-replay shots under `.conductor/evidence/20261111-presentation-mapping/` |

## Spec coverage (end-to-end)

- AC-1/2/5/10 (poses, mapping, parity), AC-3/4/7 (roll, recoil+pin, squash),
  AC-6/8 (reach wedge, bounded set), AC-9/11 (reduced flashes, replay hash)
  — each proven in its phase evidence; no phase regressed a prior AC
  (final verify is green on the combined tree).
- NFR-1 (zero sim diff): `git diff 3c525eae..HEAD -- packages/sim` is empty;
  replay hash unchanged. NFR-3 (caps): all touched client files ≤ 12,288 B
  (`fighter-driver.ts` 12,147 B closest). NFR-5 (reduced-motion contract):
  parity test + live reduced spar at both widths.

## Known non-misses (carried, not fixed)

- Slip reads as partial roll (stream-indistinguishable; documented Phase 2).
- Mid-stream join reads flinch until a fresh break latches (Phase 1).
- Same-startup rows read the longest reach; first startup frame shows the
  basic default for one step (Phase 3).
- `.hud-motion` overlay intercepts the Spar tap at iPhone 15 width
  (pre-existing layout quirk); dev server left on :5175.
