# Review — 20261111-roster-retune

## Round 1: BLOCK (3 High/Medium)

- F1 High: plant_ox 44.6% point-outside the printed band.
- F2 Medium: out-of-band guardrail unverified for assumption rows.
- F3 Medium: galeheron/cindermoor edge margins with no buffer.
- Phase R1 closed all three: ox 46.4% via the voltfox-trim keystone
  (direct levers overshoot +10..+12.5/se, E-state breaks two rows),
  row-by-row guardrail table (voltfox excursion closed by trim),
  margin regression test + three waivers pinned in spec Assumptions.
  Design-band misses 4 → 1 ([water_axolotl] 57.1%, waived).

## Round 2: PASS WITH FINDINGS (3 Low, all closed by primary)

- F1 Low: voltfox 45.5% excluded from the margin test → added to the
  test pinned to inside-only with a comment (0.5pt margin, thinner than
  the 1pt standard; crossings fail via DESIGN_BAND_MISSES).
- F2 Low: hardcoded 0.46/0.54 → exported SPECIES_MIN/SPECIES_MAX from
  the report script; test asserts MIN+0.01/MAX-0.01.
- F3 Low: water waiver mislabeled AC-1 → reworded to AC-5/AC-6.
- Commit `0318410b`; all four commands re-run green at head:
  verify 3988/0, build 0, balance 0 (misses [water_axolotl] only),
  telemetry 13/13 (cap 7/14 at bound).

No bound, floor, tolerance, or DISTINCT_FLOOR changed in either round.
No `test.failing` conversion. Gate honest and green; roster inside the
printed band except the one named, waived exception.
