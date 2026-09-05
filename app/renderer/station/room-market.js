/**
 * room-market — "The Market", rebuilt to ROOM-BRIEF §2 and §10.
 *
 * §2: keep the sweep, keep it DECORATIVE, and "find a creative and unique way to
 * represent the same data in that decorative sensor sweep way". §10: the reading
 * that matters in two seconds is which coins BLEW UP or FELL OFF in traded volume
 * today, against their own normal — coins we hold or that persist are PLANETS,
 * smaller and untracked movers are ASTEROIDS that earn planet status by sticking
 * around.
 *
 * So the sweep stays atmosphere in the backdrop band, and the reading becomes a
 * FIELD: a contact plot where a body's position is the measurement, not decoration.
 *   x — volume today vs this coin's own trailing median (the §10 reading)
 *   y — price move over 24h
 *   size — market cap, log-scaled and clamped (see synthesis.bodySize)
 *   ring — you are holding or watching it
 * Four readings, one glance, no card grid. The quadrant a body sits in is itself
 * a sentence: right-and-up is volume and price agreeing, right-and-down is volume
 * arriving while price falls — someone is selling into it.
 *
 * The table underneath is NOT replaced by the plot (§14: "dont lose those"). It
 * keeps the flat tab's own ordering — accumulation, then persistence, never price.
 */
import { mountRoom, board, esc, fmtUsd, ago } from './rooms.js';
import { classifyBodies, bodySize, readCoin } from './synthesis.js';
import { verdictPanel, confidenceGauge } from './readouts.js';

function ageStr(h) {
  if (h == null) return '—';
  return h < 48 ? Math.round(h) + 'h' : Math.round(h / 24) + 'd';
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Signed log. Volume shock is unbounded upward (+900% happens) and floored at
 *  −100%, so a linear axis spends 90% of its width on the two loudest coins and
 *  crushes everything else onto the centre line. */
function shockX(pct) {
  if (pct == null) return 0;
  const s = Math.sign(pct);
  return clamp(s * Math.log10(1 + Math.abs(pct) / 20) / Math.log10(1 + 400 / 20), -1, 1);
}
const moveY = (pct) => pct == null ? 0 : clamp(pct / 60, -1, 1);

export function initMarketRoom(root) {
  const { pill, wall, beyond } = mountRoom(root, { beyondClass: 'rm-market', tag: 'MKT', title: 'The Market', scan: false });
  let active = false;
  let data = { tokens: [] };
  let sel = null;
  let social = null;

  // Both motifs live INSIDE .fl-band, which is exactly --fl-band tall and
  // clips. The sweep is a 340px circle centred 60px down: left loose in the
  // beyond layer it hangs 102px past the band, and .st-flatwall starts right
  // there -- so its lower arc painted behind the first (opaque) board and
  // re-emerged in the wall's side gutter, LOG #20 bug 2 in a third form.
  // Clipped to the band it reads as a sweep crossing a horizon and cannot
  // reach a board at any content length.
      // ! NOTHING in the band. There was a scope repeater up here and the operator
    // saw it for what it was: "the scanner that was there in the wrong spot is
    // still there as well as the new fixed scanner". One room, one scanner —
    // and this room's scanner is the plot, where the contacts actually are.
    beyond.innerHTML = '';

  /** The contact plot. Deliberately hand-drawn SVG like every other chart in
   *  this app — nothing loads from the network, and the strict content policy
   *  stays intact. */
  function field(planets, asteroids) {
    const W = 1000, H = 300, padX = 46, padY = 26;
    const px = (n) => (padX + (0.5 + n / 2) * (W - padX * 2)).toFixed(1);
    const py = (n) => (padY + (0.5 - n / 2) * (H - padY * 2)).toFixed(1);

    if (!planets.length && !asteroids.length) {
      return `<div class="st-flatempty">No coin has moved enough volume against its own normal to plot yet. This needs a few scans of history per coin before it can say anything.</div>`;
    }

    const grid = `
      <line class="ax" x1="${px(0)}" x2="${px(0)}" y1="${padY}" y2="${H - padY}"/>
      <line class="ax" x1="${padX}" x2="${W - padX}" y1="${py(0)}" y2="${py(0)}"/>
      <text class="axl" x="${W - padX}" y="${py(0) - 8}" text-anchor="end">volume blew up →</text>
      <text class="axl" x="${padX}" y="${py(0) - 8}">← volume fell off</text>
      <text class="axl" x="${px(0) + 6}" y="${padY + 4}">price up</text>
      <text class="axl" x="${px(0) + 6}" y="${H - padY}">price down</text>`;

    // ── laying the contacts out so they can be read ──────────────────────
    // Two coins that moved alike land on the same spot BY CONSTRUCTION — that
    // is what this plot is for — so bodies were drawing on top of each other
    // and their names smearing together ("POPCAT" over "BOME"). Both had to be
    // solved, and they are solved differently:
    //
    //  - THE BODY is nudged, never moved. A few relaxation passes push
    //    overlapping circles apart by the minimum that separates them, and
    //    NUDGE_CAP holds every body within 16 units of where the data actually
    //    put it — far less than the distance to an axis, so a contact can never
    //    cross into a quadrant it does not belong in. The exact figures are on
    //    the row below and in the contact board; this is a legibility nudge on
    //    a picture, not a correction to a reading.
    //  - THE LABEL is flipped, never nudged, and it is checked against LABELS
    //    ALREADY PLACED rather than against bodies. Two planets 20 units apart
    //    vertically put their names ~2 units apart, which a body-to-body test
    //    never sees — that is why the first attempt still overlapped.
    const NUDGE_CAP = 16;
    const nodes = [
      ...planets.map((r) => ({ r, kind: 'orb', rad: bodySize(r.mcap) / 2.4 })),
      ...asteroids.map((r) => ({ r, kind: 'rock', rad: 7 })),
    ].map((n) => {
      const x = +px(shockX(n.r.volShockPct)), y = +py(moveY(n.r.chg24));
      return { ...n, x0: x, y0: y, x, y };
    });
    for (let pass = 0; pass < 60; pass++) {
      let moved = false;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const need = a.rad + b.rad + 4;
          let dist = Math.hypot(dx, dy);
          if (dist >= need) continue;
          // exactly coincident: break the tie deterministically, never at random
          const ux = dist < 0.01 ? Math.cos(i * 2.4) : dx / dist;
          const uy = dist < 0.01 ? Math.sin(i * 2.4) : dy / dist;
          if (dist < 0.01) dist = 0.01;
          const push = (need - dist) / 2;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
          moved = true;
        }
      }
      // hold every body near its true reading
      for (const n of nodes) {
        const dx = n.x - n.x0, dy = n.y - n.y0, d = Math.hypot(dx, dy);
        if (d > NUDGE_CAP) { n.x = n.x0 + (dx / d) * NUDGE_CAP; n.y = n.y0 + (dy / d) * NUDGE_CAP; }
      }
      if (!moved) break;
    }
    const at = new Map(nodes.map((n) => [n.r.ca, n]));

    const placed = [];
    const hits = (x, ly) => placed.some((q) => Math.abs(q.x - x) < 76 && Math.abs(q.y - ly) < 15);
    const labelDy = (x, y, d) => {
      const above = +y - d - 7, below = +y + d + 15;
      const ly = hits(+x, above) ? below : above;
      placed.push({ x: +x, y: ly });
      return (ly - y).toFixed(1);
    };

    const rocks = asteroids.map((r) => {
      const n = at.get(r.ca);
      const x = n.x.toFixed(1), y = n.y.toFixed(1);
      return `<g class="rock ${r.ca === sel ? 'is-sel' : ''}" data-body="${esc(r.ca)}" transform="translate(${x},${y})">
        <circle class="hit" r="9"/>
        <path d="M-4,-3 L0,-5 L4,-2 L3,3 L-2,5 L-5,1 Z"/>
        <title>${esc(r.sym || '?')} — volume ${r.volShockPct >= 0 ? '+' : ''}${r.volShockPct}% vs its own normal</title>
      </g>`;
    }).join('');

    const orbs = planets.map((r) => {
      const n = at.get(r.ca);
      const d = n.rad;
      const x = n.x.toFixed(1), y = n.y.toFixed(1);
      const tone = r.chg24 > 2 ? 'up' : r.chg24 < -2 ? 'down' : 'flat';
      const ly = labelDy(x, y, d);
      return `<g class="orb is-${tone} ${r.onWatchlist ? 'is-held' : ''} ${r.ca === sel ? 'is-sel' : ''}" data-body="${esc(r.ca)}" transform="translate(${x},${y})">
        ${r.onWatchlist ? `<circle class="ring" r="${(d + 6).toFixed(1)}"/>` : ''}
        <circle class="body" r="${d.toFixed(1)}"/>
        <circle class="lim" r="${d.toFixed(1)}"/>
        <text class="lab" y="${ly}" text-anchor="middle">${esc(r.sym || '?')}</text>
        <title>${esc(r.sym || '?')} — volume ${r.volShockPct == null ? 'unmeasured' : (r.volShockPct >= 0 ? '+' : '') + r.volShockPct + '%'} vs its own normal, price ${r.chg24 == null ? '—' : (r.chg24 >= 0 ? '+' : '') + Math.round(r.chg24) + '%'} over 24h</title>
      </g>`;
    }).join('');

    // THE SCOPE. The operator's note was that the scanner "doesn't go over the
    // planets and stuff" — and it didn't: the sweep was a decoration in the
    // strip ABOVE this plot, rotating over nothing. A radar sweep that never
    // crosses the contacts it is supposedly finding is the clearest tell that a
    // room is a mock-up, so the sweep is now part of the plot itself.
    //
    // ! It is a CSS conic-gradient BEHIND the svg, not an svg wedge inside it.
    // A radar sweep's whole character is that it fades ANGULARLY behind the
    // leading edge; an svg wedge filled with a radial gradient fades outward
    // instead and reads as a hard triangle laid over the chart, which is what
    // the first attempt looked like. Conic does in one declaration what svg
    // cannot do at all here.
    //
    // ! The plot origin is exactly the centre of the viewBox — px(0) is 500 of
    // 1000, py(0) is 150 of 300 — which is why 50%/50% aligns the sweep to the
    // axes for free, at any rendered size. Keep that true if the padding changes.
    const rings = [90, 180, 270, 360, 450]
      .map((r) => `<circle class="rng" cx="${px(0)}" cy="${py(0)}" r="${r}"/>`).join('');

    return `<div class="st-fieldwrap"><span class="st-fieldsweep" aria-hidden="true"></span>
      <svg class="st-field" viewBox="0 0 ${W} ${H}" role="img"
        aria-label="Contact plot: volume against its own normal, horizontally; price move over 24 hours, vertically">
      ${rings}${grid}${rocks}${orbs}</svg></div>
      <div class="st-field-key">
        <span><i class="k-orb"></i>planet — held, or a mover that has persisted</span>
        <span><i class="k-rock"></i>asteroid — smaller or new, moved today</span>
        <span><i class="k-ring"></i>on your watchlist</span>
      </div>`;
  }

  function detailBoard(r) {
    if (!r) return `<div class="st-flatempty">Pick a body in the field.</div>`;
    const stat = (k, v, cls = '') => `<div class="st-stat"><span class="k">${esc(k)}</span><span class="v ${cls}">${v}</span></div>`;
    const shock = r.volShockPct;
    const b = social?.latest, rel = social?.reliability || {};
    const tone = !b || b.sentiment == null ? null : b.sentiment > 0.2 ? 'positive' : b.sentiment < -0.2 ? 'negative' : 'mixed';
    return `<div class="st-stats">
        ${stat('market cap', fmtUsd(r.mcap))}
        ${stat('liquidity', fmtUsd(r.liq))}
        ${stat('traded 24h', fmtUsd(r.vol24))}
        ${stat('vs its normal', shock == null ? '—' : (shock >= 0 ? '+' : '') + shock + '%', shock > 0 ? 'is-up' : shock < 0 ? 'is-down' : '')}
        ${stat('price 24h', r.chg24 == null ? '—' : (r.chg24 >= 0 ? '+' : '') + Math.round(r.chg24) + '%', r.chg24 > 0 ? 'is-up' : r.chg24 < 0 ? 'is-down' : '')}
        ${stat('age', ageStr(r.ageH))}
        ${stat('seen in', (r.scans || 0) + ' scans')}
        ${stat('social today', tone || 'nothing collected', tone === 'positive' ? 'is-up' : tone === 'negative' ? 'is-down' : '')}
      </div>
      ${b ? `<p class="st-say ${rel.manipulated ? 'is-warn' : ''}">${esc(rel.verdict || `${b.uniqueAuthors} different people posted in the last reading${social.breadth?.value != null ? `, ${social.breadth.value >= 0 ? 'wider' : 'narrower'} than this coin's usual` : ''}.`)}</p>` : ''}
      <div class="st-actrow">
        ${r.onWatchlist ? `<span class="chip is-flat">already yours</span>`
          : `<button class="btn sm accent" data-track="${esc(r.ca)}" data-sym="${esc(r.sym || '')}">track this</button>`}
      </div>`;
  }

  function row(t) {
    const shock = t.volShockPct;
    const badge = t.accumulating ? '<span class="v is-up">accumulating</span>'
      : t.onWatchlist ? '<span class="v" style="color:var(--st-holo)">yours</span>'
      : `<button class="btn sm" data-track="${esc(t.ca)}" data-sym="${esc(t.sym || '')}">track</button>`;
    return `<div class="st-flatrow is-pick ${t.ca === sel ? 'is-sel' : ''}" data-pick="${esc(t.ca)}">
      <span class="name">${esc(t.sym || '?')}</span>
      <span class="grow">${esc(t.name || '')} — ${t.accumulating
        ? `holders ${t.holderGrowth >= 0 ? '+' : ''}${t.holderGrowth}% · liquidity ${t.liqGrowth >= 0 ? '+' : ''}${t.liqGrowth}%`
        : `seen in ${t.scans} scan${t.scans === 1 ? '' : 's'}`}</span>
      <span class="v ${shock > 0 ? 'is-up' : shock < 0 ? 'is-down' : ''}">${shock == null ? '—' : (shock >= 0 ? '+' : '') + shock + '%'}</span>
      <span class="v">${fmtUsd(t.mcap)}</span>
      <span class="v">${fmtUsd(t.liq)}</span>
      <span class="v ${t.chg24 >= 0 ? 'is-up' : 'is-down'}">${t.chg24 != null ? (t.chg24 >= 0 ? '+' : '') + Math.round(t.chg24) + '%' : '—'}</span>
      <span class="v">${ageStr(t.ageH)}</span>
      ${badge}
    </div>`;
  }

  function render() {
    const tokens = data.tokens || [];
    const { planets, asteroids } = classifyBodies(tokens);
    const acc = tokens.filter((t) => t.accumulating).length;
    const blew = tokens.filter((t) => t.volShockPct != null && t.volShockPct >= 40).length;
    const fell = tokens.filter((t) => t.volShockPct != null && t.volShockPct <= -40).length;

    pill.innerHTML =
      `<span class="p"><b>${tokens.length}</b> tracked</span>` +
      (blew ? `<span class="p is-up"><b>${blew}</b> blew up</span>` : '') +
      (fell ? `<span class="p is-down"><b>${fell}</b> fell off</span>` : '') +
      (acc ? `<span class="p is-up"><b>${acc}</b> accumulating</span>` : '') +
      `<span class="p">swept ${data.lastScan ? ago(data.lastScan) : 'unknown'}</span>`;

    const r = tokens.find((t) => t.ca === sel) || null;
    // The scanner's row carries no safety gate or recorded trend, so the fused
    // reading here runs on what this screen actually has: today's move and the
    // social layer. Coverage says so, and the needle drops accordingly.
    const reading = r ? readCoin({
      market: { priceUsd: r.price, priceChange: { h24: r.chg24 } },
      trend: { recorded: r.scans || 0 },
      gate: r.verdict ? { verdict: r.verdict, findings: new Array(r.flags || 0) } : null,
    }, social, null) : null;

    const tableBody = tokens.length
      ? `<div class="st-flathead"><span class="name">ticker</span><span class="grow">status</span><span class="v">volume</span><span class="v">mcap</span><span class="v">liq</span><span class="v">24h</span><span class="v">age</span><span class="v"></span></div>`
        + tokens.map(row).join('')
      : `<div class="st-flatempty">No scans recorded yet. The scanner runs every few minutes — check back shortly.</div>`;

    wall.innerHTML =
      board({ label: `the field — ${planets.length} planets, ${asteroids.length} asteroids`, tag: 'MKT-1', full: true, body: field(planets, asteroids) }) +
      board({ label: r ? `contact — ${esc(r.sym || '?')}` : 'contact', tag: 'MKT-2', wide: true, body: detailBoard(r) }) +
      board({ label: 'how sure', tag: 'MKT-3', body: reading
        ? confidenceGauge(reading.confidence, { note: `${Math.round(reading.coverage * 100)}% of the inputs reported` })
        : `<div class="st-flatempty">—</div>` }) +
      board({ label: r ? `today's read — ${esc(r.sym || '?')}` : "today's read", tag: 'MKT-4', full: true,
        // ! the War Room link is offered only for a coin ALREADY on the
        // watchlist. That room reads getTokens(), so sending it a contact the
        // scanner merely found would land on a bench with nothing on it.
        body: reading
          ? verdictPanel(reading, { missing: ['trader'].filter((k) => !reading.votes.some((v) => v.key === k)) })
            + (r?.onWatchlist ? `<button class="st-verdict-why" data-war="${esc(r.ca)}">How was this read? →</button>` : '')
          : `<div class="st-flatempty">Pick a body in the field.</div>` }) +
      board({ label: `contacts — sorted by accumulation, then persistence, never price — ${tokens.length} tracked`, tag: 'MKT-5', full: true, body: tableBody });

    wall.querySelectorAll('[data-war]').forEach((el) => el.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('mcii:open-room', { detail: { view: 'war', ca: el.dataset.war } }));
    }));
    wall.querySelectorAll('[data-body],[data-pick]').forEach((el) => el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      select(el.dataset.body || el.dataset.pick);
    }));
    wall.querySelectorAll('[data-track]').forEach((b) => b.addEventListener('click', async () => {
      b.textContent = 'adding…'; b.disabled = true;
      await window.mcii.addToken(b.dataset.track, b.dataset.sym);
      refresh();
    }));
  }

  function select(ca) {
    if (!ca || ca === sel) return;
    sel = ca; social = null;
    render();
    loadSocial(ca);
  }

  // ! separate from select() on purpose: refresh() picks the first selection
  // itself, and routing that through select() would hit its own "already
  // selected" guard and silently never load the social reading for it.
  function loadSocial(ca) {
    window.mcii.socialFor(ca).then((s) => {
      if (!active || sel !== ca) return;
      social = s; render();
    }).catch(() => {});
  }

  async function refresh() {
    if (!active) return;
    let d;
    try { d = await window.mcii.screenLatest(); } catch { return; }
    if (!active) return;
    data = d;
    const tokens = d.tokens || [];
    if (!sel || !tokens.some((t) => t.ca === sel)) {
      // Land on the loudest thing in the room, not on alphabetical row one.
      const loudest = [...tokens].filter((t) => t.volShockPct != null)
        .sort((a, b) => Math.abs(b.volShockPct) - Math.abs(a.volShockPct))[0];
      sel = (loudest || tokens[0])?.ca || null;
      social = null;
      render();
      if (sel) loadSocial(sel);
      return;
    }
    render();
  }

  return {
    show() { active = true; root.hidden = false; refresh(); },
    hide() { active = false; root.hidden = true; },
  };
}
