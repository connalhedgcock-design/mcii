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
                <button class="st-mode is-on" data-mode="ask">ask</button>
                <button class="st-mode" data-mode="log">log</button>
                <input class="st-prompt" type="text" autocomplete="off"
                       placeholder="ask about your coins, your notes, the market…">
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
  // The stage sits under the app's real chrome. Measuring it rather than
  // hard-coding an offset means the room stays put when the header changes.
  const tabs = document.querySelector('.tabs')
  const top = tabs ? Math.round(tabs.getBoundingClientRect().bottom) : 0
  stage.style.setProperty('--st-top', `${Math.max(0, top)}px`)

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
  let mode = 'ask'

  root.querySelectorAll('.st-mode').forEach((b) => {
    b.addEventListener('click', () => {
      mode = b.dataset.mode
      root.querySelectorAll('.st-mode').forEach((x) => x.classList.toggle('is-on', x === b))
      input.placeholder = mode === 'ask'
        ? 'ask about your coins, your notes, the market…'
        : 'what happened? this gets written to your notes.'
    })
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
    if (!window.mcii?.orb) {
      reply.className = 'st-reply is-err'
      reply.textContent = 'The prompt is not wired up yet — it needs an Anthropic API key. '
        + 'Everything else in this room works without one.'
      return
    }
    inFlight = true
    globe?.setState('working')
    reply.className = 'st-reply'
    reply.textContent = ''
    input.value = ''
    try {
      const res = await window.mcii.orb(mode, text)
      // ⚠️ A failure is REPORTED. A blank answer is indistinguishable from
      // "there is nothing to say", and the two must never look the same.
      reply.className = res?.ok ? 'st-reply' : 'st-reply is-err'
      reply.textContent = res?.ok ? res.reply : (res?.error || 'that did not go through.')
    } catch (err) {
      reply.className = 'st-reply is-err'
      reply.textContent = String(err?.message || err)
    } finally {
      inFlight = false
      globe?.setState(document.activeElement === input ? 'listening' : 'idle')
    }
  })
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
    isActive: () => active,
  }
}
