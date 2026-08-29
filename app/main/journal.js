const fs = require('fs');
const path = require('path');

// Positions and forecasts, written as markdown into the vault so they travel with the repo and
// stay readable outside the app. Two separate things live here:
//
//   Theses    - why you think a coin goes up, the case against, and a pre-committed exit.
//   Forecasts - dated, resolvable predictions scored for accuracy.
//
// The forecast log is the only evidence that any of the reasoning works. Memecoins never give
// clean feedback because luck dominates over short samples: you can be right for stupid reasons
// and wrong for good ones and never learn which. A scored forecast resolves yes or no on a known
// date, which is the only cheap way to find out whether the process is worth anything.

let REPO;
function init(repoRoot) {
  REPO = repoRoot;
  fs.mkdirSync(path.join(REPO, '40-POS'), { recursive: true });
  fs.mkdirSync(path.join(REPO, '50-LOG'), { recursive: true });
}

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// One forecast file per person. Two people appending to a shared file would collide on every
// git pull, and -- worse -- their scores would average into a single number that measures
// neither of them. Accuracy is personal; a blended Brier is meaningless.
const FORECASTS = (owner) => path.join(REPO, '50-LOG', `forecasts-${slug(owner || 'unknown')}.jsonl`);

function owners() {
  try {
    return fs.readdirSync(path.join(REPO, '50-LOG'))
      .filter((f) => /^forecasts-.*\.jsonl$/.test(f))
      .map((f) => f.replace(/^forecasts-|\.jsonl$/g, ''));
  } catch { return []; }
}

// --- theses ---------------------------------------------------------------
function saveThesis(t) {
  const file = path.join(REPO, '40-POS', `${slug(t.sym)}-${slug(t.owner || 'connal')}.md`);
  const md = `---
id: pos.${slug(t.sym)}
t: pos
ca: ${t.ca}
chain: solana
owner: ${t.owner || 'connal'}
opened: ${t.opened || new Date().toISOString().slice(0, 10)}
size_pct: ${t.sizePct ?? ''}
status: ${t.status || 'open'}
upd: ${new Date().toISOString().slice(0, 10)}
---
# ${t.sym}

## 1 THESIS (them)
- claim: ${t.claim || ''}
- mechanism: ${t.mechanism || ''}
- horizon: ${t.horizon || ''}
- conf: ${t.confidence ?? ''}%

## 2 ANTITHESIS
${(t.antithesis || '').split('\n').map((l) => `- ${l}`).join('\n')}
- observable that would confirm the bear case: ${t.bearObservable || ''}

## 3 SYNTHESIS — resolves to SIZE and EXIT, not conviction
- size_pct: ${t.sizePct ?? ''}
- invalidation trigger: ${t.invalidation || ''}
- time stop: ${t.timeStop || ''}
- take profit: ${t.takeProfit || ''}
! written before entry. changing after entry is logged as a violation.

## 4 RESOLUTION
- outcome: ${t.outcome || ''}
- was the mechanism right, or right answer for the wrong reason: ${t.postmortem || ''}
`;
  fs.writeFileSync(file, md);
  return { file, ok: true };
}

function listTheses() {
  try {
    return fs.readdirSync(path.join(REPO, '40-POS')).filter((f) => f.endsWith('.md'))
      .map((f) => {
        const raw = fs.readFileSync(path.join(REPO, '40-POS', f), 'utf8');
        const fm = {};
        const m = raw.match(/^---\n([\s\S]*?)\n---/);
        if (m) for (const line of m[1].split('\n')) {
          const i = line.indexOf(':'); if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
        }
        const field = (name) => (raw.match(new RegExp(`^- ${name}: (.*)$`, 'm')) || [])[1] || '';
        return { file: f, ...fm, claim: field('claim'), mechanism: field('mechanism'),
                 invalidation: field('invalidation trigger'), timeStop: field('time stop'),
                 confidence: field('conf').replace('%', '') };
      });
  } catch { return []; }
}

// --- forecasts ------------------------------------------------------------
// Timestamp alone collided when two forecasts were created in the same millisecond, and
// resolveForecast then resolved whichever matched first -- silently scoring the wrong prediction.
// The calibration record is the one thing in this project that has to be trustworthy, so ids
// carry randomness and uniqueness is checked before writing.
function newId(existing) {
  let id;
  do { id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  while (existing.has(id));
  return id;
}

function addForecast(f) {
  const owner = f.owner || 'unknown';
  const seen = new Set(readForecasts(owner).map((r) => r.id));
  const row = {
    id: newId(seen),
    owner,
    created: Date.now(),
    question: f.question,
    prob: Number(f.prob),
    resolveBy: f.resolveBy,
    marketImplied: f.marketImplied != null && f.marketImplied !== '' ? Number(f.marketImplied) : null,
    basis: f.basis || '',
    ca: f.ca || null, sym: f.sym || null,
    resolved: null, outcome: null, brier: null, lesson: '',
  };
  fs.mkdirSync(path.join(REPO, '50-LOG'), { recursive: true });
  fs.appendFileSync(FORECASTS(owner), JSON.stringify(row) + '\n');
  return row;
}

// Pass an owner for one person's log, or omit it to read everyone's -- useful for comparing,
// never for scoring, which is always per person.
function readForecasts(owner) {
  const load = (o) => {
    try {
      return fs.readFileSync(FORECASTS(o), 'utf8').trim().split('\n')
        .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    } catch { return []; }
  };
  if (owner) return load(owner);
  return owners().flatMap(load).sort((a, b) => b.created - a.created);
}

function resolveForecast(id, outcome, lesson, owner) {
  // Resolution must target one person's file. Without an owner we find which file holds the id
  // rather than guessing, so a shared id can never resolve the wrong person's forecast.
  if (!owner) {
    owner = owners().find((o) => readForecasts(o).some((f) => f.id === id));
    if (!owner) return { ok: false, error: 'forecast not found' };
  }
  const all = readForecasts(owner);
  const matches = all.filter((f) => f.id === id);
  if (matches.length > 1) return { ok: false, error: `id ${id} is ambiguous — refusing to resolve` };
  const i = all.findIndex((f) => f.id === id);
  if (i < 0) return { ok: false, error: 'forecast not found' };
  if (all[i].resolved) return { ok: false, error: 'already resolved' };
  const o = outcome ? 1 : 0;
  all[i] = { ...all[i], resolved: Date.now(), outcome: o,
             brier: +Math.pow(all[i].prob / 100 - o, 2).toFixed(4), lesson: lesson || '' };
  fs.writeFileSync(FORECASTS(owner), all.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return { ok: true, forecast: all[i] };
}

// Brier score: mean squared error of the probabilities. 0 is perfect, 0.25 is a coin flip.
// Reported with n, and with the honest verdict attached rather than left for interpretation.
function calibration(owner) {
  if (!owner) return { n: 0, open: 0, brier: null,
    verdict: 'Set who you are before scoring. Accuracy is personal — averaging two people produces a number that describes neither.' };
  const all = readForecasts(owner);
  const done = all.filter((f) => f.resolved);
  const n = done.length;
  if (!n) return { owner, n: 0, open: all.length, brier: null,
    verdict: 'No forecasts have resolved yet. This is the only measure of whether the reasoning works, and it needs about 50 to say anything.' };

  const brier = done.reduce((s, f) => s + f.brier, 0) / n;
  // Always-say-50% scores exactly 0.25. Beating it is the minimum bar for having any skill.
  const baseline = 0.25;
  const withMarket = done.filter((f) => f.marketImplied != null);
  const marketBrier = withMarket.length
    ? withMarket.reduce((s, f) => s + Math.pow(f.marketImplied / 100 - f.outcome, 2), 0) / withMarket.length
    : null;

  let verdict;
  if (n < 50) verdict = `${n} of 50 forecasts resolved. Too few to conclude anything — a good run of ten proves nothing in an asset this volatile.`;
  else if (brier > baseline) verdict = `Brier ${brier.toFixed(3)} is worse than guessing 50% every time (${baseline}). On this evidence the process has no demonstrated edge.`;
  else verdict = `Brier ${brier.toFixed(3)}, better than the ${baseline} a coin flip scores. That is real, measured, and worth continuing.`;

  return { owner, n, open: all.length - n, brier: +brier.toFixed(4), baseline,
    marketBrier: marketBrier != null ? +marketBrier.toFixed(4) : null,
    beatsMarket: marketBrier != null ? brier < marketBrier : null, verdict };
}

// --- open journal -----------------------------------------------------------
// Free-form notes -- a thought, a doubt, something to check later -- that isn't yet worth a
// dated forecast or a full thesis. One file per person, same reasoning as the forecast log:
// these are personal, not a joint diary, so Connal's notes and Austin's notes stay in separate
// files rather than interleaved in one.
const NOTES = (owner) => path.join(REPO, '50-LOG', `notes-${slug(owner || 'unknown')}.jsonl`);

function addNote(n) {
  const text = String(n.text || '').trim();
  if (!text) return { ok: false, error: 'empty note' };
  const owner = n.owner || 'unknown';
  const seen = new Set(readNotes(owner).map((r) => r.id));
  const row = { id: newId(seen), owner, ts: Date.now(), text };
  fs.mkdirSync(path.join(REPO, '50-LOG'), { recursive: true });
  fs.appendFileSync(NOTES(owner), JSON.stringify(row) + '\n');
  return { ok: true, note: row };
}

function readNotes(owner) {
  try {
    // Reversed before the (stable) sort so two notes written in the same millisecond still come
    // back most-recently-added first, rather than in on-disk order.
    return fs.readFileSync(NOTES(owner), 'utf8').trim().split('\n')
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
      .reverse().sort((a, b) => b.ts - a.ts);
  } catch { return []; }
}

module.exports = { init, saveThesis, listTheses, addForecast, readForecasts, resolveForecast, calibration, owners, addNote, readNotes };
