/**
 * The fused verdict, asserted against the RULES rather than against a comment.
 *
 * Every claim in synthesis.js's header is a claim about what the operator will
 * be shown when four feeds disagree. "Missing is not neutral" and "a conflict is
 * its own state" are exactly the sort of rule that survives in prose while the
 * code quietly averages them away, so each one is called here.
 */
const path = require('path');
const url = require('url');

let pass = 0, fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${x ? '  ' + x : ''}`); }
  else { fail++; console.log(`  FAIL  ${n}${x ? '  ' + x : ''}`); }
};

const coin = (over = {}) => Object.assign({
  gate: { verdict: 'PASS', findings: [] },
  market: { priceUsd: 1, priceChange: { h24: 12 } },
  trend: { price24h: { pct: 12, spanHours: 24 }, liq: { pct: 6, spanHours: 24 }, recorded: 20 },
}, over);

const social = (over = {}) => Object.assign({
  latest: { sentiment: 0.5, uniqueAuthors: 40 },
  reliability: { confidence: 'good', thin: false, manipulated: false },
  breadth: { value: 1.2 },
}, over);

(async () => {
  const s = await import(url.pathToFileURL(
    path.join(process.cwd(), 'renderer/station/synthesis.js')).href);

  // ── law 1: missing is not neutral ─────────────────────────────────────────
  const full = s.readCoin(coin(), social(), { buyUsd: 9000, sellUsd: 1000, buyers: 12, sellers: 3 });
  const marketOnly = s.readCoin(coin(), null, null);
  check('a verdict from every input is more confident than one from two',
    full.confidence > marketOnly.confidence, `${full.confidence.toFixed(2)} vs ${marketOnly.confidence.toFixed(2)}`);
  check('...and coverage says so out loud',
    full.coverage === 1 && marketOnly.coverage < 1, `${full.coverage} vs ${marketOnly.coverage.toFixed(2)}`);
  check('an absent input does not vote',
    marketOnly.votes.every((v) => v.key !== 'social' && v.key !== 'trader'));
  check('nothing at all reads as "no reading", not as neutral-positive',
    s.fuse({}).label === 'no reading' && s.fuse({}).confidence === 0);

  // ── law 2: a conflict is its own state, never an average ──────────────────
  const conflicted = s.fuse({
    market: s.marketVote(coin()),                                   // strongly up
    trader: s.traderVote({ buyUsd: 200, sellUsd: 40000, buyers: 1, sellers: 9 }),  // whale exiting
  });
  check('price up while wallets dump raises a conflict', !!conflicted.conflict);
  check('...and the label is the conflict, not "mixed"', conflicted.label === 'conflict',
    `label ${conflicted.label}, score ${conflicted.score.toFixed(2)}`);
  check('...naming which side is which',
    conflicted.conflict.up.includes('market') && conflicted.conflict.down.includes('trader'));
  check('agreement does NOT raise a conflict', !full.conflict);
  const tinyDisagreement = s.fuse({
    market: { key: 'market', dir: 1, strength: 0.05, conf: 0.8 },
    social: { key: 'social', dir: -1, strength: 0.04, conf: 0.8 },
  });
  check('a nudge in each direction is not a conflict', !tinyDisagreement.conflict);

  // ── law 3: manufactured enthusiasm votes negative ─────────────────────────
  const promoted = s.socialVote(social({
    latest: { sentiment: 0.9, uniqueAuthors: 60 },
    reliability: { confidence: 'none', manipulated: true },
  }));
  check('a promoted-looking conversation votes DOWN despite positive tone',
    promoted.dir === -1, `dir ${promoted.dir}`);
  const thin = s.socialVote(social({
    latest: { sentiment: 0.9, uniqueAuthors: 2 },
    reliability: { confidence: 'low', thin: true },
  }));
  check('a thin conversation votes nothing, with almost no confidence',
    thin.dir === 0 && thin.conf <= 0.2, `conf ${thin.conf}`);

  // ── §20: sells hit harder than buys ───────────────────────────────────────
  const sold = s.traderVote({ buyUsd: 0, sellUsd: 10000, buyers: 0, sellers: 6 });
  const bought = s.traderVote({ buyUsd: 10000, sellUsd: 0, buyers: 6, sellers: 0 });
  check('an all-sell reading hits harder than an all-buy one',
    sold.strength > bought.strength, `${sold.strength} vs ${bought.strength}`);
  check('...and they still point opposite ways', sold.dir === -1 && bought.dir === 1);

  // ── the safety gate is a floor, not a direction ───────────────────────────
  check('a FAILED gate outweighs a clean one',
    Math.abs(s.safetyVote({ gate: { verdict: 'FAIL' } }).strength) >
    Math.abs(s.safetyVote({ gate: { verdict: 'PASS' } }).strength));
  check('passing the safety checks is not a buy signal',
    s.safetyVote({ gate: { verdict: 'PASS' } }).strength <= 0.35);
  check('a failed gate drags the whole verdict negative',
    s.readCoin(coin({ gate: { verdict: 'FAIL', findings: [1, 2] } })).score < 0);

  // ── market: D-117, our own history beats the exchange's 24h number ────────
  const disagreeing = coin({
    market: { priceUsd: 1, priceChange: { h24: -30 } },
    trend: { price24h: { pct: 20, spanHours: 24 }, recorded: 20 },
  });
  check('our own recorded 24h wins when it covers the window',
    s.marketVote(disagreeing).dir === 1);
  const shortSpan = coin({
    market: { priceUsd: 1, priceChange: { h24: -30 } },
    trend: { price24h: { pct: 20, spanHours: 4 }, recorded: 20 },
  });
  check('...and loses when it only covers 4 hours',
    s.marketVote(shortSpan).dir === -1);
  check('few recorded readings means low market confidence',
    s.marketVote(coin({ trend: { price24h: { pct: 12, spanHours: 24 }, recorded: 1 } })).conf < 0.4);

  // ── the labelled words §24 ────────────────────────────────────────────────
  check('a positive verdict is labelled an opportunity', s.riskWord(full).word === 'opportunity');
  check('a conflict is labelled conflicting, not risk', s.riskWord(conflicted).word === 'conflicting');
  check('nothing at all is labelled nothing', s.riskWord(s.fuse({})).word === '');

  // ── §10: planets and asteroids ────────────────────────────────────────────
  const rows = [
    { ca: 'held1', onWatchlist: true, scans: 1, volShockPct: 2, mcap: 3e6 },
    { ca: 'big', onWatchlist: false, scans: 9, volShockPct: 210, mcap: 9e6 },
    { ca: 'newmover', onWatchlist: false, scans: 1, volShockPct: 180, mcap: 2e5 },
    { ca: 'faded', onWatchlist: false, scans: 6, volShockPct: -75, mcap: 4e6 },
    { ca: 'quiet', onWatchlist: false, scans: 8, volShockPct: 3, mcap: 4e6 },
    { ca: 'nodata', onWatchlist: false, scans: 8, volShockPct: null, mcap: 4e6 },
  ];
  const { planets, asteroids } = s.classifyBodies(rows);
  const ids = (a) => a.map((r) => r.ca);
  check('a coin you hold is a planet even when nothing moved', ids(planets).includes('held1'));
  check('a persistent volume spike is a planet', ids(planets).includes('big'));
  check('a coin whose volume FELL off a cliff is a planet too, not omitted',
    ids(planets).includes('faded'), 'blew up OR fell off — the operator asked for both');
  check('a brand-new mover is an asteroid until it persists',
    ids(asteroids).includes('newmover') && !ids(planets).includes('newmover'));
  check('a coin that did not move is neither', !ids(planets).includes('quiet') && !ids(asteroids).includes('quiet'));
  check('a coin with no volume history is not guessed at',
    !ids(planets).includes('nodata') && !ids(asteroids).includes('nodata'));
  check('nothing is in both lists',
    !ids(planets).some((id) => ids(asteroids).includes(id)));

  // ── body size ─────────────────────────────────────────────────────────────
  check('a bigger coin is a bigger body', s.bodySize(9e6) > s.bodySize(2e5));
  check('...but a $2B coin cannot swallow the room',
    s.bodySize(2e9) <= 78 && s.bodySize(50) >= 26,
    `${s.bodySize(2e9)}px vs ${s.bodySize(50)}px`);

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
