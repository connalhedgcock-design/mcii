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

async function searchPosts(query, { maxPosts = 100 } = {}) {
  if (!apiKey) throw new Error('no X API key configured');
  const b = budget();
  if (b.remainingUsd <= 0) throw new Error('monthly X budget reached — paused until next month');
  const want = Math.min(maxPosts, b.postsRemaining);
  if (want < 1) throw new Error('monthly X budget reached — paused until next month');

  const url = `${BASE}/twitter/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=Latest`;
  const d = await getJSON(url, { headers: { 'X-API-Key': apiKey } });
  const raw = (d && (d.tweets || d.data)) || [];
  const posts = raw.slice(0, want).map(normalize)
    // Defensive: never let a malformed query's results through silently.
    .filter((p) => p.text && !/\$undefined/i.test(p.text));

  spend.posts += posts.length;
  spend.usd = +(spend.usd + posts.length * COST_PER_POST).toFixed(6);
  return { posts, spend: budget() };
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

module.exports = { configure, searchPosts, searchWindow, queriesFor, budget, loadSpend, COST_PER_POST };
