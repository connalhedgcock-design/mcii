// Does any of this actually predict anything?
//
// Three questions, all asked of data already collected, all answerable only once enough of it
// exists. ! this tool's most important behaviour is REFUSING TO ANSWER when it cannot. A number
// computed from six observations that reads like a finding is worse than no number, because it
// gets believed and then built on.
//
//   1. TURBULENCE  — does attention predict that a coin MOVES A LOT, in either direction?
//      ! this is the question the literature actually supports. Repeated finding: social attention
//      forecasts trading volume and volatility reliably, and direction poorly (see
//      60-KB/social-signal-research.md). Scoring direction is scoring the hard half; scoring size
//      of move is scoring the half that holds up.
//
//   2. ACCOUNTS    — which people were early on coins that subsequently moved?
//      Modelled on the dynamic expert-tracing work (arXiv 2504.10078), including its most useful
//      idea: keep the CONSISTENTLY WRONG too. An account reliably early on things that then die is
//      as informative as one reliably early on things that run, just inverted.
//      ! that paper's own honest limit: expert signals covered ~4% of opportunities. This is a
//      narrow knife, never a wide net, and should not be sold as one.
//
//   3. VOCABULARY  — which words actually preceded moves?
//      The filter currently runs on word lists I wrote by hand. Slang moves and those lists go
//      stale silently. This mines the kept corpus for wording that shows up disproportionately
//      before a move, so the vocabulary can be learned from evidence instead of guessed.
//
// ! EVERY RESULT HERE NEEDS A BASE RATE BESIDE IT. "This account was right 60% of the time" means
// nothing until you know that everything moved 55% of the time. Without the comparison it is not
// a finding, it is arithmetic.

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '../../data');
const MIN_OBS = 200;          // below this, no conclusion is offered at all
const MIN_PER_ACCOUNT = 8;    // an account needs this many calls before a hit rate means anything
const BIG_MOVE_PCT = 15;      // what counts as "moved a lot" over the horizon
const HORIZON_MS = 6 * 36e5;  // how far ahead to look

function readJsonl(f) {
  try {
    return fs.readFileSync(path.join(DATA, f), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  } catch { return []; }
}

// Price of a coin at the observation nearest to `when`, within a tolerance. ! returns null rather
// than the closest-at-any-distance: a "price six hours later" taken from three days later is not
// the measurement anyone asked for, and silently substituting it is how a backtest lies.
function priceNear(series, when, tolMs = 90 * 60000) {
  let best = null, bestGap = Infinity;
  for (const r of series) {
    const gap = Math.abs(r.ts - when);
    if (gap < bestGap) { bestGap = gap; best = r; }
  }
  return bestGap <= tolMs ? best : null;
}

function main() {
  const ap = readJsonl('attention-prices.jsonl');
  console.log(`\nattention+price observations: ${ap.length}`);
  if (ap.length < MIN_OBS) {
    const runs = Math.ceil((MIN_OBS - ap.length) / Math.max(1, ap.length ? ap.length / 2 : 30));
    console.log(`\n! NOT ENOUGH DATA TO ANSWER ANYTHING YET.`);
    console.log(`  Need about ${MIN_OBS}; roughly ${runs} more hourly scans.`);
    console.log(`  Deliberately refusing to compute a hit rate from this — a number off a handful`);
    console.log(`  of observations reads like a finding and is noise.`);
    return;
  }

  // Group price history per coin so a "later" price can be looked up.
  const byCoin = new Map();
  for (const r of ap) {
    if (!byCoin.has(r.ca)) byCoin.set(r.ca, []);
    byCoin.get(r.ca).push(r);
  }
  for (const v of byCoin.values()) v.sort((a, b) => a.ts - b.ts);

  // --- 1. TURBULENCE -------------------------------------------------------------------------
  const paired = [];
  for (const [ca, series] of byCoin) {
    for (const obs of series) {
      const later = priceNear(series, obs.ts + HORIZON_MS);
      if (!later || later.ts <= obs.ts || !obs.price || !later.price) continue;
      paired.push({ ca, weighted: obs.weighted, people: obs.people,
                    move: Math.abs((later.price - obs.price) / obs.price) * 100,
                    signed: ((later.price - obs.price) / obs.price) * 100 });
    }
  }
  console.log(`usable before/after pairs: ${paired.length}`);
  if (paired.length >= MIN_OBS) {
    const hi = paired.filter((p) => p.weighted >= 3);
    const lo = paired.filter((p) => p.weighted < 3);
    const rate = (xs) => (xs.length ? xs.filter((p) => p.move >= BIG_MOVE_PCT).length / xs.length : null);
    const up = (xs) => (xs.length ? xs.filter((p) => p.signed > 0).length / xs.length : null);
    console.log(`\n1. DOES ATTENTION PREDICT A BIG MOVE? (>=${BIG_MOVE_PCT}% either way, ${HORIZON_MS / 36e5}h ahead)`);
    console.log(`   busy coins (3+ believable people): ${(rate(hi) * 100).toFixed(0)}% moved big   n=${hi.length}`);
    console.log(`   quiet coins:                        ${(rate(lo) * 100).toFixed(0)}% moved big   n=${lo.length}`);
    console.log(`   ! base rate is the quiet row. A gap only means something if it is large.`);
    console.log(`\n   AND WHICH WAY? (the part the research says does NOT work)`);
    console.log(`   busy coins went up ${(up(hi) * 100).toFixed(0)}% of the time  (a coin flip is 50%)`);
    console.log(`   ! if this is near 50, attention says a coin will MOVE, not that it will rise.`);
  }

  // --- 2. ACCOUNTS ---------------------------------------------------------------------------
  const facts = readJsonl('post-facts.jsonl');
  const calls = new Map();   // author -> outcomes
  for (const f of facts) {
    for (const ca of f.cas || []) {
      const series = byCoin.get(ca);
      if (!series) continue;
      const at = priceNear(series, f.ts);
      const later = priceNear(series, f.ts + HORIZON_MS);
      if (!at || !later || !at.price || !later.price || later.ts <= at.ts) continue;
      const ret = ((later.price - at.price) / at.price) * 100;
      if (!calls.has(f.author)) calls.set(f.author, []);
      calls.get(f.author).push(ret);
    }
  }
  const scored = [...calls.entries()]
    .filter(([, rs]) => rs.length >= MIN_PER_ACCOUNT)
    .map(([a, rs]) => ({ a, n: rs.length, up: rs.filter((r) => r > 0).length / rs.length,
                         avg: rs.reduce((s, r) => s + r, 0) / rs.length }));
  const allRets = [...calls.values()].flat();
  const baseUp = allRets.length ? allRets.filter((r) => r > 0).length / allRets.length : null;
  console.log(`\n2. ACCOUNT TRACK RECORDS`);
  console.log(`   accounts with ${MIN_PER_ACCOUNT}+ calls: ${scored.length}   (base rate: ${baseUp != null ? (baseUp * 100).toFixed(0) + '% of all mentions were followed by a rise' : 'unknown'})`);
  if (scored.length < 10) {
    console.log(`   ! too few accounts have enough history. No names offered — a "top account"`);
    console.log(`     chosen from this would be the luckiest of a small crowd, not the best.`);
  } else {
    scored.sort((x, y) => y.up - x.up);
    console.log(`   best:`);
    for (const s of scored.slice(0, 5)) console.log(`     ${s.a}  ${(s.up * 100).toFixed(0)}% up  avg ${s.avg.toFixed(1)}%  n=${s.n}`);
    console.log(`   reliably wrong (useful inverted):`);
    for (const s of scored.slice(-5).reverse()) console.log(`     ${s.a}  ${(s.up * 100).toFixed(0)}% up  avg ${s.avg.toFixed(1)}%  n=${s.n}`);
  }

  // --- 3. VOCABULARY -------------------------------------------------------------------------
  const corpus = readJsonl('corpus.local.jsonl');
  console.log(`\n3. WHICH WORDS PRECEDED MOVES`);
  if (!corpus.length) {
    console.log(`   corpus is empty on this machine — it is server-only and gitignored (D-92).`);
    console.log(`   Run this on the collection server to answer this one.`);
    return;
  }
  const STOP = new Set('the a an and or but is are was were be been it its this that i you we they to of in on for with at by from as if so just now get got has have had do does did not no all any can will would should more most very really about into out up down over back'.split(' '));
  const moved = { yes: new Map(), no: new Map() };
  let nYes = 0, nNo = 0;
  for (const c of corpus) {
    let outcome = null;
    for (const ca of c.cas || []) {
      const series = byCoin.get(ca);
      if (!series) continue;
      const at = priceNear(series, c.ts), later = priceNear(series, c.ts + HORIZON_MS);
      if (!at || !later || !at.price || !later.price) continue;
      outcome = Math.abs((later.price - at.price) / at.price) * 100 >= BIG_MOVE_PCT;
      break;
    }
    if (outcome === null) continue;
    outcome ? nYes++ : nNo++;
    const bag = outcome ? moved.yes : moved.no;
    const words = new Set(String(c.text || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)));
    for (const w of words) bag.set(w, (bag.get(w) || 0) + 1);
  }
  if (nYes < 40 || nNo < 40) {
    console.log(`   ! not enough outcomes yet (${nYes} moved, ${nNo} did not). Need ~40 of each.`);
    return;
  }
  const lift = [];
  for (const [w, c] of moved.yes) {
    if (c < 5) continue;
    const pYes = c / nYes, pNo = (moved.no.get(w) || 0) / nNo;
    lift.push({ w, lift: pYes / (pNo || 1 / nNo), c });
  }
  lift.sort((a, b) => b.lift - a.lift);
  console.log(`   words appearing disproportionately before a big move:`);
  for (const l of lift.slice(0, 15)) console.log(`     ${l.w.padEnd(18)} ${l.lift.toFixed(1)}x   seen ${l.c}x`);
  console.log(`   ! this is a HYPOTHESIS GENERATOR, not a result. Mining thousands of words will`);
  console.log(`     always surface some by chance; anything here must be retested on later data`);
  console.log(`     before it is believed or added to the filter.`);
}

main();
