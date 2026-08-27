const path = require('path'), fs = require('fs'), os = require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcii-scan-'));
const store = require(path.join(process.cwd(), 'main/scanstore.js'));
store.init(tmp);

let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

const now = Date.now();
// Six scans over three hours. Three archetypes:
//   ACCUM  - holders and liquidity climbing, price flat        <- what we want to surface
//   PUMPED - price already exploded, holders flat              <- what every trending list shows
//   FLAT   - nothing happening
const mk = (i) => ({
  scannedAt: now - (6 - i) * 30 * 60000, tookMs: 40000, universe: 60,
  rejectedStage1: [], rejectedStage2: [],
  survivors: [
    { ca: 'ACCUM', symbol: 'ACCUM', name: 'Accumulating', via: 'trending',
      priceUsd: 0.001 * (1 + i * 0.015), marketCap: 500000, liquidityUsd: 50000 * (1 + i * 0.10),
      volume24h: 300000, txns24h: 900, ageHours: 30 + i,
      change24h: 4, safety: { totalHolders: Math.round(2000 * (1 + i * 0.09)), top1Pct: 4 },
      gate: { verdict: 'PASS', findings: [] } },
    { ca: 'PUMPED', symbol: 'PUMPED', name: 'Already Ran', via: 'trending',
      priceUsd: 0.01 * (1 + i * 0.9), marketCap: 9000000, liquidityUsd: 200000,
      volume24h: 8000000, txns24h: 40000, ageHours: 20 + i,
      change24h: 700, safety: { totalHolders: 15000, top1Pct: 6 },
      gate: { verdict: 'PASS', findings: [] } },
    { ca: 'FLAT', symbol: 'FLAT', name: 'Nothing Doing', via: 'promoted',
      priceUsd: 0.005, marketCap: 700000, liquidityUsd: 60000,
      volume24h: 90000, txns24h: 300, ageHours: 100 + i,
      change24h: 0.2, safety: { totalHolders: 3000, top1Pct: 5 },
      gate: { verdict: 'PASS', findings: [] } },
  ],
});
for (let i = 0; i < 6; i++) store.record(mk(i));

const obs = store.readObs();
check('all observations recorded', obs.length === 18, `(${obs.length})`);
const traj = store.trajectories(6 * 36e5);
check('grouped into three tokens', traj.size === 3, `(${traj.size})`);
check('each has six scans', [...traj.values()].every((a) => a.length === 6));

const r = store.risers({ minScans: 4, windowMs: 6 * 36e5 });
const acc = r.find((x) => x.ca === 'ACCUM');
const pump = r.find((x) => x.ca === 'PUMPED');
const flat = r.find((x) => x.ca === 'FLAT');

check('ACCUM is flagged as accumulating', acc && acc.accumulating === true,
  acc ? `holders +${acc.holderGrowth}% liq +${acc.liqGrowth}% price +${acc.priceGrowth}%` : '');
check('PUMPED is NOT flagged (price already ran)', pump && pump.accumulating === false,
  pump ? `price +${pump.priceGrowth}%` : '');
check('FLAT is NOT flagged (nothing growing)', flat && flat.accumulating === false);
check('ACCUM ranks first', r[0].ca === 'ACCUM', `(order: ${r.map(x=>x.ca).join(', ')})`);
check('PUMPED scores zero', pump.score === 0);

// A token seen once cannot produce a growth rate and must not be guessed at.
store.record({ scannedAt: now, tookMs: 1, universe: 1, rejectedStage1: [], rejectedStage2: [],
  survivors: [{ ca: 'ONCE', symbol: 'ONCE', name: 'Seen Once', via: 'new listing',
    priceUsd: 1, marketCap: 1, liquidityUsd: 1, volume24h: 1, txns24h: 1, ageHours: 5,
    change24h: 900, safety: { totalHolders: 10, top1Pct: 1 }, gate: { verdict: 'PASS', findings: [] } }] });
check('a token seen once is excluded, not guessed', !store.risers({ minScans: 4 }).some((x) => x.ca === 'ONCE'));

console.log(`\n  ${pass} passed, ${fail} failed`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
