// News, in two separate pillars that answer different questions -- do not merge them into one.
// Design and the DOGE-1 case that motivated pillar 1: `60-KB/news-catalyst-research.md`, researched
// 2026-09-04, built 2026-09-05 after Connal pushed back on treating social-only data as the whole
// picture. Pillar 2 (general crypto-outlet news) added same night, on his direct request.
//   1. CATALYST -- `collectNews()` -- a coin's OWN documented real-world story (DOGE-1 / the real
//      Dogecoin-funded lunar mission), checked against Google News, opt-in per coin (`newsQuery`).
//   2. CRYPTO MARKET -- `collectCryptoNews()` -- general crypto-industry headlines from named
//      outlets, always on, also checked against the watchlist in case a tracked coin gets real
//      crypto-media coverage (which DOES belong here, unlike DOGE-1's aerospace story).
//
// !! WHY NOT A CRYPTO-NEWS API (CryptoPanic etc.) -- already checked, not re-litigated here: those
// filter by well-known exchange-listed tickers. A coin whose real story is aerospace coverage
// (DOGE-1) or any other niche real-world reference will never appear in a crypto-news feed. Google
// News RSS, searched by the coin's own real-world keyword, catches exactly this case -- verified
// live 2026-09-05, the DOGE-1 query already returns a real headline about the actual lunar mission.
//
// !! WHO DECIDES A COIN'S "STORY" -- same D-16 pattern as coins and followed wallets: A PERSON
// NAMES IT, THIS FILE NEVER GUESSES. `newsQuery` is an optional field on a `data/watchlist.json`
// entry. No query set = no news pillar for that coin, which is the correct default for a coin with
// no real-world story to check -- inventing one would be exactly the "plausible-sounding memecoin
// lore" the mandate bans (mandate.md: never generate facts about a coin's story).
//
// !! FRAME EVERY MATCH AS NARRATIVE CORRELATION, NEVER FUNDAMENTAL EXPOSURE. The coin has no legal
// or financial claim on the real thing it references -- DOGE-1 jumped +200% on pure speculation
// when the REAL mission made news, with zero official connection. `matchedOn`/`query` are stored
// so this is always traceable back to "news about the story this coin's name references", never
// displayed or reasoned about as "news affecting this coin's fundamentals".

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const { getText } = require('./http');

const GOOGLE_NEWS_RSS = 'https://news.google.com/rss/search';

// General crypto-industry news -- Connal, 2026-09-05, wanted this IN ADDITION to the per-coin
// real-world-story pillar above, not instead of it. The two answer different questions: the
// Google-News pillar asks "is there real-world news about THIS coin's own borrowed story"
// (narrow, coin-specific); this asks "what is crypto media covering right now" (broad market
// context -- regulation, BTC/ETH moves, exchange news -- the kind of thing base-rates.md already
// says drags every memecoin with it in a downturn). Headlines here are ALSO checked against the
// watchlist in case a tracked coin gets real crypto-media coverage, which DOES belong in a
// crypto-news feed (unlike DOGE-1's aerospace story, which is exactly why that one needed Google
// News instead -- both pillars exist because neither covers the other's case).
// ! plain `getText` here, NOT the curl workaround above -- verified live 2026-09-05, none of these
// four show the Google-News anti-bot behaviour; Node's own fetch gets full real results from all
// four. The curl workaround stays isolated to Google News, not applied where it isn't needed.
const CRYPTO_FEEDS = [
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { name: 'Decrypt', url: 'https://decrypt.co/feed' },
  { name: 'The Block', url: 'https://www.theblock.co/rss.xml' },
  { name: 'Bitcoin.com News', url: 'https://news.bitcoin.com/feed/' },
];

// !! MEASURED LIVE 2026-09-05: Node's own `fetch` (undici) gets served a well-formed, VALID,
// EMPTY RSS channel by Google News' edge -- no error, no 403, just zero <item> elements -- on the
// exact same query `curl` answers correctly and repeatably, from the same machine, same network,
// same headers copied byte-for-byte (User-Agent, Accept, Accept-Language, Accept-Encoding all
// tried). This is worse than a refusal: an empty-but-valid response reads as "no news found" for
// this coin, not "blocked" -- the same silent-failure shape D-93/D-85 already warn about, just from
// a different layer (Google's own bot-fingerprinting, not an HTTP error code). Does NOT use
// `http.js: getText` for this reason -- that wrapper is proven correct for every other provider in
// this project (DexScreener, GeckoTerminal, rugcheck all work fine over plain Node fetch) and this
// is the one exception, isolated to this file, not papered over by changing the shared wrapper.
// ! curl IS reliable here, repeatably, so this shells out to it rather than adding an npm
// dependency (a TLS-fingerprint-spoofing library) to a project that runs zero dependencies today.
// `execFile` (never `exec`) so the query string is never interpreted by a shell.
async function curlGet(url, { timeoutMs = 15000 } = {}) {
  const { stdout } = await execFileAsync('curl', [
    '-s', '--max-time', String(Math.ceil(timeoutMs / 1000)),
    '-A', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    url,
  ], { timeout: timeoutMs + 5000, maxBuffer: 10 * 1024 * 1024 });
  return stdout;
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function stripTags(s) {
  return decodeEntities(String(s || '').replace(/<[^>]*>/g, '')).trim();
}

// Tolerant regex extraction, not a full XML parser -- this project runs zero npm dependencies
// (checked: package.json has none) and Google News' own RSS shape is simple and stable enough
// that a real parser would be a dependency bought for nothing. Each <item> block is self-contained.
function parseItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const field = (tag) => (block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)) || [])[1];
    const title = stripTags(field('title'));
    const link = stripTags(field('link'));
    const pubDateRaw = field('pubDate');
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    const ts = pubDateRaw ? Date.parse(pubDateRaw) : null;
    if (title) items.push({ title, link, source: sourceMatch ? stripTags(sourceMatch[1]) : null, ts: Number.isFinite(ts) ? ts : null });
  }
  return items;
}

// Google News indexes exchange/converter boilerplate pages ("Convert DOGE-1 to Japanese yen",
// "DOGE-1 Live Price Chart") that mention the ticker in their auto-generated title on every single
// query, whether or not anything real happened -- confirmed live 2026-09-05, half of the DOGE-1
// test run was exactly this. These are not news and would make the feed look busy on a day nothing
// occurred, the opposite of what a catalyst check is for. Filtered by TITLE PATTERN, not by source
// (the same outlets -- CoinMarketCap, MEXC -- also publish real articles elsewhere).
const UTILITY_PAGE_PATTERNS = [
  /^convert .+ to /i,
  /live .+ price chart/i,
  /price today/i,
  /marketcap/i,
  /market cap & chart/i,
  /\bswap on\b/i,
  /fundamentals info/i,
  /^buy .+ coin/i,
  /price prediction/i,
  /exchanges? .*markets? \| buy/i,
  /^trade crypto on/i,
  /technical analysis/i,
  /social media updates and insights/i,
];
function isUtilityPage(title) {
  return UTILITY_PAGE_PATTERNS.some((re) => re.test(title));
}

// One coin's real-world-story headlines. `query` is exactly what a person wrote into
// `newsQuery` -- e.g. `"DOGE-1" OR "Geometric Energy Corporation"` -- passed through unmodified.
async function fetchNewsForQuery(query, { limit = 10 } = {}) {
  const url = `${GOOGLE_NEWS_RSS}?${new URLSearchParams({ q: query, hl: 'en-US', gl: 'US', ceid: 'US:en' })}`;
  const xml = await curlGet(url);
  return parseItems(xml).filter((item) => !isUtilityPage(item.title)).slice(0, limit);
}

// Runs across every watchlist entry that has opted in with its own `newsQuery`. Silent-but-logged
// per coin (D-29: a failed fetch for one coin is skipped, never invented as "no news").
async function collectNews(watchlist, { onError = () => {} } = {}) {
  const out = [];
  for (const coin of watchlist) {
    if (!coin.newsQuery) continue; // no story set -- correct default, not a gap to fill by guessing
    try {
      const items = await fetchNewsForQuery(coin.newsQuery);
      for (const item of items) {
        out.push({ kind: 'catalyst', ca: coin.ca, sym: coin.sym, query: coin.newsQuery, ...item });
      }
    } catch (e) {
      onError(coin, e);
    }
  }
  return out;
}

// Whole-word match only, same discipline as D-72's bare-ticker rule for social posts -- a
// substring match on "CAT" inside "CASHCAT" or inside an unrelated word would misattribute a
// headline to the wrong coin (or to a coin at all). Matches against `sym` and `nick` (if set);
// does not guess at a coin's full name, which watchlist entries don't reliably carry.
function matchWatchlistCoins(title, watchlist) {
  const hits = [];
  for (const coin of watchlist) {
    for (const term of [coin.sym, coin.nick].filter(Boolean)) {
      const re = new RegExp(`\\b${String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(title)) { hits.push(coin); break; }
    }
  }
  return hits;
}

// General crypto-media sweep. Every headline is kept (market context has value even with no coin
// match); any headline that DOES name a tracked coin is additionally tagged with it.
async function fetchCryptoOutletNews({ limitPerFeed = 20 } = {}) {
  const results = await Promise.allSettled(
    CRYPTO_FEEDS.map(async (feed) => {
      const xml = await getText(feed.url);
      return parseItems(xml).slice(0, limitPerFeed).map((item) => ({ ...item, source: item.source || feed.name }));
    })
  );
  const out = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') out.push(...r.value);
    // A dead feed is skipped, not retried into a loop -- the other feeds still run this cycle,
    // same partial-failure tolerance as `screener.js`'s three discovery sources.
  });
  return out;
}

// T-030, added 2026-09-05 on Connal's direct instruction after the CATE/Cate-Blanchett and
// microduck/robot false positives -- a real, second-line filter for the self-name pillar only.
// ! NOT applied to the catalyst pillar (`fetchNewsForQuery` via `collectNews`) -- those queries are
// ALREADY human-vetted (a person wrote the real-world reference deliberately, e.g. DOGE-1's own
// curated query is INTENTIONALLY non-crypto-worded, since the whole point is catching aerospace
// coverage a crypto filter would exclude). This filter exists only for the UNVETTED self-name sweep.
// ! this does not replace the `confirmed: false` human-review step -- it reduces how much junk a
// person has to look at, it does not make an unconfirmed hit safe to auto-trust.
const CRYPTO_CONTEXT_WORDS = /\b(crypto|coin|token|blockchain|memecoin|meme coin|defi|solana|ethereum|binance|dex|web3|altcoin|cryptocurrency|on-?chain)\b/i;
function looksCryptoRelated(title) {
  return CRYPTO_CONTEXT_WORDS.test(title);
}

// !! PILLAR 3, added 2026-09-05 -- "catch the next DOGE-1" without waiting for a human to already
// know a coin's real-world story. Runs every watchlist coin's OWN NAME through the same real-world
// news search DOGE-1 uses, instead of requiring a person to first notice and write a `newsQuery`.
// Confirmed live: searching bare "DOGE-1" (no curated terms at all) surfaces the exact same real
// rocket-mission articles the curated query does -- so this genuinely can surface a coin's real
// story before anyone has identified it.
//
// !! BUT NOT SAFE TO AUTO-TRUST -- measured live, same session, same method, coin: `microduck`.
// Every real result was about an UNRELATED Hugging Face robot also named "Microduck" -- a pure
// coincidence, zero connection to the memecoin. Automatically treating a name-match as a real
// narrative link would be exactly the fabricated-connection the mandate bans (mandate.md: never
// generate facts about a coin's story) -- the coincidence would read as a finding.
// ∴ every result here is `confirmed: false` by construction and MUST be shown to a person for a
// yes/no before it is treated as real, the same verification DOGE-1's own story needed
// (`60-KB/news-catalyst-research.md` cites independent reporting confirming it, not just the name
// match). This is a CANDIDATE LIST for a human to review, same shape as `resolve.js`'s
// `identify()` results -- surfaced, never auto-promoted.
async function collectSelfNameNews(watchlist, { onError = () => {} } = {}) {
  const out = [];
  for (const coin of watchlist) {
    try {
      // Same bare-ticker search as before (still what caught DOGE-1's real story), but the result
      // is now filtered to titles that actually mention crypto -- an unrelated Cate Blanchett or
      // Hugging Face-robot article never uses the word "coin"/"crypto"/etc, so this screens out
      // the exact namesake collisions found live without narrowing the search itself.
      const items = (await fetchNewsForQuery(`"${coin.sym}"`, { limit: 8 }))
        .filter((item) => looksCryptoRelated(item.title))
        .slice(0, 5);
      for (const item of items) {
        out.push({ kind: 'self-name-candidate', confirmed: false, ca: coin.ca, sym: coin.sym, query: coin.sym, ...item });
      }
    } catch (e) {
      onError(coin, e);
    }
  }
  return out;
}

async function collectCryptoNews(watchlist, { limitPerFeed = 20, onError = () => {} } = {}) {
  let items;
  try { items = await fetchCryptoOutletNews({ limitPerFeed }); }
  catch (e) { onError(null, e); return []; }
  return items.map((item) => {
    const matches = matchWatchlistCoins(item.title, watchlist);
    return { kind: 'crypto', ca: matches[0]?.ca ?? null, sym: matches[0]?.sym ?? null, query: null, ...item };
  });
}

module.exports = { fetchNewsForQuery, collectNews, collectSelfNameNews, fetchCryptoOutletNews, collectCryptoNews, matchWatchlistCoins, parseItems };
