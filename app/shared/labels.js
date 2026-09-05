// Triple-barrier auto-labelling -- turns every real admission into a real, resolvable forecast.
// Built 2026-09-05 because this was the single most repeated gap in the whole vault: "the labelled
// outcome record does not exist at all, n=0" (`70-AREAS/trading-strategy/admission-backtest.md`,
// `70-AREAS/trading-strategy/README`'s data audit, both 09-04) -- everything above Stage-3
// confidence, ATR stop widths, and ever revisiting fixed position sizing needs real labelled
// outcomes to tune against, and none were being recorded. Checked again 09-05: still nothing.
// Waiting any longer is the one genuinely irreversible mistake here -- a day without labelling is a
// day of outcomes that can never be recovered.
//
// !! REUSES `journal.js`'s forecast/calibration machinery rather than inventing a parallel one --
// a triple-barrier label ("will this hit its target before its stop or timeout") IS exactly the
// dated, resolvable, scored prediction `journal.js` already tracks in `50-LOG/forecasts-<owner>`.
// D-05's n>=50 bar and the existing Brier-score calibration apply to these automatically, for free.
//
// !! SAME RULE SET AS `app/tools/backtest-walkforward.js`, ON PURPOSE -- introducing a different
// target/stop/timeout here would be a second, untested rule variant, exactly the "count the trials"
// overfitting risk `60-KB/signal-architecture-research.md` warns against. One rule, defined once,
// reused everywhere it's needed.

const TARGET_PCT = 0.20;
const STOP_PCT = -0.15;
const TIMEOUT_HOURS = 24;

// Given a coin's own market.jsonl rows (any order, will be sorted here) and the entry point,
// returns the resolution once a barrier has fired, or null if still pending (D-29: no answer yet
// is not a zero, and must never be reported as one).
function checkBarrier(entryPrice, entryTs, rows, opts = {}) {
  const target = opts.targetPct ?? TARGET_PCT;
  const stop = opts.stopPct ?? STOP_PCT;
  const timeoutH = opts.timeoutHours ?? TIMEOUT_HOURS;
  if (!entryPrice || entryPrice <= 0) return null;

  const deadline = entryTs + timeoutH * 3600 * 1000;
  const future = rows
    .filter((r) => r.ts > entryTs && r.price != null)
    .sort((a, b) => a.ts - b.ts);

  for (const r of future) {
    const ret = (r.price - entryPrice) / entryPrice;
    if (ret <= stop) return { outcome: 'stop', win: false, ts: r.ts, ret };
    if (ret >= target) return { outcome: 'target', win: true, ts: r.ts, ret };
    if (r.ts >= deadline) return { outcome: 'timeout', win: ret > 0, ts: r.ts, ret };
  }
  return null; // still pending -- no barrier has fired yet
}

module.exports = { checkBarrier, TARGET_PCT, STOP_PCT, TIMEOUT_HOURS };
