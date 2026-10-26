/**
 * The wire (FR-4, FR-5, NFR-3): push carries the passphrase in the body,
 * pull in a header — never in a URL, which every proxy on the way records.
 * The timeout is the caller's, injected so these tests leave no timer behind.
 */
import { describe, expect, test } from "bun:test"
import { type ApiFailure, createCloudApi, type FetchLike } from "./api"

interface Captured {
  url: string
  init: RequestInit | undefined
}

function recordingFetch(
  status: number,
  body: unknown,
): { fetch: FetchLike; seen: Captured[] } {
  const seen: Captured[] = []
  return {
    seen,
    fetch: async (url, init) => {
      seen.push({ url, init })
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      })
    },
  }
}

function apiOver(fetch: FetchLike) {
  let signals = 0
  return {
    signals: () => signals,
    api: createCloudApi({
      origin: "https://api.example.test",
      fetch,
      signal: () => {
        signals++
        return undefined
      },
    }),
  }
}

describe("the cloud api", () => {
  test("push sends the passphrase in the body, never the url", async () => {
    const { fetch, seen } = recordingFetch(200, { stored: true, winner: 7 })
    const { api } = apiOver(fetch)
    const result = await api.push("trn_abc", "kestrel-42", "{}", 7)
    expect(result).toEqual({ ok: true, value: { stored: true, winner: 7 } })
    const call = seen[0]
    expect(call?.url).toBe("https://api.example.test/trainers/trn_abc/save")
    expect(call?.init?.method).toBe("PUT")
    expect(call?.url).not.toContain("kestrel-42")
    expect(JSON.parse(String(call?.init?.body))).toEqual({
      passphrase: "kestrel-42",
      payload: "{}",
      savedAt: 7,
    })
  })

  test("pull sends the passphrase as a header, never the url", async () => {
    const { fetch, seen } = recordingFetch(200, { payload: "{}", savedAt: 7 })
    const { api } = apiOver(fetch)
    const result = await api.pull("trn_abc", "kestrel-42")
    expect(result).toEqual({ ok: true, value: { payload: "{}", savedAt: 7 } })
    const call = seen[0]
    expect(call?.url).toBe("https://api.example.test/trainers/trn_abc/save")
    expect(call?.url).not.toContain("kestrel-42")
    const headers = new Headers(call?.init?.headers)
    expect(headers.get("x-trainer-passphrase")).toBe("kestrel-42")
  })

  test("every request asks for the five-second abort signal", async () => {
    const { fetch } = recordingFetch(201, { id: "trn_new" })
    const { api, signals } = apiOver(fetch)
    await api.createTrainer()
    expect(signals()).toBe(1)
  })

  test("an unreachable server is offline, not an exception", async () => {
    const { api } = apiOver(async () => {
      throw new Error("connect ECONNREFUSED")
    })
    expect(await api.pull("trn_abc", "kestrel-42")).toEqual({
      ok: false,
      reason: "offline",
    })
  })

  test("a body that is not json is still a response", async () => {
    const { api } = apiOver(async () => new Response("<html>", { status: 502 }))
    expect(await api.pull("trn_abc", "kestrel-42")).toEqual({
      ok: false,
      reason: "rejected",
    })
  })

  test("status codes map to the refusals the sync reasons about", async () => {
    const cases: Array<[number, unknown, ApiFailure, string]> = [
      [401, { error: "wrong_passphrase" }, "unauthorized", "wrong_passphrase"],
      [404, { error: "save_not_found" }, "not-found", "save_not_found"],
      [404, { error: "trainer_not_found" }, "not-found", "trainer_not_found"],
      [
        409,
        { error: "passphrase_required" },
        "conflict",
        "passphrase_required",
      ],
      [413, { error: "payload_too_large" }, "rejected", "payload_too_large"],
    ]
    for (const [status, body, reason, error] of cases) {
      const { fetch } = recordingFetch(status, body)
      const { api } = apiOver(fetch)
      expect(await api.pull("trn_abc", "kestrel-42")).toEqual({
        ok: false,
        reason,
        error,
      })
    }
  })

  test("trainer calls name their fields", async () => {
    const { fetch, seen } = recordingFetch(200, {
      id: "trn_abc",
      name: "Ana",
      hasPassphrase: true,
    })
    const { api } = apiOver(fetch)
    await api.updateTrainer("trn_abc", {
      name: "Ana",
      passphrase: "kestrel-42",
    })
    expect(seen[0]?.init?.method).toBe("PUT")
    expect(JSON.parse(String(seen[0]?.init?.body))).toEqual({
      name: "Ana",
      passphrase: "kestrel-42",
    })
  })

  test("a trainer id is url-encoded, not trusted", async () => {
    const { fetch, seen } = recordingFetch(404, { error: "trainer_not_found" })
    const { api } = apiOver(fetch)
    await api.getTrainer("trn/../x")
    expect(seen[0]?.url).toBe("https://api.example.test/trainers/trn%2F..%2Fx")
  })
})
