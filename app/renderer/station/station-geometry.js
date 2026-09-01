/**
 * station-geometry — the arithmetic behind the Observatory.
 *
 * THE ONE IDEA: the instruments are bolted to YOU; the room is beyond them.
 * Only `.st-beyond-world` yaws.
 *
 * Everything about door positioning lives HERE so the key handler, the render
 * and any test agree by construction rather than by someone remembering.
 * Pure functions, zero imports.
 */

/**
 * The doors.
 *
 * `angle` is where the door stands on the ring, in degrees.
 *
 * ⚠️ POSITIVE ANGLE RENDERS TO THE LEFT (see SCREEN_SIGN). The array therefore
 * ascends by angle, which means index rises RIGHT-TO-LEFT on screen. Read the
 * comment column, not the array order, to know where a door appears.
 *
 * ±75 across six doors, so 30° apart. The handoff specified ±62 — but that was
 * for FIVE doors. At six, ±62 puts the arches 197px apart on screen while each
 * one renders 201px wide, and every door clips its neighbour. The spread is a
 * function of how many doors there are, never a constant to copy across.
 * `tightestDoorGap()` asserts it; do not tune these by eye.
 *
 * ⚠️ Do not narrow the spacing below about 25°. Tighter and the middle doors
 * cluster behind the globe, and the single most important fact on screen —
 * "where does ↑ take me" — becomes the thing the globe is standing in front of.
 *
 * `built` is the TRUTH about the app, not a wish. An unbuilt door renders
 * sealed and refuses to open, because a door that opens onto nothing teaches
 * the user to distrust the other four.
 *
 * `view` is the id of the existing flat tab this door opens onto.
 */
// ⚠️ PROPERLY CASED, on operator instruction 2026-08-29 ("it looks hella unprofessional"). Peter's
// original handoff wrote every label/blurb lowercase and the CSS forced it lowercase again on top
// (`.st-portal-plate`) — both are gone now. Write these the way you'd write a real UI string.
export const DOORS = [
  //                                                          screen position →
  { id: 'sector',  view: 'sector',  label: "What's Happening", angle: -84.0, built: true,  blurb: 'The sector, and what moved it',         tag: 'SEC' },
  { id: 'journal', view: 'journal', label: 'The Journal',      angle: -56.0, built: true,  blurb: 'What you decided, and whether it held', tag: 'LOG' },
  { id: 'market',  view: 'market',  label: 'The Market',       angle: -28.0, built: true,  blurb: 'Everything the scanner has found',      tag: 'MKT' },
  { id: 'watch',   view: 'watch',   label: 'Your Coins',       angle:   0.0, built: true,  blurb: 'What you are holding and tracking',     tag: 'WCH' },
  { id: 'folio',   view: 'folio',   label: 'The Portfolio',    angle:  28.0, built: true,  blurb: 'What you hold, across both venues',     tag: 'FOL' },
  // ! axiom's door opens onto a real room, but NOT onto an embedded Axiom: the venue answers 404
  // to anything that is not a real browser (measured -- Electron UA 404, Chrome UA 200), which is
  // a deliberate anti-phishing defence for a trading site. The room explains that and launches the
  // system browser instead of defeating it. See main/venues.js.
  { id: 'fomo',    view: 'fomo',    label: 'FOMO',             angle:  56.0, built: true,  blurb: 'The venue, live',                       tag: 'FMO' },
  { id: 'axiom',   view: 'axiom',   label: 'Axiom',            angle:  84.0, built: true,  blurb: 'Opens in your browser',                 tag: 'AXM' },
]

/** Where you land when the room opens. Not simply "the first built door" —
 *  the app's own default view is the watchlist, and arriving somewhere else
 *  would be a silent change of behaviour. */
export const HOME_DOOR = 'watch'

/** Ring radius in px. Must match `translateZ(-RING)` in the render. */
export const RING = 980

/**
 * Which way a door moves on the glass when its angle goes UP. **−1: left.**
 *
 * ⚠️ THIS CONSTANT EXISTS BECAUSE THE FACT KEEPS GETTING WRITTEN DOWN AND THEN
 * NOT USED. The ring sits at negative z, so `rotateY(θ) translateZ(-R)` puts a
 * door at `x = -R·sin(θ)` — a POSITIVE angle renders to the LEFT. A key handler
 * that steps the array index directly walks the selection the wrong way, and
 * the bug reads as "the arrow keys are backwards, lol".
 *
 * Prose cannot be called. This can.
 */
export const SCREEN_SIGN = -1

/** Where the door you face comes to rest, in degrees right of centre.
 *  ZERO. Turning to face something has to put it in front of you or the word
 *  means nothing. The globe standing in the way is solved in the NEAR FIELD —
 *  it thins to a ghost while you navigate — not by parking the door off-axis. */
export const FACING_OFFSET = 0

/** How long the room's yaw takes.
 *  ⚠️ THIS NUMBER LIVES HERE AND IN `--st-turn`. They must agree, or the smear
 *  outlives the turn it is smearing — a streak sitting over a stopped room,
 *  which reads as a rendering fault rather than as speed. */
export const TURN_MS = 300

/** How long the globe stays yielded after the last turn.
 *  ⚠️ Barely longer than the motion, never comfortably longer. Shipped at
 *  2200ms against a 420ms turn elsewhere, a fix for occlusion read as the
 *  object being broken. */
export const NAVIGATING_MS = 520

/** How long walking through a door takes. Must agree with `--st-travel`. */
export const TRAVEL_MS = 320

function clampIndex(i) {
  return Math.max(0, Math.min(DOORS.length - 1, i | 0))
}

/** Turning to face a door yaws the ROOM so that door lands at FACING_OFFSET.
 *  A FIXED landing spot, not a fraction of the angle — a proportional turn puts
 *  each door in a different place, and "the door I am facing" then means
 *  nothing. */
export function yawFor(index) {
  return -DOORS[clampIndex(index)].angle + FACING_OFFSET
}

/** How far a door is off your current heading, in degrees. Zero when square.
 *  This is what drives the parallax inside the doorway (`--st-off`). */
export function offsetFor(doorIndex, facingIndex) {
  return DOORS[clampIndex(doorIndex)].angle + yawFor(facingIndex)
}

/** Where a door lands on the glass, −1 (left edge) to +1 (right edge).
 *  This is the projection the CSS actually performs, written once — so a test
 *  can assert which way `→` goes against the GEOMETRY rather than a comment. */
export function screenX(doorIndex, facingIndex) {
  const rad = (offsetFor(doorIndex, facingIndex) * Math.PI) / 180
  return SCREEN_SIGN * Math.sin(rad)
}

/** Is this door within a sane angle of your heading?
 *  Anything past ~85° has POSITIVE z — it has passed the camera plane — and
 *  re-projects at enormous scale. With six doors spanning ±62 the maximum
 *  offset is 124°, so this happens every time you turn to an outermost door.
 *  Cheaper to hide than to clip. Hidden, never unmounted: a door that unmounts
 *  cannot animate back in. */
export function doorVisible(doorIndex, facingIndex) {
  return Math.abs(offsetFor(doorIndex, facingIndex)) < 85
}

/** Step to the next door, CLAMPED rather than wrapped.
 *  A room's walls are not a cycle — they have ends, and walking into the left
 *  wall should stop you, not teleport you to the right one. Wrapping means
 *  pressing ← at the leftmost door spins the room 124° in one frame, which
 *  reads as a glitch. */
export function stepDoor(index, delta) {
  return Math.max(0, Math.min(DOORS.length - 1, (index | 0) + delta))
}

/** Step in the direction the KEY points, not the direction the array runs.
 *  `screenDelta` is +1 for →, −1 for ←. Every caller holding a key event uses
 *  THIS. `stepDoor` is the array-space primitive underneath and is only correct
 *  when you genuinely mean "the next element". The reversed-arrows bug is one
 *  function reaching for the primitive when it meant the intention. */
export function stepDoorScreen(index, screenDelta) {
  return stepDoor(index, SCREEN_SIGN * (screenDelta | 0))
}

/** How far the star field pans, in px, for a given heading. Stars are at
 *  infinity, so this is small and linear — a large value reads as the sky
 *  sliding, which is worse than no parallax at all. */
export function starPan(facingIndex) {
  return -yawFor(facingIndex) * 1.6
}

/** Index of the door you land on. */
export function homeIndex() {
  const i = DOORS.findIndex((d) => d.id === HOME_DOOR && d.built)
  return i >= 0 ? i : Math.max(0, DOORS.findIndex((d) => d.built))
}

/* ── the instrument boards ───────────────────────────────────────────────────
 * `tilt` is a rotateY on the panel itself, inward on both sides, so the wall
 * wraps around the seat instead of lying flat against the glass. That single
 * degree value is most of what separates a cockpit from a dashboard
 * screenshot, and it costs nothing because these are screen-fixed.
 *
 * `span` is flex-grow. Varying it is what stops this being a card grid.
 *
 * ⚠️ `span` and `instrument` are chosen TOGETHER. Instruments that GROW with
 * their data take span 2; instruments with a fixed natural size take span 1. A
 * fixed 86px dial in a 240px board leaves a hole — which is the "long stretches
 * of empty space" the anti-emptiness rule bans, arrived at through a layout
 * decision rather than a styling one.
 *
 * Six boards, six silhouettes. Nothing on this wall is a copy of anything else
 * on it, and that single fact does more work than any amount of gradient tuning.
 */
export const BOARDS = [
  { id: 'universe', side: 'left',  span: 2, tilt:  15, instrument: 'strips', label: 'the universe',  tag: 'MKT-1' },
  { id: 'momentum', side: 'left',  span: 1, tilt:  15, instrument: 'arc',    label: 'momentum',      tag: 'MKT-2' },
  { id: 'flow',     side: 'left',  span: 1, tilt:  15, instrument: 'odo',    label: 'liquidity',     tag: 'LIQ-1' },
  { id: 'alerts',   side: 'right', span: 2, tilt: -15, instrument: 'annun',  label: 'caution panel', tag: 'SYS-1' },
  { id: 'movers',   side: 'right', span: 1, tilt: -15, instrument: 'spark',  label: 'attention',     tag: 'SIG-1' },
  { id: 'window',   side: 'right', span: 1, tilt: -15, instrument: 'rotary', label: 'window',        tag: 'SYS-2' },
]

/** Below this height the cockpit cannot hold six legible boards.
 *  ⚠️ The threshold lives HERE, not in a media query. A visibility rule the
 *  layout maths cannot see is two sources of truth for one fact, and you will
 *  spend a day reserving space for a board CSS has already hidden. */
export const BOARDS_MIN_ROOM = 720

export function boardsFor(roomHeight) {
  if (roomHeight >= BOARDS_MIN_ROOM) return BOARDS
  const keep = new Set(['universe', 'alerts', 'momentum'])
  return BOARDS.filter((b) => keep.has(b.id))
}

/** The door's width in CSS px, and the room's lens. These live here because the
 *  globe's size is DERIVED from them — the handoff's warning that a too-large
 *  sphere "fills the lit doorway so the two read as one object" is a
 *  relationship between two numbers, and a relationship kept in prose drifts the
 *  moment either number is touched. `--st-perspective` and the .st-portal box in
 *  station.css must match these. */
export const DOOR_W = 420
export const PERSPECTIVE = 900

/** How wide the door actually renders on screen at the ring. */
export function doorScreenWidth() {
  return DOOR_W * (PERSPECTIVE / (PERSPECTIVE + RING))
}

/** Where a door's centre lands on screen, in px from the room's axis.
 *  The full projection, not the small-angle approximation: a door off to the
 *  side is FURTHER AWAY as well as further across, and ignoring that overstates
 *  how much room there is between neighbours. */
export function doorScreenPx(doorIndex, facingIndex) {
  const t = (offsetFor(doorIndex, facingIndex) * Math.PI) / 180
  const x = SCREEN_SIGN * RING * Math.sin(t)
  const z = -RING * Math.cos(t)
  return x * (PERSPECTIVE / (PERSPECTIVE + -z))
}

/** The tightest gap between two neighbouring doors, over every heading.
 *  ⚠️ This is what six doors on a ring sized for five gets you: at the old
 *  spacing the arches were 197px apart while each rendered 201px wide, so every
 *  door clipped its neighbour. Kept as a function so the test can assert it
 *  rather than someone re-deriving it after the next change. */
export function tightestDoorGap() {
  let min = Infinity
  for (let f = 0; f < DOORS.length; f++) {
    for (let i = 0; i + 1 < DOORS.length; i++) {
      if (!doorVisible(i, f) || !doorVisible(i + 1, f)) continue
      min = Math.min(min, Math.abs(doorScreenPx(i, f) - doorScreenPx(i + 1, f)))
    }
  }
  return min
}

/** The globe's diameter as a share of the room — never a constant.
 *  Raised from the handoff's 0.185 because the operator asked for a bigger
 *  Earth. The door stays at its original 420 and the RING SPREAD widened instead
 *  (see DOORS): at six doors across the old +/-62 the arches were 197px apart on
 *  screen while each rendered 201px wide, so every neighbour overlapped its
 *  neighbour. The globe is capped at the projected door width -- it may match the
 *  arch, never exceed it, and it sits lower in the frame than the arch's centre
 *  so the two read as separate objects rather than one halo. */
export const GLOBE_MAX_OF_DOOR = 1.0

export function globeSize(roomHeight) {
  const cap = doorScreenWidth() * GLOBE_MAX_OF_DOOR
  return Math.round(Math.max(150, Math.min(cap, roomHeight * 0.26)))
}

/** Column height as a SHARE of the room. Every fixed pixel height in a room
 *  like this is eventually found to be correct at exactly one window size. */
export function columnHeight(roomHeight) {
  return Math.round(Math.max(300, Math.min(roomHeight * 0.72, roomHeight - 190)))
}

/** A gauge's fill as a fraction of its own maximum.
 *  Returns 0 when there is nothing to scale against — and 0 must render as an
 *  EMPTY track, never a full one. The divide-by-zero that renders as 100% is
 *  how a gauge reporting nothing ends up looking like a gauge reporting
 *  everything. */
export function fraction(value, max) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0
  return Math.max(0, Math.min(1, value / max))
}

/** The time windows the rotary selects between. */
export const WINDOWS = [
  { id: '1h',  label: '1 hour',  ms: 36e5 },
  { id: '24h', label: '24 hours', ms: 864e5 },
  { id: '7d',  label: '7 days',  ms: 7 * 864e5 },
  { id: '30d', label: '30 days', ms: 30 * 864e5 },
]

/* ═══════════════════════════════════════════════════════════════════════════
   THE HULL — the ring corridor: wall, overhead vault, and the door jambs.

   The room had a floor and a ceiling and NOTHING BETWEEN THEM: seven arches in
   open dark. It was not missing texture, it was missing a hull.

   ⚠️ FACET SPACING IS 7° FOR A REASON, NOT BY FEEL. Every door angle in DOORS
   (0, ±28, ±56, ±84) is a multiple of 7, so every door lands on a facet CENTRE.
   That is what lets the wall open cleanly for a doorway — suppress the facets a
   door covers, drop a jamb in the hole, done. At 8° the doors landed between
   facets and every opening needed a half-panel fudge.
   ═══════════════════════════════════════════════════════════════════════════ */

export const HULL_SEG_DEG = 7
export const HULL_SPAN_DEG = 133

/** Where the WALL FACE sits, relative to the door ring. NEGATIVE — the wall is
 *  IN FRONT of the doors, which is the whole reason a door reads as set INTO the
 *  wall rather than as a portal stuck on the front of one. The door is then seen
 *  through a hole in the wall, 16px back, with the wall's own thickness showing
 *  as a reveal around the opening. */
export const WALL_Z = -16

/** Angular width of a door's jamb panel. Wider than the door's own 24.8° so it
 *  laps onto the wall either side and no seam lands on the opening's edge. */
export const DOOR_BAY_DEG = 30

/** Half-angle a door actually covers on the ring: asin(halfWidth / RING). */
export function doorHalfAngle() {
  return (Math.asin((DOOR_W / 2) / RING) * 180) / Math.PI
}

/** The facets. `kind` decides what the CSS paints:
 *    wall    — panelled bulkhead
 *    window  — a glazed bay onto space. Only out past the last door, because
 *              between doors there is exactly one 7° pillar and a window there
 *              would be a porthole in a doorframe.
 *  Facets a door covers are omitted entirely: the jamb is the wall there. */
export function hullSegments() {
  const half = doorHalfAngle()
  const out = []
  for (let k = -19; k <= 19; k++) {
    const angle = k * HULL_SEG_DEG
    if (Math.abs(angle) > HULL_SPAN_DEG) continue
    // Covered by a doorway? The jamb owns that arc.
    if (DOORS.some((d) => Math.abs(angle - d.angle) < half - HULL_SEG_DEG / 2)) continue
    const outboard = Math.abs(angle) > Math.max(...DOORS.map((d) => Math.abs(d.angle))) + HULL_SEG_DEG
    const kind = outboard && (Math.abs(angle) / HULL_SEG_DEG) % 2 === 1 ? 'window' : 'wall'
    out.push({ angle, kind })
  }
  return out
}

/** The vault facets — the overhead. Same angles as the wall INCLUDING the door
 *  arcs, because a corridor's roof does not stop over a doorway.
 *  ⚠️ Per-facet, NOT one raked plane. §9.5 killed the single-plane ceiling: a
 *  finite plane whose footprint is not centred on the camera rotates out of view
 *  at a large heading. A RING of facets is centred on the camera by construction,
 *  so it cannot leave the top of the frame — and unlike the screen-fixed ceiling
 *  it stops where the walls stop, instead of running out past the last door. */
/** Vault facets are TWICE the wall's width and phase-locked to the doors.
 *  ⚠️ ALIGNMENT IS THE POINT. At the wall's own 7° the ribs landed wherever, and
 *  the overhead read as a separate object resting on the room rather than as its
 *  roof. At 14° every facet centre is an even multiple of 14 — and every door
 *  angle (0, ±28, ±56, ±84) is an EVEN multiple of 14 while every pillar between
 *  doors is an ODD one. So a rib sits over each doorway and a glazed bay sits
 *  over each pillar, every time, at every heading. Halving the facet count also
 *  halves what has to be re-rasterised on a turn. */
export const VAULT_SEG_DEG = 14
export function vaultSegments() {
  const out = []
  for (let k = -10; k <= 10; k++) {
    const angle = k * VAULT_SEG_DEG
    if (Math.abs(angle) > HULL_SPAN_DEG) continue
    out.push({ angle, kind: k % 2 === 0 ? 'rib' : 'glazed' })
  }
  return out
}

/** Chord width of one facet at the wall plane, in px.
 *  ⚠️ Facets must BUTT or slightly overlap, never gap: a sub-pixel gap between
 *  two panels shows the void through the hull as a bright hairline, which reads
 *  as a rendering fault. The renderer adds a pixel of overlap deliberately. */
export function hullFacetWidth() {
  return 2 * (RING + WALL_Z) * Math.sin(((HULL_SEG_DEG / 2) * Math.PI) / 180)
}

/** Chord width of one VAULT facet. Wider than the wall's, because the vault is
 *  phase-locked to the doors at 14° rather than the wall's 7°. */
export function vaultFacetWidth() {
  return 2 * (RING + WALL_Z) * Math.sin(((VAULT_SEG_DEG / 2) * Math.PI) / 180)
}

/** Chord width of a door's jamb panel at the wall plane. */
export function doorBayWidth() {
  return 2 * (RING + WALL_Z) * Math.sin(((DOOR_BAY_DEG / 2) * Math.PI) / 180)
}

/** Same camera-plane rule the doors obey (§9.12): anything more than ~85° off
 *  your heading has crossed the camera plane and re-projects at enormous scale.
 *  Hidden, never unmounted. */
export function hullVisible(angle, facingIndex) {
  return Math.abs(angle - DOORS[facingIndex].angle) < 85
}

/** The vault needs a TIGHTER bound than the wall, and this is not caution.
 *  ⚠️ A vault facet is tipped forward off the wall, so its near edge sits
 *  hundreds of px closer to the camera than its base. Out near the wall's own 85°
 *  limit the base is already almost on the camera plane, and the tilt carries the
 *  near edge straight past it — the facet re-projects at enormous scale and rakes
 *  across the middle of the room as a bright diagonal streak over the doors and
 *  the globe. It reads as a rendering fault, and it is invisible in the source
 *  because the geometry that produced it is two transforms apart. */
export const VAULT_TILT_DEG = 45
export function vaultVisible(angle, facingIndex) {
  return Math.abs(angle - DOORS[facingIndex].angle) < 45
}
