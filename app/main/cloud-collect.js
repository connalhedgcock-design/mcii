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

const { fetchMarket, fetchPrices } = require('./adapters/dexscreener');
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
const walletAdapter = require('./adapters/wallet');
const alertsPush = require('./alerts-push');
const { searchTokens } = require('./adapters/dexscreener');
const screener = require('./screener');
const onchain = require('./adapters/onchain');
const scanstore = require('./scanstore');
const newsfeed = require('./adapters/newsfeed');
const journal = require('./journal');
const labels = require('../shared/labels');
const marketmanip = require('../shared/marketmanip');
journal.init(REPO);

// One sweep serves the sector view AND every coin on the watchlist, so these numbers set the
// whole monthly bill. 4 searches x 15 posts, twice an hour (D-90, 08-31), is ~$13 of the $24.
const SWEEP_POSTS_PER_QUERY = 15;
const SWEEP_RESERVE_USD = 3;      // kept back so the sweep itself never runs out mid-month

// !! HOW OFTEN THIS PROCESS IS INVOKED, IN ONE PLACE. Read it, never assume it.
// The systemd timer on the collection host fires at `*:12,42` — TWICE an hour (D-98). Everything
// in this file that reasons about "per hour" or "per run" must go through this constant.
// ! this exists because the same mistake has now happened three times: a cadence changed and code
// written for the old one kept running. D-88 (internal loop vs one-pass), D-90 (hourly ->
// twice-hourly), and the 09-01 overspend below. If the timer changes, change this, or set
// COLLECT_RUNS_PER_HOUR in the service environment — do not re-derive it anywhere else.
const RUNS_PER_HOUR = Math.max(1, Number(process.env.COLLECT_RUNS_PER_HOUR || 2));

// ! PER-COIN SOCIAL SEARCHES ARE OFF (D-108, Connal 2026-09-01: "i dont want to be searching for
// individual coins at all"). The code below is kept, not deleted, because the reasoning for
// turning it back on is a live question, not a settled one — see the decision row. Set
// COLLECT_PER_COIN_TOPUP=1 to restore it.
// !! CONSEQUENCE, STATED SO NOBODY REDISCOVERS IT AS A BUG: watchlist coins now get a social
// reading ONLY when the wide sweep happens to mention them, which is roughly one post per run.
// Most runs will write nothing for most coins. That is the intended behaviour, not a fault.
// ! what this does NOT touch: collectMarket(), fetchSafety(), maxExitable() and verifyHolders()
// are separate passes and still run per coin every time. The money-protecting monitoring is
// unaffected; only chatter about held coins is given up.
const PER_COIN_TOPUP = process.env.COLLECT_PER_COIN_TOPUP === '1';
// ! CUT 2026-09-01 from 8. Dedicated per-coin searches were 54% of ALL spend (7,461 posts vs
// 6,275 for the wide scan) and produced readings that barely cleared the "enough people to mean
// anything" bar -- typically 13 people against a threshold of 12. That money buys far more as
// wide-scan coverage, where it sees ~150 coins instead of 5. Held coins are still covered by the
// sweep like everything else; this only stops paying twice for the same five.
const MIN_POSTS_PER_COIN = 4;     // below this the sweep clearly missed the coin; ask directly
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
    // ! EVERY query is gated, including hourly ones. Until 2026-09-01 this read
    // `q.everyHours > 1 &&`, so a query declaring `everyHours: 1` was never checked at all and
    // fired on BOTH half-hourly runs — 150 of ~166 swept posts an hour, at double their stated
    // cadence. The two queries that LOOKED like proof the gate worked (mood 6h, crowd 2h) were
    // the only ones it applied to, which is exactly why it survived review.
    if (!dueForQuery(q.kind, q.everyHours)) {
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
  // ! hoursLeftInMonth() x RUNS_PER_HOUR. This said `hoursLeftInMonth()` alone until 2026-09-01:
  // the variable was named runs and held hours, so each run was allowed twice the share of the
  // month it could afford. It was MASKED by the per-coin ceilings binding first — worse than the
  // error itself, because a budget guard that never binds looks identical to one that works.
  const runsLeftThisMonth = Math.max(1, hoursLeftInMonth() * RUNS_PER_HOUR);
  const topUpPostsPerCoin = tokens.length
    ? Math.max(0, Math.min(8, Math.floor((spare / runsLeftThisMonth / tw.COST_PER_POST) / tokens.length)))
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
    if (PER_COIN_TOPUP && mine.length < MIN_POSTS_PER_COIN && topUpPostsPerCoin > 0) {
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

  // KEEP THE PHONE ALERTER'S IDEA OF "HELD" CURRENT, FROM HERE.
  //
  // ! this was originally the desktop app's job and that was the wrong home for it. The app only
  // pushes when someone opens the portfolio tab, so the list froze on 2026-08-31 and by 09-02 the
  // alerter was still watching 94,233 LaPeace and 23 ANSEM that had both been sold. Alerts about
  // coins he no longer owns are worse than no alerts: they are noise that teaches him to ignore
  // the one that matters.
  //
  // ! the reason this can live here at all: Solana's public RPC refuses `getTokenAccountsByOwner`
  // from Cloudflare (D-93) but NOT from this server — verified 09-02. So the collector can read the
  // wallets directly, every half hour, with nobody opening anything.
  await pushHeldPositions();

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
  // ! 90% of the interval, not "minus half an hour". The old slack was a fixed 0.5h, which meant
  // any cadence under 30 minutes was ALWAYS due -- fine while everything was hourly, silently
  // broken the moment sub-hourly cadences arrived (2026-09-01).
  return Date.now() - last >= everyHours * 0.9 * 36e5;
}
function markQuery(kind) {
  const s = queryStamps();
  s[kind] = Date.now();
  try { fs.writeFileSync(path.join(DATA, 'query-runs.json'), JSON.stringify(s, null, 2) + '\n'); } catch {}
}

// Runs remaining this month, so the leftover budget is spread across them rather than spent in
// the first week. Collection stopping on the 20th is worse than a thinner reading all month.
// One small file holding only the newest social reading per coin, so something that is NOT this
// repo can read it cheaply. Written alongside social.jsonl, never instead of it.
//
// ! WHY A SEPARATE FILE AT ALL: the Telegram worker needs the social read to satisfy D-96 (every
// notification carries the analysis, not just a number). It runs on Cloudflare every 5 minutes and
// fetches from the public repo, so it cannot pull social.jsonl -- that file is ~850KB and grows
// forever, and downloading it 288 times a day to read five lines is absurd. This is ~1KB, flat.
// ! it is a DERIVED CACHE, never a source. social.jsonl remains the record (D-19). If the two ever
// disagree, this one is wrong and should be regenerated rather than reconciled.
function writeSocialLatest(rows) {
  if (!rows || !rows.length) return;   // D-29: nothing collected writes nothing, never a zero
  let out = {};
  try { out = JSON.parse(fs.readFileSync(path.join(DATA, 'social-latest.json'), 'utf8')); } catch {}
  for (const r of rows) {
    if (!r.ca) continue;
    out[r.ca] = {
      sym: r.sym || null,
      at: r.ts,
      people: r.uniqueAuthors ?? null,
      // ! tone is deliberately null rather than 0 when too few posts carried scoreable wording.
      // D-86: one voice once produced a confident-looking "0.818". Absent must not read as neutral.
      tone: r.sentimentThin ? null : (r.sentiment ?? null),
      confidence: r.confidence || 'none',
      manipulated: !!r.manipulated,
      manipReasons: r.manipReasons || [],
    };
  }
  try {
    fs.writeFileSync(path.join(DATA, 'social-latest.json'), JSON.stringify(out, null, 2) + '\n');
  } catch (e) { log(`  could not write social-latest.json: ${e.message}`); }
}

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
    // Rival coins that share a ticker with one of theirs, loaded so their addresses are
    // RECOGNISED rather than landing as unknown. Their activity is tracked as its own thing.
    const namesakes = new Map();
    for (const [ticker, c] of Object.entries(collisions || {})) {
      for (const r of c.rivals || []) namesakes.set(r.ca, { ticker, ownSym: c.sym, ownCa: c.ca });
    }
    market = socialmarket.snapshot(sweepPosts, lex, { namesakes });
    const nsRows = market.coins.filter((c) => c.namesakeOf && c.weighted >= 1);
    if (nsRows.length) {
      log(`  namesakes: ${nsRows.length} coin(s) sharing a ticker with yours are being discussed`);
      for (const n of nsRows.slice(0, 4)) {
        log(`    "${n.namesakeOf}" but NOT yours — ${n.people} people (weighted ${n.weighted})`);
      }
    }
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

  // PRICE WHAT WE NOTICED. Without this the social record is unanswerable: we would know three
  // credible people started talking about a coin and have no idea whether anything happened to it.
  // Pairing attention with price is what makes "does the talk lead the move" testable rather than
  // an opinion.
  //
  // ! free, and it does not scale with the watchlist: DexScreener prices 30 addresses per call, so
  // the busiest 60 coins in a scan cost two requests. This is the cheap half of the answer -- the
  // expensive half (the posts) was already bought.
  //
  // ! only coins named by ADDRESS can be priced. A bare "$BUDDY" is not yet a coin, which is what
  // `identify()` is for; unresolved tickers sit in the snapshot with no price series until they
  // resolve. That gap is honest, not a bug.
  try {
    const priceable = (market?.coins || [])
      .filter((c) => c.kind === 'address' && c.weighted >= 1)
      .slice(0, 60)
      .map((c) => c.key);
    for (const it of identified) if (it.resolved?.ca) priceable.push(it.resolved.ca);
    const uniq = [...new Set(priceable)];
    if (uniq.length) {
      const priced = await fetchPrices(uniq);
      const rows = [];
      for (const c of market.coins) {
        const p = priced.get(c.key);
        if (!p) continue;
        rows.push({ ts: market.ts, ca: c.key, sym: p.symbol || c.sym || null,
                    price: p.priceUsd, liq: Math.round(p.liquidityUsd || 0),
                    mcap: p.marketCap ?? null, ch24: p.priceChange?.h24 ?? null,
                    people: c.people, weighted: c.weighted, posts: c.posts,
                    namesakeOf: c.namesakeOf || null });
      }
      if (rows.length) {
        append('attention-prices.jsonl', rows);
        log(`  priced ${rows.length} of the coins being discussed (${uniq.length} had an address)`);
      }
    }
  } catch (e) {
    log(`  WARN: pricing discussed coins failed — ${e.message}`);
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
    // The words themselves, gitignored and server-only -- see postfacts.js: corpusRow.
    const corpus = ranked.important.concat(ranked.background, ranked.setAside)
      .map((r) => postfacts.corpusRow(r.post, r));
    if (corpus.length) append('corpus.local.jsonl', corpus);
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
    namesakeActivity: market ? market.coins.filter((c) => c.namesakeOf).map((c) => ({ key: c.key, of: c.namesakeOf, people: c.people, weighted: c.weighted })) : [],
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

// Real-world-story news, per coin, only for coins a person opted in with `newsQuery`
// (`data/watchlist.json`) -- design + the DOGE-1 case: `60-KB/news-catalyst-research.md`.
// Deduped by article LINK, not appended fresh every run like market/social readings: a headline
// does not change between scans the way a price does, so re-logging the same 10 links forever
// would be pure noise, not a time series worth keeping (D-76's "seen-ids" idiom, applied here).
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

  return [...catalyst, ...selfName, ...cryptoMarket].filter((n) => n.link && !seen.has(n.link));
}

function readJsonl(name) {
  try {
    return fs.readFileSync(path.join(DATA, name), 'utf8').trim().split('\n')
      .filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

// Resolves auto-logged triple-barrier labels (`shared/labels.js`) against real, just-collected
// price history -- the labelled-outcome record this project has been missing since it started
// (see `labels.js`'s own header). Runs every cycle so a barrier is caught close to when it fires,
// not discovered stale much later. D-05's n>=50 bar still applies before any of this is trusted;
// this is what makes n start moving instead of staying at zero.
function resolveLabels() {
  const marketRows = readJsonl('market.jsonl');
  const byCa = {};
  for (const r of marketRows) {
    if (!r.ca || r.price == null) continue;
    (byCa[r.ca] ||= []).push(r);
  }
  const open = journal.readForecasts().filter((f) => f.entryPrice != null && !f.resolved);
  let resolvedCount = 0;
  for (const f of open) {
    const rows = byCa[f.ca];
    if (!rows) continue; // this coin has no fresh reading yet this run -- check again next cycle
    const result = labels.checkBarrier(f.entryPrice, f.entryTs, rows);
    if (!result) continue; // still pending -- D-29, not a zero
    journal.resolveForecast(f.id, result.win, `${result.outcome} at ${(result.ret * 100).toFixed(1)}%`, f.owner);
    resolvedCount++;
  }
  return { checked: open.length, resolved: resolvedCount };
}

// The holder/concentration read (`shared/marketmanip.js: growthQuality`) computed fresh every
// cycle for every tracked coin, and written where the app and the alert path can both read it.
// ! this is the CHEAP detector, and it is the one that works at this project's data granularity:
// measured 09-05, only 1 of 17 coins with holder history showed real growth (holders rising while
// the biggest wallet's share shrank), while `fone` gained 341% with its holder count FALLING.
// Per-wallet wash detection (`washtrade.js`) costs an RPC call per wallet and covers one of four
// manipulation mechanisms; this covers the OUTCOME of all four, from fields already collected.
// ! a DESCRIPTION of what already happened, never a prediction, and holder counts are Solana-only,
// so a non-Solana coin honestly returns `unknown` rather than a guess (D-29).
function writeGrowthQuality(tokens) {
  const history = readJsonl('market.jsonl');
  const byCa = {};
  for (const r of history) if (r.ca) (byCa[r.ca] ||= []).push(r);

  const out = [];
  for (const t of tokens) {
    const q = marketmanip.growthQuality(byCa[t.ca] || []);
    if (q.verdict === 'unknown') continue;
    out.push({ ca: t.ca, sym: t.sym, ...q });
  }
  fs.writeFileSync(path.join(DATA, 'growth-quality.json'),
    JSON.stringify({ computedAt: Date.now(), coins: out }, null, 1) + '\n');
  return out;
}

async function main() {
  const tokens = watchlist();
  log(`cloud collection — ${tokens.map((t) => t.sym).join(', ')}`);

  log('market:');
  append('market.jsonl', await collectMarket(tokens));

  log('labels:');
  try {
    const { checked, resolved } = resolveLabels();
    log(`  ${checked} open forecast(s) checked, ${resolved} resolved this run`);
  } catch (e) { log(`  label resolution failed — ${e.message}`); }

  log('growth quality:');
  try {
    const rows = writeGrowthQuality(tokens);
    for (const r of rows) log(`  ${r.sym}: ${r.verdict}`);
    if (!rows.length) log('  no coin has enough holder history yet');
  } catch (e) { log(`  growth quality failed — ${e.message}`); }

  log('chatter sweep:');
  const chatter = await collectSocial(tokens);
  append('social.jsonl', chatter.social);
  append('sector.jsonl', chatter.sector);
  writeSocialLatest(chatter.social);

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

  log('news:');
  try {
    const newsEvents = await collectNewsEvents(tokens);
    append('news.jsonl', newsEvents.map((n) => ({ ts: Date.now(), publishedTs: n.ts, kind: n.kind, confirmed: n.confirmed ?? true, ca: n.ca, sym: n.sym, query: n.query, source: n.source, title: n.title, link: n.link })));
    log(`  ${newsEvents.length} new headline(s)`);
  } catch (e) { log(`  news failed — ${e.message}`); }

  log('done');
}
main().catch((e) => { log('fatal:', e.message); process.exit(1); });


// Read both wallets, price what they hold, and tell the alerter. Silent-but-logged on failure:
// a missed push leaves the previous list in place, which is stale but not wrong-shaped, and must
// never take down a collection run.
async function pushHeldPositions() {
  const addrs = String(process.env.MCII_WALLETS || '').split(',').map((a) => a.trim()).filter(Boolean);
  if (!addrs.length) return;
  if (!process.env.CLOUDFLARE_KV_TOKEN) { log('  holdings push: no CLOUDFLARE_KV_TOKEN, skipping'); return; }
  try {
    const totals = new Map();
    for (const a of addrs) {
      const w = await walletAdapter.fetchHoldings(a);
      for (const h of w.holdings) if (h.amount > 0) totals.set(h.mint, (totals.get(h.mint) || 0) + h.amount);
    }
    if (!totals.size) { log('  holdings push: wallets read as empty — NOT pushing (D-29: empty is not a reading)'); return; }
    const prices = await fetchPrices([...totals.keys()]);
    const positions = [];
    for (const [ca, tok] of totals) {
      const p = prices.get(ca);
      if (!p) continue;
      const valueUsd = tok * p.priceUsd;
      positions.push({ ca, sym: p.symbol || '?', tokens: tok, valueUsd });
    }
    const r = await alertsPush.pushHoldings(positions);
    log(`  holdings push: ${r.pushed != null ? r.pushed + ' positions' : r.skipped || r.error}`);
  } catch (e) {
    log(`  holdings push failed — ${e.message}`);
  }
}
