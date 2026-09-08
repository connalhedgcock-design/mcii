// Decides whether a CANDIDATE coin has earned an actual tracked slot -- the wiring
// `60-KB/watchlist-admission-research.md` and `70-AREAS/trading-strategy/README.md` designed and
// never connected until now. Connal, 2026-09-04: "we need a system where you can pick coins
// yourself and analyze them on the market based on the top trader tracking and the social media
// data" -- three sensors, never averaged, feeding one pass/fail with reasons.
//
// !! GATES BEFORE VOTES, same shape as the rug gate (D-33) and the researched design: a single
// disqualifying fact can reject a candidate outright, and nothing downstream can outvote it. Only
// once a candidate clears every gate do the sensors that actually have evidence get an equal vote
// -- never a fitted weight, never one sensor confirming itself (D-38/D-43: never admit on a market
// reading alone, that reproduces the "buy what already moved" bias this project rejected twice).
//
// ! PURE FUNCTIONS. Nothing here fetches anything -- it is handed a market reading, a bundle of
// FOMO signals, and a social reading, and returns a decision plus WHY. That split is what makes
// this testable against fixed, known inputs rather than only against whatever the market is doing
// right now (D-85's lesson, applied to code review instead of to a running app).

const resolve = require('./resolve');

const MIN_FOMO_TRADERS = 2;         // one trader flipping fast is not corroboration, D-105's logic
const MIN_LIQUIDITY_USD = 15000;    // base-rates.md: a pool this thin is not a real exit either way
const BUY_SELL_RATIO_MIN = 1.3;     // meaningfully more buying than selling, not a coin-flip ratio

// !! TIER, added 2026-09-05 -- Connal asked directly for a middle state between admit/reject
// ("there should be a spectrum") and for weak evidence to be SHOWN, never hidden pending proof
// (D-119). `tier` answers both with the exact same gates-then-vote logic already proven here,
// nothing new invented: 'red' = a gate failed (same reasons as always), 'green' = cleared the
// existing ADMIT bar (unchanged), 'yellow' = cleared every gate but didn't reach ADMIT -- real
// evidence exists, just not enough of it yet. `admit` (unchanged, still boolean) stays the only
// thing that triggers an actual watchlist add (`main/index.js`) -- 'yellow' is for display only,
// never for action, exactly the "show it, labelled, never act on it alone" split D-119 asked for.
// Shared with `main/index.js`'s tracked-coin alert path: "your own followed traders are selling
// this and none of them are buying" is the same fact whether it's blocking a NEW admission or
// warning about a coin already on the watchlist -- one gate, reused, not two copies that could
// silently drift apart.
function fomoSentiment(fomo = []) {
  const buyers = new Set(fomo.filter((f) => f.direction === 'buy').map((f) => f.handle));
  const sellers = new Set(fomo.filter((f) => f.direction === 'sell').map((f) => f.handle));
  return { buyers, sellers, sellOnly: buyers.size === 0 && sellers.size > 0 };
}

function evaluateCandidate({ ca, sym, chain, market, fomo = [], news, notable } = {}) {
  const reasons = [];
  const evidence = { market: null, fomo: null, news: null, notable: null };

  // --- GATES -----------------------------------------------------------------------------------
  if (!market) {
    return { admit: false, tier: 'red', reasons: ['never seen by the market scanner yet -- nothing to score'], evidence };
  }
  if (market.verdict === 'FAIL') {
    return { admit: false, tier: 'red', reasons: [`failed the safety check (${market.flags ?? '?'} finding(s))`], evidence };
  }
  if ((market.liq ?? 0) < MIN_LIQUIDITY_USD) {
    return { admit: false, tier: 'red', reasons: [`pool too thin to be a real position ($${Math.round(market.liq || 0).toLocaleString()})`], evidence };
  }
  // ! EVM/other-chain coins have NO Solana-only safety check (rugcheck/jupiter are Solana-only,
  // `70-AREAS/multichain-market-data/README`) -- market.verdict is null for them by construction,
  // not because nothing was checked. Do not hard-reject on a null verdict; say so in the evidence
  // instead, and lean harder on the other two sensors for a chain we cannot structurally vet.
  const noSafetyCoverage = market.verdict == null;
  if (noSafetyCoverage) reasons.push('no safety check exists for this chain -- unverified structurally');

  const { buyers: fomoBuyers, sellers: fomoSellers, sellOnly } = fomoSentiment(fomo);
  // A followed list net-selling something is not a moment to newly admit it -- your own trusted
  // traders are the ones telling you to stay away, and a fresh admission is not a rescue.
  if (sellOnly) {
    return { admit: false, tier: 'red', reasons: [`followed traders are selling this, not buying (${fomoSellers.size} seller(s), 0 buyers)`], evidence };
  }

  // --- VOTES, equal weight, only from sensors that actually have evidence -----------------------
  let votes = 0, possible = 0;

  possible++;
  const buys = market.buys24 ?? 0, sells = market.sells24 ?? 0;
  const ratio = sells > 0 ? buys / sells : (buys > 0 ? Infinity : 0);
  const marketPositive = ratio >= BUY_SELL_RATIO_MIN;
  evidence.market = { liq: market.liq, buys24: buys, sells24: sells, ratio: Number.isFinite(ratio) ? +ratio.toFixed(2) : null };
  if (marketPositive) { votes++; reasons.push(`more buying than selling on-chain (${buys} vs ${sells})`); }

  if (fomo.length) {
    possible++;
    evidence.fomo = { distinctBuyers: fomoBuyers.size, distinctSellers: fomoSellers.size, count: fomo.length };
    if (fomoBuyers.size >= MIN_FOMO_TRADERS) {
      votes++; reasons.push(`${fomoBuyers.size} different followed traders bought this`);
    } else if (fomoBuyers.size === 1) {
      reasons.push(`only 1 followed trader bought this -- one person is not corroboration`);
    }
  }

  // 4th sensor, added 2026-09-05 (`newsfeed.js`) -- a CONFIRMED real-world-story or crypto-media
  // hit for this coin. ! `confirmed` only -- an unreviewed self-name candidate (`kind:
  // 'self-name-candidate'`, `confirmed: false`) must never cast a vote here, that is exactly the
  // Cate-Blanchett/microduck false-positive risk `60-KB/news-catalyst-research.md` found live; a
  // human has to clear it first, same as every other unconfirmed candidate in this project.
  if (news && news.confirmed) {
    possible++;
    evidence.news = { source: news.source, title: news.title };
    votes++; reasons.push(`confirmed real-world news hit: ${news.title}`);
  }

  // 5th sensor -- the "important tweets" feed (D-122). A specific named-person post or a viral
  // post naming THIS coin, treated as a discrete event exactly like a confirmed news hit, never
  // as an averaged sentiment score (D-122's hard rule -- see synthesis.js). Same caution as the
  // news gate: only a strong-or-better match (cashtag or address, not a bare word that happens to
  // spell a ticker) casts a vote. A weaker match is real evidence but not corroboration on its own.
  if (notable && notable.matchesCoin && resolve.atLeast(notable.matchesCoin.confidence, 'strong')) {
    possible++;
    evidence.notable = { track: notable.track, handle: notable.handle, confidence: notable.matchesCoin.confidence };
    votes++;
    reasons.push(notable.track === 'named-person'
      ? `@${notable.handle} posted about this coin`
      : `a post about this coin went viral (@${notable.handle || 'unknown'})`);
  }

  // ! market alone is NEVER enough, however positive -- it is one leg, not corroboration, and
  // admitting on it alone is exactly the "trending list" shape D-38/D-43 already rejected twice.
  const nonMarketVotes = votes - (marketPositive ? 1 : 0);
  const admit = nonMarketVotes >= 1 && votes >= 2;

  if (!admit && votes < 2) reasons.push(`only ${votes} of ${possible} available vote(s) -- needs at least 2, including one non-market`);
  if (!admit && votes >= 2 && nonMarketVotes < 1) reasons.push('market agreed with itself but nothing independent confirmed it');

  // ! 'yellow' (cleared every gate, real evidence exists, just not enough of it) is DISPLAY ONLY.
  // Nothing reads this tier to decide anything -- `main/index.js` still only acts on `admit`.
  // Widening what counts as actionable is a decision for Connal to make explicitly, not something
  // that should happen by quietly wiring a UI tier into a trigger.
  const tier = admit ? 'green' : 'yellow';
  return { admit, tier, reasons, evidence };
}

module.exports = { evaluateCandidate, fomoSentiment, MIN_FOMO_TRADERS, MIN_LIQUIDITY_USD, BUY_SELL_RATIO_MIN };
