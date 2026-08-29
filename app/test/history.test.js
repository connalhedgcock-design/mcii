const path = require('path');
const os = require('os');
const fs = require('fs');
const history = require(path.join(process.cwd(), 'main/history.js'));

let pass = 0, fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${x ? '  ' + x : ''}`); }
  else { fail++; console.log(`  FAIL  ${n}${x ? '  ' + x : ''}`); }
};

// 2026-08-28: RugCheck's "totalHolders" (token accounts, incl. empty) was renamed away from
// "holders" once the real meaning -- accounts with a balance -- was established on chain. A row
// recorded before that fix and a row recorded after it are not the same quantity, even though
// both are stamped `holders` in the jsonl. Reproduces the exact incident reported live: CATE
// read 252,283 (token accounts, pre-fix) then 116,808 (real holders, post-fix) 38 hours apart,
// and the trend code reported a fabricated "-53.7%, people are leaving" that never happened.
function withTmpHistory(rows, fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcii-history-test-'));
  history.init(tmp, null);
  const dir = path.join(tmp, 'history');
  fs.writeFileSync(path.join(dir, 'TEST.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  try { fn(); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

withTmpHistory([
  { ts: 1787836227800, holders: 252283 },  // pre-fix: token accounts, not holders
  { ts: 1787836880335, holders: 252301 },  // pre-fix: same
  { ts: 1787939753370, holders: 116808 },  // post-fix: real holders (the accurate reading)
], () => {
  const d = history.delta('TEST', 'holders', 7 * 864e5);
  check('spanning the redefinition never fabricates a drop', d === null, `(got ${JSON.stringify(d)})`);
  const s = history.series('TEST', 'holders', 7 * 864e5);
  check('series() also drops the pre-fix reading', s.length === 1 && s[0].v === 116808, `(${JSON.stringify(s)})`);
});

withTmpHistory([
  { ts: 1787939753370, holders: 116808 },   // both readings post-fix: a real trend is still detected
  { ts: 1787950000000, holders: 110000 },
], () => {
  const d = history.delta('TEST', 'holders', 7 * 864e5);
  check('a genuine post-fix trend still fires', d && d.from === 116808 && d.to === 110000, `(got ${JSON.stringify(d)})`);
});

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
