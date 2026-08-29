---
id: area.j7tracker.readme
t: area-readme
v: 1
upd: 2026-08-29
machine: connal
---
# J7 TRACKER — embedded window, not a data source

## WHAT THIS IS
`j7tracker.io` embedded inside the **What's happening** tab (`renderer/index.html`'s `#sector`,
inside a `.j7card`), a plain `<webview>` pointed at the live site. Not an adapter, not an API
integration, not something MCII reads or reasons about — a bookmark with a frame around it, open
automatically whenever that tab is open, so Connal does not have to alt-tab. Kept as a sibling of
`#sectorbody` (the div `loadSector()` actually rewrites) rather than inside it, specifically so
switching to this tab never reloads or signs the embed out — see the comment in `index.html`.

## WHY NOT A REAL INTEGRATION (read before reviving this)
Connal first asked for J7 Tracker to be wired in as a data source — pulled into the app the way
DexScreener or RugCheck are. Investigated before building anything, because the request happened
right after Connal set up a Phantom wallet specifically "to add a wallet to J7" and got stuck
trying to find its private key — a sequence worth stopping and checking, given this app exists
precisely to catch things that look like that.

What the investigation found, from a screenshot of the actual site (this session cannot browse the
web — network egress is allowlisted and j7tracker.io is not on it):
- The page is **Deploy Settings → Wallets**. It is a token DEPLOYMENT platform — "Create" a token,
  "Deploy Settings", per-wallet deploy keys, AI-suggested tickers, affiliate/referral tracking.
  Built for launching new memecoins fast, not for researching ones that already exist.
- The "API key" Connal was given decodes (it is base64) to a **Fernet-encrypted token**
  (`gAAAAAB...` prefix) scoped to one specific deploy wallet on their platform — not a plain
  read-only API token of the kind every other adapter in this app uses.
- Their own marketing: sub-10ms token deployment, sub-200ms social tracking for "new coin
  runners". That is sniper/launcher framing, the direct opposite of D-20/D-36 (this project
  deliberately ignores anything under 2 hours old — millisecond entry from a laptop is unwinnable,
  and the whole design slows decisions down rather than racing them).

None of that proves malice. It does mean: this is not a data provider, the credential it hands out
is not a normal API key, and integrating its deploy API into MCII's own analysis would contradict
D-08 (no trading, ever) at the architecture level, not just in spirit.

## RESOLUTION
- Confirmed no external wallet secret was ever exposed — Connal created a wallet ON J7's own
  platform, never connected an external Phantom wallet or entered its seed phrase anywhere.
- Landed on the smallest thing that satisfies the actual want (a quick way to reach the tool from
  inside MCII) without pulling an untrusted deploy credential into the app: an embedded `<webview>`
  tab. It gets **no preload script** — no `window.mcii` bridge, no IPC, nothing MCII does or knows
  reaches that page, same as a separate browser tab. `webviewTag: true` is scoped to this one
  purpose in `main/index.js`'s `webPreferences`; the main renderer keeps `nodeIntegration: false`,
  `contextIsolation: true`, `sandbox: true` throughout.

## IF THIS COMES UP AGAIN
- Any J7 "API key" is a deploy-wallet credential, not a general data key. Do not store it, do not
  put it in `.env`, do not wire it into an adapter, until proven otherwise from real docs (which
  were never located — only the Wallets/Deploy Settings page was seen).
- If Connal specifically wants their social-tracking read data (not deployment) as a chatter
  source alongside the X sweep, that would need a *different*, read-only credential and a real
  request/response example before any code gets written — same bar as every other adapter.
