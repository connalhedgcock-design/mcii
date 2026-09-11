#!/usr/bin/env node
// Long-running, standalone: checks Connal's followed traders' wallets on-chain every 90 seconds,
// separately from the rest of collection (`cloud-collect.js`, still every 30 minutes -- the paid
// Twitter/social pieces stay on that slower clock; this is free, so it doesn't have to).
//
// Split out of `cloud-collect.js` on Connal's request, 09-09: he wants trader-wallet checks near-
// real-time. D-130 measured a full 45-wallet pass at 61.7s, ~3% of the old 30-minute budget --
// real headroom. What is NOT yet measured: this file's own falsifier, sustained back-to-back runs
// every 90s rather than one single burst. If the free RPC starts throttling or erroring under
// that, `walletwatch.js`'s existing per-wallet error tolerance (D-29: one wallet's failure is
// skipped, never invented as "no activity") means a rough patch degrades gracefully rather than
// crashing the process -- but it should still be watched, not assumed fine.
//
// Same logic `cloud-collect.js`'s old "wallet watch:" step ran once per its own 30-minute cycle --
// moved here verbatim, just on its own clock. Never run alongside that block in cloud-collect.js
// again: same double-collection risk D-98 already flagged for running two copies of one collector.
const fs = require('fs');
const path = require('path');
const REPO = path.join(__dirname, '..', '..');
const DATA = path.join(REPO, 'data');
const INTERVAL_MS = 90 * 1000;

const walletwatch = require('./adapters/walletwatch');
const signalstore = require('./signalstore');
// Reused, not reinvented -- T-035's 2h/90s price recorder, previously wired only to
// `fomonotifications.js` (a trigger that has never once fired on this Mac, D-129). Every real
// on-chain buy signal now starts the same recorder, giving `shared/traderstats.js` something
// real to resolve a followed trader's buy against. See that file's header for the full reasoning.
const pumpcapture = require('./pumpcapture');
pumpcapture.init(REPO);

const log = (...a) => console.log(new Date().toISOString().slice(0, 19).replace('T', ' '), ...a);
const append = (file, rows) => {
  if (!rows || !rows.length) return;
  fs.mkdirSync(DATA, { recursive: true });
  fs.appendFileSync(path.join(DATA, file), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
};
function loadFollowedWallets() {
  try {
    const doc = JSON.parse(fs.readFileSync(path.join(DATA, 'fomo-followed-wallets.json'), 'utf8'));
    return doc.wallets || [];
  } catch { return []; }
}

async function runOnce() {
  const followed = loadFollowedWallets();
  if (!followed.length) { log('no followed wallets found, skipping'); return; }
  const stateFile = path.join(DATA, 'wallet-watch-state.json');
  try {
    const signals = await walletwatch.pollFollowedWallets(followed, stateFile, {
      onError: (w, e) => log(`  wallet watch failed for @${w.handle}: ${e.message}`),
    });
    if (signals.length) {
      append('wallet-signals.jsonl', signals.map((s) => ({ ts: Date.now(), ...s })));
      for (const s of signals) {
        signalstore.record({ kind: `wallet-${s.direction}`, ca: s.mint, sym: null, ts: s.ts,
          reasons: [`@${s.handle} (on-chain) ${s.direction === 'buy' ? 'bought' : 'sold'}${s.selfTradeFlag ? ' -- also traded the other side of this coin in the same window' : ''}`],
          evidence: s });
        // Only buys get measured -- a sell is already the risk signal on its own terms (see
        // traderstats.js header). A capture already running for this mint (this wallet's buy, or
        // another followed wallet's) is a no-op inside startCapture -- known, stated limitation.
        if (s.direction === 'buy') {
          try {
            pumpcapture.startCapture(s.mint, null,
              { type: 'wallet-buy', handle: s.handle, wallet: s.wallet, selfTradeFlag: s.selfTradeFlag });
          } catch (e) { log(`  price capture failed to start for ${s.mint}: ${e.message}`); }
        }
      }
    }
    log(`${signals.length} new on-chain signal(s) from ${followed.length} followed wallet(s)`);
  } catch (e) { log(`wallet watch cycle failed — ${e.message}`); }
}

log(`wallet-collect starting — checking every ${INTERVAL_MS / 1000}s`);
runOnce();
setInterval(runOnce, INTERVAL_MS);

// Never exit on an unhandled error mid-cycle -- a 90-second checker that dies silently on the
// first bad response is worse than one that logs and keeps going. systemd restarts it anyway if
// this ever does exit, but that should be the last resort, not the normal path.
process.on('unhandledRejection', (e) => log('unhandled rejection (continuing):', e?.message || e));
