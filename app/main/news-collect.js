#!/usr/bin/env node
// Standalone, one-shot: reads news, appends new headlines, exits. Meant to run every 5 minutes on
// its own schedule -- split out of `cloud-collect.js` on Connal's request, 09-09, so news can run
// faster than the 30-minute cycle the paid Twitter/social pieces stay on (free RSS feeds, so a
// faster clock doesn't cost anything). Logic moved verbatim from `cloud-collect.js`'s old "news:"
// step; do not run both, same double-collection risk D-98 flagged for two copies of one collector.
const fs = require('fs');
const path = require('path');
const REPO = path.join(__dirname, '..', '..');
const DATA = path.join(REPO, 'data');

const newsfeed = require('./adapters/newsfeed');

const log = (...a) => console.log(new Date().toISOString().slice(0, 19).replace('T', ' '), ...a);
const append = (file, rows) => {
  if (!rows || !rows.length) return;
  fs.mkdirSync(DATA, { recursive: true });
  fs.appendFileSync(path.join(DATA, file), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
};
function readJsonl(name) {
  try {
    return fs.readFileSync(path.join(DATA, name), 'utf8').trim().split('\n')
      .filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}
function watchlist() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, 'watchlist.json'), 'utf8')); }
  catch { return []; }
}

async function collectNewsEvents(tokens) {
  const seen = new Set(readJsonl('news.jsonl').map((r) => r.link).filter(Boolean));
  const withQuery = tokens.filter((t) => t.newsQuery);

  const catalyst = withQuery.length
    ? await newsfeed.collectNews(withQuery, { onError: (coin, e) => log(`  catalyst news failed for ${coin.sym}: ${e.message}`) })
    : [];
  const selfName = await newsfeed.collectSelfNameNews(tokens, {
    onError: (coin, e) => log(`  self-name news failed for ${coin.sym}: ${e.message}`),
  });
  const cryptoMarket = await newsfeed.collectCryptoNews(tokens, {
    onError: (_, e) => log(`  crypto-outlet news failed: ${e.message}`),
  });
  const general = await newsfeed.collectGeneralNews(tokens, {
    onError: (feed, e) => log(`  general news failed for ${feed.name}: ${e.message}`),
  });

  return [...catalyst, ...selfName, ...cryptoMarket, ...general].filter((n) => n.link && !seen.has(n.link));
}

async function main() {
  const tokens = watchlist();
  log(`news collection — ${tokens.map((t) => t.sym).join(', ')}`);
  try {
    const newsEvents = await collectNewsEvents(tokens);
    // `n.confirmed === undefined` (never `?? true`): a 'general' market-mover row deliberately
    // sets `confirmed: null` (not a coin claim, "confirmed" doesn't apply) and `??` would silently
    // rewrite that null to true -- only a genuinely MISSING field defaults true.
    append('news.jsonl', newsEvents.map((n) => ({ ts: Date.now(), publishedTs: n.ts, kind: n.kind, confirmed: n.confirmed === undefined ? true : n.confirmed, marketMover: n.marketMover ?? false, priority: n.priority ?? null, ca: n.ca, sym: n.sym, query: n.query, source: n.source, title: n.title, link: n.link })));
    log(`${newsEvents.length} new headline(s)`);
  } catch (e) { log(`news failed — ${e.message}`); }
  log('done');
}
main().catch((e) => { log('fatal:', e.message); process.exit(1); });
