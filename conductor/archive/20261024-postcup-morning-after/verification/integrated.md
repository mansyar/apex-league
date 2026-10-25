# Integrated Verification — Post-Cup Morning-After Ritual

- **Track**: `20261024-postcup-morning-after`
- **Date**: 2026-10-25
- **Branch**: `feat/20261024-postcup-morning-after`
- **Code tree verified**: `698c8b03` (identical to HEAD `ffc2f598` for all
  non-conductor paths; only Conductor bookkeeping differs)

## Full strategy executed

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Phase gate | `bun test --check --parallel=4 --timeout 120000` | 0 | 2629 pass / 1 skip / 0 fail, 207 files, 42.72 s |
| Acceptance | `bun run verify` | 0 | Workspace typechecks clean; Biome clean; determinism gate byte-identical (6 species × 3 stages + 5 props) |
| Build | `bun run build` | 0 | Production bundle OK; pre-existing >500 kB chunk advisory only |
| Visual | playwright-cli, real dev server | — | 12 captures: champion + exit ceremonies at 1440×900 and 393 px, console clean both sessions (`phase-4.md` for paths) |
| Determinism | nightly-equivalent gate inside `verify` | 0 | All GLBs + prop digests byte-identical |

Run at the `698c8b03` code tree during phase-4 acceptance; no code file has
changed since.

## Coverage roll-up (spec → evidence)

- FR-1..FR-10, NFR-1..NFR-7, AC-1..AC-6: each mapped to unit/evidence in
  `verification/phase-{1,2,3,4}.md`; the spec has no withdrawn or
  untraced requirements.
- Save schema: **unchanged (v25)** — `docs/save-schema.md` requires no
  update; the store tests pin the save payload.
- Determinism gate: untouched by design (no voxel/generator edits);
  byte-identical across all gates.

## Docs-sync decision

- `conductor/tech-stack.md`: dated note applied (`fa0593ac`).
- `conductor/product.md`: no roadmap change — the ritual is a
  feature-level polish inside Phase 3's "more life" scope, not a new
  roadmap item.
- `conductor/product-guidelines.md`: no principle change — the ritual
  follows existing principles (discovered-not-hidden, reduced-motion
  respected, death-free stakes, copy ≤ 2 sentences).

## Deviation ledger (track-wide)

- P2: recovered-work adoption + protocol-order slip (re-split, corrected).
- P3: four smallest-possible composition-root pass-throughs (hud.ts,
  scene.ts, scene/types.ts, main.ts) — recorded in `phase-3.md`.
- P4: tech-stack note applied by the primary after executor permission
  denials; reduced-motion browser capture skipped in favor of unit-pinned
  coverage (fallback ladder).

**Result**: integrated verification **passed**.
