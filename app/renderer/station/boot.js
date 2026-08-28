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

const root = document.getElementById('observatory')
if (root) {
  const obs = initObservatory(root)

  // The app's tab bar drives it while the bar still exists. At gate 4 the bar
  // is deleted, this block goes with it, and the room becomes the landing view.
  const tabs = [...document.querySelectorAll('.tab')]
  const bar = document.querySelector('.tabs')
  const paint = (view) => {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === view))
    const flat = view !== 'observatory'
    document.querySelectorAll('.search, #results, #alerts, #collhealth, .foot, main.grid')
      .forEach((el) => { el.style.visibility = flat ? '' : 'hidden' })
    // The tab bar is exactly what the room replaces, so it is not shown inside
    // it — and reclaiming those 88px is what lets the full six-board wall fit on
    // a 900px screen. It comes straight back in the flat rooms, where it is
    // still how you get around.
    if (bar) bar.hidden = !flat
    if (window.observatory) window.observatory.remeasure()
  }

  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      if (t.dataset.view === 'observatory') { obs.show(); paint('observatory') }
      else if (obs.isActive()) { obs.hide(); paint(t.dataset.view) }
      else paint(t.dataset.view)
    })
  })

  // ⚠️ Published BEFORE the first paint: paint() calls back into it to
  // re-measure, and on the very first call it would otherwise not exist yet —
  // leaving the room sized for chrome that is no longer on screen.
  window.observatory = obs

  // You land in the room. That is the product: getting to a screen is physical.
  paint('observatory')
}
