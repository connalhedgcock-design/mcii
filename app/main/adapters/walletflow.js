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
async function poolSignatures(poolAddress, { limit = 40 } = {}) {
  const r = await rpc('getSignaturesForAddress', [poolAddress, { limit }]);
  // A failed transaction moved no real tokens -- reading its balances would be misleading, not
  // merely uninteresting, so these are dropped before anything downstream sees them.
  return (r || []).filter((s) => !s.err).map((s) => s.signature);
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

// Every wallet's net flow of `mint` across a pool's recent transactions.
// ! the pool account's OWN balance swings on every single trade by construction -- it is not a
// "wallet" in the sense this feature means, and including it would make the pool look like the
// single biggest trader of its own coin on every run. Excluded by address match, not a heuristic.
async function poolFlow(poolAddress, mint, { limit = 40 } = {}) {
  const sigs = await poolSignatures(poolAddress, { limit });
  const rows = [];
  for (const sig of sigs) {
    try {
      const flow = await flowForTransaction(sig, mint);
      for (const f of flow) if (f.owner !== poolAddress) rows.push(f);
    } catch (e) {
      // A failed read of ONE transaction never invents a zero for it (D-29's rule, applied to a
      // single transaction rather than a whole collection pass) -- it is skipped, not recorded.
    }
  }
  return rows;
}

module.exports = { poolSignatures, flowForTransaction, poolFlow };
