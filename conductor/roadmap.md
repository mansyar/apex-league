# Conductor Roadmap

<!-- next-rm-id: 18 -->

> Planned and future work. The roadmap stores **intent** — ordering, priority,
> and dependencies — not live state. `conductor-status` joins every entry whose
> `track` column is filled to that track's real metadata and registry state, so
> this file never has to be kept in sync by hand. Reorder rows within a bucket
> to set sequence. The roadmap is forward-looking: when a track completes, the
> completion commit removes its row — there is no Done bucket. Abandoned tracks
> move to `Dropped` with an `abandoned after <track-id>` reason. Use
> `conductor-roadmap` to add, refine, promote, or drop items; do not hand-edit
> the `id` or `track` columns.

## Now

| id | title | type | priority | depends_on | track | origin |
| --- | --- | --- | --- | --- | --- | --- |

## Next

| id | title | type | priority | depends_on | track | origin |
| --- | --- | --- | --- | --- | --- | --- |
| RM-13 | Fix HUD pointer interception and isolate modal input across desktop and mobile | bug | high | — | — | user |
| RM-14 | Improve arena camera, lighting, and fighter readability on desktop and mobile | feature | high | — | — | user |
| RM-15 | Streamline spar setup with an explicit start action and stable mobile scrolling | refactor | high | RM-13 | — | user |
| RM-16 | Rework mobile ranch hierarchy and make action state, costs, and disabled reasons explicit | refactor | high | RM-13 | — | user |
| RM-17 | Reduce repetitive battle-log noise and add pause/replay playback controls | feature | medium | — | — | user |

## Later

| id | title | type | priority | depends_on | track | origin |
| --- | --- | --- | --- | --- | --- | --- |
| RM-2 | Complete the hardware device-lab verification pass | chore | medium | — | — | user |
| RM-9 | Continue roster expansion toward the 20–40 species vision | feature | medium | — | — | user |
| RM-3 | Harden thin species band margins only if relative-matrix drift breaks a row | chore | low | — | — | user |

## Dropped

| id | title | reason |
| --- | --- | --- |
| RM-1 | Decide whether to tolerate cadence resonance or authorize a controller-family change | resolved: owner accepts O0 tolerate under AC-11; no controller change authorized |
