---
id: area.j7tracker.readme
t: area-readme
v: 1
upd: 2026-08-29
machine: connal
---
# J7 TRACKER — a link, not a data source or an embedded window

## WHAT THIS IS
A plain link to `j7tracker.io`, shown as a card at the bottom of the **What's happening** tab
(`renderer/app.js: loadSector()`). Opens in the operator's real browser. Not an adapter, not an
API integration, not something MCII reads or reasons about.

## IT WAS AN EMBEDDED WINDOW FIRST — DOES NOT WORK, DO NOT RETRY WITHOUT NEW INFORMATION
First built as a `<webview>` (Electron's in-app browser tag) so it would open inside MCII directly.
**Removed 2026-08-29 — do not re-add without a real reason to think the underlying problem has
changed.** Full attempt, root cause, and both things tried are in `LOG.md` entry 2; the short
version: J7's own Cloudflare bot-check (Turnstile) detects the embedded window as non-standard and
blocks it from ever loading past their challenge screen. A normal-Chrome `useragent` override (the
standard, well-known mitigation for this exact situation) did not clear it either — confirmed from
the guest page's own console output, not assumed. This is Cloudflare correctly doing the thing it
exists to do; it is not a bug in MCII, and chasing further Electron-fingerprinting workarounds
against a system built specifically to catch them is not a good use of time. The link is the answer.

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
- No credential of any kind is stored or used by MCII for this. What shipped is a link.

## IF THIS COMES UP AGAIN
- Any J7 "API key" is a deploy-wallet credential, not a general data key. Do not store it, do not
  put it in `.env`, do not wire it into an adapter, until proven otherwise from real docs (which
  were never located — only the Wallets/Deploy Settings page was seen).
- Do not re-attempt an embedded `<webview>` for this without a real reason to think Cloudflare's
  block has changed — see the section above and `LOG.md` entry 2.
- If Connal specifically wants their social-tracking read data (not deployment) as a chatter
  source alongside the X sweep, that would need a *different*, read-only credential and a real
  request/response example before any code gets written — same bar as every other adapter.
