#!/usr/bin/env node
// Standalone social collector.
//
// !! SUPERSEDED 2026-08-27 by the cloud GitHub Actions collector (main/cloud-collect.js), which
// runs twice an hour as of 08-31 (D-90). Do not run both. They keep SEPARATE spend counters, so
// each enforcing its own cap independently permits double the intended spend -- measured at a
// $16/month combined run rate before this was caught, back when the cap was $12 each. The cloud
// collector also survives the laptop sleeping, which this does not.
//
// Kept for offline use or if the cloud collector is ever disabled. If you start it, stop the
// workflow first.
//
// Cadence is set by budget, not by preference. Whatever the cap is (X_MONTHLY_CAP_USD, $24 as of
// 08-31), faster polling than the math below supports would exhaust the month early and stop
// collecting entirely -- a worse outcome than slightly coarser buckets.
const path = require('path');
const APP = __dirname + '/..';


const tw = require('./adapters/twitterapi');
const history = require('./history');
const h = require('../shared/hype');

const USERDATA = process.env.MCII_USERDATA ||
  path.join(process.env.HOME, 'Library/Application Support/mcii');
const INTERVAL_MIN = Number(process.env.MCII_INTERVAL_MIN || 40);
const CASHTAG_EVERY = 3;            // broaden the net periodically without paying for it hourly

let cycle = 0;
function log(...a) { console.log(new Date().toISOString().slice(0, 19).replace('T', ' '), ...a); }

async function collectToken(token) {
  const queries = tw.queriesFor(token)
    .filter((q) => q.kind === 'address' || cycle % CASHTAG_EVERY === 0);
  const all = [];
  let anySucceeded = false;
  for (const q of queries) {
    try {
      const r = await tw.searchPosts(q.q, { maxPosts: 20 });
      all.push(...r.posts);
      anySucceeded = true;
    } catch (e) {
      log(`  ${token.sym} ${q.kind}: ${e.message}`);
      if (/budget/.test(e.message)) return null;
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  // A failed fetch is NOT a reading of zero. Recording one would teach the baseline that nobody
  // discusses this token, which then makes every successful reading look like a spike -- the
  // same false-zero corruption that made the backfill unusable. No successful query, no row.
  if (!anySucceeded) {
    log(`  ${token.sym.padEnd(6)} all queries failed — recording nothing (a failure is not a zero)`);
    return null;
  }
  const dedupe = new Set();
  const unique = all.filter((p) => !dedupe.has(p.id) && dedupe.add(p.id));
  const { onTopic, noise, noiseRatio } = h.partition(unique, token);

  // Split what we just saw into genuinely new posts and ones already counted in a prior cycle.
  const seen = history.loadSeen(token.ca);
  const fresh = onTopic.filter((p) => !seen.has(p.id));
  for (const p of onTopic) seen.add(p.id);
  history.saveSeen(token.ca, seen);

  // The bucket measures NEW activity. The full snapshot is kept alongside it, because "20 posts
  // exist and none are new" is a real and different statement from "20 new posts arrived".
  const b = h.bucket(fresh, { bucketMs: INTERVAL_MIN * 60000, ts: Date.now() });
  b.snapshotPosts = onTopic.length;
  b.snapshotAuthors = new Set(onTopic.map((p) => p.authorId)).size;
  b.newPosts = fresh.length;
  b.noiseFiltered = noise.length;
  b.noiseRatio = +noiseRatio.toFixed(3);

  // A page that came back full means there was more we did not fetch -- the reading is a floor,
  // not a count, and anything built on it must know that.
  b.truncated = all.length >= 20 * queries.length;
  history.recordSocial(token.ca, b, 'live');

  const prior = history.readSocial(token.ca, { src: 'live' }).slice(0, -1);
  const bi = h.breadthIndex(b, prior);
  const rel = h.reliability(b);
  log(`  ${token.sym.padEnd(6)} ${String(fresh.length).padStart(3)} new / ${String(onTopic.length).padStart(3)} seen` +
      ` | ${String(b.uniqueAuthors).padStart(3)} people | sentiment ${b.sentiment ?? '····'}` +
      ` | ${rel.confidence} | breadth ${bi.value ?? '—'}` +
      `${b.truncated ? ' | TRUNCATED' : ''}${noise.length ? ` | ${noise.length} spam` : ''}`);
  return b;
}

let consecutiveFailures = 0;

async function cycleOnce(tokens) {
  cycle++;
  log(`cycle ${cycle}`);
  let collected = 0;
  for (const t of tokens) { if (await collectToken(t)) collected++; }

  // A missed cycle from a sleeping laptop should not cost a full 40-minute wait. Retry soon,
  // backing off so a genuine outage does not turn into a tight loop.
  if (collected === 0) {
    consecutiveFailures++;
    const wait = Math.min(2 ** consecutiveFailures, 16);
    log(`  nothing collected (${consecutiveFailures} in a row) — retrying in ${wait}m`);
    setTimeout(() => cycleOnce(tokens).catch((e) => log('retry error:', e.message)), wait * 60000);
  } else if (consecutiveFailures) {
    log(`  back online after ${consecutiveFailures} failed cycle${consecutiveFailures > 1 ? 's' : ''}`);
    consecutiveFailures = 0;
  }
  const s = tw.budget();
  log(`  spend $${s.usd.toFixed(4)} / $${s.capUsd}  (${s.postsRemaining.toLocaleString()} posts left this month)`);
  try {
    require('fs').writeFileSync(path.join(USERDATA, 'x-spend.json'), JSON.stringify(s));
  } catch {}
}

async function main() {
  const env = {};
  try {
    require('fs').readFileSync(path.join(APP, '.env'), 'utf8').split('\n').forEach((l) => {
      const i = l.indexOf('='); if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
    });
  } catch {}
  tw.configure({ key: env.TWITTERAPI_KEY, monthlyCapUsd: Number(env.X_MONTHLY_CAP_USD || 24) });
  history.init(USERDATA);
  try {
    tw.loadSpend(JSON.parse(require('fs').readFileSync(path.join(USERDATA, 'x-spend.json'), 'utf8')));
  } catch {}

  let watchlist = [
    { sym: 'CATE', ca: 'Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump' },
    { sym: 'NEEGY', ca: '6oGuFDbEeaSzTcvrmmd2MqfNYwHKXFoN7regcR22pump' },
  ];
  // Follow the app's watchlist when it exists, so adding a token in the UI starts collection.
  try {
    const snap = JSON.parse(require('fs').readFileSync(path.join(USERDATA, 'snapshot.json'), 'utf8'));
    if (Array.isArray(snap.watchlist) && snap.watchlist.length) watchlist = snap.watchlist;
  } catch {}

  log(`collector starting — ${watchlist.map((w) => w.sym).join(', ')} every ${INTERVAL_MIN}m`);
  await cycleOnce(watchlist);
  setInterval(() => cycleOnce(watchlist).catch((e) => log('cycle error:', e.message)), INTERVAL_MIN * 60000);
}
main().catch((e) => { log('fatal:', e.message); process.exit(1); });
