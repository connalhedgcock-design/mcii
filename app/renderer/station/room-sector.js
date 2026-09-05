/**
 * room-sector — "What's Happening", rebuilt to ROOM-BRIEF §3, §11 and §14.
 *
 * §3: keep the noisy, chattering texture (the moving graph and the circle) but
 * stop short of chaos — so the waveform stays and is now DRIVEN BY THE SWEEP's
 * own numbers instead of a fixed pattern, and nothing else in the backdrop moves.
 * §11: what matters at a glance is the synthesis — the posts that got real
 * traction, and the general trends in the day's social data.
 * §14, the correction that drove this rebuild: "No dont lose those find a new
 * way to display all the same information in the new system." Everything the
 * flat tab carries and the first room dropped is back — the market-wide funnel,
 * the coins the scanner found, the shared-ticker warning, the discard pile, and
 * the J7 Tracker link.
 *
 * ! the real-world event tracker §11 also asks for does not exist yet. Nothing
 * collects it, so nothing here pretends to: the synthesis board reads the social
 * layer only, and says which layer it read.
 */
import { mountRoom, board, esc, fmtNum, fmtUsd, ago } from './rooms.js';

const postCard = (p) => `<div class="st-post">
  <div class="h">
    <b>${esc(p.handle ? '@' + p.handle : 'unknown')}</b>
    ${p.kind ? `<span class="chip is-${p.kind === 'failure' ? 'down' : p.kind === 'held' ? 'up' : 'flat'}">${esc(p.kind)}</span>` : ''}
    <span>${fmtNum(p.views)} views</span>
  </div>
  <div class="t">${esc(p.text)}</div>
  ${p.why ? `<div class="w">${esc(p.why)}</div>` : ''}
</div>`;

export function initSectorRoom(root) {
  const { pill, wall, beyond } = mountRoom(root, { beyondClass: 'rm-sector', tag: 'SEC', title: "What's Happening" });
  let active = false;

  /** The dish and the waveform. §3's "mix of both": the bars carry the real
   *  shape of the sweep (each bar is one of the day's top posts, its height its
   *  reach) so the chatter is the DATA chattering, and the only other motion in
   *  the room is the dish's slow breath. Chaos comes from many things moving at
   *  once; one moving instrument reads as alive, not as noise. */
  function backdrop(d) {
    // ! A WAVEFORM HAS TO SPAN, or it is not a waveform. This read the day's top
    // posts straight into bars, and on a quiet day that is three stubs in the
    // corner of an empty band — which is what "looks like it's still being
    // built" actually was. Fixed count of BARS, always: the real posts are the
    // loud ones and the rest of the trace is the day's background chatter,
    // falling away from them. The shape is still the data; it just no longer
    // depends on the data being plentiful to look like an instrument.
    const BARS = 34;
    const posts = (d?.social?.topPosts || d?.topPosts || d?.social?.important || []).slice(0, 9);
    const views = posts.map((p) => p.views || 0);
    const max = Math.max(...views, 1);
    const loud = (posts.length ? views : [52, 88, 34, 70, 46, 95, 60, 41, 78]).map((v) => (v / (posts.length ? max : 100)));
    // Spread the real readings evenly across the trace and let each one decay
    // into its neighbours, so the wave has peaks WHERE THE POSTS ARE.
    const step = BARS / Math.max(loud.length, 1);
    const heights = Array.from({ length: BARS }, (_, i) => {
      let h = 0.10;
      loud.forEach((v, k) => {
        const centre = k * step + step / 2;
        h = Math.max(h, v * Math.exp(-Math.pow((i - centre) / (step * 0.42), 2)));
      });
      // a little deterministic texture so a flat stretch still reads as a trace
      return Math.max(0.09, Math.min(1, h + 0.055 * Math.abs(Math.sin(i * 2.399))));
    });
    const bars = heights.map((h, i) =>
      `<i style="--h:${Math.round(h * 100)}%;animation-delay:${((i % 7) * 0.19).toFixed(2)}s"></i>`).join('');
    beyond.innerHTML = `<div class="fl-dish"><b></b><b></b><b></b><s></s></div><div class="fl-wave">${bars}</div>`;
  }

  function render(d) {
    const s = d.social;
    const tone = s && s.sentiment != null ? s.sentiment : null;
    const toneWord = tone == null ? (s && s.sentimentThin ? 'too few posts to call' : 'no clear tone')
      : tone > 0.15 ? 'positive' : tone < -0.15 ? 'negative' : 'mixed';

    pill.innerHTML =
      `<span class="p">tone: <b>${esc(toneWord)}</b></span>` +
      (s ? `<span class="p"><b>${fmtNum(s.uniqueAuthors)}</b> people posting</span>` : '') +
      `<span class="p">${d.collectedAt ? 'read ' + ago(d.collectedAt) : 'no chatter yet'}</span>`;

    backdrop(d);

    const f = s?.filter || null;
    const important = s?.important || [];
    const background = s?.background || [];
    const aside = s?.setAsideSample || [];

    // ── the synthesis, §11 ────────────────────────────────────────────────
    const headBody = (d.lines.length
      ? d.lines.map((l) => `<p class="st-say">${esc(l)}</p>`).join('')
      : `<div class="st-flatempty">Not enough collected yet to say anything. This fills in as the hourly job runs.</div>`)
      + (d.caveats?.length ? `<div class="st-caveats"><b>what this does not tell you</b>${d.caveats.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : '');

    // ── the market as a whole — the funnel that got cut, restored ─────────
    const b = d.breadth || {}, co = d.cohort || {};
    const stat = (k, v, cls = '') => `<div class="st-stat"><span class="k">${esc(k)}</span><span class="v ${cls}">${v}</span></div>`;
    const marketBody = `<div class="st-stats">
        ${stat('passed the last scan', d.funnel ? `${d.funnel.survivors} of ${d.funnel.universe}` : '—')}
        ${stat('coins up / down 24h', b.n ? `${b.up} / ${b.down}` : '—', b.n && b.up > b.down ? 'is-up' : b.n ? 'is-down' : '')}
        ${stat('middle coin moved', b.median != null ? (b.median > 0 ? '+' : '') + b.median + '%' : '—', b.median > 0 ? 'is-up' : b.median < 0 ? 'is-down' : '')}
        ${stat('pool shrank since found', co.tracked >= 5 ? `${co.drained + co.halved} of ${co.tracked}` : 'not enough history')}
      </div>
      ${d.funnel?.topRejects?.length ? `<p class="st-note">Dropped for: ${d.funnel.topRejects.map(([r, n]) => `${esc(r)} (${n})`).join(', ')}.</p>` : ''}`;

    // ── the conversation ──────────────────────────────────────────────────
    const moodBody = s ? `<div class="st-stats">
        ${stat('posts in the sweep', fmtNum(s.posts))}
        ${stat('tone', toneWord + (tone != null ? ` (${tone > 0 ? '+' : ''}${tone.toFixed(2)})` : ''), tone > 0.15 ? 'is-up' : tone < -0.15 ? 'is-down' : '')}
        ${stat('sales language', s.shillRatio != null ? Math.round(s.shillRatio * 100) + '%' : '—', s.shillRatio > 0.5 ? 'is-down' : '')}
        ${stat('repeated posts', s.duplicateRatio != null ? Math.round(s.duplicateRatio * 100) + '%' : '—', s.duplicateRatio > 0.3 ? 'is-down' : '')}
      </div>
      <p class="st-note">Tone and sales language are counted separately: a post can sound enthusiastic and still be an advert, and those need opposite reactions.</p>`
      : `<div class="st-flatempty">No social readings collected yet.</div>`;

    // ── worth reading / background / the discard pile ─────────────────────
    const readBody = s ? `
      <div class="st-flathead"><span class="grow">worth reading</span><span class="v">${f ? `${important.length} of ${f.total}` : '—'}</span></div>
      ${important.length ? important.slice(0, 5).map(postCard).join('')
        : `<div class="st-flatempty">Nothing in this sweep was about your coins or a coin failing.</div>`}
      ${background.length ? `<div class="st-flathead" style="margin-top:12px"><span class="grow">background — coins the scanner found, and general talk</span><span class="v">${background.length}</span></div>
        ${background.slice(0, 3).map(postCard).join('')}` : ''}
      ${f ? `<p class="st-note">${Math.round((f.promoShare || 0) * 100)}% of this sweep was advertising or posts name-dropping a list of coins. That share is itself worth watching: a market being sold to looks different from one being argued about.</p>` : ''}
      ${aside.length ? `<details class="st-aside"><summary>what was set aside (${f ? f.total - important.length - background.length : aside.length})</summary>
        ${aside.slice(0, 4).map(postCard).join('')}
        <p class="st-note">Shown so you can catch the filter being wrong. It sorts; it never deletes.</p></details>` : ''}`
      : `<div class="st-flatempty">No social readings collected yet.</div>`;

    // ── coins people are naming ───────────────────────────────────────────
    const ident = new Map(((s && s.identified) || []).map((i) => [i.ticker, i]));
    const idCell = (t) => {
      const i = ident.get(t.ticker);
      if (!i) return 'on our list already';
      if (i.ambiguous) return `<span class="is-down">${i.matches.length} different coins use this name</span>`;
      if (!i.resolved) return esc(i.reason || 'could not identify');
      const m = i.matches[0];
      return `${esc(i.resolved.name || i.resolved.sym)} · ${fmtUsd(m.liquidityUsd)} in the pool${m.ageDays != null ? ` · ${Math.round(m.ageDays)}d old` : ''}`;
    };
    const named = (d.tickers || []).filter((t) => !t.major).slice(0, 10);
    const tickerBody = named.length ? `
      <div class="st-flathead"><span class="name">named</span><span class="grow">which coin this actually is</span><span class="v">people</span><span class="v">posts</span></div>
      ${named.map((t) => `<div class="st-flatrow"><span class="name">$${esc(t.ticker)}</span><span class="grow">${idCell(t)}</span><span class="v">${t.people}</span><span class="v">${t.mentions}</span></div>`).join('')}
      <p class="st-note">Sorted by how many different people said it, never by how many posts. Fifty posts from three accounts is a campaign, not interest.</p>`
      : `<div class="st-flatempty">Nothing named often enough to list yet.</div>`;

    // ── coins the scanner found — the second thing that got cut ───────────
    const recent = d.recent || [];
    const recentBody = recent.length ? `
      <div class="st-flathead"><span class="name">coin</span><span class="grow">found</span><span class="v">liquidity</span><span class="v">24h</span><span class="v">age</span></div>
      ${recent.slice(0, 12).map((c) => `<div class="st-flatrow">
        <span class="name">${esc(c.sym || '—')}</span>
        <span class="grow">${ago(c.ts)}</span>
        <span class="v">${fmtUsd(c.liq)}</span>
        <span class="v ${c.chg24 >= 0 ? 'is-up' : 'is-down'}">${c.chg24 != null ? (c.chg24 >= 0 ? '+' : '') + Math.round(c.chg24) + '%' : '—'}</span>
        <span class="v">${c.ageH != null ? Math.round(c.ageH) + 'h' : '—'}</span></div>`).join('')}
      <p class="st-note">Ordered by when they were found. The 24h column is there to read, not to sort by.</p>`
      : '';

    // ── shared tickers: high up, it changes how every number below reads ──
    const col = Object.values(d.collisions || {});
    const sharedBody = col.length ? col.map((c) => `<p class="st-say is-warn">${c.of} different Solana coins use <b>$${esc(c.ticker)}</b>.
        Yours is number ${c.rank} of them by how much money is in the pool${c.rivals && c.rivals[0] ? `, behind ${esc(c.rivals[0].name || 'another coin')} at ${fmtUsd(c.rivals[0].liquidityUsd)}` : ''}.</p>
        <p class="st-note">So a post saying "$${esc(c.ticker)}" is probably not about your coin. Posts are counted for yours only when they include the actual contract address.</p>`).join('') : '';

    // ── J7 Tracker: a link, for the reason 70-AREAS/j7-tracker/LOG.md records ──
    const j7Body = `<p class="st-note">Their bot-check blocks embedded windows, so this opens in your regular browser.</p>
      <div class="st-actrow"><button class="btn sm accent" data-j7>Open j7tracker.io</button></div>`;

    wall.innerHTML =
      board({ label: "what's happening in memecoins", tag: 'SIG-1', wide: true, body: headBody }) +
      board({ label: 'the market as a whole', tag: 'MKT-6', body: marketBody }) +
      (sharedBody ? board({ label: 'one of your coins shares its name', tag: 'SYS-3', full: true, body: sharedBody }) : '') +
      board({ label: 'worth reading', tag: 'SIG-2', wide: true, body: readBody }) +
      board({ label: 'the conversation', tag: 'SIG-3', body: moodBody }) +
      board({ label: 'coins people are naming', tag: 'SIG-4', wide: true, body: tickerBody }) +
      board({ label: 'j7 tracker', tag: 'EXT-3', body: j7Body }) +
      (recentBody ? board({ label: 'coins the scanner found', tag: 'SIG-5', full: true, body: recentBody }) : '');

    const j7 = wall.querySelector('[data-j7]');
    if (j7) j7.addEventListener('click', () => window.mcii.openExternal('https://j7tracker.io'));
  }

  async function refresh() {
    if (!active) return;
    let d;
    try { d = await window.mcii.sector(); } catch { return; }
    if (active) render(d);
  }

  return {
    show() { active = true; root.hidden = false; refresh(); },
    hide() { active = false; root.hidden = true; },
  };
}
