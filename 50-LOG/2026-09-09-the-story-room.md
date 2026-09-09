---
id: log.the-story-room-2026-09-09
t: log
v: 1
upd: 2026-09-09
machine: connal
---
# THE STORY — paste-an-address narrative lookup — BUILD

Built on Connal's direct request in chat, after walking through the manual version by hand for
one real coin: `0xd270D4e1EC6e6E0d28C0ecB8BE966EC75997FFfF` resolved to **4Stock**, a genuine BSC
tokenized-stock product (Four.meme), not lore — confirmed against Gate's own listing page before
trusting the name. He then asked to build the manual process into the app.

## WHAT IT IS

A new door, "The Story" (`app/renderer/station/room-story.js`), same shape as the War Room — no
flat screen behind it, reachable only from the tab bar, not the Observatory ring
(`station-geometry.js`'s `DOORS` was deliberately left untouched). Paste any contract address in,
get back:
1. what the coin actually is — name, symbol, chain, price, market cap — via `dexscreener.fetchMarket`,
   the same multichain resolver `tokens:refresh` already uses.
2. whatever real news already exists under that name — `app/main/narrative.js: lookupNarrative()`,
   wired through `ipcMain.handle('narrative:lookup', ...)` and `preload.js: narrativeLookup`.

Every result carries `confirmed: false`, same discipline as `collectSelfNameNews` — a name match
is not a verified link, and the room's own text says so.

## TWO REAL BUGS FOUND BY CHECKING LIVE, NOT ASSUMED

1. **`looksCryptoRelated` (newsfeed.js's crypto-context-word filter) rejected 10 of 10 real 4Stock
   headlines.** First draft reused it, on the theory that an unvetted name search should get the
   same caution `collectSelfNameNews` uses. Checked live: every real hit (KuCoin/MEXC/Cryptonomist
   coverage) failed the filter on a technicality — "Tokenized" doesn't match `\btoken\b`, "KuCoin"
   doesn't match `\bcoin\b`, "Meme 币" doesn't match "meme coin". ∴ dropped the filter for this
   path. Not the same situation the filter was built for: `collectSelfNameNews` starts from a bare
   watchlist symbol with zero proof it names a real coin; this starts from an address already
   confirmed to trade on a real pool — stronger identity evidence than a symbol string, so the
   filter would only have thrown away real results here, never caught a false one.
2. **Dropping that filter reopened the exact collision problem it exists to prevent, for common
   short names.** Querying bare `"CATE"` for Catecoin returned 10 headlines, 8 actually about Cate
   Blanchett and unrelated people/places — the same namesake-collision D-72's bare-ticker rule and
   `resolve.js`'s ticker-collision machinery already guard against elsewhere. Fix: query the full
   resolved NAME only ("Catecoin"), never the bare symbol/ticker alongside it. Re-checked live:
   same real coverage, zero collisions. Symbol is used only when it equals the name already (e.g.
   "4Stock" has no separate longer name).
3. (minor, same session) `fetchNewsForQuery`'s items carry a `ts` field (epoch ms), not `pubDate` —
   the first draft of both `narrative.js`'s sort and `room-story.js`'s "how long ago" read the
   wrong field name (`item.pubDate`, undefined). Fixed to `item.ts` in both places, and in the
   `mock-mcii.js` stub used by the visual test harness.

## VERIFIED

Live, both directions: 4Stock (distinctive name) → 10/10 relevant. Catecoin (common name,
documented collision risk) → 10/10 relevant, zero Cate-Blanchett hits, after the name-only fix.
Invalid address → throws `token not found in any pool`, surfaced as plain text in the room, not a
crash. `npm test`: 330 passed, 0 failed, before and after.

! NOT verified inside the real Electron shell — this sandbox's browser preview renders
`test.html` as an inert static snapshot (no script execution), so the UI was checked by reading
the rendered logic and by running `lookupNarrative()` directly against real addresses over the
real network, not by clicking through the actual window. Worth a real click-through next time the
app is open on a machine that can run it.
