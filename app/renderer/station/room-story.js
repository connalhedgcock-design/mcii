/**
 * room-story — "The Story", a new door, no flat screen behind it (same shape as
 * the War Room: this is a new capability, not a rebuild of an existing tab).
 *
 * Built 2026-09-09 on Connal's direct request, after walking through the manual
 * version by hand for one real coin (4Stock, a BSC tokenized-stock product) in
 * chat. Paste any contract address in; get back what the coin actually is
 * (name, chain, price — via the same resolver `tokens:refresh` uses) and
 * whatever real news already exists under that name.
 *
 * ! Every headline is a NAME MATCH, never a confirmed link — `main/narrative.js`
 * runs the coin's own name through the same unvetted self-name search
 * `newsfeed.js`'s collectSelfNameNews uses for the watchlist sweep, and that
 * filter exists precisely because a name can coincidentally match something
 * real and unrelated (measured live once already: "microduck" the coin vs. an
 * unrelated Hugging Face robot). `confirmed: false` on every row is not a
 * technicality — it is the difference the mandate draws between a fact and a
 * coincidence, and it has to survive into this screen's own words, not just
 * live in a comment.
 *
 * Extended same day, after Connal asked how to track a memecoin's narrative in
 * general (not just one address): three more boards, all free, all reusing
 * machinery already built rather than a new subsystem --
 *   - what the project itself claims (DexScreener's own `info.websites`/`socials`,
 *     already fetched by `fetchMarket` and previously discarded)
 *   - holder concentration (top1%/top10%) for coins already on the watchlist --
 *     already collected by `history.js`, never displayed anywhere until now
 *   - a "meta" tag Connal can set by hand (D-16: a person names it, the app
 *     never guesses one), purely descriptive, never scored or compared across
 *     coins -- see `50-LOG/2026-09-09-*` for why a cross-coin version of this
 *     is deliberately NOT what this is.
 */
import { mountRoom, board, esc, fmtUsd, ago, askText } from './rooms.js';

export function initStoryRoom(root) {
  const { pill, wall } = mountRoom(root, { beyondClass: 'rm-story', tag: 'STO', title: 'The Story' });
  let active = false;
  let ca = '';
  let loading = false;
  let result = null;   // shape: { ca, name, symbol, chain, priceUsd, marketCap, info, items, confirmed }
  let error = null;
  let tracked = null;  // the matching entry from cachedTokens(), if this coin is already on the watchlist
  let holders = { top1: [], top10: [] };

  function trend(series) {
    if (!series || series.length < 2) return null;
    const first = series[0].v, last = series[series.length - 1].v;
    return { last, diff: last - first };
  }

  function render() {
    pill.innerHTML = result
      ? `<span class="p">looked up <b>${esc(result.symbol || result.name || '?')}</b></span>
         <span class="p">on <b>${esc(result.chain || '?')}</b></span>
         <span class="p">${result.items.length} headline${result.items.length === 1 ? '' : 's'} under that name</span>`
      : `<span class="p">paste a contract address to start</span>`;

    const boxBody = `
      <div class="st-actrow">
        <input type="text" id="story-ca" value="${esc(ca)}" placeholder="the coin's contract address"
          style="flex:1; min-width:0">
        <button class="btn sm accent" data-lookup ${loading ? 'disabled' : ''}>${loading ? 'looking…' : 'look it up'}</button>
      </div>
      ${error ? `<p class="st-flatempty">${esc(error)}</p>` : ''}`;

    let out = board({ label: 'paste a contract address', tag: 'STO-1', wide: true, body: boxBody });

    if (result) {
      out += board({ label: `${esc(result.name || result.symbol || 'this coin')} — what it is`, tag: 'STO-2', wide: true, body: `
        <div class="st-stats">
          <div class="st-stat"><span class="k">name</span><span class="v">${esc(result.name || '—')}</span></div>
          <div class="st-stat"><span class="k">ticker</span><span class="v">${esc(result.symbol || '—')}</span></div>
          <div class="st-stat"><span class="k">chain</span><span class="v">${esc(result.chain || '—')}</span></div>
          <div class="st-stat"><span class="k">price</span><span class="v">${result.priceUsd ? fmtUsd(result.priceUsd) : '—'}</span></div>
          <div class="st-stat"><span class="k">market cap</span><span class="v">${result.marketCap ? fmtUsd(result.marketCap) : '—'}</span></div>
        </div>` });

      // What the project itself has posted -- not verified, just what's on record.
      const websites = result.info?.websites || [];
      const socials = result.info?.socials || [];
      out += board({ label: 'what the project says about itself', tag: 'STO-4', wide: true, body:
        (websites.length || socials.length)
          ? `<div class="st-actrow" style="flex-wrap:wrap; gap:8px">
              ${websites.map((w) => `<a href="#" data-open="${esc(w.url)}" class="chip is-flat">${esc(w.label || 'website')}</a>`).join('')}
              ${socials.map((s) => `<a href="#" data-open="${esc(s.url)}" class="chip is-flat">${esc(s.type || 'social')}</a>`).join('')}
            </div>`
          : `<div class="st-flatempty">This coin hasn't posted a website or social link on its DexScreener listing.</div>` });

      // Meta: a short, human-set label for what real-world/cultural story this coin is riding.
      // Only settable for a coin already on the watchlist -- the field lives on the watchlist
      // entry, same as its nickname.
      if (tracked) {
        out += board({ label: 'the meta — what story is this riding', tag: 'STO-5', wide: true, body: `
          <div class="st-actrow">
            <span class="grow">${tracked.meta ? esc(tracked.meta) : '<span class="st-flatempty" style="margin:0">not set yet</span>'}</span>
            <button class="btn sm" data-setmeta="${esc(ca)}">${tracked.meta ? 'edit' : 'set it'}</button>
          </div>
          <p class="st-flatempty">Your own call, not a guess the app makes — a short label for what real-world
            or cultural story this coin is riding (e.g. "AI meme", "TON/Telegram DAO meme").</p>` });

        // Holder concentration -- already collected on-chain for every tracked coin, never shown
        // anywhere until now. The project's own free substitute for a paid "bubblemaps" tool.
        const t1 = trend(holders.top1), t10 = trend(holders.top10);
        out += board({ label: 'who actually holds it', tag: 'STO-6', wide: true, body:
          (t1 || t10)
            ? `<div class="st-stats">
                <div class="st-stat"><span class="k">biggest holder</span>
                  <span class="v">${t1 ? t1.last.toFixed(1) + '%' : '—'}</span></div>
                <div class="st-stat"><span class="k">top 10 holders</span>
                  <span class="v">${t10 ? t10.last.toFixed(1) + '%' : '—'}</span></div>
                <div class="st-stat"><span class="k">last 30 days</span>
                  <span class="v">${t1 ? (t1.diff > 0.5 ? 'concentrating' : t1.diff < -0.5 ? 'spreading out' : 'steady') : '—'}</span></div>
              </div>
              <p class="st-flatempty">How much of the supply the biggest holders control, and whether that's
                rising or falling — a fact about who owns it, not a buy or sell signal on its own.</p>`
            : `<div class="st-flatempty">No holder history recorded yet for this coin.</div>` });
      }

      out += board({ label: "what's published under that name", tag: 'STO-3', full: true, body:
        (result.items.length
          ? result.items.map((item) => `
            <div class="st-flatrow">
              <span class="grow"><a href="#" data-open="${esc(item.link || '')}">${esc(item.title)}</a></span>
              <span class="n">${esc(item.source || '')}</span>
              <span class="n">${item.ts ? ago(item.ts) : ''}</span>
            </div>`).join('')
          : `<div class="st-flatempty">Nothing found under this name. No news is a real answer here —
             it usually means the story is the trading itself, not anything outside it.</div>`)
        + `<p class="st-flatempty">These are matches on the coin's name, not a confirmed link — a name
           can coincidentally match something real and unrelated. Open each one and check it is
           actually about this coin before trusting it as its story.</p>` });
    }

    wall.innerHTML = out;
    wall.querySelector('[data-lookup]')?.addEventListener('click', lookup);
    wall.querySelector('#story-ca')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') lookup(); });
    wall.querySelectorAll('[data-open]').forEach((el) =>
      el.addEventListener('click', (e) => { e.preventDefault(); if (el.dataset.open) window.mcii.openExternal(el.dataset.open); }));
    wall.querySelector('[data-setmeta]')?.addEventListener('click', setMeta);
  }

  async function setMeta() {
    const value = await askText('What story is this coin riding?', {
      value: tracked?.meta || '', placeholder: 'e.g. "AI meme", "TON/Telegram DAO meme"', ok: 'Save',
    });
    if (value === null) return; // cancelled
    try { await window.mcii.setMeta(ca, value); } catch { /* the room just re-reads on failure below */ }
    tracked = (await cachedTokenFor(ca)) || tracked;
    render();
  }

  async function cachedTokenFor(ca) {
    let tokens = [];
    try { tokens = (await window.mcii.cachedTokens()) || []; } catch { tokens = []; }
    return tokens.find((t) => t.ca === ca) || null;
  }

  async function lookup() {
    const input = wall.querySelector('#story-ca');
    ca = (input?.value || '').trim();
    if (!ca) return;
    loading = true; error = null; result = null; tracked = null; holders = { top1: [], top10: [] };
    render();
    try {
      result = await window.mcii.narrativeLookup(ca);
    } catch (e) {
      error = `Could not look that up: ${e.message || e}`;
    }
    if (result) {
      tracked = await cachedTokenFor(ca);
      if (tracked) {
        const [top1, top10] = await Promise.all([
          window.mcii.historySeries(ca, 'top1', 30).catch(() => []),
          window.mcii.historySeries(ca, 'top10', 30).catch(() => []),
        ]);
        holders = { top1: top1 || [], top10: top10 || [] };
      }
    }
    loading = false;
    render();
  }

  return {
    show() { active = true; root.hidden = false; render(); },
    hide() { active = false; root.hidden = true; },
    isActive: () => active,
  };
}
