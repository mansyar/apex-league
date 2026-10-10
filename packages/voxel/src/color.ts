/**
 * Shared palette color helpers for the voxel DNA generator.
 *
 * Every archetype builder (drake, bovine, axolotl) and the ranch prop
 * registry pick palette colors from hsl coordinates — hue in degrees,
 * saturation/lightness in [0, 1]. One canonical implementation lives here
 * so future palette tuning has a single function to touch.
 */

/** hue in degrees [0, 360), s/l in [0, 1]. */
export function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const seg = Math.floor(hp)
  const rgb: [number, number, number] =
    seg === 0
      ? [c, x, 0]
      : seg === 1
        ? [x, c, 0]
        : seg === 2
          ? [0, c, x]
          : seg === 3
            ? [0, x, c]
            : seg === 4
              ? [x, 0, c]
              : [c, 0, x]
  const m = l - c / 2
  return [
    Math.min(1, Math.max(0, rgb[0] + m)),
    Math.min(1, Math.max(0, rgb[1] + m)),
    Math.min(1, Math.max(0, rgb[2] + m)),
  ]
}
