const { credibility } = require('./credibility');
const resolve = require('./resolve');

// TWITTER AS A MARKET, SCANNED — not as a service we look coins up in.
//
// THE REFRAME (Connal, 2026-09-01): "you need to think about social media like another market we
// are scanning depending on what people are talking about RIGHT NOW". That is a different
// architecture from what existed, and the measurement backs it:
//
//   a single sweep's posts name ~152 DISTINCT COINS.
//   the view built from that sweep reported a median of 3.
//
// Everything else was filtered away before anyone saw it. The market view was already paid for and
// was being discarded at the last step — the same mistake as the 874 dropped posts, one layer up.
//
// ! WHAT THIS IS NOT: it is not a buy list, and nothing here decides anything. It is a snapshot of
// what was being said, coin by coin, at one moment. Ranking it by "most talked about" would be
// D-62's exact error (the sector view answers "what kind of market is this", never "what should I
// get into"), so the row carries counts and lets the caller decide.
//
// ! WHY THE RAW LIST NEEDS SANITY RULES: the unfiltered extraction surfaced "TOKEN" 26 times and
// "XRP" — one is an ordinary English word, the other is not a memecoin anyone here trades. D-72
// exists because their own scan record contains a coin called "fone". So bare words are excluded
// and only deliberate references count, exactly as `emerging` does.

// Ordinary words that get written with a $ in front and are not coins anyone means.
const NOT_COINS = new Set([
  'TOKEN', 'COIN', 'CRYPTO', 'MEME', 'MEMECOIN', 'SOL', 'SOLANA', 'BTC', 'ETH', 'USD', 'USDT',
  'USDC', 'NFT', 'DEX', 'CEX', 'ATH', 'ATL', 'FOMO', 'DYOR', 'PNL', 'ROI', 'APY', 'TVL', 'LP',
  'CA', 'MC', 'FDV', 'XRP', 'BNB', 'DOGE', 'AI', 'GM', 'WAGMI', 'NGMI',
]);

// One scan → what the whole social market looked like at that moment.
//
// Returns a row per coin with the counts that make CHANGE measurable next scan. ! the point is the
// difference between consecutive snapshots, not any single one — a coin mentioned 9 times means
// nothing until you know it was mentioned once thirty minutes ago.
// `namesakes` maps a rival coin's address -> { ticker, ownCa } from `data/ticker-collisions.json`.
// ! Connal, 2026-09-01: "when the twitter tracker is picking up data a lot of what it is picking up
// is actually duplicate coins of what we are actually trading... if duplicate coins are being
// talked about that will also affect the real one."
// He is right and the project had been treating this purely as contamination to be discounted
// (D-73). It is also DATA. His CATE is rank 2 of 4 and the biggest namesake carries $73.7M of
// liquidity against his $3.2M — so most "$CATE" talk is probably not about his coin, and whether
// that spills over into his is a real question nobody here has measured.
function snapshot(posts, lex, { ts = Date.now(), namesakes = new Map() } = {}) {
  const coins = new Map();

  const touch = (key, kind) => {
    if (!coins.has(key)) {
      coins.set(key, { key, kind, posts: 0, people: new Map(), views: 0, erSum: 0, erN: 0,
                       promo: 0, failure: 0, byConfidence: {} });
    }
    return coins.get(key);
  };

  for (const p of posts || []) {
    const author = p.authorId || p.handle || 'unknown';
    const cred = credibility(p.author || {}).score;
    let hits;
    try { hits = resolve.mentions(p.text, lex); } catch { continue; }

    for (const h of hits) {
      // Addresses are exact identity and always count.
      //
      // ! WEAKER MENTIONS ARE NOW KEPT, TAGGED — changed 2026-09-01 on Connal's point that we miss
      // people talking about a coin without writing "$TICKER". `resolve.mentions()` already grades
      // these: a bare ticker inside clearly trading-related wording is `probable`, a coin named in
      // full is `possible`. Requiring `strong` threw both away.
      // ∵ this is a RECORD, not a buy signal, so confidence can travel with the number instead of
      // being used to delete it. `emerging` still demands `strong` — the high-value signal keeps
      // its high bar, and D-72's "fone" problem stays solved there.
      // ! a weak mention can only ever attach to a coin we already know; there is nothing to match
      // an unknown coin's bare ticker against, and guessing would invent coins. That limit is real.
      let key = null, kind = null;
      if (h.ca) { key = h.ca; kind = 'address'; }
      else if (h.ticker && resolve.atLeast(h.confidence, 'strong')
               && !NOT_COINS.has(String(h.ticker).toUpperCase())) {
        key = String(h.ticker).toUpperCase(); kind = 'ticker';
      }
      if (!key) continue;

      const e = touch(key, kind);
      e.posts++;
      // Keyed by author, so one account posting ten times counts once at its own weight.
      if (!e.people.has(author)) e.people.set(author, cred);
      e.views += p.views || 0;
      if (p.engagementRate != null) { e.erSum += p.engagementRate; e.erN++; }
      if (h.sym) e.sym = h.sym;
      // ! how sure we were, kept per coin. A coin whose mentions are all `possible` is a much
      // weaker reading than one named by address, and collapsing them would hide that.
      e.byConfidence[h.confidence] = (e.byConfidence[h.confidence] || 0) + 1;
      const ns = namesakes.get(key);
      if (ns) { e.namesakeOf = ns.ownSym || ns.ticker; e.namesakeTicker = ns.ticker; }
    }
  }

  const rows = [...coins.values()].map((e) => {
    const weights = [...e.people.values()];
    const weighted = +weights.reduce((s, w) => s + w, 0).toFixed(2);
    return {
      key: e.key, kind: e.kind, sym: e.sym || null,
      posts: e.posts,
      people: e.people.size,
      // ! weighted AND raw. The gap between them is the campaign signal (D-100) and one number
      // would hide it.
      weighted,
      quality: e.people.size ? +(weighted / e.people.size).toFixed(2) : 0,
      views: e.views,
      er: e.erN ? +(e.erSum / e.erN).toFixed(5) : null,
      // ! how sure we were, per coin. A coin whose mentions are all `possible` is a far weaker
      // reading than one named by address, and one number would hide that difference.
      byConfidence: e.byConfidence,
      // Set when this coin shares a ticker with one of theirs but IS NOT theirs. Attention on a
      // namesake is not attention on their coin — and may still move it, which is the open question.
      namesakeOf: e.namesakeOf || null,
    };
  });

  // Sorted by weighted attention purely so the biggest rows are readable first. ! this is an
  // ordering of a record, NOT a recommendation — see D-62.
  rows.sort((a, b) => b.weighted - a.weighted || b.posts - a.posts);
  return { ts, totalPosts: (posts || []).length, coins: rows };
}

// What CHANGED between two snapshots. This is the actual signal Connal asked for: not how loud a
// coin is, but whether it is getting louder, measured scan to scan.
//
// ! a coin appearing for the FIRST TIME is reported separately from one that grew. They are
// different events — "nobody was talking about this and now three people are" is not the same as
// "five people were talking about it and now eight are", and averaging them into one "change"
// number would blur the more interesting of the two.
function movers(prev, curr, { minWeighted = 1.5 } = {}) {
  const before = new Map((prev?.coins || []).map((c) => [c.key, c]));
  const out = [];
  for (const c of curr.coins || []) {
    if (c.weighted < minWeighted) continue;     // one throwaway account is not a move
    const b = before.get(c.key);
    if (!b) {
      out.push({ ...c, event: 'new', from: 0, delta: c.weighted, ratio: null });
    } else if (c.weighted > b.weighted) {
      out.push({ ...c, event: 'rising', from: b.weighted,
                 delta: +(c.weighted - b.weighted).toFixed(2),
                 ratio: b.weighted > 0 ? +(c.weighted / b.weighted).toFixed(2) : null });
    }
  }
  // New coins first, then the sharpest growth. Both ordered by how much real vouching moved,
  // never by raw post count — post count is the easiest number in this whole system to fake.
  out.sort((a, b) => (a.event === b.event ? b.delta - a.delta : a.event === 'new' ? -1 : 1));
  return out;
}

// WHAT THIS SCAN MEANS, as numbers rather than adjectives.
//
// Connal, 2026-09-01: "scanning as many tweets as you can, keeping all of them, analyzing all of
// them, pulling the numbers out of the data and then telling me what that means for individual
// coins or markets." ∴ the deliverable is a READ OF EACH SCAN, not a watchlist. You do not track a
// market, you read it.
//
// ! every measure here is computed from the scan, never asserted. "the market feels frothy" is the
// kind of unfalsifiable line this project bans; "attention is concentrated in 3 coins, 41% of it
// on one" is the same observation with a number attached that can be checked and can be wrong.
//
// ! and none of it is a recommendation. D-62: this answers "what kind of market is this", never
// "what should I get into".
function marketRead(curr, prev, { ranked = null } = {}) {
  const coins = curr.coins || [];
  const totalW = coins.reduce((s, c) => s + c.weighted, 0);

  // BREADTH — how many coins are actually being discussed by more than a single account. Raw coin
  // count is inflated by one-off mentions, so this uses a real floor.
  const real = coins.filter((c) => c.weighted >= 1.5);

  // CONCENTRATION — what share of all attention sits in the top three. High means one story is
  // eating the conversation; low means attention is scattered.
  const top3 = real.slice(0, 3).reduce((s, c) => s + c.weighted, 0);
  const concentration = totalW > 0 ? +(top3 / totalW).toFixed(3) : null;

  // CHURN — how much of what is being discussed was not being discussed last scan. High churn is
  // rotation; low churn is the same conversation continuing.
  const before = new Set((prev?.coins || []).filter((c) => c.weighted >= 1.5).map((c) => c.key));
  const fresh = real.filter((c) => !before.has(c.key));
  const churn = real.length ? +(fresh.length / real.length).toFixed(3) : null;

  // CROWD QUALITY — the average believability of the accounts doing the talking. A low reading
  // means this scan caught a bot-heavy window, and every other number in it should be read
  // through that. ! this is the whole-scan version of the per-coin credibility weighting.
  const q = real.length ? +(real.reduce((s, c) => s + c.quality, 0) / real.length).toFixed(2) : null;

  const counts = ranked?.counts || {};
  const classified = ranked?.total || 0;
  const share = (k) => (classified ? +((counts[k] || 0) / classified).toFixed(3) : null);

  return {
    ts: curr.ts,
    posts: curr.totalPosts,
    coinsNamed: coins.length,
    coinsDiscussed: real.length,      // more than one account
    concentration,
    churn,
    crowdQuality: q,
    // What the conversation is ABOUT, as shares of the scan.
    failureShare: share('failure'),   // people reporting coins dying
    promoShare: share('promotion'),
    emergingShare: share('emerging'), // a person naming a coin, not selling
    // ! deliberately no verdict string. A sentence like "the market is rotating" would be my
    // interpretation wearing the costume of a measurement; the caller can render these numbers.
  };
}

module.exports = { snapshot, movers, marketRead, NOT_COINS };
