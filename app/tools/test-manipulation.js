// Does the manipulation detector actually detect manipulation?
//
// It flagged 3 of 386 readings and three of its six warning signs have NEVER fired once. That is
// either a very clean corner of the market or a detector that is not running, and those look
// identical from the outside -- which is the exact failure this project keeps hitting.
//
// GROUND TRUTH, AND ITS LIMITS
// Group A = coins on DexScreener's PAID BOOST feed. These are not "suspected" of promotion; they
// paid money for placement, so promotional intent is a fact rather than an inference.
// Group B = the watchlist, which is not proven organic but is at least not currently paying to be
// seen. ! this is a WEAK label and must be reported as one: a coin can buy a DexScreener boost and
// still have a genuine Twitter following, and a watchlist coin can be quietly shilled. So a null
// result here does NOT prove the markers are useless -- it proves they cannot separate these two
// groups, which is a weaker and more honest claim.
//
// What this CAN establish: whether each marker has any discriminating power at all, and where its
// threshold would have to sit to catch anything. That is enough to fix a threshold set that was
// guessed rather than fitted.

const tw = require('../main/adapters/twitterapi');
const { discoverLatest } = require('../main/adapters/dexscreener');
const { getJSON } = require('../main/adapters/http');
const h = require('../shared/hype');

const PER_COIN = Number(process.env.TEST_POSTS || 25);
const N_BOOSTED = Number(process.env.TEST_COINS || 6);

async function marketFor(ca) {
  try {
    const r = await getJSON(`https://api.dexscreener.com/token-pairs/v1/solana/${ca}`);
    const p = Array.isArray(r) ? r.find((x) => x.baseToken?.address?.toLowerCase() === ca.toLowerCase()) : null;
    return p ? { sym: p.baseToken.symbol, liq: p.liquidity?.usd || 0 } : null;
  } catch { return null; }
}

async function readingFor(ca, sym) {
  // Searched by ADDRESS, never ticker: a ticker search returns every coin sharing the name (D-73).
  const r = await tw.searchPosts(ca, { maxPosts: PER_COIN });
  if (!r.posts.length) return null;
  const b = h.bucket(r.posts, { bucketMs: 36e5, ts: Date.now() });
  const rel = h.reliability(b);
  return { sym, ca, posts: b.posts, people: b.uniqueAuthors,
           diversity: b.diversity, botRatio: b.botRatio, duplicateRatio: b.duplicateRatio,
           burstiness: b.burstiness, shillRatio: b.shillRatio,
           medianEngagementRate: b.medianEngagementRate, totalViews: b.totalViews,
           manipulated: rel.manipulated, confidence: rel.confidence, problems: rel.problems };
}

(async () => {
  tw.configure({ key: process.env.TWITTERAPI_KEY, monthlyCapUsd: Number(process.env.X_MONTHLY_CAP_USD || 24) });
  const before = tw.budget().usd;

  const { boosts } = await discoverLatest();
  // Only Solana, and only coins with enough of a market that anyone could be talking about them.
  const cands = [];
  for (const b of boosts) {
    if (cands.length >= N_BOOSTED) break;
    const ca = b.tokenAddress;
    if (!ca || (b.chainId && b.chainId !== 'solana')) continue;
    const m = await marketFor(ca);
    if (m && m.liq > 20000) cands.push({ ca, sym: m.sym, liq: m.liq });
    await new Promise((r) => setTimeout(r, 250));
  }

  let watch = [];
  try { watch = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../../data/watchlist.json'), 'utf8')); } catch {}

  console.log(`\nGROUP A — coins that PAID for promotion (n=${cands.length})`);
  const A = [];
  for (const c of cands) {
    const r = await readingFor(c.ca, c.sym);
    if (r) { A.push(r); console.log(`  ${String(r.sym).padEnd(10)} ${r.posts} posts/${r.people} people  dup ${r.duplicateRatio}  burst ${r.burstiness}  shill ${r.shillRatio}  bots ${r.botRatio}  div ${r.diversity}  -> ${r.manipulated ? 'FLAGGED' : 'clean'}`); }
    else console.log(`  ${(c.sym||'?').padEnd(10)} no posts found`);
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\nGROUP B — the watchlist (n=${watch.length})`);
  const B = [];
  for (const c of watch) {
    const r = await readingFor(c.ca, c.sym);
    if (r) { B.push(r); console.log(`  ${String(r.sym).padEnd(10)} ${r.posts} posts/${r.people} people  dup ${r.duplicateRatio}  burst ${r.burstiness}  shill ${r.shillRatio}  bots ${r.botRatio}  div ${r.diversity}  -> ${r.manipulated ? 'FLAGGED' : 'clean'}`); }
    await new Promise((r) => setTimeout(r, 400));
  }

  const mean = (xs) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN;
  console.log('\nCAN EACH MARKER TELL THE GROUPS APART?');
  for (const k of ['duplicateRatio', 'burstiness', 'shillRatio', 'botRatio', 'diversity']) {
    const a = mean(A.map((r) => r[k]).filter((v) => typeof v === 'number'));
    const b = mean(B.map((r) => r[k]).filter((v) => typeof v === 'number'));
    const dir = k === 'diversity' ? 'lower is worse' : 'higher is worse';
    const sep = (a - b);
    console.log(`  ${k.padEnd(15)} paid ${a.toFixed(3)}   watchlist ${b.toFixed(3)}   gap ${sep >= 0 ? '+' : ''}${sep.toFixed(3)}  (${dir})`);
  }
  console.log(`\nflagged: ${A.filter((r) => r.manipulated).length}/${A.length} paid vs ${B.filter((r) => r.manipulated).length}/${B.length} watchlist`);
  console.log(`spend for this test: $${(tw.budget().usd - before).toFixed(4)}`);
})();
