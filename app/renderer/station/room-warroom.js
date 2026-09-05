/**
 * room-warroom — "The War Room" (ROOM-BRIEF §21-22, the eighth door).
 *
 * The operator asked for two different depths of the same reading:
 *   "there should be a smaller panel on the coins and market tab and a much
 *    more in depth synthesis in the war room where you can see how the data is
 *    being assessed."
 * The compact panel is `verdictPanel(..., {compact})` in Your Coins and The
 * Market. THIS room is the other half, and its subject is not the verdict —
 * it is the ARITHMETIC. Every other room answers "what does this coin look
 * like today"; this one answers "why does the app believe that, and how much
 * of the picture was actually there".
 *
 * ! Nothing here computes a reading of its own. Every number on these boards
 * comes out of synthesis.js — the same pure functions Your Coins and The
 * Market call, and the same ones app/test/synthesis.test.js pins. A second
 * implementation of the fusion, written to look good on this screen, is
 * exactly how a "how it was assessed" room ends up disagreeing with the
 * assessment it claims to be explaining.
 *
 * The one thing this room adds is HONESTY ABOUT ITS OWN BLIND SPOTS: the last
 * board names the inputs that do not exist yet (trader flow, real-world
 * events, prediction markets — ROOM-BRIEF §B "BLOCKED"). They are named here
 * rather than quietly omitted, because a synthesis room that shows only what
 * it happens to have collected reads as complete when it is not.
 */
import { mountRoom, board, esc, pctStr, pctCls } from './rooms.js';
import { readCoin, WEIGHTS, riskWord } from './synthesis.js';
import { verdictPanel, confidenceGauge } from './readouts.js';

const VOTE_LABEL = { market: 'market', safety: 'safety', social: 'social', trader: 'trader flow' };
const ALL_INPUTS = ['market', 'safety', 'social', 'trader'];

// Same rule as app.js's chg24Of (D-117) and room-watch's copy: our own recorded
// history wins once it actually covers the day. See rooms.js on duplication.
function chg24Of(t) {
  const p = t.trend?.price24h;
  if (p && p.spanHours >= 20) return p.pct;
  return t.market?.priceChange?.h24 ?? null;
}

export function initWarRoom(root) {
  const { pill, wall, beyond } = mountRoom(root, { beyondClass: 'rm-war', tag: 'WAR', title: 'The War Room' });
  let active = false;
  let tokens = [];
  let sel = null;      // ca of the coin on the bench
  let social = null;   // socialFor(sel) — the one input that costs an extra call
  let loadingDetail = false;

  // THE BENCH — four inputs running in and fusing into one reading. It is the
  // diagram of what this room does, which is why it is the backdrop: every
  // other room's motif is a PLACE (a dock, a scope, a cargo rail) because those
  // rooms are about a thing; this room is about an OPERATION.
  //
  // ! Drawn as one svg, not as four rotated divs. The div version put four
  // hairlines at four angles that crossed each other on the way past the
  // convergence point, and it read as scratches on the glass rather than as
  // anything converging — the operator's "still looks unfinished". Curves that
  // actually meet at a node, and stop there, are the whole difference.
  //
  // preserveAspectRatio="none" is deliberate: these are long horizontal runs
  // and stretching them is correct. The fusion node is therefore NOT in the svg
  // (it would stretch to an ellipse) — it is a css circle pinned to the same
  // 62% the paths converge on. Keep those two numbers in step.
  const FEED_Y = [16, 38, 60, 82];
  function benchMotif() {
    const paths = FEED_Y.map((y, i) =>
      `<path class="fl-rail fl-rail-${i}" d="M0,${y} C220,${y} 300,52 620,52"/>`).join('');
    const pulses = FEED_Y.map((y, i) =>
      `<path class="fl-pulse fl-pulse-${i}" d="M0,${y} C220,${y} 300,52 620,52"/>`).join('');
    beyond.innerHTML = `<div class="fl-band">
      <svg class="fl-bench" viewBox="0 0 1000 104" preserveAspectRatio="none" aria-hidden="true">
        ${paths}${pulses}
        <path class="fl-trunk" d="M620,52 L760,52"/>
      </svg>
      <span class="fl-fuse"></span>
    </div>`;
  }

  /** The fused reading for one token, with the inputs this room could not get.
   *  `social` is only ever fetched for the selected coin, so every OTHER row is
   *  honestly a three-input reading and its coverage says so. */
  function reading(t, soc) {
    const r = readCoin(t, soc || null, null);
    const got = new Set(r.votes.map((v) => v.key));
    return { r, missing: ALL_INPUTS.filter((k) => !got.has(k)) };
  }

  // ── the arithmetic, spelled out ─────────────────────────────────────────
  // The exact expression fuse() evaluates: score = Σ(dir·strength·W·conf) / Σ(W·conf).
  // Printed as a table with the running total underneath, because the operator
  // asked to SEE the assessment, and a weighted mean whose weights are invisible
  // is just a number with extra steps.
  function arithmetic(r, missing) {
    if (!r || r.label === 'no reading') return `<div class="st-flatempty">Nothing measured on this coin yet.</div>`;
    let num = 0, den = 0;
    const rows = r.votes.map((v) => {
      const w = WEIGHTS[v.key] * v.conf;
      const contrib = v.dir * v.strength * w;
      num += contrib; den += w;
      return `<div class="st-flatrow st-warrow">
        <span class="name">${esc(VOTE_LABEL[v.key] || v.key)}</span>
        <span class="d is-${v.dir > 0 ? 'up' : v.dir < 0 ? 'down' : 'flat'}">${v.dir > 0 ? '▲' : v.dir < 0 ? '▼' : '—'}</span>
        <span class="grow">${esc(v.why || '')}</span>
        <span class="n" title="how big this input's move was, 0 to 1">${v.strength.toFixed(2)}</span>
        <span class="n" title="how much this one reading can be trusted">${v.conf.toFixed(2)}</span>
        <span class="n" title="this input's standing weight in the fusion">${WEIGHTS[v.key].toFixed(2)}</span>
        <span class="n contrib ${contrib > 0 ? 'is-up' : contrib < 0 ? 'is-down' : ''}">${contrib >= 0 ? '+' : ''}${contrib.toFixed(3)}</span>
      </div>`;
    }).join('');

    // Law 1, made visible: a missing input is not a zero vote, it is a row that
    // never happened — so it contributes nothing to the numerator AND nothing to
    // the denominator, and the coverage figure below is what carries the loss.
    const gone = missing.map((k) => `<div class="st-flatrow st-warrow is-missing">
        <span class="name">${esc(VOTE_LABEL[k] || k)}</span>
        <span class="d">·</span>
        <span class="grow">did not report — drops out of the sum entirely, it does not vote 0</span>
        <span class="n">—</span><span class="n">—</span><span class="n">${WEIGHTS[k].toFixed(2)}</span><span class="n contrib">—</span>
      </div>`).join('');

    const score = den ? num / den : 0;
    return `<div class="st-flathead st-warrow">
        <span class="name">INPUT</span><span class="d"></span><span class="grow">WHAT IT SAW</span>
        <span class="n">MOVE</span><span class="n">TRUST</span><span class="n">WEIGHT</span><span class="n contrib">EFFECT</span>
      </div>${rows}${gone}
      <div class="st-warsum">
        <div class="st-warsum-line">
          <span>sum of effects</span><b>${num >= 0 ? '+' : ''}${num.toFixed(3)}</b>
          <span>÷ weight that reported</span><b>${den.toFixed(3)}</b>
          <span>= reading</span><b class="${score > 0 ? 'is-up' : score < 0 ? 'is-down' : ''}">${score >= 0 ? '+' : ''}${score.toFixed(3)}</b>
        </div>
        <div class="st-warsum-note">Anything past ±0.18 stops being "mixed" and gets a word.
          ${missing.length ? `${missing.length} of ${ALL_INPUTS.length} inputs never reported, so this reading is made from ${Math.round(r.coverage * 100)}% of the weight it could have used.` : 'Every input reported.'}</div>
      </div>`;
  }

  // ── the disagreement board ──────────────────────────────────────────────
  // §18: conflicting signals get a WARNING STATE, never an average. This board
  // exists to make that visible as its own thing rather than as a colour on the
  // verdict, because "these two inputs point opposite ways" is a different fact
  // from "the reading came out near zero" and they look identical once averaged.
  function disagreement(r) {
    if (!r || r.label === 'no reading') return `<div class="st-flatempty">Nothing to compare yet.</div>`;
    if (!r.conflict) {
      const dirs = new Set(r.votes.filter((v) => v.dir !== 0).map((v) => v.dir));
      return `<div class="st-warcalm">
        <span class="st-lamp" data-lit="ok">NO CONFLICT</span>
        <p>${dirs.size <= 1
          ? 'Every input that reported points the same way. That agreement is why the reading is worth its confidence, not a separate reason to act.'
          : 'The inputs are not unanimous, but nothing that disagrees is strong enough to count as a conflict — a nudge against the trend is not a warning.'}</p>
      </div>`;
    }
    const side = (keys, dir) => `<div class="st-warside is-${dir}">
      <span class="st-warside-h">${dir === 'up' ? 'SAYS BUY' : 'SAYS SELL'}</span>
      ${keys.map((k) => {
        const v = r.votes.find((x) => x.key === k);
        return `<div class="st-warside-row"><b>${esc(VOTE_LABEL[k] || k)}</b><span>${esc(v?.why || '')}</span></div>`;
      }).join('')}</div>`;
    return `<div class="st-warconflict">
      <span class="st-lamp" data-lit="warn">CONFLICT</span>
      <p>Two sides of this coin are telling you opposite things at full strength. Averaging them
         would report a shrug; the app refuses to, and shows you both instead.</p>
      <div class="st-warsides">${side(r.conflict.up, 'up')}${side(r.conflict.down, 'down')}</div>
    </div>`;
  }

  // ── the whole book, assessed at once ────────────────────────────────────
  function bookRows() {
    const scored = tokens.map((t) => {
      const { r, missing } = reading(t, t.ca === sel ? social : null);
      return { t, r, missing };
    // Worst first — the row you might act on is the row at the top. A coin with
    // NO reading is not "neutral" and must not sort among the mild ones as if
    // its 0.00 were a measurement: nothing was measured, so it goes last.
    }).sort((a, b) => {
      const na = a.r.label === 'no reading', nb = b.r.label === 'no reading';
      if (na !== nb) return na ? 1 : -1;
      return (a.r.score ?? 0) - (b.r.score ?? 0);
    });

    if (!scored.length) return `<div class="st-flatempty">No coins tracked yet.</div>`;
    return `<div class="st-flathead st-warbook">
        <span class="name">COIN</span><span class="grow">READING</span>
        <span class="bar"></span><span class="v">SCORE</span><span class="v">SURE</span><span class="v">SEEN</span>
      </div>` + scored.map(({ t, r, missing }) => {
      const w = riskWord(r);
      const half = Math.round(Math.abs(r.score) * 50);
      const tone = r.conflict ? 'warn' : r.score > 0.18 ? 'up' : r.score < -0.18 ? 'down' : 'flat';
      return `<div class="st-flatrow st-warbook is-pick ${t.ca === sel ? 'is-sel' : ''}" data-pick="${esc(t.ca)}">
        <span class="name">${esc(t.nick || t.sym || '?')}</span>
        <span class="grow">${w.word ? `<b class="is-${tone}">${esc(w.word)}</b> · ` : ''}${esc(r.label)}${missing.length ? ` · ${missing.length} input${missing.length > 1 ? 's' : ''} missing` : ''}</span>
        <span class="bar"><span class="st-vbar"><span class="zero"></span>
          <span class="fill is-${tone}" style="${r.score >= 0 ? `left:50%;width:${half}%` : `right:50%;width:${half}%`}"></span></span></span>
        <span class="v ${r.score > 0 ? 'is-up' : r.score < 0 ? 'is-down' : ''}">${r.score >= 0 ? '+' : ''}${r.score.toFixed(2)}</span>
        <span class="v">${Math.round(r.confidence * 100)}%</span>
        <span class="v">${Math.round(r.coverage * 100)}%</span>
      </div>`;
    }).join('');
  }

  // ── what this room cannot see ───────────────────────────────────────────
  // ROOM-BRIEF §B, the blocked list, stated in the room's own voice. Named, not
  // hidden: the operator asked for these and they are not built yet, and a room
  // about how the assessment is made is the one place where the gap belongs.
  function blindSpots() {
    return `<div class="st-warblind">
      <div class="st-warblind-row">
        <span class="st-lamp">TRADER FLOW</span>
        <p>Who actually bought and sold today. The chain reader exists (<code>walletflow.js</code>)
           but nothing is wired to it and no wallets are followed yet, so it never votes — which is
           why most readings above are short ${WEIGHTS.trader.toFixed(1)} of weight.
           It also must not ship before the wash-trade filter: manufactured volume is the base rate
           here, and raw flow on the wall would be fake interest dressed as real.</p>
      </div>
      <div class="st-warblind-row">
        <span class="st-lamp">REAL-WORLD EVENTS</span>
        <p>The star you asked for beside a coin with a real event behind it. Nothing collects an
           event feed today, so no coin can earn one.</p>
      </div>
      <div class="st-warblind-row">
        <span class="st-lamp">PREDICTION MARKETS</span>
        <p>No source, no adapter, no stored data — the door stays sealed rather than opening onto
           an empty room.</p>
      </div>
      <p class="st-warblind-foot">These are named here on purpose. A synthesis that shows only the
        inputs it happens to have looks complete; this one tells you what it was missing.</p>
    </div>`;
  }

  function render() {
    const t = tokens.find((x) => x.ca === sel) || tokens[0] || null;
    if (t && t.ca !== sel) sel = t.ca;
    const { r, missing } = t ? reading(t, social) : { r: null, missing: ALL_INPUTS };

    const name = t ? esc(t.nick || t.sym || '?') : '—';
    const chg = t ? chg24Of(t) : null;
    pill.innerHTML = t
      ? `<span class="p">on the bench <b>${name}</b></span>
         <span class="p ${pctCls(chg)}">24h <b>${pctStr(chg)}</b></span>
         <span class="p ${r?.conflict ? 'is-warn' : ''}">reading <b>${r ? r.label : '—'}</b></span>
         <span class="p">from <b>${r ? Math.round(r.coverage * 100) : 0}%</b> of the picture</span>`
      : `<span class="p">nothing tracked yet</span>`;

    wall.innerHTML =
      board({ label: t ? `on the bench — ${name}` : 'on the bench', tag: 'WAR-1', wide: true,
        body: (loadingDetail ? `<div class="st-flatempty">reading ${name}…</div>` : '') + verdictPanel(r, { missing }) }) +
      board({ label: 'how sure, and why', tag: 'WAR-2',
        body: r && r.label !== 'no reading'
          ? confidenceGauge(r.confidence, { note: `${Math.round(r.coverage * 100)}% of the inputs reported` })
          : `<div class="st-flatempty">No reading to be sure about.</div>` }) +
      board({ label: 'how this reading was made', tag: 'WAR-3', full: true, body: arithmetic(r, missing) }) +
      board({ label: 'where they disagree', tag: 'WAR-4', wide: true, body: disagreement(r) }) +
      board({ label: `the whole book — ${tokens.length} assessed`, tag: 'WAR-5', full: true, body: bookRows() }) +
      board({ label: 'what this room cannot see', tag: 'WAR-6', full: true, body: blindSpots() });

    wall.querySelectorAll('[data-pick]').forEach((el) =>
      el.addEventListener('click', () => select(el.dataset.pick)));
    benchMotif();
  }

  /** Selecting a coin costs ONE extra IPC call (its social reading). Every other
   *  number on every board is already in the getTokens() snapshot. */
  async function select(ca) {
    if (ca === sel && social) return;
    sel = ca; social = null; loadingDetail = true;
    render();
    try { social = await window.mcii.socialFor(ca); }
    catch { social = null; }
    loadingDetail = false;
    if (active) render();
  }

  async function load() {
    // ! getTokens() resolves to the ARRAY itself, not {tokens: [...]} — see
    // preload.js ('tokens:list') and every call site in app.js. Unwrapping a
    // .tokens property here silently produced an empty room that still
    // rendered every board, which is the failure mode that looks like a
    // design problem and is actually a data-shape one.
    try { tokens = (await window.mcii.getTokens()) || []; }
    catch { tokens = []; }
    if (!sel && tokens.length) {
      sel = tokens[0].ca;
      render();
      // Fire and forget: the room is already useful without the social read.
      select(sel);
      return;
    }
    render();
  }

  if (window.mcii?.onRefreshed) window.mcii.onRefreshed(() => { if (active) load(); });

  return {
    show() { active = true; root.hidden = false; load(); },
    hide() { active = false; root.hidden = true; },
    isActive: () => active,
    /** Arriving from a "How was this read?" link in another room: put THAT coin
     *  on the bench rather than whichever one load() would have defaulted to.
     *  Called right after show(), so tokens may not have landed yet — setting
     *  `sel` first is what makes load() honour it instead of picking tokens[0]. */
    focus(ca) {
      if (!ca || ca === sel) return;
      sel = ca; social = null;
      if (active) select(ca);
    },
  };
}
