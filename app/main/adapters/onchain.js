const { getJSON } = require('./http');

// Ground truth, computed from the chain rather than taken from anyone's index.
//
// Written 2026-08-28 after RugCheck's holder index reset and the app reported CATE losing 90% of
// its holders. Verified against chain that day:
//   258,724  token accounts that exist for CATE
//   116,152  of them holding an actual balance   <- this is what "holders" means
//   142,572  empty or closed
// Jupiter's holderCount read 116,181 at the same moment (0.03% off) and RugCheck's pre-reset
// figure read 252,968 -- so the two were never contradicting each other, they were counting
// different things, and conflating them was our error rather than theirs.
//
// This call returns ~62MB and takes ~6s, so it is a periodic calibration rather than a poll.

const RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const TOKEN_LEGACY = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

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

// Which token program owns this mint. Querying the wrong one returns zero accounts and looks
// exactly like a token nobody holds -- which is how this was nearly missed.
async function tokenProgram(mint) {
  const info = await rpc('getAccountInfo', [mint, { encoding: 'base64' }]);
  return info?.value?.owner || TOKEN_LEGACY;
}

async function holderCount(mint) {
  const program = await tokenProgram(mint);
  const accounts = await rpc('getProgramAccounts', [program, {
    encoding: 'base64',
    dataSlice: { offset: 64, length: 8 },   // the amount field only
    filters: [{ memcmp: { offset: 0, bytes: mint } }],
  }]);

  let holders = 0, empty = 0;
  const amounts = [];
  for (const a of accounts) {
    const raw = Buffer.from(a.account.data[0], 'base64');
    if (raw.length < 8) { empty++; continue; }
    const v = raw.readBigUInt64LE(0);
    if (v > 0n) { holders++; amounts.push(v); } else empty++;
  }
  amounts.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  const total = amounts.reduce((s, v) => s + v, 0n);
  const pct = (n) => total > 0n
    ? Number(amounts.slice(0, n).reduce((s, v) => s + v, 0n) * 10000n / total) / 100
    : null;

  return {
    holders,                    // accounts with a balance -- the honest meaning of "holders"
    tokenAccounts: accounts.length,
    emptyAccounts: empty,
    top1Pct: pct(1), top10Pct: pct(10), top100Pct: pct(100),
    program: program === TOKEN_2022 ? 'token-2022' : 'token',
    source: 'onchain', fetchedAt: Date.now(),
  };
}
module.exports = { holderCount, tokenProgram };
