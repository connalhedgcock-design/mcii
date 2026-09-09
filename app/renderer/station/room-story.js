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
 */
import { mountRoom, board, esc, fmtUsd, ago } from './rooms.js';

export function initStoryRoom(root) {
  const { pill, wall } = mountRoom(root, { beyondClass: 'rm-story', tag: 'STO', title: 'The Story' });
  let active = false;
  let ca = '';
  let loading = false;
  let result = null;   // shape: { ca, name, symbol, chain, priceUsd, marketCap, items, confirmed }
  let error = null;

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
  }

  async function lookup() {
    const input = wall.querySelector('#story-ca');
    ca = (input?.value || '').trim();
    if (!ca) return;
    loading = true; error = null; result = null;
    render();
    try {
      result = await window.mcii.narrativeLookup(ca);
    } catch (e) {
      error = `Could not look that up: ${e.message || e}`;
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
