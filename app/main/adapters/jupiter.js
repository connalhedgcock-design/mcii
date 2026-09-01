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
// !! RETURNS null WHEN IT COULD NOT FIND OUT, NEVER ZERO.
// Fixed 2026-09-01 after LaPeace recorded `exitUsd: 0` while its liquidity was unchanged at $28.8k
// and the nine readings either side said $626–$867. Nothing had happened to the coin; Jupiter had
// simply stopped answering. The old code caught those failures, gave up with `best` still 0, and
// returned "you can sell $0" — a network problem wearing the costume of a honeypot.
//
// That is D-29 exactly ("a failed fetch NEVER writes a row — failure is not a zero") and it is the
// most dangerous shape of it so far: a false $0 on a coin they HOLD reads as "you are trapped",
// which is the single most alarming thing this app can say. It also poisons the stored record for
// any later analysis, and would have fired a false rug alert if this number ever drove one.
//
// Three outcomes now, kept apart because they demand opposite responses:
//   a size was found            -> that size
//   probes worked, none passed  -> 0, and that is a REAL answer: even the smallest size moves the
//                                  price too much. This is what a honeypot or a dead pool looks like.
//   probes never worked         -> null. We do not know. Say so.
async function maxExitable(ca, decimals, priceUsd, maxImpact = 0.05) {
  const BUDGET_MS = 12000;
  const started = Date.now();
  let lo = 0, hi = 200_000_000, best = 0, consecutiveFails = 0;
  let goodProbes = 0, gaveUp = null;
  for (let i = 0; i < 17; i++) {
    if (Date.now() - started > BUDGET_MS) { gaveUp = 'timed out'; break; }
    const mid = Math.floor((lo + hi) / 2);
    if (mid <= 0) break;
    let impact;
    try { impact = await priceImpact(ca, decimals, mid); consecutiveFails = 0; goodProbes++; }
    catch { impact = 99; if (++consecutiveFails >= 3) { gaveUp = 'quote service kept failing'; break; } }
    if (impact <= maxImpact) { best = mid; lo = mid; } else { hi = mid; }
    await sleep(300); // stay well inside Jupiter's free-tier limits
  }
  // ! Not knowing is only reported as an answer when we never got a usable reading at all. If
  // probes succeeded and simply showed too much slippage, zero is the truth and must be reported
  // as such — that is a real honeypot signal and suppressing it would be the opposite mistake.
  if (goodProbes === 0) {
    return null;
  }
  return { tokens: best, usd: best * priceUsd, maxImpact, fetchedAt: Date.now(),
           // Carried so a caller can tell a complete search from one cut short.
           partial: gaveUp || null, probes: goodProbes };
}
module.exports = { fetchTokenMeta, maxExitable };
