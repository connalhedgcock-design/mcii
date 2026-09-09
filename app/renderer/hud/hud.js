/**
 * The live trading HUD's own renderer -- quick/live trading on new or just-bonding coins, the
 * gap Connal named directly: "quickly eliminate coins that look like heavy insider/dev activity",
 * buy ones that "look legit with a good narrative", "buy the dip" rather than the top.
 *
 * Deliberately not one of the station/room-*.js modules -- this is a separate, small, always-
 * on-top BrowserWindow (`main/hud.js`), not a tab inside the main app shell. It reuses the chart
 * primitive from readouts.js (same visual language as the rest of the app) but writes its own
 * compact layout, since the room scaffold in rooms.js assumes the big three-pane station shell
 * this window deliberately doesn't have.
 *
 * ! Refreshes on its OWN short timer rather than riding the main window's LiveMonitor
 * (`onLive`/`onLiveAlert`): the coins this HUD exists for are quick/live plays that are often NOT
 * on the watchlist at all (that is the whole point of room-story's "any address" lookup feeding
 * it), and LiveMonitor only ever watches `store.watchlist`. Polling `tradeHud()` directly works
 * identically whether or not the pinned coin is tracked, at the cost of a real network round trip
 * every tick rather than a push -- a fair trade for a small, occasional window, not the main app.
 */
import { stripChart, wireChart } from '../station/readouts.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (v) => v == null ? '—' : v >= 1000 ? '$' + Math.round(v).toLocaleString() : v >= 1 ? '$' + v.toFixed(4) : '$' + v.toPrecision(3);
const pct = (v) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
const ago = (ts) => {
  if (!ts) return '—';
  const m = Math.round((Date.now() - ts) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
};

const REFRESH_MS = 20000;

const root = document.getElementById('root');
let ca = null;
let data = null;
let loading = false;
let error = null;
let timer = null;

function matchChip(ind) {
  const cls = ind.match === true ? 'yes' : ind.match === 'partial' ? 'partial'
    : ind.match === false ? 'no' : 'na';
  const word = ind.match === true ? 'YES' : ind.match === 'partial' ? 'forming' : ind.match === false ? 'no' : '—';
  return `<span class="hud-chip is-${cls}">${word}</span>`;
}

function indicatorRow(ind) {
  return `<div class="hud-ind">
    <div class="hud-ind-h"><span class="hud-ind-l">${esc(ind.label)}</span>${matchChip(ind)}</div>
    <div class="hud-ind-d">${esc(ind.detail)}</div>
  </div>`;
}

function forensicsBody(f) {
  if (!f) return `<div class="hud-empty">—</div>`;
  return `
    <div class="hud-ind"><div class="hud-ind-h"><span class="hud-ind-l">balance diversity (top 5)</span>
      ${f.balanceRead.match === 'similar-and-low' ? '<span class="hud-chip is-no">WATCH</span>'
        : f.balanceRead.match ? '<span class="hud-chip is-yes">ok</span>' : '<span class="hud-chip is-na">—</span>'}</div>
      <div class="hud-ind-d">${esc(f.balanceRead.detail)}</div></div>
    <div class="hud-ind"><div class="hud-ind-h"><span class="hud-ind-l">funding source clustering</span>
      ${(f.fundingRead.sameFunderClusters.length || f.fundingRead.dateClusters.length) ? '<span class="hud-chip is-no">WATCH</span>' : '<span class="hud-chip is-yes">ok</span>'}</div>
      <div class="hud-ind-d">${esc(f.fundingRead.detail)}</div></div>`;
}

function creatorBody(c) {
  if (!c) return `<div class="hud-empty">—</div>`;
  if (!c.available) return `<div class="hud-empty">${esc(c.reason)}</div>`;
  return `<div class="hud-ind"><div class="hud-ind-h"><span class="hud-ind-l">creator's other coins</span>
      ${c.flaggedCount > 0 ? '<span class="hud-chip is-no">WATCH</span>' : c.checkedCount > 0 ? '<span class="hud-chip is-yes">ok</span>' : '<span class="hud-chip is-na">unchecked</span>'}</div>
      <div class="hud-ind-d">${esc(c.detail)}</div></div>`;
}

function narrativeBody(n) {
  if (!n) return `<div class="hud-empty">—</div>`;
  if (n.error) return `<div class="hud-empty">Could not look this up: ${esc(n.error)}</div>`;
  const rows = [
    ...(n.items || []).slice(0, 3).map((i) => ({ text: i.title, sub: i.source, url: i.link })),
    ...((n.xPosts && n.xPosts.posts) || []).slice(0, 3).map((p) => ({ text: p.text, sub: p.handle ? '@' + p.handle : 'X', url: p.url })),
  ];
  if (!rows.length) return `<div class="hud-empty">Nothing found yet under this coin's name -- not unusual for a brand-new coin.</div>`;
  return rows.map((r) => `<a class="hud-newsrow" href="#" data-open="${esc(r.url || '')}">
      <span class="t">${esc((r.text || '').slice(0, 90))}</span><span class="s">${esc(r.sub || '')}</span></a>`).join('');
}

function render() {
  const t = data;
  root.innerHTML = `
    <div class="hud-bar" id="dragbar">
      <span class="hud-title">${t ? esc(t.symbol || t.name || ca) : 'live trading HUD'}</span>
      <button class="hud-x" id="close" title="unpin">✕</button>
    </div>
    ${error ? `<div class="hud-error">${esc(error)}</div>` : ''}
    ${!t ? `<div class="hud-empty" style="padding:16px">${loading ? 'reading…' : 'pin a coin to get started'}</div>` : `
      <div class="hud-price">
        <b>${money(t.priceUsd)}</b>
        <span class="hud-sub">mcap ${money(t.marketCap)} · liq ${money(t.liquidityUsd)}</span>
      </div>
      <div class="hud-chartwrap">${stripChart(t.priceSeries, { h: 130, label: t.symbol })}</div>
      <div class="hud-section">
        <div class="hud-sec-h">the shape (${t.minuteCandleCount} min. candles${t.minuteFeedError ? `, ${esc(t.minuteFeedError)}` : ''})</div>
        ${t.shape.indicators.map(indicatorRow).join('')}
      </div>
      <div class="hud-section">
        <div class="hud-sec-h">top-5 holder wallets</div>
        ${forensicsBody(t.forensics)}
      </div>
      <div class="hud-section">
        <div class="hud-sec-h">creator's history</div>
        ${creatorBody(t.creatorHistory)}
      </div>
      <div class="hud-section">
        <div class="hud-sec-h">the story</div>
        ${narrativeBody(t.narrative)}
      </div>
      <div class="hud-foot">updated ${ago(t.builtAt)} · refreshes every ${REFRESH_MS / 1000}s while pinned</div>
    `}
  `;
  wireChart(root);
  root.querySelector('#close')?.addEventListener('click', () => window.mcii.unpinHud());
  root.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    if (el.dataset.open) window.mcii.openExternal(el.dataset.open);
  }));
}

async function refresh() {
  if (!ca) return;
  loading = !data; // only show the full "reading..." state on the very first load
  error = null;
  render();
  try {
    data = await window.mcii.tradeHud(ca);
  } catch (e) {
    error = `Could not read this coin: ${e.message || e}`;
  }
  loading = false;
  render();
}

function startPolling() {
  clearInterval(timer);
  timer = setInterval(refresh, REFRESH_MS);
}

window.mcii.onHudCoin((newCa) => {
  if (newCa === ca) { refresh(); return; }
  ca = newCa;
  data = null;
  error = null;
  refresh();
  startPolling();
});

render();
