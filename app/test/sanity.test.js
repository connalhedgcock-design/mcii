const path = require('path');
const s = require(path.join(process.cwd(), 'shared/sanity.js'));
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

// The exact event that prompted this file.
const real = s.checkDelta('holders', 252968, 7522, 0.01);
check('the CATE index reset is rejected', real.ok === false, `-> ${real.reason.slice(0, 60)}…`);
check('normal holder growth is accepted', s.checkDelta('holders', 20000, 20400, 1).ok === true);
check('a plausible sell-off is accepted', s.checkDelta('holders', 20000, 17000, 4).ok === true, '(-15% over 4h)');
check('an implausible one is rejected', s.checkDelta('holders', 20000, 2000, 0.25).ok === false, '(-90% in 15min)');

// Liquidity must NEVER be suppressed -- a rug looks exactly like a broken feed and we must
// always err toward showing it.
check('a liquidity collapse is NOT filtered', s.checkDelta('liq', 500000, 1000, 0.01).ok === true,
  '(this is what a rug looks like)');

const cc = s.crossCheck('holders', { rugcheck: 24783, jupiter: 116181 });
check('sources disagreeing 4.7x is flagged', cc.ok === false, `-> ${cc.ratio}x`);
check('...and neither is presented as fact', cc.agreed === undefined || cc.agreed === null);
check('close sources are accepted and averaged', s.crossCheck('holders', { a: 20000, b: 21000 }).agreed === 20500);
check('a single source passes but is marked as single', s.crossCheck('holders', { a: 20000 }).single === 20000);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
