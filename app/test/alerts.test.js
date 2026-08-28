const path = require('path');
const alerts = require(path.join(process.cwd(), 'main/alerts.js'));

const base = { ca: 'TEST', sym: 'TEST', gate: { verdict: 'PASS', findings: [] },
  market: { priceUsd: 0.001 }, exit: { usd: 5000 }, position: null, trend: {} };

const cases = [
  ['exit-drop', { ...base, trend: { exitUsd: { from: 10000, to: 5000, pct: -50, spanHours: 72, n: 9 } } }],
  ['liq-drain', { ...base, trend: { liq: { from: 200000, to: 120000, pct: -40, spanHours: 48, n: 8 } } }],
  ['holders-falling', { ...base, trend: { holders: { from: 20000, to: 18000, pct: -10, spanHours: 30, n: 6 } } }],
  ['concentrating', { ...base, trend: { top10: { from: 20, to: 26, pct: 30, spanHours: 40, n: 6 } } }],
  ['position-exceeds-exit', { ...base, position: { tokens: 20000000 }, exit: { usd: 5000 },
                              market: { priceUsd: 0.001 } }],
];

let pass = 0, fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${x ? '  ' + x : ''}`); }
  else { fail++; console.log(`  FAIL  ${n}${x ? '  ' + x : ''}`); }
};
for (const [id, tok] of cases) {
  const out = alerts.evaluate(tok, null);
  const hit = out.find((a) => a.id === id);
  if (hit) { pass++; console.log(`  PASS  ${id}\n        "${hit.title}"\n        ${hit.detail.slice(0,120)}`); }
  else { fail++; console.log(`  FAIL  ${id} did not fire`); }
}

// Holder moves, measured on chain rather than from a vendor index.
const exodus = alerts.evaluate({ ...base, holderTruth: { changePct: -22, hours: 1, from: 116155, to: 90600 } }, null);
check('a real holder exodus fires', exodus.some((a) => a.id === 'holders-exodus'),
  exodus[0] ? `"${exodus[0].title}"` : '');
const surge = alerts.evaluate({ ...base, holderTruth: { changePct: 60, hours: 1, from: 5839, to: 9342 } }, null);
check('a holder surge fires as MEDIUM, not as good news', surge.some((a) => a.id === 'holders-surge' && a.severity === 'MED'));
check('...and says airdrops look identical', /airdrop/i.test(surge.find((a) => a.id === 'holders-surge').detail));
const normal = alerts.evaluate({ ...base, holderTruth: { changePct: 1.4, hours: 1, from: 116155, to: 117781 } }, null);
check('ordinary hourly drift fires nothing', normal.length === 0, `(${normal.length} alerts)`);

// safety-flip needs a previous gate
const flip = alerts.evaluate({ ...base, gate: { verdict: 'FAIL', findings: [{ detail: 'Supply is not fixed.' }] } },
                             { verdict: 'PASS' });
if (flip.find((a) => a.id === 'safety-flip')) { pass++; console.log(`  PASS  safety-flip\n        "${flip[0].title}"`); }
else { fail++; console.log('  FAIL  safety-flip did not fire'); }

// negative control: healthy token must produce nothing
const quiet = alerts.evaluate({ ...base, trend: { exitUsd: { from: 5000, to: 5200, pct: 4, spanHours: 48, n: 5 } } }, { verdict: 'PASS' });
if (quiet.length === 0) { pass++; console.log('  PASS  negative control (healthy token stays silent)'); }
else { fail++; console.log('  FAIL  fired on a healthy token:', quiet.map(a=>a.id)); }

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
