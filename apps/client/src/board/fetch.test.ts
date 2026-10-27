/**
 * Fetch-on-open for the four boards (FR-6, AC-5): a full answer goes live
 * and becomes the new last-good snapshot; any failure falls back to that
 * snapshot whole, or reports unavailable when none was ever written.
 */
import { describe, expect, test } from "bun:test"
import { createMemoryAdapter } from "@apex/sim"
import type {
  ApiResult,
  BoardPayload,
  CloudApi,
  ScoreCategory,
} from "../cloud/api"
import { createBoardLoader } from "./fetch"
import { type CategoryBoards, readBoardSnapshot } from "./snapshot"

function boards(): CategoryBoards {
  return {
    cups: [{ rank: 1, trainerId: "trn_abc", name: "Ada", value: 3 }],
    ladder: [{ rank: 1, trainerId: "trn_def", name: "Bea", value: 7 }],
    ap: [],
    collection: [{ rank: 1, trainerId: "trn_abc", name: "Ada", value: 5 }],
  }
}

type BoardReader = Pick<CloudApi, "readBoard">

function liveApi(
  over: Partial<Record<ScoreCategory, ApiResult<BoardPayload>>> = {},
): BoardReader {
  const fresh = boards()
  const answers: Record<ScoreCategory, ApiResult<BoardPayload>> = {
    cups: { ok: true, value: { category: "cups", entries: fresh.cups } },
    ladder: { ok: true, value: { category: "ladder", entries: fresh.ladder } },
    ap: { ok: true, value: { category: "ap", entries: fresh.ap } },
    collection: {
      ok: true,
      value: { category: "collection", entries: fresh.collection },
    },
  }
  return {
    readBoard: async (category) => over[category] ?? answers[category],
  }
}

describe("board fetch-on-open", () => {
  test("all four boards answer: live, and the snapshot moves", () => {
    const storage = createMemoryAdapter()
    const loader = createBoardLoader({
      api: liveApi(),
      storage,
      now: () => 99,
    })
    return loader.load().then((result) => {
      expect(result).toEqual({ kind: "live", boards: boards() })
      expect(readBoardSnapshot(storage)).toEqual({
        boards: boards(),
        fetchedAt: 99,
      })
    })
  })

  test("an unreachable server falls back to the last snapshot whole", () => {
    const storage = createMemoryAdapter()
    const first = createBoardLoader({ api: liveApi(), storage, now: () => 1 })
    return first
      .load()
      .then(() => {
        const offline: Pick<CloudApi, "readBoard"> = {
          readBoard: async () => ({ ok: false, reason: "offline" }),
        }
        const loader = createBoardLoader({
          api: offline,
          storage,
          now: () => 2,
        })
        return loader.load()
      })
      .then((result) => {
        expect(result).toEqual({ kind: "snapshot", boards: boards() })
        // The failed visit never overwrites the last good one.
        expect(readBoardSnapshot(storage)?.fetchedAt).toBe(1)
      })
  })

  test("no snapshot and no server: unavailable, never a throw", () => {
    const offline: Pick<CloudApi, "readBoard"> = {
      readBoard: async () => ({ ok: false, reason: "offline" }),
    }
    const loader = createBoardLoader({
      api: offline,
      storage: createMemoryAdapter(),
      now: () => 1,
    })
    return loader.load().then((result) => {
      expect(result).toEqual({ kind: "unavailable" })
    })
  })

  test("one bad category falls back whole — never a mix of fresh and stale", () => {
    const storage = createMemoryAdapter()
    const first = createBoardLoader({ api: liveApi(), storage, now: () => 1 })
    return first
      .load()
      .then(() => {
        const partial = liveApi({
          ladder: { ok: false, reason: "rejected", error: "invalid_category" },
        })
        const loader = createBoardLoader({
          api: partial,
          storage,
          now: () => 2,
        })
        return loader.load()
      })
      .then((result) => {
        expect(result).toEqual({ kind: "snapshot", boards: boards() })
      })
  })

  test("a body that is not a board falls back, never paints shape", () => {
    const storage = createMemoryAdapter()
    const first = createBoardLoader({ api: liveApi(), storage, now: () => 1 })
    return first
      .load()
      .then(() => {
        const malformed = liveApi({
          cups: {
            ok: true,
            value: { category: "cups", entries: "nope" },
          } as unknown as ApiResult<BoardPayload>,
        })
        const loader = createBoardLoader({
          api: malformed,
          storage,
          now: () => 2,
        })
        return loader.load()
      })
      .then((result) => {
        expect(result).toEqual({ kind: "snapshot", boards: boards() })
      })
  })
})
