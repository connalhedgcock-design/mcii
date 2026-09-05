/**
 * boot — mounts the Observatory into the real app.
 *
 * ⚠️ It mounts into the APPLICATION, not a bare test page. A harness where the
 * root element IS the viewport hides two whole classes of bug: `position:
 * absolute` resolves against the window rather than the pane, and WebGL fails
 * under different conditions. The room must be screenshotted in the real app.
 *
 * This file is the only seam between the station and app.js, and it is
 * deliberately one-way: the station never reaches into the app's internals, it
 * clicks the app's own tab buttons. app.js is a file two people are editing.
 */

import { initObservatory } from './station.js'
import { initWatchRoom } from './room-watch.js'
import { initMarketRoom } from './room-market.js'
import { initSectorRoom } from './room-sector.js'
import { initJournalRoom } from './room-journal.js'
import { initFolioRoom } from './room-folio.js'
import { initWarRoom } from './room-warroom.js'

const root = document.getElementById('observatory')
if (root) {
  const obs = initObservatory(root)

  // Five of the six doors got real rooms (see 70-AREAS/observatory/design —
  // pending). Each mounts into a NEW element next to the flat <main> it
  // replaces, never into the main itself: app.js's own load functions keep
  // populating that main exactly as before, so a bug in a room can only ever
  // affect that room, never the flat screen underneath it. FOMO/Axiom stay
  // flat outright — their content is a native, pixel-positioned view (see
  // venueRect() in app.js) that cannot take a spatial transform.
  const rooms = {
    watch:   initWatchRoom(document.getElementById('room-watch')),
    market:  initMarketRoom(document.getElementById('room-market')),
    sector:  initSectorRoom(document.getElementById('room-sector')),
    journal: initJournalRoom(document.getElementById('room-journal')),
    folio:   initFolioRoom(document.getElementById('room-folio')),
    // The War Room is the only room with no flat screen behind it — it is new,
    // not a rebuild of an existing tab. It therefore has no FLAT_MAIN_ID entry
    // either: there is nothing to hide when it shows.
    war:     initWarRoom(document.getElementById('room-war')),
  }
  const FLAT_MAIN_ID = { watch: 'grid', market: 'market', sector: 'sector', journal: 'journal', folio: 'folio' }

  // The app's tab bar drives it while the bar still exists. At gate 4 the bar
  // is deleted, this block goes with it, and the room becomes the landing view.
  const tabs = [...document.querySelectorAll('.tab')]
  const bar = document.querySelector('.tabs')
  let currentRoom = null
  // Set for exactly one paint() by the "open-flat" handler below, so a
  // room's detail link can land on the real flat screen instead of
  // bouncing straight back into the room that paint() would otherwise
  // reassert on the same tab click.
  let preferFlatOnce = false
  const paint = (view) => {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === view))
    const flat = view !== 'observatory'
    document.querySelectorAll('.search, #results, #alerts, #collhealth, .foot, main.grid, main.venue')
      .forEach((el) => { el.style.visibility = flat ? '' : 'hidden' })
    // The tab bar is exactly what the room replaces, so it is not shown inside
    // it — and reclaiming those 88px is what lets the full six-board wall fit on
    // a 900px screen. It comes straight back in the flat rooms, where it is
    // still how you get around.
    if (bar) bar.hidden = !flat
    if (window.observatory) window.observatory.remeasure()

    // Show this view's real room, if it has one, in place of the flat main —
    // and hide whichever room was showing before. The flat main behind a real
    // room is left running (app.js's own load() still fills it); it's simply
    // not the thing on screen.
    const room = preferFlatOnce ? null : rooms[view]
    preferFlatOnce = false
    // Compared against `room`, not `rooms[view]` — when a detail link forces
    // the flat view for the SAME view a room was just showing, `room` is
    // null while `rooms[view]` is still the room object, and comparing
    // against the latter would wrongly skip hiding it.
    if (currentRoom && currentRoom !== room) currentRoom.hide()
    const flatEl = document.getElementById(FLAT_MAIN_ID[view])
    if (room) {
      // `hidden`, not visibility: the flat main is full of real content (a
      // whole card list, a whole table) and switchView() just set it visible
      // a moment ago. Left merely invisible it still occupies its full
      // height in normal flow, shoving the room down behind a wall of blank
      // space — display:none is the only fix that actually removes it.
      if (flatEl) flatEl.hidden = true
      // The flat #alerts strip is watch-only (switchView shows it only for
      // v==='watch') and Your Coins' own room already carries an alerts
      // board of its own — leaving the old one up too put two differently
      // styled copies of the same alerts on screen at once, one above the
      // other. Its own room, its own alerts; not both.
      if (view === 'watch') { const old = document.getElementById('alerts'); if (old) old.style.display = 'none' }
      room.show()
      currentRoom = room
    } else {
      currentRoom = null
    }
  }

  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      if (t.dataset.view === 'observatory') { obs.show(); paint('observatory') }
      else if (obs.isActive()) { obs.hide(); paint(t.dataset.view) }
      else paint(t.dataset.view)
    })
  })

  // A room's link into ANOTHER room (today: "How was this read?" → the War
  // Room, carrying the coin). Same one-way rule as mcii:open-flat below: the
  // room dispatches an event, this file clicks the app's own tab. A room never
  // reaches into another room, or into app.js, directly.
  document.addEventListener('mcii:open-room', (e) => {
    const { view, ca } = e.detail || {}
    const tab = document.querySelector(`.tab[data-view="${view}"]`)
    if (!tab) return
    if (obs.isActive()) obs.hide()
    tab.click()
    if (ca && rooms[view]?.focus) rooms[view].focus(ca)
  })

  // A room's "detail" link asks for the exhaustive flat card (chart, social
  // panel, safety checklist) rather than reimplementing it — dispatched as an
  // event rather than the room reaching into app.js directly, same one-way
  // rule as everything else in this file.
  document.addEventListener('mcii:open-flat', (e) => {
    const { view, ca } = e.detail || {}
    const tab = document.querySelector(`.tab[data-view="${view}"]`)
    if (!tab) return
    if (obs.isActive()) obs.hide()
    preferFlatOnce = true
    tab.click()
    if (ca) {
      requestAnimationFrame(() => {
        const card = document.querySelector(`.card[data-ca="${ca}"]`)
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  })

  // ⚠️ Published BEFORE the first paint: paint() calls back into it to
  // re-measure, and on the very first call it would otherwise not exist yet —
  // leaving the room sized for chrome that is no longer on screen.
  window.observatory = obs

  // You land in the room. That is the product: getting to a screen is physical.
  paint('observatory')
}
