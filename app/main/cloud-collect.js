#!/usr/bin/env node
// Headless collector for GitHub Actions. Runs once and exits.
//
// Its job is CONTINUITY, not frequency. The laptops poll every fifteen seconds when awake; this
// exists so the record has no holes when nobody's machine is on. An overnight gap measured on
// 2026-08-27 ran to 7.8 hours, which is exactly the failure this removes.
//
// Writes files into the repo rather than to a database: a free-tier database would still need
// something to run this, so that would be two services where one will do.
const fs = require('fs');
const path = require('path');
const REPO = path.join(__dirname, '..', '..');
const DATA = path.join(REPO, 'data');

const { fetchMarket } = require('./adapters/dexscreener');
const { fetchSafety } = require('./adapters/rugcheck');
const { fetchTokenMeta, maxExitable } = require('./adapters/jupiter');
const { evaluateSafety } = require('../shared/safety');
const tw = require('./adapters/twitterapi');
const h = require('../shared/hype');
const screener = require('./screener');

const append = (file, rows) => {
  if (!rows || !rows.length) return;
  fs.mkdirSync(DATA, { recursive: true });
  fs.appendFileSync(path.join(DATA, file), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
};
const log = (...a) => console.log(new Date().toISOString().slice(0, 19).replace('T', ' '), ...a);

function watchlist() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, 'watchlist.json'), 'utf8')); }
  catch {
    return [
      { sym: 'CATE', ca: 'Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump' },
      { sym: 'NEEGY', ca: '6oGuFDbEeaSzTcvrmmd2MqfNYwHKXFoN7regcR22pump' },
    ];
  }
}

async function collectMarket(tokens) {
  const rows = [];
  for (const t of tokens) {
    try {
      const market = await fetchMarket(t.ca);
      const safety = await fetchSafety(t.ca).catch(() => null);
      const gate = safety ? evaluateSafety(safety, market) : null;
      let exit = null;
      try {
        const meta = await fetchTokenMeta(t.ca);
        exit = await maxExitable(t.ca, meta.decimals, market.priceUsd);
      } catch {}
      rows.push({
        ts: Date.now(), src: 'cloud', ca: t.ca, sym: t.sym,
        price: market.priceUsd, mcap: market.marketCap,
        liq: Math.round(market.totalLiquidityUsd || 0), pools: market.poolCount,
        v24: Math.round(market.volume?.h24 || 0),
        buys24: market.txns?.h24?.buys ?? null, sells24: market.txns?.h24?.sells ?? null,
        exitUsd: exit ? Math.round(exit.usd) : null, exitTok: exit ? exit.tokens : null,
        holders: safety?.totalHolders ?? null, top1: safety?.top1Pct ?? null,
        top10: safety?.top10Pct != null ? +safety.top10Pct.toFixed(1) : null,
        verdict: gate?.verdict ?? null, flags: gate?.findings?.length ?? null,
      });
      log(`  ${t.sym}: $${market.priceUsd.toPrecision(4)}  liq $${Math.round(market.totalLiquidityUsd).toLocaleString()}  exit ${exit ? '$' + Math.round(exit.usd).toLocaleString() : '—'}`);
    } catch (e) {
      // A failed collection writes nothing. Never a zero row.
      log(`  ${t.sym}: failed — ${e.message}`);
    }
  }
  return rows;
}

async function collectSocial(tokens) {
  if (!process.env.TWITTERAPI_KEY) { log('  no X key configured, skipping social'); return []; }
  tw.configure({ key: process.env.TWITTERAPI_KEY, monthlyCapUsd: Number(process.env.X_MONTHLY_CAP_USD || 12) });
  try { tw.loadSpend(JSON.parse(fs.readFileSync(path.join(DATA, 'x-spend.json'), 'utf8'))); } catch {}

  const rows = [];
  for (const t of tokens) {
    const all = [];
    for (const q of tw.queriesFor(t)) {
      try { const r = await tw.searchPosts(q.q, { maxPosts: 20 }); all.push(...r.posts); }
      catch (e) { log(`  ${t.sym} ${q.kind}: ${e.message}`); }
      await new Promise((r) => setTimeout(r, 800));
    }
    const seen = new Set();
    const unique = all.filter((p) => !seen.has(p.id) && seen.add(p.id));
    const { onTopic, noise } = h.partition(unique, t);
    const b = h.bucket(onTopic, { bucketMs: 36e5, ts: Date.now() });
    b.noiseFiltered = noise.length;
    const rel = h.reliability(b);
    rows.push({ ...b, src: 'cloud', ca: t.ca, sym: t.sym, confidence: rel.confidence, manipulated: rel.manipulated });
    log(`  ${t.sym}: ${onTopic.length} posts / ${b.uniqueAuthors} people, sentiment ${b.sentiment ?? '—'}, ${rel.confidence}`);
  }
  try { fs.writeFileSync(path.join(DATA, 'x-spend.json'), JSON.stringify(tw.budget(), null, 2)); } catch {}
  return rows;
}

async function main() {
  const tokens = watchlist();
  log(`cloud collection — ${tokens.map((t) => t.sym).join(', ')}`);

  log('market:');
  append('market.jsonl', await collectMarket(tokens));

  log('social:');
  append('social.jsonl', await collectSocial(tokens));

  log('market scan:');
  try {
    const r = await screener.run({ limit: 60 });
    log(`  ${r.summary}`);
    append('scans.jsonl', [{ ts: r.scannedAt, src: 'cloud', universe: r.universe,
      survivors: r.survivors.length, tookMs: r.tookMs }]);
    append('candidates.jsonl', r.survivors.map((c) => ({
      ts: r.scannedAt, src: 'cloud', ca: c.ca, sym: c.symbol, name: c.name, via: c.via,
      price: c.priceUsd, mcap: Math.round(c.marketCap || 0), liq: Math.round(c.liquidityUsd || 0),
      vol24: Math.round(c.volume24h || 0), ageH: c.ageHours != null ? +c.ageHours.toFixed(1) : null,
      chg24: c.change24h, holders: c.safety?.totalHolders ?? null,
      top1: c.safety?.top1Pct != null ? +c.safety.top1Pct.toFixed(2) : null, verdict: c.gate?.verdict,
    })));
  } catch (e) { log(`  scan failed — ${e.message}`); }

  log('done');
}
main().catch((e) => { log('fatal:', e.message); process.exit(1); });
