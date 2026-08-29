---
id: area.j7tracker.log
t: area-log
v: 1
upd: 2026-08-29
machine: connal
---
# J7 TRACKER — log (append-only)

## 2026-08-29 — 1. ASKED TO INTEGRATE, INVESTIGATED FIRST, LANDED ON AN EMBEDDED WINDOW
- machine: connal
- Connal: "i want to get j7 tracker into the app" — no detail on what it does. Description he
  pasted back described "sub-10ms server-side token deployment", "social-media and Twitter
  tracking under 200ms", and "regional deploy APIs for creating and managing crypto tokens" —
  sniper/launcher framing, flagged immediately as likely in tension with D-08 (no trading, ever)
  and D-20/D-36 (no sniping, nothing under 2h old).
- Connal pushed back on the concern: "i want you to simply integrate it i appreicate your feedback
  but we need this." Respected — asked for real API details instead of guessing a schema, since
  neither this session nor the running app can reach j7tracker.io (network egress here is
  allowlisted and does not include it).
- ! separately, mid-conversation: Connal said he'd set up a Phantom wallet "so that i can add a
  wallet to j7 tracker" and was having trouble finding the private key. Stopped everything to warn
  against ever pasting a private key or seed phrase into a website — no exceptions, no undo.
  Resolved: he'd misunderstood the flow. The wallet J7 wanted was created ON their own platform,
  not an external Phantom wallet — no external key was ever exposed. Confirmed no funds were at
  risk either way (wallet was empty).
- Connal pasted an "API key" from the site. Decoded it (it's base64): `gAAAAAB...` — the signature
  of a Fernet-encrypted token, not a plain opaque key. Declined to use it as-is.
- Connal then sent a screenshot of the actual page: **Deploy Settings → Wallets**. Confirmed
  directly, not inferred from marketing copy: this is a token-deployment tool. "Create" button,
  per-wallet deploy API keys (the encrypted-looking key was scoped to one specific 0-SOL wallet on
  the page), AI-suggested tickers, X dev accounts, affiliate/referral tracking. The opposite of
  what MCII analyzes — a tool for LAUNCHING coins, not researching ones that exist.
- Asked Connal directly what he wanted given this. He asked instead for the smallest version of
  the original request: a section in the app that opens J7 Tracker as a window inside MCII,
  connected to his own account there — not a data integration. First cut added it as its own tab;
  Connal corrected that too: "i want it to automatically open within the whats happening tab" —
  not a separate destination, embedded in `sector` so it's just there.
- ✓ shipped: a plain `<webview>` inside a `.j7card` in `#sector`, kept OUTSIDE the `#sectorbody`
  div that `loadSector()` rewrites on every visit — otherwise switching to the tab would reload the
  embed (and its login) every single time. No preload script reaches it — it gets no `window.mcii`,
  no IPC, nothing MCII itself knows or does is visible to that page, same isolation a separate
  browser tab would have. `webviewTag: true` added to the main window's `webPreferences`, scoped to
  this one purpose; `nodeIntegration: false` / `contextIsolation: true` / `sandbox: true` untouched
  everywhere else.
- tests: full suite (30 across the app, +6 station) still green after the change — nothing about
  the webview tab is covered by an automated test (it is a live third-party page; nothing to
  assert against from here), so this was verified by reading the wiring, not by a passing check.

## OPEN
- Never wire a J7 "API key" into an adapter — it is a deploy-wallet credential, not read data.
- If Connal later wants their social-tracking feed specifically (not deployment) as a chatter
  source, that is a different, unbuilt thing requiring real read-only API docs first.
