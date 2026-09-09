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
    source: 'pump.fun',
  };
  const hasAnything = info.description || info.twitter || info.telegram || info.website;
  return hasAnything ? info : null;
}

module.exports = { fetchPumpFunInfo };
