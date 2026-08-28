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
} from './station-geometry.js'
import { mountGlobe } from './holo-globe.js'
import { snapshot, renderBoard } from './instruments.js'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

let stage, world, stars, hub, globeHost, smearHost, sill, colL, colR, notice
let globe = null
let door = homeIndex()
let navTimer = 0
let winId = '24h'
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
  root.innerHTML = `
    <div class="st-room st-room-bridge">
      <div class="st-bridge">

        <div class="st-beyond">
          <div class="st-beyond-world">
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
                       placeholder="talk to orion — your coins, your notes, the market…">
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
          <span class="st-sill-serial">MCII·OBS·R1</span>
        </div>

      </div>
    </div>`

  stage = root
  world = root.querySelector('.st-beyond-world')
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
      else { door = i; afterTurn() }
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
  hub.style.setProperty('--globe-d', `${globeSize(h)}px`)
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
  door = next
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
    backBtn().hidden = false
  }, TRAVEL_MS)
}

function leave() {
  stage.hidden = false
  stage.dataset.room = 'observatory'
  active = true
  backBtn().hidden = true
  measure()
  refresh()
}

let _back = null
function backBtn() {
  if (_back) return _back
  _back = document.createElement('button')
  _back.className = 'st-back'
  _back.type = 'button'
  _back.hidden = true
  _back.innerHTML = '← the observatory'
  _back.style.cssText = 'position:fixed;left:20px;bottom:20px;z-index:30;margin:0'
  _back.addEventListener('click', leave)
  document.body.appendChild(_back)
  return _back
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE INSTRUMENT WALL
   ═══════════════════════════════════════════════════════════════════════════ */
async function refresh() {
  const h = measure() || 900
  snap = await snapshot(winId)
  const boards = boardsFor(h)
  colL.replaceChildren(...boards.filter((b) => b.side === 'left').map((b) => renderBoard(b, snap)))
  colR.replaceChildren(...boards.filter((b) => b.side === 'right').map((b) => renderBoard(b, snap)))

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

/* ═══════════════════════════════════════════════════════════════════════════
   THE PROMPT — ask READS, log WRITES, and they never blur into each other.
   The globe's own state is the loading indicator; no spinner exists here.
   ═══════════════════════════════════════════════════════════════════════════ */
function wirePrompt(root) {
  const input = root.querySelector('.st-prompt')
  const reply = root.querySelector('.st-reply')
  const signin = root.querySelector('.st-signin')

  const say = (text, err) => {
    reply.className = `st-reply${err ? ' is-err' : ''}`
    reply.textContent = text
    reply.scrollTop = 0
  }

  // Three states, and they must never look like one another: no CLI installed,
  // installed but not signed in, and ready. The first two have different
  // answers and only one of them is a button.
  async function refreshAuth() {
    const s = await window.mcii?.orionStatus?.().catch(() => null)
    const installed = !!s?.installed
    const ready = !!s?.ready
    signin.hidden = !installed || ready
    input.disabled = !installed
    if (!installed) {
      input.placeholder = 'orion needs the claude cli'
      setNotice('Orion is not connected: the Claude CLI is not installed. In Terminal run  '
        + 'npm install -g @anthropic-ai/claude-code  then reopen the app. No API key, no billing '
        + '— it signs in with your own Claude account.')
    } else if (!ready) {
      input.placeholder = 'sign in to talk to orion'
      setNotice('Orion is installed but not signed in. Click "log in to anthropic" — it opens '
        + 'Terminal and your browser. The app never sees your account.')
    } else {
      input.placeholder = 'talk to orion — your coins, your notes, the market…'
      setNotice('')
    }
    return { installed, ready }
  }

  signin.addEventListener('click', async () => {
    signin.disabled = true
    await window.mcii?.orionLogin?.()
    say('A terminal is opening. Finish signing in there, then come back — I will check again.')
    // Poll rather than make them tell us: the sign-in finishes somewhere else.
    let tries = 0
    const t = setInterval(async () => {
      const s = await refreshAuth()
      if (s.ready || ++tries > 60) { clearInterval(t); signin.disabled = false; if (s.ready) say('Signed in. Ask me something.') }
    }, 2000)
  })

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
    say('')
    input.value = ''
    try {
      const res = await window.mcii.orionAsk(text)
      // ⚠️ A failure is REPORTED. A blank answer is indistinguishable from
      // "there is nothing to say", and the two must never look the same.
      if (res?.ok) say(res.reply)
      else if (res?.code === 'auth') { await refreshAuth(); say('Not signed in yet — use the button.', true) }
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
    if (e.key === 'Escape' && !backBtn().hidden) leave()
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
export function initObservatory(root) {
  build(root)
  active = true
  render()
  measure()

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
