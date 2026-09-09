// On-demand "what's the story on this coin" lookup, built 2026-09-09 on Connal's request after
// walking through the manual version by hand for one real coin (4Stock, a BSC tokenized-stock
// product, not lore — confirmed live against Gate's own listing page before trusting the name).
//
// Steps, all reusing machinery already built rather than new logic:
//   1. resolve the pasted address to a real name/symbol/chain via dexscreener.fetchMarket — the
//      same multichain resolver `tokens:refresh` already uses, so an EVM address works exactly
//      like a Solana one (see dexscreener.js's own CASHCAT comment on why the fallback exists).
//   2. run that name/symbol through the same Google News RSS search `collectSelfNameNews` uses
//      for the watchlist sweep (`newsfeed.js`) — just on demand, for one address.
//   3. Extended 2026-09-09b: a coin's real story mostly doesn't live in the news at all -- most
//      memecoins have never been covered by anything Google News indexes. Three more reads, run
//      alongside the news search rather than after it, each independently fault-tolerant:
//        - a single on-demand X search (reusing twitterapi.js's queriesFor()/searchPosts(), never
//          called from a sweep before) -- raw posts, no score, no sentiment number, same
//          confirmed:false treatment as the news section. This is a one-time, human-triggered
//          search for ONE coin, not the "broad mood tracking" D-122 killed -- see 50-LOG/
//          decisions.md and the 2026-09-09b log entry for the reasoning Connal signed off on.
//        - pump.fun's own coin description, for coins launched there (adapters/pumpfun.js)
//        - DexScreener boost status: is this coin's visibility currently paid-for or organic
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
const path = require('path');
const fs = require('fs');
const { fetchMarket, checkBoost } = require('./adapters/dexscreener');
const { fetchNewsForQuery } = require('./adapters/newsfeed');
const { fetchPumpFunInfo } = require('./adapters/pumpfun');
const tw = require('./adapters/twitterapi');
const signalstore = require('./signalstore');

async function lookupNews(name, symbol) {
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
  return items.slice(0, 12);
}

// Spend on the shared X adapter is process-local by default (twitterapi.js keeps it in a module
// variable), but this app also runs the collector as a separate process that spends against the
// same $/mo cap. Round-tripping through data/x-spend.json -- the same file cloud-collect.js
// already reads and writes -- is how the desktop process sees what's already been spent before
// deciding whether it can afford this lookup, and leaves its own spend somewhere the next process
// to start will see it too.
const X_SPEND_FILE = path.join(__dirname, '..', '..', 'data', 'x-spend.json');
function syncXSpendFromDisk() {
  try { tw.loadSpend(JSON.parse(fs.readFileSync(X_SPEND_FILE, 'utf8'))); }
  catch { /* first run, or the file is mid-write elsewhere -- start from whatever this process has */ }
}
function persistXSpend() {
  try {
    fs.mkdirSync(path.dirname(X_SPEND_FILE), { recursive: true });
    fs.writeFileSync(X_SPEND_FILE, JSON.stringify(tw.budget(), null, 2));
  } catch { /* best-effort, matches cloud-collect.js's own handling of this same file */ }
}

// Small caps, one-time per click -- never a sweep, never repeated on a timer. ~35 posts costs
// about half a cent against the $24/mo cap the rest of the app's X usage already shares (D-90).
const X_ADDR_MAX_POSTS = 20;    // address match -- the trustworthy query, can't collide with another coin
const X_CASHTAG_MAX_POSTS = 15; // cashtag match -- can collide across coins sharing a ticker

async function lookupXPosts({ ca, symbol }) {
  if (!process.env.TWITTERAPI_KEY) {
    return { posts: [], truncated: false, skipped: true, reason: 'X search is not configured on this machine (no TWITTERAPI_KEY)' };
  }
  tw.configure({ key: process.env.TWITTERAPI_KEY, monthlyCapUsd: Number(process.env.X_MONTHLY_CAP_USD || 24) });
  syncXSpendFromDisk();

  let b = tw.budget();
  if (b.remainingUsd <= 0 || b.postsRemaining < 1) {
    return {
      posts: [], truncated: false, skipped: true,
      reason: `monthly X search budget reached ($${b.usd.toFixed(2)}/$${b.capUsd} used this month)`,
      budget: b,
    };
  }

  const queries = tw.queriesFor({ ca, symbol }); // [{ q, weight, kind: 'address'|'cashtag' }]
  const desiredMax = { address: X_ADDR_MAX_POSTS, cashtag: X_CASHTAG_MAX_POSTS };
  const seen = new Set();
  const posts = [];
  let truncated = false;
  const errors = [];

  for (const query of queries) {
    b = tw.budget(); // re-check between queries -- the first one may have spent what was left
    if (b.postsRemaining < 1) { truncated = true; break; }
    const cap = Math.min(desiredMax[query.kind] || 15, b.postsRemaining);
    try {
      const r = await tw.searchPosts(query.q, { maxPosts: cap });
      truncated = truncated || r.truncated;
      for (const p of r.posts) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        posts.push({
          text: p.text, handle: p.handle, url: p.url, createdAt: p.createdAt,
          likes: p.likes, replies: p.replies, reposts: p.reposts, views: p.views,
          engagementRate: p.engagementRate,
          followers: p.author?.followers ?? null, verified: !!p.author?.verified,
          kind: query.kind, // which query found it -- address is the stronger match
        });
      }
    } catch (e) {
      // one query failing does not fail the other -- same partial-tolerance rule as the news loop
      errors.push(`${query.kind}: ${e.message}`);
    }
  }
  posts.sort((a, b2) => (b2.createdAt || 0) - (a.createdAt || 0));
  persistXSpend();

  return {
    posts, truncated, skipped: false,
    reason: (!posts.length && errors.length) ? `X search failed: ${errors.join('; ')}` : null,
    budget: tw.budget(),
  };
}

async function lookupNarrative(ca) {
  const market = await fetchMarket(ca); // throws "token not found in any pool" etc -- let it propagate
  const { name, symbol, chain, priceUsd, marketCap, info } = market;

  const [items, xPosts, pumpfun, boost] = await Promise.all([
    lookupNews(name, symbol),
    lookupXPosts({ ca, symbol }),
    chain === 'solana' ? fetchPumpFunInfo(ca).catch(() => null) : Promise.resolve(null),
    checkBoost(ca, chain).catch(() => null),
  ]);

  const result = { ca, name, symbol, chain, priceUsd, marketCap, info, items, xPosts, pumpfun, boost, confirmed: false };

  // Record that the lookup happened, so there's a real history to check back against later --
  // never scored, never fed into admission.js/synthesis.js (a name match is not confirmed
  // evidence, same discipline as collectSelfNameNews). A failure here must never break the
  // lookup itself, which is why it's swallowed rather than propagated.
  try {
    signalstore.record({
      kind: 'narrative-lookup', ca, sym: symbol,
      reasons: [
        `looked up "${name || symbol}" and found ${items.length} headline(s) under that name`,
        xPosts.skipped
          ? `X search skipped: ${xPosts.reason}`
          : `searched X for "${symbol || name}" and found ${xPosts.posts.length} post(s) (not confirmed, not fed to admission/synthesis)`,
      ],
      evidence: {
        name, chain, itemCount: items.length, hasProjectInfo: !!info,
        xSearched: !xPosts.skipped, xPostCount: xPosts.posts.length,
        xSkipped: xPosts.skipped, xSkipReason: xPosts.reason || null,
        pumpfunFound: !!pumpfun, boosted: !!boost?.active,
      },
      source: 'story-room',
    });
  } catch { /* logging the lookup is best-effort, never blocks the result */ }

  return result;
}

module.exports = { lookupNarrative };
