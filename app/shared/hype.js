const { score } = require('./sentiment');

// Attention scoring. Pure functions.
//
// The premise this whole layer rests on is narrow and worth restating: the LEVEL of attention is
// coincident-to-lagging with price and is the single easiest thing on the internet to fake. What
// carries a plausible edge is the rate of change of GENUINE attention -- so most of the work here
// is separating genuine from manufactured, and refusing to emit a number when it cannot.

// --- authenticity ----------------------------------------------------------
// Herfindahl index over author share. Ten posts from ten people and ten posts from one person
// are the same "volume" and completely different information.
function authorDiversity(posts) {
  if (!posts.length) return 0;
  const counts = new Map();
  for (const p of posts) counts.set(p.authorId, (counts.get(p.authorId) || 0) + 1);
  const n = posts.length;
  let hhi = 0;
  for (const c of counts.values()) hhi += (c / n) ** 2;
  return 1 - hhi;   // 1 = every post a different author, 0 = one author
}

// Near-duplicate detection via normalised text. Coordinated campaigns reuse copy.
function duplicateRatio(posts) {
  if (posts.length < 2) return 0;
  const seen = new Map();
  for (const p of posts) {
    const k = String(p.text || '').toLowerCase().replace(/https?:\/\/\S+/g, '')
      .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90);
    if (k) seen.set(k, (seen.get(k) || 0) + 1);
  }
  const dupes = [...seen.values()].filter((c) => c > 1).reduce((s, c) => s + c, 0);
  return dupes / posts.length;
}

// Per-account heuristics. Deliberately crude and transparent -- a black-box bot score would be
// one more number to trust blindly, which is the failure mode this app exists to fight.
function botLikelihood(a) {
  // X's own label is decisive when set. It is opt-in, so absence proves nothing and the
  // heuristics below still run -- an undeclared bot is still a bot.
  if (a.declaredAutomated) {
    return { likely: true, flags: 99, declared: true,
             reasons: [`X labels this account as automated${a.automatedBy ? ' (' + a.automatedBy + ')' : ''}`] };
  }
  let flags = 0, reasons = [];
  const ageDays = a.createdAt ? (Date.now() - a.createdAt) / 864e5 : null;
  if (ageDays != null && ageDays < 30) { flags++; reasons.push('account under a month old'); }
  if (a.followers != null && a.following != null && a.followers < 50 && a.following > 500) {
    flags++; reasons.push('follows many, followed by few');
  }
  if (a.postsPerDay != null && a.postsPerDay > 50) { flags++; reasons.push('posts more than 50 times a day'); }
  if (a.followers != null && a.followers < 10) { flags++; reasons.push('almost no followers'); }
  if (a.defaultAvatar) { flags++; reasons.push('no profile picture'); }
  // Bought followers: X tracks these separately, and a high share is a strong tell.
  if (a.fastFollowers != null && a.followers > 0 && a.fastFollowers / a.followers > 0.25) {
    flags++; reasons.push('large share of low-quality followers');
  }
  return { likely: flags >= 2, flags, declared: false, reasons };
}

// Posts landing inside the same short window suggest scheduling rather than reaction.
function burstiness(posts, windowSec = 60) {
  if (posts.length < 4) return 0;
  const ts = posts.map((p) => p.createdAt).sort((a, b) => a - b);
  let clustered = 0;
  for (let i = 1; i < ts.length; i++) if ((ts[i] - ts[i - 1]) / 1000 < windowSec) clustered++;
  return clustered / (ts.length - 1);
}

// Promotional register. This is not sentiment -- "next 100x, don't miss out" tells you nothing
// about whether a token is good, only that someone is selling it to you. Treated as a
// manipulation marker, deliberately kept out of the sentiment score so the two do not blur.
const SHILL_PATTERNS = [
  /\b\d+\s*x\b/i, /next\s+\w*\s*(gem|100x|1000x|doge|shib|pepe)/i,
  /don'?t\s+(miss|sleep)/i, /last\s+chance/i, /get\s+in\s+(early|now|before)/i,
  /easy\s+\d+x/i, /can'?t\s+lose/i, /guaranteed/i, /to\s+the\s+moon/i,
  /life\s*chang/i, /retire/i, /financial\s+freedom/i, /ape\s+(in|now)/i,
  /\bpresale\b/i, /\bstealth\s+launch\b/i, /send(ing)?\s+it\s+to/i,
];
function shillRatio(posts) {
  if (!posts.length) return 0;
  const n = posts.filter((p) => SHILL_PATTERNS.some((re) => re.test(String(p.text || '')))).length;
  return n / posts.length;
}

// Address-mention spam. Accounts farm reach by posting a pitch for one token while name-dropping
// the addresses or tickers of several others, so a post can mention your coin and be about
// something else entirely. Counting these as "attention" for your token is simply wrong.
function offTopic(post, token) {
  const text = String(post.text || '');
  const sym = (token.symbol || token.sym || '').toUpperCase();
  const ca = token.ca || token.address || '';

  const cashtags = [...new Set((text.match(/\$[A-Za-z][A-Za-z0-9]{1,14}/g) || [])
    .map((c) => c.slice(1).toUpperCase()))];
  const addresses = [...new Set(text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) || [])];

  const mentionsUs = (ca && text.includes(ca)) || (sym && cashtags.includes(sym));
  const otherTags = cashtags.filter((c) => c !== sym);
  const otherAddrs = addresses.filter((a) => a !== ca);

  // Shotgun posts: many tickers, ours incidental among them.
  if (cashtags.length + addresses.length >= 4 && otherTags.length + otherAddrs.length >= 3)
    return { off: true, reason: 'post name-drops several different tokens' };
  // Our address appears but the post is pitching a different named token.
  if (mentionsUs && otherTags.length >= 1 && !cashtags.includes(sym) && ca && text.includes(ca))
    return { off: true, reason: `post mentions this address but is about $${otherTags[0]}` };
  return { off: false };
}

// Splits a raw result set into posts genuinely about the token and posts that merely mention it.
function partition(posts, token) {
  const onTopic = [], noise = [];
  for (const p of posts) {
    const r = offTopic(p, token);
    if (r.off) noise.push({ ...p, offTopicReason: r.reason }); else onTopic.push(p);
  }
  return { onTopic, noise, noiseRatio: posts.length ? noise.length / posts.length : 0 };
}

// --- the bucket ------------------------------------------------------------
// One time bucket of posts becomes one row of evidence.
function bucket(posts, { bucketMs, ts }) {
  const authors = new Set(posts.map((p) => p.authorId));
  const bots = posts.filter((p) => botLikelihood(p.author || {}).likely);
  const botRatio = posts.length ? bots.length / posts.length : 0;

  // log1p on engagement so one viral post cannot dominate a bucket. Raw sums make the index a
  // measure of the single loudest voice rather than of breadth.
  let engagement = 0, wSum = 0, sSum = 0, scoredCount = 0;
  for (const p of posts) {
    const e = Math.log1p((p.likes || 0) + 2 * (p.replies || 0) + 3 * (p.reposts || 0));
    engagement += e;
    const s = score(p.text);
    if (s.scored) { wSum += e; sSum += e * s.score; scoredCount++; }
  }

  const diversity = authorDiversity(posts);
  const dupes = duplicateRatio(posts);
  const burst = burstiness(posts);
  const shill = shillRatio(posts);

  // Reach with no reaction. Many views and almost no likes/replies means the posts were pushed
  // in front of people rather than resonating with them -- promotion, not interest.
  const rated = posts.filter((p) => p.engagementRate != null && p.views > 20);
  const medianRate = rated.length
    ? rated.map((p) => p.engagementRate).sort((a, b) => a - b)[Math.floor(rated.length / 2)]
    : null;
  const totalViews = posts.reduce((s2, p) => s2 + (p.views || 0), 0);
  const replyShare = posts.length ? posts.filter((p) => p.isReply).length / posts.length : 0;

  // The five most-seen posts, kept so the app can show what people actually said. A score with
  // no example behind it is impossible to sanity-check -- and being able to read the posts is how
  // you catch the scorer being wrong.
  const topPosts = posts.slice()
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5)
    .map((p) => ({
      text: String(p.text || '').slice(0, 240),
      handle: p.handle || null,
      views: p.views || 0,
      likes: p.likes || 0,
      replies: p.replies || 0,
      url: p.url || null,
      sentiment: score(p.text).scored ? score(p.text).score : null,
      at: p.createdAt,
    }));

  return {
    ts, bucketMs,
    topPosts,
    posts: posts.length,
    uniqueAuthors: authors.size,
    engagement: +engagement.toFixed(3),
    // Sentiment is engagement-weighted and computed only over posts that actually contained
    // scoreable language. Unscored posts are excluded, never counted as neutral.
    //
    // ! and it is withheld entirely below three such posts. A live run produced "tone 0.818" for
    // NEEGY off ONE post -- three decimals of apparent precision resting on a single sentence.
    // A number that looks measured and is not is worse than no number, because it gets believed.
    // The raw value is still recorded so the threshold can be revisited; it is just not offered
    // as a reading.
    sentiment: (wSum > 0 && scoredCount >= MIN_SENTIMENT_POSTS) ? +(sSum / wSum).toFixed(3) : null,
    sentimentRaw: wSum > 0 ? +(sSum / wSum).toFixed(3) : null,
    sentimentThin: wSum > 0 && scoredCount < MIN_SENTIMENT_POSTS,
    sentimentN: scoredCount,
    diversity: +diversity.toFixed(3),
    duplicateRatio: +dupes.toFixed(3),
    botRatio: +botRatio.toFixed(3),
    burstiness: +burst.toFixed(3),
    shillRatio: +shill.toFixed(3),
    totalViews,
    medianEngagementRate: medianRate != null ? +medianRate.toFixed(5) : null,
    replyShare: +replyShare.toFixed(3),
  };
}

// --- reliability gate ------------------------------------------------------
// Fails loud. A silently down-weighted score still looks like a score, and a non-expert will
// read it as one. When the inputs are not trustworthy the app must say so, not shade a number.
// Two failure modes, kept separate because they demand opposite responses.
//   thin      -> not enough people talking yet. Wait. Says nothing about the token.
//   manipulated -> the conversation is manufactured. That IS information, and it is bad news.
// Collapsing them into one "unreliable" verdict throws away the distinction that matters.
// !! THESE WERE GUESSED. THEY ARE NOW MEASURED. Recalibrated 2026-09-01 after a test showed the
// detector flagged 0 of 6 coins that had LITERALLY PAID for promotion, and 3 of its six markers
// had never fired once in 386 readings.
//
// The old numbers sat outside the range the data ever occupies — "over 50% of accounts are bots"
// when the worst reading ever seen was 17%, "over 50% sales language" when the worst was 27%. A
// smoke alarm wired to trigger at 500 degrees. It was not detecting nothing because the market is
// clean; it could not fire at all.
//
// HOW THESE WERE CHOSEN — two different sources, deliberately:
//   SCALE comes from the 391-reading unlabelled history (roughly the 90th percentile of each
//   marker), so "unusual" means unusual for this data rather than for my imagination.
//   WHICH MARKERS TO TRUST comes from a labelled test against DexScreener's PAID BOOST feed
//   (`app/tools/test-manipulation.js`) — coins that did not merely look promoted but paid for it.
//
// What that test found, over 7 paid coins vs 5 watchlist:
//   shillRatio      2.86x higher on paid coins  <- the only strong discriminator
//   burstiness      1.39x                        <- weak
//   duplicateRatio  1.32x                        <- weak
//   botRatio        BACKWARDS (watchlist scored worse)
//   diversity       no separation at all
//
// ! THE WEAK MARKERS ARE KEPT ANYWAY, at reachable thresholds. A coin pushed by an actual botnet
// would spike botRatio even though paid-promotion coins do not, and removing a marker because one
// small sample did not need it would be fitting the test rather than the problem.
//
// Chosen setting: catches 29% of paid-promotion readings, flags 0% of the watchlist, and fires on
// 8.2% of all history. ! that last number is the one that stops this becoming decoration in the
// other direction — a detector firing on half of everything is alarm fatigue wearing a lab coat.
//
// ! LIMITS, AND THEY ARE REAL. n = 7 paid coins against 5 watchlist coins. The label is weak: a
// coin can buy a boost and still have genuine followers, which is why 29% is a floor rather than a
// failure. Do NOT tune these further on this sample — that is fitting noise, and
// `60-KB/social-signal-research.md` documents exactly that failure. Accumulate more labelled
// readings first (`data/manipulation-test.jsonl` grows every time the test runs) and refit at n≥30.
const MANIP = {
  shillRatio: 0.12,       // 90th pct ≈ 0.19; paid coins average 0.23, watchlist 0.08
  duplicateRatio: 0.46,   // 90th pct
  burstiness: 0.55,       // between 75th (0.46) and 90th (0.64)
  diversity: 0.85,        // below 5th pct — few accounts producing most posts
  botRatio: 0.125,        // 90th pct. kept live despite no power in THIS sample, see above.
  engagementRate: 0.002,  // unchanged: reach with no reaction (D-25)
};

const MIN_SENTIMENT_POSTS = 3;   // below this a tone score is one person's wording, not a mood

const MIN_AUTHORS = 12;      // below this, treat as thin rather than informative
const GOOD_AUTHORS = 30;     // at or above this, sample is comfortable

function reliability(b) {
  const thinReasons = [], manipReasons = [];

  // An empty bucket is only ever thin. Reporting manipulation markers computed over zero posts
  // produces confident nonsense like "a handful of accounts produced most of the posts".
  if (!b.posts) {
    return { ok: false, thin: true, manipulated: false, coordinated: false,
             problems: ['nobody is posting about this'], thinReasons: ['nobody is posting about this'],
             manipReasons: [], confidence: 'none',
             verdict: 'No posts found. Either nobody is talking about this, or it is not being discussed under this name or address.' };
  }

  if (b.uniqueAuthors < MIN_AUTHORS)
    thinReasons.push(`only ${b.uniqueAuthors} different ${b.uniqueAuthors === 1 ? 'person' : 'people'} posted`);

  if (b.diversity < MANIP.diversity) manipReasons.push('a handful of accounts produced most of the posts');
  if (b.botRatio > MANIP.botRatio) manipReasons.push(`${Math.round(b.botRatio * 100)}% of accounts look automated`);
  if (b.duplicateRatio > MANIP.duplicateRatio) manipReasons.push('many posts repeat the same wording');
  if (b.burstiness > MANIP.burstiness) manipReasons.push('posts arrived in tight bursts, suggesting scheduling');
  if (b.shillRatio > MANIP.shillRatio) manipReasons.push(`${Math.round(b.shillRatio * 100)}% of posts use promotional sales language`);
  if (b.medianEngagementRate != null && b.totalViews > 2000 && b.medianEngagementRate < MANIP.engagementRate)
    manipReasons.push('posts are being seen but almost nobody is reacting to them');

  const thin = thinReasons.length > 0;
  const manipulated = manipReasons.length >= 2;   // one marker is noise; two is a pattern

  return {
    ok: !thin && !manipulated,
    thin, manipulated,
    coordinated: manipulated,
    problems: [...thinReasons, ...manipReasons],
    thinReasons, manipReasons,
    confidence: manipulated ? 'none'
              : thin ? 'low'
              : b.uniqueAuthors >= GOOD_AUTHORS ? 'good' : 'moderate',
    // Manufactured enthusiasm is a negative signal in its own right, not a missing one.
    // ! WORDING SOFTENED 2026-09-01 to match what the evidence actually supports. The measured
    // detector catches ~29% of coins known to be paying for promotion — real discrimination, but
    // nowhere near proof about any single coin. "Looks manufactured" claimed more certainty than
    // n=7 can carry, and overclaiming here is how a warning stops being believed.
    verdict: manipulated
      ? 'This conversation has the shape of a promoted one — repeated wording, sales language, or posts arriving in bursts. It may still be genuine, but treat the enthusiasm as unverified rather than as interest.'
      : thin
      ? 'Too few people are talking about this to read anything into it yet.'
      : null,
  };
}

// --- index -----------------------------------------------------------------
// z-scored against the token's OWN trailing history. Comparing one token's raw mention count to
// another's is meaningless: what matters is whether today is unusual for this token.
function hypeIndex(current, historyBuckets) {
  // Baseline from live rows only. Backfilled engagement is inflated by likes accrued after the
  // fact, so including it would drag the mean up and make every live reading look quiet.
  const live = historyBuckets.filter((b) => (b.src || 'live') === 'live');
  const dropped = historyBuckets.length - live.length;
  const vals = live.map((b) => Math.log1p(b.engagement)).filter((v) => isFinite(v));
  if (vals.length < 20) return { value: null,
    reason: `needs 20 live readings, has ${vals.length}${dropped ? ` (${dropped} backfilled readings excluded from the baseline)` : ''}` };
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  if (sd === 0) return { value: null, reason: 'no variation in history yet' };
  return { value: +((Math.log1p(current.engagement) - mean) / sd).toFixed(2), mean, sd, n: vals.length, excludedBackfill: dropped };
}

// Breadth index. Unlike engagement, a count of distinct people who posted in a past window is
// fixed once that window has closed -- nobody retroactively becomes a poster. So this index can
// safely use backfilled history, which means it works from day one rather than after twenty
// hours of live collection.
//
// It is also the better measure on its own terms: a hundred posts from five accounts and a
// hundred posts from ninety accounts are the same volume and completely different information.
function breadthIndex(current, historyBuckets) {
  const vals = historyBuckets.map((b) => Math.log1p(b.uniqueAuthors)).filter((v) => isFinite(v));
  if (vals.length < 10) return { value: null, reason: `needs 10 readings, has ${vals.length}` };
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  if (sd === 0) return { value: null, reason: 'no variation in history yet' };
  const z = (Math.log1p(current.uniqueAuthors) - mean) / sd;
  return {
    value: +z.toFixed(2), mean, sd, n: vals.length,
    usesBackfill: historyBuckets.some((b) => b.src === 'backfill'),
    reading: z > 2 ? 'Far more people than usual are talking about this'
           : z > 1 ? 'More people than usual are talking about this'
           : z < -1.5 ? 'Noticeably fewer people are talking about this than usual'
           : 'Roughly the usual number of people are talking about this',
  };
}

// Level, then rate of change, then acceleration. Acceleration is the only component with a
// plausible forward edge, and it is locked behind the model gate until measured. See D-05.
function derivatives(series) {
  if (series.length < 3) return { velocity: null, acceleration: null };
  const [a, b, c] = series.slice(-3);
  const v1 = b - a, v2 = c - b;
  return { velocity: +v2.toFixed(3), acceleration: +(v2 - v1).toFixed(3) };
}

// Attention and price disagreeing is the most informative state, and deliberately ambiguous:
// it is reported as two readings, not resolved into one.
function divergence(hypeZ, priceZ) {
  if (hypeZ == null || priceZ == null) return null;
  const d = +(hypeZ - priceZ).toFixed(2);
  if (d > 1.5) return { d, reading: 'Attention is running ahead of price. That is either early interest or a paid promotion campaign — the data cannot tell you which.' };
  if (d < -1.5) return { d, reading: 'Price is running ahead of attention. Moves without a widening audience are often distribution.' };
  return { d, reading: 'Attention and price are moving together.' };
}

module.exports = { bucket, reliability, hypeIndex, breadthIndex, derivatives, divergence, offTopic, partition,
                   authorDiversity, duplicateRatio, botLikelihood, burstiness };
