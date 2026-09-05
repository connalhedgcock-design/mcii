/**
 * synthesis — the fused reading the operator asked for (ROOM-BRIEF §17-21):
 * "Show all the individual stuff as it is important but also show a verdict
 * and say if its relatively positive or negative."
 *
 * PURE FUNCTIONS, ZERO IMPORTS — same contract as station-geometry.js, and for
 * the same reason: a claim about what the data MEANS is exactly the kind of
 * thing that rots into a comment nobody executes. app/test/synthesis.test.js
 * calls every rule below.
 *
 * Four laws this file exists to enforce, all of them from the vault:
 *
 *  1. MISSING IS NOT NEUTRAL. An input with no data does not vote 0; it drops
 *     out and REDUCES coverage, which reduces confidence. A verdict computed
 *     from one of four inputs must not look like a verdict computed from four.
 *  2. A CONFLICT IS ITS OWN STATE, never an average. Price up while a whale
 *     dumps is not "mixed, 0.1" — averaging is how you turn a warning into a
 *     shrug. Opposed strong inputs raise `conflict`, and the room paints that
 *     as a warning (operator, §18).
 *  3. MANUFACTURED ENTHUSIASM VOTES NEGATIVE. Not "unknown". `hype.reliability`
 *     already says so in its own words; this is that decision honoured rather
 *     than re-litigated.
 *  4. NO FAKE INPUT. There is no trader/wallet feed in this app yet (nothing is
 *     wired to walletflow.js, data/wallets.json is empty). `trader` is therefore
 *     ALWAYS absent here, by omission, never by inventing a zero. When that feed
 *     lands, pass it in — the weighting below already has its slot.
 */

/** Weight of each input in the fused score. Safety and trader outweigh social:
 *  a failed safety gate or a whale exiting is a fact about the asset; sentiment
 *  is a fact about a conversation. */
export const WEIGHTS = { safety: 1.0, market: 1.0, trader: 1.0, social: 0.7 };

/** hype.reliability()'s own confidence words → a number the needle can point at. */
export const CONF = { none: 0, low: 0.25, moderate: 0.6, good: 0.9 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sign = (v, dead = 0) => (v > dead ? 1 : v < -dead ? -1 : 0);

/** One input's vote. `strength` is 0..1 magnitude, `conf` 0..1 how much this
 *  reading can be trusted at all. Both are needed: a huge move measured once is
 *  not the same evidence as a modest move measured forty times. */
function vote(key, { dir, strength, conf, why }) {
  return { key, dir, strength: clamp(strength, 0, 1), conf: clamp(conf, 0, 1), why };
}

// ── the individual readings ────────────────────────────────────────────────

/** MARKET. Price move dominates, liquidity and exit-depth trends temper it —
 *  a price rising while the pool drains is the classic shape of a move you
 *  cannot actually sell into, and it must not read as a clean positive. */
export function marketVote(t) {
  if (!t || !t.market) return null;
  const p = t.trend?.price24h;
  const chg = (p && p.spanHours >= 20) ? p.pct : t.market.priceChange?.h24;   // D-117, same rule as app.js
  if (chg == null) return null;

  const parts = [{ v: sign(chg, 3), s: clamp(Math.abs(chg) / 25, 0, 1), w: 1 }];
  if (t.trend?.liq) parts.push({ v: sign(t.trend.liq.pct, 4), s: clamp(Math.abs(t.trend.liq.pct) / 30, 0, 1), w: 0.6 });
  if (t.trend?.exitUsd) parts.push({ v: sign(t.trend.exitUsd.pct, 4), s: clamp(Math.abs(t.trend.exitUsd.pct) / 30, 0, 1), w: 0.6 });

  const wsum = parts.reduce((a, x) => a + x.w, 0);
  const net = parts.reduce((a, x) => a + x.v * x.s * x.w, 0) / wsum;

  // Confidence is OUR OWN recorded readings, not the exchange's number. Under
  // ~6 readings this is one snapshot with a trend line drawn through it.
  const recorded = t.trend?.recorded ?? 0;
  const conf = clamp(0.25 + recorded / 24, 0, 0.95);

  const why = `${chg >= 0 ? 'up' : 'down'} ${Math.abs(chg).toFixed(1)}% over 24h`
    + (t.trend?.liq ? `, liquidity ${t.trend.liq.pct >= 0 ? '+' : ''}${t.trend.liq.pct.toFixed(0)}%` : '');
  return vote('market', { dir: sign(net), strength: Math.abs(net), conf, why });
}

/** SAFETY. The gate is not a direction, it is a floor: FAIL is loud and
 *  negative, PASS is quiet and mildly positive. A passed safety check is not a
 *  reason to buy and must never be weighted like one. */
export function safetyVote(t) {
  const v = t?.gate?.verdict;
  if (!v) return null;
  if (v === 'FAIL') return vote('safety', { dir: -1, strength: 1, conf: 0.9, why: 'failed the safety checks' });
  if (v === 'CAUTION') return vote('safety', { dir: -1, strength: 0.45, conf: 0.8, why: `${t.gate.findings?.length || 0} safety flag${t.gate.findings?.length === 1 ? '' : 's'}` });
  return vote('safety', { dir: 1, strength: 0.3, conf: 0.85, why: 'safety checks clean' });
}

/** SOCIAL. Takes socialFor()'s payload as-is. Law 3 lives here. */
export function socialVote(soc) {
  const b = soc?.latest;
  if (!b) return null;
  const rel = soc.reliability || {};
  const conf = CONF[rel.confidence] ?? 0;

  if (rel.manipulated) {
    // Not "no reading" — a promoted conversation is evidence, pointing down.
    return vote('social', { dir: -1, strength: 0.7, conf: 0.55, why: 'conversation has the shape of a promoted one' });
  }
  if (b.sentiment == null || rel.thin) {
    return vote('social', { dir: 0, strength: 0, conf: Math.min(conf, 0.2), why: `only ${b.uniqueAuthors ?? 0} people posting` });
  }
  const breadth = soc.breadth?.value;
  const parts = [{ v: sign(b.sentiment, 0.15), s: clamp(Math.abs(b.sentiment), 0, 1), w: 1 }];
  if (breadth != null) parts.push({ v: sign(breadth, 0.5), s: clamp(Math.abs(breadth) / 3, 0, 1), w: 0.7 });
  const wsum = parts.reduce((a, x) => a + x.w, 0);
  const net = parts.reduce((a, x) => a + x.v * x.s * x.w, 0) / wsum;

  const why = `${b.uniqueAuthors} posting, tone ${b.sentiment > 0.2 ? 'positive' : b.sentiment < -0.2 ? 'negative' : 'mixed'}`
    + (breadth != null ? `, ${breadth >= 0 ? 'wider' : 'narrower'} than usual` : '');
  return vote('social', { dir: sign(net), strength: Math.abs(net), conf, why });
}

/** TRADER / WALLET FLOW. §20: sells are near-unambiguous, buys are weak — so
 *  the same magnitude of flow votes HARDER when it is a sell. Nothing calls
 *  this yet (law 4); it is written and tested now so the room does not have to
 *  be redesigned around it later.
 *  @param flow {{ buyUsd, sellUsd, buyers, sellers, windowH }} */
export function traderVote(flow) {
  if (!flow || (flow.buyUsd == null && flow.sellUsd == null)) return null;
  const buy = flow.buyUsd || 0, sell = flow.sellUsd || 0;
  const net = buy - sell, gross = buy + sell;
  if (!gross) return null;
  const share = net / gross;                       // -1 all selling … +1 all buying
  // The asymmetry, in one line: selling pressure is taken at face value, buying
  // pressure is halved. Wash trading is the base rate in this asset class, and
  // it manufactures BUYS far more often than it manufactures exits.
  const strength = share < 0 ? clamp(Math.abs(share), 0, 1) : clamp(share * 0.5, 0, 1);
  const conf = clamp(0.35 + Math.min(flow.buyers + flow.sellers, 30) / 60, 0, 0.9);
  const why = share < 0
    ? `${flow.sellers || 0} tracked wallets net sold $${Math.round(sell - buy).toLocaleString()}`
    : `${flow.buyers || 0} tracked wallets net bought $${Math.round(net).toLocaleString()}`;
  return vote('trader', { dir: sign(share, 0.08), strength, conf, why });
}

// ── the fusion ─────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   score: number,        // -1..1, the fused reading
 *   label: string,        // 'positive' | 'negative' | 'mixed' | 'no reading'
 *   confidence: number,   // 0..1 — what drives the needle AND its dimming
 *   coverage: number,     // 0..1 — how many weighted inputs actually reported
 *   conflict: null | { up: string[], down: string[] },
 *   votes: object[],      // every input, kept so the room can show them beside the verdict
 * }}
 */
export function fuse({ market = null, safety = null, social = null, trader = null } = {}) {
  const votes = [market, safety, social, trader].filter(Boolean);
  if (!votes.length) {
    return { score: 0, label: 'no reading', confidence: 0, coverage: 0, conflict: null, votes: [] };
  }

  let num = 0, den = 0;
  for (const v of votes) {
    const w = WEIGHTS[v.key] * v.conf;
    num += v.dir * v.strength * w;
    den += w;
  }
  const score = den ? num / den : 0;

  // Coverage counts WEIGHT that reported, against all weight that could have.
  const possible = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const reported = votes.reduce((a, v) => a + WEIGHTS[v.key], 0);
  const coverage = reported / possible;

  // Law 2. "Strong" is a real threshold, not any nonzero nudge, or every coin
  // in a mixed market shows a conflict light and the light stops meaning anything.
  const STRONG = 0.30;
  const up = votes.filter((v) => v.dir > 0 && v.strength >= STRONG).map((v) => v.key);
  const down = votes.filter((v) => v.dir < 0 && v.strength >= STRONG).map((v) => v.key);
  const conflict = up.length && down.length ? { up, down } : null;

  // Confidence is the weighted mean of what each input trusts about itself,
  // then knocked down by how much of the picture is missing. A single reading
  // out of four possible cannot produce a confident verdict, however sure that
  // one reading is of itself.
  const meanConf = votes.reduce((a, v) => a + v.conf * WEIGHTS[v.key], 0) / reported;
  const confidence = clamp(meanConf * (0.45 + 0.55 * coverage), 0, 1);

  const label = conflict ? 'conflict'
    : score > 0.18 ? 'positive'
    : score < -0.18 ? 'negative'
    : 'mixed';

  return { score, label, confidence, coverage, conflict, votes };
}

/** Everything the rooms need for one coin, in one call. `soc` and `flow` are
 *  optional — absent means absent (law 1), never neutral. */
export function readCoin(t, soc = null, flow = null) {
  return fuse({
    market: marketVote(t),
    safety: safetyVote(t),
    social: socialVote(soc),
    trader: traderVote(flow),
  });
}

/** §24: red sells, green buys — but LABELLED, because red/green already means
 *  down/up in this room and the operator asked for the meaning spelled out. */
export function riskWord(reading) {
  if (!reading || reading.label === 'no reading') return { word: '', tone: '' };
  if (reading.conflict) return { word: 'conflicting', tone: 'warn' };
  if (reading.score > 0.18) return { word: 'opportunity', tone: 'up' };
  if (reading.score < -0.18) return { word: 'risk', tone: 'down' };
  return { word: 'neutral', tone: '' };
}

// ── the market's bodies: planets and asteroids ─────────────────────────────

/** §10, verbatim: coins we hold, and coins whose traded volume blew up or fell
 *  off today, are PLANETS. Smaller/untracked coins with a big volume change are
 *  ASTEROIDS, and become planets if they persist.
 *
 *  ! `volShockPct` is volume today against that coin's OWN trailing average,
 *  not against other coins. A $40k coin doubling is the event; a $4M coin
 *  doubling is a different event; comparing their raw volumes says nothing.
 *
 *  @param rows screenLatest().tokens, each optionally carrying volShockPct/volAvg
 *  @returns {{planets: object[], asteroids: object[]}}
 */
export function classifyBodies(rows, { shockPct = 40, persistScans = 3, maxPlanets = 8, maxAsteroids = 14 } = {}) {
  const shock = (r) => (r.volShockPct == null ? null : r.volShockPct);
  const moved = (r) => shock(r) != null && Math.abs(shock(r)) >= shockPct;

  const held = rows.filter((r) => r.onWatchlist);
  const heldSet = new Set(held.map((r) => r.ca));

  // A mover earns planet status by STICKING AROUND — the operator's own rule:
  // "if those coins stick around for some period of time ... they could become
  // represented as planets".
  const movers = rows.filter((r) => !heldSet.has(r.ca) && moved(r))
    .sort((a, b) => Math.abs(shock(b)) - Math.abs(shock(a)));

  const persistent = movers.filter((r) => (r.scans || 0) >= persistScans);
  const transient = movers.filter((r) => (r.scans || 0) < persistScans);

  const planets = [...held, ...persistent].slice(0, maxPlanets);
  const planetSet = new Set(planets.map((r) => r.ca));
  const asteroids = [...transient, ...persistent.filter((r) => !planetSet.has(r.ca))].slice(0, maxAsteroids);

  return { planets, asteroids };
}

/** Body size from market cap, on a log scale and CLAMPED at both ends: a
 *  linear map makes one $2B coin a body the size of the room and every other
 *  planet a dot, which is a chart that answers only one question. */
export function bodySize(mcap, { min = 26, max = 78 } = {}) {
  if (!mcap || mcap <= 0) return min;
  const lo = Math.log10(50_000), hi = Math.log10(500_000_000);
  const f = clamp((Math.log10(mcap) - lo) / (hi - lo), 0, 1);
  return Math.round(min + f * (max - min));
}
