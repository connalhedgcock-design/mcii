const { getJSON, sleep } = require('./http');
const SOL = 'So11111111111111111111111111111111111111112';

async function fetchTokenMeta(ca) {
  const r = await getJSON(`https://lite-api.jup.ag/tokens/v2/search?query=${ca}`);
  const t = Array.isArray(r) ? r.find((x) => x.id === ca) : null;
  if (!t) throw new Error('token not found on Jupiter');
  return { decimals: t.decimals, circSupply: t.circSupply, dev: t.dev,
           // Second, independent holder count. RugCheck's index reset on 2026-08-27 and reported
           // a 97% drop that the app recorded as fact; one source for a number is one too few.
           holderCount: t.holderCount ?? null,
           twitter: t.twitter, telegram: t.telegram, fetchedAt: Date.now() };
}

async function priceImpact(ca, decimals, wholeTokens) {
  const amount = BigInt(Math.floor(wholeTokens)) * (10n ** BigInt(decimals));
  // ⚠️ Tighter than getJSON's default (3 retries, 20s each) on purpose. This call is one disposable
  // sample inside a 17-round binary search, not a one-shot "must succeed" request -- the search
  // itself is the resilience. Letting each sample retry 3x at 20s turned one degraded Jupiter
  // response into a 20+ minute hang for a single coin (2026-08-29, see 70-AREAS/mcii-overview).
  const q = await getJSON(
    `https://lite-api.jup.ag/swap/v1/quote?inputMint=${ca}&outputMint=${SOL}&amount=${amount}&slippageBps=5000`,
    { retries: 0, timeoutMs: 6000 }
  );
  return Math.abs(parseFloat(q.priceImpactPct));
}

// The number that actually matters: how much can be sold before the price moves against you.
// Quoted market cap is notional; this is the real ceiling on a position. Binary search because
// Jupiter routes across every venue and there is no closed-form answer.
//
// ⚠️ Bounded two ways, not one: an overall wall-clock budget (this must never again be the reason
// the whole app looks frozen) AND an early exit on repeated failures (if Jupiter is down right now
// for this token, the 12th identical failure teaches nothing the 3rd didn't already). Either one
// returns whatever was found so far -- a partial answer, never a block.
async function maxExitable(ca, decimals, priceUsd, maxImpact = 0.05) {
  const BUDGET_MS = 12000;
  const started = Date.now();
  let lo = 0, hi = 200_000_000, best = 0, consecutiveFails = 0;
  for (let i = 0; i < 17; i++) {
    if (Date.now() - started > BUDGET_MS) break;
    const mid = Math.floor((lo + hi) / 2);
    if (mid <= 0) break;
    let impact;
    try { impact = await priceImpact(ca, decimals, mid); consecutiveFails = 0; }
    catch { impact = 99; if (++consecutiveFails >= 3) break; }
    if (impact <= maxImpact) { best = mid; lo = mid; } else { hi = mid; }
    await sleep(300); // stay well inside Jupiter's free-tier limits
  }
  return { tokens: best, usd: best * priceUsd, maxImpact, fetchedAt: Date.now() };
}
module.exports = { fetchTokenMeta, maxExitable };
