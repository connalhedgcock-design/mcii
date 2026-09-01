const { getJSON } = require('./http');

// X data via twitterapi.io. Deliberately behind this interface and never called from feature
// code: third-party X providers operate at X's sufferance and can disappear with no notice.
// When one does, we replace this file and nothing else.
//
// Cost control is not optional here -- it is the only metered source in the project.
// ~$0.00015 per post read. Every call is counted and the budget is enforced before the request.

const BASE = 'https://api.twitterapi.io';
const COST_PER_POST = 0.00015;

let apiKey = null;
let spend = { month: currentMonth(), usd: 0, posts: 0 };
let capUsd = 12;                    // sits under the $20 all-in cap with room for the rest

function currentMonth() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}`; }
function configure({ key, monthlyCapUsd }) {
  apiKey = key || null;
  if (monthlyCapUsd != null) capUsd = monthlyCapUsd;
}
function budget() {
  if (spend.month !== currentMonth()) spend = { month: currentMonth(), usd: 0, posts: 0 };
  return { ...spend, capUsd, remainingUsd: +(capUsd - spend.usd).toFixed(4),
           postsRemaining: Math.floor((capUsd - spend.usd) / COST_PER_POST) };
}
function loadSpend(saved) { if (saved && saved.month === currentMonth()) spend = saved; }

// Historical search. Verified working 2026-08-26 with `since:YYYY-MM-DD until:YYYY-MM-DD`,
// with one caveat found in testing: results bleed past the `until` boundary by up to a day, so
// the window is enforced again client-side rather than trusted.
//
// What backfill can and cannot recover, stated plainly because it changes how the data may be used:
//   recoverable  - who posted, how many distinct people, what they said, coordination markers
//   NOT recoverable - engagement AT THE TIME. Likes and views keep accruing after a post, so a
//                     post fetched later shows today's counts, not the counts it had during the
//                     window. Backfilled engagement is therefore inflated and non-comparable.
async function searchWindow(query, fromMs, toMs, { maxPosts = 40 } = {}) {
  const d = (ms) => new Date(ms).toISOString().slice(0, 10);
  const q = `${query} since:${d(fromMs)} until:${d(toMs + 864e5)}`;
  const r = await searchPosts(q, { maxPosts });
  const posts = r.posts.filter((p) => p.createdAt >= fromMs && p.createdAt <= toMs);
  return { posts, spend: r.spend, requested: r.posts.length, kept: posts.length };
}

// One page holds 20 posts, whatever you ask for. Measured, not assumed: requesting 200 returned
// 20, and those 20 covered 4.3 minutes of X -- about 276 posts an hour for one phrase alone.
//
// So depth means following the cursor. Each page costs money, so the loop stops on whichever
// comes first: enough posts, no next page, the page limit, or the budget. When it stops with
// more available the result says `truncated`, because a count that hit a ceiling is a floor and
// must never be read as "this is all there was" (D-31).
const PAGE_SIZE = 20;

async function searchPosts(query, { maxPosts = 100, maxPages = 50 } = {}) {
  if (!apiKey) throw new Error('no X API key configured');
  const out = [];
  const seen = new Set();
  let cursor = null, pages = 0, hasMore = false, stopped = null;

  while (out.length < maxPosts && pages < maxPages) {
    const b = budget();
    if (b.remainingUsd <= 0) { stopped = 'monthly X budget reached'; break; }
    const room = Math.min(maxPosts - out.length, b.postsRemaining);
    if (room < 1) { stopped = 'monthly X budget reached'; break; }

    const url = `${BASE}/twitter/tweet/advanced_search?query=${encodeURIComponent(query)}` +
                `&queryType=Latest${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    let d;
    try { d = await getJSON(url, { headers: { 'X-API-Key': apiKey } }); }
    catch (e) {
      // A page that fails mid-walk keeps the pages already collected -- they are real posts that
      // were really paid for. It is recorded as truncated, never as a complete result.
      if (!out.length) throw e;
      stopped = e.message; hasMore = true; break;
    }
    pages++;

    const raw = (d && (d.tweets || d.data)) || [];
    const posts = raw.slice(0, room).map(normalize)
      // Defensive: never let a malformed query's results through silently.
      .filter((p) => p.text && !/\$undefined/i.test(p.text));

    // Paid for on arrival, whether or not it is a duplicate of an earlier page.
    spend.posts += posts.length;
    spend.usd = +(spend.usd + posts.length * COST_PER_POST).toFixed(6);

    for (const p of posts) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }

    hasMore = !!(d && d.has_next_page && d.next_cursor);
    cursor = d && d.next_cursor;
    if (!hasMore) break;
    if (raw.length === 0) break;
    await new Promise((r) => setTimeout(r, 350));
  }
  if (!stopped && hasMore && out.length >= maxPosts) stopped = 'asked-for limit reached';
  if (!stopped && pages >= maxPages && hasMore) stopped = 'page limit reached';

  return {
    posts: out, spend: budget(), pages,
    // ! a floor, not a count. Anything reading this must be able to tell the difference.
    truncated: !!(hasMore && stopped), stoppedBecause: stopped,
  };
}

// Normalised into exactly the shape shared/hype.js expects, so the scoring layer never learns
// anything about which provider the data came from.
// Field names verified against a live response on 2026-08-26 rather than assumed.
function normalize(t) {
  const a = t.author || {};
  const created = t.createdAt ? Date.parse(t.createdAt) : Date.now();
  const acctCreated = a.createdAt ? Date.parse(a.createdAt) : null;
  const ageDays = acctCreated ? (Date.now() - acctCreated) / 864e5 : null;
  const views = t.viewCount || 0;
  const interactions = (t.likeCount || 0) + (t.replyCount || 0) + (t.retweetCount || 0) + (t.quoteCount || 0);
  return {
    id: t.id, text: t.text || '', createdAt: created,
    authorId: a.id || a.userName || 'unknown',
    handle: a.userName || null,
    likes: t.likeCount || 0, replies: t.replyCount || 0,
    reposts: (t.retweetCount || 0) + (t.quoteCount || 0),
    bookmarks: t.bookmarkCount || 0,
    views,
    // Engagement RATE, not raw count. 61 likes on 1,911 views and 0 likes on 12 views are the
    // same "post" by volume and completely different by reception. Impressions with no reaction
    // is the signature of promotion rather than interest.
    engagementRate: views > 0 ? interactions / views : null,
    isReply: !!t.isReply,
    lang: t.lang || null,
    source: t.source || null,
    url: t.twitterUrl || t.url || null,
    author: {
      createdAt: acctCreated,
      followers: a.followers ?? null,
      following: a.following ?? null,
      statusesCount: a.statusesCount ?? null,
      postsPerDay: (a.statusesCount && ageDays) ? a.statusesCount / Math.max(ageDays, 1) : null,
      defaultAvatar: !!(a.profilePicture && /default_profile/.test(a.profilePicture)),
      verified: !!a.isBlueVerified,
      // X's own automation label. Authoritative when present, but opt-in -- an undeclared bot
      // is still a bot, so the heuristics stay as a second line rather than being replaced.
      declaredAutomated: !!a.isAutomated,
      automatedBy: a.automatedBy || null,
      fastFollowers: a.fastFollowersCount ?? null,
      bio: a.description || null,
    },
  };
}

// Contract address searches are far cleaner than ticker searches: a ticker like CATE collides
// with unrelated tokens and ordinary words, an address does not. Both are collected, and the
// scoring weights address matches higher for exactly this reason.
function queriesFor(token) {
  // Accept either key name. The mismatch between `sym` and `symbol` silently produced a literal
  // "$undefined" search that returned unrelated posts and attributed them to every token at once.
  const symbol = token.symbol || token.sym;
  const ca = token.ca || token.address;
  if (!ca) throw new Error('queriesFor: contract address is required');
  const qs = [{ q: ca, weight: 3, kind: 'address' }];
  // A missing symbol must drop the query, never build one from the word "undefined".
  if (symbol && symbol !== 'undefined') qs.push({ q: `$${symbol}`, weight: 2, kind: 'cashtag' });
  return qs;
}

module.exports = { configure, searchPosts, searchWindow, queriesFor, budget, loadSpend, COST_PER_POST, PAGE_SIZE };

// What we search for, and why these and nothing else.
//
// ! CHANGED 2026-08-28 after measuring the alternative. The old list led with "solana memecoin"
// and "pump.fun", which is the firehose: ~351 posts an hour for the first phrase alone, and a
// sample that came back 68% people advertising their own calls ("5x up from my call", "162x
// profit", "Dm for entry"). At $0.00015 a post the whole feed is roughly half a million posts a
// month and the budget buys eighty thousand, so wide coverage was never on the table -- we were
// paying for a thin, random slice of advertising.
//
// So the money goes to the posts that change what someone does instead. Measured live:
//   coins dying  ~44 posts/hour  -> $4.71/month to capture EVERY ONE. complete coverage, affordable.
//   market mood  ~0 posts/hour   -> costs nothing, occasionally says something.
// Their own coins are searched separately, by address.
//
// ! the point is completeness on a narrow thing rather than a sample of a wide one. A sample of
// rug reports tells you nothing; all of them is a base rate.
// --- DISCOVERY QUERIES, added 2026-09-01 ------------------------------------------------------
// ! this REOPENS D-81 by its own listed trigger ("operator asks for breadth again knowing the
// price"). Connal asked, and the price is now known and small: the two queries above were the
// entire social net, which meant the app only ever heard about coins DYING or coins already on the
// watchlist. It never once looked for a coin gaining attention that nobody had listed yet. Reading
// only the obituaries is not a discovery system.
//
// !! THESE DELIBERATELY DO NOT SEARCH FOR HYPE WORDS. "gem", "100x", "next", "dont miss" return
// mostly paid shilling, and D-23 already classes promotional language as a MANIPULATION marker
// rather than sentiment — searching for it would import exactly the noise this project filters out.
// Instead these search for ORDINARY PEOPLE MENTIONING A SPECIFIC COIN, and the defence against
// spam is `resolve.unknownTickers({ minPeople: 3 })`: one account repeating a ticker is invisible,
// three different accounts is a signal. The filter does the work, not the query wording.
//
// ! `links` is the highest-value of these and the reason is mechanical, not linguistic: a post
// sharing a dexscreener/pump.fun URL contains the contract address itself, so the coin is
// identified exactly rather than guessed from a ticker that six coins share (D-73).
//
// Cost at these depths ≈ $7/mo against a $24 cap currently running ~$10/mo, leaving the $3 sweep
// reserve intact. ! depth is a CEILING, not a spend — a query returning fewer posts costs less.
// Re-measure `data/x-spend.json` after a full month before widening further (D-28: cadence is set
// by budget, never by preference).
// ! REBALANCED 2026-09-01 against measured output, not intuition. Over 5,865 swept posts the
// old weighting produced 64% coins-dying, 27% noise, and 1.4% actual discussion of a coin. The
// `dying` query at depth 50/hour was two thirds of everything bought — enormously expensive
// coverage of a base rate already well established (`60-KB/base-rates.md`: ~97% of memecoins die).
// Completeness on rug reports was the right call when they were the only thing being asked for;
// it is the wrong allocation now that discovery is the point.
//
// `dying` 50 -> 20 keeps the rug feed (it still protects held coins and still feeds the failure
// base rate) at a fraction of the spend. The freed budget goes to the queries that make people
// NAME a coin. Spend is still nowhere near the cap — September is running at ~2% of $24 — so this
// is a reallocation, not an economy: buying better, not buying less.
const SECTOR_QUERIES = [
  { q: '("rug" OR "rugged" OR "rug pull" OR "pulled liquidity" OR "cant sell" OR "can\'t sell" OR "honeypot" OR "exit scam") (solana OR sol OR memecoin OR pumpfun OR "pump.fun") -is:retweet',
    kind: 'dying', depth: 20, everyHours: 1 },
  { q: '(solana OR memecoin) ("dried up" OR "no volume" OR "so quiet" OR "everyone left" OR "dead here" OR "liquidity gone" OR "no liquidity") -is:retweet',
    kind: 'mood', depth: 20, everyHours: 6 },

  // People sharing a coin's own page. Carries the address in the URL -> exact identification.
  { q: '("pump.fun/coin" OR "dexscreener.com/solana" OR "birdeye.so/token" OR "jup.ag/swap") -is:retweet',
    kind: 'links', depth: 55, everyHours: 1 },
  // Genuine curiosity. Real humans asking real questions; among the lowest advert rates available.
  { q: '("what is this coin" OR "anyone know this coin" OR "whats the ca" OR "what\'s the ca" OR "someone explain this coin" OR "why is this pumping") (solana OR memecoin OR pumpfun OR "pump.fun") -is:retweet',
    kind: 'asking', depth: 45, everyHours: 1 },
  // Position talk. Somebody saying what they actually did, not what you should do.
  { q: '("just bought" OR "just aped" OR "aped into" OR "loading up on" OR "added to my bag" OR "took a position in") (solana OR memecoin OR sol OR pumpfun) -is:retweet',
    kind: 'buying', depth: 45, everyHours: 1 },
  // Meta-chatter: the crowd noticing itself. Names a coin without being an advert for one.
  { q: '("everyone is talking about" OR "everyone talking about" OR "why is everyone buying" OR "whats everyone aping" OR "what is everyone buying") (solana OR memecoin OR sol) -is:retweet',
    kind: 'crowd', depth: 25, everyHours: 2 },
];
function sectorQueries() { return SECTOR_QUERIES.map((q) => ({ ...q })); }

module.exports.sectorQueries = sectorQueries;

