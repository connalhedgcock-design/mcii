const { getJSON } = require('./http');

// What a wallet actually holds, read straight from the chain.
//
// This is the portfolio's only data source, and it is deliberately NOT the venues' own APIs.
// FOMO and Axiom are both non-custodial: the coins live in a wallet the operator controls, so
// the honest question is "what is in this address", which the chain answers for free, forever,
// without a login, without a key, and without breaking when a venue redesigns its UI.
//
// !! ONLY EVER GIVEN A PUBLIC ADDRESS. Nothing here accepts, stores or transmits a private key
// or seed phrase, and nothing here can move funds -- getTokenAccountsByOwner and getBalance are
// both read-only RPC calls. If a future change needs a signature, it does not belong in this file.
//
// ! BOTH token programs are queried and merged. Legacy and Token-2022 are separate programs, and
// asking the wrong one returns an empty list that looks EXACTLY like "this wallet holds nothing"
// (see adapters/onchain.js -- that silent-plausible-zero cost a day of debugging on 2026-08-28,
// and CATE, which both operators hold, is a Token-2022 mint).

const RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const TOKEN_LEGACY = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const LAMPORTS = 1e9;

// Base58, 32-44 chars. Checked before any request so a typo produces a clear message here
// rather than an opaque RPC error, and so nothing obviously malformed is sent anywhere.
const ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function isAddress(a) { return typeof a === 'string' && ADDRESS_RE.test(a.trim()); }

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'User-Agent': 'MCII/0.1' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message || 'rpc error');
  return d.result;
}

async function accountsForProgram(owner, programId) {
  const r = await rpc('getTokenAccountsByOwner', [owner, { programId }, { encoding: 'jsonParsed' }]);
  return (r?.value || []).map((a) => {
    const info = a.account?.data?.parsed?.info || {};
    const amt = info.tokenAmount || {};
    return {
      mint: info.mint,
      amount: Number(amt.uiAmount || 0),
      decimals: amt.decimals ?? null,
      raw: amt.amount ?? null,
      program: programId === TOKEN_2022 ? 'token-2022' : 'token',
    };
  });
}

// Everything this address holds. Empty accounts are dropped: a closed or drained position is not
// a holding, and showing a row of zeroes would misrepresent the portfolio's actual composition.
async function fetchHoldings(owner) {
  const addr = String(owner || '').trim();
  if (!isAddress(addr)) throw new Error('that does not look like a Solana address');

  const [legacy, t22, lamports] = await Promise.all([
    accountsForProgram(addr, TOKEN_LEGACY),
    accountsForProgram(addr, TOKEN_2022),
    rpc('getBalance', [addr]).then((r) => r?.value ?? 0).catch(() => null),
  ]);

  // One wallet can hold the same mint across several token accounts; the position is their sum,
  // not the largest of them.
  const byMint = new Map();
  for (const a of [...legacy, ...t22]) {
    if (!a.mint || !(a.amount > 0)) continue;
    const prev = byMint.get(a.mint);
    if (prev) prev.amount += a.amount;
    else byMint.set(a.mint, { ...a });
  }

  return {
    address: addr,
    sol: lamports == null ? null : lamports / LAMPORTS,
    holdings: [...byMint.values()].sort((a, b) => b.amount - a.amount),
    fetchedAt: Date.now(),
  };
}

module.exports = { fetchHoldings, isAddress, TOKEN_2022, TOKEN_LEGACY };
