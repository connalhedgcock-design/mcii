// On-demand "what's the story on this coin" lookup, built 2026-09-09 on Connal's request after
// walking through the manual version by hand for one real coin (4Stock, a BSC tokenized-stock
// product, not lore — confirmed live against Gate's own listing page before trusting the name).
//
// Two steps, both reusing machinery already built rather than new logic:
//   1. resolve the pasted address to a real name/symbol/chain via dexscreener.fetchMarket — the
//      same multichain resolver `tokens:refresh` already uses, so an EVM address works exactly
//      like a Solana one (see dexscreener.js's own CASHCAT comment on why the fallback exists).
//   2. run that name/symbol through the same Google News RSS search `collectSelfNameNews` uses
//      for the watchlist sweep (`newsfeed.js`) — just on demand, for one address.
//
// ! DELIBERATELY does NOT apply `looksCryptoRelated`, the crypto-context-word filter
// collectSelfNameNews uses. Checked live 2026-09-09 against a real case (4Stock, a genuine BSC
// token): that filter rejected all 10 of 10 real, on-topic headlines (KuCoin/MEXC/Cryptonomist
// coverage), because none of them happened to contain one of the filter's exact whole words
// ("token" doesn't match inside "Tokenized", "coin" doesn't match inside "KuCoin", "meme coin"
// doesn't match "Meme 币"). That filter exists to catch a DIFFERENT problem — collectSelfNameNews
// starts from a bare watchlist symbol with no proof it names a real coin at all (its own header
// cites "microduck" the coin vs. an unrelated Hugging Face robot). This function starts from an
// address ALREADY confirmed to trade on a real pool via fetchMarket — much stronger identity
// evidence than a symbol string — so the crypto-context filter would only throw away real results
// here, not catch a false one. `confirmed: false` stays regardless: a name match is still not a
// verified link, and the room's own UI says so.
const { fetchMarket } = require('./adapters/dexscreener');
const { fetchNewsForQuery } = require('./adapters/newsfeed');
const signalstore = require('./signalstore');

async function lookupNarrative(ca) {
  const market = await fetchMarket(ca); // throws "token not found in any pool" etc -- let it propagate
  const { name, symbol, chain, priceUsd, marketCap, info } = market;

  // Only the full resolved NAME, never the bare symbol/ticker on its own. Checked live 2026-09-09
  // against a real case (CATE/Catecoin): searching bare "CATE" returned 10 headlines, 8 of them
  // actually about Cate Blanchett and other unrelated people/places sharing the fragment "Cate" --
  // exactly the namesake-collision problem D-72's bare-ticker rule and `resolve.js`'s
  // ticker-collision machinery already exist to avoid elsewhere in this app. Searching "Catecoin"
  // (the full name) instead returned the same real coverage with zero collisions. `symbol` is
  // used ONLY when it equals `name` already (e.g. "4Stock" has no separate longer name) -- never
  // added as a second, shorter, more ambiguous query alongside it.
  const queries = [...new Set([name || symbol].filter(Boolean))];
  const seen = new Set();
  const items = [];
  for (const q of queries) {
    let hits;
    try { hits = await fetchNewsForQuery(`"${q}"`, { limit: 10 }); }
    catch { continue; } // one query failing does not fail the lookup, same partial-tolerance rule as elsewhere
    for (const item of hits) {
      const key = item.link || item.title;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }
  items.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  const result = { ca, name, symbol, chain, priceUsd, marketCap, info, items: items.slice(0, 12), confirmed: false };

  // Record that the lookup happened, so there's a real history to check back against later --
  // never scored, never fed into admission.js/synthesis.js (a name match is not confirmed
  // evidence, same discipline as collectSelfNameNews). A failure here must never break the
  // lookup itself, which is why it's swallowed rather than propagated.
  try {
    signalstore.record({
      kind: 'narrative-lookup', ca, sym: symbol,
      reasons: [`looked up "${name || symbol}" and found ${result.items.length} headline(s) under that name`],
      evidence: { name, chain, itemCount: result.items.length, hasProjectInfo: !!info },
      source: 'story-room',
    });
  } catch { /* logging the lookup is best-effort, never blocks the result */ }

  return result;
}

module.exports = { lookupNarrative };
