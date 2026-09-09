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
 *
 * Extended again 2026-09-09b, after the news-only version kept coming back empty:
 * most memecoins have never been in the news at all -- the story lives on X, not
 * in an article. Added a one-time, on-demand X search (one click = one search for
 * one coin, never a sweep, never a timer) plus pump.fun's own coin description and
 * DexScreener's boost status. The X posts get EXACTLY the same treatment as the
 * news headlines above: raw, `confirmed: false`, no score or sentiment number
 * attached to any of it -- read it, don't trust it. That "no score" property is
 * also what keeps this a one-coin lookup rather than the broad X mood-tracking
 * D-122 killed on Connal's own instruction; see 50-LOG/decisions.md.
 *
 * Extended again 2026-09-09c: an "ask for a read" board that reuses The War Room's evidence-packet
 * + Orion pipeline (`evidence:build`/`evidence:analyze`), generalized to work on ANY address, not
 * just watchlist coins -- `evidencepacket.js` falls back to this lookup's own resolved chain/symbol
 * and folds THIS lookup's already-fetched news/X/project links in as the packet's "narrative"
 * snapshot, so a fresh coin gets a real AI-written verdict (bull case, bear case, falsifier) without
 * a second X search. Whatever is already saved about the exact address (past trades, market
 * history) rides along automatically if it happens to already be tracked.
 */
import { mountRoom, board, esc, fmtUsd, ago, askText } from './rooms.js';

export function initStoryRoom(root) {
  const { pill, wall } = mountRoom(root, { beyondClass: 'rm-story', tag: 'STO', title: 'The Story' });
  let active = false;
  let ca = '';
  let loading = false;
  let result = null;   // shape: { ca, name, symbol, chain, priceUsd, marketCap, info, items, xPosts, pumpfun, boost, confirmed }
  let error = null;
  let tracked = null;  // the matching entry from cachedTokens(), if this coin is already on the watchlist
  let holders = { top1: [], top10: [] };
  let ai = { analyzing: false, packet: null, result: null }; // the AI's read, built from this lookup + whatever's saved

  function trend(series) {
    if (!series || series.length < 2) return null;
    const first = series[0].v, last = series[series.length - 1].v;
    return { last, diff: last - first };
  }

  // Raw posts, one-time search for one coin, no score or sentiment number attached to any of
  // it -- read it, don't trust it. Same framing as the news board below, deliberately.
  function xPostsBody(xPosts) {
    if (!xPosts || xPosts.skipped) {
      return `<div class="st-flatempty">${esc((xPosts && xPosts.reason) || 'X search not available.')}</div>`;
    }
    if (!xPosts.posts.length) {
      return `<div class="st-flatempty">${xPosts.reason ? esc(xPosts.reason)
        : "No posts found mentioning this coin's address or cashtag right now."}</div>`;
    }
    return xPosts.posts.map((p) => `
        <div class="st-flatrow">
          <span class="grow"><a href="#" data-open="${esc(p.url || '')}">${p.handle ? '@' + esc(p.handle) + ' — ' : ''}${esc((p.text || '').slice(0, 180))}</a></span>
          <span class="n">${p.likes ?? 0}♥ ${p.reposts ?? 0}↻</span>
          <span class="n">${p.createdAt ? ago(p.createdAt) : ''}</span>
        </div>`).join('')
      + (xPosts.truncated ? `<p class="st-flatempty">More posts exist than shown — capped for this lookup.</p>` : '')
      + `<p class="st-flatempty">Raw posts mentioning this coin's address or cashtag, not confirmed and not
         scored — read them yourself before trusting any of it as the coin's actual story.</p>`;
  }

  // The AI's read on this address -- reuses the same evidence-packet + Orion pipeline The War Room
  // uses for tracked coins (`evidence:build`/`evidence:analyze`), but works for ANY address: the
  // packet falls back to this lookup's own resolved chain/symbol when the coin isn't on the
  // watchlist, and folds in this lookup's already-fetched news/X/project links as the packet's
  // "narrative" snapshot -- no second X search, no double spend. Whatever else is already saved
  // about this exact address (past trades, market history, notable posts) rides along for free
  // if this coin does happen to be one already being tracked.
  function aiReadBody() {
    if (!result) return `<div class="st-flatempty">Look up a coin above first.</div>`;
    if (ai.analyzing) {
      return `<div class="st-flatempty">${ai.packet ? 'Orion is reading the evidence…' : 'Putting the evidence together…'}</div>`;
    }
    if (!ai.result) {
      return `<div class="st-actrow">
          <button class="btn sm accent" data-ask-orion>ask for a read</button>
        </div>
        <p class="st-flatempty">Pulls together everything already saved about this coin plus what
          was just looked up above, and asks the AI for an honest read — bull case, bear case, and
          what would prove it wrong. Nothing is invented: gaps in the data are named, not guessed.</p>`;
    }
    const again = `<div class="st-actrow"><button class="btn sm" data-ask-orion>ask again (fresh read)</button></div>`;
    return ai.result.ok
      ? `<div class="st-warblind-row">${ai.result.source === 'local'
          ? '<p class="st-warblind-foot">Claude was unavailable -- answered by the on-Mac model instead.</p>' : ''}
        <p>${esc(ai.result.reply).replace(/\n/g, '<br>')}</p></div>${again}`
      : `<div class="st-flatempty">Could not get a read: ${esc(ai.result.error || 'unknown error')}</div>${again}`;
  }

  async function askOrion() {
    if (!result) return;
    ai = { analyzing: true, packet: null, result: null };
    render();
    try {
      ai.packet = await window.mcii.evidenceBuild(ca, undefined, result);
    } catch (e) {
      ai = { analyzing: false, packet: null, result: { ok: false, error: `Could not put together the evidence: ${e.message || e}` } };
      render();
      return;
    }
    render();
    try {
      ai.result = await window.mcii.evidenceAnalyze(ca, result.chain);
    } catch (e) {
      ai.result = { ok: false, error: String(e.message || e) };
    }
    ai.analyzing = false;
    render();
  }

  function render() {
    pill.innerHTML = result
      ? `<span class="p">looked up <b>${esc(result.symbol || result.name || '?')}</b></span>
         <span class="p">on <b>${esc(result.chain || '?')}</b></span>
         <span class="p">${result.items.length} headline${result.items.length === 1 ? '' : 's'} under that name</span>
         <span class="p">${result.xPosts?.posts.length || 0} X post${result.xPosts?.posts.length === 1 ? '' : 's'}</span>`
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
          <div class="st-stat"><span class="k">visibility</span>
            <span class="v">${result.boost ? (result.boost.active ? 'boosted (paid)' : 'organic') : '—'}</span></div>
        </div>` });

      // What the project itself has posted -- not verified, just what's on record. Folds in
      // pump.fun's own description/links for coins launched there, additively alongside whatever
      // DexScreener already carries -- either source filling a gap the other left empty counts.
      const websites = result.info?.websites || [];
      const socials = result.info?.socials || [];
      const pf = result.pumpfun;
      out += board({ label: 'what the project says about itself', tag: 'STO-4', wide: true, body:
        (websites.length || socials.length || pf)
          ? `${pf?.description ? `<p class="st-flatempty" style="opacity:.85; margin-top:0">${esc(pf.description)}</p>` : ''}
            <div class="st-actrow" style="flex-wrap:wrap; gap:8px">
              ${websites.map((w) => `<a href="#" data-open="${esc(w.url)}" class="chip is-flat">${esc(w.label || 'website')}</a>`).join('')}
              ${socials.map((s) => `<a href="#" data-open="${esc(s.url)}" class="chip is-flat">${esc(s.type || 'social')}</a>`).join('')}
              ${pf?.website ? `<a href="#" data-open="${esc(pf.website)}" class="chip is-flat">website (pump.fun)</a>` : ''}
              ${pf?.twitter ? `<a href="#" data-open="${esc(pf.twitter)}" class="chip is-flat">twitter (pump.fun)</a>` : ''}
              ${pf?.telegram ? `<a href="#" data-open="${esc(pf.telegram)}" class="chip is-flat">telegram (pump.fun)</a>` : ''}
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

      out += board({ label: "the AI's read on this", tag: 'STO-8', full: true, body: aiReadBody() });

      out += board({ label: 'what X is saying', tag: 'STO-7', full: true, body: xPostsBody(result.xPosts) });

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
    wall.querySelector('[data-ask-orion]')?.addEventListener('click', askOrion);
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
    ai = { analyzing: false, packet: null, result: null }; // never show the old address's AI read against a new one
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
