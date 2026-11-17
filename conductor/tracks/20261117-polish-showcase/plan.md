# Polish & Showcase - Implementation Plan

> **Branch:** `feat/20261117-polish-showcase`
> **Base:** `main` @ `23c6750900cb3285dc36d399a29a15061a73c3cb`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Pure cue-table expansion & calm parity

- **Goal:** UI navigate/confirm, cup-transition and evolution/graduation cues map through the DOM-free table with calm variants; pure tests pass.
- **Depends on:** none
- **Covers:** FR-1, FR-8, AC-1, AC-8
- **Touches:** `apps/client/src/audio/cues.ts`, `apps/client/src/audio/cues.test.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** `69d1da09`
- **Evidence:** conductor/tracks/20261117-polish-showcase/verification/phase-1.md

- [x] **P1.T1: Extend the cue mapping** - covers: FR-1
  - [x] **P1.T1.1: Add UI navigate/confirm and cup-transition cue types with gate checks**
  - [x] **P1.T1.2: Add evolution/graduation cues and reduced-motion calm variants**
- [x] **P1.T2: Pure cue tests** - covers: FR-1, AC-1, AC-8
  - [x] **P1.T2.1: Cover every new mapping, success and unmapped failure cases**
  - [x] **P1.T2.2: Assert calm variants and silent instant dumps**

## Phase 2: Bundled assets, new CC0 pack & wiring

- **Goal:** New SFX and one music bed from credited packs plus one vetted CC0 pack are bundled, URL-resolvable and fully attributed.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, AC-2, AC-3
- **Touches:** `apps/client/public/audio/**`, `apps/client/public/audio/CREDITS.md`, `apps/client/src/audio/cueUrls.ts`, `apps/client/src/audio/cueUrls.test.ts`, `apps/client/src/audio/beds.ts`, `apps/client/src/audio/beds.test.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P2.T1: Bundle and wire new assets** - covers: FR-2
  - [ ] **P2.T1.1: Add new SFX and one bed from already-credited packs; transcode to .ogg**
  - [ ] **P2.T1.2: Extend `cueUrls`/`beds` tables and URL-resolution tests**
- [ ] **P2.T2: Source the new CC0 pack** - covers: FR-3
  - [ ] **P2.T2.1: Vet license, bundle files, add exact provenance rows to CREDITS.md**
- [ ] **P2.T3: Provenance completeness check** - covers: AC-2, AC-3

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261117-polish-showcase/verification/phase-2.md
-->

## Phase 3: Ducking mix envelope

- **Goal:** A pure envelope dips music under priority cues and restores the exact user volume across mute/scene changes; unit tests pass.
- **Depends on:** Phase 2
- **Covers:** FR-4, NFR-6, AC-4
- **Touches:** `apps/client/src/audio/duck.ts`, `apps/client/src/audio/duck.test.ts`, `apps/client/src/audio/player.ts`, `apps/client/src/audio/musicBeds.ts`, `apps/client/src/app/audio.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P3.T1: Pure ducking envelope** - covers: FR-4
  - [ ] **P3.T1.1: Duck/restore tests including mute toggle and scene change mid-duck**
- [ ] **P3.T2: Wire without contract changes** - covers: FR-4, AC-4
  - [ ] **P3.T2.1: Integrate via existing `AudioPlayer`/`MusicBeds` APIs; preserve first-gesture unlock**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261117-polish-showcase/verification/phase-3.md
-->

## Phase 4: Accessibility & legibility

- **Goal:** Four event classes announced politely without focus theft; focus visible and copy compliant on touched surfaces; the 393px bar holds.
- **Depends on:** Phase 3
- **Covers:** FR-5, FR-6, FR-7, NFR-5, AC-5, AC-6, AC-7
- **Touches:** `apps/client/src/ui/focus.ts`, `apps/client/src/ui/announcer.ts`, `apps/client/src/ui/announcer.test.ts`, `apps/client/src/app/hud-screen.ts`, `apps/client/src/cup/results.ts`, `apps/client/src/graduation/flow.ts`, `apps/client/src/cloud/panel.ts`, `apps/client/src/hud/copy*.ts`, `apps/client/src/ui/kit.css`, `apps/client/src/base.css`
- **Verification:** `bun run verify && bun run build`; visual layer (`playwright-cli`, desktop + iPhone 15)
- **Status:** pending

- [ ] **P4.T1: Polite live-region announcer** - covers: FR-5, AC-5
  - [ ] **P4.T1.1: Coalesced single region for verdict, KO, cup advancement, save/load; suppress instant dumps**
- [ ] **P4.T2: Focus visibility** - covers: FR-6, AC-6
- [ ] **P4.T3: Copy compliance audit** - covers: FR-7, AC-7
- [ ] **P4.T4: 393px bar re-check (both orientations)** - covers: NFR-5

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261117-polish-showcase/verification/phase-4.md
-->

## Phase 5: Showcase evidence & capture

- **Goal:** Committed verification report with desktop/mobile screenshots, clean console and one marquee cup-run capture; all invariants green.
- **Depends on:** Phase 4
- **Covers:** FR-9, NFR-1, NFR-2, AC-9, AC-10
- **Touches:** `conductor/tracks/20261117-polish-showcase/verification/phase-5.md`, `.conductor/evidence/20261117-polish-showcase/**` (gitignored captures)
- **Verification:** `bun run verify && bun run build`; visual layer per workflow
- **Status:** pending

- [ ] **P5.T1: Visual evidence + marquee capture** - covers: FR-9, AC-9
  - [ ] **P5.T1.1: Desktop (1440x900) and iPhone 15 (393x852) screenshots, console check, cup-run capture**
- [ ] **P5.T2: Invariant proof** - covers: NFR-1, NFR-2, AC-10
  - [ ] **P5.T2.1: Record determinism, module-size and full-verify results in the evidence file**

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 5
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** - covers: <finding ID>
-->
