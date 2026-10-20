# Implementation Plan: Detail Modal Tabs

## Phase 1: Shared tab controller

- **Goal:** One keyboard-complete tab controller in the client, with the
  Coach's Handbook migrated onto it and its content unchanged.
- **Depends on:** none
- **Covers:** FR-6, FR-10, NFR-2, AC-7
- **Touches:** `apps/client/src/ui/tabs.ts` (new), `apps/client/src/ui/tabs.test.ts`
  (new), `apps/client/src/handbook.ts`, `apps/client/src/handbook.test.ts` (new)
- **Verification:** `bun test --timeout 120000`
- **Status:** in_progress