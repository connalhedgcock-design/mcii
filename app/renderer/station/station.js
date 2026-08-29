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
    // Never so low that it collides with the sill.
    const maxY = box.height - 96
    hub.style.setProperty('--proj-y', `${Math.round(Math.min(projY, maxY))}px`)
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
  _back.textContent = '← observatory'
  // Explicit and compact. Inheriting the room's .st-back sizing here produced a
  // slab floating over the flat views; this is a control, not a panel.
  _back.style.cssText = [
    'position:fixed', 'left:14px', 'bottom:14px', 'z-index:30', 'margin:0',
    'width:auto', 'height:auto', 'padding:5px 10px', 'line-height:1.2',
    'font-size:11px', 'letter-spacing:0.06em', 'border-radius:4px',
    'border:1px solid rgba(150,170,195,.34)', 'background:rgba(18,24,33,.94)',
    'color:#AEBAC7', 'cursor:pointer', 'font-family:inherit',
  ].join(';')
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

  // ⚠️ Readiness cannot be probed: the CLI keeps credentials in the Keychain, so
  // there is no file to look at. So the button is OFFERED whenever the CLI is
  // present and we have not yet had a real answer — never hidden behind a guess
  // that could be wrong in the direction that blocks the user.
  let confirmed = false
  async function refreshAuth() {
    const st = await window.mcii?.orionStatus?.().catch(() => null)
    const installed = !!st?.installed
    signin.hidden = !installed || confirmed
    input.disabled = !installed
    if (!installed) {
      input.placeholder = 'orion needs the claude cli'
      setNotice('Orion is not connected: the Claude CLI is not installed. In Terminal run  '
        + 'npm install -g @anthropic-ai/claude-code  then reopen the app. No API key and no '
        + 'billing — it signs in with your own Claude account.')
    } else {
      input.placeholder = 'talk to orion — your coins, your notes, the market…'
      setNotice(confirmed ? '' : 'Orion is installed. If it says you are not signed in, use '
        + '"log in to anthropic" — it opens a terminal, and the app never sees your account.')
    }
    return installed
  }

  signin.addEventListener('click', async () => {
    signin.disabled = true
    const r = await window.mcii?.orionLogin?.()
    say(r && r.ok === false
      ? 'Could not open a terminal. Open one yourself and run:  claude  then /login'
      : 'A terminal is opening. Type  /login  there and follow the browser. '
        + 'Come back when it is done and just ask me something.')
    signin.disabled = false
  })

  // Coming back from the terminal is the moment to re-check, and it costs
  // nothing: the user has almost certainly just changed the thing we are asking
  // about.
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
    say('')
    input.value = ''
    try {
      const res = await window.mcii.orionAsk(text)
      // ⚠️ A failure is REPORTED. A blank answer is indistinguishable from
      // "there is nothing to say", and the two must never look the same.
      if (res?.ok) { confirmed = true; signin.hidden = true; setNotice(''); say(res.reply) }
      else if (res?.code === 'auth') {
        confirmed = false
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
    console.warn('[hit] ' + ['.st-signin', '.st-prompt', '.st-projector-pane']
      .map(hit).join('  |  '))
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
