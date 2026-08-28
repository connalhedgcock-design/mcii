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
 * ±62 rather than a full semicircle: turning to the outermost door yaws the
 * room 62°, which is a real turn of the head and still leaves the opposite wall
 * in frame, so you never lose your sense of where you are standing.
 *
 * ⚠️ Do not narrow below about ±50. At ±44 the middle doors cluster behind the
 * globe, and the single most important fact on screen — "where does ↑ take me"
 * — becomes the thing the globe is standing in front of.
 *
 * `built` is the TRUTH about the app, not a wish. An unbuilt door renders
 * sealed and refuses to open, because a door that opens onto nothing teaches
 * the user to distrust the other four.
 *
 * `view` is the id of the existing flat tab this door opens onto.
 */
export const DOORS = [
  //                                                          screen position →
  { id: 'sector',  view: 'sector',  label: "what's happening", angle: -62.0, built: true,  blurb: 'the sector, and what moved it',        tag: 'SEC' },
  { id: 'journal', view: 'journal', label: 'the journal',      angle: -37.2, built: true,  blurb: 'what you decided, and whether it held', tag: 'LOG' },
  { id: 'market',  view: 'market',  label: 'the market',       angle: -12.4, built: true,  blurb: 'everything the scanner has found',      tag: 'MKT' },
  { id: 'watch',   view: 'watch',   label: 'your coins',       angle:  12.4, built: true,  blurb: 'what you are holding and tracking',     tag: 'WCH' },
  { id: 'wallets', view: null,      label: 'the wallets',      angle:  37.2, built: false, blurb: 'who is moving size',                    tag: 'WAL' },
  { id: 'predict', view: null,      label: 'prediction markets', angle: 62.0, built: false, blurb: 'kalshi, polymarket',                   tag: 'PRD' },
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
export const DOOR_W = 620
export const PERSPECTIVE = 900

/** How wide the door actually renders on screen at the ring. */
export function doorScreenWidth() {
  return DOOR_W * (PERSPECTIVE / (PERSPECTIVE + RING))
}

/** The globe's diameter as a share of the room — never a constant.
 *  Raised from the handoff's 0.185 because the operator asked for a bigger
 *  Earth; the doorway was widened to match. The cap is not a taste value: it is
 *  82% of the projected door, so the arch always FRAMES the sphere instead of
 *  being swallowed by it, whatever either number becomes later. */
export const GLOBE_MAX_OF_DOOR = 0.82

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
