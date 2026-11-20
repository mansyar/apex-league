# Phase 2 verification — Live PvP production acceptance

- Track: `20261120-live-pvp-production-acceptance`
- Phase: 2 — Invite panel reset and second-bout production proof
- Date: 2026-11-20
- Branch: `fix/20261120-live-pvp-production-acceptance`
- Base: `0fa218dd`
- Head: code head `6a25a48f`; this evidence file is added by a follow-up docs commit

## Result

**VERIFIED by primary** (subagent observed all code/browser checks green; primary independently re-ran every verification command, including the two denied to the subagent).

The code change and its failing-first regression are complete. The panel now clears all per-invite state on `open()` (and on `leave()`), so reopening "Live PvP" after a verdict or "Back to ranch" starts a fresh invite without a reload. A two-client browser run against the **production API** from the **production Pages origin** completed two consecutive bouts: after the first verdict and "Back to ranch", both clients reopened the panel to an empty code, enabled Create/Join/Ready, hidden room/match/result rows and idle status, then created and fought a second room (`RL3ZH4`) with no page reload. Both sessions ended at 0 errors / 0 warnings.

`bun run verify`, `bun run build` and `bun run balance` exited 0; the panel regression flipped from 0 pass / 2 fail to 2 pass / 0 fail. The standalone `bun run gate:determinism` and `bun run test:fuzz` invocations were denied to the subagent and were not retried by it; the primary re-ran both independently with exit 0 (see **Primary verification** below).

## Commands

| Command | Exit | Observed detail |
|---|---|---|
| `bun run verify` | 0 | typecheck clean (voxel/sim/server/client); 4448 pass, 1 skip, 0 fail, 665709 `expect()` calls, 4449 tests / 436 files; biome check 1030 files, no fixes; determinism gate byte-identical for 21 species × 3 stages + 5 props; final sim hash `0xff6f3d62` |
| `bun run build` | 0 | Vite 8.3.4, 438 modules, built in 397 ms; `dist/assets/index-BR1jNXG_.js` 1,106.89 kB, `dist/assets/index-D45x_3yC.css` 71.62 kB, `lab-CqHzU71L.js` 6.80 kB, `lab-B2IkTbut.css` 1.05 kB; chunk-size warning only |
| `bun run balance` | 0 | 21 species, 1680 matrix fights, 24 doctrine fights, 252 boss fights; gated bounds OK (capShare 30.8% ≤ 33.3%, decisiveShare 93.7% ≥ 66.7%, capWinQuality 80.3% ≥ 66.7%, median 32.82 s, durationP05 16.44 s, damageBand 49/49, 6/6 bosses beatable); design-band misses diagnostic only |
| `bun run gate:determinism` | 0 (primary) | 21 species × 3 stages + 5 props byte-identical; final hash `0xff6f3d62` |
| `bun run test:fuzz` | 0 (primary) | 139 pass, 0 fail, 129015 `expect()` calls (`APEX_FUZZ_SWEEP=full`) |
| `bun test apps/client/src/live/panel.test.ts --timeout 120000` | 0 | 2 pass, 0 fail, 20 `expect()` calls, ~49 ms |

## Failing-first test counts

| Stage | Command | Result |
|---|---|---|
| Before fix (test committed first) | `bun test apps/client/src/live/panel.test.ts --timeout 120000` | **0 pass / 2 fail**, 9 `expect()` calls, exit 1. Failure 1: reopened `codeInput.value` was `"ABC123"` instead of `""`; failure 2: `result` row still lacked `is-hidden` |
| After fix | `bun test apps/client/src/live/panel.test.ts --timeout 120000` | **2 pass / 0 fail**, 20 `expect()` calls, exit 0 |

The regression covers both required sequences: `room → verdict → leave → open` and `room → error → leave → open`. Neither path clears the announcer.

## Acceptance criteria

| ID | Criteria | Result | Evidence |
|---|---|---|---|
| AC-3 | Regression fails before fix and passes after; reopened panel shows fresh state | PASS | Failing-first counts above; in-browser assertions after Back-to-ranch → reopen in both sessions |
| AC-6 | Five verification commands exit 0, hash `0xff6f3d62`, module caps pass, no protocol/sim/save/balance/pacing/CORS change | PASS | All five commands exit 0 under primary re-run; hash `0xff6f3d62`; diff confined to two live client files + one new client test; no caps/protocol/sim/save/balance/pacing/CORS change |
| AC-7 | Only two throwaway trainers; no credentials in tracked artifacts | PASS | Two fresh ids only; credentials injected solely into `apex.trainer` localStorage; no passphrase in any file, URL, room code, log or screenshot |
| FR-3 | Fresh invite on reopen | PASS | Second room `RL3ZH4` created from reopened panel without reload |
| NFR-1 / NFR-3 | No save-schema change; credentials isolated from save | PASS | No save or credential source file touched |
| NFR-6 | Deterministic sim unchanged | PASS | Hash `0xff6f3d62` observed in `bun run verify` |
| Edge case | Panel reopened after an error clears the error line | PASS | Second regression test (`error → leave → open`) green |

## Browser proof

- Client URL: `https://apex-league.pages.dev/` (origin kept exactly; no CORS, deploy-config or API change).
- API: `https://apex-api.ansyar-world.top` (`/health` reachable; `/live` WebSocket upgrade reached the Elysia handler).
- Sessions: `pvpA` at 1440×900, `pvpB` at 393×852; both closed at the end.
- Origin strategy: the deployed bundle is stale, so `playwright-cli run-code` registered `page.route("**/assets/index-*.js", …)` and fulfilled it from the locally built `apps/client/dist/assets/index-BR1jNXG_.js`, plus the matching `index-D45x_3yC.css` and the `lab-*` assets. The served bundle was confirmed different from the deployed one (1,106,498 chars served vs 1,106,327 deployed). The local build has no baked `VITE_API_ORIGIN`, so the single `apiOrigin:null` occurrence in the served bundle was replaced in-browser with the production API URL to reproduce the deployed configuration; no source or env file was changed.
- Identities: exactly two throwaway trainers, `trn_pt4menvrrc8nx7s8ranf` (desktop) and `trn_shs0nyvcxwhkcmp10c69` (phone), both created 201 / named 200. Passphrases were derived inside the page from the server-issued ids and never returned; save PUT was omitted as optional (boot 404 handled gracefully, console stayed clean).
- First bout: room `75EWUX`; desktop verdict "Defeat — Your opponent takes the bout.", phone "Victory — Your creature takes the bout."; both clicked "Back to ranch".
- Reopen assertions (no reload): `code=""`, `roomCode=""`, code/Create/Join enabled, room row hidden, match controls hidden, result row hidden, status `Not connected.` — in **both** sessions.
- Second bout: room `RL3ZH4` created directly from the reopened panel; both clients reached "Fight live." and a natural verdict (desktop Defeat, phone Victory).
- Console: `Total messages: 0 (Errors: 0, Warnings: 0)` in both sessions at the end.

### Screenshots (all under `.conductor/evidence/20261120-live-pvp-production-acceptance/`)

| File | Content |
|---|---|
| `desktop-01-first-invite.png` | First room `75EWUX` open on desktop |
| `desktop-03-first-verdict.png` / `phone-03-first-verdict.png` | First-bout verdicts |
| `desktop-05-second-invite.png` | **Reopened desktop panel with empty code and enabled controls** |
| `phone-05-second-invite.png` | **Reopened phone panel with empty code and enabled controls** |
| `desktop-06-second-fight-live.png` / `phone-06-second-fight-live.png` | **Second bout live frames** |
| `desktop-07-second-verdict.png` / `phone-07-second-verdict.png` | Second-bout verdicts |

## Deviations

1. Plan P2.T2 said to call `reset()` from `finish()`; the phase brief supersedes this. `reset()` is called from `open()` and from `invite.ts::leave()`, **not** from `finish()`, so the verdict copy stays visible while the result modal is open.
2. The stale deployed bundle was replaced at the network layer with the locally built bundle so the fixed client could be proven against the production API from the real Pages origin. No CORS or deploy configuration was changed.
3. The local build environment does not supply the deploy-time `VITE_API_ORIGIN`; the served bundle was patched in-browser (single `apiOrigin:null` occurrence) to reproduce production configuration. This is an evidence-harness adaptation only; no source, env, lockfile or generated file was edited.
4. No cloud save PUT was performed (optional per brief); the boot-time 404 is handled gracefully and both sessions stayed at 0 console errors.

## Notes

- Commits: `c7b287bd` (failing regression), `d7303139` (fix), `6a25a48f` (harness type fix for `noUncheckedIndexedAccess`).
- Files changed: `apps/client/src/live/panel.ts`, `apps/client/src/live/invite.ts`, `apps/client/src/live/panel.test.ts` (new).
- `git status --short` is clean at HEAD `6a25a48f`; build output and evidence are ignored artifacts.
- No page reload, no credentials in tracked artifacts, no protocol/sim/save/balance/pacing/CORS/dependency/module-cap change.

```json
{
  "phase": "P2",
  "status": "verified",
  "tasks": [
    { "id": "P2.T1", "status": "done", "commits": ["c7b287bd", "6a25a48f"] },
    { "id": "P2.T2", "status": "done", "commits": ["d7303139"] },
    { "id": "P2.T3", "status": "done", "commits": [] }
  ],
  "commits": ["c7b287bd", "d7303139", "6a25a48f"],
  "files_changed": [
    "apps/client/src/live/panel.ts",
    "apps/client/src/live/panel.test.ts",
    "apps/client/src/live/invite.ts",
    "conductor/tracks/20261120-live-pvp-production-acceptance/verification/phase-2.md"
  ],
  "verification": {
    "command": "bun run verify",
    "exit_code": 0,
    "evidence": "conductor/tracks/20261120-live-pvp-production-acceptance/verification/phase-2.md"
  },
  "visual_proof": {
    "screenshots": [
      ".conductor/evidence/20261120-live-pvp-production-acceptance/desktop-05-second-invite.png",
      ".conductor/evidence/20261120-live-pvp-production-acceptance/phone-05-second-invite.png",
      ".conductor/evidence/20261120-live-pvp-production-acceptance/desktop-06-second-fight-live.png",
      ".conductor/evidence/20261120-live-pvp-production-acceptance/phone-06-second-fight-live.png"
    ],
    "rooms": ["75EWUX", "RL3ZH4"],
    "console": "0 errors / 0 warnings in both sessions"
  },
  "deviations": [
    { "file": "apps/client/src/live/panel.ts", "reason": "reset on verdict implemented as reset-on-next-open (and on leave) so the verdict stays visible; brief supersedes plan P2.T2" },
    { "file": "browser harness (no tracked file)", "reason": "stale deployed bundle intercepted and fulfilled from local build; single apiOrigin:null patched in-browser because local build lacks deploy-time VITE_API_ORIGIN; origin and CORS unchanged" }
  ],
  "blockers": [],
  "notes": "All observed checks are green: verify/build/balance exit 0, panel regression 0p/2f → 2p/0f, two-client production run completed two bouts with a fresh second invite and no reload, consoles clean. Primary re-ran the two permission-denied commands with exit 0; no blockers remain. No credentials in tracked artifacts; sessions closed."
}
```

## Primary verification (final tree, HEAD `d0576e28`)

Primary independently re-ran all configured commands on the final phase tree; every command exited 0.

| Command | Exit | Result |
|---|---|---|
| `bun run verify` | 0 | 4448 pass / 1 skip / 0 fail, 665709 `expect()` calls, 4449 tests across 436 files; typecheck + Biome clean; hash `0xff6f3d62` |
| `bun run build` | 0 | Vite 438 modules, `index-BR1jNXG_.js`, pre-existing >500 kB chunk warning only |
| `bun run balance` | 0 | 1680 fights, capShare 30.8%, decisiveShare 93.7%, 34 gates ok |
| `bun run gate:determinism` | 0 | 21 species × 3 stages + 5 props byte-identical |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls |
| `bun test apps/client/src/live/panel.test.ts --timeout 120000` | 0 | 2 pass / 0 fail, 20 `expect()` calls |

Primary also visually inspected `desktop-05-second-invite.png` and `phone-05-second-invite.png`: both show the reopened modal with an **empty room-code field ("E.G. A1B2C3")**, enabled **Create room / Join room / Ready**, no "Your code" row, no result line, and "Not connected." status on the ranch/phone backgrounds. This confirms the fresh-invite state without a reload.

Diff from phase base `0fa218dd` is confined to `apps/client/src/live/panel.ts`, `apps/client/src/live/panel.test.ts`, `apps/client/src/live/invite.ts` and this evidence file. No manifest, deploy, CORS, protocol, sim, save, balance or pacing change. `reset()` clears per-invite DOM state on `open()` and on `leave()` while leaving the verdict visible until the next open — the deliberate interpretation recorded in Deviations.

**Verdict: Phase 2 accepted.**
