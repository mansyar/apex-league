/**
 * Shared shape of every archetype's SDF assembly output. Lives in its own
 * module (not archetype.ts) because archetypes import it while the registry
 * imports the archetypes — a definition there would be circular.
 */
import type { PartField } from "./voxelizer"

export interface CreatureBuild {
  fields: PartField[]
  pivots: Record<string, [number, number, number]>
  colors: Record<string, [number, number, number]>
  /**
   * Rig parentage: child part name -> parent part name. Animating a parent
   * must carry its children (head bob carries horns, body breath carries the
   * tail), so renderers reparent meshes along these edges.
   */
  parents: Record<string, string>
}
