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
function snapshot(posts, lex, { ts = Date.now() } = {}) {
  const coins = new Map();

  const touch = (key, kind) => {
    if (!coins.has(key)) {
      coins.set(key, { key, kind, posts: 0, people: new Map(), views: 0, erSum: 0, erN: 0,
                       promo: 0, failure: 0 });
    }
    return coins.get(key);
  };

  for (const p of posts || []) {
    const author = p.authorId || p.handle || 'unknown';
    const cred = credibility(p.author || {}).score;
    let hits;
    try { hits = resolve.mentions(p.text, lex); } catch { continue; }

    for (const h of hits) {
      // Addresses are exact identity and always count. Tickers must be a DELIBERATE reference
      // (cashtag or better) and must not be an ordinary word — see D-71/D-72.
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

module.exports = { snapshot, movers, NOT_COINS };
