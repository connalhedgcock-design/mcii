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

// --- value over time ----------------------------------------------------------------------
//
// !! WHAT THIS LINE IS, EXACTLY: what TODAY'S holdings would have been worth at past prices.
// It is NOT a record of what the portfolio was worth, because nothing here knows what was held
// last week -- the chain says what an address holds now, not what it held then. If a coin was
// bought yesterday, this line still prices it across the whole window, which makes the past look
// like it was held all along. Labelled in the UI as a reconstruction for exactly that reason:
// showing it as portfolio history would be the same class of error as diffing a holder count
// across a redefinition (50-LOG/2026-08-28-data-integrity.md).
//
// The honest version of this needs recorded snapshots, so `record()` below starts collecting them
// now; once there is enough, the real series can replace the reconstruction.

const gecko = require('./adapters/geckoterminal');

// GeckoTerminal is ~30 req/min and a portfolio can hold a dozen coins, so candles are cached.
// Price history for a past window does not change; only the newest candle does.
const CANDLES = new Map();
const CANDLE_TTL = 10 * 60000;

async function candlesFor(ca) {
  const hit = CANDLES.get(ca);
  if (hit && Date.now() - hit.at < CANDLE_TTL) return hit.data;
  try {
    const h = await gecko.fetchHistory(ca);
    CANDLES.set(ca, { at: Date.now(), data: h });
    return h;
  } catch { CANDLES.set(ca, { at: Date.now(), data: null }); return null; }
}

const lastAtOrBefore = (rows, ts) => {
  let v = null;
  for (const r of rows) { if (r.ts > ts) break; v = r.c; }
  return v;
};

// Sum many per-coin price series onto one timeline. Pure, so the part that is easy to get subtly
// wrong is the part that is tested.
//
// ⚠️ Starts where EVERY held coin has a price, not where the oldest one does. A coin that only
// began trading halfway through the window would otherwise contribute nothing before that, and the
// line would show the book "growing" -- an artefact of the token's age, not of anything owned or
// earned. Better to draw a shorter line than a flattering one.
function alignSeries(priced) {
  if (!priced.length) return [];
  const startsAt = Math.max(...priced.map((x) => x.rows[0].ts));
  const grid = [...new Set(priced.flatMap((x) => x.rows.map((r) => r.ts)))]
    .filter((ts) => ts >= startsAt).sort((a, b) => a - b);
  const points = [];
  for (const ts of grid) {
    let usd = 0, ok = true;
    for (const { p, rows } of priced) {
      const px = lastAtOrBefore(rows, ts);
      if (px == null) { ok = false; break; }
      usd += p.tokens * px;
    }
    if (ok) points.push({ ts, usd });
  }
  return points;
}

async function series(positions, days = 1) {
  const held = (positions || []).filter((p) => p.tokens > 0);
  if (!held.length) return { points: [], days, missing: [], truncated: false };

  const useHours = days <= 7;
  const since = Date.now() - days * 864e5;

  const priced = [];
  const missing = [];
  for (const p of held) {
    const h = await candlesFor(p.ca);
    const rows = (useHours ? h?.hours : h?.days) || [];
    const inRange = rows.filter((r) => r.ts >= since && r.c > 0);
    if (inRange.length < 2) { missing.push(p.sym); continue; }
    priced.push({ p, rows: inRange });
  }
  if (!priced.length) return { points: [], days, missing, truncated: false };

  const points = alignSeries(priced);
  return {
    points, days, missing,
    // True when the line covers less than asked -- a young coin caps the whole window, and the
    // chart must say so rather than implying 30 days of history it does not have. The tolerance is
    // one bucket: a daily series legitimately starts up to a day inside the window.
    truncated: points.length ? points[0].ts > since + (useHours ? 36e5 : 864e5) * 1.5 : false,
    // What the line is actually worth at its right edge, so the caller can see when it differs
    // from the book's real total -- which it does whenever a coin has no price history.
    endUsd: points.length ? points[points.length - 1].usd : null,
    coveredHours: points.length ? (points[points.length - 1].ts - points[0].ts) / 36e5 : 0,
  };
}

// Mark-to-market change over 24h on the CURRENT book: what the same coins are worth now versus
// what they were worth a day ago. Not realised P&L, and not affected by cost basis -- if anything
// was bought or sold inside the window this measures the price move, not the trade.
async function pnl24(positions) {
  const held = (positions || []).filter((p) => p.tokens > 0);
  let then = 0, now = 0, covered = 0;
  const missing = [];
  for (const p of held) {
    now += p.valueUsd;
    const h = await candlesFor(p.ca);
    const rows = (h?.hours || []).filter((r) => r.c > 0);
    const target = Date.now() - 864e5;
    const px = rows.length ? lastAtOrBefore(rows, target) : null;
    if (px != null) { then += p.tokens * px; covered++; continue; }
    // Fall back to the venue-reported 24h move, which the rest of the app already treats as a
    // weaker source because it comes from whichever single pool is deepest right now.
    if (p.change24h != null && p.change24h > -100) { then += p.valueUsd / (1 + p.change24h / 100); covered++; }
    else { then += p.valueUsd; missing.push(p.sym); }   // unknown move contributes no change
  }
  if (!covered) return null;
  return { then, now, absUsd: now - then, pct: then > 0 ? ((now - then) / then) * 100 : null, missing };
}

module.exports = { load, forWallet, combine, series, pnl24, alignSeries, MAX_PRICED, DUST_USD };
