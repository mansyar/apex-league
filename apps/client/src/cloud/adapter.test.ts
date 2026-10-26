/**
 * The adapter seam (FR-5): the cloud never sits on the read path. A write
 * lands in local storage synchronously and is then handed to the push queue;
 * a failed local write must not queue anything.
 */
import { describe, expect, test } from "bun:test"
import { createMemoryAdapter, SAVE_KEY } from "@apex/sim"
import { createCloudSaveAdapter } from "./adapter"

describe("the cloud save adapter", () => {
  test("reads and removes stay purely local", () => {
    const local = createMemoryAdapter()
    local.setItem("apex.save", "{}")
    const noted: string[] = []
    const adapter = createCloudSaveAdapter(local, (payload) => {
      noted.push(payload)
    })
    expect(adapter.getItem("apex.save")).toBe("{}")
    adapter.removeItem("apex.save")
    expect(local.getItem("apex.save")).toBeNull()
    expect(noted).toEqual([])
  })

  test("a write lands locally first, then reaches the queue", () => {
    const local = createMemoryAdapter()
    const noted: string[] = []
    const adapter = createCloudSaveAdapter(local, (payload) => {
      noted.push(payload)
    })
    adapter.setItem(SAVE_KEY, "payload")
    expect(local.getItem(SAVE_KEY)).toBe("payload")
    expect(noted).toEqual(["payload"])
  })

  test("only the save key is a push candidate", () => {
    const local = createMemoryAdapter()
    const noted: string[] = []
    const adapter = createCloudSaveAdapter(local, (payload) => {
      noted.push(payload)
    })
    adapter.setItem("apex.something-else", "value")
    expect(local.getItem("apex.something-else")).toBe("value")
    expect(noted).toEqual([])
  })

  test("a failed local write never queues", () => {
    const local = createMemoryAdapter()
    const noted: string[] = []
    const adapter = createCloudSaveAdapter(
      {
        ...local,
        setItem: () => {
          throw new Error("quota")
        },
      },
      (payload) => {
        noted.push(payload)
      },
    )
    expect(() => adapter.setItem(SAVE_KEY, "payload")).toThrow("quota")
    expect(noted).toEqual([])
  })
})
