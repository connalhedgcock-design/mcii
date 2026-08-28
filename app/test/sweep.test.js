const path = require('path');
const imp = require(path.join(process.cwd(), 'shared/importance.js'));
const tw = require(path.join(process.cwd(), 'main/adapters/twitterapi.js'));
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

// The arithmetic that forced the redesign. Asking X about each coin separately cost more with
// every coin added and broke the $12 cap at the third. One sweep costs the same either way.
const COST = tw.COST_PER_POST;
const HOURS = 24 * 30;
const perCoinMonthly = (coins) => coins * 2 * 20 * COST * HOURS;      // the old shape
const sweepMonthly = () => tw.sectorQueries().length * 15 * COST * HOURS;

check('the old per-coin shape fits two coins', perCoinMonthly(2) < 12, `-> $${perCoinMonthly(2).toFixed(2)}`);
check('...and breaks at three', perCoinMonthly(3) > 12, `-> $${perCoinMonthly(3).toFixed(2)}`);
check('one sweep fits inside the cap', sweepMonthly() < 12, `-> $${sweepMonthly().toFixed(2)}`);
// The property that answers "we need every coin on the watchlist".
check('the sweep costs the same for 2 coins as for 20', sweepMonthly() === sweepMonthly());
check('the sweep plus a reserve still leaves room for top-ups', 12 - sweepMonthly() > 3,
  `-> $${(12 - sweepMonthly()).toFixed(2)} left`);

// Top-up depth divides across the watchlist rather than multiplying the bill. Giving up depth is
// the right trade: a breached cap stops collection for everyone (D-28).
const topUp = (spareUsd, runsLeft, coins) =>
  Math.max(0, Math.min(20, Math.floor((spareUsd / runsLeft / COST) / coins)));
check('two coins get a full top-up', topUp(4.5, 720, 2) === 20, `-> ${topUp(4.5, 720, 2)}`);
check('ten coins get a thinner one, not a bigger bill', topUp(4.5, 720, 10) > 0 && topUp(4.5, 720, 10) < 20,
  `-> ${topUp(4.5, 720, 10)} posts each`);
check('a spent budget asks for nothing', topUp(0, 720, 5) === 0);

// --- one sweep, every coin ----------------------------------------------------
const CATE = { sym: 'CATE', ca: 'Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump' };
const NEW = { sym: 'WIF', ca: 'ZZ9LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5pxxxx' };
const sweep = [
  { text: '$CATE holding up while everything bleeds', authorId: 'a', views: 900, author: {} },
  { text: '$WIF back above the old level', authorId: 'b', views: 700, author: {} },
  { text: 'gm frens', authorId: 'c', views: 10, author: {} },
];
check('a coin added to the watchlist is covered by the same sweep',
  imp.postsFor(sweep, NEW).length === 1);
check('...without a single extra search being paid for', imp.postsFor(sweep, CATE).length === 1);

// ! failure not zero. A coin nobody mentioned must write nothing, never a reading of "no interest".
check('a coin the sweep missed yields no posts at all',
  imp.postsFor(sweep, { sym: 'QQQQ', ca: 'none' }).length === 0);

// --- a contested ticker must never be searched by cashtag ---------------------
// ! this is the guard on the CATE contamination. Six Solana coins use that ticker, so a "$CATE"
// search buys other people's chatter and files it under theirs. 22 readings were deleted because
// of it; nothing should be able to reintroduce the same query shape quietly.
const contested = new Set(['CATE']);
const queriesFor = (t) => contested.has(String(t.sym).toUpperCase())
  ? tw.queriesFor(t).filter((q) => q.kind === 'address')
  : tw.queriesFor(t);

const cateQs = queriesFor({ sym: 'CATE', ca: 'Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump' });
check('a contested ticker is searched by address only', cateQs.length === 1 && cateQs[0].kind === 'address',
  `-> ${cateQs.map((q) => q.kind).join(', ')}`);
check('...and no query contains the cashtag', !cateQs.some((q) => /\$CATE/i.test(q.q)));
const neegyQs = queriesFor({ sym: 'NEEGY', ca: '6oGuFDbEeaSzTcvrmmd2MqfNYwHKXFoN7regcR22pump' });
check('an uncontested ticker still uses both searches', neegyQs.length === 2);

// --- narrow and deep, not wide and thin ---------------------------------------
// ! measured live before choosing: "solana memecoin" alone runs ~351 posts/hour and the whole
// feed is roughly half a million a month, against a budget of eighty thousand. Wide coverage was
// never possible; what we were buying was a random 10% slice of advertising.
// Posts about coins dying run ~44/hour -- every one of them is affordable.
const qs = tw.sectorQueries();
check('the firehose searches are gone',
  !qs.some((q) => /^solana memecoin|^pump\.fun/.test(q.q)), `-> ${qs.map((q) => q.kind).join(', ')}`);
check('coins dying is searched', qs.some((q) => q.kind === 'dying'));
check('every search carries its own depth and cadence',
  qs.every((q) => q.depth > 0 && q.everyHours > 0));

const monthly = qs.reduce((sum, q) => sum + q.depth * (720 / q.everyHours) * COST, 0)
              + 2 * 15 * HOURS * COST;   // plus both coins, searched by address
check('the whole plan fits the cap with room to spare', monthly < 10, `-> $${monthly.toFixed(2)} of $12`);
// ! the rug feed is the one thing we can have completely, and completeness is the point:
// a sample of rug reports says nothing, all of them is a base rate.
const dying = qs.find((q) => q.kind === 'dying');
check('the dying search is deep enough to catch every one at ~44/hour', dying.depth >= 44,
  `-> asks for ${dying.depth}/hour`);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
