/**
 * room-watch — "Your Coins", rebuilt to the operator's own brief (ROOM-BRIEF §1, §9):
 * the render was right, the execution was not — "Everything was overlapping, none of
 * the information was clear". And §9 asked for five readings on one screen: what the
 * coins did today, the social picture for those coins, a better graph, the wallets
 * that bought, and a fused daily value indicator.
 *
 * Four of those five are here. The fifth — "top wallets that purchased the coin that
 * day" — has no feed in this app yet (walletflow.js is unwired, data/wallets.json is
 * empty), so it appears in the verdict panel as an input that reported NOTHING rather
 * than as an invented number or a silently dropped row. Same for the real-world-event
 * star: no event source exists, so no star is drawn. A mark that maps to nothing is a
 * lie, and once the eye catches one fake mark it stops trusting the real instruments
 * (design/DESIGN.md, the anti-emptiness rule).
 */
import { mountRoom, board, lampCell, esc, fmtUsd, pctStr, pctCls, askText } from './rooms.js';
import { stripChart, wireChart, spark, confidenceGauge, verdictPanel } from './readouts.js';
import { readCoin } from './synthesis.js';

// Same rule as app.js's chg24Of (D-117): DexScreener's own 24h figure is tied
// to whichever pool is currently deepest, which can change — so our own
// recorded history is preferred once there is enough of it (>=20 of 24h
// actually covered). Duplicated here rather than imported; see rooms.js.
function chg24Of(t) {
  const p = t.trend?.price24h;
  if (p && p.spanHours >= 20) return p.pct;
  return t.market?.priceChange?.h24 ?? null;
}

/** Daily candles ride along in getTokens() already — free sparkline, no extra IPC
 *  per row. The dense per-reading series is fetched only for the ONE selected coin. */
const candles = (t) => (t.history?.days || []).map((d) => ({ ts: d.ts, v: d.c, vol: d.v }));

export function initWatchRoom(root) {
  const { pill, wall, beyond } = mountRoom(root, { beyondClass: 'rm-watch', tag: 'WCH', title: 'Your Coins' });
  let active = false;
  let tokens = [];
  let sel = null;            // ca of the coin the detail boards are reading
  let days = 1;              // chart window
  let series = null;         // dense price+volume series for `sel`
  let social = null;         // socialFor(sel)
  let loadingDetail = false;

  function berths() {
    const shown = tokens.slice(0, 12);
    beyond.innerHTML = `<div class="fl-rail"></div><div class="fl-berths">${shown.map((t) => {
      const v = t.gate?.verdict;
      const cls = v === 'PASS' ? 'ok' : v === 'CAUTION' ? 'warn' : v === 'FAIL' ? 'alarm' : 'dim';
      const chg = chg24Of(t);
      // The berth's own height carries the day's move — the dock reads as a
      // skyline of what happened today before a single number is read.
      const lift = chg == null ? 0 : Math.max(-16, Math.min(16, chg / 2));
      return `<div class="fl-berth ${t.ca === sel ? 'is-sel' : ''}" style="--lift:${lift.toFixed(1)}px" data-berth="${esc(t.ca)}" title="${esc(t.nick || t.sym || '')}">
        <div class="fl-collar ${cls}"></div><span class="fl-berth-tag">${esc((t.nick || t.sym || '?').slice(0, 4))}</span></div>`;
    }).join('')}</div>`;
    beyond.querySelectorAll('[data-berth]').forEach((b) => b.addEventListener('click', () => select(b.dataset.berth)));
    beyond.style.pointerEvents = 'auto';
  }

  function row(t) {
    const g = t.gate, m = t.market, x = t.exit;
    const chg = chg24Of(t);
    const reading = readCoin(t, t.ca === sel ? social : null, null);
    // ! "no reading" is not "neutral". A coin nothing has been measured on must
    // not sit in the same column state as one measured and found unremarkable.
    const none = reading.label === 'no reading';
    const word = none ? 'not read yet'
      : reading.conflict ? 'conflicting'
      : reading.score > 0.18 ? 'opportunity' : reading.score < -0.18 ? 'risk' : 'neutral';
    const tone = none ? 'none' : reading.conflict ? 'warn' : reading.score > 0.18 ? 'up' : reading.score < -0.18 ? 'down' : 'flat';
    return `<div class="st-flatrow is-pick ${t.ca === sel ? 'is-sel' : ''}" data-pick="${esc(t.ca)}">
      <span class="name">${lampCell(g ? g.verdict : '—', g?.verdict)}${esc(t.nick || t.sym || '?')}</span>
      <span class="chip is-${tone}" title="${esc(reading.votes.map((v) => v.why).join(' · '))}">${word}</span>
      <span class="sp">${spark(candles(t))}</span>
      <span class="v">${m ? '$' + m.priceUsd.toPrecision(4) : '—'}</span>
      <span class="v ${pctCls(chg)}">${pctStr(chg)}</span>
      <span class="v">${x?.usd != null ? fmtUsd(x.usd) : '—'}</span>
      <button class="btn sm" data-open="${esc(t.ca)}">detail</button>
    </div>`;
  }

  function socialBoard(t) {
    if (!social || !social.latest) {
      return `<div class="st-flatempty">${loadingDetail ? 'reading…' : 'No social readings collected for this coin yet.'}</div>`;
    }
    const b = social.latest, rel = social.reliability || {}, br = social.breadth || {};
    const tone = b.sentiment == null ? '—' : b.sentiment > 0.2 ? 'positive' : b.sentiment < -0.2 ? 'negative' : 'mixed';
    const stat = (k, v, cls = '') => `<div class="st-stat"><span class="k">${esc(k)}</span><span class="v ${cls}">${v}</span></div>`;
    const posts = (b.topPosts || []).slice(0, 3).map((p) => `<div class="st-post">
        <div class="h"><b>${esc(p.handle ? '@' + p.handle : 'unknown')}</b><span>${Number(p.views || 0).toLocaleString()} views</span></div>
        <div class="t">${esc(p.text)}</div></div>`).join('');
    return `<div class="st-stats">
        ${stat('people posting', b.uniqueAuthors ?? '—')}
        ${stat('tone', tone, b.sentiment > 0.2 ? 'is-up' : b.sentiment < -0.2 ? 'is-down' : '')}
        ${stat('vs usual', br.value != null ? (br.value >= 0 ? '+' : '') + br.value : '—', br.value > 0 ? 'is-up' : br.value < 0 ? 'is-down' : '')}
        ${stat('bot-looking', b.botRatio != null ? Math.round(b.botRatio * 100) + '%' : '—', b.botRatio > 0.4 ? 'is-down' : '')}
      </div>
      ${rel.verdict ? `<p class="st-say ${rel.manipulated ? 'is-warn' : ''}">${esc(rel.verdict)}</p>` : ''}
      ${posts}`;
  }

  function render() {
    const withGate = tokens.filter((t) => t.gate);
    const pass = withGate.filter((t) => t.gate.verdict === 'PASS').length;
    const caution = withGate.filter((t) => t.gate.verdict === 'CAUTION').length;
    const fail = withGate.filter((t) => t.gate.verdict === 'FAIL').length;
    const alerts = tokens.flatMap((t) => t.alerts || []);
    const rank = { CRITICAL: 0, HIGH: 1, MED: 2 };
    alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);

    pill.innerHTML =
      `<span class="p is-up"><b>${pass}</b> passed</span>` +
      (caution ? `<span class="p is-warn"><b>${caution}</b> caution</span>` : '') +
      (fail ? `<span class="p is-down"><b>${fail}</b> failed</span>` : '') +
      (alerts.length ? `<span class="p is-down"><b>${alerts.length}</b> alerts</span>` : '');

    berths();

    const t = tokens.find((x) => x.ca === sel) || null;
    const reading = t ? readCoin(t, social, null) : null;
    const chg = t ? chg24Of(t) : null;

    const tableBody = tokens.length
      ? `<div class="st-flathead"><span class="name">coin</span><span class="chip">today</span><span class="sp">24h shape</span><span class="v">price</span><span class="v">24h</span><span class="v">sellable</span><span class="v"></span></div>`
        + tokens.map(row).join('')
      : `<div class="st-flatempty">Watchlist is empty — search above to add any memecoin.</div>`;

    const chartHead = t ? `<div class="st-chart-top">
        <span class="who">${esc(t.nick || t.sym || '')}</span>
        <span class="px">${t.market ? '$' + t.market.priceUsd.toPrecision(5) : '—'}</span>
        <span class="mv ${pctCls(chg)}">${pctStr(chg)}</span>
        <span class="rng">${[1, 7, 30].map((d) => `<button class="btn sm ${d === days ? 'accent' : ''}" data-days="${d}">${d}d</button>`).join('')}</span>
      </div>` : '';

    const chartBody = !t ? `<div class="st-flatempty">Pick a coin above.</div>`
      : chartHead + stripChart(series && series.length ? series : candles(t), { label: t.sym, spanLabel: `${days}d` });

    const alertBody = alerts.length
      ? alerts.slice(0, 8).map((a) => `<div class="st-flatrow"><span class="name">${lampCell(a.severity, a.severity)}</span><span class="grow">${esc(a.title)} — ${esc(a.detail)}</span></div>`).join('')
      : `<div class="st-flatempty">No alerts. Nothing tracked has moved enough to flag.</div>`;

    wall.innerHTML =
      board({ label: `your coins — ${tokens.length} tracked`, tag: 'WCH-1', full: true, body: tableBody }) +
      board({ label: t ? `price — ${esc(t.nick || t.sym)}` : 'price', tag: 'WCH-2', wide: true, body: chartBody }) +
      board({ label: 'how sure', tag: 'WCH-3', body: reading
        ? confidenceGauge(reading.confidence, { note: `${Math.round(reading.coverage * 100)}% of the inputs reported` })
        : `<div class="st-flatempty">—</div>` }) +
      // ! the SPANS are the row layout. flex-wrap packs greedily, so a lone
      // narrow board at the end of the list stretches to the full width and
      // reads as a nearly empty panel. `full` on the verdict forces the break
      // that pairs social with alerts instead of stranding it.
      board({ label: t ? `today's read — ${esc(t.nick || t.sym)}` : "today's read", tag: 'WCH-4', full: true,
        // The War Room has no door on the Observatory's ring (it is full — see
        // rooms.css), so the way into the deep synthesis is from the coin you
        // are already reading. §21: compact panel here, the arithmetic there.
        body: reading
          ? verdictPanel(reading, { missing: missingFor(reading) })
            + `<button class="st-verdict-why" data-war="${esc(t.ca)}">How was this read? →</button>`
          : `<div class="st-flatempty">Pick a coin above.</div>` }) +
      board({ label: t ? `social — ${esc(t.nick || t.sym)}` : 'social', tag: 'SIG-1', wide: true, body: t ? socialBoard(t) : `<div class="st-flatempty">Pick a coin above.</div>` }) +
      board({ label: `alerts — ${alerts.length} open`, tag: 'WCH-5', wide: true, body: alertBody });

    wall.querySelectorAll('[data-war]').forEach((el) => el.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('mcii:open-room', { detail: { view: 'war', ca: el.dataset.war } }));
    }));
    wireChart(wall);
    wall.querySelectorAll('[data-pick]').forEach((el) => el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;      // the row's own buttons keep their jobs
      select(el.dataset.pick);
    }));
    wall.querySelectorAll('[data-days]').forEach((b) => b.addEventListener('click', () => {
      days = Number(b.dataset.days); series = null; render(); loadDetail();
    }));
    wall.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('mcii:open-flat', { detail: { view: 'watch', ca: b.dataset.open } }));
    }));
    wall.querySelectorAll('[data-rename]').forEach((b) => b.addEventListener('click', async () => {
      const ca = b.dataset.rename;
      const tok = tokens.find((x) => x.ca === ca);
      const name = await askText('What do you want to call this coin?', { value: tok?.nick || '', ok: 'Save name' });
      if (name === null) return;
      await window.mcii.renameToken(ca, name);
      refresh();
    }));
  }

  /** Which inputs had nothing to say. Shown in the panel so the confidence
   *  number is explainable — and so the two feeds that do not exist yet stay
   *  visible as gaps rather than quietly vanishing from the room. */
  function missingFor(reading) {
    const have = new Set(reading.votes.map((v) => v.key));
    return ['market', 'safety', 'social', 'trader'].filter((k) => !have.has(k));
  }

  function select(ca) {
    if (ca === sel) return;
    sel = ca; series = null; social = null;
    render();
    loadDetail();
  }

  /** The two per-coin calls, made ONLY for the selected coin. A watchlist of
   *  thirty coins must not fire sixty IPC calls to draw one table. */
  async function loadDetail() {
    const ca = sel;
    if (!ca) return;
    loadingDetail = true;
    const windowDays = days;
    const [price, vol, soc] = await Promise.all([
      window.mcii.historySeries(ca, 'price', windowDays).catch(() => []),
      window.mcii.historySeries(ca, 'v24', windowDays).catch(() => []),
      window.mcii.socialFor(ca).catch(() => null),
    ]);
    if (!active || sel !== ca || days !== windowDays) return;   // a later pick already won
    const volAt = new Map((vol || []).map((p) => [p.ts, p.v]));
    series = (price || []).map((p) => ({ ts: p.ts, v: p.v, vol: volAt.get(p.ts) || 0 }));
    social = soc;
    loadingDetail = false;
    render();
  }

  async function refresh() {
    if (!active) return;
    let next = [];
    try { next = await window.mcii.getTokens(); } catch { return; }
    if (!active) return;
    tokens = next;
    if (!sel || !tokens.some((t) => t.ca === sel)) {
      sel = tokens[0]?.ca || null;
      series = null; social = null;
      render();
      loadDetail();
      return;
    }
    render();
  }

  window.mcii.onRefreshed(refresh);
  window.mcii.onLive(refresh);
  window.mcii.onLiveAlert(refresh);

  return {
    show() { active = true; root.hidden = false; refresh(); },
    hide() { active = false; root.hidden = true; },
  };
}
