const path = require('path');
const r = require(path.join(process.cwd(), 'shared/resolve.js'));
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

const CATE_CA = 'Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump';
const FONE_CA = 'CTPoyCwkjMvoJwU4xvZZqoD8tiYk6yDchySiN5gGpump';
// Real coins out of their own scan record, including the one that makes this hard.
const lex = r.buildLexicon([
  { ca: CATE_CA, sym: 'CATE', name: 'Cate' },
  { ca: FONE_CA, sym: 'fone', name: 'apeonfone' },
  { ca: 'ApZuxdpzMrbEYTGEzeY9afh5pj9d6qPRJCTgQYiipbKg', sym: 'CYBERLEEK', name: 'CyberLeek' },
]);
const has = (hits, sym, conf) => hits.some((h) => (h.sym || h.ticker) === sym && (!conf || h.confidence === conf));

// --- proof --------------------------------------------------------------------
check('a contract address is certain', r.mentions(`just bought ${CATE_CA}`, lex)[0].confidence === 'certain');
check('a shortened address resolves too',
  has(r.mentions('aped into Ai66LH...ppump this morning', lex), 'CATE', 'certain'));
check('...and the ellipsis character works as well',
  has(r.mentions('Ai66LH…ppump looking good', lex), 'CATE', 'certain'));

// --- cashtags -----------------------------------------------------------------
check('a cashtag for a coin we know is strong', has(r.mentions('$CATE holding up', lex), 'CATE', 'strong'));
check('case does not matter', has(r.mentions('$cate holding up', lex), 'CATE', 'strong'));

// ! the point of the whole exercise: a ticker nobody here has looked at is the most useful thing
// in a sweep, so it is reported rather than dropped.
const unk = r.mentions('$WIFHAT about to run', lex);
check('an unknown cashtag is kept and marked unknown', unk.length === 1 && unk[0].known === false && unk[0].ticker === 'WIFHAT');

// --- the hard case ------------------------------------------------------------
// ! "fone" is a real coin in their scan record and also how people write "phone".
check('a bare ticker in an ordinary sentence is NOT matched',
  !has(r.mentions('dropped my fone in the sink', lex), 'fone'), '(would have been a false hit)');
check('...but the same word in a trading post is probable',
  has(r.mentions('fone chart looks ready, buying more', lex), 'fone', 'probable'));
check('a cashtag beats the context rule entirely',
  has(r.mentions('$fone', lex), 'fone', 'strong'));
check('ordinary words that are also tickers never match bare',
  !r.mentions('this is the top coin to buy', r.buildLexicon([{ ca: 'x', sym: 'TOP', name: 'Top' }])).length);
check('very short tickers need a $',
  !r.mentions('it is a good coin to buy', r.buildLexicon([{ ca: 'y', sym: 'IT', name: 'ItCoin' }])).length);

// --- names --------------------------------------------------------------------
check('the project name matches when the ticker is absent',
  has(r.mentions('apeonfone is the one everyone missed', lex), 'fone', 'possible'));

// --- ambiguity ----------------------------------------------------------------
// ! two coins, one ticker. Returning the bigger one silently is the same error as averaging two
// sources that disagree: it looks confident and cannot be checked afterwards.
const twin = r.buildLexicon([{ ca: 'aaa', sym: 'DUPE', name: 'First' }, { ca: 'bbb', sym: 'DUPE', name: 'Second' }]);
const both = r.mentions('$DUPE going crazy', twin);
check('a ticker used by two known coins returns both', both.length === 2);
check('...and every one is flagged ambiguous', both.every((h) => h.ambiguous === true));

// --- a ticker several coins share --------------------------------------------
// !! REAL AND IT AFFECTS A COIN THEY HOLD. Six live Solana coins use CATE; theirs is third by
// pool size, behind one at $248M. A cashtag cannot be treated as naming their coin.
const contestedLex = r.buildLexicon([{ ca: CATE_CA, sym: 'CATE', name: 'Cate' }], { contested: new Set(['CATE']) });
const contestedHit = r.mentions('$CATE is flying today', contestedLex);
check('a cashtag on a contested ticker is downgraded', contestedHit[0].confidence === 'possible', `-> ${contestedHit[0].confidence}`);
check('...and marked contested', contestedHit[0].contested === true && contestedHit[0].ambiguous === true);
check('...and says so in plain words', /several coins use this ticker/.test(contestedHit[0].via));
check('a bare word on a contested ticker is dropped entirely',
  !r.mentions('CATE chart looks good, buying', contestedLex).length);
// ! the address still resolves. Proof is proof, however crowded the name is.
check('the contract address is unaffected',
  r.mentions(`bought ${CATE_CA}`, contestedLex)[0].confidence === 'certain');

// --- the queue that turns chatter into coins ----------------------------------
const posts = [
  { text: '$WIFHAT is moving', authorId: 'a', views: 100 },
  { text: 'grabbed some $WIFHAT', authorId: 'b', views: 200 },
  { text: '$WIFHAT chart', authorId: 'c', views: 50 },
  { text: '$ONEGUY only me', authorId: 'd', views: 10 },
  { text: '$CATE known already', authorId: 'e', views: 10 },
];
const q = r.unknownTickers(posts, lex, { minPeople: 3 });
check('a ticker three different people used is queued for lookup', q.length === 1 && q[0].ticker === 'WIFHAT', `-> ${q.map(x=>x.ticker).join(',')}`);
check('one person shouting is not', !q.some((x) => x.ticker === 'ONEGUY'));
check('a coin we already know is not queued', !q.some((x) => x.ticker === 'CATE'));

// --- turning a ticker into a real coin ----------------------------------------
const fakeSearch = (rows) => async () => rows;
(async () => {
  const clear = await r.identify('WIFHAT', fakeSearch([
    { chain: 'solana', symbol: 'WIFHAT', name: 'wif hat', ca: 'real1', liquidityUsd: 400000, ageDays: 12 },
    { chain: 'solana', symbol: 'WIFHAT', name: 'copycat', ca: 'real2', liquidityUsd: 900, ageDays: 1 },
  ]));
  check('a clear leader is named', clear.resolved && clear.resolved.ca === 'real1', `-> ${clear.resolved && clear.resolved.ca}`);
  check('...and the copycat is filtered out on liquidity', clear.matches.length === 1);

  const tie = await r.identify('DUPE', fakeSearch([
    { chain: 'solana', symbol: 'DUPE', name: 'one', ca: 'a', liquidityUsd: 300000 },
    { chain: 'solana', symbol: 'DUPE', name: 'two', ca: 'b', liquidityUsd: 250000 },
  ]));
  check('two similar-sized coins refuse to resolve', tie.resolved === null && tie.ambiguous === true);
  check('...and say why in plain words', /not guessing which/.test(tie.reason));

  const wrongChain = await r.identify('PEPE', fakeSearch([
    { chain: 'ethereum', symbol: 'PEPE', name: 'pepe', ca: '0xabc', liquidityUsd: 9000000 },
  ]));
  check('a coin on another chain is not our coin', wrongChain.resolved === null && wrongChain.matches.length === 0);

  const broken = await r.identify('X', async () => { throw new Error('search unavailable'); });
  check('a failed lookup returns nothing, never a guess', broken.matches.length === 0 && !broken.resolved);

  // ! the search bug this caught: passing "$WIF" returns coins whose SYMBOL is literally "$WIF",
  // which is a different token. Live, it found four results and none was the coin anyone means.
  let asked = null;
  await r.identify('WIF', async (q) => { asked = q; return []; });
  check('lookups search the bare ticker, not the cashtag', asked === 'WIF', `-> asked for "${asked}"`);

  const contested = await r.findContested([{ ca: 'ours', sym: 'CATE' }], async () => ([
    { chain: 'solana', symbol: 'CATE', name: 'big one', ca: 'other', liquidityUsd: 248000000 },
    { chain: 'solana', symbol: 'CATE', name: 'theirs', ca: 'ours', liquidityUsd: 2000000 },
  ]));
  check('a shared ticker is detected', !!contested.CATE);
  check('...and reports where theirs ranks', contested.CATE.rank === 2 && contested.CATE.of === 2, `-> ${contested.CATE.rank} of ${contested.CATE.of}`);
  const clean = await r.findContested([{ ca: 'ours', sym: 'SOLO' }], async () => ([
    { chain: 'solana', symbol: 'SOLO', name: 'theirs', ca: 'ours', liquidityUsd: 90000 },
  ]));
  check('a ticker only they use is not flagged', Object.keys(clean).length === 0);

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
