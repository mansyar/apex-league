# Save Schema Reference

The save is a single JSON string under the localStorage key `apex.save`
(see `packages/sim/src/save/storage.ts`). Everything about it is versioned,
migrating, and pure — the sim owns the schema; the client only reads and
writes through the `SaveAdapter` seam.

```ts
// packages/sim/src/save/schema.ts
interface SaveData {
  version: number // current: 7 (SAVE_VERSION)
  state: GameState
  savedAt: number // Date.now() of the persist
  session: CupSession | null // live cup walk (v7+; null outside a cup)
}
```

## `GameState` at v7

| Field | Type | Meaning |
|---|---|---|
| `day` | integer ≥ 1 | Current in-game day (1-based). |
| `phase` | `"day" \| "cup"` | Cup phase is granted by the ticker on cup days; `enterCup` returns the game to the day phase. |
| `actionPoints` | integer ≥ 0 | AP left today (max from `ACTION_POINTS_PER_DAY` + cup-win bonus). |
| `creature` | `Creature \| null` | The partner; null until a starter is chosen. |
| `settings` | `{ reducedMotion: boolean, seenHints: string[] }` | In-app motion preference (v5+); dismissed onboarding hint ids (v7+). |
| `cupsWon` | integer ≥ 0 | Permanent cup-win counter (v5+). |
| `lastCupDay` | integer ≥ 1 \| null | Day of the last cup win; the ticker grants +1 AP the next day (v5+). |

### `Creature`

| Field | Type | Meaning |
|---|---|---|
| `name` | string | Player-facing name (rivals draw from a separate pool). |
| `speciesId` | non-empty string, must exist in the species catalog | Drives stats bounds, element, kit. Hand-edited unknown species are rejected on load. |
| `seed` | integer | Deterministic identity — colors, axes, battle flavor. |
| `stage` | `"baby" \| "juvenile" \| "champion"` | Evolution stage. |
| `stats` | `{hp, atk, def, spd}` | Rolled base stats; effective = base + evolution boost + trained. |
| `trained` | `{hp, atk, def, spd}` | Training bonuses, each capped (`TRAINED_START` … cap). |
| `conditions` | `{hunger, energy, health, mood, bond}` | 0–100, clamped nightly by settlement. |
| `fedToday` | boolean | Feeding gate for the day. |
| `trainingFocus` | `"hp"\|"atk"\|"def"\|"spd" \| null` | Tonight's training target. |
| `trainingResult` | `"gained"\|"sick"\|"hungry" \| null` | Last night's training outcome. |
| `trainingDays` | integer | Cumulative training days (kit gating). |
| `loadout` | string[] \| null | Equipped moves (2–4); null = default kit. |
| `sickCooldown` | integer | Nights since medicine; blocks evolution until 0 (v6+). |

## Migration chain

`migrate(raw)` walks the chain one step at a time (`migrate.ts`):

| Step | What changes |
|---|---|
| v0 → v1 | Flat `{version, day}` scaffold → state object (phase derived from day, full AP, null creature). |
| v1 → v2 | Grants the fire drake starter (seed 42) so mid-loop saves keep a partner. |
| v2 → v3 | Adds training: `trained` zeros, `trainingFocus`/`trainingResult` null. |
| v3 → v4 | Adds care fields: `fedToday: false`, `trainingDays: 6`, `loadout: null`. |
| v4 → v5 | Adds `settings` (`{reducedMotion: false}` fallback) + `cupsWon: 0`, `lastCupDay: null`. |
| v5 → v6 | Adds `creature.sickCooldown: 0` (evolution gate field). |
| v6 → v7 | Adds `settings.seenHints: []` (onboarding ledger) and the top-level `session: null` cup-session slot. The v6→v7 step forwards `reducedMotion` unchanged so corrupt values still fail load-time validation; an invalid persisted session is dropped (not fatal) by `loadSave`. |

The `session` slot holds a `CupSession` exactly as `prepareCup` produced
it (bracket, rival resolutions, verdicts, cursor position). It is
presentation bookkeeping: the client persists it on every session mutation
(prepare, after each fight, forfeit, auto-completion) and clears it when
the cup finalizes, so a refresh anywhere in the walk resumes exactly where
it stopped and committed cups can never strand their rewards.

Shared invariants, enforced by `validateStateShape(raw, version)` for every
state-bearing step: the state must be an object with integer `day ≥ 1`,
phase `"day"|"cup"`, integer `actionPoints ≥ 0` — otherwise the save is
rejected with `"invalid vN save: …"` and `loadGame` returns null (never
throws at callers).

## Adding a v8 field (recipe)

1. Bump `SAVE_VERSION` to 8 in `packages/sim/src/save/schema.ts`.
2. Add a migration entry keyed `7` to the `migrations` record in
   `migrate.ts`. Destructure `validateStateShape(raw, 7)`, shape only the
   new field (defaults must be safe for a mid-life creature), and return
   `{version: 8, state, savedAt, session}` (forward the incoming session
   unchanged).
3. Extend the v7 state validation in `storage.ts` (`isValidCreature` and/or
   the scalar checks) so corrupt values of the new field are rejected.
4. Tests, following `save.test.ts`:
   - the full chain test (`v0 → current`) still passes unchanged;
   - a v7 fixture migrates to v8 with the new field defaulted;
   - corrupt new field → `loadGame` returns null;
   - round-trip: `saveGame` → `loadSave` equality (state + session).
5. Keep the chain ascending and never edit an existing step — old saves
   must migrate the same way forever.
