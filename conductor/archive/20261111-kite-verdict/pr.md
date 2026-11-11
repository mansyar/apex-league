# Kite Verdict: the missing tool was engagement

Kite opened this track at 2/6 on the fixed probe — a doctrine that backs off below its own band and never converts. Diagnosis ("lost in the approach", Phase 1): ~88% of steps below the 1600 mm floor, half the press output, dodges buying avoidance without conversion, stamina/fence ruled out.

## What shipped

- **Kite aggression 40 → 55** (single kept lever, `controller-profile.ts`): fixed probe **2/6 → 5/6** with paid dodges intact (16 doctrine-table, 58 at 9.67/fight on the dodge probe). Every pacing bound held — no stat, move, band, tier, cooldown, or floor change.
- Probe harness: `controller-kite.test.ts` pins per-fight wins and paid dodges on seeds 20261109–11 × both orders; `battle-trace.ts` gained `--doctrine` / `--rival-doctrine`.
- The trap branch (FR-5) was evaluated and deliberately not shipped: labelling a doctrine that wins 5/6 a trap would mislabel a shipped tool.

## Verification

- `bun run verify` exit 0 (4113 pass / 1 skip / 0 fail, determinism gate byte-identical).
- `bun run build` exit 0. `bun run balance` exit 0 (Kite 83.3%, all rows ok). `bun run telemetry` exit 0 (13/13, capShare 7/14 at the 50.0% bound).
- Review round 1: PASS WITH FINDINGS; the single Low (integrated recap figures) closed in-track.

## Known and recorded, not claimed

- Away from the fixed probe Kite remains the weakest doctrine; the track promised a tool for the fixed matchup, which shipped.
- Telemetry capShare sits exactly at its bound (7/14 = 50.0%) — zero headroom, unchanged by this track.
- Roadmap items untouched: band-margin hardening (only on drift), minimum reach/dead zones (with the balance track).
