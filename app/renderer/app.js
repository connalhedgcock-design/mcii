const $ = (s) => document.querySelector(s);
const fmtUsd = (n) => n == null ? '—' : '$' + Math.round(n).toLocaleString();
const fmtNum = (n) => n == null ? '—' : Number(n).toLocaleString();
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`; };

window.mcii.onProgress((m) => { $('#status').textContent = m || ''; });

// Holder counts come from indexes that scan every wallet, and those indexes rebuild. When two
// sources disagree materially we show that they disagree rather than picking one -- a single
// confident number here is exactly what misled us on 2026-08-28.
function holderCell(t) {
  // Wallets holding a balance. Distinct from token accounts, which include empty and closed ones
  // and run roughly twice as high -- conflating the two is what made an accurate feed look broken.
  const holders = t.meta?.holderCount ?? t.safety?.totalHolders ?? null;
  const accts = t.safety?.tokenAccounts ?? null;
  if (holders == null) return '<span class="v">—</span>';
  return `<span class="v" title="${accts ? accts.toLocaleString() + ' token accounts exist, most of them empty' : ''}">${fmtNum(holders)}</span>`;
}

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
      <span class="sym">${esc(t.nick || t.sym)}</span>
      <span class="nm">${esc(m?.name || '')}
        <span class="tail" title="the end of this coin's ID code — the only part that is unique">…${esc(String(t.ca).slice(-4))}</span>
        <button class="btn sm nick" title="give this coin your own name">${t.nick ? 'rename' : 'name it'}</button></span>
      <span class="livedot" title="updating live"></span>
      <span class="pill ${cls}">${g ? g.verdict : 'NO DATA'}</span>
    </div>
    <p class="verdict">${esc(t.sentence || 'Not enough data to give a verdict yet.')}</p>
    ${t.limited ? `<div class="warnbar" style="margin:0 20px 14px">${esc(t.limited)}</div>` : ''}
    <div class="stats primary">
      <div class="stat hero" data-field="price"><span class="k">Price</span>
        <span class="v">$${m ? m.priceUsd.toPrecision(4) : '—'}</span>
        <div class="s">${m?.poolCount ?? '—'} pools</div></div>
      <div class="stat hero" data-field="mcap"><span class="k">Market cap</span>
        <span class="v">${fmtUsd(m?.marketCap)}</span>
        <div class="s">${m?.volume?.h24 != null ? 'vol 24h ' + fmtUsd(m.volume.h24) : '—'}</div></div>
      <div class="stat hero" data-field="change24h"><span class="k">24h change</span>${pctEl(m?.priceChange?.h24)}
        <div class="s">1h ${m?.priceChange?.h1 ?? '—'}%</div></div>
    </div>
    <div class="stats secondary">
      <div class="stat" data-field="liq"><span class="k">Liquidity</span>
        <span class="v">${fmtUsd(m?.totalLiquidityUsd)}</span>
        <div class="s">${m?.totalLiquidityUsd && m?.marketCap ? (100 * m.totalLiquidityUsd / m.marketCap).toFixed(1) + '% of market cap' : '—'}</div></div>
      <div class="stat" data-field="holders"><span class="k">Holders</span>
        ${holderCell(t)}
        <div class="s">top wallet ${t.safety?.top1Pct != null ? t.safety.top1Pct.toFixed(1) + '%' : '—'}</div></div>
      <div class="stat" data-field="exit"><span class="k">Sellable before −5%</span>
        <span class="v">${fmtUsd(x?.usd)}</span>
        <div class="s">${x ? fmtNum(x.tokens) + ' tokens' : 'not simulated'}</div></div>
    </div>
    <div class="social"><span class="lab">Social</span></div>
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
  tokens.forEach((t) => loadSocial(t.ca));
  document.querySelectorAll('.nick').forEach((b) => {
    b.addEventListener('click', async () => {
      const ca = b.closest('.card').dataset.ca;
      const cur = b.textContent === 'rename' ? b.closest('.card').querySelector('.sym').textContent : '';
      const name = await askText('What do you want to call this coin?', { value: cur, ok: 'Save name' });
      if (name === null) return;
      await window.mcii.renameToken(ca, name);
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


// --- market view -------------------------------------------------------------
// Everything the scanner has found, not just the watchlist. Ordered by whether a coin is
// accumulating, then by how many scans it has survived -- deliberately NOT by price change,
// which would just rank whatever already moved.
function ageStr(h) {
  if (h == null) return '—';
  return h < 48 ? Math.round(h) + 'h' : Math.round(h / 24) + 'd';
}

function marketRow(t) {
  const cls = t.accumulating ? 'accum' : t.onWatchlist ? 'own' : '';
  const badge = t.accumulating ? '<span class="badge accum">accumulating</span>'
              : t.onWatchlist ? '<span class="badge own">yours</span>' : '';
  const growth = t.accumulating
    ? `holders ${t.holderGrowth >= 0 ? '+' : ''}${t.holderGrowth}% · liquidity ${t.liqGrowth >= 0 ? '+' : ''}${t.liqGrowth}% · price ${t.priceGrowth >= 0 ? '+' : ''}${t.priceGrowth}%`
    : `seen in ${t.scans} scan${t.scans === 1 ? '' : 's'}`;
  return `<div class="mktrow ${cls}" data-ca="${t.ca}" data-sym="${esc(t.sym || '')}">
    <span class="msym">${esc(t.sym || '?')}</span>
    <span class="mname">${esc(t.name || '')}<span class="mk">${esc(growth)}</span></span>
    <span class="mn">${fmtUsd(t.liq)}<span class="mk">liquidity</span></span>
    <span class="mn">${fmtUsd(t.mcap)}<span class="mk">market cap</span></span>
    <span class="mn ${t.chg24 >= 0 ? 'up' : 'down'}">${t.chg24 != null ? (t.chg24 >= 0 ? '+' : '') + Number(t.chg24).toFixed(0) + '%' : '—'}<span class="mk">24h</span></span>
    <span class="mn">${t.holders != null ? Number(t.holders).toLocaleString() : '—'}<span class="mk">holders</span></span>
    <span class="mn">${ageStr(t.ageH)}<span class="mk">age</span></span>
    ${badge}${t.onWatchlist ? '' : '<button class="btn sm addmkt">Track</button>'}
  </div>`;
}

async function loadMarket() {
  const box = $('#market');
  box.innerHTML = '<div class="skel">LOADING SCAN RESULTS…</div>';
  const d = await window.mcii.screenLatest();
  $('#mktcount').textContent = d.tokens.length ? `(${d.tokens.length})` : '';
  if (!d.tokens.length) {
    box.innerHTML = '<div class="skel">No scans recorded yet. The scanner runs every few minutes — check back shortly.</div>';
    return;
  }
  const acc = d.tokens.filter((t) => t.accumulating).length;
  const when = d.lastScan ? ago(d.lastScan) : 'unknown';

  box.innerHTML =
    `<div class="mktnote">These are coins that passed every filter: enough liquidity to actually exit,
      real two-sided trading, and no failed safety check. <b>Passing is not a recommendation</b> —
      most launchpad coins now revoke minting automatically, so a clean safety check is the
      starting point rather than a verdict.
      ${acc ? `<br><br><b>${acc} marked "accumulating"</b> — holders and liquidity growing while price
      has stayed flat. That is the only genuinely early signal here, and it is measured across
      repeated scans rather than guessed from one.`
      : `<br><br>None are accumulating right now. That condition needs several scans of the same
      coin to compute, so it fills in as the record deepens.`}</div>` +
    `<div class="mkthead"><span>${d.tokens.length} coins tracked · last scan ${when}</span>
      <span>sorted by accumulation, then persistence — never by price</span></div>` +
    d.tokens.map(marketRow).join('');

  box.querySelectorAll('.addmkt').forEach((b) => {
    b.addEventListener('click', async () => {
      const row = b.closest('.mktrow');
      b.textContent = 'adding…'; b.disabled = true;
      await window.mcii.addToken(row.dataset.ca, row.dataset.sym);
      switchView('watch'); load();
    });
  });
}

// !! window.prompt() THROWS in Electron -- "prompt() is not supported". It is not a no-op: it
// takes the whole click handler down with it, silently, so the button appears to do nothing at
// all. Three buttons were dead because of this and nobody could tell why:
//   - Save & share my changes  (so neither of them could ever publish from the app)
//   - resolving a forecast     (the calibration record, which is the point of the journal)
//   - naming a coin
//
// ! the lesson, which is the same one this project keeps relearning: a failure that produces
// NOTHING is worse than one that produces an error. There was no message, no log line, and the
// button re-enabled itself as though it had worked.
function askText(question, { value = '', placeholder = '', ok = 'OK' } = {}) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'ask';
    wrap.innerHTML = `<div class="askbox">
      <label>${esc(question)}</label>
      <input type="text" value="${esc(value)}" placeholder="${esc(placeholder)}">
      <div class="askbtns"><button class="btn cancel">Cancel</button><button class="btn accent go">${esc(ok)}</button></div>
    </div>`;
    document.body.appendChild(wrap);
    const input = wrap.querySelector('input');
    const done = (v) => { wrap.remove(); resolve(v); };
    wrap.querySelector('.go').addEventListener('click', () => done(input.value));
    wrap.querySelector('.cancel').addEventListener('click', () => done(null));
    wrap.addEventListener('click', (e) => { if (e.target === wrap) done(null); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') done(input.value);
      if (e.key === 'Escape') done(null);
    });
    input.focus();
    input.select();
  });
}

// --- social panel ------------------------------------------------------------
async function loadSocial(ca) {
  let d;
  try { d = await window.mcii.socialFor(ca); } catch { return; }
  const card = document.querySelector(`.card[data-ca="${ca}"] .social`);
  if (!card) return;

  // ! sits above the numbers, not under them. If several coins share this ticker, every figure
  // below is measuring a smaller and less certain set of posts, and reading them as a clean
  // sentiment score for this coin is exactly the mistake.
  const cols = await loadCollisions();
  const clash = Object.values(cols).find((c) => c.ca === ca);
  const warn = clash ? `<p class="socverdict" style="color:var(--crit);margin-top:8px">
    ${clash.of} Solana coins use $${esc(clash.ticker)} — yours is number ${clash.rank} of them by pool size.
    Only posts containing the actual contract address are counted here, so this is a narrower
    picture than the numbers suggest.</p>` : '';

  if (!d || !d.latest) {
    card.innerHTML = '<span class="lab">Social</span>' + warn + '<p class="socverdict" style="margin-top:8px">No social readings collected yet.</p>';
    return;
  }
  const b = d.latest, rel = d.reliability || {}, br = d.breadth || {};
  const sent = b.sentiment == null ? '—'
    : (b.sentiment > 0.2 ? 'positive' : b.sentiment < -0.2 ? 'negative' : 'mixed');

  // The verdict leads. A manufactured conversation is reported as a warning, not as enthusiasm.
  const verdict = rel.manipulated
    ? `<b style="color:var(--crit)">This conversation looks manufactured.</b> ${esc((rel.manipReasons || []).join('; '))}. Treat the enthusiasm as a warning rather than as interest.`
    : rel.thin
    ? `Too few people are posting to read anything into it yet${b.uniqueAuthors ? ` — only ${b.uniqueAuthors} in the last reading` : ''}.`
    : `${b.uniqueAuthors} different people posted in the last reading, tone mostly ${sent}.${br.reading ? ' ' + esc(br.reading) + '.' : ''}`;

  card.innerHTML = `<span class="lab">Social — ${d.rows.length} readings</span>
    ${warn}
    <div class="socgrid" style="margin-top:10px">
      <div class="socstat"><span class="k">People posting</span><span class="v">${b.uniqueAuthors ?? '—'}</span></div>
      <div class="socstat"><span class="k">Tone</span><span class="v" ${b.sentimentThin ? 'title="only ' + b.sentimentN + ' post(s) had any wording to judge — too few to call it a mood"' : ''}>${b.sentiment == null ? (b.sentimentThin ? 'too few' : '—') : (b.sentiment >= 0 ? '+' : '') + b.sentiment}</span></div>
      <div class="socstat"><span class="k">vs usual</span><span class="v">${br.value != null ? (br.value >= 0 ? '+' : '') + br.value : '—'}</span></div>
      <div class="socstat"><span class="k">Bot-looking</span><span class="v">${b.botRatio != null ? Math.round(b.botRatio * 100) + '%' : '—'}</span></div>
      <div class="socstat"><span class="k">Spam filtered</span><span class="v">${b.noiseFiltered ?? 0}</span></div>
      <div class="socstat"><span class="k">Confidence</span><span class="v"><span class="conf ${rel.confidence || 'none'}">${rel.confidence || 'none'}</span></span></div>
    </div>
    <p class="socverdict">${verdict}</p>
    ${(b.topPosts && b.topPosts.length) ? `<div class="posts">
      ${b.topPosts.map((p) => `<div class="post">
        <div class="phead">
          <span class="pwho">${esc(p.handle ? '@' + p.handle : 'unknown')}</span>
          <span class="pviews">${Number(p.views || 0).toLocaleString()} views</span>
          ${p.sentiment != null ? `<span class="ptone ${p.sentiment >= 0.2 ? 'pos' : p.sentiment <= -0.2 ? 'neg' : 'neu'}">${p.sentiment >= 0 ? '+' : ''}${p.sentiment}</span>` : '<span class="ptone neu">no tone</span>'}
        </div>
        <div class="ptext">${esc(p.text)}</div>
      </div>`).join('')}
    </div>` : '<p class="socverdict" style="color:var(--muted);font-size:12.5px;margin-top:10px">Posts will appear here from the next collection.</p>'}`;
}


// --- journal -----------------------------------------------------------------
// The forecast log is the only evidence that any of the reasoning works. Memecoins never give
// clean feedback -- luck dominates over short samples, so you can be right for stupid reasons
// and never learn it. A dated, resolvable prediction is the cheapest honest test available.
async function loadJournal() {
  const box = $('#journal');
  const me = await window.mcii.owner();
  if (!me) {
    // Scores are personal. Without knowing who is typing, the log would blend two people into
    // one number that describes neither -- so this is asked before anything can be recorded.
    box.innerHTML = `<div class="jbox">
      <h3>Who is using this machine?</h3>
      <p class="calverdict">Forecast accuracy is scored per person. Two people sharing one log
        would produce a single number that describes neither of you, so the journal needs to know
        who is typing before it will record anything.</p>
      <div class="fform" style="grid-template-columns:1fr auto;margin-top:14px">
        <div><label for="who">Your name</label><input id="who" placeholder="connal"></div>
        <button class="btn" id="setwho">Save</button>
      </div></div>`;
    $('#setwho').addEventListener('click', async () => {
      const v = $('#who').value.trim();
      if (!v) return;
      await window.mcii.setOwner(v);
      loadJournal();
    });
    return;
  }
  const [cal, fx, th, everyone, tokensForThesis] = await Promise.all([
    window.mcii.calibration(), window.mcii.forecasts(), window.mcii.theses(), window.mcii.allOwners(),
    window.mcii.getTokens().catch(() => []),
  ]);
  const others = everyone.filter((o) => o !== me);
  $('#jcount').textContent = fx.length ? `(${fx.length})` : '';

  const cls = cal.brier == null ? 'none' : cal.brier <= cal.baseline ? 'good' : 'bad';
  const cal_html = `<div class="jbox">
    <h3>Calibration — ${esc(me)}${others.length ? ` <span style="color:var(--muted)">· also logging: ${others.map(esc).join(', ')}</span>` : ''}</h3>
    <div class="calnum ${cls}">${cal.brier != null ? cal.brier.toFixed(3) : '—'}</div>
    <p class="calverdict">${esc(cal.verdict)}</p>
    <div class="calbar">
      <div><span class="k">Resolved</span><span class="v">${cal.n}</span></div>
      <div><span class="k">Still open</span><span class="v">${cal.open}</span></div>
      <div><span class="k">Coin-flip score</span><span class="v">0.250</span></div>
      <div><span class="k">vs market</span><span class="v">${cal.marketBrier != null ? cal.marketBrier.toFixed(3) : '—'}</span></div>
    </div>
  </div>`;

  const open = fx.filter((f) => !f.resolved);
  const done = fx.filter((f) => f.resolved).sort((a, b) => b.resolved - a.resolved);

  const frow = (f) => `<div class="frow ${f.resolved ? 'resolved' : ''}" data-id="${f.id}">
      <div class="fq">${esc(f.question)}
        <span class="fmeta">by ${esc(f.resolveBy)}${f.marketImplied != null ? ` · market says ${f.marketImplied}%` : ''}${f.lesson ? ` · ${esc(f.lesson)}` : ''}</span></div>
      <span class="fn">${f.prob}%</span>
      <span class="fn">${f.resolved ? (f.outcome ? 'happened' : 'did not') : 'open'}</span>
      <span class="fn">${f.brier != null ? f.brier.toFixed(3) : '—'}</span>
      ${f.resolved ? '' : `<div class="yn"><button data-o="1">Happened</button><button data-o="0">Didn't</button></div>`}
    </div>`;

  box.innerHTML = cal_html + `
    <div class="jbox">
      <h3>Record a forecast</h3>
      <div class="fform">
        <div><label for="fq">Question — must be answerable yes or no on a date</label>
          <input id="fq" placeholder="CATE liquidity still above $2M on 15 Sept?"></div>
        <div><label for="fp">Your odds</label><input id="fp" type="number" min="1" max="99" placeholder="65"></div>
        <div><label for="fd">Resolves</label><input id="fd" type="date"></div>
        <button class="btn" id="fadd">Add</button>
      </div>
      <p class="socverdict" style="color:var(--muted);font-size:12.5px">Write it so future-you cannot argue about whether it came true. "Does well" is not a forecast; "above $2M on 15 Sept" is.</p>
    </div>
    <div class="jbox"><h3>Open forecasts — ${open.length}</h3>
      ${open.length ? open.map(frow).join('') : '<p class="socverdict" style="color:var(--muted)">None yet.</p>'}</div>
    <div class="jbox"><h3>Resolved — ${done.length}</h3>
      ${done.length ? done.map(frow).join('') : '<p class="socverdict" style="color:var(--muted)">None resolved yet.</p>'}</div>
    <div class="jbox"><h3>Positions — ${th.length}</h3>
      ${th.length ? th.map((t) => `<div class="thesis">
        <h4>${esc(t.id ? t.id.replace('pos.', '').toUpperCase() : t.file)}</h4>
        <dl>
          <dt>Why it goes up</dt><dd>${esc(t.claim || '—')}</dd>
          <dt>Mechanism</dt><dd>${esc(t.mechanism || '—')}</dd>
          <dt>Confidence</dt><dd>${esc(t.confidence || '—')}%</dd>
          <dt>Exit trigger</dt><dd>${esc(t.invalidation || 'NOT SET')}</dd>
          <dt>Time stop</dt><dd>${esc(t.timeStop || 'NOT SET')}</dd>
        </dl></div>`).join('')
      : '<p class="socverdict" style="color:var(--muted)">Nothing written up yet.</p>'}
      <!-- ! there was no way to write one of these from the app at all. The save existed in main
           and nothing in the window ever called it, so both position files have sat empty since
           they were created -- listed on the handoff as an open item for days, when the actual
           cause was a missing form. -->
      <div class="fform" style="grid-template-columns:1fr;gap:8px;margin-top:14px">
        <select id="pcoin">${tokensForThesis.map((t) => `<option value="${esc(t.ca)}|${esc(t.sym)}">${esc(t.nick || t.sym)}</option>`).join('')}</select>
        <input id="pclaim" type="text" placeholder="Why do you think this goes up? One sentence.">
        <input id="pmech" type="text" placeholder="What actually has to happen for that? (more buyers, a listing, a trend)">
        <input id="pinval" type="text" placeholder="What would make you sell? Be specific — a number, not a feeling.">
        <input id="pstop" type="text" placeholder="By what date, if nothing has happened, do you give up?">
        <input id="pconf" type="number" min="1" max="99" placeholder="How sure are you, 1-99?">
        <button id="psave" class="btn accent">Save this position</button>
      </div>
      <p class="socverdict" style="color:var(--muted);font-size:12.5px">The exit trigger is the part
        that matters. Writing it down before you are losing money is the whole point — afterwards you
        will argue with it.</p></div>`;

  $('#psave').addEventListener('click', async () => {
    const [ca, sym] = ($('#pcoin').value || '|').split('|');
    const claim = $('#pclaim').value.trim();
    const invalidation = $('#pinval').value.trim();
    if (!sym || !claim) { alert('Pick a coin and write why you think it goes up.'); return; }
    if (!invalidation && !confirm('You have not written what would make you sell. That is the most '
      + 'useful line on the page. Save it anyway?')) return;
    await window.mcii.saveThesis({ ca, sym, claim, invalidation,
      mechanism: $('#pmech').value.trim(), timeStop: $('#pstop').value.trim(),
      confidence: $('#pconf').value.trim() });
    loadJournal();
  });

  $('#fadd').addEventListener('click', async () => {
    const q = $('#fq').value.trim(), p = Number($('#fp').value), d = $('#fd').value;
    if (!q || !p || !d) return;
    await window.mcii.addForecast({ question: q, prob: p, resolveBy: d });
    loadJournal();
  });
  box.querySelectorAll('.yn button').forEach((b) => {
    b.addEventListener('click', async () => {
      const id = b.closest('.frow').dataset.id;
      const lesson = (await askText('What would you have needed to see to get this right?', { ok: 'Save' })) || '';
      await window.mcii.resolveForecast(id, b.dataset.o === '1', lesson);
      loadJournal();
    });
  });
}

// --- what's happening --------------------------------------------------------
// The sector view. Reading order is chosen, not incidental: the survival rate comes first, the
// coins come last, and the limits are on the same screen rather than behind a link.
//
// ! what this screen must never become: a list sorted by what went up. That is a trending feed,
// it is what every other tool already does, and it is the behaviour the rest of this app exists
// to slow down. Coins here are ordered by when they were found, tickers by how many different
// people said them.
async function loadSector() {
  const box = $('#sector');
  box.innerHTML = '<div class="skel">READING THE RECORD…</div>';
  let d;
  try { d = await window.mcii.sector(); } catch (e) { box.innerHTML = `<div class="quiet">Could not read the record: ${esc(e.message)}</div>`; return; }

  const s = d.social;
  const tone = s && s.sentiment != null ? s.sentiment : null;
  const toneWord = tone == null
    ? (s && s.sentimentThin ? 'too few posts to call' : 'no clear tone')
    : tone > 0.15 ? 'positive' : tone < -0.15 ? 'negative' : 'mixed';

  const head = `<div class="card">
    <div class="chead"><b>What's happening in memecoins</b>
      <span class="v">${d.collectedAt ? 'chatter read ' + ago(d.collectedAt) : 'no chatter collected yet'}</span></div>
    ${d.lines.length ? d.lines.map((l) => `<p class="sline">${esc(l)}</p>`).join('')
                     : '<div class="quiet">Not enough collected yet to say anything. This fills in as the hourly job runs.</div>'}
    <div class="caveats"><b>What this does not tell you</b>
      ${d.caveats.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
  </div>`;

  const mood = s ? `<div class="card">
    <div class="chead"><b>The conversation</b><span class="v">${s.posts} posts</span></div>
    <div class="stats">
      <div class="stat"><dt>People posting</dt><dd class="v">${fmtNum(s.uniqueAuthors)}</dd></div>
      <div class="stat"><dt>Tone</dt><dd class="v">${toneWord}${tone != null ? ` (${tone > 0 ? '+' : ''}${tone.toFixed(2)})` : ''}</dd></div>
      <div class="stat"><dt>Sales language</dt><dd class="v">${s.shillRatio != null ? Math.round(s.shillRatio * 100) + '%' : '—'}</dd></div>
      <div class="stat"><dt>Repeated posts</dt><dd class="v">${s.duplicateRatio != null ? Math.round(s.duplicateRatio * 100) + '%' : '—'}</dd></div>
    </div>
    <p class="note">Tone and sales language are counted separately on purpose. Posts can sound
      enthusiastic and still be an advert; those need opposite reactions.</p>
  </div>` : '';

  // What the filter kept, and what it put down. Both are shown: a filter nobody can audit is a
  // filter nobody can catch being wrong, and the size of the discard pile is itself a reading --
  // a sweep that is mostly adverts describes a market being sold to.
  const postCard = (p) => `<div class="post">
      <div class="phead"><span class="pwho">${esc(p.handle ? '@' + p.handle : 'unknown')}</span>
        ${p.kind ? `<span class="ptone ${p.kind === 'failure' ? 'neg' : p.kind === 'held' ? 'pos' : 'neu'}">${esc(p.kind)}</span>` : ''}
        <span class="pviews">${fmtNum(p.views)} views</span></div>
      <div class="ptext">${esc(p.text)}</div>
      ${p.why ? `<div class="pwhy">${esc(p.why)}</div>` : ''}
    </div>`;

  const f = s && s.filter ? s.filter : null;
  const important = s && s.important ? s.important : [];
  const background = s && s.background ? s.background : [];
  const aside = s && s.setAsideSample ? s.setAsideSample : [];

  const filtered = s ? `<div class="card">
    <div class="chead"><b>Worth reading</b>
      <span class="v">${f ? `${important.length} of ${f.total} posts` : ''}</span></div>
    ${important.length ? `<div class="posts">${important.map(postCard).join('')}</div>`
      : '<div class="quiet">Nothing in this sweep was about your coins or about a coin failing.</div>'}
    ${background.length ? `<div class="chead"><b>Background</b><span class="v">coins the scanner found, and general market talk</span></div>
      <div class="posts">${background.map(postCard).join('')}</div>` : ''}
    ${f ? `<p class="note">${Math.round((f.promoShare || 0) * 100)}% of this sweep was advertising or
      posts name-dropping a list of coins. That share is itself worth watching: a market being
      sold to looks different from one being argued about.</p>` : ''}
    ${aside.length ? `<details class="aside"><summary>What was set aside (${f ? f.total - important.length - background.length : aside.length})</summary>
      <div class="posts">${aside.map(postCard).join('')}</div>
      <p class="note">Shown so you can catch the filter being wrong. It sorts; it never deletes.</p>
    </details>` : ''}
  </div>` : '';

  // A ticker is not a coin. Anything several people are naming gets looked up against real pools
  // before it appears here as anything more than a word, and when two coins share a ticker it
  // stays a word rather than being guessed at.
  const ident = new Map(((s && s.identified) || []).map((i) => [i.ticker, i]));
  const named = (d.tickers || []).filter((t) => !t.major).slice(0, 10);
  const idCell = (t) => {
    const i = ident.get(t.ticker);
    if (!i) return '<span class="v">on our list already</span>';
    if (i.ambiguous) return `<span class="down">${i.matches.length} different coins use this name</span>`;
    if (!i.resolved) return `<span class="v">${esc(i.reason || 'could not identify')}</span>`;
    const m = i.matches[0];
    return `${esc(i.resolved.name || i.resolved.sym)} · ${fmtUsd(m.liquidityUsd)} in the pool${m.ageDays != null ? ` · ${Math.round(m.ageDays)}d old` : ''}`;
  };
  const tickers = named.length ? `<div class="card">
    <div class="chead"><b>Coins people are naming</b><span class="v">by how many different people</span></div>
    <table class="tbl"><thead><tr><th>Named</th><th>People</th><th>Posts</th><th>Which coin this actually is</th></tr></thead><tbody>
      ${named.map((t) => `<tr><td>$${esc(t.ticker)}</td><td>${t.people}</td><td>${t.mentions}</td><td>${idCell(t)}</td></tr>`).join('')}
    </tbody></table>
    <p class="note">Sorted by how many different people said it, never by how many posts. Fifty
      posts from three accounts is a campaign, not interest. Tickers are not unique — where two
      coins share one, it says so rather than picking the bigger one.</p>
  </div>` : '';

  const b = d.breadth;
  const co = d.cohort;
  const market = `<div class="card">
    <div class="chead"><b>The market as a whole</b><span class="v">counted over coins the scanner looked at</span></div>
    <div class="stats">
      <div class="stat"><dt>Passed the last scan</dt><dd class="v">${d.funnel ? `${d.funnel.survivors} of ${d.funnel.universe}` : '—'}</dd></div>
      <div class="stat"><dt>Coins up / down (24h)</dt><dd class="v">${b.n ? `${b.up} / ${b.down}` : '—'}</dd></div>
      <div class="stat"><dt>Middle coin moved</dt><dd class="v">${b.median != null ? (b.median > 0 ? '+' : '') + b.median + '%' : '—'}</dd></div>
      <div class="stat"><dt>Pool shrank since we found them</dt><dd class="v">${co.tracked >= 5 ? `${co.drained + co.halved} of ${co.tracked}` : 'not enough history'}</dd></div>
    </div>
    ${d.funnel && d.funnel.topRejects.length ? `<p class="note">Dropped for: ${d.funnel.topRejects.map(([r, n]) => `${esc(r)} (${n})`).join(', ')}.</p>` : ''}
  </div>`;

  const recent = (d.recent || []).length ? `<div class="card">
    <div class="chead"><b>Coins the scanner found</b><span class="v">newest first — not ranked</span></div>
    <table class="tbl"><thead><tr><th>Coin</th><th>Found</th><th>Liquidity</th><th>24h</th><th>Age</th></tr></thead><tbody>
      ${d.recent.map((c) => `<tr>
        <td>${esc(c.sym || '—')}</td>
        <td>${ago(c.ts)}</td>
        <td>${fmtUsd(c.liq)}</td>
        <td>${c.chg24 != null ? `<span class="${c.chg24 >= 0 ? 'up' : 'down'}">${c.chg24 >= 0 ? '+' : ''}${Math.round(c.chg24)}%</span>` : '—'}</td>
        <td>${c.ageH != null ? Math.round(c.ageH) + 'h' : '—'}</td>
      </tr>`).join('')}
    </tbody></table>
    <p class="note">Ordered by when they were found. The 24h column is there to read, not to sort by.</p>
  </div>` : '';

  // ! shown high up, not buried: it changes how every social number for that coin should be read.
  const col = Object.values(d.collisions || {});
  const shared = col.length ? `<div class="card fail">
    <div class="chead"><b>One of your coins shares its name</b></div>
    ${col.map((c) => `<p class="sline">${c.of} different Solana coins use <b>$${esc(c.ticker)}</b>.
      Yours is number ${c.rank} of them by how much money is in the pool${c.rivals && c.rivals[0]
        ? `, behind ${esc(c.rivals[0].name || 'another coin')} at ${fmtUsd(c.rivals[0].liquidityUsd)}` : ''}.</p>
      <p class="note">So a post saying "$${esc(c.ticker)}" is probably not about your coin. Posts are
      now only counted for yours when they include the actual contract address. Anything matched on
      the name alone is set aside instead.</p>`).join('')}
  </div>` : '';

  box.innerHTML = head + shared + market + filtered + mood + tickers + recent;
}

function switchView(v) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === v));
  $('#grid').hidden = v !== 'watch';
  $('#market').hidden = v !== 'market';
  $('#sector').hidden = v !== 'sector';
  $('#journal').hidden = v !== 'journal';
  $('.search').style.display = v === 'watch' ? 'flex' : 'none';
  $('#alerts').style.display = v === 'watch' ? '' : 'none';
  if (v === 'market') loadMarket();
  if (v === 'sector') loadSector();
  if (v === 'journal') loadJournal();
}

// The shared record is the only thing filling in while both laptops are closed. When it stops,
// nothing in the app used to change -- every age on screen was of data fetched seconds earlier,
// which is always fresh. This says out loud when the record has gone quiet.
// Loaded once and reused: the answer changes about once a day.
let collisionCache = null;
async function loadCollisions() {
  if (collisionCache) return collisionCache;
  try { collisionCache = await window.mcii.tickerCollisions(); } catch { collisionCache = {}; }
  return collisionCache;
}

async function renderCollectionHealth() {
  let h;
  try { h = await window.mcii.collectionHealth(); } catch { return; }
  const box = $('#collhealth');
  if (!h || h.state === 'ok') {
    box.innerHTML = '';
    if (h && h.lastTs) $('#stamp').title = 'Shared record last added to ' + ago(h.lastTs);
    return;
  }
  const level = h.state === 'late' ? 'MED' : 'HIGH';
  box.innerHTML = `<div class="alert ${level}">
      <span class="as">RECORD</span>
      <div><b>${esc(h.headline)}</b><span>${esc(h.detail)}</span></div>
    </div>`;
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
  renderCollectionHealth();
  renderAlerts(tokens);
  render(tokens);
}

async function search() {
  const q = $('#q').value.trim();
  if (!q) return;
  $('#results').innerHTML = '<div class="rhead">searching…</div>';
  let rows = await window.mcii.search(q);
  if (!rows.length) { $('#results').innerHTML = '<div class="rhead">nothing found</div>'; return; }
  // ! coins you already hold go to the top and are labelled. Searching "CATE" returns six coins
  // and the biggest one is not yours -- picking by name is exactly how people buy the copy.
  const mine = new Map((await window.mcii.getTokens().catch(() => [])).map((t) => [t.ca, t]));
  rows = rows.slice().sort((a, b) => (mine.has(b.ca) ? 1 : 0) - (mine.has(a.ca) ? 1 : 0));
  const dupes = rows.filter((r) => r.symbol.toLowerCase() === rows[0].symbol.toLowerCase()).length;
  $('#results').innerHTML =
    (dupes > 1 ? `<div class="warnbar"><b>${dupes} different tokens share this ticker.</b>
      Copycats reuse the name and picture of whatever is doing well. Any coin you already hold is
      marked <b>yours</b> and shown first. Otherwise check the last four characters of the ID code
      against your wallet — the name alone tells you nothing.</div>` : '') +
    `<div class="rhead"><span>${rows.length} results — sorted by liquidity</span><span>click add to analyse</span></div>` +
    rows.map((r) => `<div class="rrow" data-ca="${r.ca}" data-sym="${esc(r.symbol)}">
      <span class="rsym">${esc(r.symbol)}${mine.has(r.ca) ? '<span class="yours">yours</span>' : ''}</span>
      <span class="rnm">${esc(mine.get(r.ca)?.nick || r.name)} <span class="chain">${esc(r.chain)}</span>
        <span class="tail">…${esc(String(r.ca).slice(-4))}</span></span>
      <span class="rn">${fmtUsd(r.marketCap)}<br><span style="color:var(--muted);font-size:10px">mkt cap</span></span>
      <span class="rn">${fmtUsd(r.liquidityUsd)}<br><span style="color:var(--muted);font-size:10px">liq · ${r.pools ?? '?'} pool${r.pools === 1 ? '' : 's'}</span></span>
      <span class="rn">${fmtUsd(r.volume24h)}<br><span style="color:var(--muted);font-size:10px">vol 24h</span></span>
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

// --- updates ------------------------------------------------------------
// Only ever informs and, on request, fast-forwards -- it refuses (rather than guessing) when
// there's anything uncommitted here, and points at share.sh, which is the tool that knows how
// to combine two people's edits.
const updateBtn = $('#update');
function renderUpdateStatus(r) {
  updateBtn.disabled = false;
  updateBtn.classList.remove('accent');
  if (!r || !r.ok) { updateBtn.textContent = 'Check for updates'; updateBtn.dataset.state = 'idle'; return; }
  if (r.behind === 0) { updateBtn.textContent = 'Up to date'; updateBtn.dataset.state = 'idle'; return; }
  if (r.hasLocalChanges || r.ahead > 0) {
    updateBtn.textContent = `Update available (${r.behind}) — save your changes first`;
    updateBtn.dataset.state = 'blocked';
    return;
  }
  updateBtn.textContent = `Update available (${r.behind}) — click to install`;
  updateBtn.classList.add('accent');
  updateBtn.dataset.state = 'available';
}

updateBtn.addEventListener('click', async () => {
  const state = updateBtn.dataset.state;
  if (state === 'blocked') {
    alert('You (or Connal) have edits that have not been saved and shared yet.\n\n'
      + 'Open Terminal and run:\n  cd ~/Documents/MCII && ./share.sh "describe your changes"\n\n'
      + 'Then click Check for updates again.');
    return;
  }
  if (state === 'available') {
    updateBtn.disabled = true;
    updateBtn.textContent = 'Installing update…';
    const res = await window.mcii.applyUpdate();
    if (!res.ok) {
      alert('Could not install the update (' + res.reason + ').\n\n'
        + 'Open Terminal and run:\n  cd ~/Documents/MCII && git pull\nto see why, or ask Connal.');
      renderUpdateStatus(await window.mcii.checkForUpdates());
      return;
    }
    updateBtn.textContent = 'Restarting…';
    window.mcii.restartApp();
    return;
  }
  updateBtn.disabled = true;
  updateBtn.textContent = 'Checking…';
  renderUpdateStatus(await window.mcii.checkForUpdates());
});
window.mcii.onUpdateStatus(renderUpdateStatus);

const shareBtn = $('#share');
shareBtn.addEventListener('click', async () => {
  const message = await askText('What did you change?', { placeholder: 'a few words', ok: 'Save & share' });
  if (message === null) return;
  shareBtn.disabled = true;
  const original = shareBtn.textContent;
  shareBtn.textContent = 'Saving & sharing…';
  const res = await window.mcii.shareChanges(message);
  shareBtn.disabled = false;
  shareBtn.textContent = original;
  if (!res.ok) {
    const msgs = {
      'no-message': 'You have changes to save — type a few words describing them and try again.',
      'conflict': 'You and Connal both changed the same part of a file. Your work is saved safely '
        + 'on this computer, but not shared yet. Talk to Connal about which version should win, '
        + 'then try again.',
      'push-failed': 'Could not upload your changes' + (res.detail ? ': ' + res.detail : '') + '.',
    };
    alert(msgs[res.reason] || 'Something went wrong sharing your changes.');
    return;
  }
  if (res.ranNpmInstall && confirm('Shared. Connal had changes that need a restart to fully take effect — restart now?')) {
    window.mcii.restartApp();
    return;
  }
  alert(res.saved ? 'Saved and shared with Connal.' : 'Nothing of yours to save — already in sync.');
  renderUpdateStatus(await window.mcii.checkForUpdates());
});

// Redraw with the fresh numbers, without asking main to refresh again -- that would loop.
window.mcii.onRefreshed(async () => { render(await window.mcii.getTokens()); });

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
  set('[data-field="price"] .v', '$' + t.market.priceUsd.toPrecision(4), true);
  set('[data-field="liq"] .v', fmtUsd(t.market.totalLiquidityUsd), true);
  if (t.market.marketCap != null) set('[data-field="mcap"] .v', fmtUsd(t.market.marketCap), true);
  if (t.exit) set('[data-field="exit"] .v', fmtUsd(t.exit.usd), true);
  const ch = card.querySelector('[data-field="change24h"] .v');
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
document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => switchView(t.dataset.view)));
window.mcii.forecasts().then((f) => { if (f.length) $('#jcount').textContent = `(${f.length})`; });
window.mcii.screenLatest().then((d) => {
  $('#mktcount').textContent = d.tokens.length ? `(${d.tokens.length})` : '';
});
$('#refresh').addEventListener('click', () => { load(); if (!$('#market').hidden) loadMarket(); });
$('#go').addEventListener('click', search);
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
load();
