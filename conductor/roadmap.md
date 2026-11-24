# Conductor Roadmap

<!-- next-rm-id: 5 -->

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
| RM-4 | Document persisted Creature element and bondedToday fields | chore | medium | — | — | user |

## Next

| id | title | type | priority | depends_on | track | origin |
| --- | --- | --- | --- | --- | --- | --- |
| RM-1 | Decide whether to tolerate cadence resonance or authorize a controller-family change | chore | medium | 20261124-controller-cadence-resonance-diagnostic | — | user |

## Later

| id | title | type | priority | depends_on | track | origin |
| --- | --- | --- | --- | --- | --- | --- |
| RM-2 | Complete the hardware device-lab verification pass | chore | medium | — | — | user |
| RM-3 | Harden thin species band margins only if relative-matrix drift breaks a row | chore | low | — | — | user |

## Dropped

| id | title | reason |
| --- | --- | --- |
