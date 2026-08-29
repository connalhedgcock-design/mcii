const path = require('path'), fs = require('fs'), os = require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcii-j-'));
const j = require(path.join(process.cwd(), 'main/journal.js'));
j.init(tmp);
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

const cal0 = j.calibration('connal');
check('no forecasts: refuses to score', cal0.brier === null && cal0.n === 0);
check('...and says why', /needs about 50/.test(cal0.verdict));

j.addForecast({ owner:'connal', question: 'CATE above $0.05 on 2026-09-15?', prob: 70, resolveBy: '2026-09-15', marketImplied: 55 });
const f2 = j.addForecast({ owner:'connal', question: 'NEEGY liquidity above $100k on 2026-09-01?', prob: 30, resolveBy: '2026-09-01' });
check('forecasts stored', j.readForecasts('connal').length === 2);
check('unresolved forecasts do not count', j.calibration('connal').n === 0);

j.resolveForecast(f2.id, false, 'liquidity drained faster than expected');
const r = j.readForecasts('connal').find((x) => x.id === f2.id);
check('resolving computes Brier', r.brier === 0.09, `(said 30%, did not happen -> ${r.brier})`);
check('lesson recorded', r.lesson.length > 0);

const cal = j.calibration('connal');
check('n=1 refuses to draw a conclusion', /Too few/.test(cal.verdict), `(n=${cal.n})`);

// Fill to 50 with deliberately terrible forecasts: the verdict must say so plainly.
for (let i = 0; i < 49; i++) {
  const f = j.addForecast({ owner:'connal', question: `q${i}`, prob: 90, resolveBy: '2026-09-01' });
  j.resolveForecast(f.id, false, '');
}
const bad = j.calibration('connal');
check('50 bad forecasts: reports no demonstrated edge', /no demonstrated edge/.test(bad.verdict), `(brier ${bad.brier})`);
check('...and does not soften it', !/but|however|still/i.test(bad.verdict));

// Regression: ids must be unique even when created in the same millisecond.
const burst = Array.from({ length: 200 }, (_, i) => j.addForecast({ owner:'connal', question: 'burst' + i, prob: 50, resolveBy: '2026-12-01' }));
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

// --- two people ------------------------------------------------------------
// The reason this matters: a blended Brier describes neither forecaster.
const a1 = j.addForecast({ owner: 'austin', question: 'austin q1', prob: 80, resolveBy: '2026-09-01' });
const a2 = j.addForecast({ owner: 'austin', question: 'austin q2', prob: 20, resolveBy: '2026-09-01' });
j.resolveForecast(a1.id, true);   // 80% and it happened -> good
j.resolveForecast(a2.id, false);  // 20% and it didn't  -> good

check('each person gets their own file', j.owners().sort().join(',') === 'austin,connal', `(${j.owners().sort().join(',')})`);
const ca = j.calibration('austin'), cc = j.calibration('connal');
check("austin's score counts only austin's forecasts", ca.n === 2, `(n=${ca.n})`);
check("connal's score is unaffected by austin", cc.n === 51, `(n=${cc.n})`);
check('a good forecaster scores well', ca.brier < 0.1, `(austin ${ca.brier})`);
check('a bad forecaster scores badly', cc.brier > 0.25, `(connal ${cc.brier})`);
check('the two are not averaged together', ca.brier !== cc.brier);
check('calibration without an owner refuses to score', j.calibration().brier === null);
check('...and explains why', /describes neither/.test(j.calibration().verdict));
check('resolving finds the right file without being told the owner',
  j.resolveForecast(j.addForecast({ owner: 'austin', question: 'a3', prob: 50, resolveBy: '2026-09-02' }).id, true).ok === true);

// --- open journal ------------------------------------------------------------
check('no notes yet', j.readNotes('connal').length === 0);
const n1 = j.addNote({ owner: 'connal', text: 'watching CATE liquidity, feels thin today' });
check('note saved', n1.ok && n1.note.text.length > 0);
check('empty note refused', j.addNote({ owner: 'connal', text: '   ' }).ok === false);
j.addNote({ owner: 'connal', text: 'second thought' });
j.addNote({ owner: 'austin', text: 'austin thinking out loud' });
const cn = j.readNotes('connal');
check('notes read back for connal', cn.length === 2);
check('newest first', cn[0].text === 'second thought');
check("austin's notes stay in austin's own file",
  j.readNotes('austin').length === 1 && j.readNotes('austin')[0].text === 'austin thinking out loud');
check("connal's notes are unaffected by austin's", j.readNotes('connal').length === 2);

console.log(`\n  ${pass} passed, ${fail} failed`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
