#!/usr/bin/env node
// Long-running, standalone: runs the SAME `LiveMonitor` the desktop app already uses (`live.js`),
// but on the server, all the time -- not just while a laptop is open. Built on Connal's request,
// 09-09, for "live" market data.
//
// ! NOT new tracking logic. `live.js` was already measured 2026-08-26: DexScreener sustains 10
// calls/sec free, so 15-second price/liquidity checks on a watchlist this size cost nothing. This
// file only gives that existing, already-proven code somewhere to run around the clock, the same
// move D-98 already made for the rest of collection (laptop-only -> always-on server).
//
// Writes to `data/history/` (git-shared, alongside everything else the server collects) instead
// of the desktop app's local `userData/history` -- the desktop app's own local live view is
// untouched and keeps working exactly as before when a laptop has it open; this is an additional,
// independent, always-on copy, not a replacement for it.
//
// Alerts (liquidity pulls, price drops, a safety check flipping) are recorded automatically by
// `LiveMonitor` itself via `signalstore` -- no code needed here for that. ! per D-125, nothing
// here pushes to a phone. It only records; a person deciding to surface it further is separate,
// not-yet-asked-for work.
const fs = require('fs');
const path = require('path');
const REPO = path.join(__dirname, '..', '..');
const DATA = path.join(REPO, 'data');
const WATCHLIST_REFRESH_MS = 60 * 1000;

const { LiveMonitor } = require('./live');
const history = require('./history');

const log = (...a) => console.log(new Date().toISOString().slice(0, 19).replace('T', ' '), ...a);
function watchlist() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, 'watchlist.json'), 'utf8')); }
  catch { return []; }
}

history.init(DATA); // per-coin live history lands in data/history/<ca>.jsonl, git-shared like the rest

const live = new LiveMonitor({
  onUpdate: () => {}, // no window to push to here -- the periodic history write (every 5 min, inside LiveMonitor itself) is the durable record
  onAlert: (a) => log(`ALERT ${a.severity} ${a.sym || a.ca}: ${a.title}`), // signalstore recording already happens inside LiveMonitor
});

function refreshWatchlist() {
  const list = watchlist();
  live.watch(list);
  return list;
}

const initial = refreshWatchlist();
log(`live-collect starting — watching ${initial.map((t) => t.sym).join(', ') || '(empty watchlist)'}`);
live.start();
setInterval(refreshWatchlist, WATCHLIST_REFRESH_MS);

process.on('unhandledRejection', (e) => log('unhandled rejection (continuing):', e?.message || e));
