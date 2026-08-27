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
for (const [id, tok] of cases) {
  const out = alerts.evaluate(tok, null);
  const hit = out.find((a) => a.id === id);
  if (hit) { pass++; console.log(`  PASS  ${id}\n        "${hit.title}"\n        ${hit.detail.slice(0,120)}`); }
  else { fail++; console.log(`  FAIL  ${id} did not fire`); }
}

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
