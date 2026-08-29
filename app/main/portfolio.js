const wallet = require('./adapters/wallet');
const { fetchPrices } = require('./adapters/dexscreener');

// The portfolio: what each venue's wallet holds, valued at what it is worth right now.
//
// WHY THIS READS THE CHAIN AND NOT THE VENUES
// FOMO and Axiom are both non-custodial, so the positions are not really "in" either venue --
// they are in wallets the operators control, and the venue is just the interface they were bought
// through. Asking the chain therefore needs no login, cannot break when a venue redesigns, does
// not put the app in the business of reading an authenticated session, and keeps the app's
// read-only promise intact. The venues' own pages remain the place to TRADE; this is the place to
// see what you are holding, with the app's own safety and exit analysis attached.
//
// WHAT THIS DELIBERATELY DOES NOT KNOW
// Cost basis. The chain records that an address holds N tokens, not what was paid for them, so
// there is no P&L here and none should be invented. A venue knows your fills; the chain does not.
// `costBasisUsd` is carried through if the operator has entered one, and left null otherwise --
// null means "not known", and must never be rendered as zero.

// A wallet full of airdropped spam is normal. Pricing every mint would cost hundreds of requests
// to describe a dozen real positions, so the tail is capped and reported rather than silently cut.
const MAX_PRICED = 300;
// Below this a "position" is dust or an airdrop, not something anyone is holding on purpose.
const DUST_USD = 1;

async function forWallet(venue, address, { costBasis = {} } = {}) {
  const w = await wallet.fetchHoldings(address);
  const mints = w.holdings.map((h) => h.mint).slice(0, MAX_PRICED);
  const prices = await fetchPrices(mints);

  const positions = [];
  let unpriced = 0;
  for (const h of w.holdings) {
    const p = prices.get(h.mint);
    if (!p) { unpriced++; continue; }
    const valueUsd = h.amount * p.priceUsd;
    positions.push({
      ca: h.mint, venue,
      sym: p.symbol || '?', name: p.name || null, chain: p.chain,
      tokens: h.amount, priceUsd: p.priceUsd, valueUsd,
      change24h: p.priceChange?.h24 ?? null,
      liquidityUsd: p.liquidityUsd, marketCap: p.marketCap,
      costBasisUsd: costBasis[h.mint] ?? null,
      program: h.program,
    });
  }
  positions.sort((a, b) => b.valueUsd - a.valueUsd);

  const kept = positions.filter((p) => p.valueUsd >= DUST_USD);
  const dust = positions.length - kept.length;
  return {
    venue, address: w.address, sol: w.sol,
    positions: kept,
    // Reported, not hidden: "you also hold 4,000 worthless things" is true and occasionally
    // matters (an airdrop can be real), but it is not the portfolio.
    dustCount: dust,
    unpricedCount: unpriced,
    truncated: w.holdings.length > MAX_PRICED ? w.holdings.length - MAX_PRICED : 0,
    totalUsd: kept.reduce((s, p) => s + p.valueUsd, 0),
    fetchedAt: Date.now(),
  };
}

// One venue failing must not blank the whole portfolio -- a wallet that errored is reported as
// errored, beside the one that worked. Never a zero: an unreadable wallet is not an empty wallet.
async function load(wallets, { costBasis = {} } = {}) {
  const venues = [];
  for (const [venue, address] of Object.entries(wallets || {})) {
    if (!address) continue;
    try { venues.push(await forWallet(venue, address, { costBasis })); }
    catch (e) { venues.push({ venue, address, error: e.message, positions: [], totalUsd: null }); }
  }
  return { venues, combined: combine(venues), fetchedAt: Date.now() };
}

// The combined view sums the SAME MINT across venues into one line, because holding the same coin
// in two places is one exposure, not two. The per-venue split is kept on the line so it stays
// answerable where a position actually lives.
function combine(venues) {
  const ok = venues.filter((v) => !v.error);
  const byMint = new Map();
  for (const v of ok) {
    for (const p of v.positions) {
      const cur = byMint.get(p.ca);
      if (cur) {
        cur.tokens += p.tokens;
        cur.valueUsd += p.valueUsd;
        cur.byVenue[p.venue] = (cur.byVenue[p.venue] || 0) + p.tokens;
        if (p.costBasisUsd != null) cur.costBasisUsd = (cur.costBasisUsd || 0) + p.costBasisUsd;
      } else {
        byMint.set(p.ca, { ...p, venue: null, byVenue: { [p.venue]: p.tokens } });
      }
    }
  }
  const positions = [...byMint.values()].sort((a, b) => b.valueUsd - a.valueUsd);
  const totalUsd = positions.reduce((s, p) => s + p.valueUsd, 0);
  return {
    positions, totalUsd,
    // Concentration is the one number that matters most in a two-coin book and it is not on any
    // venue's screen, because no venue can see the other one.
    topWeightPct: totalUsd > 0 && positions.length ? (positions[0].valueUsd / totalUsd) * 100 : null,
    venuesCounted: ok.length,
    venuesFailed: venues.length - ok.length,
  };
}

module.exports = { load, forWallet, combine, MAX_PRICED, DUST_USD };
