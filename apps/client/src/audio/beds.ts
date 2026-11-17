/**
 * The scene → music-bed table (audio_foundation_20261017 FR4). Three CC0
 * loops bundled under `public/audio/music` (see CREDITS.md): the ranch
 * care loop for day-phase play, the arena loop for battles/cups and the
 * cup loop for the cup run (20261117-polish-showcase FR-2).
 */

/** The scenes a bed exists for. */
export type BedScene = "ranch" | "arena" | "cup"

/** Every bed scene, listed so the URL table can be checked for completeness. */
export const BED_SCENES: readonly BedScene[] = [
  "ranch",
  "arena",
  "cup",
] as const

/** Bed scene → the Vite-served path of its bundled loop. */
export const bedUrl: Record<BedScene, string> = {
  ranch: "/audio/music/ranch.ogg",
  arena: "/audio/music/arena.ogg",
  cup: "/audio/music/cup.ogg",
}
