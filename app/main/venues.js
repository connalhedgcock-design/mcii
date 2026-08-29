const { WebContentsView, BrowserWindow, shell, session } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');

// The venue rooms: a real browser view of fomo.family / axiom.trade, inside the app.
//
// WHY A WebContentsView AND NOT AN IFRAME
// Both venues send `x-frame-options: DENY`/`SAMEORIGIN` and a `frame-ancestors` policy, so an
// iframe is refused outright -- and the app's own CSP (`default-src 'none'`) forbids framing
// anyway. A WebContentsView is a genuine top-level page owned by the main process, so those
// headers do not apply to it and neither policy has to be weakened.
//
// !! IT IS A NATIVE LAYER, NOT A DOM NODE. It floats ABOVE the page and cannot be occluded by
// CSS, z-index, or the Observatory's 3D stage. So it must be explicitly detached whenever it is
// not the thing being looked at -- leaving it attached paints it over the room. Everything about
// `hide()` below exists for that reason.
//
// HOW LOGIN WORKS, AND WHAT THIS APP NEVER TOUCHES
// The operator signs in on the venue's OWN page, exactly as they would in a browser. This app has
// no login form, never reads a credential field, and stores no password -- the same shape as
// Orion, which hands off to `claude auth login` and only ever asks for status afterwards. What
// persists is a session cookie in a partition keyed to the operator, so Austin and Connal each
// see their own account and neither one's session is ever written into the repo (which is public).

const VENUES = {
  fomo: {
    label: 'fomo',
    // Verified 2026-08-29: loads in a WebContentsView, HTTP 200, no bot challenge.
    url: 'https://fomo.family',
  },
  axiom: {
    label: 'axiom',
    // The operator's own URL, 2026-08-29.
    url: 'https://axiom.trade/discover?chain=sol&pulseChains=sol,robinhood,bnb'
       + '&trackerChains=sol,robinhood,bnb,eth',
    // !! DELIBERATELY NOT EMBEDDED, AND THIS IS NOT A BUG TO FIX.
    //
    // Measured 2026-08-29, same URL, same machine, same moment:
    //     Electron's own user agent -> HTTP 404 "RESOURCE NOT FOUND"
    //     a Chrome user agent       -> HTTP 200, the real Axiom app
    //
    // So Axiom's edge is refusing embedded browser views on purpose. That is a defence
    // worth respecting rather than defeating: wrapping a real trading site in a desktop webview is
    // exactly how wallet-drainer and credential-phishing apps are built, and a venue that blocks
    // it is protecting its users' funds from apps shaped like this one. Overriding the user agent
    // would work in about one line and is precisely why it is not done here.
    //
    // ! If a future session is tempted: don't. Setting a Chrome UA here circumvents an access
    // control the venue chose, likely breaches their terms, and trains the operators to trust a
    // trading terminal rendered inside third-party software -- the habit the block exists to stop.
    // The room opens Axiom in the real browser instead, where its own protections apply intact.
    //
    // What that means concretely: a REAL Chromium launched in app mode (`--app=<url>`), which
    // opens a chromeless window -- no tab strip, no omnibox -- so it reads as a window belonging
    // to this app without anything being faked. Unmodified user agent, the operator's own profile
    // and login. Verified 2026-08-29: the window opens and Axiom loads, title "Axiom".
    appMode: true,
    embeddable: false,
    why: 'Axiom answers 404 to anything that is not a real browser — a deliberate defence, since '
       + 'wrapping a trading site in a desktop webview is how drainer apps are built. So this door '
       + 'opens Axiom in a dedicated Chrome window: no tabs, no address bar, your own login.',
  },
};

const views = new Map();      // venueId -> WebContentsView
let attached = null;          // which venue is currently on screen, if any

const partitionFor = (id, owner) => `persist:venue-${id}-${owner || 'local'}`;

function configured(id) { return !!(VENUES[id] && VENUES[id].url); }
// Whether the venue may be drawn INSIDE the app, as opposed to handed to the system browser.
function embeddable(id) { return configured(id) && VENUES[id].embeddable !== false; }

// A venue page is ordinary untrusted web content. It gets no preload, no node, its own session,
// and no ability to ask for hardware.
function build(id, owner) {
  const part = partitionFor(id, owner);
  const sess = session.fromPartition(part);
  // Nothing in a trading page needs a camera or a microphone; refuse rather than prompt.
  sess.setPermissionRequestHandler((_wc, permission, cb) =>
    cb(['clipboard-sanitized-write'].includes(permission)));

  const view = new WebContentsView({
    webPreferences: {
      partition: part,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // ! deliberately no preload: the venue page must not be able to see window.mcii, which is
      // how the rest of the app talks to main.
    },
  });

  // OAuth and wallet flows genuinely need a popup, so one is allowed -- but as a real window in
  // the SAME session, never with node access, and only for http(s).
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (!/^https?:/i.test(url)) return { action: 'deny' };
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 520, height: 720, autoHideMenuBar: true,
        webPreferences: { partition: part, contextIsolation: true, nodeIntegration: false, sandbox: true },
      },
    };
  });

  // ⚠️ NO ALLOWLIST HERE, DELIBERATELY, AND DO NOT REINTRODUCE ONE.
  //
  // This used to send any "unrelated" host to the system browser to keep the room from becoming a
  // general-purpose browser. It broke login outright: signing in with Apple navigates to
  // appleid.apple.com, which was not on the list, so the whole auth flow was ejected into Safari.
  // The operator finished signing in there -- and the BROWSER ended up logged in while MCII sat on
  // a logged-out page, with nothing on screen explaining why.
  //
  // An auth allowlist cannot be maintained: Privy alone fronts Apple, Google, email, and several
  // wallets, each with their own redirect hosts, and every one we miss silently breaks sign-in the
  // same way. A browser room navigates where the page sends it. Only non-web schemes are refused;
  // leaving on purpose is what the "open in browser" button is for.
  view.webContents.on('will-navigate', (e, url) => {
    if (!/^https?:/i.test(url)) e.preventDefault();
  });

  return view;
}

// Put the venue on screen at the given rect (CSS px, relative to the window's content area).
function open(win, id, owner, bounds) {
  if (!win || win.isDestroyed()) return { ok: false, reason: 'no window' };
  if (!configured(id)) return { ok: false, reason: 'no url configured for this venue' };
  if (!embeddable(id)) return { ok: false, external: true, reason: VENUES[id].why };

  let view = views.get(id);
  const fresh = !view;
  if (fresh) { view = build(id, owner); views.set(id, view); }

  if (attached && attached !== id) hide(win, attached);
  if (attached !== id) { win.contentView.addChildView(view); attached = id; }
  setBounds(id, bounds);
  if (fresh) view.webContents.loadURL(VENUES[id].url).catch(() => {});
  return { ok: true, url: VENUES[id].url };
}

// Detached, NOT destroyed. Destroying would throw away the login and the scroll position every
// time you glance at another tab; detaching just stops it painting over everything else.
function hide(win, id) {
  const target = id || attached;
  if (!target) return { ok: true };
  const view = views.get(target);
  if (view && win && !win.isDestroyed()) {
    try { win.contentView.removeChildView(view); } catch {}
  }
  if (attached === target) attached = null;
  return { ok: true };
}

function setBounds(id, b) {
  const view = views.get(id);
  if (!view || !b) return;
  view.setBounds({
    x: Math.round(b.x || 0), y: Math.round(b.y || 0),
    width: Math.max(0, Math.round(b.width || 0)), height: Math.max(0, Math.round(b.height || 0)),
  });
}

function status(id) {
  const v = views.get(id);
  return {
    id, label: VENUES[id]?.label || id,
    configured: configured(id),
    embeddable: embeddable(id),
    appMode: !!VENUES[id]?.appMode,
    why: VENUES[id]?.why || null,
    url: VENUES[id]?.url || null,
    loaded: !!v && !v.webContents.isLoading(),
    currentUrl: v ? v.webContents.getURL() : null,
    attached: attached === id,
  };
}

function reload(id) { views.get(id)?.webContents.reload(); return { ok: true }; }
function goBack(id) {
  const wc = views.get(id)?.webContents;
  if (wc?.navigationHistory?.canGoBack()) wc.navigationHistory.goBack();
  return { ok: true };
}
function openExternal(id) {
  const v = views.get(id);
  const url = v ? v.webContents.getURL() : VENUES[id]?.url;
  if (url) shell.openExternal(url);
  return { ok: true };
}

// Chromium browsers, in preference order. `--app=` is a first-class Chromium flag, not a trick:
// it opens an ordinary browsing window with the tab strip and omnibox removed.
const APP_MODE_BROWSERS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

function openAppWindow(id) {
  const url = VENUES[id]?.url;
  if (!url) return { ok: false, reason: 'no url for this venue' };
  const bin = APP_MODE_BROWSERS.find((b) => { try { return fs.existsSync(b); } catch { return false; } });
  // No Chromium installed is not an error worth surfacing -- a normal tab is a worse frame but a
  // working one, and better than a complaint about a browser nobody asked to care about.
  if (!bin) { shell.openExternal(url); return { ok: true, mode: 'default-browser' }; }
  try {
    // detached + unref: the window outlives this app on purpose. Quitting MCII must never yank a
    // trading window away from someone mid-order.
    const child = spawn(bin, [`--app=${url}`], { detached: true, stdio: 'ignore' });
    child.unref();
    return { ok: true, mode: 'app-window', browser: bin.split('/').pop() };
  } catch (e) {
    shell.openExternal(url);
    return { ok: true, mode: 'default-browser', note: e.message };
  }
}

// Signing out is the venue's own business, but clearing the local session is ours -- and it is the
// only "logout" this app can honestly offer, since it never held a credential to begin with.
async function signOut(id, owner) {
  const view = views.get(id);
  if (view) { try { view.webContents.close(); } catch {} }
  views.delete(id);
  if (attached === id) attached = null;
  try { await session.fromPartition(partitionFor(id, owner)).clearStorageData(); } catch {}
  return { ok: true };
}

module.exports = { VENUES, open, hide, setBounds, status, reload, goBack, openExternal, openAppWindow, signOut, configured, embeddable };
