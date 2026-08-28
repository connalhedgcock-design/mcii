const { botLikelihood } = require('./hype');
const resolve = require('./resolve');

// The filter. One broad sweep of memecoin chatter comes in; this decides what any of it is worth.
//
// ! IT SORTS, IT DOES NOT DELETE. Everything set aside is kept with the reason it was set aside,
// and the counts are shown on screen. Two reasons that are not negotiable:
//   - a filter you cannot audit is a filter you cannot catch being wrong, and I wrote this one.
//   - what gets thrown away is itself a reading on the market. A sweep that is 70% adverts is a
//     different market from one that is 70% argument, and silently dropping the adverts hides that.
//
// The ordering is deliberate and is the whole opinion of this file: posts about a coin they hold
// come first, then posts about coins dying, and only then anything positive. Bad news about
// money already committed is the most valuable thing on the screen and the least likely to be
// sought out voluntarily.

// Coins dying. Weighted above everything except their own holdings, because these are the posts
// that make someone act more carefully -- and they are invisible in any feed sorted by popularity.
const FAILURE = [
  /\brug(ged|pull|s)?\b/i, /\bhoneypot\b/i, /\bpulled (the )?liquidity\b/i, /\bliquidity (was )?pulled\b/i,
  /\bdev (sold|dumped|abandoned)\b/i, /\bexit scam(med)?\b/i, /\bwent to zero\b/i, /\bcan'?t sell\b/i,
  /\bunable to sell\b/i, /\bfrozen\b/i, /\bmint(ed)? more\b/i, /\bdrained\b/i, /\bscam(med)?\b/i,
];

// Sales language. Kept apart from tone on purpose: a post can be genuinely enthusiastic and still
// be an advert, and the two demand opposite responses (D-23).
const PROMO = [
  /\b\d{2,4}x\b/i, /\bdon'?t miss\b/i, /\bnext (100x|1000x|gem|moonshot)\b/i, /\bape (in|now)\b/i,
  /\bgiveaway\b/i, /\bpresale\b/i, /\bearly\b.{0,20}\bgem\b/i, /\bto the moon\b/i, /\bLFG\b/,
  /\bbuy (now|the dip)\b/i, /\bsend it\b/i, /\bnot financial advice\b/i,
];

// Sector conditions rather than any one coin. Useful and easy to lose in a feed dominated by
// individual tickers, so it is recognised explicitly instead of falling through to noise.
const CONDITIONS = [
  /\bvolume\b/i, /\bliquidity\b/i, /\bdried up\b/i, /\bquiet\b/i, /\bbear\b/i, /\bbull\b/i,
  /\brotation\b/i, /\bmeta\b/i, /\bcycle\b/i, /\bslow(ing)? down\b/i, /\beveryone (is )?leaving\b/i,
];

const CASHTAG = /\$([A-Za-z][A-Za-z0-9]{1,9})\b/g;
const ADDRESS = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
const anyMatch = (list, text) => list.some((re) => re.test(text));

// Which of their coins, if any, a post is actually about -- delegated to the resolver, which
// knows the difference between a contract address (proof), a cashtag (strong), and a bare word
// that happens to spell a ticker (a guess, and labelled as one).
//
// This used to be a regex here that matched tickers exactly. It missed every post that wrote
// CATE without a dollar sign, every shortened address, and every mention of a coin by its name.
function about(post, watchlist = [], lex = null) {
  const text = String(post.text || '');
  const index = lex || resolve.buildLexicon(watchlist);
  const watched = new Set((watchlist || []).map((w) => w.ca).filter(Boolean));
  const all = resolve.mentions(text, index);
  const hits = all.filter((h) => h.ca && watched.has(h.ca))
    .map((h) => ({ ca: h.ca, sym: h.sym, via: h.via, confidence: h.confidence, ambiguous: !!h.ambiguous }));
  return { hits, all, tags: [...new Set(all.map((h) => h.ticker).filter(Boolean))],
           addresses: all.filter((h) => h.confidence === 'certain').map((h) => h.ca) };
}

function classify(post, { watchlist = [], scanned = [], lex = null } = {}) {
  const text = String(post.text || '');
  const a = about(post, watchlist, lex);
  const bot = botLikelihood(post.author || {});
  const reasons = [];

  const isFailure = anyMatch(FAILURE, text);
  const isPromo = anyMatch(PROMO, text);
  const isConditions = anyMatch(CONDITIONS, text);
  // Shotgun posts: a pitch for one coin that name-drops several others to farm reach. The coin
  // they hold appearing in such a post is not attention, it is being used as a hashtag.
  const shotgun = a.tags.length + a.addresses.length >= 4;

  const scannedHit = scanned.filter((s) => {
    const sym = String(s.sym || s.symbol || '').toUpperCase();
    return (s.ca && a.addresses.includes(s.ca)) || (sym && a.tags.includes(sym));
  });

  let kind = 'discussion', level = 'low';

  if (a.hits.length && !shotgun) {
    kind = isFailure ? 'failure' : 'held';
    level = 'high';
    const sure = a.hits.every((h) => resolve.atLeast(h.confidence, 'strong'));
    reasons.push(`about ${a.hits.map((h) => h.sym || 'a coin you hold').join(', ')}, which you hold` +
                 (sure ? '' : ' — matched on wording rather than a $ tag or address, so this one is a judgement call'));
    if (isFailure) reasons.push('describes something going wrong');
  } else if (isFailure && (a.tags.length || a.addresses.length)) {
    kind = 'failure'; level = 'high';
    reasons.push('a coin failing — the kind of post worth reading even when it is not yours');
  } else if (shotgun) {
    kind = 'noise'; level = 'low';
    reasons.push(`name-drops ${a.tags.length + a.addresses.length} different coins`);
  } else if (isPromo) {
    kind = 'promotion'; level = 'low';
    reasons.push('sales language');
  } else if (scannedHit.length) {
    kind = 'discussion'; level = 'med';
    reasons.push(`about ${scannedHit.map((s) => s.sym).filter(Boolean).slice(0, 2).join(', ') || 'a coin the scanner found'}`);
  } else if (isConditions) {
    kind = 'conditions'; level = 'med';
    reasons.push('about the market generally rather than one coin');
  } else {
    kind = 'noise'; level = 'low';
    reasons.push('nothing specific enough to act on');
  }

  // An automated account can still say something true, so this never overrides what a post is
  // about -- it only stops a bot from being counted as a person's opinion.
  if (bot.likely) {
    reasons.push(bot.declared ? 'posted by an account X labels automated' : 'looks like an automated account');
    if (level === 'med') level = 'low';
  }
  // Reach with no reaction: pushed in front of people rather than resonating with them (D-25).
  if (post.views > 2000 && post.engagementRate != null && post.engagementRate < 0.001) {
    reasons.push('lots of views, almost no replies or likes — pushed rather than shared');
    if (level === 'med') level = 'low';
  }

  return { kind, level, reasons, about: a.hits, tags: a.tags, bot: bot.likely, promo: isPromo };
}

// Splits a sweep into what to read and what was set aside, keeping both.
function rank(posts, ctx = {}) {
  // Built once for the whole sweep. Per post it would rebuild an index of every coin the scanner
  // has ever passed, hundreds of times over.
  const lex = ctx.lex || resolve.buildLexicon([...(ctx.watchlist || []), ...(ctx.scanned || [])]);
  const scored = (posts || []).map((p) => ({ post: p, ...classify(p, { ...ctx, lex }) }));
  const order = { high: 0, med: 1, low: 2 };
  const byLevel = (a, b) => order[a.level] - order[b.level] || (b.post.views || 0) - (a.post.views || 0);

  const important = scored.filter((r) => r.level === 'high').sort(byLevel);
  const background = scored.filter((r) => r.level === 'med').sort(byLevel);
  const setAside = scored.filter((r) => r.level === 'low').sort(byLevel);

  const counts = {};
  for (const r of scored) counts[r.kind] = (counts[r.kind] || 0) + 1;
  return {
    important, background, setAside, counts,
    total: scored.length,
    // The share of a sweep that is advertising is a reading on the market in its own right, not
    // a housekeeping number. A sector that is mostly adverts is a sector being sold to.
    promoShare: scored.length ? +(scored.filter((r) => r.kind === 'promotion' || r.kind === 'noise').length / scored.length).toFixed(3) : null,
  };
}

// Posts about one coin, pulled out of a broad sweep. This is what makes the sweep affordable:
// searching once and sorting the results costs the same whether they watch two coins or twenty,
// where asking X about each coin separately costs more with every coin added.
function postsFor(posts, token) {
  const lex = resolve.buildLexicon([token]);
  return (posts || []).filter((p) => about(p, [token], lex).hits.length > 0);
}

module.exports = { classify, rank, postsFor, about, FAILURE, PROMO, CONDITIONS };
