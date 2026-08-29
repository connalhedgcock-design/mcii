const path = require('path');
const os = require('os');
const fs = require('fs');
const history = require(path.join(process.cwd(), 'main/history.js'));

let pass = 0, fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${x ? '  ' + x : ''}`); }
  else { fail++; console.log(`  FAIL  ${n}${x ? '  ' + x : ''}`); }
};

// 2026-08-29: a vendor "holders" reading has been wrong before in ways no single-row check
// catches -- RugCheck's index once meant token accounts, not holders, and separately re-scanned
// itself from zero (see 50-LOG/2026-08-28-data-integrity.md). The first fix for this used a git
// commit timestamp as a cutoff, and it failed within the hour: the operator's own machine kept
// running the OLD code for several minutes after the fix landed and kept writing the contaminated
// value with timestamps AFTER the cutoff. Reproduces that exact failure and the real fix: bound
// every 'holders' reading against on-chain ground truth (holders-onchain.jsonl) instead of a date.
function withTmpRepo(localRows, truthRows, fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcii-history-test-'));
  const repo = path.join(tmp, 'repo');
  const data = path.join(repo, 'data');
  fs.mkdirSync(data, { recursive: true });
  history.init(tmp, repo);
  fs.writeFileSync(path.join(tmp, 'history', 'TEST.jsonl'),
    localRows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  if (truthRows.length) {
    fs.writeFileSync(path.join(data, 'holders-onchain.jsonl'),
      truthRows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  }
  try { fn(); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// The exact incident: a contaminated reading (token accounts, not holders) written AFTER the
// commit that was supposed to have fixed this, sitting between two genuine ground-truth checks.
withTmpRepo(
  [
    { ts: 1787932655600, holders: 258820, ca: 'TEST' },  // contaminated, but timestamped post-fix
    { ts: 1787932941019, holders: 258820, ca: 'TEST' },  // same -- the running process hadn't reloaded
    { ts: 1787976447816, holders: 116770, ca: 'TEST' },  // genuine, current reading
  ],
  [
    { ts: 1787932975539, ca: 'TEST', holders: 116145 },  // on-chain ground truth, close in time
    { ts: 1787976000000, ca: 'TEST', holders: 116700 },
  ],
  () => {
    const d = history.delta('TEST', 'holders', 30 * 864e5);
    check('a contaminated reading timestamped after the fix never fabricates a drop',
      d === null, `(got ${JSON.stringify(d)} -- with the two bad rows excluded, only one genuine row is left)`);
    const s = history.series('TEST', 'holders', 30 * 864e5);
    check('series() drops the contaminated rows regardless of their timestamp',
      s.length === 1 && s[0].v === 116770, `(${JSON.stringify(s)})`);
  }
);

// No ground truth yet for this token -- must not block trend detection outright.
withTmpRepo(
  [
    { ts: 1787939753370, holders: 116808, ca: 'TEST' },
    { ts: 1787950000000, holders: 110000, ca: 'TEST' },
  ],
  [],
  () => {
    const d = history.delta('TEST', 'holders', 7 * 864e5);
    check('with no ground truth yet, a genuine trend still fires',
      d && d.from === 116808 && d.to === 110000, `(got ${JSON.stringify(d)})`);
  }
);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
