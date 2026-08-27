const { getJSON, sleep } = require('./http');
const SOL = 'So11111111111111111111111111111111111111112';

async function fetchTokenMeta(ca) {
  const r = await getJSON(`https://lite-api.jup.ag/tokens/v2/search?query=${ca}`);
  const t = Array.isArray(r) ? r.find((x) => x.id === ca) : null;
  if (!t) throw new Error('token not found on Jupiter');
  return { decimals: t.decimals, circSupply: t.circSupply, dev: t.dev,
           twitter: t.twitter, telegram: t.telegram, fetchedAt: Date.now() };
}

async function priceImpact(ca, decimals, wholeTokens) {
  const amount = BigInt(Math.floor(wholeTokens)) * (10n ** BigInt(decimals));
  const q = await getJSON(
    `https://lite-api.jup.ag/swap/v1/quote?inputMint=${ca}&outputMint=${SOL}&amount=${amount}&slippageBps=5000`
  );
  return Math.abs(parseFloat(q.priceImpactPct));
}

// The number that actually matters: how much can be sold before the price moves against you.
// Quoted market cap is notional; this is the real ceiling on a position. Binary search because
// Jupiter routes across every venue and there is no closed-form answer.
async function maxExitable(ca, decimals, priceUsd, maxImpact = 0.05) {
  let lo = 0, hi = 200_000_000, best = 0;
  for (let i = 0; i < 17; i++) {
    const mid = Math.floor((lo + hi) / 2);
    if (mid <= 0) break;
    let impact;
    try { impact = await priceImpact(ca, decimals, mid); } catch { impact = 99; }
    if (impact <= maxImpact) { best = mid; lo = mid; } else { hi = mid; }
    await sleep(300); // stay well inside Jupiter's free-tier limits
  }
  return { tokens: best, usd: best * priceUsd, maxImpact, fetchedAt: Date.now() };
}
module.exports = { fetchTokenMeta, maxExitable };
