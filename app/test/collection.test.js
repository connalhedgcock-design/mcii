const fs = require('fs');
const os = require('os');
const path = require('path');
const c = require(path.join(process.cwd(), 'shared/collection.js'));
let pass = 0, fail = 0;
const check = (n, cond, x = '') => { if (cond) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

const HOUR = 36e5;
const NOW = 1787932966842;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcii-collection-'));
const write = (name, rows) => fs.writeFileSync(path.join(dir, name),
  rows.map((r) => JSON.stringify(r)).join('\n') + '\n');

// Nothing recorded at all must not read as healthy.
check('an empty record is not called fine', c.health(dir, NOW).state === 'unknown');

// A record written within the hour is fine.
write('market.jsonl', [{ ts: NOW - 20 * 60000, ca: 'x' }]);
check('a record written 20 minutes ago is fine', c.health(dir, NOW).state === 'ok');

// The newest moment across ALL files counts, not the newest in any one file. A stale market file
// beside a fresh social one means collection is running.
write('market.jsonl', [{ ts: NOW - 30 * HOUR, ca: 'x' }]);
write('social.jsonl', [{ ts: NOW - 10 * 60000, ca: 'x' }]);
check('the newest entry in any file counts', c.health(dir, NOW).state === 'ok');
fs.unlinkSync(path.join(dir, 'social.jsonl'));

// One missed hour is a delay, not a failure. GitHub queues scheduled runs and drops them under load.
write('market.jsonl', [{ ts: NOW - 3 * HOUR, ca: 'x' }]);
check('three hours quiet reads as late, not stalled', c.health(dir, NOW).state === 'late');

// The real event: 27 hours, four entries, and the app said nothing.
write('market.jsonl', [{ ts: NOW - 27 * HOUR, ca: 'x' }]);
const dead = c.health(dir, NOW);
check('a job that stopped a day ago is called stalled', dead.state === 'stalled');
check('...and says how many updates were missed', dead.missed === 26, `-> ${dead.missed}`);
check('...in plain words, with no jargon',
  /[0-9]+ hourly updates missed/.test(dead.detail) && !/cron|workflow|collector|pipeline/i.test(dead.headline + dead.detail));

// A row stamped in the future must not hide a stopped job behind a timestamp that never ages.
write('market.jsonl', [{ ts: NOW - 27 * HOUR, ca: 'x' }, { ts: NOW + 50 * HOUR, ca: 'x' }]);
check('a future-dated row cannot mask a stalled job', c.health(dir, NOW).state === 'stalled');

// holder-truth.json carries checkedAt rather than ts and must still count as a write.
fs.writeFileSync(path.join(dir, 'holder-truth.json'), JSON.stringify({ checkedAt: NOW - 5 * 60000 }));
check('the holder file counts as a write too', c.health(dir, NOW).state === 'ok');

// A directory that does not exist is unknown, never fine.
check('a missing record folder is not called fine', c.health(path.join(dir, 'nope'), NOW).state === 'unknown');

fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
