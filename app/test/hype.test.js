const path = require('path');
const h = require(path.join(process.cwd(), 'shared/hype.js'));
const { score } = require(path.join(process.cwd(), 'shared/sentiment.js'));

const now = Date.now();
const realAcct = (i) => ({ createdAt: now - (400 + i * 30) * 864e5, followers: 300 + i * 90, following: 250, postsPerDay: 3, defaultAvatar: false });
const botAcct  = ()  => ({ createdAt: now - 6 * 864e5, followers: 4, following: 900, postsPerDay: 80, defaultAvatar: true });

// Organic: many different people, varied wording, spread over time, established accounts.
const organicTexts = [
  'been watching this one for a while, chart looks strong',
  'finally green on my bag, feeling good',
  'liquidity looks healthy, might add more',
  'not sure about this honestly, volume is thinning',
  'the community around this is actually decent',
  'took some profit here, still holding most',
  'this could run further if volume holds',
  'careful, it already doubled this week',
  'solid project, dev is active',
  'moon soon 🚀',
];
const organic = organicTexts.map((t, i) => ({
  authorId: `real_${i}`, author: realAcct(i), text: t,
  likes: 5 + i * 7, replies: i, reposts: Math.floor(i / 2),
  createdAt: now - (i * 9 * 60 * 1000),
}));

// Coordinated: three accounts, near-identical copy, all inside ninety seconds, fresh accounts.
const shill = '🚀🚀 $TOKEN is the next 100x dont miss out 🚀🚀';
const coordinated = Array.from({ length: 12 }, (_, i) => ({
  authorId: `bot_${i % 3}`, author: botAcct(), text: shill,
  likes: 2, replies: 0, reposts: 1,
  createdAt: now - i * 7000,
}));

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${extra ? '  ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? '  ' + extra : ''}`); }
};

const bo = h.bucket(organic, { bucketMs: 9e5, ts: now });
const bc = h.bucket(coordinated, { bucketMs: 9e5, ts: now });
const ro = h.reliability(bo), rc = h.reliability(bc);

console.log('\n  ORGANIC   ', JSON.stringify({ authors: bo.uniqueAuthors, div: bo.diversity, dup: bo.duplicateRatio, bot: bo.botRatio, burst: bo.burstiness, sent: bo.sentiment }));
console.log('  COORDINATED', JSON.stringify({ authors: bc.uniqueAuthors, div: bc.diversity, dup: bc.duplicateRatio, bot: bc.botRatio, burst: bc.burstiness, sent: bc.sentiment }), '\n');

check('organic has high author diversity', bo.diversity > 0.85, `(${bo.diversity})`);
check('coordinated has low author diversity', bc.diversity < 0.75, `(${bc.diversity})`);
check('organic has no duplicate copy', bo.duplicateRatio === 0, `(${bo.duplicateRatio})`);
check('coordinated flagged as duplicate copy', bc.duplicateRatio > 0.9, `(${bc.duplicateRatio})`);
check('organic accounts not flagged as bots', bo.botRatio === 0, `(${bo.botRatio})`);
check('coordinated accounts flagged as bots', bc.botRatio === 1, `(${bc.botRatio})`);
check('coordinated flagged as bursty', bc.burstiness > 0.9, `(${bc.burstiness})`);
check('organic flagged THIN (only 10 authors), not manipulated', ro.thin === true && ro.manipulated === false);
check('organic confidence is low, not none', ro.confidence === 'low', `(${ro.confidence})`);
check('COORDINATED FAILS the reliability gate', rc.ok === false, `-> ${rc.problems.length} problems`);
check('coordinated marked as coordinated', rc.coordinated === true);
check('organic NOT marked as coordinated', ro.coordinated === false);

// The shill campaign is loudly positive. That must NOT become a bullish reading.
check('coordinated flagged as promotional language', bc.shillRatio > 0.9, `(${bc.shillRatio})`);
check('coordinated confidence is NONE', rc.confidence === 'none', `(${rc.confidence})`);
check('...but is gated as untrustworthy anyway', rc.ok === false);

// Index refuses to produce a number without enough history
const noHist = h.hypeIndex(bo, []);
check('hype index refuses to score with no history', noHist.value === null, `-> "${noHist.reason}"`);
const hist = Array.from({ length: 25 }, (_, i) => ({ engagement: 10 + Math.sin(i) * 3 }));
const withHist = h.hypeIndex(bo, hist);
check('hype index produces a z-score once history exists', typeof withHist.value === 'number', `(z=${withHist.value})`);

// A large genuine sample must pass cleanly.
const bigOrganic = Array.from({ length: 40 }, (_, i) => ({
  authorId: `real_${i}`, author: realAcct(i),
  text: organicTexts[i % organicTexts.length] + ' ' + i,
  likes: 3 + i, replies: i % 4, reposts: i % 3,
  createdAt: now - i * 11 * 60 * 1000,
}));
const bb = h.bucket(bigOrganic, { bucketMs: 9e5, ts: now });
const rb = h.reliability(bb);
check('40 genuine authors PASSES the gate', rb.ok === true, `(confidence: ${rb.confidence})`);
check('...with good confidence', rb.confidence === 'good');
check('...and is not flagged manipulated', rb.manipulated === false);

// Sentiment must not average unscored posts in as neutral
const noVocab = h.bucket([{ authorId: 'a', author: realAcct(1), text: 'the weather is nice', likes: 1, createdAt: now }], { bucketMs: 9e5, ts: now });
check('bucket with no scoreable language returns null sentiment', noVocab.sentiment === null);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
