/**
 * room-journal — "The Journal", REDESIGNED, not refined (ROOM-BRIEF §4).
 *
 * The first version was a lab instrument: a calibration dial as the hero, with
 * forecasts and notes as two separate ledgers beside it. Asked whether this room
 * is an instrument or a ship's log, the operator answered "Narrative and
 * chronological" — so the dial is demoted to a readout and the room is now ONE
 * STREAM in time: every note written, every forecast recorded, every forecast
 * resolved and every position opened, newest first, under day headings.
 *
 * §12 asked for two more things, and both are built on Orion (the assistant that
 * already lives in this app, wired to the Claude CLI in app/main/orion.js):
 *   - a QUESTIONS board: it asks US things, to sharpen the analysis, the app, or
 *     the strategy.
 *   - CONNECTIONS: it reads the journal the way the whispers system in the vault
 *     reads Connal's — looking for links between entries and building on them.
 * ! both are on a button, never automatic. Each one is a real subprocess call to
 * the CLI; firing that on every room show would spend real money to redraw a
 * screen nobody asked a question on.
 */
import { mountRoom, board, esc, ago, askText } from './rooms.js';

const DAY_MS = 864e5;
const dayKey = (ts) => new Date(ts).toDateString();
const dayLabel = (ts) => {
  const d = new Date(ts), today = new Date();
  const diff = Math.round((new Date(today.toDateString()) - new Date(d.toDateString())) / DAY_MS);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

export function initJournalRoom(root) {
  const { pill, wall, beyond } = mountRoom(root, { beyondClass: 'rm-journal', tag: 'LOG', title: 'The Journal' });
  let active = false;
  let state = null;
  let questions = null;      // Orion's questions, once asked for
  let connections = null;    // Orion's read of the journal, once asked for
  let busy = '';             // which Orion call is in flight

  /** The backdrop is the log itself: one tick per entry, placed by WHEN it was
   *  written across the last 30 days. Narrative and chronological in the
   *  atmosphere too, not just in the boards — and every mark is a real entry. */
  function ribbon(entries) {
    const now = Date.now(), span = 30 * DAY_MS;
    const marks = entries.filter((e) => now - e.ts < span).map((e) => {
      const x = (1 - (now - e.ts) / span) * 100;
      return `<i class="fl-mark is-${e.kind}" style="left:${x.toFixed(2)}%"></i>`;
    }).join('');
    // ! GRADUATIONS, always. The ribbon carried only the entries themselves, so
    // on a quiet week it was one tick on an empty line — which reads as a
    // broken element, not as a quiet week. A measuring tape is legible because
    // it is GRADUATED: one mark per day for thirty days says "this is a month,
    // and little happened" where a bare line says nothing at all.
    const days = Array.from({ length: 31 }, (_, i) =>
      `<i class="fl-tick${i % 7 === 0 ? ' is-week' : ''}" style="left:${(i / 30 * 100).toFixed(2)}%"></i>`).join('');
    beyond.innerHTML = `<div class="fl-tape"><span class="fl-tape-line"></span>${days}${marks}
      <span class="fl-tape-end">now</span><span class="fl-tape-start">30 days ago</span></div>`;
  }

  function renderGate() {
    wall.innerHTML = board({
      label: 'who is writing?', tag: 'LOG-0', wide: true,
      body: `<p class="st-say">Forecast accuracy is scored per person — this needs to know who is typing before it records anything.</p>
        <div class="st-actrow"><input id="rmWho" placeholder="your name" style="flex:1"><button class="btn accent" id="rmSetWho">Save</button></div>`,
    });
    wall.querySelector('#rmSetWho').addEventListener('click', async () => {
      const v = wall.querySelector('#rmWho').value.trim();
      if (!v) return;
      await window.mcii.setOwner(v);
      refresh();
    });
  }

  /** Everything that happened, in one stream. A forecast appears TWICE on
   *  purpose — once when it was made and once when it resolved — because those
   *  are two different moments in the story and collapsing them into one row is
   *  exactly what made the old ledger unreadable as a narrative. */
  function timeline({ fx, notes, th }) {
    const out = [];
    for (const n of notes) out.push({ ts: n.ts, kind: 'note', owner: n.owner, text: n.text });
    for (const f of fx) {
      out.push({ ts: f.created, kind: 'forecast', text: f.question, prob: f.prob, resolveBy: f.resolveBy, id: f.id, open: !f.resolved, sym: f.sym });
      if (f.resolved) out.push({ ts: f.resolved, kind: 'resolved', text: f.question, outcome: f.outcome, brier: f.brier, lesson: f.lesson, prob: f.prob });
    }
    for (const t of th) {
      const ts = t.opened ? Date.parse(t.opened) : null;
      if (ts) out.push({ ts, kind: 'position', text: t.claim || '(no claim written)', sym: (t.id || '').replace('pos.', '').toUpperCase(), invalidation: t.invalidation, confidence: t.confidence });
    }
    return out.filter((e) => e.ts).sort((a, b) => b.ts - a.ts);
  }

  function entryHtml(e) {
    const when = new Date(e.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    if (e.kind === 'note') {
      return `<div class="st-entry is-note"><span class="t">${when}</span>
        <div class="b"><span class="k">${esc(e.owner || '')} wrote</span><p>${esc(e.text)}</p></div></div>`;
    }
    if (e.kind === 'forecast') {
      return `<div class="st-entry is-forecast"><span class="t">${when}</span>
        <div class="b"><span class="k">forecast · ${e.prob}% by ${esc(e.resolveBy)}${e.open ? '' : ' · closed'}</span>
          <p>${esc(e.text)}</p>
          ${e.open ? `<div class="st-actrow"><button class="btn sm" data-o="1" data-id="${esc(e.id)}">it happened</button><button class="btn sm" data-o="0" data-id="${esc(e.id)}">it did not</button></div>` : ''}
        </div></div>`;
    }
    if (e.kind === 'resolved') {
      return `<div class="st-entry is-${e.outcome ? 'hit' : 'miss'}"><span class="t">${when}</span>
        <div class="b"><span class="k">resolved · said ${e.prob}% · ${e.outcome ? 'it happened' : 'it did not'}${e.brier != null ? ` · brier ${e.brier.toFixed(3)}` : ''}</span>
          <p>${esc(e.text)}</p>${e.lesson ? `<p class="lesson">${esc(e.lesson)}</p>` : ''}</div></div>`;
    }
    return `<div class="st-entry is-position"><span class="t">${when}</span>
      <div class="b"><span class="k">position opened · ${esc(e.sym || '')}${e.confidence ? ` · ${esc(String(e.confidence))}% confident` : ''}</span>
        <p>${esc(e.text)}</p>${e.invalidation ? `<p class="lesson">exit: ${esc(e.invalidation)}</p>` : ''}</div></div>`;
  }

  function render() {
    const { me, others, cal, fx, th, notes, tokens } = state;
    const entries = timeline({ fx, notes, th });
    const open = fx.filter((f) => !f.resolved);
    const cls = cal.brier == null ? '' : cal.brier <= cal.baseline ? 'is-up' : 'is-down';

    pill.innerHTML =
      `<span class="p"><b>${entries.length}</b> entries</span>` +
      `<span class="p"><b>${open.length}</b> open forecasts</span>` +
      `<span class="p ${cls}"><b>${cal.brier != null ? cal.brier.toFixed(2) : '—'}</b> brier</span>` +
      (others.length ? `<span class="p">also logging: ${esc(others.join(', '))}</span>` : '');

    ribbon(entries);

    // ── the log ───────────────────────────────────────────────────────────
    let stream = '', lastDay = null;
    for (const e of entries.slice(0, 60)) {
      const k = dayKey(e.ts);
      if (k !== lastDay) { stream += `<div class="st-day">${dayLabel(e.ts)}</div>`; lastDay = k; }
      stream += entryHtml(e);
    }
    const logBody = `<div class="st-compose">
        <textarea id="rmNoteText" rows="2" placeholder="What are you thinking right now?"></textarea>
        <div class="st-actrow"><button class="btn accent" id="rmNoteAdd">Write it down</button>
          <button class="btn sm" id="rmFcast">Make it a forecast instead</button></div>
      </div>
      ${entries.length ? stream : `<div class="st-flatempty">Nothing written yet. The log starts with the first thing you type above.</div>`}`;

    // ── Orion asks US things (§12) ────────────────────────────────────────
    const qBody = questions
      ? `<div class="st-orion">${esc(questions).split('\n').filter(Boolean).map((l) => `<p>${esc(l).replace(/^[-•*]\s*/, '')}</p>`).join('')}</div>
         <div class="st-actrow"><button class="btn sm" data-ask="questions">Ask again</button></div>`
      : `<p class="st-note">Orion reads the watchlist, the open forecasts and this log, then asks what it would need to know to sharpen the read.</p>
         <div class="st-actrow"><button class="btn accent" data-ask="questions" ${busy === 'questions' ? 'disabled' : ''}>${busy === 'questions' ? 'thinking…' : 'Ask Orion for questions'}</button></div>`;

    // ── Orion reads the log back (§12, the whispers idea) ─────────────────
    const cBody = connections
      ? `<div class="st-orion">${esc(connections).split('\n').filter(Boolean).map((l) => `<p>${esc(l).replace(/^[-•*]\s*/, '')}</p>`).join('')}</div>
         <div class="st-actrow"><button class="btn sm" data-ask="connections">Read it again</button></div>`
      : `<p class="st-note">Reads every entry above looking for links between them — the same job the whispers file does in the vault.</p>
         <div class="st-actrow"><button class="btn accent" data-ask="connections" ${busy === 'connections' ? 'disabled' : ''}>${busy === 'connections' ? 'reading…' : 'Find connections'}</button></div>`;

    // ── the dial, demoted to a readout ────────────────────────────────────
    const calBody = `<div class="st-board-num ${cls}" style="font-size:26px">${cal.brier != null ? cal.brier.toFixed(3) : '—'}</div>
      <p class="st-note" style="margin-top:6px">${esc(cal.verdict)}</p>
      <div class="st-stats" style="margin-top:8px">
        <div class="st-stat"><span class="k">resolved</span><span class="v">${cal.n}</span></div>
        <div class="st-stat"><span class="k">open</span><span class="v">${cal.open}</span></div>
        <div class="st-stat"><span class="k">vs market</span><span class="v">${cal.marketBrier != null ? cal.marketBrier.toFixed(3) : '—'}</span></div>
      </div>`;

    // ── positions, kept (nothing gets lost in a redesign) ─────────────────
    const posBody = (th.length ? th.map((t) => `<div class="st-entry is-position"><span class="t">${esc((t.id || '').replace('pos.', '').toUpperCase())}</span>
        <div class="b"><p>${esc(t.claim || '—')}</p>
        <p class="lesson">exit: ${esc(t.invalidation || 'NOT SET')} · confidence ${esc(String(t.confidence || '—'))}%</p></div></div>`).join('')
      : `<div class="st-flatempty">Nothing written up yet.</div>`) +
      `<div class="st-compose" style="margin-top:12px">
        <select id="rmPcoin">${tokens.map((t) => `<option value="${esc(t.ca)}|${esc(t.sym)}">${esc(t.nick || t.sym)}</option>`).join('')}</select>
        <input id="rmPclaim" placeholder="Why do you think this goes up?">
        <input id="rmPinval" placeholder="What would make you sell? A number, not a feeling.">
        <input id="rmPconf" type="number" min="1" max="99" placeholder="confidence 1-99">
        <div class="st-actrow"><button class="btn accent" id="rmPsave">Save this position</button></div>
      </div>`;

    wall.innerHTML =
      board({ label: `the log — ${me}`, tag: 'LOG-1', full: true, body: logBody }) +
      board({ label: 'orion asks', tag: 'LOG-2', wide: true, body: qBody }) +
      board({ label: 'calibration', tag: 'LOG-3', body: calBody }) +
      board({ label: 'connections in the log', tag: 'LOG-4', wide: true, body: cBody }) +
      board({ label: `positions — ${th.length}`, tag: 'POS-1', full: true, body: posBody });

    wire();
  }

  function wire() {
    wall.querySelector('#rmNoteAdd')?.addEventListener('click', async () => {
      const text = wall.querySelector('#rmNoteText').value.trim();
      if (!text) return;
      await window.mcii.addNote(text);
      refresh();
    });
    wall.querySelector('#rmFcast')?.addEventListener('click', async () => {
      const q = wall.querySelector('#rmNoteText').value.trim()
        || await askText('What are you predicting? Write it so future-you cannot argue about whether it came true.', { ok: 'Next' });
      if (!q) return;
      const p = await askText('How likely, as a percentage?', { placeholder: '55', ok: 'Next' });
      if (p === null) return;
      const by = await askText('Resolve by which date? (YYYY-MM-DD)', { value: new Date(Date.now() + 7 * DAY_MS).toISOString().slice(0, 10), ok: 'Record it' });
      if (by === null) return;
      await window.mcii.addForecast({ question: q, prob: Number(p), resolveBy: by });
      refresh();
    });
    wall.querySelectorAll('[data-o]').forEach((b) => b.addEventListener('click', async () => {
      const lesson = (await askText('What would you have needed to see to get this right?', { ok: 'Save' })) || '';
      await window.mcii.resolveForecast(b.dataset.id, b.dataset.o === '1', lesson);
      refresh();
    }));
    wall.querySelector('#rmPsave')?.addEventListener('click', async () => {
      const [ca, sym] = (wall.querySelector('#rmPcoin').value || '|').split('|');
      const claim = wall.querySelector('#rmPclaim').value.trim();
      const invalidation = wall.querySelector('#rmPinval').value.trim();
      if (!sym || !claim) return;
      await window.mcii.saveThesis({ ca, sym, claim, invalidation, confidence: wall.querySelector('#rmPconf').value.trim() });
      refresh();
    });
    wall.querySelectorAll('[data-ask]').forEach((b) => b.addEventListener('click', () => ask(b.dataset.ask)));
  }

  async function ask(which) {
    if (busy) return;
    busy = which;
    render();
    const { notes, fx, th } = state;
    const recent = notes.slice(0, 12).map((n) => `- ${n.owner}: ${n.text}`).join('\n');
    const open = fx.filter((f) => !f.resolved).map((f) => `- ${f.prob}%: ${f.question} (by ${f.resolveBy})`).join('\n');
    const pos = th.map((t) => `- ${(t.id || '').replace('pos.', '')}: ${t.claim} (exit: ${t.invalidation || 'not set'})`).join('\n');

    const prompt = which === 'questions'
      ? `You are Orion, inside MCII. Ask ME questions — do not answer any.\n\n`
        + `Write 5 short questions that would sharpen how we read these coins, improve this app, or `
        + `test the trading strategy. Prefer questions whose answer would change a decision. One per line, no numbering, no preamble.\n\n`
        + `Open forecasts:\n${open || '(none)'}\n\nPositions:\n${pos || '(none)'}\n\nRecent journal entries:\n${recent || '(none)'}`
      : `You are Orion, inside MCII. Read these journal entries and look for CONNECTIONS between `
        + `them — a thought that repeats, two entries that contradict each other, an idea one entry `
        + `starts and another finishes. Then build on the strongest one with a concrete suggestion.\n`
        + `Be specific and short. One thought per line, no numbering, no preamble. If the entries are `
        + `too few or unrelated to connect, say exactly that in one line rather than inventing a link.\n\n`
        + `Entries:\n${recent || '(none)'}\n\nOpen forecasts:\n${open || '(none)'}`;

    let out;
    try { out = await window.mcii.orionAsk(prompt); }
    catch (e) { out = `Orion could not answer: ${e.message}`; }
    if (!active) { busy = ''; return; }
    if (which === 'questions') questions = out; else connections = out;
    busy = '';
    render();
  }

  async function refresh() {
    if (!active) return;
    const me = await window.mcii.owner().catch(() => null);
    if (!me) { renderGate(); pill.innerHTML = ''; return; }
    const [cal, fx, th, everyone, tokens, notes] = await Promise.all([
      window.mcii.calibration(), window.mcii.forecasts(), window.mcii.theses(), window.mcii.allOwners(),
      window.mcii.getTokens().catch(() => []), window.mcii.notes(),
    ]);
    if (!active) return;
    state = { me, others: everyone.filter((o) => o !== me), cal, fx, th, notes, tokens };
    render();
  }

  return {
    show() { active = true; root.hidden = false; refresh(); },
    hide() { active = false; root.hidden = true; },
  };
}
