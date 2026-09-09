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

// PILLAR 4, added 2026-09-08 (D-128) -- Connal's own framing: "its honestly unlikely that we will
// find actual coins in [general news]... in general news we should be looking for things like
// 'new data center announcments' or more general things that will move the market more as a whole
// as opposed to looking for the id for specific coins in the general new." General (non-crypto)
// outlets, read for MACRO/INDUSTRY events that could move the whole market, not for coin identity.
// ! checked live 2026-09-08 via plain `getText` (same as CRYPTO_FEEDS, no anti-bot issue found):
// CNBC 30 items, TechCrunch 20 items, Yahoo Finance 50 items. MarketWatch's public feed URL is
// dead (0 items) -- left out rather than shipped broken.
const GENERAL_FEEDS = [
  { name: 'CNBC Business', url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' },
];

// !! HEURISTIC, NOT FACT -- est, not proven. There is no reliable programmatic test for "will this
// move the crypto market"; this is a keyword net, built from the kind of story Connal named
// (infrastructure/AI capex like a new data center) plus the other macro categories base-rates.md
// already says drag every memecoin with it (rates, regulation, a broad market shock). It WILL miss
// real market-movers worded differently and WILL flag some that turn out to be noise -- that is
// why `marketMover` is stored as a label on the row, never used to silently drop anything, same
// "show it, don't hide it" discipline as D-119. Revise this list directly when it's wrong, rather
// than layering a second filter on top.
const MARKET_MOVER_KEYWORDS = /\b(federal reserve|fed rate|interest rate|rate (?:cut|hike|decision)|inflation|recession|sec\b|regulat(?:ion|or|ory)|etf|data center|data-center|ai chip|semiconductor|nvidia|energy grid|power grid|stock market (?:crash|plunge|sell-?off)|treasury|tariff|trade war|central bank)/i;

function marketMoverHit(title) {
  return MARKET_MOVER_KEYWORDS.test(title);
}

// A `$TICKER` cashtag in a crypto-outlet headline -- how memecoin news actually names a coin.
// Whole cashtag only (never a bare substring), same discipline as `matchWatchlistCoins`.
function extractCashtags(title) {
  const out = new Set();
  const re = /\$([A-Za-z][A-Za-z0-9]{1,9})\b/g;
  let m;
  while ((m = re.exec(title))) out.add(m[1].toUpperCase());
  return [...out];
}

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

// D-128: crypto-specific outlets are checked for BOTH the macro/market-moving read AND specific
// coin identification -- unlike general news, a crypto site naming a brand-new coin (one not yet
// on the watchlist) is exactly the ordinary case, so `$CASHTAG`s are pulled here too. A cashtag
// alone is NOT identity -- this project's whole ticker-collision machinery
// (`resolve.js`, `ticker-collisions.json`) exists because the same symbol maps to many real
// coins -- so a candidate row carries a SYMBOL ONLY, `ca: null`, `confirmed: false`, and is not
// resolved to an address or wired into admission here. That resolution + human review step is
// later work (D-128's own open item), not guessed at in this pass.
async function collectCryptoNews(watchlist, { limitPerFeed = 20, onError = () => {} } = {}) {
  let items;
  try { items = await fetchCryptoOutletNews({ limitPerFeed }); }
  catch (e) { onError(null, e); return []; }
  const out = [];
  for (const item of items) {
    const matches = matchWatchlistCoins(item.title, watchlist);
    const marketMover = marketMoverHit(item.title);
    out.push({ kind: 'crypto', ca: matches[0]?.ca ?? null, sym: matches[0]?.sym ?? null, query: null, marketMover, ...item });

    const matchedSyms = new Set(matches.flatMap((c) => [c.sym, c.nick].filter(Boolean).map((s) => String(s).toUpperCase())));
    for (const ticker of extractCashtags(item.title)) {
      if (matchedSyms.has(ticker)) continue; // already identified above, not a "new" candidate
      out.push({ kind: 'crypto-new-coin-candidate', confirmed: false, ca: null, sym: ticker, query: null, marketMover, ...item });
    }
  }
  return out;
}

// D-128, PILLAR 4: general (non-crypto) outlets are read primarily for macro/industry events that
// could move the whole market -- NOT for coin identity, per Connal's own framing (see
// MARKET_MOVER_KEYWORDS above). The one exception: if a TRACKED coin's own name still turns up
// here anyway, that is rare precisely because general news doesn't cover coins, and Connal named
// that explicitly, 09-08: "if a coin IS mentioned in general news that is probably a huge sign of
// a massive change in price." Flagged `priority: 'high'` for exactly that reason -- but still
// `confirmed: false`. General news finding a coin's real-world namesake (the DOGE-1 shape) and
// general news finding an unrelated namesake collision (the Cate Blanchett/microduck shape) read
// identically at the keyword-match level; only a person telling them apart makes either safe to
// trust, same rule as every other unvetted candidate in this file.
// ! no `$CASHTAG` sweep here -- Connal, same message: hunting for brand-new coin IDs in general
// news specifically is not worth building, that's what the crypto-outlet sweep above is for.
// Pure noise (no coin match, no market-mover keyword hit) is dropped, not stored -- these feeds
// run ~100 headlines/cycle and most of it (sports, celebrity, real estate) has no bearing here.
async function collectGeneralNews(watchlist, { limitPerFeed = 30, onError = () => {} } = {}) {
  const results = await Promise.allSettled(
    GENERAL_FEEDS.map(async (feed) => {
      const xml = await getText(feed.url);
      return parseItems(xml).slice(0, limitPerFeed).map((item) => ({ ...item, source: item.source || feed.name }));
    })
  );
  const items = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value);
    else onError(GENERAL_FEEDS[i], r.reason);
  });

  const out = [];
  for (const item of items) {
    const matches = matchWatchlistCoins(item.title, watchlist);
    const marketMover = marketMoverHit(item.title);
    if (matches.length) {
      out.push({ kind: 'general-coin-candidate', confirmed: false, priority: 'high',
        ca: matches[0].ca, sym: matches[0].sym, query: null, marketMover, ...item });
    } else if (marketMover) {
      out.push({ kind: 'general', confirmed: null, ca: null, sym: null, query: null, marketMover: true, ...item });
    }
  }
  return out;
}

module.exports = { fetchNewsForQuery, collectNews, collectSelfNameNews, fetchCryptoOutletNews, collectCryptoNews, collectGeneralNews, matchWatchlistCoins, parseItems, extractCashtags, marketMoverHit };
