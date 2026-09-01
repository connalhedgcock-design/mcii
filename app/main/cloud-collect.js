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
const sector = require('../shared/sector');
const imp = require('../shared/importance');
const resolve = require('../shared/resolve');
const postfacts = require('../shared/postfacts');
const socialmarket = require('../shared/socialmarket');
const { searchTokens } = require('./adapters/dexscreener');
const screener = require('./screener');
const onchain = require('./adapters/onchain');
const scanstore = require('./scanstore');

// One sweep serves the sector view AND every coin on the watchlist, so these numbers set the
// whole monthly bill. 4 searches x 15 posts, twice an hour (D-90, 08-31), is ~$13 of the $24.
const SWEEP_POSTS_PER_QUERY = 15;
const SWEEP_RESERVE_USD = 3;      // kept back so the sweep itself never runs out mid-month
const MIN_POSTS_PER_COIN = 8;     // below this the sweep clearly missed the coin; ask directly
// Identifying a ticker is free but not unlimited; be a polite caller. Raised 8 -> 12 on 2026-09-01
// alongside the discovery queries: a wider sweep surfaces more unknown tickers per run, and leaving
// the cap at 8 would have quietly thrown away the extra reach the moment it started working.
const MAX_LOOKUPS = 12;
const COLLISION_EVERY_MS = 20 * 36e5;   // which coins share our tickers changes slowly; check daily

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
      let holders = null;
      try {
        const meta = await fetchTokenMeta(t.ca);
        exit = await maxExitable(t.ca, meta.decimals, market.priceUsd);
        // Jupiter counts accounts with an actual balance -- the honest meaning of "holders" (see
        // onchain.js / 50-LOG/2026-08-28-data-integrity.md). RugCheck's field was renamed to
        // tokenAccounts because it counts something else entirely; never read totalHolders here.
        holders = meta.holderCount ?? null;
      } catch {}
      rows.push({
        ts: Date.now(), src: 'cloud', ca: t.ca, sym: t.sym,
        price: market.priceUsd, mcap: market.marketCap,
        liq: Math.round(market.totalLiquidityUsd || 0), pools: market.poolCount,
        v24: Math.round(market.volume?.h24 || 0),
        buys24: market.txns?.h24?.buys ?? null, sells24: market.txns?.h24?.sells ?? null,
        exitUsd: exit ? Math.round(exit.usd) : null, exitTok: exit ? exit.tokens : null,
        holders, top1: safety?.top1Pct ?? null,
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
  if (!process.env.TWITTERAPI_KEY) { log('  no X key configured, skipping social'); return { social: [], sector: [] }; }
  tw.configure({ key: process.env.TWITTERAPI_KEY, monthlyCapUsd: Number(process.env.X_MONTHLY_CAP_USD || 24) });
  try { tw.loadSpend(JSON.parse(fs.readFileSync(path.join(DATA, 'x-spend.json'), 'utf8'))); } catch {}

  // ONE sweep of memecoin chatter, sorted afterwards into what matters. This replaced asking X
  // about each coin separately, and the reason is arithmetic:
  //
  //   per-coin searching   cost = coins x queries x posts    -> a third coin broke the $12 cap
  //   one sweep + sorting  cost = queries x posts            -> flat, whatever they watch
  //
  // Depth per coin is what shrinks as the watchlist grows, not the bill. That is the right thing
  // to give up: a cap that gets breached stops collection entirely for everyone (D-28).
  const sweepPosts = [];
  const perQuery = [];
  for (const q of tw.sectorQueries()) {
    // Each search has its own depth and its own cadence, set by how much of it exists. Capturing
    // every rug report is affordable; capturing a slice of the firehose was not worth paying for.
    if (q.everyHours > 1 && !dueForQuery(q.kind, q.everyHours)) {
      log(`  ${q.kind}: not due yet`);
      continue;
    }
    try {
      const r = await tw.searchPosts(q.q, { maxPosts: q.depth });
      sweepPosts.push(...r.posts);
      perQuery.push({ kind: q.kind, posts: r.posts.length, pages: r.pages, truncated: r.truncated });
      log(`  ${q.kind}: ${r.posts.length} posts over ${r.pages} page(s)` +
          (r.truncated ? ` — MORE AVAILABLE (${r.stoppedBecause}), this is a floor not a count` : ''));
      markQuery(q.kind);
    } catch (e) {
      // A failed query writes nothing for that slice. Failure is never a zero (D-29).
      log(`  ${q.kind}: ${e.message}`);
      perQuery.push({ kind: q.kind, posts: null, error: e.message });
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  const seenSweep = new Set();
  const sweep = sweepPosts.filter((p) => !seenSweep.has(p.id) && seenSweep.add(p.id));
  log(`  sweep: ${sweep.length} posts across ${perQuery.length} searches`);

  // What is left after the sweep, split evenly. A coin the sweep already found enough about does
  // not get a top-up at all, so the budget goes to the coins nobody happened to mention.
  const b = tw.budget();
  const spare = Math.max(0, b.remainingUsd - SWEEP_RESERVE_USD);
  const runsLeftThisMonth = Math.max(1, hoursLeftInMonth());
  const topUpPostsPerCoin = tokens.length
    ? Math.max(0, Math.min(20, Math.floor((spare / runsLeftThisMonth / tw.COST_PER_POST) / tokens.length)))
    : 0;
  log(`  $${b.remainingUsd} left this month -> up to ${topUpPostsPerCoin} extra posts per coin per run`);

  const collisions = await checkCollisions(tokens);
  const contestedSet = new Set(Object.keys(collisions));

  const rows = [];
  for (const t of tokens) {
    const tlex = resolve.buildLexicon([t], { contested: contestedSet });
    let mine = sweep.filter((p) => imp.about(p, [t], tlex).hits.length > 0);
    const fromSweep = mine.length;
    // Only ask about this coin directly if the sweep did not already cover it.
    if (mine.length < MIN_POSTS_PER_COIN && topUpPostsPerCoin > 0) {
      // ! a cashtag search is worthless when several coins share the ticker -- it would buy
      // posts about somebody else's coin and file them under theirs. Address only, in that case.
      const queries = contestedSet.has(resolve.bare(t.sym))
        ? tw.queriesFor(t).filter((q) => q.kind === 'address')
        : tw.queriesFor(t);
      for (const q of queries) {
        try {
          const r = await tw.searchPosts(q.q, { maxPosts: Math.min(topUpPostsPerCoin, 15) });
          mine.push(...r.posts);
        } catch (e) { log(`  ${t.sym} ${q.kind}: ${e.message}`); }
        await new Promise((r) => setTimeout(r, 800));
      }
      const seen = new Set();
      mine = mine.filter((p) => !seen.has(p.id) && seen.add(p.id));
    }
    // Nothing found is nothing found. An empty bucket would be recorded as a real reading of
    // zero interest, which is a claim we cannot support from a sweep that simply looked elsewhere.
    if (!mine.length) { log(`  ${t.sym}: not mentioned in this sweep — writing nothing`); continue; }

    const { onTopic, noise } = h.partition(mine, t);
    if (!onTopic.length) { log(`  ${t.sym}: only passing mentions — writing nothing`); continue; }
    const bucket = h.bucket(onTopic, { bucketMs: 36e5, ts: Date.now() });
    bucket.noiseFiltered = noise.length;
    const rel = h.reliability(bucket);
    rows.push({ ...bucket, src: 'cloud', ca: t.ca, sym: t.sym,
      confidence: rel.confidence, manipulated: rel.manipulated,
      fromSweep, topUp: mine.length - fromSweep,
      // ! recorded on the row itself: a reading taken while other coins share this ticker is a
      // weaker reading, and whoever reads it later must be able to see that.
      tickerShared: contestedSet.has(resolve.bare(t.sym)) || null });
    log(`  ${t.sym}: ${onTopic.length} posts / ${bucket.uniqueAuthors} people (${fromSweep} from the sweep), tone ${bucket.sentiment ?? '—'}, ${rel.confidence}`);
  }

  const sectorRows = await buildSectorRow(sweep, perQuery, tokens);
  try { fs.writeFileSync(path.join(DATA, 'x-spend.json'), JSON.stringify(tw.budget(), null, 2)); } catch {}
  return { social: rows, sector: sectorRows };
}

// When each search last ran. Kept in a file rather than in memory because the job is a fresh
// process every hour -- and because that schedule has proved unreliable, so "every six hours"
// has to mean six hours of wall clock, not six firings.
function queryStamps() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, 'query-runs.json'), 'utf8')); } catch { return {}; }
}
function dueForQuery(kind, everyHours) {
  const last = queryStamps()[kind] || 0;
  return Date.now() - last >= (everyHours - 0.5) * 36e5;
}
function markQuery(kind) {
  const s = queryStamps();
  s[kind] = Date.now();
  try { fs.writeFileSync(path.join(DATA, 'query-runs.json'), JSON.stringify(s, null, 2) + '\n'); } catch {}
}

// Runs remaining this month, so the leftover budget is spread across them rather than spent in
// the first week. Collection stopping on the 20th is worse than a thinner reading all month.
function hoursLeftInMonth() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.max(1, Math.round((end - now) / 36e5));
}


// Ground truth every hour. It is expensive (~60MB, ~6s per token) and runs against a public RPC
// that owes us nothing, so a rejection is expected occasionally rather than treated as a failure:
// we fall back to Jupiter for that hour and try again next time. What we never do is record a
// fallback value as though it were ground truth.
async function verifyHolders(tokens) {
  const stamp = path.join(DATA, 'holder-truth.json');
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(stamp, 'utf8')); } catch {}
  const MIN_GAP = 50 * 60000;   // an hour, less a little slack for jitter in the cron
  if (prev.checkedAt && Date.now() - prev.checkedAt < MIN_GAP) {
    log('  ground truth checked within the hour, skipping');
    return [];
  }
  const out = { checkedAt: Date.now(), tokens: {} };
  const rows = [];
  for (const t of tokens) {
    try {
      const truth = await onchain.holderCount(t.ca);

      // Compare against the previous hour and flag a real move. Empty accounts are excluded from
      // the count, so a genuine swing here means wallets actually opened or emptied positions.
      const before = prev.tokens?.[t.ca];
      if (before && before.holders > 0 && !before.stale) {
        const changePct = ((truth.holders - before.holders) / before.holders) * 100;
        const hrs = Math.max((Date.now() - (prev.checkedAt || Date.now())) / 36e5, 1 / 60);
        if (Math.abs(changePct) >= 5) {
          const dir = changePct > 0 ? 'gained' : 'lost';
          log(`  ! ${t.sym} ${dir} ${Math.abs(changePct).toFixed(1)}% of its holders in ${hrs.toFixed(1)}h ` +
              `(${before.holders.toLocaleString()} -> ${truth.holders.toLocaleString()})`);
          rows.push({ ts: Date.now(), src: 'onchain-alert', ca: t.ca, sym: t.sym,
            kind: 'holder-change', changePct: +changePct.toFixed(2), hours: +hrs.toFixed(2),
            from: before.holders, to: truth.holders });
        }
      }
      let jup = null;
      try { jup = (await fetchTokenMeta(t.ca)).holderCount; } catch {}
      const driftPct = jup ? ((jup - truth.holders) / truth.holders) * 100 : null;
      out.tokens[t.ca] = { sym: t.sym, ...truth, jupiter: jup, driftPct };
      rows.push({ ts: Date.now(), src: 'onchain', ca: t.ca, sym: t.sym, ...truth, jupiter: jup, driftPct });
      log(`  ${t.sym}: ${truth.holders.toLocaleString()} holders on chain` +
          (jup ? `, Jupiter says ${jup.toLocaleString()} (${driftPct >= 0 ? '+' : ''}${driftPct.toFixed(2)}%)` : ''));
      // A cheap source that has drifted badly is no longer a usable stand-in for the real thing.
      if (driftPct != null && Math.abs(driftPct) > 10)
        log(`  ! ${t.sym}: Jupiter is ${Math.abs(driftPct).toFixed(0)}% off the chain — stop trusting it as a proxy`);
    } catch (e) {
      // A blocked or rate-limited RPC is not a data point. Record nothing and note why.
      log(`  ${t.sym}: ground truth unavailable — ${e.message}`);
      const carried = prev.tokens?.[t.ca];
      if (carried) out.tokens[t.ca] = { ...carried, stale: true, lastError: e.message };
    }
  }
  try { fs.writeFileSync(stamp, JSON.stringify(out, null, 2)); } catch {}
  return rows;
}

// --- the sector read ---------------------------------------------------------
// Built from the sweep that was already paid for, not from a second set of searches. The earlier
// version fetched its own posts, which meant the same chatter was bought twice in one run.
async function buildSectorRow(sweepPosts, perQuery, tokens) {
  let sectorExtra = null;
  if (!sweepPosts.length) { log('  sector: nothing returned, writing nothing'); return []; }

  const scanned = recentScanned();
  const collisions = await checkCollisions(tokens);
  const contested = new Set(Object.keys(collisions));
  // One index over every coin we know of, so a post can be matched by address, cashtag, bare
  // ticker in a trading sentence, shortened address, or project name -- and so a ticker several
  // coins share stops counting as proof of which one is meant.
  const lex = resolve.buildLexicon([...tokens, ...scanned], { contested });

  // No partition() here: there is no single token to be off-topic about. The whole sector is the
  // topic, so everything counts and the junk shows up in the filter counts instead.
  const bucket = h.bucket(sweepPosts, { bucketMs: 36e5, ts: Date.now() });
  const named = sector.tickers(sweepPosts, { minPeople: 2 });
  const ranked = imp.rank(sweepPosts, { watchlist: tokens, scanned, lex });

  // ! the part that turns talk into something checkable. A ticker several different people are
  // using that nobody here has ever looked up is the most useful thing in a sweep -- but a
  // ticker is not a coin, so each one is resolved to an actual address before it is worth
  // anything, and refuses to resolve when two coins share the name.
  const queue = resolve.unknownTickers(sweepPosts, lex, { minPeople: 3 }).slice(0, MAX_LOOKUPS);
  const identified = [];
  for (const u of queue) {
    const found = await resolve.identify(u.ticker, searchTokens);
    identified.push({ ...u, ...found });
    log(`  $${u.ticker}: ${u.people} people (weighted ${u.weighted}, quality ${u.quality}) — ` +
        (found.resolved ? `${found.resolved.name || found.resolved.sym} (${found.matches[0].liquidityUsd.toLocaleString()} liquidity)`
                        : found.reason || 'could not identify'));
    await new Promise((r) => setTimeout(r, 400));
  }

  // THE SOCIAL MARKET SNAPSHOT. Every coin named in this sweep, with counts — not the handful
  // that survived a filter. ! the sweep already names ~152 distinct coins and the old sector row
  // reported a median of 3, so this is not new data, it is data that was already bought and then
  // discarded one step before anyone saw it.
  let market = null, moved = [], read = null;
  try {
    market = socialmarket.snapshot(sweepPosts, lex);
    let prev = null;
    try {
      const lines = fs.readFileSync(path.join(DATA, 'social-market.jsonl'), 'utf8').trim().split('\n');
      prev = JSON.parse(lines[lines.length - 1]);
    } catch { /* first run has nothing to compare against, which is not an error */ }
    moved = socialmarket.movers(prev, market);
    read = socialmarket.marketRead(market, prev, { ranked });
    market.read = read;
    append('social-market.jsonl', [market]);
    log(`  social market: ${market.coins.length} coins named across ${market.totalPosts} posts`);
    log(`    ${read.coinsDiscussed} discussed by 2+ people | top 3 hold ${read.concentration != null ? Math.round(read.concentration * 100) + '%' : '—'} of attention` +
        ` | ${read.churn != null ? Math.round(read.churn * 100) + '%' : '—'} not there last scan | crowd quality ${read.crowdQuality ?? '—'}`);
    log(`    conversation: ${Math.round((read.failureShare || 0) * 100)}% coins dying, ` +
        `${Math.round((read.emergingShare || 0) * 100)}% someone naming a coin, ${Math.round((read.promoShare || 0) * 100)}% adverts`);
    if (!prev) log('    (first snapshot — no comparison until the next scan)');
    for (const m of moved.slice(0, 6)) {
      log(`    ${m.event === 'new' ? 'NEW ' : 'up  '} ${(m.sym || m.key).slice(0, 14).padEnd(14)}` +
          ` ${m.people} people (weighted ${m.weighted}${m.event === 'rising' ? `, was ${m.from}` : ''})`);
    }
  } catch (e) {
    log(`  WARN: social market snapshot failed — ${e.message}`);
  }

  // THE BULK TRACK. Every post paid for yields a row of facts, whatever the filter thought of it.
  // ! this is written BEFORE any filtering decision is applied downstream, so a change to the
  // filter can never retroactively shrink the record. 874 posts had previously been fetched,
  // judged off-topic and dropped entirely; they are kept from here on. Facts only -- no text, no
  // handles, no author ids (D-22). See shared/postfacts.js for what is and is not stored.
  try {
    const facts = ranked.important.concat(ranked.background, ranked.setAside)
      .map((r) => postfacts.factsFor(r.post, r));
    if (facts.length) append('post-facts.jsonl', facts);
    const rings = postfacts.coordination(facts);
    if (rings.length) {
      log(`  coordination: ${rings.length} group(s) of accounts posting the same wording in a tight window`);
      for (const g of rings.slice(0, 3)) {
        log(`    ${g.accounts} accounts, ${g.posts} posts in ${g.spanMin} min${g.tickers.length ? ' — ' + g.tickers.join(', ') : ''}`);
      }
    }
    // ! FEED THE RINGS BACK INTO THE SIGNAL. Without this a coordinated push produces the
    // STRONGEST possible reading: each sockpuppet passes the per-post credibility check on its
    // own, so three of them yield three `emerging` posts and a discovery hit. The per-post filter
    // cannot see across posts by construction; only this cross-post check can, so what it finds
    // has to reach the thing it contradicts. A flagged coin is still recorded — it is marked, not
    // deleted (D-69: the filter sorts, it never deletes).
    const ringTickers = new Set(rings.flatMap((g) => g.tickers.map((t) => String(t).toUpperCase())));
    const ringCas = new Set(rings.flatMap((g) => g.cas));
    for (const it of identified) {
      if (ringTickers.has(String(it.ticker).toUpperCase()) ||
          (it.resolved && ringCas.has(it.resolved.ca))) {
        it.coordinated = true;
        log(`  ! $${it.ticker}: the accounts naming this posted the same wording in a tight window — treat as a campaign, not interest`);
      }
    }
    sectorExtra = { facts: facts.length, coordinationGroups: rings.length, rings: rings.slice(0, 5) };
  } catch (e) {
    // ! never let bookkeeping break collection. A missing bulk row is a gap; a thrown error here
    // would cost the whole pass, including the readings that actually matter.
    log(`  WARN: post-facts write failed — ${e.message}`);
  }

  const strip = (r) => ({
    text: String(r.post.text || '').slice(0, 240),
    handle: r.post.handle || null,
    views: r.post.views || 0,
    at: r.post.createdAt,
    kind: r.kind,
    why: r.reasons[0] || null,
    about: r.about.map((a) => a.sym).filter(Boolean),
  });

  log(`  sector: ${sweepPosts.length} posts / ${bucket.uniqueAuthors} people, ` +
      `${ranked.important.length} worth reading, ${ranked.setAside.length} set aside, ` +
      `${identified.filter((i) => i.resolved).length} new coins identified`);

  return [{
    ...bucket, src: 'cloud', kind: 'sector',
    queries: perQuery,
    tickers: named.slice(0, 20),
    pushRatio: sector.pushRatio(named),
    // Coins people are talking about that were not on any of our lists until now.
    identified,
    // Tickers of theirs that other coins also use, so the app can stop presenting a cashtag
    // reading as though it were about their coin.
    collisions,
    // The filter's own workings are stored, so it can be audited later rather than trusted now.
    filter: { counts: ranked.counts, total: ranked.total, promoShare: ranked.promoShare },
    // The bulk track's summary. `facts` is how many posts were kept as data rather than dropped;
    // `coordinationGroups` is how many sets of accounts posted the same distinctive wording inside
    // a tight window -- the campaign signal, which requires both the wording AND the timing.
    bulk: sectorExtra,
    // The whole social market this scan saw, and what moved since the last one. ! this is a
    // RECORD, not a recommendation — D-62: the sector view answers "what kind of market is this",
    // never "what should I get into".
    marketCoins: market ? market.coins.length : null,
    read,
    movers: moved.slice(0, 15),
    important: ranked.important.slice(0, 12).map(strip),
    background: ranked.background.slice(0, 8).map(strip),
    // A sample of what was dropped, kept deliberately: it is how anyone catches this filter
    // discarding something it should not have (D-26).
    setAsideSample: ranked.setAside.slice(0, 5).map(strip),
    spentUsd: +(tw.budget().usd).toFixed(4),
  }];
}

// Which of their own tickers other coins are also using. Checked about once a day: new coins
// launch under an existing name constantly, and the answer decides whether "$X" can be read as
// meaning their X at all.
async function checkCollisions(tokens) {
  const file = path.join(DATA, 'ticker-collisions.json');
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  if (prev && Date.now() - (prev.checkedAt || 0) < COLLISION_EVERY_MS) return prev.tickers || {};
  let tickers = {};
  try { tickers = await resolve.findContested(tokens, searchTokens); }
  catch (e) { log(`  ticker check failed — ${e.message}`); return (prev && prev.tickers) || {}; }
  for (const [t, info] of Object.entries(tickers))
    log(`  ! $${t} is used by ${info.of} Solana coins — theirs is #${info.rank} by pool size`);
  try { fs.writeFileSync(file, JSON.stringify({ checkedAt: Date.now(), tickers }, null, 2) + '\n'); } catch {}
  return tickers;
}

// Coins the scanner recently let through, so the filter can tell "a coin that passed our checks"
// from a ticker nobody here has ever looked at.
function recentScanned() {
  try {
    return fs.readFileSync(path.join(DATA, 'candidates.jsonl'), 'utf8').trim().split('\n')
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((r) => r && Date.now() - r.ts < 3 * 864e5)
      .map((r) => ({ sym: r.sym, ca: r.ca }));
  } catch { return []; }
}

async function main() {
  const tokens = watchlist();
  log(`cloud collection — ${tokens.map((t) => t.sym).join(', ')}`);

  log('market:');
  append('market.jsonl', await collectMarket(tokens));

  log('chatter sweep:');
  const chatter = await collectSocial(tokens);
  append('social.jsonl', chatter.social);
  append('sector.jsonl', chatter.sector);

  log('holder ground truth:');
  append('holders-onchain.jsonl', await verifyHolders(tokens));

  log('market scan:');
  try {
    const r = await screener.run({ limit: 60 });
    log(`  ${r.summary}`);
    append('scans.jsonl', [{ ts: r.scannedAt, src: 'cloud', universe: r.universe,
      survivors: r.survivors.length, tookMs: r.tookMs,
      // Why coins were dropped describes the market, not just the filter: a day where almost
      // everything fails on liquidity is a different market from one where safety is the killer.
      rejects: scanstore.tally([...r.rejectedStage1, ...r.rejectedStage2]) }]);
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
