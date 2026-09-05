/**
 * rooms — shared scaffold for the five flat doors rebuilt as real rooms:
 * Your Coins, The Market, What's Happening, The Journal, The Portfolio.
 *
 * Each door gets its own module (room-watch.js, room-market.js, ...) that
 * mounts into a NEW sibling element next to the flat <main> it replaces —
 * never into the flat main itself. That main keeps running exactly as it
 * always has (app.js's own load functions still populate it, its own IPC
 * listeners still fire); this only decides which of the two is SHOWN.
 * Two consequences, both deliberate:
 *   - zero risk to the existing screens: nothing here edits app.js, and a
 *     bug in a room can only affect that room, never the flat fallback.
 *   - a second, independent read of the same window.mcii data. That data is
 *     a local snapshot file, not a network call (see 70-AREAS/mcii-overview
 *     /OVERVIEW.md), so the duplicate read costs nothing worth avoiding.
 *
 * Zero imports, same convention as every other station/ module: this reads
 * window.mcii directly and duplicates app.js's tiny formatters rather than
 * import them, because station/ never reaches into app.js and app.js is a
 * file two people edit by hand.
 */

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const fmtUsd = (n) => n == null ? '—' : '$' + Math.round(n).toLocaleString();
export const fmtNum = (n) => n == null ? '—' : Number(n).toLocaleString();
export const ago = (t) => {
  if (t == null) return '—';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
};
export const pctStr = (n) => n == null ? '—' : (n >= 0 ? '+' : '') + Number(n).toFixed(1) + '%';
export const pctCls = (n) => n == null ? '' : n >= 0 ? 'is-up' : 'is-down';

/** verdict/severity → the real .st-lamp legend states (station.css). */
export function lit(state) {
  if (state === 'PASS' || state === 'ok' || state === true) return 'ok';
  if (state === 'CAUTION' || state === 'MED' || state === 'warn') return 'warn';
  if (state === 'FAIL' || state === 'CRITICAL' || state === 'HIGH' || state === 'alarm') return 'alarm';
  if (state === 'sig') return 'sig';
  return null;
}
export function lampCell(text, state) {
  const l = lit(state);
  return `<span class="st-lamp"${l ? ` data-lit="${l}"` : ''}>${esc(text)}</span>`;
}

/** The shell every room shares: a placard + status pill row, a beyond layer
 *  (pure atmosphere, gets its per-room class from `beyondClass`), and a wall
 *  the room's own render() fills with real .st-board instruments. */
export function mountRoom(root, { beyondClass, tag, title, scan = true }) {
  root.classList.add('st-flatroom');
  // ⚠️ .st-flatenv is SEPARATE from .st-flatbeyond on purpose: every room owns
  // and overwrites `beyond.innerHTML` on each render, so anything shared that
  // lived in there would be wiped by the first room that redrew. The floor and
  // horizon belong to the room shell, not to the motif, so they get their own
  // layer that no room's render can reach.
  //
  // ⚠️ .st-flatscan sits BEHIND the wall, not over it. It was tried on top and
  // the operator's verdict was immediate: "i dont like how it overlays in front
  // of everything else it should be in the background". He is right — a wash
  // crossing live numbers is a veil over the reading, and the glass boards
  // already let it read through from behind, which is the effect without the
  // cost.
  //
  // ⚠️ `scan: false` is not a style toggle, it is a rule: a room that owns a
  // scanning instrument does not also get the room-wide one. The Market's plot
  // IS a scope, and two unrelated sweeps at two speeds in one room read as two
  // bugs rather than one idea.
  root.innerHTML = `
    <div class="st-flatenv ${beyondClass}" aria-hidden="true"><span class="fl-floor"></span><span class="fl-horizon"></span></div>
    <div class="st-flatbeyond ${beyondClass}"></div>
    <div class="st-flattop">
      <span class="st-flatplacard"><b>${esc(title)}</b> · ${esc(tag)}-1</span>
      <span class="st-flatpill" data-pill></span>
    </div>
    <div class="st-flatwall" data-wall></div>
    ${scan ? `<div class="st-flatscan ${beyondClass}" aria-hidden="true"><i></i></div>` : ''}
  `;
  return {
    pill: root.querySelector('[data-pill]'),
    wall: root.querySelector('[data-wall]'),
    beyond: root.querySelector('.st-flatbeyond'),
  };
}

export function board({ label, tag, wide, full, body }) {
  const cls = full ? 'is-full' : wide ? 'is-wide' : '';
  return `<div class="st-board st-flatboard ${cls}">
    <div class="st-board-screws"></div>
    ${tag ? `<span class="st-placard">${esc(tag)}</span>` : ''}
    <div class="st-board-head"><span class="st-label">${esc(label)}</span></div>
    <div class="st-board-body">${body}</div>
  </div>`;
}

// !! window.prompt() THROWS in an Electron renderer — app.js's own askText()
// comment documents three buttons this silently killed. Same fix here: a
// real overlay, never window.prompt().
export function askText(question, { value = '', placeholder = '', ok = 'OK' } = {}) {
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
