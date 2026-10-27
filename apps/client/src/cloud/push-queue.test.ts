import { describe, expect, test } from "bun:test"
import { createPushQueue } from "./push-queue"

function rig() {
  const sent: string[] = []
  const fns: Array<() => void> = []
  const queue = createPushQueue({
    send: (payload) => {
      sent.push(payload)
    },
    schedule: (fn) => {
      fns.push(fn)
      return fns.length - 1
    },
    cancel: (handle) => {
      const at = handle as number
      if (fns[at]) fns[at] = () => {}
    },
  })
  return { queue, sent }
}

describe("push-queue pending()", () => {
  test("idle queue reports zero", () => {
    expect(rig().queue.pending()).toBe(0)
  })

  test("a noted write reports one until flushed", () => {
    const { queue, sent } = rig()
    queue.note("payload-a")
    expect(queue.pending()).toBe(1)
    queue.flush()
    expect(queue.pending()).toBe(0)
    expect(sent).toEqual(["payload-a"])
  })

  test("burst rewrites still count as one waiting payload", () => {
    const { queue } = rig()
    queue.note("payload-a")
    queue.note("payload-b")
    expect(queue.pending()).toBe(1)
  })
})
