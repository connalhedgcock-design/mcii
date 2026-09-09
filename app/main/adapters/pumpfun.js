// pump.fun's own coin metadata -- the project's own description/socials at launch, free, no key.
// Undocumented frontend endpoint (this is what pump.fun's own site calls, not a published API) --
// it can change or disappear with no notice, same caveat as twitterapi.js's header carries for X.
// Solana/pump.fun-launchpad only: a coin from anywhere else guarantees a 404, so callers should
// gate on chain === 'solana' before spending the network round trip.
const { getJSON } = require('./http');

async function fetchPumpFunInfo(ca) {
  let d;
  try {
    // retries: 0 -- a 404 (not a pump.fun coin) is the common case, not a transient failure;
    // http.js's default 3 retries with backoff would stall the whole Story lookup for ~2.8s
    // waiting out a result that was never going to change.
    d = await getJSON(`https://frontend-api-v3.pump.fun/coins/${ca}`, { retries: 0, timeoutMs: 8000 });
  } catch { return null; } // best-effort by contract: 404, network error, malformed body all just mean "no data"
  if (!d || typeof d !== 'object') return null;

  // pump.fun returns '' for an unset field, not a missing key -- '' must read as absent.
  const info = {
    description: d.description || null,
    twitter: d.twitter || null,
    telegram: d.telegram || null,
    website: d.website || null,
    imageUri: d.image_uri || null,
    // The deploying wallet -- confirmed live 2026-09-09 on a real coin (CATE). This is the
    // creator/deployer field the HUD's rug-history check needs; no on-chain derivation required,
    // pump.fun's own API already names it for anything launched there.
    creator: d.creator || null,
    source: 'pump.fun',
  };
  const hasAnything = info.description || info.twitter || info.telegram || info.website || info.creator;
  return hasAnything ? info : null;
}

// Every coin a wallet has deployed on pump.fun, newest first as the API returns them. Confirmed
// live 2026-09-09: `/coins?creator=<addr>` genuinely filters (checked against a real creator with
// 10+ coins, every row's own `creator` field matched the query). Bounded by `limit` -- this feeds
// the HUD's rug-history check, which caps how many of a creator's past coins it will cross-check
// against MCII's own recorded signals, same RPC/call-budget discipline as `washtrade.js`.
async function fetchCoinsByCreator(creator, limit = 15) {
  if (!creator) return [];
  let list;
  try {
    list = await getJSON(`https://frontend-api-v3.pump.fun/coins?creator=${encodeURIComponent(creator)}&limit=${limit}`,
      { retries: 1, timeoutMs: 8000 });
  } catch { return []; } // best-effort, same contract as fetchPumpFunInfo
  if (!Array.isArray(list)) return [];
  return list.map((c) => ({
    ca: c.mint, symbol: c.symbol || null, name: c.name || null,
    createdAt: c.created_timestamp || null, complete: !!c.complete,
  }));
}

module.exports = { fetchPumpFunInfo, fetchCoinsByCreator };
