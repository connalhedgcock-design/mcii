/**
 * readouts — the instruments the ROOM-BRIEF added, shared by more than one room:
 * a real strip chart (§9: "the graph (which i want improved the graph is shit)"),
 * the confidence needle (§19: "Needle could be cool with like a confidence
 * meter"), and the fused verdict panel that carries both (§17, §18).
 *
 * Two rules from design/DESIGN.md are load-bearing here:
 *  - REUSE THE SILHOUETTE. The arc gauge already exists in station.css
 *    (.st-arc, --v drives fill AND needle over a 270° sweep). The confidence
 *    meter is that instrument pointed at a different number, not a new dial.
 *  - EVERY MARK ENCODES SOMETHING. No decorative ticks. The chart's volume bars
 *    are real volume, its gridlines are real prices, and when there is no
 *    history it says so instead of drawing a flat line through one point.
 */
import { esc } from './rooms.js';

// ── the chart ──────────────────────────────────────────────────────────────

const niceStep = (span, target = 4) => {
  const raw = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / mag;
  return (n >= 5 ? 10 : n >= 2 ? 5 : n >= 1 ? 2 : 1) * mag;
};
const money = (v) => v == null ? '—'
  : v >= 1000 ? '$' + Math.round(v).toLocaleString()
  : v >= 1 ? '$' + v.toFixed(2)
  : '$' + v.toPrecision(3);
const shortDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const shortTime = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * A strip chart with the three things the flat one never had: a priced Y axis,
 * a dated X axis, and a crosshair that reads out the actual point under the
 * cursor. Shape over time IS the reading (DESIGN.md's own words), so the shape
 * gets the whole box and the decoration gets none of it.
 *
 * @param points [{ts, v, vol?}] — oldest first. Denser than daily candles when
 *        historySeries() has readings; falls back to whatever it is given.
 */
export function stripChart(points, { h = 190, label = '', spanLabel = '' } = {}) {
  const pts = (points || []).filter((p) => p && p.v != null);
  if (pts.length < 2) {
    return `<div class="st-chart is-empty"><span>${pts.length ? 'one reading so far' : 'no price history recorded yet'}</span></div>`;
  }
  const W = 1000, padL = 4, padR = 62, padT = 12, volH = 26, axisH = 16;
  const plotH = h - padT - volH - axisH;
  const vals = pts.map((p) => p.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi === lo) { hi = lo * 1.02 || 1; lo = lo * 0.98; }
  const step = niceStep(hi - lo);
  const gridLo = Math.ceil(lo / step) * step;

  const x = (i) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * plotH;

  const line = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = `${line}L${x(pts.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)}L${padL},${(padT + plotH).toFixed(1)}Z`;
  const up = vals[vals.length - 1] >= vals[0];

  let grid = '';
  for (let v = gridLo; v <= hi; v += step) {
    const gy = y(v).toFixed(1);
    grid += `<line class="g" x1="${padL}" x2="${W - padR}" y1="${gy}" y2="${gy}"/>`
      + `<text class="gt" x="${W - padR + 6}" y="${gy}" dy="3.5">${money(v)}</text>`;
  }

  const vols = pts.map((p) => p.vol || 0);
  const vmax = Math.max(...vols);
  const bw = Math.max(1, ((W - padL - padR) / pts.length) * 0.7);
  const bars = vmax ? vols.map((v, i) =>
    `<rect class="vb" x="${(x(i) - bw / 2).toFixed(1)}" y="${(padT + plotH + volH - (v / vmax) * volH).toFixed(1)}" width="${bw.toFixed(1)}" height="${((v / vmax) * volH).toFixed(1)}"/>`).join('') : '';

  const lastX = x(pts.length - 1), lastY = y(vals[vals.length - 1]);
  const spanH = (pts[pts.length - 1].ts - pts[0].ts) / 36e5;
  const xTicks = [0, Math.floor((pts.length - 1) / 2), pts.length - 1].map((i, k) =>
    `<text class="xt" x="${x(i).toFixed(1)}" y="${h - 3}" text-anchor="${k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}">${
      spanH <= 36 ? shortTime(pts[i].ts) : shortDate(pts[i].ts)}</text>`).join('');

  const series = pts.map((p) => `${p.ts}:${p.v}${p.vol ? ':' + p.vol : ''}`).join(',');
  return `<div class="st-chart ${up ? 'is-up' : 'is-down'}" data-series="${series}" data-lo="${lo}" data-hi="${hi}">
    <svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(label || 'price')} over ${spanLabel || 'the recorded window'}">
      ${grid}
      <path class="ar" d="${area}"/>
      <path class="ln" d="${line}"/>
      ${bars}
      <line class="base" x1="${padL}" x2="${W - padR}" y1="${(padT + plotH).toFixed(1)}" y2="${(padT + plotH).toFixed(1)}"/>
      <circle class="dot" cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5"/>
      <line class="cross" x1="0" x2="0" y1="${padT}" y2="${(padT + plotH + volH).toFixed(1)}" style="display:none"/>
      ${xTicks}
    </svg>
    <div class="st-chart-read"><b data-read-v>${money(vals[vals.length - 1])}</b><i data-read-t>latest${vmax ? ' · bars are volume' : ''}</i></div>
  </div>`;
}

/** The crosshair. Separate from the markup so a re-render never leaves a
 *  listener behind on a detached node — the chart is redrawn on every refresh. */
export function wireChart(rootEl) {
  rootEl.querySelectorAll('.st-chart[data-series]').forEach((box) => {
    const svg = box.querySelector('svg');
    const cross = box.querySelector('.cross');
    const rv = box.querySelector('[data-read-v]');
    const rt = box.querySelector('[data-read-t]');
    const fallbackV = rv.textContent, fallbackT = rt.textContent;
    const pts = box.dataset.series.split(',').map((s) => {
      const [ts, v, vol] = s.split(':');
      return { ts: +ts, v: +v, vol: vol ? +vol : 0 };
    });
    svg.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect();
      const f = (e.clientX - r.left) / r.width;
      const i = Math.max(0, Math.min(pts.length - 1, Math.round(f * (pts.length - 1))));
      cross.style.display = '';
      cross.setAttribute('x1', (4 + (i / (pts.length - 1)) * (1000 - 4 - 62)).toFixed(1));
      cross.setAttribute('x2', cross.getAttribute('x1'));
      rv.textContent = money(pts[i].v);
      rt.textContent = new Date(pts[i].ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        + (pts[i].vol ? ` · ${Math.round(pts[i].vol).toLocaleString()} traded` : '');
    });
    svg.addEventListener('mouseleave', () => {
      cross.style.display = 'none';
      rv.textContent = fallbackV; rt.textContent = fallbackT;
    });
  });
}

/** A sparkline small enough to live in a table row. No axes — at this size an
 *  axis is a smudge, and the row's own price/24h cells carry the numbers. */
export function spark(points, { w = 108, h = 26 } = {}) {
  const pts = (points || []).filter((p) => p && p.v != null);
  if (pts.length < 2) return `<span class="st-sparkline is-empty"></span>`;
  const vals = pts.map((p) => p.v);
  const lo = Math.min(...vals), hi = Math.max(...vals), span = (hi - lo) || hi || 1;
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${((i / (vals.length - 1)) * w).toFixed(1)},${(2 + (1 - (v - lo) / span) * (h - 4)).toFixed(1)}`).join('');
  const up = vals[vals.length - 1] >= vals[0];
  return `<svg class="st-sparkline ${up ? 'is-up' : 'is-down'}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d}"/></svg>`;
}

// ── the confidence needle ──────────────────────────────────────────────────

/**
 * The arc gauge from station.css, pointed at confidence instead of price.
 * ! the DIMMING is the point, not decoration: a needle that reads 0.2 and looks
 * as crisp as one reading 0.9 is a lie told in typography. Low confidence fades
 * the whole face, so a glance across the room reads "this instrument is not
 * sure" before any number is read.
 */
export function confidenceGauge(confidence, { note = '' } = {}) {
  const v = Math.max(0, Math.min(1, confidence || 0));
  const pct = Math.round(v * 100);
  const dim = (0.35 + 0.65 * v).toFixed(2);
  return `<div class="st-arc st-conf" style="--arc-d:74px;opacity:${dim}">
    <div class="st-arc-face" style="--v:${v.toFixed(3)}">
      <span class="st-arc-scale"></span>
      <span class="st-arc-fill"></span>
      <span class="st-arc-needle${v < 0.35 ? ' is-unsure' : ''}"></span>
      <span class="st-arc-hub"></span>
    </div>
    <div class="st-arc-read"><b>${pct}%</b><i>sure</i></div>
    <div class="st-arc-ends"><span>guess</span><span>certain</span></div>
    ${note ? `<div class="st-conf-note">${esc(note)}</div>` : ''}
  </div>`;
}

// ── the verdict ────────────────────────────────────────────────────────────

const VOTE_LABEL = { market: 'market', social: 'social', trader: 'trader flow', safety: 'safety' };

/**
 * §17, both halves at once: the fused verdict AND every input that produced it,
 * side by side, so the operator can overrule the fusion by reading the parts.
 * §18: a conflict paints the whole reading amber and names both sides rather
 * than averaging them into a shrug.
 *
 * `missing` names inputs that had nothing to report — shown, not hidden, so the
 * confidence number is explainable rather than mysterious.
 */
export function verdictPanel(reading, { missing = [], compact = false } = {}) {
  if (!reading || reading.label === 'no reading') {
    return `<div class="st-verdict is-none"><div class="st-flatempty">nothing measured on this coin yet</div></div>`;
  }
  const tone = reading.conflict ? 'warn' : reading.score > 0.18 ? 'up' : reading.score < -0.18 ? 'down' : 'flat';
  const word = reading.conflict ? 'conflicting' : reading.score > 0.18 ? 'opportunity' : reading.score < -0.18 ? 'risk' : 'neutral';
  const headline = reading.conflict
    ? `${reading.conflict.up.map((k) => VOTE_LABEL[k]).join(' + ')} up, ${reading.conflict.down.map((k) => VOTE_LABEL[k]).join(' + ')} down`
    : reading.label;

  // The score bar is centred on zero — a bar growing rightward from a left edge
  // cannot show a NEGATIVE reading without lying about its own baseline.
  const half = Math.round(Math.abs(reading.score) * 50);
  const bar = `<div class="st-vbar"><span class="zero"></span>
    <span class="fill is-${tone}" style="${reading.score >= 0 ? `left:50%;width:${half}%` : `right:50%;width:${half}%`}"></span></div>`;

  const votes = reading.votes.map((v) => `<div class="st-vote">
      <span class="k">${esc(VOTE_LABEL[v.key] || v.key)}</span>
      <span class="d is-${v.dir > 0 ? 'up' : v.dir < 0 ? 'down' : 'flat'}">${v.dir > 0 ? '▲' : v.dir < 0 ? '▼' : '—'}</span>
      <span class="w">${esc(v.why || '')}</span>
      <span class="c" title="how much this one reading can be trusted">${'▮'.repeat(Math.max(1, Math.round(v.conf * 4)))}<i>${'▮'.repeat(4 - Math.max(1, Math.round(v.conf * 4)))}</i></span>
    </div>`).join('')
    + missing.map((k) => `<div class="st-vote is-missing">
      <span class="k">${esc(VOTE_LABEL[k] || k)}</span><span class="d">·</span>
      <span class="w">nothing collected yet</span><span class="c"><i>▮▮▮▮</i></span></div>`).join('');

  return `<div class="st-verdict is-${tone}">
    <div class="st-verdict-head">
      <span class="st-verdict-word">${word}</span>
      <span class="st-verdict-say">${esc(headline)}</span>
    </div>
    ${bar}
    ${compact ? '' : `<div class="st-votes">${votes}</div>`}
  </div>`;
}
