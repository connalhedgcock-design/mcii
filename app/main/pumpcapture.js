// THE PUMP-DURATION MEASUREMENT -- flagged as wanted since 09-01
// (`80-WHISPERS/analysis-algorithm/README`: "i want you to run the numbers ... and see how long
// the actual window to get in on the initial pump after a social media boost from a famous person
// is"), never started because the pieces it needed didn't exist yet: an always-on host (D-98) and
// a real live trigger (`fomonotifications.js`, built 09-04). Both exist now. Building the CAPTURE
// tonight rather than researching further -- same reasoning as the labelled-outcome record: a day
// without recording is a day of outcomes that can never be recovered, and this can only ever be
// answered from data collected AFTER the recorder exists, never backfilled.
//
// !! THIS IS A TRIGGER + A SHORT RECORDING, NOT A NEW SCANNER. The analysis-algorithm whisper is
// explicit about the shape: "for a small set of watched high-pull accounts, the post timestamp,
// and minute-level price for the coin it names for ~2 hours after." The trigger available RIGHT
// NOW is a FOMO signal (a followed trader's real buy), not an Elon/Trump post (that tracker is
// still blocked on T-032) -- the same measurement, a different, already-live trigger. Extend to
// Elon/Trump once that tracker exists; the capture mechanism itself does not change.
//
// !! WHAT THE STUDY WILL REPORT, DEFINED IN ADVANCE SO IT CANNOT BE MOVED LATER (per the whisper's
// own discipline): (1) how much of the eventual move is still available 1/5/15/30/60 min after the
// trigger, (2) what fraction of triggers move the price at all -- the denominator, D-63's rule,
// (3) how much of any move survives fees+slippage at a real position size, (4) whether the
// project's own twice-hourly cloud scan would even have SEEN the move while it was still open.
// None of that can be computed until real captures exist -- this file only records, one honestly
// kept jsonl row per price check, ready for that analysis once n is real.
//
// ! LOCAL TO WHICHEVER MACHINE TRIGGERS IT. Runs inside the desktop app process (same as
// `fomonotifications.js` itself), so a capture only continues while that Mac stays open -- the
// same laptop-dependency every local-only signal in this project already has, stated plainly
// rather than glossed over.

const fs = require('fs');
const path = require('path');
const { fetchMarket } = require('./adapters/dexscreener');

const POLL_INTERVAL_MS = 90 * 1000;      // ~90s -- minute-level per the spec, without hammering the free API
const CAPTURE_DURATION_MS = 2 * 3600 * 1000; // 2 hours per the spec

let captureFile = null;
const active = new Map(); // ca -> { timer, endsAt }

function init(repoRoot) {
  captureFile = path.join(repoRoot, 'data', 'pump-captures.jsonl');
}

function append(row) {
  try { fs.appendFileSync(captureFile, JSON.stringify(row) + '\n'); }
  catch (e) { console.error('pumpcapture: write failed —', e.message); }
}

// Starts a 2-hour, ~90s-interval price capture for `ca`, tagged with WHY it started (the trigger
// that fired) -- never invented later, since a capture with no recorded trigger cannot answer
// "did the trigger predict anything" at all. A second trigger for the SAME coin while one is
// already running is a no-op: overlapping captures for one coin would double-count the same price
// history against two different trigger times, corrupting exactly the denominator (D-63) this
// exists to measure honestly.
function startCapture(ca, sym, trigger) {
  if (!captureFile) throw new Error('pumpcapture.init() was never called');
  if (active.has(ca)) return { started: false, reason: 'capture already running for this coin' };

  const captureId = `${ca}-${Date.now()}`;
  const startedAt = Date.now();
  const endsAt = startedAt + CAPTURE_DURATION_MS;

  const poll = async () => {
    let row = { captureId, ca, sym, ts: Date.now(), trigger, price: null, liq: null, error: null };
    try {
      const m = await fetchMarket(ca);
      row.price = m.priceUsd ?? null;
      row.liq = m.totalLiquidityUsd ?? null;
    } catch (e) {
      row.error = e.message; // D-29: a failed poll is recorded as a failure, never invented as "no move"
    }
    append(row);
    if (Date.now() >= endsAt) {
      clearInterval(active.get(ca)?.timer);
      active.delete(ca);
    }
  };

  const timer = setInterval(poll, POLL_INTERVAL_MS);
  active.set(ca, { timer, endsAt });
  poll(); // first reading immediately, at the trigger itself -- t=0 is part of the series, not a gap
  return { started: true, captureId, endsAt };
}

function activeCaptures() {
  return [...active.entries()].map(([ca, { endsAt }]) => ({ ca, endsAt }));
}

module.exports = { init, startCapture, activeCaptures, POLL_INTERVAL_MS, CAPTURE_DURATION_MS };
