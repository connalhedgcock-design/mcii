#!/usr/bin/env node
// Scheduled market scanner. Runs independently of the app window.
//
// Every scan is stored, because the useful signal is the difference between scans rather than
// anything visible in one. Five minutes is chosen to give enough observations per hour for a
// growth rate to mean something, while staying far inside the free rate limits measured on
// 2026-08-26 (DexScreener sustained 10 calls/sec; a full scan is ~75 calls).
const path = require('path');
const screener = require('./screener');
const store = require('./scanstore');

const USERDATA = process.env.MCII_USERDATA ||
  path.join(process.env.HOME, 'Library/Application Support/mcii');
const INTERVAL_MIN = Number(process.env.MCII_SCAN_MIN || 5);

const log = (...a) => console.log(new Date().toISOString().slice(0, 19).replace('T', ' '), ...a);

let n = 0;
async function scanOnce() {
  n++;
  try {
    const r = await screener.run({ limit: 60 });
    const saved = store.record(r);
    log(`scan ${n}: ${r.summary}  (${(r.tookMs / 1000).toFixed(0)}s, ${saved} recorded)`);

    const ris = store.risers();
    const acc = ris.filter((x) => x.accumulating);
    if (acc.length) {
      log(`  accumulating (people arriving faster than price moving):`);
      for (const a of acc.slice(0, 5))
        log(`    ${a.sym.padEnd(10)} holders +${a.holderGrowth}%  liquidity +${a.liqGrowth}%  price ${a.priceGrowth >= 0 ? '+' : ''}${a.priceGrowth}%  over ${a.spanHours}h / ${a.scans} scans`);
    } else if (ris.length) {
      log(`  ${ris.length} tokens tracked across scans, none showing accumulation yet`);
    }
    if (n % 12 === 0) log(`  pruned to ${store.prune()} observations`);
  } catch (e) {
    // A failed scan is a missing observation, never a zero one. Nothing is recorded.
    log(`scan ${n} failed: ${e.message}`);
  }
}

store.init(USERDATA);
log(`scanner starting — every ${INTERVAL_MIN}m, storing every scan`);
scanOnce();
setInterval(scanOnce, INTERVAL_MIN * 60000);
