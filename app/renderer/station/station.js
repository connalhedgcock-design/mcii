/**
 * station — the Observatory. Vanilla mount, no framework.
 *
 * THE ONE IDEA: the instruments are bolted to YOU; the room is beyond them.
 * `.st-beyond-world` is the ONLY element that receives the heading. The canopy,
 * the columns, the globe and the sill are screen-fixed and never touch a
 * yaw-driven transform. That split is the strongest depth cue available and it
 * is what keeps the instruments readable while you navigate.
 */

import {
  DOORS, RING, TURN_MS, NAVIGATING_MS, TRAVEL_MS, WINDOWS,
  yawFor, offsetFor, starPan, stepDoorScreen, doorVisible, homeIndex,
  boardsFor, columnHeight, globeSize,
  hullSegments, vaultSegments, hullFacetWidth, vaultFacetWidth, doorBayWidth, hullVisible, vaultVisible,
  HULL_SEG_DEG, HULL_SPAN_DEG, VAULT_SEG_DEG, DOOR_BAY_DEG,
  WALL_Z, VAULT_TILT_DEG,
} from './station-geometry.js'
import { mountGlobe } from './holo-globe.js'
import { snapshot, renderBoard } from './instruments.js'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

let stage, world, stars, hub, globeHost, smearHost, sill, colL, colR, notice
let globe = null
let door = homeIndex()
// ⚠️ THE ROOM KEEPS EVERYTHING THE OLD HEADING COULD SEE UNTIL THE TURN HAS
// FINISHED. render() runs the instant the heading changes, while the CSS
// transition is still playing, so pruning to the NEW heading's visible set
// deletes wall and vault panels out from under a rotation that is still showing
// them. That is the flicker: sections of the room blinking out mid-turn. Hold
// the union for the length of the turn, then prune once, when nothing moves.
let prevDoor = door
let settling = false
let settleTimer = null
let navTimer = 0
let winId = '24h'
let selectedCa = null   // which coin the caution panel has selected, if any
let snap = null
let active = false
let inFlight = false

/* ═══════════════════════════════════════════════════════════════════════════
   THE DOM — built once. The nesting is load-bearing: nothing in the
   .st-beyond → .st-beyond-world → .st-portal chain may take a grouping
   property (filter / opacity<1 / overflow / clip-path / mask), because that
   forces flattening and preserve-3d is then silently ignored.
   ═══════════════════════════════════════════════════════════════════════════ */
function build(root) {
  root.className = 'st-stage'
  root.dataset.room = 'observatory'
  // ⚠️ ONE SKY, WRAPPED ROUND THE RING. Every pane used to carry its own copy of
  // --st-sky, so the same planet appeared in all six windows at once — six
  // planets in a row, which is the single most obvious way to say "these are
  // wallpaper, not windows". Instead the sky is sized to the WHOLE corridor and
  // each pane is offset to its own slice of it, so the view through the glass is
  // continuous across the panels the way a real run of glazing is.
  // ⚠️ THE SKY IS 1700px, NOT THE WHOLE RING. Sized to the full 266° corridor it
  // was continuous and correct and looked like nothing: each 118px pane showed
  // 2.6% of it, so the planet lived in two panes somewhere off to the side and
  // every other window was empty void. At 1700px a viewful (~10 panes) spans
  // about 70% of the sky — you always have something in frame — while the repeat
  // lands ~100° away, so you never catch two of the same planet at once.
  // ⚠️ ONE SCALE FOR BOTH. The tile is a whole number of wall facets wide and the
  // offsets step by the same px-per-degree, so every pane lands exactly on its own
  // slice and the join between panes is continuous. Sizing the image at one scale
  // and computing offsets at another is what left the planets not lining up.
  const pxPerDeg = hullFacetWidth() / HULL_SEG_DEG
  const SKY_FACETS = 12                       // ≈84° of sky before it repeats —
  const skyW = Math.round(hullFacetWidth() * SKY_FACETS)   // wider than a viewful
  const skyUrl = buildSky(skyW, 420)
  // Offset to this pane's slice, measured from its LEFT EDGE — the pane spans
  // [angle − half, angle + half], and the sky must start where the pane starts.
  const skyAt = (angle, halfDeg) =>
    `--sky-x:${Math.round(-(angle - halfDeg + HULL_SPAN_DEG) * pxPerDeg)}px`

  root.innerHTML = `
    <div class="st-room st-room-bridge">
      <div class="st-bridge">

        <div class="st-beyond">
          <!-- ⚠️ The facet width comes from the geometry, never from a number typed into
               the CSS. It is a function of RING and HULL_SEG_DEG, and a copy of it in a
               stylesheet goes stale the moment either is touched -- leaving hairline gaps
               between wall panels that show the void through the hull. A custom property
               is not a grouping property, so it is safe on this element. -->
          <div class="st-beyond-world" style="--st-hull-w:${Math.ceil(hullFacetWidth()) + 2}px; --st-jamb-w:${Math.round(doorBayWidth())}px; --st-vault-w:${Math.ceil(vaultFacetWidth()) + 2}px; --st-sky-w:${skyW}px">
            <!-- The hull FIRST: the corridor the doors are set into. Before the
                 floor and the portals so it is the surface everything else sits
                 against, and so a facet can never paint over an arch. -->
            <!-- THE OVERHEAD. Per-facet, tipped inward off the top of the wall, so it
                 stops where the corridor stops instead of running out past the last
                 door the way the screen-fixed ceiling did. -->
            ${vaultSegments().map((v) => `
              <div class="st-vault st-vault-${v.kind}" data-a="${v.angle}"
                   style="transform:rotateY(${v.angle}deg) translateZ(-${RING + WALL_Z}px) rotateX(${VAULT_TILT_DEG}deg); ${skyAt(v.angle, VAULT_SEG_DEG / 2)}"></div>`).join('')}
            <!-- THE WALL. Facets a doorway covers are simply absent — the jamb is
                 the wall there, and it carries the opening. -->
            ${hullSegments().map((h) => `
              <div class="st-hull-seg st-hull-${h.kind}" data-a="${h.angle}"
                   style="transform:rotateY(${h.angle}deg) translateZ(-${RING + WALL_Z}px); ${skyAt(h.angle, HULL_SEG_DEG / 2)}"></div>`).join('')}
            <!-- THE JAMBS. A wall panel with the doorway cut out of it, sitting in
                 FRONT of the door ring, so the door is seen through a hole in the
                 wall with the wall's own thickness showing as a reveal. -->
            ${DOORS.map((d) => `
              <div class="st-hull-jamb" data-a="${d.angle}"
                   style="transform:rotateY(${d.angle}deg) translateZ(-${RING + WALL_Z}px); ${skyAt(d.angle, DOOR_BAY_DEG / 2)}"></div>`).join('')}
            <div class="st-beyond-floor"></div>
            ${DOORS.map((d, i) => `
              <div class="st-portal${d.built ? '' : ' is-sealed'}" data-i="${i}"
                   style="transform:rotateY(${d.angle}deg) translateZ(-${RING}px)">
                <div class="st-portal-view${d.built ? '' : ' is-dark'}">
                  <span class="st-pv-far"></span>
                  <span class="st-pv-floor"></span>
                  <span class="st-pv-lamps"></span>
                  <span class="st-pv-console"></span>
                  <span class="st-pv-glow"></span>
                </div>
                <div class="st-portal-arch"></div>
                <div class="st-portal-seal"></div>
                <div class="st-portal-light"></div>
                <div class="st-portal-plate">${esc(d.label)}</div>
              </div>`).join('')}
          </div>
          <div class="st-beyond-haze"></div>
          <div class="st-smear"></div>
          <div class="st-sweep"></div>
        </div>

        <div class="st-ceiling">
          <div class="st-ceil-grid"></div>
          <div class="st-ceil-stars"></div>
        </div>

        <div class="st-canopy">
          <div class="st-canopy-brow st-carbon"></div>
          <div class="st-canopy-strut st-carbon" data-side="l"></div>
          <div class="st-canopy-strut st-carbon" data-side="r"></div>
        </div>

        <div class="st-col st-col-l"></div>
        <div class="st-col st-col-r"></div>

        <div class="st-hub">
          <div class="st-globe"><span class="st-globe-fallback"></span></div>
          <div class="st-projector">
            <span class="st-projector-beam"></span>
            <div class="st-projector-pane">
              <div class="st-prompt-row">
                <span class="st-mode is-on">orion</span>
                <input class="st-prompt" type="text" autocomplete="off"
                       placeholder="ask orion anything — your coins, your notes, or whatever else…">
                <button class="st-signin" hidden>log in to anthropic</button>
              </div>
              <div class="st-reply"></div>
            </div>
          </div>
        </div>

        <div class="st-notice" hidden>
          <b>SYS</b><span class="st-notice-text"></span>
        </div>

        <div class="st-sill st-carbon">
          <span class="st-label">facing</span>
          <span class="st-sill-door"></span>
          <span class="st-sill-blurb"></span>
          <span class="st-sill-state"></span>
          <span class="st-sill-keys">← → turn · ↑ enter · esc leave</span>
          <span class="st-sill-serial">CII·OBS·R1</span>
        </div>

      </div>
    </div>`

  stage = root
  world = root.querySelector('.st-beyond-world')
  // ⚠️ Set as a property, NOT inlined into the template string. The prerendered
  // sky is a few hundred KB of base64; pasting that into an attribute inside the
  // HTML makes the markup unreadable in devtools and re-parses it on every
  // remount. One property on the panes' shared ancestor, inherited by all of them.
  if (skyUrl) world.style.setProperty('--st-sky-img', `url(${skyUrl})`)
  stars = root.querySelector('.st-ceil-stars')
  hub = root.querySelector('.st-hub')
  globeHost = root.querySelector('.st-globe')
  smearHost = root.querySelector('.st-beyond')
  sill = root.querySelector('.st-sill')
  colL = root.querySelector('.st-col-l')
  colR = root.querySelector('.st-col-r')
  notice = root.querySelector('.st-notice')

  root.querySelectorAll('.st-portal').forEach((p) => {
    p.addEventListener('click', () => {
      const i = Number(p.dataset.i)
      if (i === door) enter()
      else setDoor(i)
    })
  })
  wirePrompt(root)
}

/* ── the room's own measurements ────────────────────────────────────────────
   The room measures ITSELF. It is a pane inside an app, not the window, so its
   height is not knowable in advance — and assuming 900 buries the bottom board
   at every other size. */
function measure() {
  if (!stage) return
  // The stage sits under whatever app chrome is actually showing. Measured, not
  // hard-coded: the tab bar is hidden while you are in the room (it is the thing
  // the room replaces), and that 88px is the difference between a six-board wall
  // and a three-board one on a 900px-tall screen.
  const chrome = [...document.querySelectorAll('.tabs, .bar')]
    .filter((el) => el.offsetParent !== null)
  const top = chrome.reduce((m, el) => Math.max(m, el.getBoundingClientRect().bottom), 0)
  stage.style.setProperty('--st-top', `${Math.max(0, Math.round(top))}px`)

  const h = stage.getBoundingClientRect().height || 900
  const colH = columnHeight(h)
  colL.style.height = `${colH}px`
  colR.style.height = `${colH}px`
  const gd = globeSize(h)
  hub.style.setProperty('--globe-d', `${gd}px`)

  // ⚠️ The globe is placed on the DOORWAY, measured, not on a percentage that
  // looks about right. The arch is a 3D-projected element: where it actually
  // lands depends on the ring radius, the perspective and the room's height, so
  // any constant is correct at exactly one window size. Reading the rendered box
  // is the only thing that stays true when those change.
  const arch = stage.querySelector('.st-portal.is-facing .st-portal-arch')
  const box = stage.getBoundingClientRect()
  if (arch) {
    const a = arch.getBoundingClientRect()
    const cy = a.top + a.height / 2 - box.top
    hub.style.setProperty('--globe-y', `${Math.round(cy)}px`)

    // The prompt hangs beneath the sphere — but it must also clear the DOOR
    // PLATES, which sit lower than the globe does and are the labels telling you
    // where each door goes. Take whichever constraint is lower. Measured, again,
    // because the plates are 3D-projected and their screen position moves with
    // the room's height and the heading.
    let projY = cy + gd / 2 + 20
    const plates = [...stage.querySelectorAll('.st-portal:not(.is-offscreen) .st-portal-plate')]
    for (const pl of plates) {
      const r = pl.getBoundingClientRect()
      if (!r.height) continue
      projY = Math.max(projY, r.bottom - box.top + 14)
    }
    // Never so low that it collides with the sill. Measured, not guessed: reading the sill's own
    // rendered top is what lets this stay correct at any window height, the way the globe's own
    // position is measured from the doorway rather than assumed.
    const sillTop = sill.getBoundingClientRect().top - box.top
    const maxY = sillTop - 40
    const y = Math.round(Math.min(projY, maxY))
    hub.style.setProperty('--proj-y', `${y}px`)

    // ⚠️ THE PANE'S OWN HEIGHT WAS NEVER BOUNDED BY THIS. `.st-reply` had a flat 170px max-height
    // regardless of how much room actually existed below the anchor — fine for a short answer, but
    // a full reply plus the prompt row can run past 230px, and every pixel past the sill is a pixel
    // past the BOTTOM OF THE WINDOW ITSELF (the sill sits flush at the room's own floor). The
    // result was Orion's answer appearing to be cut off by the Dock: it was not covered, it was
    // rendered outside the window. `--proj-cap` is the real, measured ceiling for the whole pane;
    // `.st-reply` flexes to fill whatever is left of it and scrolls internally for the rest.
    hub.style.setProperty('--proj-cap', `${Math.max(90, Math.round(sillTop - y - 12))}px`)
  }

  globe?.resize()
  return h
}

/* ═══════════════════════════════════════════════════════════════════════════
   TURNING — only the room moves.
   ═══════════════════════════════════════════════════════════════════════════ */
function render() {
  const yaw = yawFor(door)
  world.style.transform = `rotateY(${yaw}deg)`
  stars.style.backgroundPosition = `${starPan(door)}px 0`

  // The hull obeys the same camera-plane rule as the doors (§9.12): a facet more
  // than ~85 deg off your heading has passed the camera and re-projects huge.
  const shown = (fn, a) => fn(a, door) || (settling && fn(a, prevDoor))
  stage.querySelectorAll('.st-hull-seg, .st-hull-jamb').forEach((h) => {
    h.classList.toggle('is-offscreen', !shown(hullVisible, Number(h.dataset.a)))
  })
  stage.querySelectorAll('.st-vault').forEach((v) => {
    v.classList.toggle('is-offscreen', !shown(vaultVisible, Number(v.dataset.a)))
  })

  stage.querySelectorAll('.st-portal').forEach((p) => {
    const i = Number(p.dataset.i)
    p.classList.toggle('is-facing', i === door)
    // §9.12 — a door more than ~85° off heading has crossed the camera plane
    // and re-projects at enormous scale. Hidden, never unmounted.
    p.classList.toggle('is-offscreen', !doorVisible(i, door))
    // ⚠️ the door's angle off YOUR heading, NOT the raw yaw. Feeding yaw slides
    // all five interiors in lockstep and reads as one texture scrolling behind
    // five holes.
    p.style.setProperty('--st-off', offsetFor(i, door))
  })

  const f = DOORS[door]
  sill.querySelector('.st-sill-door').textContent = f.label
  sill.querySelector('.st-sill-blurb').textContent = f.blurb
  const state = sill.querySelector('.st-sill-state')
  // ⚠️ Keep the hook class. Assigning className wholesale here stripped
  // `st-sill-state` off the element, so the NEXT render could not find it and
  // threw — after which nothing in the sill ever updated again. The first turn
  // looked fine, which is what made it invisible.
  state.className = `st-sill-state ${f.built ? 'st-sill-go' : 'st-sill-sealed'}`
  state.textContent = f.built ? '↑ enter' : 'not built yet'
}

function afterTurn() {
  render()
  // ⚠️ REPLACE the smear node. A CSS animation does not restart on a class the
  // element already has — which is how a smear fires once and then silently
  // never again.
  const old = smearHost.querySelector('.st-smear')
  const fresh = old.cloneNode(false)
  old.replaceWith(fresh)
  // Force a reflow so the freshly-inserted node actually starts the animation.
  void fresh.offsetWidth
  fresh.classList.add('is-on')

  // The globe yields so the door you are facing is not hidden behind it. Barely
  // longer than the motion — comfortably longer and the fix reads as a bug.
  hub.classList.add('is-yielded')
  clearTimeout(navTimer)
  navTimer = setTimeout(() => hub.classList.remove('is-yielded'), NAVIGATING_MS)
}

function turn(screenDelta) {
  // ⚠️ stepDoorScreen, NOT stepDoor. The ring sits at negative z, so a positive
  // angle renders LEFT and the array runs right-to-left on screen. Stepping the
  // index directly walks the selection the wrong way.
  const next = stepDoorScreen(door, screenDelta)
  if (next === door) return          // clamped at the wall, not wrapped
  setDoor(next)
}

/** Change heading, holding the old heading's panels until the turn has landed. */
function setDoor(next) {
  prevDoor = door
  door = next
  settling = true
  clearTimeout(settleTimer)
  // A little past the turn so the prune never lands on the last frame of it.
  settleTimer = setTimeout(() => { settling = false; render() }, TURN_MS + 90)
  afterTurn()
}

/* ═══════════════════════════════════════════════════════════════════════════
   WALKING — the room grows PAST you and dims; the flat view rises to meet you.
   Never a cross-fade in place: a fade says the room was deleted, not left.

   The flat rooms are the app's existing tabs, left exactly where they are. The
   door drives the app's own tab switch rather than moving DOM into the stage —
   which keeps this decoupled from a file Connal is actively editing.
   ═══════════════════════════════════════════════════════════════════════════ */
function enter() {
  const d = DOORS[door]
  if (!d.built || !d.view) return    // a sealed door refuses, and says so
  stage.dataset.room = d.view
  document.body.classList.add('st-arriving')
  setTimeout(() => {
    stage.hidden = true
    active = false
    // Go through the real tab button, so whatever handler exists runs.
    const tab = document.querySelector(`.tab[data-view="${d.view}"]`)
    if (tab) tab.click()
    document.body.classList.remove('st-arriving')
  }, TRAVEL_MS)
}

function leave() {
  stage.hidden = false
  stage.dataset.room = 'observatory'
  active = true
  measure()
  refresh()
}

/* No back-panel here. Getting to the room is already one click away in the tab
   bar, and a second, permanently-docked control for the same destination is a
   slab of chrome earning nothing. */

/* ═══════════════════════════════════════════════════════════════════════════
   THE INSTRUMENT WALL
   ═══════════════════════════════════════════════════════════════════════════ */
async function refresh() {
  const h = measure() || 900
  snap = await snapshot(winId, selectedCa)
  const boards = boardsFor(h)
  colL.replaceChildren(...boards.filter((b) => b.side === 'left').map((b) => renderBoard(b, snap)))
  colR.replaceChildren(...boards.filter((b) => b.side === 'right').map((b) => renderBoard(b, snap)))

  fitArcs()

  // ⚠️ The caution panel is a SELECTOR, not a readout. Clicking a coin's lamp
  // points the rest of the wall at that coin; clicking it again releases it back
  // to the whole watchlist. Wired after every rebuild, because the lamps are
  // rebuilt with the data they describe.
  stage.querySelectorAll('.st-lamp[data-ca]').forEach((l) => {
    l.addEventListener('click', () => {
      selectedCa = selectedCa === l.dataset.ca ? null : l.dataset.ca
      refresh()
    })
  })

  // The rotary is a control, so it has to be wired after every rebuild.
  stage.querySelectorAll('.st-rot-opt').forEach((o) => {
    o.addEventListener('click', () => { winId = o.dataset.win; refresh() })
  })
  stage.querySelectorAll('.st-rot-knob').forEach((k) => {
    k.addEventListener('click', () => {
      const i = WINDOWS.findIndex((w) => w.id === winId)
      winId = WINDOWS[(i + 1) % WINDOWS.length].id
      refresh()
    })
  })
}

/** Size each dial to the panel it is actually in, in real pixels.
 *  A dial must be ROUND, so its one dimension has to be computed where both
 *  axes are known — CSS percentages resolve against a different box for width
 *  than for height and quietly produce an ellipse. Leaves room beneath for the
 *  readout and the range endpoints, which are the parts that were being clipped. */
function fitArcs() {
  stage.querySelectorAll('.st-arc').forEach((a) => {
    const body = a.closest('.st-board-body')
    if (!body) return
    const room = body.clientHeight - 40      // readout + endpoints + gaps
    a.style.setProperty('--arc-d', `${Math.round(Math.max(52, Math.min(86, room)))}px`)
  })
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE PROMPT — ask READS, log WRITES, and they never blur into each other.
   The globe's own state is the loading indicator; no spinner exists here.
   ═══════════════════════════════════════════════════════════════════════════ */
function wirePrompt(root) {
  const input = root.querySelector('.st-prompt')
  const reply = root.querySelector('.st-reply')
  const signin = root.querySelector('.st-signin')

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let typeRaf = 0, thinkTimer = 0

  const stopAnimations = () => {
    cancelAnimationFrame(typeRaf); typeRaf = 0
    clearInterval(thinkTimer); thinkTimer = 0
  }

  const say = (text, err) => {
    stopAnimations()
    reply.className = `st-reply${err ? ' is-err' : ''}`
    reply.textContent = text
    reply.scrollTop = 0
  }

  /* ── the wait ─────────────────────────────────────────────────────────────
     Orion takes seconds, not milliseconds — it is reading files. A static
     "loading" for that long reads as a hang, so the wait SAYS SOMETHING and
     keeps changing. The words are deliberately vague about progress because we
     genuinely do not know how far along it is; claiming a stage we cannot
     observe would be a fake progress bar in words. */
  const WAITING = [
    'thinking', 'reading the vault', 'checking the record', 'cooking',
    'meandering', 'weighing it up', 'chasing a number down', 'still going',
  ]
  function startThinking() {
    stopAnimations()
    reply.className = 'st-reply is-think'
    let i = 0
    const paint = () => { reply.textContent = WAITING[i % WAITING.length] }
    paint()
    if (reduced) return
    thinkTimer = setInterval(() => { i++; paint() }, 2600)
  }

  /* ── the answer ───────────────────────────────────────────────────────────
     Typed out rather than dumped. Speed is derived from LENGTH so a long answer
     does not take a minute to read itself out: the whole reply lands inside a
     fixed budget whatever its size. Time-based, not per-frame, so it runs the
     same on a 120Hz display as on a 60Hz one. */
  const TYPE_MS = 1400
  function typeOut(text) {
    stopAnimations()
    reply.className = 'st-reply'
    if (reduced || text.length < 3) { reply.textContent = text; return }
    const t0 = performance.now()
    const step = (now) => {
      const p = Math.min(1, (now - t0) / TYPE_MS)
      // Ease out: fast at the start, settling at the end. A linear crawl reads
      // as a machine printing; this reads as something answering.
      const n = Math.round(text.length * (1 - Math.pow(1 - p, 2)))
      reply.textContent = text.slice(0, n)
      reply.scrollTop = reply.scrollHeight
      if (p < 1) typeRaf = requestAnimationFrame(step)
      else { typeRaf = 0; reply.scrollTop = 0 }
    }
    typeRaf = requestAnimationFrame(step)
  }

  // Readiness is a real answer now: `claude auth status --json`, which costs
  // nothing. The button appears only when this machine is genuinely signed out —
  // showing it to someone already signed in is indistinguishable from telling
  // them they are logged out, which is what happened before.
  async function refreshAuth() {
    const st = await window.mcii?.orionStatus?.().catch(() => null)
    const installed = !!st?.installed
    const ready = !!st?.ready
    signin.hidden = !installed || ready
    input.disabled = !installed

    if (!installed) {
      input.placeholder = 'orion needs the claude cli'
      setNotice('Orion is not connected: the Claude CLI is not installed. In Terminal run  '
        + 'npm install -g @anthropic-ai/claude-code  then reopen the app. No API key and no '
        + 'billing — it signs in with your own Claude account.')
    } else if (!ready) {
      input.placeholder = st?.unknown ? 'orion could not check your sign-in' : 'sign in to talk to orion'
      setNotice(st?.unknown
        ? 'Orion is installed but would not report its sign-in state. Try asking it something anyway.'
        : 'Orion is installed but this machine is not signed in. Click "log in to anthropic" — '
          + 'it opens a terminal and your browser. The app never sees your account.')
    } else {
      input.placeholder = 'ask orion anything — your coins, your notes, or whatever else…'
      setNotice('')
    }
    return { installed, ready }
  }

  signin.addEventListener('click', async () => {
    signin.disabled = true
    const r = await window.mcii?.orionLogin?.()
    say(r && r.ok === false
      ? 'Could not start the sign-in. Open a terminal and run:  claude auth login'
      : 'Signing in — finish in the browser window that opens. '
        + 'Come back here afterwards and just ask me something.')
    // The sign-in finishes somewhere else, so watch for it rather than making
    // them tell us. Bounded: this stops on its own.
    let tries = 0
    const t = setInterval(async () => {
      const st = await refreshAuth()
      if (st.ready) { clearInterval(t); signin.disabled = false; say('Signed in. Ask me anything.') }
      else if (++tries > 90) { clearInterval(t); signin.disabled = false }
    }, 2000)
  })

  // Coming back from the terminal is exactly when the answer has changed.
  window.addEventListener('focus', () => { if (active) refreshAuth() })

  // Reaching for the keyboard is an unambiguous statement that you have
  // finished navigating, so the yield ends immediately.
  input.addEventListener('focus', () => {
    clearTimeout(navTimer)
    hub.classList.remove('is-yielded')
    globe?.setState('listening')
  })
  input.addEventListener('blur', () => { if (!inFlight) globe?.setState('idle') })

  input.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return
    const text = input.value.trim()
    if (!text || inFlight) return
    inFlight = true
    globe?.setState('working')          // the globe IS the loading indicator
    startThinking()
    input.value = ''
    try {
      const res = await window.mcii.orionAsk(text)
      // ⚠️ A failure is REPORTED. A blank answer is indistinguishable from
      // "there is nothing to say", and the two must never look the same.
      if (res?.ok) { signin.hidden = true; setNotice(''); typeOut(res.reply) }
      else if (res?.code === 'auth') {
        await refreshAuth()
        say('You are not signed in to Claude yet. Click "log in to anthropic", type /login in the '
          + 'terminal that opens, finish in the browser, then ask me again.', true)
      }
      else if (res?.code === 'no-cli') { await refreshAuth(); say('The Claude CLI is not installed on this machine.', true) }
      else say(res?.error || 'Orion did not answer.', true)
    } catch (err) {
      say(String(err?.message || err), true)
    } finally {
      inFlight = false
      globe?.setState(document.activeElement === input ? 'listening' : 'idle')
    }
  })

  refreshAuth()
}

/** An honest system placard. It states what is actually blocking the prompt —
 *  a mark that encodes nothing is a lie, and a false URGENT in a cockpit costs
 *  you the ability to be believed by the next one. */
function setNotice(text) {
  if (!notice) return
  notice.hidden = !text
  notice.querySelector('.st-notice-text').textContent = text || ''
}

/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD
   ⚠️ Guarded on `active`, and bails out inside a text field — otherwise typing
   in the prompt turns the room, and the arrow keys stop working in the input.
   ═══════════════════════════════════════════════════════════════════════════ */
function onKey(e) {
  if (!active || stage.hidden) {
    if (e.key === 'Escape') leave()      // esc always walks you back to the room
    return
  }
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
    if (e.key === 'Escape') t.blur()
    return
  }
  if (e.key === 'ArrowRight')     { e.preventDefault(); turn(+1) }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1) }
  else if (e.key === 'ArrowUp')   { e.preventDefault(); enter() }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOUNT
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   THE SKY, PRERENDERED ONCE.

   ⚠️ IT USED TO BE ~24 CSS GRADIENT LAYERS, PAINTED PER PANE, ON ~25 PANES.
   Every heading change re-rasterised all of it inside a 3D transform, and the
   turn was visibly laggy. A gradient stack is not free just because it is
   declarative: it is re-evaluated on every repaint, per element.

   Drawn once into a canvas here and handed to CSS as a single data-URI image.
   One decode, then every pane is a blit. `img-src 'self' data:` in the app's CSP
   already allows this.

   ⚠️ THE TILE IS SEAMLESS AND ITS WIDTH IS A WHOLE NUMBER OF WALL FACETS. That is
   what lets the panes line up: each pane is offset to its own slice by the SAME
   px-per-degree the wall itself uses, and the tile repeats without a visible
   join. Sizing the image and the offsets at two different scales is what made
   the planets fail to line up before — the maths was continuous, the two scales
   were not.
   ═══════════════════════════════════════════════════════════════════════════ */
function buildSky(tileW, h) {
  const c = document.createElement('canvas')
  c.width = tileW; c.height = h
  const x = c.getContext('2d')
  if (!x) return null

  // Anything that could cross an edge is drawn three times, so the tile wraps.
  const wrap = (fn) => { for (const dx of [-tileW, 0, tileW]) { x.save(); x.translate(dx, 0); fn(); x.restore() } }
  const blob = (cx, cy, r, stops) => wrap(() => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r)
    stops.forEach(([o, col]) => g.addColorStop(o, col))
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.fill()
  })

  // the void — never pure black, which reads as a hole rather than as distance
  const v = x.createLinearGradient(0, 0, 0, h)
  v.addColorStop(0, '#12161f'); v.addColorStop(1, '#0a0d14')
  x.fillStyle = v; x.fillRect(0, 0, tileW, h)

  // nebulosity: findable edges, unequal sizes, none of them centred
  blob(tileW * 0.72, h * 0.24, h * 0.72, [[0, 'rgba(56,132,168,0.30)'], [0.45, 'rgba(38,86,126,0.13)'], [1, 'rgba(0,0,0,0)']])
  blob(tileW * 0.30, h * 0.66, h * 0.60, [[0, 'rgba(58,96,170,0.22)'], [1, 'rgba(0,0,0,0)']])
  blob(tileW * 0.94, h * 0.40, h * 0.50, [[0, 'rgba(48,126,150,0.20)'], [1, 'rgba(0,0,0,0)']])

  // the dust lane
  x.save(); x.globalAlpha = 0.5
  const d = x.createLinearGradient(0, h * 0.1, tileW * 0.4, h)
  d.addColorStop(0, 'rgba(0,0,0,0)'); d.addColorStop(0.5, 'rgba(150,178,205,0.13)'); d.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = d; x.fillRect(0, 0, tileW, h); x.restore()

  // stars, three magnitudes — one size reads as noise, three reads as a sky.
  // Deterministic: a hash, not Math.random, so the sky is the same every launch
  // and nobody ever debugs a star that moved.
  let seed = 20260901
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
  for (const [n, r, a] of [[210, 0.7, 0.55], [70, 1.1, 0.8], [22, 1.7, 0.95]]) {
    for (let i = 0; i < n; i++) {
      const sx = rnd() * tileW, sy = rnd() * h
      x.fillStyle = `rgba(232,242,255,${a * (0.5 + rnd() * 0.5)})`
      wrap(() => { x.beginPath(); x.arc(sx, sy, r, 0, 6.2832); x.fill() })
    }
  }

  // a planet, low, lit from the left, with its atmosphere on the limb
  const px = tileW * 0.20, py = h * 1.06, pr = h * 0.52
  blob(px, py, pr * 1.16, [[0, 'rgba(120,196,226,0.0)'], [0.86, 'rgba(120,196,226,0.34)'], [1, 'rgba(120,196,226,0)']])
  blob(px, py, pr, [[0, '#3f7fa8'], [0.55, '#2b5c80'], [0.82, '#16304a'], [1, '#0d1e30']])
  // two moons, well away from it, so no slice of the sky is dead
  blob(tileW * 0.62, h * 0.32, h * 0.085, [[0, '#c3cdd8'], [0.65, '#8f9aa8'], [1, '#5c6672']])
  blob(tileW * 0.88, h * 0.62, h * 0.034, [[0, '#9fb3c4'], [1, '#5a6874']])

  return c.toDataURL('image/png')
}

export function initObservatory(root) {
  build(root)
  active = true
  render()
  measure()

  // Fire a real question, so the waiting and typing states can actually be seen
  // rather than reasoned about. Deliberately behind its own flag: it costs a
  // round trip to the model every time it runs.
  if (location.hash === '#ask') setTimeout(() => {
    const inp = stage.querySelector('.st-prompt')
    inp.value = 'In one short sentence, what is the deepest pool on the watchlist?'
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    const peek = (t) => setTimeout(() => {
      const r = stage.querySelector('.st-reply')
      console.warn(`[ask ${t}ms] class="${r.className}" text="${(r.textContent||'').slice(0,90)}"`)
    }, t)
    peek(1200); peek(3500); peek(9000); peek(20000); peek(34000)
  }, 1500)

  if (location.hash === '#measure') setTimeout(() => {
    const r = (sel) => { const e = stage.querySelector(sel); if (!e) return null
      const b = e.getBoundingClientRect(); return { cx: +(b.left + b.width / 2).toFixed(1), w: +b.width.toFixed(1) } }
    console.warn('[measure]', JSON.stringify({
      bridge: r('.st-bridge'), hub: r('.st-hub'), globe: r('.st-globe'),
      canvas: r('.st-globe canvas'), facingArch: r('.st-portal.is-facing .st-portal-arch'),
      facingLight: r('.st-portal.is-facing .st-portal-light'), proj: r('.st-projector'),
    }))
    // What actually receives a click where the controls are? elementFromPoint is
    // the only thing that answers this: a transparent overlay looks like nothing
    // in the inspector and swallows every press.
    const hit = (sel) => {
      const e = stage.querySelector(sel); if (!e) return `${sel}: MISSING`
      const b = e.getBoundingClientRect()
      if (!b.width || !b.height) return `${sel}: ZERO-SIZE`
      const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
      return `${sel} -> ${t ? t.className || t.tagName : 'null'}`
    }
    // Does every instrument actually FIT its panel? The body clips, so anything
    // taller than its box is silently sliced off — a readout you cannot see.
    console.warn('[fit] ' + [...stage.querySelectorAll('.st-board')].map((b) => {
      const body = b.querySelector('.st-board-body')
      const over = body.scrollHeight - body.clientHeight
      return `${b.dataset.board}:${over > 1 ? 'CUT by ' + over + 'px' : 'ok'}`
    }).join('  '))

    console.warn('[hit] ' + ['.st-signin', '.st-prompt', '.st-projector-pane']
      .map(hit).join('  |  '))

    // Drive the caution panel from inside the page. Clicking a lamp is the whole
    // feature; asserting it works needs an actual click, which no amount of
    // reading the source provides.
    const labels = () => [...stage.querySelectorAll('.st-board')]
      .map((b) => `${b.dataset.board}:${b.querySelector('.st-label')?.textContent}`).join(' | ')
    const picks = stage.querySelectorAll('.st-lamp[data-ca]')
    console.warn(`[sel] selectable lamps: ${picks.length}`)
    console.warn('[sel] before: ' + labels())
    if (picks.length) {
      picks[0].click()
      setTimeout(() => {
        console.warn('[sel] after click: ' + labels())
        console.warn('[sel] lamp marked: ' + stage.querySelectorAll('.st-lamp.is-sel').length
          + ' | strip marked: ' + stage.querySelectorAll('.st-strip.is-sel').length)
        stage.querySelector('.st-lamp.is-sel')?.click()
        setTimeout(() => console.warn('[sel] after release: ' + labels()), 900)
      }, 900)
    }
  }, 1200)

  globe = mountGlobe(globeHost)
  if (!globe) globeHost.classList.add('is-fallback')
  else {
    // ⚠️ null means "not yet", never "failed" — condemning a globe that has not
    // had a frame yet replaces a working shader with a fallback on every slow
    // machine.
    setTimeout(() => {
      if (globe && globe.didDraw() === false) {
        globe.dispose(); globe = null
        globeHost.classList.add('is-fallback')
      }
    }, 400)
  }

  setNotice(window.mcii?.orb
    ? ''
    : 'The prompt under the globe is not wired yet — it needs an Anthropic API key. Everything else in this room runs without one.')

  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', measure)
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(document.body)
  if (window.mcii?.onRefreshed) window.mcii.onRefreshed(() => { if (active) refresh() })

  refresh()

  return {
    show: leave,
    hide: () => { stage.hidden = true; active = false },
    refresh,
    // The chrome above the room changes height when the tab bar comes and goes,
    // and the board wall is sized from what is left. Re-measure, then rebuild:
    // crossing BOARDS_MIN_ROOM changes how many boards there are, not just how
    // tall they are.
    remeasure: () => { measure(); refresh() },
    isActive: () => active,
  }
}
