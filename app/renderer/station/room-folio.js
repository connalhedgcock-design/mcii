/**
 * room-folio — "The Portfolio" as a real room: cargo sized by weight behind
 * the same three readings the flat tab gives (each venue alone, and both
 * together), reading window.mcii's wallet/portfolio calls directly.
 *
 * ROOM-BRIEF §5 kept the metaphor as-is ("Cargo sized by weight works fine").
 * §13 asked for one specific thing on top: the JOINT fomo+axiom number in
 * dollars, its 24-hour change, and a graph — all three visible at once rather
 * than only inside the "combined" tab. So the joint figure is now the room's
 * headline, shown whichever venue tab is open, and each crate is labelled with
 * the coin and its share of the book: an unlabelled box is a shape, and the
 * operator has already said once that unlabelled shapes read as "little
 * disconnected empty boxes".
 */
import { mountRoom, board, esc, fmtUsd, fmtNum, askText } from './rooms.js';
import { stripChart, wireChart } from './readouts.js';

const VENUES = [
  { id: 'fomo', label: 'fomo', tag: 'FMO' },
  { id: 'axiom', label: 'axiom', tag: 'AXM' },
];
const shortAddr = (a) => a ? a.slice(0, 4) + '…' + a.slice(-4) : '';

export function initFolioRoom(root) {
  const { pill, wall, beyond } = mountRoom(root, { beyondClass: 'rm-folio', tag: 'FOL', title: 'The Portfolio' });
  let active = false;
  let tab = 'combined';
  let days = 1;
  let series = null;
  let lastData = null, lastWallets = null;
  beyond.innerHTML = `<div class="fl-rail"></div>`;

  // ! 126, not 100. The beyond layer starts at the room's own top edge while the
  // placard row sits in normal flow above it, so a crate standing 100px up was
  // partly BEHIND "THE PORTFOLIO · FOL-1". The rail drops below the row instead;
  // keep this in step with .rm-folio .fl-rail { top }.
  const RAIL_Y = 126;
  function crates(positions) {
    const sorted = [...(positions || [])].sort((a, b) => (b.weightPct ?? b.valueUsd) - (a.weightPct ?? a.valueUsd)).slice(0, 5);
    const max = Math.max(...sorted.map((p) => p.valueUsd || 1), 1);
    const total = sorted.reduce((a, p) => a + (p.valueUsd || 0), 0) || 1;
    beyond.innerHTML = `<div class="fl-rail"></div>` + sorted.map((p, i) => {
      const w = 30 + (p.valueUsd / max) * 68;
      const h = w * 0.7;
      const hazard = sorted.length > 1 && p.valueUsd / max > 0.55;
      const share = Math.round(100 * (p.valueUsd || 0) / total);
      // top, not bottom: .fl-crate is positioned within .st-flatbeyond, which
      // spans the whole room (not just the backdrop band), so a crate's own
      // BOTTOM has to be computed up from the band's fixed baseline (RAIL_Y)
      // rather than anchored to the room's actual bottom edge, which moves
      // with content length.
      return `<div class="fl-crate ${hazard ? 'hazard' : ''}" style="left:${10 + i * 16}%;width:${w}px;height:${h}px;top:${RAIL_Y - h}px;animation-delay:${(i * 0.3).toFixed(1)}s">
        <span class="fl-crate-tag">${esc(p.sym || '')}<i>${share}%</i></span></div>`;
    }).join('');
  }

  function posTable(positions, showVenues) {
    if (!positions.length) return `<div class="st-flatempty">nothing here</div>`;
    return `<div class="st-flathead"><span class="name">coin</span><span class="grow">${showVenues ? 'where' : ''}</span><span class="v">held</span><span class="v">price</span><span class="v">value</span><span class="v">24h</span></div>` +
      positions.map((p) => `<div class="st-flatrow">
        <span class="name">${esc(p.sym)}</span>
        <span class="grow">${showVenues ? esc(Object.keys(p.byVenue || {}).join(' + ')) : ''}</span>
        <span class="v">${fmtNum(Math.round(p.tokens))}</span>
        <span class="v">$${p.priceUsd < 0.01 ? p.priceUsd.toPrecision(3) : p.priceUsd.toFixed(4)}</span>
        <span class="v">${fmtUsd(p.valueUsd)}</span>
        <span class="v ${p.change24h > 0 ? 'is-up' : p.change24h < 0 ? 'is-down' : ''}">${p.change24h == null ? '—' : (p.change24h > 0 ? '+' : '') + p.change24h.toFixed(1) + '%'}</span>
      </div>`).join('');
  }

  // The graph is the shared strip chart now (readouts.js) — priced Y axis,
  // dated X axis, a crosshair that reads out the point under the cursor. The
  // hand-rolled two-path version this replaced had none of those, and §9's
  // complaint about the other graph applied here word for word.
  function chartSvg(pts) {
    return stripChart((pts || []).map((p) => ({ ts: p.ts, v: p.usd })), { h: 170, label: 'portfolio value' });
  }

  function benchBody(wallets) {
    return VENUES.map((v) => `<div class="st-flatrow">
        <span class="name">${v.tag}</span>
        <span class="grow">${wallets[v.id] ? esc(shortAddr(wallets[v.id])) : 'not set'}</span>
        <button class="btn sm" data-setwallet="${v.id}">${wallets[v.id] ? 'change' : 'set'}</button>
        ${wallets[v.id] ? `<button class="btn sm" data-clearwallet="${v.id}">clear</button>` : ''}
      </div>`).join('') +
      `<p style="margin:8px 0 0;font-size:11px;color:var(--st-fg-faint)">Public address only — never a private key or seed phrase.</p>`;
  }

  function wire(wallets) {
    wall.querySelectorAll('[data-setwallet]').forEach((b) => b.addEventListener('click', async () => {
      const venue = b.dataset.setwallet;
      const addr = await askText(`Your ${venue} wallet address`, { placeholder: 'public Solana address', ok: 'Save' });
      if (addr == null) return;
      try { await window.mcii.setWallet(venue, addr.trim()); tab = venue; refresh(); } catch (e) { alert(e.message); }
    }));
    wall.querySelectorAll('[data-clearwallet]').forEach((b) => b.addEventListener('click', async () => {
      try { await window.mcii.setWallet(b.dataset.clearwallet, ''); tab = 'combined'; refresh(); } catch (e) { alert(e.message); }
    }));
    wall.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; renderBody(); }));
    wall.querySelectorAll('[data-days]').forEach((b) => b.addEventListener('click', async () => {
      days = Number(b.dataset.days); series = null; renderBody();
      try { series = await window.mcii.portfolioSeries(days); } catch { series = { points: [] }; }
      renderBody();
    }));
  }

  function renderBody() {
    const data = lastData, wallets = lastWallets;
    const known = VENUES.filter((v) => wallets[v.id]);
    if (!known.length) {
      wall.innerHTML = board({ label: 'wallets', tag: 'FOL-0', full: true, body: benchBody(wallets) });
      wire(wallets);
      beyond.innerHTML = `<div class="fl-rail"></div>`;
      return;
    }

    const tabsHtml = `<div style="display:flex;gap:6px;margin-bottom:10px">` +
      [...known, { id: 'combined', label: 'combined', tag: 'ALL' }].map((v) =>
        `<button class="btn sm ${v.id === tab ? 'accent' : ''}" data-tab="${v.id}">${esc(v.label)}</button>`).join('') + `</div>`;

    // §13's headline: fomo + axiom together, in dollars, with the 24h change —
    // shown on every tab, because "what am I worth right now" is not a question
    // that should depend on which venue tab happens to be open.
    const jc = data.combined, jp = data.pnl24;
    const jointHtml = jc ? `<div class="st-joint">
        <div class="n">${fmtUsd(jc.totalUsd)}</div>
        <div class="m ${!jp ? '' : jp.absUsd >= 0 ? 'is-up' : 'is-down'}">${!jp ? '24h —'
          : `24h ${jp.absUsd >= 0 ? '+' : '−'}${fmtUsd(Math.abs(jp.absUsd))}${jp.pct != null ? ` · ${jp.pct >= 0 ? '+' : ''}${jp.pct.toFixed(1)}%` : ''}`}</div>
        <div class="w">${known.map((v) => v.label).join(' + ')} together</div>
      </div>` : '';

    let summary, tableBody, showVenues = false;
    if (tab === 'combined') {
      const c = data.combined;
      if (!c || !c.positions.length) { summary = `<div class="st-flatempty">nothing priced yet</div>`; tableBody = ''; }
      else {
        const p = data.pnl24;
        summary = `<div class="st-board-num" style="font-size:26px">${fmtUsd(c.totalUsd)}</div>
          <div style="display:flex;gap:16px;margin-top:8px;font-family:var(--st-mono);font-size:11px">
            <span class="${!p ? '' : p.absUsd >= 0 ? 'is-up' : 'is-down'}" style="color:inherit">24h ${!p ? '—' : (p.absUsd >= 0 ? '+' : '−') + fmtUsd(Math.abs(p.absUsd))}</span>
            <span style="color:${c.topWeightPct > 60 ? 'var(--st-warn)' : 'var(--st-fg-mute)'}">largest position ${c.topWeightPct == null ? '—' : c.topWeightPct.toFixed(0) + '%'}${c.topWeightPct > 60 ? ' — one bet, not a portfolio' : ''}</span>
          </div>`;
        tableBody = posTable(c.positions, true);
        showVenues = true;
        crates(c.positions.map((p) => ({ ...p, weightPct: c.totalUsd ? (100 * p.valueUsd / c.totalUsd) : 0 })));
      }
    } else {
      const v = data.venues.find((x) => x.venue === tab);
      if (!v) { summary = `<div class="st-flatempty">no wallet set for this venue</div>`; tableBody = ''; }
      else if (v.error) { summary = `<div class="st-flatempty">${esc(v.error)}</div>`; tableBody = ''; }
      else {
        summary = `<div class="st-board-num" style="font-size:26px">${fmtUsd(v.totalUsd)}</div>
          <div style="margin-top:8px;font-family:var(--st-mono);font-size:11px;color:var(--st-fg-mute)">${v.positions.length} coins held · sol ${v.sol == null ? '—' : v.sol.toFixed(3)}</div>`;
        tableBody = posTable(v.positions, false);
        crates(v.positions);
      }
    }

    wall.innerHTML =
      board({ label: 'the book', tag: tab === 'combined' ? 'FOL-1' : `FOL-${tab}`, body: jointHtml + tabsHtml + (summary || '') }) +
      board({
        label: 'value over time — both venues', tag: 'FOL-2', wide: true,
        body: `<div style="display:flex;gap:6px;margin-bottom:8px">${[1, 7, 30].map((d) => `<button class="btn sm ${d === days ? 'accent' : ''}" data-days="${d}">${d}d</button>`).join('')}</div>${chartSvg(series?.points)}`,
      }) +
      board({ label: 'every position', tag: 'FOL-3', full: true, body: tableBody || '' }) +
      board({ label: 'wallets', tag: 'FOL-4', full: true, body: benchBody(wallets) });

    wire(wallets);
    wireChart(wall);
  }

  async function refresh() {
    if (!active) return;
    let wallets = {};
    try { ({ wallets } = await window.mcii.wallets()); } catch { /* none set */ }
    lastWallets = wallets;
    pill.innerHTML = '';
    const known = VENUES.filter((v) => wallets[v.id]);
    if (!known.length) { renderBody(); return; }
    let data;
    try { data = await window.mcii.portfolio(); } catch (e) {
      wall.innerHTML = board({ label: 'chain unreachable', tag: 'FOL-!', full: true, body: `<div class="st-flatempty">${esc(e.message)}</div>` + benchBody(wallets) });
      wire(wallets);
      return;
    }
    if (!active) return;
    lastData = data;
    const c = data.combined;
    if (c) pill.innerHTML = `<span class="p is-up"><b>${fmtUsd(c.totalUsd)}</b> total</span>`;
    renderBody();
    if (!series) {
      try { series = await window.mcii.portfolioSeries(days); } catch { series = { points: [] }; }
      if (active) renderBody();
    }
  }

  return {
    show() { active = true; root.hidden = false; refresh(); },
    hide() { active = false; root.hidden = true; },
  };
}
