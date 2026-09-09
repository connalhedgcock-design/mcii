// The live trading HUD's window -- a small, always-on-top, frameless BrowserWindow, not a browser
// extension. Weighed directly against a real extension (Connal asked for the comparison): his
// trading venues run in his normal browser, and an OS-level "always on top" window floats above
// ANY app including that browser, so it doesn't need to be injected into the venue's own page to
// stay visibly present while he trades. A real extension only earns its cost if the HUD had to be
// pixel-anchored inside the venue's own chart, which wasn't asked for -- and it would trade this
// project's proven weak spot (parsing a third-party page that changes without notice: D-60/D-63/
// D-85) for a stronger one (reading MCII's own already-fetched, already-labelled data).
//
// One window, one pinned coin at a time -- "a new small window, not a new subsystem" per the plan.
// Pinning a different coin replaces what the same window shows rather than opening a second one.

const { BrowserWindow } = require('electron');
const path = require('path');

let win = null;
let pinnedCa = null;

function ensureWindow() {
  if (win && !win.isDestroyed()) return win;
  win = new BrowserWindow({
    width: 380, height: 620, minWidth: 320, minHeight: 420,
    frame: false, alwaysOnTop: true, resizable: true, movable: true,
    backgroundColor: '#0B0E13', hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  // 'floating' keeps it above ordinary windows without joining the small set of levels that
  // outrank full-screen apps/spaces on macOS -- this is meant to sit over a browser tab, not
  // fight the OS for top-of-everything.
  win.setAlwaysOnTop(true, 'floating');
  win.loadFile(path.join(__dirname, '..', 'renderer', 'hud', 'index.html'));
  win.on('closed', () => { win = null; pinnedCa = null; });
  return win;
}

/** Show the HUD (creating it if needed) and point it at `ca`. Safe to call repeatedly -- pinning
 *  the coin already shown just refreshes focus, pinning a new one swaps the window's content. */
function pin(ca) {
  if (!ca) return { ok: false, reason: 'no coin address given' };
  pinnedCa = ca;
  const w = ensureWindow();
  const send = () => w.webContents.send('hud:coin', ca);
  if (w.webContents.isLoading()) w.webContents.once('did-finish-load', send);
  else send();
  if (w.isVisible()) w.focus(); else w.show();
  return { ok: true };
}

function unpin() {
  pinnedCa = null;
  if (win && !win.isDestroyed()) win.close();
  return { ok: true };
}

function current() { return pinnedCa; }

module.exports = { pin, unpin, current };
