const path = require('path');
const h = require(path.join(process.cwd(), 'shared/hype.js'));
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

const TOK = { sym: 'NEEGY', ca: '6oGuFDbEeaSzTcvrmmd2MqfNYwHKXFoN7regcR22pump' };
const real = { text: 'solana:6oGuFDbEeaSzTcvrmmd2MqfNYwHKXFoN7regcR22pump looks primed?' };
const onTag = { text: '$NEEGY holding up well today, decent volume' };
const spam = { text: 'Cyberleek season warming 🔥 $CYBERLEEK airdrop is live. 6oGuFDbEeaSzTcvrmmd2MqfNYwHKXFoN7regcR22pump' };
const shotgun = { text: 'top plays: $BONK $WIF $POPCAT $NEEGY 6oGuFDbEeaSzTcvrmmd2MqfNYwHKXFoN7regcR22pump' };

check('a genuine post about the address is kept', h.offTopic(real, TOK).off === false);
check('a genuine post using the cashtag is kept', h.offTopic(onTag, TOK).off === false);
check('an airdrop pitch for another token is filtered', h.offTopic(spam, TOK).off === true, `-> ${h.offTopic(spam, TOK).reason}`);
check('a shotgun list of many tickers is filtered', h.offTopic(shotgun, TOK).off === true, `-> ${h.offTopic(shotgun, TOK).reason}`);

const p = h.partition([real, onTag, spam, shotgun], TOK);
check('partition keeps the two real posts', p.onTopic.length === 2);
check('partition isolates the two spam posts', p.noise.length === 2);
check('noise ratio is reported', p.noiseRatio === 0.5, `(${p.noiseRatio})`);
check('filtered posts carry a reason', !!p.noise[0].offTopicReason);
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
