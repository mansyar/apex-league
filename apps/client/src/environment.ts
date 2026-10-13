/**
 * Shared environment palette constants.
 *
 * Lives outside `scene.ts` so modules that describe the *other* view
 * (arena fog blending) can reference the ranch's horizon tone without
 * importing from the ranch scene module — the dependency now points the
 * right way (consumers → palette, never arena → scene).
 */

/**
 * Ranch horizon tone (golden hour, dusk amber pooling at the horizon).
 * One half of the ranch↔arena fog blend; retune together with the
 * arena's navy, never one alone.
 */
export const RANCH_SKY = 0xd98c4a
