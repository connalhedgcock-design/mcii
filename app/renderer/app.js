const $ = (s) => document.querySelector(s);
const fmtUsd = (n) => n == null ? '—' : '$' + Math.round(n).toLocaleString();
const fmtNum = (n) => n == null ? '—' : Number(n).toLocaleString();
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`; };

window.mcii.onProgress((m) => { $('#status').textContent = m || ''; });

function pctEl(v) {
  if (v == null) return '<span class="v">—</span>';
  const c = v >= 0 ? 'up' : 'down';
  return `<span class="v ${c}">${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%</span>`;
}

function findingsHtml(gate) {
  if (!gate) return '<div class="clear">Safety data unavailable.</div>';
  if (!gate.findings.length) return '<div class="clear">No risks flagged. Supply is fixed, tokens cannot be frozen, and ownership is not concentrated.</div>';
  return gate.findings.map((f) => `<div class="find">
      <span class="lv ${f.level}">${f.level}</span>
      <div><b>${esc(f.label)}</b><span>${esc(f.detail)}</span></div>
    </div>`).join('');
}


// --- charts -----------------------------------------------------------------
// Hand-drawn SVG. No chart library: the page loads nothing from the network, which keeps the
// strict content policy intact and means the app works offline against recorded data.
function priceChart(candles, w = 660, h = 132) {
  if (!candles || candles.length < 2) return '<div class="nodata">No price history available.</div>';
  const padB = 26, padT = 8;
  const closes = candles.map(c => c.c), vols = candles.map(c => c.v || 0);
  const lo = Math.min(...closes), hi = Math.max(...closes);
  const vmax = Math.max(...vols, 1);
  const span = (hi - lo) || hi || 1;
  const x = i => (i / (candles.length - 1)) * w;
  const y = v => padT + (1 - (v - lo) / span) * (h - padB - padT);

  const line = closes.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(c).toFixed(1)}`).join('');
  const area = `${line}L${w},${h - padB}L0,${h - padB}Z`;
  const bw = Math.max(1, (w / candles.length) * 0.62);
  const bars = vols.map((v, i) => {
    const bh = (v / vmax) * 18;
    return `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" class="vbar"/>`;
  }).join('');
  const up = closes[closes.length - 1] >= closes[0];
  const cls = up ? 'up' : 'down';
  const lastX = x(candles.length - 1), lastY = y(closes[closes.length - 1]);
  const gl = [0.25, 0.5, 0.75].map(f =>
    `<line x1="0" x2="${w}" y1="${(padT + f * (h - padB - padT)).toFixed(1)}" y2="${(padT + f * (h - padB - padT)).toFixed(1)}" class="grid"/>`).join('');

  return `<svg class="chart ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img"
      aria-label="Price over the last ${candles.length} days">
    ${gl}<path d="${area}" class="area"/><path d="${line}" class="line"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" class="dot"/>
    ${bars}</svg>
    <div class="axis"><span>${new Date(candles[0].ts).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span>
      <span>high $${hi.toPrecision(3)} · low $${lo.toPrecision(3)} · bars are daily volume</span>
      <span>today</span></div>`;
}

// Short verbal read on a recorded metric. Says "not enough data yet" rather than implying zero.
function trendLine(label, d, invertGood) {
  if (!d) return `<div class="tr none">${label}: not enough history recorded yet</div>`;
  const dir = d.pct >= 0 ? 'up' : 'down';
  const good = invertGood ? d.pct < 0 : d.pct >= 0;
  const hrs = d.spanHours < 1 ? 'under an hour' :
              d.spanHours < 48 ? `${Math.round(d.spanHours)} hours` : `${Math.round(d.spanHours / 24)} days`;
  return `<div class="tr ${good ? 'up' : 'down'}">${label}: <b>${dir} ${Math.abs(d.pct).toFixed(1)}%</b> over ${hrs}</div>`;
}

function card(t) {
  const g = t.gate, m = t.market, x = t.exit;
  const cls = !g ? '' : g.verdict === 'FAIL' ? 'fail' : g.verdict === 'CAUTION' ? 'caution' : 'pass';
  const held = t.position?.tokens && m ? t.position.tokens * m.priceUsd : null;
  return `<article class="card ${cls}" data-ca="${t.ca}">
    <div class="chead">
      <span class="sym">${esc(t.sym)}</span>
      <span class="nm">${esc(m?.name || '')}</span>
      <span class="livedot" title="updating live"></span>
      <span class="pill ${cls}">${g ? g.verdict : 'NO DATA'}</span>
    </div>
    <p class="verdict">${esc(t.sentence || 'Not enough data to give a verdict yet.')}</p>
    <div class="stats">
      <div class="stat hero"><span class="k">Sellable before −5%</span>
        <span class="v">${fmtUsd(x?.usd)}</span>
        <div class="s">${x ? fmtNum(x.tokens) + ' tokens' : 'not simulated'}</div></div>
      <div class="stat"><span class="k">Price</span>
        <span class="v">$${m ? m.priceUsd.toPrecision(4) : '—'}</span>
        <div class="s">${m?.poolCount ?? '—'} pools</div></div>
      <div class="stat"><span class="k">24h change</span>${pctEl(m?.priceChange?.h24)}
        <div class="s">1h ${m?.priceChange?.h1 ?? '—'}%</div></div>
      <div class="stat"><span class="k">Liquidity</span>
        <span class="v">${fmtUsd(m?.totalLiquidityUsd)}</span>
        <div class="s">market cap ${fmtUsd(m?.marketCap)}</div></div>
      <div class="stat"><span class="k">Holders</span>
        <span class="v">${fmtNum(t.safety?.totalHolders)}</span>
        <div class="s">top wallet ${t.safety?.top1Pct != null ? t.safety.top1Pct.toFixed(1) + '%' : '—'}</div></div>
    </div>
    <div class="chartwrap">
      ${priceChart((t.history && t.history.days) || [])}
    </div>
    <div class="trends">
      ${trendLine('Amount you could sell', t.trend?.exitUsd)}
      ${trendLine('Liquidity in the pools', t.trend?.liq)}
      ${trendLine('Number of holders', t.trend?.holders)}
      ${trendLine('Share held by top 10 wallets', t.trend?.top10, true)}
      <div class="tr none">${t.trend?.recorded ?? 0} readings recorded so far</div>
    </div>
    <div class="posrow">
      <label for="p-${t.ca}">Your position</label>
      <input id="p-${t.ca}" type="number" placeholder="how many tokens" value="${t.position?.tokens ?? ''}">
      <span class="hint">${held != null ? 'Worth about ' + fmtUsd(held) + ' on paper.' : 'Enter this and the verdict tells you if you can actually get out.'}</span>
      <button class="btn sm danger rm" style="margin-left:auto">Remove</button>
    </div>
    <details><summary>Safety checks — what was tested</summary><div class="dbody">
      ${findingsHtml(g)}
      <dl class="kv">
        <dt>Can new supply be minted?</dt><dd>${t.safety ? (t.safety.mintAuthority ? 'YES — risk' : 'No') : '—'}</dd>
        <dt>Can your tokens be frozen?</dt><dd>${t.safety ? (t.safety.freezeAuthority ? 'YES — risk' : 'No') : '—'}</dd>
        <dt>Token details editable?</dt><dd>${t.safety ? (t.safety.metadataMutable ? 'YES — risk' : 'No') : '—'}</dd>
        <dt>Liquidity lock</dt><dd>${g ? g.lpStatus : '—'}</dd>
        <dt>Top 10 wallets hold</dt><dd>${t.safety?.top10Pct != null ? t.safety.top10Pct.toFixed(1) + '%' : '—'}</dd>
      </dl>
    </div></details>
    <details><summary>Where these numbers came from</summary><div class="dbody">
      <dl class="kv">
        <dt>Contract address</dt><dd style="font-size:11px">${esc(t.ca)}</dd>
        <dt>Market data</dt><dd>DexScreener · ${m ? ago(m.fetchedAt) : '—'}</dd>
        <dt>Safety checks</dt><dd>RugCheck · ${t.safety ? ago(t.safety.fetchedAt) : '—'}</dd>
        <dt>Sale simulation</dt><dd>Jupiter · ${x ? ago(x.fetchedAt) : '—'}</dd>
        <dt>24h volume</dt><dd>${fmtUsd(m?.volume?.h24)}</dd>
        <dt>Buys / sells (24h)</dt><dd>${fmtNum(m?.txns?.h24?.buys)} / ${fmtNum(m?.txns?.h24?.sells)}</dd>
      </dl>
    </div></details>
    ${t.errors?.length ? `<div class="err">${t.errors.map(esc).join(' · ')}</div>` : ''}
  </article>`;
}

function render(tokens) {
  $('#grid').innerHTML = tokens.map(card).join('') ||
    '<div class="skel">Watchlist is empty — search above to add any memecoin.</div>';
  $('#stamp').textContent = 'updated ' + new Date().toLocaleTimeString();
  document.querySelectorAll('.posrow input').forEach((el) => {
    el.addEventListener('change', async () => {
      const ca = el.closest('.card').dataset.ca;
      await window.mcii.setPosition(ca, el.value);
      load();
    });
  });
  document.querySelectorAll('.rm').forEach((b) => {
    b.addEventListener('click', async () => {
      await window.mcii.removeToken(b.closest('.card').dataset.ca);
      load();
    });
  });
}

function renderAlerts(tokens) {
  const all = tokens.flatMap((t) => t.alerts || []);
  const rank = { CRITICAL: 0, HIGH: 1, MED: 2 };
  all.sort((a, b) => rank[a.severity] - rank[b.severity]);
  const anyHistory = tokens.some((t) => (t.trend?.recorded || 0) > 1);
  if (!all.length) {
    $('#alerts').innerHTML = anyHistory
      ? '<div class="quiet">No alerts. Nothing tracked has moved enough to flag.</div>'
      : '<div class="quiet">Alerts need at least two readings to compare. Leave the app open and they start working.</div>';
    return;
  }
  $('#alerts').innerHTML =
    `<div class="ahead">${all.length} alert${all.length > 1 ? 's' : ''}</div>` +
    all.map((a) => `<div class="alert ${a.severity}">
      <span class="as">${a.severity}</span>
      <div><b>${esc(a.title)}</b><span>${esc(a.detail)}</span></div>
    </div>`).join('');
}

async function load() {
  $('#grid').innerHTML = '<div class="skel">READING CHAIN DATA…</div>';
  const tokens = await window.mcii.getTokens();
  renderAlerts(tokens);
  render(tokens);
}

async function search() {
  const q = $('#q').value.trim();
  if (!q) return;
  $('#results').innerHTML = '<div class="rhead">searching…</div>';
  const rows = await window.mcii.search(q);
  if (!rows.length) { $('#results').innerHTML = '<div class="rhead">nothing found</div>'; return; }
  const dupes = rows.filter((r) => r.symbol.toLowerCase() === rows[0].symbol.toLowerCase()).length;
  $('#results').innerHTML =
    (dupes > 1 ? `<div class="warnbar"><b>${dupes} different tokens share this ticker.</b>
      Copycats deliberately reuse the name and logo of whatever is trending. Match the contract
      address against your own wallet — never pick by name.</div>` : '') +
    `<div class="rhead"><span>${rows.length} results — sorted by liquidity</span><span>click add to analyse</span></div>` +
    rows.map((r) => `<div class="rrow" data-ca="${r.ca}" data-sym="${esc(r.symbol)}">
      <span class="rsym">${esc(r.symbol)}</span>
      <span class="rnm">${esc(r.name)} <span class="chain">${esc(r.chain)}</span></span>
      <span class="rn">${fmtUsd(r.marketCap)}<br><span style="color:var(--muted);font-size:10px">mkt cap</span></span>
      <span class="rn">${fmtUsd(r.liquidityUsd)}<br><span style="color:var(--muted);font-size:10px">liquidity</span></span>
      <span class="rn ${r.change24h >= 0 ? 'up' : 'down'}">${r.change24h != null ? r.change24h.toFixed(1) + '%' : '—'}</span>
      <span class="rn">${r.ageDays != null ? Math.round(r.ageDays) + 'd' : '—'}</span>
      <button class="btn sm add">Add</button>
    </div>`).join('');
  document.querySelectorAll('.add').forEach((b) => {
    b.addEventListener('click', async () => {
      const row = b.closest('.rrow');
      b.textContent = 'adding…'; b.disabled = true;
      await window.mcii.addToken(row.dataset.ca, row.dataset.sym);
      $('#results').innerHTML = ''; $('#q').value = '';
      load();
    });
  });
}

window.mcii.onRefreshed(() => load());

// --- live updates -----------------------------------------------------------
// Patch the numbers in place rather than re-rendering the card. A full redraw every fifteen
// seconds would collapse open detail sections and fight the user mid-scroll.
const liveState = new Map();
window.mcii.onLive((t) => {
  liveState.set(t.ca, t);
  const card = document.querySelector(`.card[data-ca="${t.ca}"]`);
  if (!card || !t.market) return;

  const set = (sel, val, flash) => {
    const el = card.querySelector(sel);
    if (!el || el.textContent === val) return;
    el.textContent = val;
    if (flash) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
  };
  const stats = card.querySelectorAll('.stat');
  set('.stat:nth-child(2) .v', '$' + t.market.priceUsd.toPrecision(4), true);
  set('.stat:nth-child(4) .v', fmtUsd(t.market.totalLiquidityUsd), true);
  if (t.exit) set('.stat.hero .v', fmtUsd(t.exit.usd), true);
  const ch = card.querySelector('.stat:nth-child(3) .v');
  if (ch && t.market.priceChange?.h24 != null) {
    const v = t.market.priceChange.h24;
    ch.textContent = (v >= 0 ? '+' : '') + Number(v).toFixed(1) + '%';
    ch.className = 'v ' + (v >= 0 ? 'up' : 'down');
  }
  const dot = card.querySelector('.livedot');
  if (dot) { dot.classList.remove('pulse'); void dot.offsetWidth; dot.classList.add('pulse'); }
});

window.mcii.onLiveAlert((a) => {
  const box = $('#alerts');
  const el = document.createElement('div');
  el.className = 'alert ' + a.severity + ' justin';
  el.innerHTML = `<span class="as">${a.severity}</span><div><b>${esc(a.title)}</b><span>${esc(a.detail)}</span></div>`;
  box.insertBefore(el, box.firstChild);
});
$('#refresh').addEventListener('click', load);
$('#go').addEventListener('click', search);
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
load();
