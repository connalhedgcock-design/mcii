// T-034 -- a calendar of known future dates (unlocks, listings, a real-world mission launch) that
// could move a tracked coin. Connal, 09-05: "very cheap and easy... put it in the app." The data
// side is genuinely cheap; the dates themselves are NOT invented here -- every entry needs a real
// source, same D-16 pattern as `newsQuery`/followed wallets/coins: a person (or a CONFIRMED news
// hit) supplies the fact, this file only stores and sorts it.
//
// !! NEVER STORE A GUESSED DATE AS IF IT WERE FIRM. A headline saying "28 days" on a known
// publish date gives an ESTIMATE, not a confirmed date -- stored as `estimated: true` with the
// source, never silently rounded into a hard `date` a screen would show as fact. Same discipline
// as fact/est/vibe in `10-CTX/mandate.md`.

const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', '..', 'data', 'calendar.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}
function save(events) {
  fs.writeFileSync(FILE, JSON.stringify(events, null, 1) + '\n');
}

// `date` (ISO, YYYY-MM-DD) is required even for an estimate -- store the best current guess, but
// `estimated: true` + `source` travel with it so a screen can word it as "around" not "on".
function addEvent({ ca, sym, event, date, estimated = false, source }) {
  if (!date || !event || !source) throw new Error('calendar entries need date, event, and source -- no guessing without one');
  const events = load();
  events.push({ ca: ca || null, sym: sym || null, event, date, estimated, source, addedAt: Date.now() });
  events.sort((a, b) => a.date.localeCompare(b.date));
  save(events);
  return events;
}

function listEvents() { return load(); }

function upcoming(withinDays = 30) {
  const cutoff = new Date(Date.now() + withinDays * 864e5).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return load().filter((e) => e.date >= today && e.date <= cutoff);
}

module.exports = { addEvent, listEvents, upcoming };
