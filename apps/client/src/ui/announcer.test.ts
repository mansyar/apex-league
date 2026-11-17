/**
 * The announcer's policy is pure — these tests need no DOM. The one
 * imperative test uses a minimal fake element in the same spirit as
 * `board/panel.test.ts` to pin the single-region / no-focus contract.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  type AnnouncementEvent,
  announcementFor,
  coalesce,
  createAnnouncer,
  resultsAnnouncement,
} from "./announcer"

const VERDICT: AnnouncementEvent = {
  kind: "verdict",
  title: "Champion",
  sub: "Pip takes the Bronze Cup!",
}
const KO: AnnouncementEvent = { kind: "ko", name: "Reed", hp: 0 }
const ADVANCEMENT: AnnouncementEvent = {
  kind: "advancement",
  line: "Pip · unbeaten through three rounds",
}
const SAVE_OK: AnnouncementEvent = { kind: "save", ok: true, action: "save" }
const SAVE_FAIL: AnnouncementEvent = {
  kind: "save",
  ok: false,
  action: "save",
}

const EVENTS: AnnouncementEvent[] = [
  VERDICT,
  KO,
  ADVANCEMENT,
  SAVE_OK,
  SAVE_FAIL,
]

/** Count sentence terminators — the copy rule caps this at two. */
const sentences = (line: string): number => (line.match(/[.!?]/g) ?? []).length

describe("announcementFor — the four event classes (FR-5, FR-7)", () => {
  test("every class yields one to two short plain sentences", () => {
    for (const event of EVENTS) {
      const line = announcementFor(event)
      expect(line).not.toBeNull()
      expect(sentences(line ?? "")).toBeGreaterThanOrEqual(1)
      expect(sentences(line ?? "")).toBeLessThanOrEqual(2)
      expect((line ?? "").length).toBeLessThanOrEqual(80)
    }
  })

  test("capitalizes creature names", () => {
    expect(announcementFor(VERDICT)).toContain("Pip")
    expect(announcementFor(KO)).toContain("Reed")
    expect(announcementFor(ADVANCEMENT)).toContain("Pip")
  })

  test("names the stat and the number where relevant", () => {
    const ko = announcementFor(KO) ?? ""
    expect(ko).toContain("HP")
    expect(ko).toMatch(/\d/)
  })

  test("never uses death language for graduation/retirement", () => {
    const all = EVENTS.map((e) => announcementFor(e) ?? "").join(" ")
    expect(all).not.toMatch(/\b(die|dies|died|death|dead|kill|killed)\b/i)
  })

  test("an instant dump is silent for every class", () => {
    for (const event of EVENTS) {
      expect(announcementFor(event, { instant: true })).toBeNull()
    }
  })

  test("reduced motion keeps a calm wording (no exclamation)", () => {
    for (const event of EVENTS) {
      const line = announcementFor(event, { reducedMotion: true }) ?? ""
      expect(line).not.toContain("!")
      expect(line.length).toBeGreaterThan(0)
    }
  })

  test("the middot in an advancement line is spoken as a comma", () => {
    expect(announcementFor(ADVANCEMENT)).toContain(", ")
    expect(announcementFor(ADVANCEMENT)).not.toContain("·")
  })
})

describe("coalesce — a burst settles on one line (NFR-5)", () => {
  test("the last non-null line wins", () => {
    expect(coalesce(["a", "b", "c"])).toBe("c")
  })

  test("silent entries never displace the latest spoken line", () => {
    expect(coalesce(["a", null])).toBe("a")
    expect(coalesce([null, null])).toBeNull()
  })
})

describe("resultsAnnouncement — one perceivable results line (F1)", () => {
  const verdict = { title: "Champion", sub: "Pip takes the Bronze Cup!" }
  const advancement = { line: "Pip · unbeaten through three rounds" }

  test("the one line carries both the verdict and the advancement", () => {
    const line = resultsAnnouncement(verdict, advancement) ?? ""
    expect(line).toContain(verdict.title)
    expect(line).toContain("Bronze Cup")
    expect(line).toContain("unbeaten through three rounds")
    expect(line).not.toContain("·")
  })

  test("an instant dump is silent", () => {
    expect(
      resultsAnnouncement(verdict, advancement, { instant: true }),
    ).toBeNull()
  })

  test("reduced motion keeps both parts calm", () => {
    const line =
      resultsAnnouncement(verdict, advancement, { reducedMotion: true }) ?? ""
    expect(line).toContain(verdict.title)
    expect(line).toContain("unbeaten through three rounds")
    expect(line).not.toContain("!")
  })
})

/** Minimal fake element: enough for createAnnouncer's one-region contract. */
class FakeElement {
  readonly children: FakeElement[] = []
  readonly attributes = new Map<string, string>()
  textContent = ""
  className = ""
  focusCalls = 0

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }

  append(child: FakeElement): void {
    this.children.push(child)
  }

  focus(): void {
    this.focusCalls += 1
  }
}

describe("createAnnouncer — one region, no focus theft (AC-5)", () => {
  const realDocument = globalThis.document
  beforeAll(() => {
    globalThis.document = {
      createElement: () => new FakeElement(),
    } as unknown as Document
  })
  afterAll(() => {
    globalThis.document = realDocument
  })

  test("appends exactly one polite, atomic region", () => {
    const root = new FakeElement()
    const a = createAnnouncer(root as unknown as HTMLElement)
    a.announce(VERDICT)
    a.announce(KO)
    expect(root.children).toHaveLength(1)
    const region = root.children[0]
    expect(region).toBeDefined()
    expect(region?.attributes.get("aria-live")).toBe("polite")
    expect(region?.attributes.get("aria-atomic")).toBe("true")
    expect(region?.focusCalls).toBe(0)
  })

  test("repeated calls coalesce to the latest line", () => {
    const root = new FakeElement()
    const a = createAnnouncer(root as unknown as HTMLElement)
    a.announce(VERDICT)
    a.announce(KO)
    expect(root.children[0]?.textContent).toBe(announcementFor(KO) ?? "")
  })

  test("an instant event does not create or change the region", () => {
    const root = new FakeElement()
    const a = createAnnouncer(root as unknown as HTMLElement)
    a.announce(VERDICT, { instant: true })
    expect(root.children).toHaveLength(0)
  })

  test("speaking the combined results line once leaves both parts perceivable", () => {
    const root = new FakeElement()
    const a = createAnnouncer(root as unknown as HTMLElement)
    const line =
      resultsAnnouncement(
        { title: "Champion", sub: "Pip takes the Bronze Cup!" },
        { line: "Pip · unbeaten through three rounds" },
      ) ?? ""
    a.say(line)
    expect(root.children).toHaveLength(1)
    expect(root.children[0]?.textContent).toBe(line)
    expect(root.children[0]?.textContent).toContain("Bronze Cup")
    expect(root.children[0]?.textContent).toContain(
      "unbeaten through three rounds",
    )
    expect(root.children[0]?.focusCalls).toBe(0)
  })
})
