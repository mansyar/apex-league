# Client Module Decomposition & Size Guard

## Summary

Every client module now sits under the 12 KB cap, and the cap is enforced across the
whole client tree instead of two folders. `main.ts` went from 25,204 B to 8,690 B and
keeps only boot and composition. Behaviour is unchanged: same DOM, same copy, same boot
and subscriber order, same rendering constants, same determinism output.

## What changed

- **Composition root.** `main.ts` (25,204 → 8,690 B) now boots and wires; the feature
  wiring lives in `app/{scene-sync,audio,arena,screens,hud-screen,screen-deps,runtime}.ts`.
  The eight `store.subscribe` calls and their order are untouched.
- **HUD trio.** `hud.ts` (20,739 → 5,081 B), `hud/plates.ts` (16,902 → 1,122 B) and
  `hud/copy.ts` (15,173 → 1,000 B) are facades over `hud/{types,shell,update,hints}.ts`,
  one module per plate family and one per copy domain.
- **Scene, camera, effects.** `scene.ts`, `staging-fx.ts` and `orbit-camera.ts` are
  facades over `scene/{types,dressing,pet,frame}.ts`,
  `fx/{projectiles,bursts,charge}.ts` and `camera/{types,presets,input,shake,rig}.ts`.
- **Screens and harness.** The cup, spar and graduation screens split into
  `cup/screens/`, `spar/` and `graduation/`; `mock.ts` into `mock/{data,sections,showcase}.ts`.
- **The guard.** `apps/client/src/module-size.test.ts` walks every `.ts`, `.tsx` and
  `.mts` file under `apps/client/src`, follows linked folders, exempts only `*.test.*`
  and `vite-env.d.ts`, and fails with `path — bytes B (overage B over the 12288 B cap)`,
  largest first. The interim `size-probe.test.ts` is retired.

## Verification

- `bun run verify` exit 0: typecheck clean, biome 448 files 0 errors (7 pre-existing
  warnings), 1788 pass / 1 skip / 0 fail across 142 files, determinism gate
  byte-identical (axolotl champion 221,284 B, 3,286 tris; five prop digests).
- `bun run build` exit 0 (only the pre-existing chunk-size advisory).
- Browser smoke on the final tree: boot, starter, feed + advance day, detail tabs, spar
  to a verdict, cup bracket, graduation modal, plus `mock.html`, `gallery.html` and
  `preview.html`, with zero console errors.
- Guard's own suite covers the whole-tree assertion, the at-cap/one-byte-over boundary,
  largest-first ordering and a self-cleaning negative control that builds an oversized
  `.tsx` in an OS temp folder and asserts rejection.
- Review: two rounds, verdict PASS. Round 1 fixed five findings (dangling SHAs,
  contradictory counts, and three guard-quality gaps); round 2 closed four follow-ups
  in the records.

## Notes

- No save-schema change, no dependency change, no rendering or copy change.
- Largest remaining modules: `battleHud.ts` 12,064 B (224 B headroom), `staging.ts`
  11,640 B, `graduation/nursery.ts` 11,613 B. Splitting them is a separate track if they
  grow.
- `packages/sim` and `packages/voxel` are still unpinned by a size guard; this track
  deliberately stops at the client.
