/**
 * evidencepacket.test.js — build-plan Step 1's own finish lines, checked directly against
 * `assemblePacket`/`hashPacket` with fixed inputs. No fs, no network — matching this project's
 * "pure logic is what's testable" rule (see the file's own header).
 */
const { assemblePacket, hashPacket } = require('../shared/evidencepacket');

let pass = 0, fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${x ? '  ' + x : ''}`); }
  else { fail++; console.log(`  FAIL  ${n}${x ? '  ' + x : ''}`); }
};

const CA = 'CoinAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const OTHER_CA = 'CoinBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const CUTOFF = 1_000_000; // ms, arbitrary fixed instant

function baseInputs(over = {}) {
  return Object.assign({
    chain: 'solana', ca: CA, sym: 'CATE', decisionCutoff: CUTOFF,
    rawTrades: [], rawPosts: [], rawMarket: [], rawNews: [], rugCheck: null,
  }, over);
}

// ── 1. Cutoff leakage ───────────────────────────────────────────────────────────────────────────
{
  const rawTrades = [
    { coinAddress: CA, tradeId: 'before', at: CUTOFF - 1, handle: 'x', direction: 'buy', usd: 10 },
    { coinAddress: CA, tradeId: 'after', at: CUTOFF + 1, handle: 'x', direction: 'buy', usd: 10 },
  ];
  const rawPosts = [
    { ts: CUTOFF - 1, matchesCoin: { ca: CA, confidence: 'strong' }, text: 'before', handle: 'h' },
    { ts: CUTOFF + 1, matchesCoin: { ca: CA, confidence: 'strong' }, text: 'after', handle: 'h' },
  ];
  const rawMarket = [
    { ca: CA, ts: CUTOFF - 1, price: 1, liq: 1000 },
    { ca: CA, ts: CUTOFF + 1, price: 999, liq: 1000 },
  ];
  const rawNews = [
    { ca: CA, ts: CUTOFF - 1, link: 'a', title: 'before' },
    { ca: CA, ts: CUTOFF + 1, link: 'b', title: 'after' },
  ];
  const p = assemblePacket(baseInputs({ rawTrades, rawPosts, rawMarket, rawNews }));
  const allText = JSON.stringify(p.streams);
  check('nothing dated after the cutoff appears anywhere in the packet',
    !allText.includes('"after"') && !p.streams.market.some((m) => m.raw.price === 999));
  check('the before-cutoff rows do survive (this is a filter, not a wipeout)',
    p.streams.trades.length === 1 && p.streams.posts.length === 1
    && p.streams.market.length === 1 && p.streams.news.length === 1);
}

// ── 2. Hash reproducibility ─────────────────────────────────────────────────────────────────────
{
  const rawMarket = [{ ca: CA, ts: CUTOFF - 100, price: 1, liq: 1000 }];
  const inputsA = baseInputs({ rawMarket });
  const hashA = assemblePacket(inputsA).hash;
  const hashB = assemblePacket(baseInputs({ rawMarket })).hash;
  check('same inputs, same cutoff -> same hash', hashA === hashB);

  // A real replay: the same underlying rows, plus rows dated AFTER the cutoff that arrived later
  // (e.g. the coin kept trading after the decision was made). The cutoff must exclude them, so
  // the hash must not move.
  const laterRawMarket = [...rawMarket, { ca: CA, ts: CUTOFF + 500, price: 2, liq: 2000 }];
  const hashReplay = assemblePacket(baseInputs({ rawMarket: laterRawMarket })).hash;
  check('extending the input with later-dated rows does not change the hash (replay guarantee)',
    hashA === hashReplay);

  const hashDifferentCutoff = assemblePacket(baseInputs({ rawMarket, decisionCutoff: CUTOFF + 1 })).hash;
  check('changing only the cutoff changes the hash', hashA !== hashDifferentCutoff);

  // Rebuilding (a fresh packetId/builtAt/version) over IDENTICAL evidence must still hash the same.
  const p1 = assemblePacket(baseInputs({ rawMarket, version: 1 }));
  const p2 = assemblePacket(baseInputs({ rawMarket, version: 7, previousPacketRef: { packetId: 'x', version: 6 } }));
  check('version/previousPacketRef/packetId/builtAt do not affect the hash', hashPacket(p1) === hashPacket(p2));
}

// ── 3. Identity collisions ──────────────────────────────────────────────────────────────────────
{
  const rawPosts = [
    { ts: CUTOFF - 10, matchesCoin: { ca: CA, confidence: 'strong' }, text: 'about coin A', handle: 'h1' },
    { ts: CUTOFF - 10, matchesCoin: { ca: OTHER_CA, confidence: 'strong' }, text: 'about coin B, same ticker', handle: 'h2' },
    { ts: CUTOFF - 10, matchesCoin: { ca: CA, confidence: 'possible' }, text: 'weak match on coin A', handle: 'h3' },
  ];
  const packetA = assemblePacket(baseInputs({ rawPosts }));
  check('a post matched to a different coin never lands in this coin\'s packet',
    !packetA.streams.posts.some((p) => p.raw.handle === 'h2'));
  check('this coin\'s own matches do land', packetA.streams.posts.some((p) => p.raw.handle === 'h1')
    && packetA.streams.posts.some((p) => p.raw.handle === 'h3'));
  const weak = packetA.streams.posts.find((p) => p.raw.handle === 'h3');
  check('an ambiguous/weak match is never promoted to "certain"', weak.identityCertainty === 'possible');
}

// ── 4. Missing data ──────────────────────────────────────────────────────────────────────────────
{
  const p = assemblePacket(baseInputs());
  const streams = ['trades', 'posts', 'market', 'news', 'rugCheck'];
  for (const s of streams) {
    check(`empty/unavailable "${s}" is named in missingData, not silently blank`,
      p.missingData.some((m) => m.stream === s));
  }
  check('empty streams are still empty arrays, never omitted from the shape',
    Array.isArray(p.streams.trades) && Array.isArray(p.streams.posts)
    && Array.isArray(p.streams.market) && Array.isArray(p.streams.news));
}

// ── 5. Suspect price ─────────────────────────────────────────────────────────────────────────────
{
  // Same family as pricesanity.js's own documented fixture: a huge price jump with liquidity that
  // barely moves is a bad quote, not a real move (SPIKE_RATIO=10, LIQ_FOLLOW_FACTOR=10).
  const rawMarket = [
    { ca: CA, ts: CUTOFF - 200, price: 0.02, liq: 10000 },
    { ca: CA, ts: CUTOFF - 100, price: 269.64, liq: 10500 }, // ~13,482x price, ~1.05x liquidity
  ];
  const p = assemblePacket(baseInputs({ rawMarket }));
  check('a suspect price is kept, never dropped', p.streams.market.length === 2);
  const spike = p.streams.market.find((m) => m.raw.price === 269.64);
  check('the spike is flagged suspect with a reason', spike.priceSuspect === true && !!spike.priceSuspectWhy);
  const normal = p.streams.market.find((m) => m.raw.price === 0.02);
  check('the trustworthy row is not flagged', normal.priceSuspect === false);
}

// ── 6. Narrative snapshot ───────────────────────────────────────────────────────────────────────
// The Story room's "ask for a read" on an address that isn't tracked at all: no trades/posts/
// market/news rows exist for it, but the fresh news/X/project-link lookup it just ran should still
// land in the packet and change the read.
{
  const narrative = {
    name: 'Test Coin', symbol: 'TEST',
    items: [{ title: 'headline', link: 'https://x', source: 'src', ts: CUTOFF - 10 }],
    xPosts: { posts: [{ text: 'gm', handle: 'h', url: 'u', createdAt: CUTOFF - 5, likes: 3 }], skipped: false },
    pumpfun: { description: 'a coin' },
    info: { websites: [{ url: 'https://site' }], socials: [] },
    boost: { active: true },
    confirmed: false,
  };
  const withNarrative = assemblePacket(baseInputs({ narrative }));
  const without = assemblePacket(baseInputs());
  check('narrative present -> not listed in missingData',
    !withNarrative.missingData.some((m) => m.stream === 'narrative'));
  check('narrative absent -> named in missingData, not silently blank',
    without.missingData.some((m) => m.stream === 'narrative'));
  check('narrative snapshot lands in the packet',
    withNarrative.narrative && withNarrative.narrative.name === 'Test Coin'
    && withNarrative.narrative.news.length === 1 && withNarrative.narrative.xPosts.length === 1
    && withNarrative.narrative.projectSelfDescription === 'a coin' && withNarrative.narrative.boosted === true);
  check('narrative is never auto-promoted to confirmed', withNarrative.narrative.confirmed === false);
  check('narrative changes the hash (it is real evidence, not bookkeeping)',
    hashPacket(withNarrative) !== hashPacket(without));
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
