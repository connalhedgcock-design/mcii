// Fast liquidity/price alert for HELD positions, on Cloudflare's cron scheduler rather than
// GitHub Actions' — see 70-AREAS/trading-strategy/README.md for why. GitHub's scheduler has
// already caused a multi-hour silent outage in this project once (50-LOG/2026-08-29-scanner-hang,
// D-61) and is explicitly "best-effort, never a guarantee" here. Cloudflare's Cron Triggers do not
// share that failure mode. A local background process was considered and rejected for one reason:
// the whole point is alerting while both laptops are CLOSED, and a local clock stops exactly then.
//
// !! WHY HOLDINGS ARRIVE FROM THE APP INSTEAD OF BEING READ HERE
// This worker cannot read the wallet itself. Measured from a Worker on 2026-09-01, EVERY free
// keyless Solana RPC refuses `getTokenAccountsByOwner`: api.mainnet-beta returns
// `403 "Your IP or provider is blocked"` (it blocks datacenter IPs) and publicnode returns
// `403 "Request blocked"` for that specific method while answering getHealth fine. It is an
// expensive account-scan call and free endpoints universally block it. So the desktop app — which
// reads the wallet perfectly well from a laptop — pushes the current holdings into KV, and this
// worker prices them. DexScreener, unlike the RPCs, answers Cloudflare without complaint.
//
// The staleness that would normally make a pushed list dangerous does not really apply: a coin can
// only be BOUGHT while a laptop is open, and the app pushes on every portfolio load, so the list is
// current as of the last time anyone could have traded. What it cannot catch is a coin bought on a
// phone, away from the app — see the README.
//
// Thresholds match app/main/live.js's in-app fast monitor exactly (liquidity -15% CRITICAL,
// price -12% HIGH) -- those are the numbers this project already trusts to mean something.

const LIQ_DROP_PCT = -15;
const PRICE_DROP_PCT = -12;
const ALERT_COOLDOWN_SEC = 900;  // 15 min, matches index.js's native-notification dedupe window
const DUST_USD = 1;              // below this it is an airdrop, not a position. matches portfolio.js
const PRICE_BATCH = 30;          // DexScreener's documented ceiling per call
const STALE_HOLDINGS_HOURS = 72; // warn once if the app has not pushed in this long

// D-95: upward moves are reported too, on any TRACKED coin, held or not. `proof: PRICE_RISE_PCT`
// ! ASYMMETRIC ON PURPOSE (+20 against -12), and the asymmetry is the whole design:
//   - a fall in something you hold costs money NOW; a rise in something you do not hold costs
//     nothing and only becomes information.
//   - these coins rise more often than they fall hard, so a symmetric bar would produce mostly
//     upward alerts, and an alerter that mostly cries "up" trains you to ignore it — which would
//     cost you the rug alert it exists for.
// ! falsifier for this number: if rise alerts arrive more than about twice a day per coin, 20 is
//   too low and should go up. Measure before tuning.
const PRICE_RISE_PCT = 20;

// How old a social reading may be before it is quoted as "no recent reading" rather than as fact.
// Collection runs twice an hour; 3 hours means several consecutive misses, not one blip.
const SOCIAL_STALE_HOURS = 3;

export default {
  async scheduled(event, env, ctx) {
    // Two independent jobs. The collector watchdog runs even if the holdings check throws --
    // ! the watchdog is the thing that reports everything else being broken, so it must never be
    // downstream of anything that can break.
    ctx.waitUntil(Promise.allSettled([run(env), watchCollector(env), sendDiscoveryEvents(env)]));
  },

  // Test hook for `wrangler dev` only. The deployed worker sets `workers_dev = false` and declares
  // no routes, so it has NO public URL and this handler is unreachable in production -- it exists
  // because `--test-scheduled` does not await ctx.waitUntil(), so a scheduled test returns before
  // any work happens and silently proves nothing. If a route or workers.dev subdomain is ever
  // added, this must be removed or authenticated first: it triggers real Telegram sends.
  async fetch(req, env) {
    try {
      const [holdings, watchdog] = await Promise.all([run(env), watchCollector(env)]);
      return new Response(JSON.stringify({ holdings, watchdog }, null, 2),
        { headers: { 'content-type': 'application/json' } });
    } catch (e) {
      return new Response(`error: ${e.stack || e.message}`, { status: 500 });
    }
  },
};

// --- DISCOVERY EVENTS -------------------------------------------------------------------------
// Sends a phone alert the moment the app admits a new coin, rather than waiting for that coin's
// first price move. The app pushes to KV (alerts-push.js: pushDiscoveryEvent) because this worker
// has no way to see a coin get admitted on its own -- the admission decision runs on Connal's Mac,
// reading FOMO notifications that only exist there.
// ! DRAINS the key on every run -- reads it, sends what is there, deletes it. The key holds only
// UNSENT events by construction, so there is nothing to dedupe: if it exists, it has not been
// sent yet. A failed send below aborts before the delete, so a Telegram outage re-tries next run
// rather than losing the event silently.
async function sendDiscoveryEvents(env) {
  const raw = await env.ALERTS_KV.get('discovery-events');
  if (!raw) return { sent: 0 };
  const events = safeParse(raw, []);
  if (!Array.isArray(events) || !events.length) { await env.ALERTS_KV.delete('discovery-events'); return { sent: 0 }; }

  const unsent = [];
  let sent = 0;
  for (const e of events) {
    const reasons = (e.reasons || []).join('\n');
    const ok = await sendTelegram(env,
      `🔎 Now tracking ${e.sym || '?'}\n\n${reasons}\n\nNot advice, and not a suggestion to do anything.`);
    if (ok) sent++; else unsent.push(e); // a failed send stays in the key, tried again next run
  }
  if (unsent.length) await env.ALERTS_KV.put('discovery-events', JSON.stringify(unsent));
  else await env.ALERTS_KV.delete('discovery-events');
  return { sent, retrying: unsent.length };
}

// --- COLLECTOR WATCHDOG -----------------------------------------------------------------------
// !! THE WATCHER MUST NOT BE ABLE TO DIE WITH THE THING IT WATCHES.
// This runs on Cloudflare, not on the collection server, and asks GitHub a question the server has
// no part in answering: "when did data last actually arrive?". So it still fires if the server is
// off, wedged, out of disk, unpaid, or quietly pushing nothing. A checker living on the server
// could never report the server being down, which is the failure that matters most.
//
// It watches the OUTPUT, not the machine. Every failure mode -- hung run, dead timer, revoked
// deploy key, exhausted budget, Hetzner suspending the box -- ends in the same observable: commits
// to `data/` stop. One check covers all of them, including the ones nobody has thought of yet.
//
// ! IT NEVER ALERTS BECAUSE IT COULD NOT CHECK. A failed lookup is unknown, not stale (D-29:
// failure is never a zero). Crying wolf on GitHub rate-limiting would train them to ignore it,
// which costs more than the missed alert it was trying to prevent.
const COLLECT_STALE_MIN = 95;      // two missed 30-min cycles + slack. not a fixed number: see below
const WATCHDOG_COOLDOWN_SEC = 3600;
const REPO = 'connalhedgcock-design/mcii';
// ! declared AFTER REPO on purpose — a `const` referencing another `const` above its declaration
// line throws at module load (temporal dead zone), and a worker that throws on load never runs.
// Read-only, and both files it serves are already public: D-92 keeps HOLDINGS out of the repo,
// while the watchlist and the social summary carry no position information.
const RAW = `https://raw.githubusercontent.com/${REPO}/main`;

async function watchCollector(env) {
  let iso;
  try {
    const r = await fetchWithTimeout(
      `https://api.github.com/repos/${REPO}/commits?path=data&per_page=1`,
      { headers: { accept: 'application/vnd.github+json' } }, 15000, 2);
    const j = await r.json();
    iso = j?.[0]?.commit?.committer?.date;
  } catch (e) {
    // Unauthenticated GitHub API is 60/hr per IP and Cloudflare's egress is shared, so 403/429 is
    // expected occasionally. Staying quiet is correct -- we learned nothing, not that it is broken.
    console.error('watchdog: could not check —', e.message);
    return { watchdog: 'check failed', error: e.message };
  }
  if (!iso) return { watchdog: 'no commits found' };

  const ageMin = (Date.now() - Date.parse(iso)) / 60000;
  if (ageMin <= COLLECT_STALE_MIN) {
    await env.ALERTS_KV.delete('watchdog:firing').catch(() => {});
    // ! WHO WATCHES THE WATCHDOG. If this worker, Cloudflare, the bot token or the chat ever
    // breaks, no alert arrives -- and silence looks EXACTLY like everything being fine. That
    // ambiguity is this project's oldest recurring injury (D-60: a collector whose age nothing
    // shows is indistinguishable from a broken one). One message a week resolves it: silence for
    // more than a week now means the alerting is broken, not that nothing happened. Weekly is
    // deliberately rare enough not to train them to swipe it away.
    await maybeAlert(env, 'system', 'heartbeat',
      `✅ MCII: everything is running`,
      `Data was collected ${Math.round(ageMin)} minutes ago. Alerts are working — this message is ` +
      `the proof, and you get it once a week. If a week goes by with nothing at all, the alerting ` +
      `itself has broken rather than the world having gone quiet.`,
      7 * 24 * 3600);
    return { watchdog: 'ok', dataAgeMin: Math.round(ageMin) };
  }

  await maybeAlert(env, 'system', 'collector-stale',
    `🔴 MCII: data collection has stopped`,
    `Nothing new has been collected for ${Math.round(ageMin)} minutes (normally every 30). ` +
    `The scanner is not running, or it is running and cannot save what it finds. ` +
    `Check: ssh mcii-server 'systemctl list-timers mcii-collect.timer'`,
    WATCHDOG_COOLDOWN_SEC);
  await env.ALERTS_KV.put('watchdog:firing', String(Date.now())).catch(() => {});
  return { watchdog: 'STALE', dataAgeMin: Math.round(ageMin) };
}

// All last-seen readings live in ONE KV key, not one key per coin. Cloudflare's free tier allows
// 1,000 KV writes/day; at 5-minute cadence that is 288 ticks/day, so a write-per-coin design would
// have broken past 3 held coins and silently stopped alerting. One combined record is 288
// writes/day flat, however many coins are held -- the per-coin cost was a property of the first
// design, not a real constraint. Same lesson as D-65.
async function run(env) {
  // Holdings and the tracked list are fetched together and are independent: either alone is
  // enough to do useful work, and a failure of one must not silence the other.
  const [{ positions, pushedAt }, watchlist, social] =
    await Promise.all([readHoldings(env), readTracked(), readSocialLatest()]);

  // D-95: watch every tracked coin, held or not. Held coins first so a held coin always wins the
  // dedupe if it also appears on the watchlist.
  const heldBy = new Map(positions.map((p) => [p.ca, p]));
  const watching = [...new Set([...positions.map((p) => p.ca), ...watchlist.map((t) => t.ca)])];

  if (!watching.length) {
    console.error('nothing to watch -- no holdings in KV and no readable watchlist');
    return { positionsTracked: 0, reason: 'nothing to watch' };
  }
  if (!positions.length) {
    // ! not an early return any more. Alerting on tracked coins is still worth doing, and the
    // stale-holdings warning below is what tells anyone the push side is broken.
    console.error('no holdings in KV -- watching tracked coins only');
  }

  const prevRaw = await env.ALERTS_KV.get('last-seen');
  const prev = prevRaw ? safeParse(prevRaw, {}) : {};

  const priceDiag = [];
  const priced = await priceMints(watching, priceDiag);
  const bySym = heldBy;

  const next = {};
  const tracked = [];
  for (const [ca, m] of priced) {
    const held = bySym.get(ca);
    const isHeld = !!held;
    const tokens = held?.tokens || 0;
    const valueUsd = isHeld ? tokens * m.priceUsd : null;
    // ! the dust rule applies ONLY to coins actually held. A watched coin has no position, so
    // testing its value would silently drop every tracked-but-unheld coin -- which is exactly the
    // "empty result shaped like a real answer" failure D-55 and D-93 are both about.
    if (isHeld && valueUsd < DUST_USD) continue;

    const sym = held?.sym || m.sym;
    next[ca] = { liquidityUsd: m.liquidityUsd, priceUsd: m.priceUsd, at: Date.now() };
    tracked.push(isHeld ? `${sym} $${valueUsd.toFixed(2)}` : `${sym} (watched)`);

    const before = prev[ca];
    if (!before) continue;               // first sighting -- nothing to compare against yet

    const liqPct = before.liquidityUsd
      ? ((m.liquidityUsd - before.liquidityUsd) / before.liquidityUsd) * 100 : 0;
    const pxPct = before.priceUsd
      ? ((m.priceUsd - before.priceUsd) / before.priceUsd) * 100 : 0;

    const soc = social[ca] || null;
    const evidence = (direction) =>
      alertAnalysis({ soc, liquidityUsd: m.liquidityUsd, valueUsd, held: isHeld, direction });

    if (liqPct <= LIQ_DROP_PCT) {
      await maybeAlert(env, ca, 'liquidity-pull',
        `🚨 ${sym}: liquidity dropped ${Math.abs(liqPct).toFixed(0)}%`,
        `Pool liquidity fell from $${Math.round(before.liquidityUsd).toLocaleString()} to ` +
        `$${Math.round(m.liquidityUsd).toLocaleString()}. A sudden drop is how a rug looks while ` +
        `it is happening.\n\n${evidence('down')}`);
    } else if (pxPct <= PRICE_DROP_PCT) {
      await maybeAlert(env, ca, 'price-drop',
        `⚠️ ${sym}: price fell ${Math.abs(pxPct).toFixed(0)}%`,
        `From $${before.priceUsd.toPrecision(4)} to $${m.priceUsd.toPrecision(4)}. Check liquidity ` +
        `before assuming this is just a dip.\n\n${evidence('down')}`);
    } else if (pxPct >= PRICE_RISE_PCT) {
      // D-95. ! deliberately reported for coins they do NOT hold as well. Connal overruled my
      // objection and was right on the substance: reporting a move with its evidence is analysis;
      // it is only a tip if it carries a directive, and alertAnalysis() never does.
      await maybeAlert(env, ca, 'price-rise',
        `📈 ${sym}: price rose ${pxPct.toFixed(0)}%${isHeld ? '' : ' (not held)'}`,
        `From $${before.priceUsd.toPrecision(4)} to $${m.priceUsd.toPrecision(4)}.` +
        `\n\n${evidence('up')}`);
    }
  }

  // A coin that failed to price keeps its previous reading rather than losing it: a transient
  // DexScreener blip must not blind the next tick's comparison.
  await env.ALERTS_KV.put('last-seen', JSON.stringify({ ...prev, ...next }));

  // A list nobody has refreshed in days is a silent failure mode -- the alerts would look healthy
  // while watching coins that may already be sold. Say so once, rather than never.
  const ageH = pushedAt ? (Date.now() - pushedAt) / 3600000 : null;
  if (ageH != null && ageH > STALE_HOLDINGS_HOURS) {
    await maybeAlert(env, 'system', 'stale-holdings',
      `ℹ️ MCII: holdings list is ${Math.round(ageH / 24)} days old`,
      `The desktop app has not pushed an updated holdings list since then, so these alerts may be ` +
      `watching coins you no longer hold. Open the app to refresh it.`);
  }

  return { positionsTracked: tracked.length, tracked, pricedCount: priced.size,
           priceDiag, holdingsAgeHours: ageH?.toFixed(1) ?? null };
}

function safeParse(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

// Written by the desktop app (see app/main/alerts-push.js). Shape:
//   { pushedAt: <epoch ms>, positions: [{ ca, sym, tokens }] }
// A bare array is also accepted so the key can be set by hand from wrangler for testing.
// --- WHAT ELSE THE PHONE NEEDS TO KNOW --------------------------------------------------------

// The coins being tracked, held or not (D-95). Read from the public repo rather than KV because
// the app already publishes it there on every add/remove (D-66), so there is nothing new to keep
// in sync and no second copy to go stale.
// ! a failure here must NEVER stop the held-position alerts. Tracking is a bonus; holdings are the
//   job. Returns [] on any problem and says so in the log.
async function readTracked() {
  try {
    const res = await fetchWithTimeout(`${RAW}/data/watchlist.json`, {}, 10000, 2);
    const v = await res.json();
    return Array.isArray(v) ? v.filter((t) => t && typeof t.ca === 'string' && t.ca.trim()) : [];
  } catch (e) {
    console.error(`watchlist unreadable, alerting on holdings only: ${e.message}`);
    return [];
  }
}

// Newest social reading per coin, written by the collector (`writeSocialLatest`).
// ! same rule: unreadable means the alert goes out WITHOUT the social half, never that the alert
//   is withheld. A rug alert delayed because a summary file 404'd would be an absurd trade.
async function readSocialLatest() {
  try {
    const res = await fetchWithTimeout(`${RAW}/data/social-latest.json`, {}, 10000, 2);
    const v = await res.json();
    return v && typeof v === 'object' ? v : {};
  } catch (e) {
    console.error(`social summary unreadable, alerts will omit it: ${e.message}`);
    return {};
  }
}

// D-96: every notification carries the ANALYSIS, not just the number. `proof: alertAnalysis`
//
// Builds the evidence block that goes under every alert: what the social read says, what the
// market data says, then a call with a confidence band and a falsifier.
// ! NEVER a directive. D-95's whole argument was that reporting a move is analysis while telling
//   someone to act on it is not, and the mandate bans "buy"/"sell"/"you should" outright.
// ! bands, not decimals. "hype score 73.4" is the false precision the mandate names by example, so
//   this says low/moderate/good and states what it is based on.
export function alertAnalysis({ soc, liquidityUsd, valueUsd, held, direction }) {
  const lines = [];

  // --- the social half ---
  const ageH = soc?.at ? (Date.now() - soc.at) / 36e5 : null;
  const fresh = ageH != null && ageH <= SOCIAL_STALE_HOURS;
  let socialQuality = 'none';
  if (!soc || !fresh) {
    lines.push(`Social: no recent reading${ageH != null ? ` (last one ${Math.round(ageH)}h ago)` : ''}, so this is a market-data-only call.`);
  } else if (soc.manipulated) {
    // D-23/D-105: a manufactured conversation is a WARNING, never enthusiasm to be added up.
    const why = (soc.manipReasons || []).slice(0, 2).join('; ');
    lines.push(`Social: the conversation has the shape of a promoted one${why ? ` (${why})` : ''}. Treat the enthusiasm as a warning, not as interest.`);
    socialQuality = 'manipulated';
  } else if (soc.confidence === 'none' || soc.confidence === 'low' || (soc.people ?? 0) < 12) {
    // D-24: THIN is not the same as MANIPULATED and must not collapse into one word.
    lines.push(`Social: only ${soc.people ?? 0} different people posted — too few to read anything into.`);
    socialQuality = 'thin';
  } else {
    const tone = soc.tone == null ? 'no clear tone'
      : soc.tone > 0.2 ? 'mostly positive' : soc.tone < -0.2 ? 'mostly negative' : 'mixed';
    lines.push(`Social: ${soc.people} different people posted, ${tone}.`);
    socialQuality = 'ok';
  }

  // --- the market half ---
  const liq = liquidityUsd ? `$${Math.round(liquidityUsd).toLocaleString()}` : 'unknown';
  lines.push(`Market: pool depth ${liq}${held && valueUsd != null ? `, your position about $${valueUsd.toFixed(2)}` : ', not held by you'}.`);

  // --- the call ---
  // Confidence is about the EVIDENCE, not about what happens next. Nothing here forecasts a price.
  let conf = 'low';
  if (socialQuality === 'ok' && liquidityUsd) conf = 'moderate';
  if (socialQuality === 'manipulated') conf = 'low';
  const thinPool = liquidityUsd != null && liquidityUsd < 30000;

  if (direction === 'down') {
    lines.push(`Read: a fall on ${thinPool ? 'a thin pool' : 'this depth'} is either people leaving or liquidity going. Confidence ${conf} — that is confidence in the EVIDENCE, not a forecast.`);
    lines.push(`Wrong if: the pool depth is unchanged and it recovers within an hour — then this was a trade, not an exit.`);
  } else {
    lines.push(`Read: a rise this size on ${thinPool ? 'a pool this thin' : 'this depth'} moves easily and can reverse just as fast. Confidence ${conf} — in the evidence, not in what happens next.`);
    lines.push(`Wrong if: the people posting turn out to be the same few accounts, or the pool has not grown with the price.`);
  }
  lines.push(`Not advice, and not a suggestion to do anything.`);
  return lines.join('\n');
}

async function readHoldings(env) {
  const raw = await env.ALERTS_KV.get('holdings');
  if (!raw) return { positions: [], pushedAt: null };
  const v = safeParse(raw, null);
  if (Array.isArray(v)) return { positions: v.filter(isPosition), pushedAt: null };
  if (v && Array.isArray(v.positions)) {
    return { positions: v.positions.filter(isPosition), pushedAt: v.pushedAt || null };
  }
  console.error('holdings KV value is not a recognised shape');
  return { positions: [], pushedAt: null };
}

function isPosition(p) {
  return p && typeof p.ca === 'string' && p.ca.trim() && Number(p.tokens) > 0;
}

// Batch pricing, mirroring app/main/adapters/dexscreener.js: fetchPrices. Returns a Map of
// mint -> { priceUsd, liquidityUsd, sym }. Mints with no market never appear, which for a
// portfolio is a real answer (worthless dust) rather than a failure.
//
// ⚠️ liquidityUsd here is the DEEPEST POOL's, not the sum across pools -- that is what the batch
// endpoint gives. For crash detection that is the right number anyway: an LP pull drains the pool
// the position would actually be sold into.
async function priceMints(mints, diag = []) {
  const out = new Map();
  for (let i = 0; i < mints.length; i += PRICE_BATCH) {
    const chunk = mints.slice(i, i + PRICE_BATCH);
    let pairs;
    try {
      const r = await fetchWithTimeout(`https://api.dexscreener.com/tokens/v1/solana/${chunk.join(',')}`);
      pairs = await r.json();
    } catch (e) {
      // A failed chunk prices nothing; it never prices something wrongly. Recorded so an empty
      // result can be told apart from "these coins have no market".
      diag.push(`chunk ${i}: ${e.message}`);
      continue;
    }
    if (!Array.isArray(pairs)) { diag.push(`chunk ${i}: not an array`); continue; }

    for (const p of pairs) {
      const addr = p?.baseToken?.address;
      if (!addr) continue;
      // ⚠️ Case-insensitive: EVM addresses are case-insensitive and DexScreener does not promise
      // the same casing back that you sent, so === silently matches nothing.
      const key = chunk.find((c) => String(c).toLowerCase() === String(addr).toLowerCase());
      if (!key) continue;
      const price = parseFloat(p.priceUsd);
      if (!(price > 0)) continue;
      const liq = p.liquidity?.usd || 0;
      const best = out.get(key);
      if (!best || liq > best.liquidityUsd) {
        out.set(key, { priceUsd: price, liquidityUsd: liq, sym: p.baseToken.symbol || '?' });
      }
    }
  }
  return out;
}

async function maybeAlert(env, ca, id, title, detail, cooldownSec = ALERT_COOLDOWN_SEC) {
  const cooldownKey = `cooldown:${ca}:${id}`;
  if (await env.ALERTS_KV.get(cooldownKey)) return;   // already alerted recently, stay quiet
  await env.ALERTS_KV.put(cooldownKey, '1', { expirationTtl: cooldownSec });
  await sendTelegram(env, `${title}\n${detail}`);
}

// ! RETURNS whether the send actually worked. It used to swallow every error and return nothing,
// which is fine for a fire-and-forget alert but was silently wrong for sendDiscoveryEvents() below
// -- that function needs to know a send failed so it does not delete an event nobody received.
async function sendTelegram(env, text) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
    });
    if (!res.ok) { console.error('telegram send failed:', res.status); return false; }
    return true;
  } catch (e) {
    console.error('telegram send threw:', e.message);
    return false;
  }
}

// Every network call goes through this: timeout + explicit User-Agent, matching
// app/main/adapters/http.js. D-87 exists because one untimed fetch() froze the collector for
// 3h46m; an alerting worker that hangs is an alert that never arrives.
// ⚠️ RETRIES ON 429. The first version threw on any non-ok status, which meant a single rate-limit
// response from DexScreener silently cost a whole tick -- and a missed tick during a rug is exactly
// the failure this worker exists to prevent. Mirrors http.js: 429 retries with exponential backoff,
// 401/403 throw immediately (a rejected key will not fix itself), everything else retries then throws.
async function fetchWithTimeout(url, opts = {}, timeoutMs = 20000, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(400 * Math.pow(2, attempt));
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...opts,
        signal: ctrl.signal,
        headers: { 'User-Agent': 'MCII/0.1 (personal research dashboard)', ...(opts.headers || {}) },
      });
      if (res.status === 429) { lastErr = new Error('HTTP 429 (rate limited)'); continue; }
      if (res.status === 401 || res.status === 403) throw new Error(`HTTP ${res.status} (auth rejected)`);
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      return res;
    } catch (e) {
      if (/auth rejected/.test(e.message)) throw e;
      lastErr = e.name === 'AbortError' ? new Error(`timed out after ${timeoutMs}ms`) : e;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr || new Error('request failed');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
