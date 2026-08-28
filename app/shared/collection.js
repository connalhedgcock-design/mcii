const fs = require('fs');
const path = require('path');

// How long ago the shared record was last added to, and whether that is a problem.
//
// The hourly cloud job is the only thing that fills the record while both laptops are asleep.
// It failed silently: GitHub listed the job as active, every hand-started run worked, and the
// schedule simply never fired once in 27 hours -- four entries in a record that should have had
// twenty-seven. Nothing in the app said so, because the only ages it showed were of data it had
// just fetched itself, which is always fresh by definition.
//
// A collector with nothing displaying it is indistinguishable from a broken one. Fourth time in
// this project. This makes the silence visible.

const HOURLY = 36e5;
const LATE_AFTER    = 2 * HOURLY;   // one skipped hour is normal; GitHub delays runs under load
const STALLED_AFTER = 6 * HOURLY;   // six is not a delay, it is a stopped job

// The newest moment anything was written into the shared record, across every file in it.
function lastWrite(dataDir, now = Date.now()) {
  let newest = null;
  let files = [];
  try { files = fs.readdirSync(dataDir); } catch { return null; }
  for (const f of files) {
    const full = path.join(dataDir, f);
    if (f.endsWith('.jsonl')) {
      let text = '';
      try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
      for (const line of text.trim().split('\n')) {
        let ts = null;
        try { ts = JSON.parse(line)?.ts; } catch { continue; }
        // Ignore anything stamped in the future: a clock-skewed row would otherwise hide a
        // stopped collector behind a timestamp that never gets old.
        if (typeof ts === 'number' && ts <= now && (newest == null || ts > newest)) newest = ts;
      }
    } else if (f === 'holder-truth.json') {
      try {
        const t = JSON.parse(fs.readFileSync(full, 'utf8'))?.checkedAt;
        if (typeof t === 'number' && t <= now && (newest == null || t > newest)) newest = t;
      } catch {}
    }
  }
  return newest;
}

function health(dataDir, now = Date.now()) {
  const lastTs = lastWrite(dataDir, now);
  if (lastTs == null) {
    return { lastTs: null, ageMs: null, ageHours: null, missed: null, state: 'unknown',
      headline: 'Nothing has ever been recorded in the shared record.',
      detail: 'The hourly job that fills it has not produced a single entry. Until it does, the app only knows what it sees while it is open.' };
  }
  const ageMs = Math.max(0, now - lastTs);
  const ageHours = ageMs / HOURLY;
  const missed = Math.max(0, Math.floor(ageHours) - 1);
  const hrs = ageHours < 1 ? `${Math.round(ageMs / 60000)} minutes` : `${Math.round(ageHours)} hours`;

  if (ageMs < LATE_AFTER) {
    return { lastTs, ageMs, ageHours, missed, state: 'ok',
      headline: `Shared record last added to ${hrs} ago.`, detail: '' };
  }
  if (ageMs < STALLED_AFTER) {
    return { lastTs, ageMs, ageHours, missed, state: 'late',
      headline: `The shared record has not been added to for ${hrs}.`,
      detail: 'It is meant to fill in once an hour. One late hour is normal; keep an eye on it.' };
  }
  return { lastTs, ageMs, ageHours, missed, state: 'stalled',
    headline: `Nothing has been added to the shared record for ${hrs}.`,
    detail: `That is about ${missed} hourly updates missed. Nothing is being written down while both laptops are closed, so there is a hole in the history for that whole stretch.` };
}

module.exports = { health, lastWrite, LATE_AFTER, STALLED_AFTER };
