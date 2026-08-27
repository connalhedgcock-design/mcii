const { getJSON } = require('./http');

async function fetchSafety(ca) {
  const d = await getJSON(`https://api.rugcheck.xyz/v1/tokens/${ca}/report`);
  const holders = (d.topHolders || []).map((h) => ({ pct: h.pct, insider: !!h.insider }));
  return {
    mintAuthority: d.mintAuthority,          // null == revoked == good
    freezeAuthority: d.freezeAuthority,      // null == revoked == good
    metadataMutable: !!(d.tokenMeta && d.tokenMeta.mutable),
    rugged: !!d.rugged,
    risks: d.risks || [],
    totalHolders: d.totalHolders,
    top1Pct: holders[0]?.pct ?? null,
    top10Pct: holders.slice(0, 10).reduce((s, h) => s + (h.pct || 0), 0),
    insiderCount: holders.filter((h) => h.insider).length,
    // pump.fun AMM pools hold liquidity at the protocol level rather than in a lockable LP token,
    // so a null here means "not applicable", not "unlocked". Reported as unverified, never as pass.
    lpLockedPct: (d.markets || [])[0]?.lpLockedPct ?? null,
    fetchedAt: Date.now(),
  };
}
module.exports = { fetchSafety };
