# Spec: Ranch Dressing

**Track ID**: `ranch_dressing_20261010` · **Type**: Feature · **Branch**: `track/ranch_dressing_20261010`

## Overview
The ranch scene currently renders as a dark void: flat navy sky, a hard-edged blue-grey ground box, static lighting, no shadows, and no world around the creature. The product definition promises "a warm ranch the player calls home." This track delivers that in layers: a golden-hour atmosphere (gradient sky + fog), a warm ground with real drop-in shadows, a voxel prop registry (tufts, bushes, landmark trees, rocks, food pile), and a `fedToday` sim flag that makes feeding visible in the world.

## Functional Requirements

### FR1 — fedToday sim flag
- `Creature` gains `fedToday: boolean` (fresh creatures: `false`), echoing the `bondedToday` precedent.
- A successful Feed care action sets `fedToday = true`; Rest/Treat/Play leave it unchanged; nightly settlement resets it to `false`.
- Save bumps to **v4**: `SAVE_VERSION = 4`; a v3→v4 migration stamps `fedToday: false` onto legacy creatures; `isValidCreature` rejects saves where `fedToday` is not a boolean.

### FR2 — Atmosphere
- Sky: static gradient — warm amber horizon band (≈ `#d98c4a`) fading to deep navy overhead (≈ existing `0x1a1f2e`).
- Fog: linear, tuned so the ground boundary fades into the sky while the creature stays crisp.
- Lighting: warm key sun (≈ `#ffd9a0`) + a cool rim light from the opposite side; ambient re-balanced warm — lit voxels glow warm, shadowed voxels edge cool.
- No ambient motion of any kind (static sky; reduced-motion unaffected by design).

### FR3 — Ground
- Re-hued to muted moss-green earth (≈ `#3a4d34`); soft boundary (disc/rounded shape) so fog, not a hard box edge, defines the horizon at max orbit radius.

### FR4 — Contact shadows
- Renderer shadow map enabled; creature parts `castShadow`, ground `receiveShadow` — a soft contact shadow under the creature.

### FR5 — Prop registry (`@apex/voxel`)
- New static archetypes: grass **tufts** (2-3 hue variants), **bushes** (same hue family), **broadleaf tree** (stacked blob canopy + trunk), **rock**, **food pile**.
- Built through the existing runtime pipeline (`voxelize` + `meshGrid`) — same style as creatures, no committed assets.
- Determinism tested like creature archetypes and folded into the `gate:determinism` script.
- Props are fully static this track (no sway, no animation).

### FR6 — Scene composition
- Landmarks (2 trees, 3 rocks) at fixed hand-chosen positions outside the creature's play area; tufts (~16) + bushes (~5) scattered from the creature's existing `visualSeed` — same creature always finds the same ranch, no new save state.
- Food pile sits near the creature; visible iff `fedToday` (present/absent toggle, no size grading); the scene API is extended to receive it and `main.ts` keeps it in sync with care actions and Advance Day.

### FR7 — Pages
- Only the main ranch page; `/gallery.html` and `/preview.html` keep their neutral studio look.

## Non-Functional Requirements
- Desktop stays fluid (~60 fps): medium density budget ≈ 16 tufts / 5 bushes / 2 trees / 3 rocks / 1 pile; no new dependencies.
- `bun run verify` green; the determinism gate extended to cover the new props.
- Client remains a typed DOM/CSS overlay; sim stays pure (fedToday logic fully TDD'd).
- Copy rules from product-guidelines unaffected (no new copy except none required).

## Environment palette note (documents FR2/FR3 color decisions)
- Horizon amber `#d98c4a`, sky navy `#1a1f2e`, sun key `#ffd9a0`, cool rim side stays within the existing cool navy family, ground moss `#3a4d34`. Type hues (Fire 18°, Plant 110°, Water 205°) are untouched; the environment palette is additive and documented here as per product-guidelines.

## Acceptance Criteria
1. Sky reads as dusk (amber horizon → navy top); ground warm green; no hard ground edge visible at max zoom.
2. The creature casts a soft shadow on the ground.
3. Same seed → identical ranch: a reload produces the same prop layout and hues.
4. Feed → food pile appears; Advance Day → pile gone; HUD morning copy intact.
5. The creature stays crisp in fog with warm highlights and a cool rim.
6. The determinism gate covers the props (byte-stable generation).
7. v3 saves migrate with `fedToday` false; corrupt saves (non-boolean `fedToday`, bad training fields) are still rejected.

## Out of Scope
Fence ring · vertex-color ground painting · day/night cycle · cup-day atmosphere · weather · creature-prop interaction (eating the pile) · gallery/preview dressing · arena set · multi-creature ranch · new care actions.
