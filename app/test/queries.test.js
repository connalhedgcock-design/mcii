const path = require('path');
const tw = require(path.join(process.cwd(), 'main/adapters/twitterapi.js'));
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

// The bug that poisoned the first live run: `sym` vs `symbol`.
const a = tw.queriesFor({ sym: 'CATE', ca: 'ABC123' });
check('accepts sym', a.some(q => q.q === '$CATE'), JSON.stringify(a.map(q=>q.q)));
const b = tw.queriesFor({ symbol: 'CATE', ca: 'ABC123' });
check('accepts symbol', b.some(q => q.q === '$CATE'));
const c = tw.queriesFor({ ca: 'ABC123' });
check('missing symbol drops the cashtag query entirely', c.length === 1 && c[0].kind === 'address', JSON.stringify(c.map(q=>q.q)));
check('NEVER builds a $undefined query', !c.some(q => /undefined/i.test(q.q)));
const d = tw.queriesFor({ sym: 'undefined', ca: 'ABC123' });
check('rejects the literal string "undefined" as a symbol', !d.some(q => /undefined/i.test(q.q)));
let threw = false; try { tw.queriesFor({ sym: 'X' }); } catch { threw = true; }
check('throws when no contract address is given', threw);
check('address query is weighted above cashtag', a.find(q=>q.kind==='address').weight > a.find(q=>q.kind==='cashtag').weight);
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
