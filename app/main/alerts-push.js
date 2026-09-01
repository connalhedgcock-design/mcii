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
