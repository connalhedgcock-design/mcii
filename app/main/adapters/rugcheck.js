const { getJSON } = require('./http');

async function fetchSafety(ca) {
  const d = await getJSON(`https://api.rugcheck.xyz/v1/tokens/${ca}/report`);
  // ! RugCheck's `address` is the TOKEN ACCOUNT (the SPL account holding the balance), NOT the
  // wallet that controls it -- `owner` is the actual wallet. Confirmed live 2026-09-09 the hard
  // way: checking `.address`'s native SOL balance for five different top holders of a real,
  // established coin (CATE) returned the exact same 0.00203928 SOL for all five -- the Solana
  // token-account rent-exempt minimum, not a real wallet balance. Every one of them was reading an
  // empty, rent-only token account. `.owner` for the same holders returned real, differing
  // balances (checked live: 14.28 SOL on the top holder). Anything that wants to check THIS
  // HOLDER as a wallet -- balance, funding source, anything walletflow.js/washtrade.js do -- must
  // use `owner`, never `address`.
  const holders = (d.topHolders || []).map((h) => ({ address: h.address || null, owner: h.owner || null, pct: h.pct, insider: !!h.insider }));
  return {
    // Addresses ride along now (confirmed live 2026-09-09 that RugCheck's own report carries
    // `address`/`owner` per holder, previously dropped here) -- the HUD's top-5 wallet forensics
    // needs the actual owning wallet, not just the share, to check balance and funding source.
    topHolders: holders.slice(0, 10),
    mintAuthority: d.mintAuthority,          // null == revoked == good
    freezeAuthority: d.freezeAuthority,      // null == revoked == good
    metadataMutable: !!(d.tokenMeta && d.tokenMeta.mutable),
    rugged: !!d.rugged,
    risks: d.risks || [],
    // RugCheck's "totalHolders" counts TOKEN ACCOUNTS, including empty ones. Verified on chain
    // 2026-08-28: CATE had 258,724 token accounts but only 116,152 holding a balance. Calling
    // this "holders" was our mistake, not theirs -- and it made an accurate number look wrong.
    tokenAccounts: d.totalHolders,
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
