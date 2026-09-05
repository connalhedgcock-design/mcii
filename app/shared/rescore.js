// THE CONTINUOUS RESCORE + THE ENTRY RULE -- Connal, 2026-09-05, verbatim: "We should be pulling
// all of our data points into the scoring of the coin through an analysis of the crypto news, real
// news, social media tracker, market data, and top trader activity. And any one of those being
// pinged should trigger the analysis of all of the others for that coin and that is how we monitor
// our tracking list the coins with the highest scores will be the ones we are tracking and
// notified for."
//
// !! WHAT THIS ADDS OVER `admission.js`, WHICH IT DOES NOT REPLACE. `admission.js` answers "has
// this coin earned a tracked slot" ONCE, at discovery, and it stays the only thing that adds a coin
// to the watchlist. This answers a different question, continuously, for coins ALREADY tracked:
// "given everything known right now, is this a moment worth acting on." Same gates, same votes, same
// tiers -- plus the one reading that only exists for a coin with history behind it.
//
// !! THE ENTRY RULE, STATED PLAINLY, AND WHY IT HAS THIS EXTRA CLAUSE.
//   ENTRY-WORTHY = admission's own GREEN bar (every gate passed, 2+ sensors agreeing, at least one
//   of them not the market talking to itself)  AND  the coin is not in a known-manufactured shape.
// That second clause is new tonight and it is the whole point. fact @Mongardini & Mei (arXiv
// 2507.01963, 34,988 tokens): 82.8% of memecoins gaining >100% show artificial growth. Measured on
// this project's own coins (`60-KB/market-manipulation-research.md`): only 1 of 17 with holder
// history showed real growth, and `fone` gained 341% while its holder count FELL. A rule that only
// asked "are the sensors positive" would walk straight into that -- the sensors are LOUDEST during
// a manufactured pump, because manufacturing loudness is the entire technique.
// ! `growthQuality` needs history, so a brand-new coin returns `unknown` -- which is NOT treated as
// bad. Unknown blocks nothing; only a KNOWN-bad shape does (D-29: absent data is not evidence).
//
// ! this outputs a tier and its reasons. It never says buy, never sizes anything, and nothing here
// executes -- `10-CTX/mandate.md`, unchanged by any of it.

const admission = require('./admission');
const marketmanip = require('./marketmanip');

const MANUFACTURED_SHAPES = ['crowd-leaving-whale-staying', 'price-up-nobody-arriving'];

// `sensors` = { market, fomo, social, news } exactly as `admission.evaluateCandidate` takes them.
// `history` = this coin's own past snapshot rows (for the growth read). Both optional-tolerant.
function rescore({ ca, sym, market, fomo = [], social, news, history = [] } = {}) {
  const base = admission.evaluateCandidate({ ca, sym, market, fomo, social, news });
  const growth = marketmanip.growthQuality(history);

  const reasons = [...base.reasons];
  let tier = base.tier;
  let entryWorthy = base.tier === 'green';

  // The manufactured-shape veto. Applies ONLY to a coin whose own history says so -- never to a
  // coin we simply have no holder data for.
  const manufactured = MANUFACTURED_SHAPES.includes(growth.verdict);
  if (manufactured) {
    reasons.push(`growth shape says otherwise: ${growth.why}`);
    if (entryWorthy) {
      entryWorthy = false;
      tier = 'yellow'; // every sensor agreed, but who actually holds it disagrees -- not a red gate,
      reasons.push('sensors are positive but the people holding it are leaving -- not treated as an entry');
    }
  } else if (growth.verdict === 'real-looking-growth') {
    reasons.push(`growth shape supports it: ${growth.why}`);
  }

  return {
    ca, sym, tier, entryWorthy,
    admit: base.admit,                // unchanged, still the only thing that adds to the watchlist
    growth: { verdict: growth.verdict, why: growth.why },
    evidence: base.evidence,
    reasons,
    scoredAt: Date.now(),
  };
}

// "Any one of those being pinged should trigger the analysis of all of the others" -- one coin,
// every sensor, on demand. The CALLER supplies current readings; this file fetches nothing, so it
// stays testable against fixed inputs (the same reason `admission.js` is pure).
function rescoreAll(coins) {
  return coins.map((c) => rescore(c)).sort((a, b) => {
    const rank = { green: 0, yellow: 1, red: 2 };
    return rank[a.tier] - rank[b.tier];
  });
}

module.exports = { rescore, rescoreAll, MANUFACTURED_SHAPES };
