const path = require('path');
const imp = require(path.join(process.cwd(), 'shared/importance.js'));
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

const CATE = { sym: 'CATE', ca: 'Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump' };
const NEEGY = { sym: 'NEEGY', ca: '6oGuFDbEeaSzTcvrmmd2MqfNYwHKXFoN7regcR22pump' };
const ctx = { watchlist: [CATE, NEEGY], scanned: [{ sym: 'QUAKE', ca: 'FR3fLGui4CNGWX6f544aFuDnAykAhi65K5GD11YMpump' }] };
const p = (text, extra = {}) => ({ text, authorId: 'a', views: 500, author: {}, ...extra });

// --- what must reach them ----------------------------------------------------
const held = imp.classify(p('$CATE chart looking heavy today'), ctx);
check('a post about a coin they hold is important', held.level === 'high', `-> ${held.level}`);
check('...and says which coin', /CATE/.test(held.reasons.join(' ')));

const byAddress = imp.classify(p(`someone just dumped on ${CATE.ca}`), ctx);
check('an address match counts as being about their coin', byAddress.about.length === 1 && byAddress.about[0].sym === 'CATE');

// Bad news about their own money outranks everything. This is the whole ordering.
const bad = imp.classify(p('$NEEGY dev sold, liquidity pulled, cant sell'), ctx);
check('bad news about a held coin is important', bad.level === 'high' && bad.kind === 'failure');

const otherRug = imp.classify(p('$SOMECOIN just rugged, liquidity pulled'), ctx);
check('a coin dying is important even when it is not theirs', otherRug.level === 'high' && otherRug.kind === 'failure');

// --- what must not ------------------------------------------------------------
const promo = imp.classify(p('next 100x gem, dont miss out, ape in now'), ctx);
check('an advert is set aside', promo.level === 'low' && promo.kind === 'promotion');
check('...with the reason kept', /sales language/.test(promo.reasons.join(' ')));

// ! a coin they hold appearing in a shotgun post is not attention, it is being used as a hashtag.
const shotgun = imp.classify(p('$CATE $DOGE $PEPE $BONK $WIF all pumping today'), ctx);
check('a post name-dropping five coins is noise, even naming theirs', shotgun.level === 'low', `-> ${shotgun.level} ${shotgun.kind}`);
check('...and says how many it named', /name-drops 5/.test(shotgun.reasons.join(' ')));

const botPost = imp.classify(p('$QUAKE volume rising', { author: { declaredAutomated: true, automatedBy: 'bot' } }), ctx);
check('a bot is not counted as a person with an opinion', botPost.level === 'low');
check('...and X\'s own label is quoted', /labels automated/.test(botPost.reasons.join(' ')));

// Reach without reaction is promotion wearing a big number (D-25).
const pushed = imp.classify(p('$QUAKE is the one', { views: 50000, engagementRate: 0.0002 }), ctx);
check('many views with no replies is downgraded', pushed.level === 'low');
check('...in plain words', /pushed rather than shared/.test(pushed.reasons.join(' ')));

// --- the middle ---------------------------------------------------------------
check('a coin the scanner found is background, not headline',
  imp.classify(p('$QUAKE looks interesting'), ctx).level === 'med');
check('talk about the sector generally is background',
  imp.classify(p('memecoin volume has completely dried up this week'), ctx).level === 'med');
check('an unrelated post is set aside',
  imp.classify(p('good morning everyone'), ctx).level === 'low');

// ! a held coin discussed promotionally must still surface -- labelled, not hidden.
const heldPromo = imp.classify(p('$CATE next 100x dont miss out'), ctx);
check('an advert for a coin they hold still reaches them', heldPromo.level === 'high');
check('...and is marked as promotional', heldPromo.promo === true);

// --- the split ----------------------------------------------------------------
const sweep = [p('$CATE looking weak'), p('next 1000x gem ape in'), p('$QUAKE volume up'),
               p('$OTHER rugged, cant sell'), p('gm')];
const r = imp.rank(sweep, ctx);
check('the sweep is split three ways', r.important.length === 2 && r.background.length === 1 && r.setAside.length === 2,
  `-> ${r.important.length}/${r.background.length}/${r.setAside.length}`);
check('nothing is thrown away', r.important.length + r.background.length + r.setAside.length === r.total);
// ! D-26: what was filtered is itself a reading on the market.
check('the share that was advertising is reported', r.promoShare > 0, `-> ${r.promoShare}`);
check('every set-aside post carries its reason', r.setAside.every((x) => x.reasons.length > 0));

// --- one sweep serves every coin ----------------------------------------------
// The point of the broad sweep: cost stops scaling with how many coins they watch.
const forCate = imp.postsFor(sweep, CATE);
check('posts for one coin are pulled out of the shared sweep', forCate.length === 1);
check('a coin nobody mentioned gets nothing, not a fabricated zero-post score',
  imp.postsFor(sweep, { sym: 'ZZZZ', ca: 'nope' }).length === 0);

// --- the resolver reaching the filter -----------------------------------------
// Before this, attribution was an exact $TICKER match here, so every one of these was missed.
check('a post writing the ticker without a $ still reaches them',
  imp.classify(p('CATE chart looks weak, thinking about selling'), ctx).level === 'high');
check('...and admits it was a judgement call',
  /judgement call/.test(imp.classify(p('CATE chart looks weak, selling'), ctx).reasons.join(' ')));
check('a shortened address reaches them too',
  imp.classify(p('aped Ai66LH...ppump'), ctx).about.length === 1);
// ! and the false positive that makes this dangerous stays blocked.
check('an ordinary sentence containing the word is still ignored',
  imp.classify(p('my cate is a lovely cat'), ctx).about.length === 0);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
