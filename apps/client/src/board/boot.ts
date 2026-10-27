/**
 * The boards behind one boot line (ghost FR-4, AC-4): the four score boards
 * plus the ghost champions beside them. A null cloud means a local-only
 * build, which gets no board at all — the score boards stand or fall
 * together with the ghosts. A Fight opens a local-only spar bout through
 * the board's own modal close.
 */
import type { SaveAdapter } from "@apex/sim"
import type { CloudApi } from "../cloud/api"
import { createGhostBoardLoader } from "../cloud/ghosts"
import { createBoardLoader } from "./fetch"
import { type BoardPanel, buildBoardPanel } from "./panel"

export function bootBoardsPanel(deps: {
  cloud: { api: Pick<CloudApi, "readBoard" | "readGhosts"> } | null
  storage: SaveAdapter
  now: () => number
  onFight: (ghost: unknown) => boolean
}): BoardPanel | null {
  if (deps.cloud === null) return null
  const boardLoad = createBoardLoader({
    api: deps.cloud.api,
    storage: deps.storage,
    now: deps.now,
  })
  const ghostLoad = createGhostBoardLoader({
    api: deps.cloud.api,
    storage: deps.storage,
    now: deps.now,
  })
  return buildBoardPanel({
    load: () => boardLoad.load(),
    ghosts: {
      load: () => ghostLoad.load(),
      onFight: (entry) => deps.onFight(entry.ghost),
    },
  })
}
