const path = require('path'), fs = require('fs'), os = require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcii-j-'));
const j = require(path.join(process.cwd(), 'main/journal.js'));
j.init(tmp);
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

const cal0 = j.calibration();
check('no forecasts: refuses to score', cal0.brier === null && cal0.n === 0);
check('...and says why', /needs about 50/.test(cal0.verdict));

j.addForecast({ question: 'CATE above $0.05 on 2026-09-15?', prob: 70, resolveBy: '2026-09-15', marketImplied: 55 });
const f2 = j.addForecast({ question: 'NEEGY liquidity above $100k on 2026-09-01?', prob: 30, resolveBy: '2026-09-01' });
check('forecasts stored', j.readForecasts().length === 2);
check('unresolved forecasts do not count', j.calibration().n === 0);

j.resolveForecast(f2.id, false, 'liquidity drained faster than expected');
const r = j.readForecasts().find((x) => x.id === f2.id);
check('resolving computes Brier', r.brier === 0.09, `(said 30%, did not happen -> ${r.brier})`);
check('lesson recorded', r.lesson.length > 0);

const cal = j.calibration();
check('n=1 refuses to draw a conclusion', /Too few/.test(cal.verdict), `(n=${cal.n})`);

// Fill to 50 with deliberately terrible forecasts: the verdict must say so plainly.
for (let i = 0; i < 49; i++) {
  const f = j.addForecast({ question: `q${i}`, prob: 90, resolveBy: '2026-09-01' });
  j.resolveForecast(f.id, false, '');
}
const bad = j.calibration();
check('50 bad forecasts: reports no demonstrated edge', /no demonstrated edge/.test(bad.verdict), `(brier ${bad.brier})`);
check('...and does not soften it', !/but|however|still/i.test(bad.verdict));

// Regression: ids must be unique even when created in the same millisecond.
const burst = Array.from({ length: 200 }, (_, i) => j.addForecast({ question: 'burst' + i, prob: 50, resolveBy: '2026-12-01' }));
check('200 forecasts created in a tight loop all have unique ids',
  new Set(burst.map((b) => b.id)).size === 200, `(${new Set(burst.map(b=>b.id)).size} unique)`);
const rr = j.resolveForecast(burst[7].id, true, 'x');
check('resolving hits the intended forecast', rr.ok && rr.forecast.question === 'burst7', `(got ${rr.forecast && rr.forecast.question})`);
check('double-resolving is refused', j.resolveForecast(burst[7].id, false, '').ok === false);

const t = j.saveThesis({ sym: 'CATE', ca: 'Ai66x', claim: 'community is growing', mechanism: 'exchange listing',
  confidence: 60, sizePct: 5, antithesis: 'liquidity is thin\nprice already ran', invalidation: 'liquidity under $1M' });
check('thesis written to vault markdown', fs.existsSync(t.file));
const listed = j.listTheses();
check('thesis readable back', listed.length === 1 && listed[0].claim === 'community is growing');
check('invalidation trigger preserved', listed[0].invalidation === 'liquidity under $1M');

console.log(`\n  ${pass} passed, ${fail} failed`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
