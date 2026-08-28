// Pure functions only: no network, no clock, no randomness. Keeps scoring replayable and testable,
// and stops the classic backtest bug where a "historical" score quietly uses live data.

const CRITICAL = 'CRITICAL', HIGH = 'HIGH', MED = 'MED';

function evaluateSafety(safety, market) {
  const findings = [];
  const add = (level, label, detail) => findings.push({ level, label, detail });

  if (safety.rugged) add(CRITICAL, 'Already rugged', 'This token is flagged as having already been rugged.');
  if (safety.mintAuthority) add(CRITICAL, 'Supply is not fixed',
    'Someone can still create new tokens out of nothing, diluting every holder.');
  if (safety.freezeAuthority) add(CRITICAL, 'Your tokens can be frozen',
    'The token owner can stop you selling from your own wallet.');
  if (safety.metadataMutable) add(HIGH, 'Token details can be changed',
    'The name, symbol and image can be rewritten after you buy.');

  for (const r of safety.risks || []) {
    const lvl = /danger|critical/i.test(r.level) ? CRITICAL : /warn/i.test(r.level) ? HIGH : MED;
    add(lvl, r.name, r.description);
  }

  if (safety.top1Pct != null && safety.top1Pct > 15) add(HIGH, 'One wallet holds a lot',
    `The largest holder owns ${safety.top1Pct.toFixed(1)}% of supply. If they sell, the price moves hard.`);
  else if (safety.top1Pct != null && safety.top1Pct > 8) add(MED, 'Largest holder is sizeable',
    `The largest holder owns ${safety.top1Pct.toFixed(1)}% of supply.`);

  if (safety.top10Pct > 40) add(HIGH, 'Ownership is concentrated',
    `The top 10 wallets hold ${safety.top10Pct.toFixed(1)}% between them.`);
  if (safety.insiderCount > 0) add(HIGH, 'Insider wallets detected',
    `${safety.insiderCount} of the top holders are flagged as connected to the launch.`);

  if (market) {
    if (market.totalLiquidityUsd < 30000) add(HIGH, 'Very thin liquidity',
      `Only $${Math.round(market.totalLiquidityUsd).toLocaleString()} sits in the pools. Getting out is hard.`);
    const ageDays = market.pairCreatedAt ? (Date.now() - market.pairCreatedAt) / 86400000 : null;
    if (ageDays != null && ageDays < 3) add(MED, 'Brand new pool',
      `This pool is ${ageDays.toFixed(1)} days old. There is no track record yet.`);
  }
  // Holders means wallets actually holding a balance. Token-account counts include empty and
  // closed accounts and run far higher -- for CATE, 258,724 accounts against 116,152 holders.
  if (safety.totalHolders != null && safety.totalHolders < 200) add(MED, 'Few holders',
    `${safety.totalHolders} wallets hold this. Small crowds move violently.`);

  const worst = findings.some(f => f.level === CRITICAL) ? CRITICAL
              : findings.some(f => f.level === HIGH) ? HIGH
              : findings.some(f => f.level === MED) ? MED : null;

  return {
    verdict: worst === CRITICAL ? 'FAIL' : worst === HIGH ? 'CAUTION' : 'PASS',
    worst, findings,
    // Never rendered as a pass. pump.fun pools hold liquidity at protocol level, so null is
    // "can't confirm", which is a different thing from "confirmed safe".
    lpStatus: safety.lpLockedPct == null ? 'unverified' : `${safety.lpLockedPct}% locked`,
  };
}

// Plain-English one-liner. This is the only thing shown at the top level -- never a number.
function verdictSentence(sym, gate, market, exit, position) {
  const bits = [];
  if (gate.verdict === 'FAIL') bits.push(`${sym} fails the safety check.`);
  else if (gate.verdict === 'CAUTION') bits.push(`${sym} is structurally sound but has warnings.`);
  else bits.push(`${sym} passes every structural safety check.`);

  const d = market?.priceChange?.h24;
  if (d != null) {
    const dir = d >= 0 ? 'up' : 'down';
    bits.push(`Price is ${dir} ${Math.abs(d).toFixed(1)}% in 24 hours.`);
  }
  if (exit?.usd != null) {
    if (position?.tokens) {
      const held = position.tokens * (market?.priceUsd || 0);
      bits.push(held <= exit.usd
        ? `You could sell your whole position (about $${fmt(held)}) without moving the price much.`
        : `You hold about $${fmt(held)} but could only sell around $${fmt(exit.usd)} of it before the price drops 5%.`);
    } else {
      bits.push(`Around $${fmt(exit.usd)} can be sold before the price drops 5%.`);
    }
  }
  return bits.join(' ');
}
const fmt = (n) => Math.round(n).toLocaleString();

module.exports = { evaluateSafety, verdictSentence, CRITICAL, HIGH, MED };
