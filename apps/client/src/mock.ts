/**
 * Design mock driver (broadcast_hud_20261011): rebuilds the approved mock
 * entirely from production code — the hud.ts cluster builders fed canned
 * values, the ui/kit primitives, and the real ranch.css surface styles.
 * Structural drift with the live HUD is impossible by construction: the
 * mock renders the same DOM the game does. mock.css holds only page
 * chrome, the stage scenery, and showcase layout.
 *
 * mock_modules split: the canned data lives in ./mock/data, the page sections
 * in ./mock/sections and the kit grid in ./mock/showcase. This file keeps the
 * stylesheet order and the single body.append that mock.html boots.
 */

import "./ui/kit.css"
import "./ranch.css"
// spar.css owns the camera-chip visibility rule (ranch hides it; the
// arena shows it) — importing it keeps the pill row identical to live.
import "./spar.css"
import "./mock.css"
import {
  buildHeader,
  buildNotes,
  buildResponsiveSection,
  buildStage,
  buildStarterSection,
} from "./mock/sections"
import { buildShowcase } from "./mock/showcase"

const header = buildHeader()
const stage = buildStage(header.motionBox)

document.body.append(
  header.root,
  stage,
  buildShowcase(),
  buildStarterSection(),
  buildResponsiveSection(),
  buildNotes(),
)
