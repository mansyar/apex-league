/**
 * One structurally-valid ghost bundle for tests. Hand-built, never imported
 * from the sim: the server owns only the shape contract (see `caps.ts`), so
 * the fixture pins that contract without coupling the server suite to sim
 * resolution. Every test clones what it mutates — the factory returns a fresh
 * object per call.
 */
export function validGhostBundle(): Record<string, unknown> {
  const side = (name: string, kit: string[]): Record<string, unknown> => ({
    name,
    element: "fire",
    stats: { hp: 120, atk: 30, def: 20, spd: 25 },
    kit,
    tactic: "balanced",
    temperament: "bold",
  })
  return {
    simVersion: 1,
    seed: 12345,
    day: 7,
    round: 3,
    player: side("Ember Drake", ["pyre_strike", "cinder_guard"]),
    rival: side("Rival Drake", ["ash_burst", "smoke_veil"]),
    winner: "Ember Drake",
    events: [
      {
        tick: 1,
        kind: "launch",
        actor: "Ember Drake",
        moveId: "pyre_strike",
        hpAfter: { player: 120, rival: 98 },
        line: "Ember Drake launches pyre strike!",
      },
      {
        tick: 2,
        kind: "impact",
        actor: "Ember Drake",
        target: "Rival Drake",
        moveId: "pyre_strike",
        damage: 22,
        hit: true,
        hpAfter: { player: 120, rival: 76 },
        line: "It lands for 22 damage.",
      },
    ],
  }
}
