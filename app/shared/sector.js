// The sector read: what is happening across memecoins generally, rather than to the two coins
// they happen to own.
//
// ! THIS FILE IS ONE STEP AWAY FROM BEING CRYPTO-TWITTER, AND THAT IS THE THING THE APP EXISTS
// TO COUNTER. G-01 scored "social chatter predicts price" as half wrong on day one. So every
// function here is built to answer "what kind of market is this, and how careful should I be"
// and NONE of them answers "what should I get into". Specifically:
//
//   - tickers are ranked by HOW MANY DIFFERENT PEOPLE said them, never by mention count and
//     never by price move. Fifty posts from four accounts is a campaign, not a trend (D-25).
//   - breadth is an aggregate across the whole scanned set. It is deliberately NOT a leaderboard:
//     a list sorted by price change is a trending list wearing our colours (D-43).
//   - the survival rate is the only number here that tends to make anyone act more slowly, so it
//     is stated first and never hidden behind a toggle.
//
// Pure functions. Everything is passed in, so all of it is testable without a network.

// --- what people are naming --------------------------------------------------
// Tickers that show up in ordinary posts. $SOL and friends are kept but marked, because
// "the whole chain is being discussed" and "one small coin is being pushed" are different
// events and must not be mixed into one ranking.
const MAJORS = new Set(['SOL', 'BTC', 'ETH', 'USDC', 'USDT', 'BNB', 'XRP', 'DOGE', 'USD']);
const TICKER_RE = /\$([A-Za-z][A-Za-z0-9]{1,9})\b/g;

function tickers(posts, { minPeople = 2 } = {}) {
  const seen = new Map();
  for (const p of posts || []) {
    const text = String(p.text || '');
    const author = p.authorId || p.handle || 'unknown';
    // One post naming the same ticker six times counts once. Repetition inside a post is a
    // writing style, not six people caring.
    const inThisPost = new Set();
    let m;
    TICKER_RE.lastIndex = 0;
    while ((m = TICKER_RE.exec(text))) inThisPost.add(m[1].toUpperCase());
    for (const t of inThisPost) {
      if (!seen.has(t)) seen.set(t, { ticker: t, mentions: 0, people: new Set(), views: 0, major: MAJORS.has(t) });
      const e = seen.get(t);
      e.mentions++;
      e.people.add(author);
      e.views += p.views || 0;
    }
  }
  return [...seen.values()]
    .map((e) => ({ ticker: e.ticker, mentions: e.mentions, people: e.people.size,
                   views: e.views, major: e.major }))
    .filter((e) => e.people >= minPeople)
    // People first, then mentions. Never views, and never price: sorting this list by anything
    // the market did turns it back into a trending feed.
    .sort((a, b) => b.people - a.people || b.mentions - a.mentions);
}

// A ticker named by many posts but almost nobody is the signature of a paid push. Reported as
// its own number rather than folded into tone, because promotion and enthusiasm demand opposite
// responses and merging them destroys the distinction (D-23).
function pushRatio(list) {
  const small = (list || []).filter((t) => !t.major);
  if (!small.length) return null;
  // Posts per person is the marker, not a headcount. Twenty posts from three accounts and twenty
  // from twenty accounts look identical in any mention count and are completely different events.
  const campaigns = small.filter((t) => t.mentions >= 4 && t.mentions / t.people >= 4).length;
  return +(campaigns / small.length).toFixed(3);
}

// --- what the market did -----------------------------------------------------
// One row per coin: the newest observation we hold for each. Aggregate only.
function latestPerToken(obs) {
  const by = new Map();
  for (const o of obs || []) {
    if (!o || !o.ca) continue;
    const prev = by.get(o.ca);
    if (!prev || o.ts > prev.ts) by.set(o.ca, o);
  }
  return [...by.values()];
}

function breadth(obs) {
  const rows = latestPerToken(obs).filter((o) => o.chg24 != null);
  if (!rows.length) return { n: 0, up: 0, down: 0, flat: 0, upShare: null, median: null };
  let up = 0, down = 0, flat = 0;
  for (const o of rows) {
    if (o.chg24 > 2) up++; else if (o.chg24 < -2) down++; else flat++;
  }
  const sorted = rows.map((o) => o.chg24).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return { n: rows.length, up, down, flat, upShare: +(up / rows.length).toFixed(3), median: +median.toFixed(1) };
}

// --- what happened to the coins we found -------------------------------------
// ! READ THIS BEFORE TRUSTING THE NUMBER. The scan record only ever stores coins that PASSED the
// funnel, and a coin that dies stops appearing in the trending feeds the scanner reads, so it
// silently leaves the record rather than being marked dead. Both biases point the same way.
//
// The first version of this function computed a "survival rate" and returned 100% on live data.
// That number was an artifact of its own denominator: it asked "of the coins that cleared a
// $25k liquidity floor, how many still clear it", having already dropped every coin that
// vanished. It would have told them new coins are safe. They are not.
//
// So this does not claim a death rate. It reports the one thing the record can honestly support:
// among coins we found a while ago AND are still seeing, how the money in the pool has moved.
// The real base rate for how brutal this market is comes from the funnel's rejection reasons,
// which are counted over everything looked at rather than only over what survived.
function cohort(obs, { minAgeHours = 24, floorUsd = 25000, now = Date.now() } = {}) {
  const byToken = new Map();
  for (const o of obs || []) {
    if (!o || !o.ca) continue;
    if (!byToken.has(o.ca)) byToken.set(o.ca, []);
    byToken.get(o.ca).push(o);
  }
  let tracked = 0, drained = 0, halved = 0, vanished = 0;
  for (const arr of byToken.values()) {
    arr.sort((a, b) => a.ts - b.ts);
    const first = arr[0], last = arr[arr.length - 1];
    if (now - first.ts < minAgeHours * 36e5) continue;   // too new for the question to mean anything
    // Counted separately and never as a survivor: we cannot tell "it died" from "it dropped out
    // of the feed we read", and guessing either way would be inventing a number.
    if (now - last.ts > 48 * 36e5) { vanished++; continue; }
    tracked++;
    if ((last.liq || 0) < floorUsd) drained++;
    else if (first.liq && last.liq && last.liq < first.liq * 0.5) halved++;
  }
  return { tracked, drained, halved, vanished, minAgeHours, floorUsd,
           worseShare: tracked ? +((drained + halved) / tracked).toFixed(3) : null };
}
// --- what the funnel saw -----------------------------------------------------
// Rejection reasons describe the market, not the filter. A day where almost everything fails on
// liquidity is a different market from one where almost everything fails on safety.
function funnel(scans) {
  const rows = (scans || []).filter((s) => s && s.ts).sort((a, b) => a.ts - b.ts);
  if (!rows.length) return null;
  const latest = rows[rows.length - 1];
  const merged = {};
  for (const [k, n] of Object.entries(latest.rejects || {})) merged[k] = (merged[k] || 0) + n;
  const topRejects = Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return {
    ts: latest.ts,
    universe: latest.universe || 0,
    survivors: latest.survivors || 0,
    passRate: latest.universe ? +(latest.survivors / latest.universe).toFixed(3) : null,
    topRejects,
    scans: rows.length,
  };
}

// --- the plain-language read -------------------------------------------------
// Short sentences, no jargon, and the caveats are not optional decoration: a synthesis with no
// stated limits reads as a forecast to someone without a finance background.
function synthesize({ breadth: b, cohort: c, funnel: f, social, tickers: tk } = {}) {
  const lines = [], caveats = [];

  // The funnel first. It is the only figure here counted over everything the scanner looked at
  // rather than over what survived, so it is the only one that describes the market honestly.
  if (f && f.universe) {
    lines.push(`The last scan looked at ${f.universe} coins and ${f.survivors} got through.`);
    if (f.topRejects && f.topRejects.length)
      lines.push(`The rest were dropped because: ${f.topRejects.map(([r, n]) => `${r} (${n})`).join(', ')}.`);
    else
      caveats.push('The reasons coins were rejected are not in the older scans, so the breakdown fills in from the next scan onward.');
  }

  if (c && c.tracked >= 5) {
    const worse = c.drained + c.halved;
    lines.push(`Of ${c.tracked} coins found at least a day ago and still being seen, ${worse} have materially less money in the pool than when we found them${c.drained ? ` — ${c.drained} of those you could no longer get out of` : ''}.`);
    if (c.vanished) lines.push(`Another ${c.vanished} stopped showing up altogether. We cannot tell whether they died or just fell out of the feeds we read, so they are not counted either way.`);
  }

  if (b && b.n >= 5) {
    lines.push(`Among the ${b.n} coins that passed recent scans, ${b.up} are up and ${b.down} are down over 24 hours. The middle one moved ${b.median > 0 ? '+' : ''}${b.median}%.`);
    if (b.upShare != null && b.upShare >= 0.7) lines.push('Nearly all of them are up, which says more about the sector moving together than about any one coin.');
    if (b.upShare != null && b.upShare <= 0.3) lines.push('Nearly all of them are down. In a market like this, a coin holding up is worth more attention than one rising with everything else.');
  }

  if (social && social.uniqueAuthors != null) {
    lines.push(`${social.uniqueAuthors} different people posted about memecoins in the last sample${social.posts != null ? `, ${social.posts} posts` : ''}.`);
    if (social.shillRatio != null && social.shillRatio >= 0.3)
      lines.push(`${Math.round(social.shillRatio * 100)}% of those posts used sales language. That is promotion, counted separately from whether people sound positive.`);
  }

  if (tk && tk.length) {
    const small = tk.filter((t) => !t.major).slice(0, 3);
    if (small.length)
      lines.push(`Named by the most different people: ${small.map((t) => `$${t.ticker} (${t.people})`).join(', ')}.`);
  }

  caveats.push('Being talked about is not the same as being worth buying. Chatter and price move together often enough to notice and not often enough to trade on.');
  caveats.push('These coins are found through trending and promoted feeds, so this screen mostly shows things that have already moved.');
  // ! the bias that made the first version of this screen lie. Stated every time, not conditionally.
  caveats.push('Only coins that passed the scan get recorded, and a coin that dies quietly drops out of the feeds rather than being marked dead. Anything here about how coins fared is therefore kinder than the truth.');
  if (!c || c.tracked < 5) caveats.push('Not enough history yet to say how these coins fared. That needs a few more days of scans.');
  else if (c.tracked < 15) caveats.push(`That is over only ${c.tracked} coins, so one coin either way moves it a lot.`);
  if (social && social.uniqueAuthors != null && social.uniqueAuthors < 12)
    caveats.push('Too few people posted in this sample to read anything into the tone.');

  return { lines, caveats };
}

module.exports = { tickers, pushRatio, breadth, cohort, funnel, synthesize, latestPerToken, MAJORS };
