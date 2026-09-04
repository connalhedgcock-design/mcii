// Who actually transacted on a coin's own pool -- read straight from the chain, no DEX-specific
// instruction parsing. Foundation for wallet/whale tracking (T-016/T-017) and for distinct-BUYER
// count (`60-KB/market-signal-research.md`) -- built once, on purpose, because both need the same
// underlying read: who moved this token, not how many transactions happened.
//
// !! MEASURED 2026-09-02, live, from the collection host (Hetzner, a datacenter IP): D-93 found
// that `getTokenAccountsByOwner` is refused from a datacenter IP ("Request blocked" on publicnode,
// the same refusal Cloudflare's worker hit). That method answers "what does this ONE wallet hold" --
// a different question from what wallet tracking needs, "who has been trading THIS pool". Tested
// directly: `getSignaturesForAddress` and `getTransaction` -- the two methods this file actually
// uses -- both return real data from this same host. D-93's constraint is narrower than it reads.
// ! do not assume a new method is blocked without testing IT specifically. This file's own test is
// the reason it exists at all.
//
// !! DEX-AGNOSTIC ON PURPOSE. This does not parse pump.fun / Raydium / PumpSwap swap instructions --
// three different formats that change without notice, where a parsing bug would get silently
// wrong, which is this project's single most-repeated failure shape (D-60, D-63, D-85, the 08-29
// hang). Instead it reads `preTokenBalances` / `postTokenBalances` off the transaction's own
// `meta` -- fields Solana computes for every transaction, for every account touched, regardless of
// which program ran. Diffing them gives "who gained or lost how much of this mint", without caring
// what mechanism produced it. Verified live: both arrays carry `owner`, `mint`, `accountIndex` and
// `uiTokenAmount` on a real CATE trade.
//
// ! THIS FILE ONLY EXTRACTS FLOW. It does not judge whether a wallet is worth tracking, is linked
// to the coin's deployer, or is wash-trading with itself -- `80-WHISPERS/whale-tracking/README`'s
// funding-link filter is a separate, NOT YET BUILT step that must run before any of this reaches a
// screen or a notification. Wash trading is the BASE RATE in this asset class (Victor & Weintraud,
// WWW 2021: >30% of tokens on both exchanges studied showed it), not the exception -- shipping raw
// flow straight to a person would hand them manufactured activity dressed as real interest, the
// exact failure the research this file cites was written to warn against.

const { getJSON } = require('./http');

const RPC = process.env.WALLETFLOW_RPC || 'https://solana-rpc.publicnode.com';
// ! mainnet-beta measured 2026-09-02 from this same host: TCP/TLS connects, the request sends,
// then NOTHING comes back -- a silent hang, not a clean error. That is worse than a fast refusal
// (D-87: one untimed hang like this froze the collector for 3h46m). publicnode answers in
// milliseconds for the methods below. Do not switch the default without re-testing live.

async function rpc(method, params, opts = {}) {
  const d = await getJSON(RPC, {
    method: 'POST', timeoutMs: opts.timeoutMs || 15000, retries: opts.retries ?? 2,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  // ! a JSON-RPC error rides inside an HTTP 200 -- getJSON only rejects on HTTP status, so a
  // refusal shaped like this would read as data if `.error` were not checked separately. This is
  // exactly the D-93 lesson ("mainnet-beta's refusal arrives as a well-formed JSON-RPC error
  // body"), applied here rather than only where it was first found.
  if (d.error) throw new Error(`RPC ${method}: ${d.error.message || JSON.stringify(d.error)}`);
  return d.result;
}

// Recent transaction signatures touching this pool address, newest first.
async function poolSignatures(poolAddress, { limit = 40, before = null } = {}) {
  const params = before ? { limit, before } : { limit };
  const r = await rpc('getSignaturesForAddress', [poolAddress, params]);
  // A failed transaction moved no real tokens -- reading its balances would be misleading, not
  // merely uninteresting, so these are dropped before anything downstream sees them.
  return (r || []).filter((s) => !s.err).map((s) => s.signature);
}

// Pages backward through a pool's history via the `before` cursor, oldest page requested last.
// Used for validating flow-extraction coverage over a real window, not (yet) for anything live.
async function poolSignaturesPaged(poolAddress, { pages = 5, pageSize = 100 } = {}) {
  let before = null;
  const all = [];
  for (let p = 0; p < pages; p++) {
    const sigs = await poolSignatures(poolAddress, { limit: pageSize, before: before || undefined });
    if (!sigs.length) break;
    all.push(...sigs);
    before = sigs[sigs.length - 1];
    if (sigs.length < pageSize) break; // reached the start of the pool's history
  }
  return all;
}

// One transaction -> every account whose balance of `mint` changed.
// `delta > 0` = that owner GAINED the mint (a buy, from their side). `delta < 0` = a sell.
async function flowForTransaction(signature, mint) {
  const tx = await rpc('getTransaction',
    [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]);
  if (!tx || !tx.meta) return [];

  const pre = new Map();
  for (const b of tx.meta.preTokenBalances || []) {
    if (b.mint === mint) pre.set(b.accountIndex, { owner: b.owner, amt: Number(b.uiTokenAmount?.uiAmount || 0) });
  }

  const out = [];
  for (const b of tx.meta.postTokenBalances || []) {
    if (b.mint !== mint) continue;
    const before = pre.get(b.accountIndex);
    const beforeAmt = before ? before.amt : 0;
    const after = Number(b.uiTokenAmount?.uiAmount || 0);
    pre.delete(b.accountIndex);
    const delta = after - beforeAmt;
    // ! owner can be absent post-close on some accounts; the pre-side owner is authoritative when
    // present, since a closed account's post entry may carry no owner at all.
    const owner = b.owner || before?.owner;
    if (delta !== 0 && owner) out.push({ owner, mint, delta, ts: tx.blockTime || null, signature });
  }
  // An account index that HAD the mint pre-transaction and has no post entry at all closed the
  // account entirely -- that is a full exit, not a rounding artefact, and must not be silently
  // dropped the way a naive "only look at postTokenBalances" read would drop it.
  for (const [, before] of pre) {
    if (before.amt > 0 && before.owner) {
      out.push({ owner: before.owner, mint, delta: -before.amt, ts: tx.blockTime || null, signature });
    }
  }
  return out;
}

// Every wallet's net flow of `mint` across recent transactions touching `watchAddress`.
//
// !! MEASURED 2026-09-02: PASS THE MINT ITSELF, NOT ONE SPECIFIC POOL'S ADDRESS. First built
// against DexScreener's `mainPool.address` (one AMM pool) and validated at only ~10-28% of that
// pool's own recent signatures showing a real balance change -- most referenced it without moving
// this mint's balance there specifically (a coin usually trades through more than one pool/route,
// and a token account is not always the account DexScreener reports as the "pair"). Querying the
// MINT ACCOUNT directly instead -- which every transfer of the token references, regardless of
// which pool or route carried it -- measured 72% on CATE and 40% on DOGE-1, both a large
// improvement, confirmed on two different coins before changing the default. `watchAddress`
// therefore defaults to the mint; a specific pool address still works if ever needed, it is just
// no longer the recommended target.
// ! the pool account's OWN balance still swings on every trade by construction -- it is not a
// "wallet" in the sense this feature means. Excluded by address match against `watchAddress` only
// when a pool address is what was actually passed; when watching the mint there is no single pool
// address to exclude, and the AMM's own vault accounts will legitimately appear as counterparties.
async function poolFlow(watchAddress, mint, { limit = 40 } = {}) {
  const sigs = await poolSignatures(watchAddress, { limit });
  const rows = [];
  for (const sig of sigs) {
    try {
      const flow = await flowForTransaction(sig, mint);
      for (const f of flow) if (f.owner !== watchAddress) rows.push(f);
    } catch (e) {
      // A failed read of ONE transaction never invents a zero for it (D-29's rule, applied to a
      // single transaction rather than a whole collection pass) -- it is skipped, not recorded.
    }
  }
  return rows;
}

// --- FOLLOWED WALLETS: the inverse direction -- given a WALLET, what did IT do, in anything ----
// Everything above answers "who traded THIS COIN" (query by mint). This answers "what did THIS
// WALLET do", across every coin it touched, not only the ones already on a watchlist -- which
// means a followed wallet buying something brand new surfaces that coin on its own, feeding
// straight into discovery rather than only ever confirming coins found some other way.
//
// ! WHO GETS FOLLOWED IS NEVER THIS FILE'S DECISION. Connal, 2026-09-04: rather than the algorithm
// inventing a "known good trader" list (no free, honest source exists -- see
// 80-WHISPERS/whale-tracking/README's finding that every such claim online is unverifiable vendor
// marketing), HE curates which wallets are worth following -- the same D-16 pattern already used
// for coins, applied to wallets instead of tickers. This file only watches whichever addresses
// `data/wallets.json` names; it has no opinion on who belongs there.

// One transaction -> every balance change belonging to `walletAddress`, across ANY mint it holds
// (not filtered to one coin). `delta > 0` = the wallet gained that mint. `delta < 0` = it sold.
async function walletActivity(signature, walletAddress) {
  const tx = await rpc('getTransaction',
    [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]);
  if (!tx || !tx.meta) return [];

  const pre = new Map();
  for (const b of tx.meta.preTokenBalances || []) {
    if (b.owner === walletAddress) pre.set(b.accountIndex, Number(b.uiTokenAmount?.uiAmount || 0));
  }
  const out = [];
  for (const b of tx.meta.postTokenBalances || []) {
    if (b.owner !== walletAddress) continue;
    const before = pre.has(b.accountIndex) ? pre.get(b.accountIndex) : 0;
    const after = Number(b.uiTokenAmount?.uiAmount || 0);
    pre.delete(b.accountIndex);
    const delta = after - before;
    if (delta !== 0) out.push({ owner: walletAddress, mint: b.mint, delta, ts: tx.blockTime || null, signature });
  }
  // Same full-exit case as flowForTransaction: an account this wallet held pre-transaction with no
  // post entry at all was closed entirely, and that is a complete sell, not silence.
  for (const [, before] of pre) {
    if (before > 0) out.push({ owner: walletAddress, mint: null, delta: -before, ts: tx.blockTime || null, signature });
  }
  return out;
}

// Recent activity for a followed wallet, across everything it has touched.
async function walletHistory(walletAddress, { limit = 40 } = {}) {
  const sigs = await poolSignatures(walletAddress, { limit });
  const rows = [];
  for (const sig of sigs) {
    try { rows.push(...await walletActivity(sig, walletAddress)); }
    catch (e) { /* D-29: a failed read of ONE transaction is skipped, never recorded as a zero */ }
  }
  return rows;
}

module.exports = { poolSignatures, poolSignaturesPaged, flowForTransaction, poolFlow, walletActivity, walletHistory };
