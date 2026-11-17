/**
 * The single polite live region for presentation events (FR-5, NFR-5).
 *
 * The policy half is pure — `announcementFor` and `coalesce` are plain
 * functions the bun tests drive with no DOM. The imperative half
 * (`createAnnouncer`) owns one `aria-live="polite"` element and never touches
 * focus, so a burst of verdict / KO / advancement / save events can neither
 * steal the keyboard nor spawn competing regions.
 */

/** The four event classes that earn a spoken line. */
export type AnnouncementEvent =
  | { kind: "verdict"; title: string; sub: string }
  | { kind: "ko"; name: string; hp: number }
  | { kind: "advancement"; line: string }
  | { kind: "save"; ok: boolean; action: "save" | "load" }

export interface AnnouncementOptions {
  /** Instant state dumps are silent — this beats every other option. */
  instant?: boolean
  /** Reduced motion keeps the calm wording (no exclamation flourish). */
  reducedMotion?: boolean
}

export interface Announcer {
  /** Announce one event; repeated calls settle on the latest line. */
  announce(event: AnnouncementEvent, options?: AnnouncementOptions): void
  /** Speak a ready-made sentence through the same one region. */
  say(line: string): void
}

/** Capitalize the first letter and close the sentence with a terminator. */
function sentence(text: string): string {
  const trimmed = text.trim()
  if (trimmed === "") return ""
  const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capped) ? capped : `${capped}.`
}

/**
 * The words for one event. Instant dumps return null (silent); reduced motion
 * keeps a calm variant instead of muting the line entirely.
 */
export function announcementFor(
  event: AnnouncementEvent,
  options: AnnouncementOptions = {},
): string | null {
  if (options.instant) return null
  const calm = options.reducedMotion === true
  switch (event.kind) {
    case "verdict":
      // Reduced motion drops the exclamation flourish — a calm verdict reads
      // as a statement, not a shout.
      return calm
        ? `${event.title}. ${sentence(event.sub.replace(/!/g, "."))}`
        : `${event.title}! ${sentence(event.sub)}`
    case "ko":
      return calm
        ? `${event.name} is down at ${event.hp} HP.`
        : `${event.name} is down at ${event.hp} HP!`
    case "advancement":
      // The results plate joins the name and detail with a middot; a screen
      // reader should hear a comma, not a punctuation glyph.
      return sentence(event.line.replace(/\s*·\s*/g, ", "))
    case "save":
      if (event.action === "save") {
        return event.ok
          ? "Progress saved."
          : "Progress did not save. Try again."
      }
      return event.ok ? "Save loaded." : "Save could not be loaded. Try again."
  }
}

/**
 * Collapse a burst of candidate lines into the one worth speaking: the last
 * non-null entry. Silent entries (instant dumps) never win.
 */
export function coalesce(lines: ReadonlyArray<string | null>): string | null {
  let latest: string | null = null
  for (const line of lines) {
    if (line !== null) latest = line
  }
  return latest
}

/**
 * A thin imperative wrapper: one region, created on first speak and appended
 * once. DOM failures are swallowed; focus is never read or written.
 */
export function createAnnouncer(root: HTMLElement): Announcer {
  let region: HTMLElement | null = null
  let last: string | null = null

  const speak = (line: string): void => {
    // Coalescing: an identical repeat of the current line is not news.
    if (line === "" || line === last) return
    try {
      if (region === null) {
        region = document.createElement("div")
        region.className = "ui-announcer"
        region.setAttribute("aria-live", "polite")
        region.setAttribute("aria-atomic", "true")
        root.append(region)
      }
      region.textContent = line
      last = line
    } catch {
      // A broken DOM must never break the game loop.
    }
  }

  return {
    announce(event, options) {
      const line = announcementFor(event, options)
      if (line !== null) speak(line)
    },
    say: speak,
  }
}

let shared: Announcer | null = null

/** The app-wide announcer: one region mounted once on the body. */
export function announcer(): Announcer {
  if (shared === null) shared = createAnnouncer(document.body)
  return shared
}
