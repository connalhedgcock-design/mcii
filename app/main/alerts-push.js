const { getJSON } = require('./adapters/http');

// Push the current holdings to the Cloudflare Worker that sends Telegram liquidity-pull alerts
// while both laptops are closed (`cloudflare/telegram-alerts/`).
//
// WHY THE APP PUSHES INSTEAD OF THE WORKER READING THE CHAIN
// The worker cannot read the wallet itself. Measured 2026-09-01: every free keyless Solana RPC
// refuses `getTokenAccountsByOwner` from Cloudflare's network -- api.mainnet-beta answers
// `403 "Your IP or provider is blocked"` (it blocks datacenter IPs) and publicnode answers
// `403 "Request blocked"` for that method specifically while serving getHealth fine. It is an
// expensive account-scan call and the free tiers all block it. The app has no such problem from a
// laptop, so the app supplies WHICH coins are held and the worker prices them every 5 minutes.
//
// The obvious objection to a pushed list is staleness, and it mostly does not apply here: a coin
// can only be BOUGHT while a laptop is open, and this runs on every portfolio load. What it cannot
// catch is a trade made on a phone, away from the app -- the worker warns if the list goes stale.
//
// ! FAILURE IS ALWAYS SILENT-BUT-LOGGED. This is a side effect of loading the portfolio, and a
// Cloudflare outage or a missing token must never break the portfolio screen itself.

const ACCOUNT_ID = '76c51ad89ce615efa6d6381536ab415a';
const NAMESPACE_ID = '13c26aa744c24d7b9286fc90c72ca136';

// Only push when the list actually changed. The portfolio reloads whenever the tab is opened, and
// KV's free tier allows 1,000 writes/day across everything -- the cron already spends 288 of them.
let lastPushed = null;

async function pushHoldings(positions) {
  const token = process.env.CLOUDFLARE_KV_TOKEN;
  if (!token) return { skipped: 'no CLOUDFLARE_KV_TOKEN set' };

  // Only real positions. Dust and airdrop spam are not worth alerting on, and the worker applies
  // the same $1 floor -- this just avoids shipping hundreds of worthless mints.
  const list = (positions || [])
    .filter((p) => p && p.ca && Number(p.tokens) > 0 && Number(p.valueUsd || 0) >= 1)
    .map((p) => ({ ca: p.ca, sym: p.sym || '?', tokens: Number(p.tokens) }))
    .sort((a, b) => a.ca.localeCompare(b.ca));

  const fingerprint = JSON.stringify(list);
  if (fingerprint === lastPushed) return { skipped: 'unchanged' };

  const body = JSON.stringify({ pushedAt: Date.now(), positions: list });
  try {
    await getJSON(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}/values/holdings`,
      {
        method: 'PUT',
        timeoutMs: 15000,
        retries: 1,
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'text/plain' },
        body,
      },
    );
    lastPushed = fingerprint;
    return { pushed: list.length };
  } catch (e) {
    // Logged, never thrown: the portfolio screen must still render if Cloudflare is down.
    console.error('[alerts-push] could not update holdings:', e.message);
    return { error: e.message };
  }
}

module.exports = { pushHoldings };

// Push a just-admitted coin so the Telegram worker can tell the phone immediately, rather than
// waiting for that coin's first price move to trigger the existing D-96 alert. Same trick as
// pushHoldings() above, same reason: the worker cannot see this on its own -- FOMO's notifications
// only exist on this Mac (fomonotifications.js's own header), so the app has to hand it over.
//
// ! a SEPARATE KV key from holdings, and a LIST that only ever grows until the worker consumes it.
// The worker deletes what it has sent (see cloudflare/telegram-alerts/src/index.js), so this key
// holds only events nobody has been notified about yet -- never a full history, never something
// this file needs to dedupe against, since "already sent" lives on the worker's side of the line.
async function pushDiscoveryEvent({ ca, sym, reasons, evidence }) {
  const token = process.env.CLOUDFLARE_KV_TOKEN;
  if (!token) return { skipped: 'no CLOUDFLARE_KV_TOKEN set' };

  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}/values/discovery-events`;
  try {
    // Read-modify-write: append to whatever the worker has not yet drained. A lost event here
    // (two admissions landing at the exact same moment) is not appended twice, only the last write
    // wins on a true race -- acceptable for an alert, not acceptable for money, which is why this
    // is the discovery feed and never the holdings one.
    let existing = [];
    try {
      const got = await getJSON(url, {
        timeoutMs: 10000, retries: 1, headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(got)) existing = got;
    } catch (e) { /* key not created yet on first-ever push -- start from empty, not an error */ }

    existing.push({ ca, sym, reasons, evidence, at: Date.now() });
    await getJSON(url, {
      method: 'PUT', timeoutMs: 15000, retries: 1,
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'text/plain' },
      body: JSON.stringify(existing),
    });
    return { pushed: true };
  } catch (e) {
    console.error('[alerts-push] could not push discovery event:', e.message);
    return { error: e.message };
  }
}

module.exports.pushDiscoveryEvent = pushDiscoveryEvent;

