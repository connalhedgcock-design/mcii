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
  const paint = (view) => {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === view))
    const flat = view !== 'observatory'
    document.querySelectorAll('.search, #results, #alerts, #collhealth, .foot, main.grid')
      .forEach((el) => { el.style.visibility = flat ? '' : 'hidden' })
  }

  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      if (t.dataset.view === 'observatory') { obs.show(); paint('observatory') }
      else if (obs.isActive()) { obs.hide(); paint(t.dataset.view) }
      else paint(t.dataset.view)
    })
  })

  // You land in the room. That is the product: getting to a screen is physical.
  paint('observatory')
  window.observatory = obs
}
