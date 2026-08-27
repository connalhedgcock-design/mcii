const path = require('path');
const { score } = require(path.join(process.cwd(), 'shared/sentiment.js'));
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${extra ? '  ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? '  ' + extra : ''}`); }
};
const s = (t) => score(t).score;

check('plain bullish reads positive', s('this is going to moon 🚀 so bullish') > 0.7);
check('rug language reads strongly negative', s('dev sold, total rug. everyone get out') < -0.8);
check('negation flips the sign', s('not bullish at all honestly') < 0);
check('honeypot language reads negative', s('CANT SELL honeypot AVOID') < -0.8);
check('hedged praise scores lower than plain praise', s('slightly bullish maybe') < s('bullish'));
check('a question asserts less than a statement', Math.abs(s('is this a rug?')) < Math.abs(s('this is a rug')));
check('off-topic text is unscored, not neutral', score('the weather is nice today').scored === false);
check('unscored text returns zero magnitude', score('the weather is nice today').magnitude === 0);
check('score is explainable', score('rug').hits.length > 0, `-> ${JSON.stringify(score('rug').hits[0])}`);
check('score stays inside [-1,1]', Math.abs(s('moon moon moon bullish gains profit 🚀🚀🚀')) <= 1);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
