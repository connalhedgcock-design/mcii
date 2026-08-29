const path = require('path');
const pf = require(path.join(process.cwd(), 'main/portfolio.js'));
const wallet = require(path.join(process.cwd(), 'main/adapters/wallet.js'));

let pass = 0, fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${x ? '  ' + x : ''}`); }
  else { fail++; console.log(`  FAIL  ${n}${x ? '  ' + x : ''}`); }
};

// An address is the only thing this feature ever accepts. Nothing that looks like a key or a
// seed phrase should get as far as a network call.
check('a real address validates', wallet.isAddress('Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump'));
check('junk does not', !wallet.isAddress('not-an-address'));
check('empty does not', !wallet.isAddress(''));
check('a 12-word phrase is not an address',
  !wallet.isAddress('legal winner thank year wave sausage worth useful legal winner thank yellow'));

const p = (venue, ca, sym, tokens, valueUsd) => ({ venue, ca, sym, tokens, valueUsd, costBasisUsd: null });

// The same coin held on two venues is ONE exposure. A combined view that listed it twice would
// understate concentration precisely when concentration is the thing worth knowing.
const combined = pf.combine([
  { venue: 'fomo',  positions: [p('fomo', 'MINT_A', 'CATE', 1000, 6000), p('fomo', 'MINT_B', 'NEEGY', 500, 1000)] },
  { venue: 'axiom', positions: [p('axiom', 'MINT_A', 'CATE', 500, 3000)] },
]);
check('the same mint across venues merges into one line',
  combined.positions.length === 2, `(${combined.positions.map((x) => x.sym).join(', ')})`);
const cate = combined.positions.find((x) => x.sym === 'CATE');
check('...and its size is the sum of both', cate.tokens === 1500 && cate.valueUsd === 9000);
check('...while still saying where it lives',
  cate.byVenue.fomo === 1000 && cate.byVenue.axiom === 500, JSON.stringify(cate.byVenue));
check('concentration is measured across the whole book, not per venue',
  Math.round(combined.topWeightPct) === 90, `${combined.topWeightPct.toFixed(1)}%`);

// A venue that failed to load is not a venue holding nothing.
const withFailure = pf.combine([
  { venue: 'fomo', positions: [p('fomo', 'MINT_A', 'CATE', 1000, 6000)] },
  { venue: 'axiom', error: 'rpc rejected', positions: [] },
]);
check('a failed venue is counted as failed, not as empty',
  withFailure.venuesCounted === 1 && withFailure.venuesFailed === 1);
check('...and does not drag the total to zero', withFailure.totalUsd === 6000);

// Cost basis is unknown unless someone entered it. Zero would read as "free", which is a
// different and false claim.
check('unknown cost basis stays null, never 0', cate.costBasisUsd === null);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
