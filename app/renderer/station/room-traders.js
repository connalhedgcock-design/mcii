/**
 * room-traders — "Traders", a new door, no flat screen behind it (same shape as the War Room and
 * The Story: a new capability, not a rebuild of an existing tab).
 *
 * Built 2026-09-09 on Connal's direct request, after he asked twice in one conversation for the
 * top-trader-tracking work to keep going, and specifically for "data to see who is actually good,
 * what they are good at, and why they are trading the way they are." He also asked, separately, to
 * hold off on any new phone notifications until this is fully functional -- this room is exactly
 * that: analysis surfaced IN THE APP, nothing pushed anywhere, per D-125's own conclusion the first
 * time this was attempted the wrong way.
 *
 * ! What it can actually answer, and what it can't, stated once here rather than implied:
 *   - "is this trader's recent buying paying off" -- yes, measured, via shared/traderstats.js
 *     (real on-chain buys, resolved against a real 2-hour price capture, same triple-barrier rule
 *     every admission forecast uses).
 *   - "what are they good at" -- NOT attempted. Categorizing a trader's specialty from a handful
 *     of resolved trades would be inventing a pattern from noise, exactly the anti-pattern the
 *     mandate bans. What's shown instead: how many different coins, how often their own "buy"
 *     looked like a same-window flip -- real, cheap, honest numbers, not a persona.
 *   - "why are they trading the way they are" -- NOT ANSWERABLE from on-chain data. Intent is not
 *     observable. This room does not guess at it, and says so.
 *   - n is small right now (the on-chain trigger only started firing 2026-09-08/09) -- every row's
 *     own `trust` label says so plainly rather than letting a 100% win-rate-of-one look like a
 *     result.
 */
import { mountRoom, board, esc, ago, pctCls } from './rooms.js';

const pct1 = (n) => n == null ? '—' : (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%';

export function initTradersRoom(root) {
  const { pill, wall } = mountRoom(root, { beyondClass: 'rm-traders', tag: 'TRD', title: 'Traders' });
  let active = false;
  let rows = [];
  let loading = false;
  let error = null;

  function leaderboard() {
    if (loading) return `<div class="st-flatempty">reading followed-trader activity…</div>`;
    if (error) return `<div class="st-flatempty">Could not load trader activity: ${esc(error)}</div>`;
    if (!rows.length) return `<div class="st-flatempty">No on-chain activity from your followed traders yet.</div>`;
    const line = (r) => `<div class="st-flatrow st-warrow">
      <span class="name">@${esc(r.handle)}</span>
      <span class="grow">${r.buys} buy${r.buys === 1 ? '' : 's'} · ${r.sells} sell${r.sells === 1 ? '' : 's'} · ${r.coins} coin${r.coins === 1 ? '' : 's'}</span>
      <span class="n" title="buys resolved against a real 2h outcome, out of buys total">${r.resolved}/${r.buys} resolved</span>
      <span class="n ${pctCls(r.winRate == null ? null : r.winRate - 0.5)}" title="share of resolved buys that hit a real +20% target before a -15% stop">${r.winRate == null ? '—' : Math.round(r.winRate * 100) + '%'}</span>
      <span class="n ${pctCls(r.avgRet)}" title="average return across resolved buys">${pct1(r.avgRet)}</span>
      <span class="n" title="share of their own buys/sells flagged as a same-window flip on the same coin">${r.selfTradeRate == null ? '—' : Math.round(r.selfTradeRate * 100) + '% flip'}</span>
      <span class="n">${r.lastTs ? ago(r.lastTs) : '—'}</span>
    </div>
    <div class="st-flatrow st-warrow is-missing"><span class="name"></span><span class="grow">${esc(r.trust)}${r.pending ? ` · ${r.pending} buy${r.pending === 1 ? '' : 's'} still inside its 2h window` : ''}</span></div>`;
    return `<div class="st-flathead st-warrow">
        <span class="name">TRADER</span><span class="grow">ACTIVITY</span>
        <span class="n">RESOLVED</span><span class="n">WIN RATE</span><span class="n">AVG RETURN</span><span class="n">FLIP RATE</span><span class="n">LAST SEEN</span>
      </div>` + rows.map(line).join('');
  }

  function caveats() {
    return `<div class="st-warblind">
      <p class="st-warblind-foot">What this room can tell you: whether a trader's recent real buys went
        on to hit a real +20% target or a real -15% stop within 2 hours, and how often their own "buy"
        looked like a same-window flip rather than a held position. Both are measured from real chain
        data, not guessed.</p>
      <p class="st-warblind-foot">What it can't: WHY someone trades the way they do -- intent isn't on
        the chain, and this room doesn't invent a story for it. "What they're good at" isn't scored
        either -- sorting a handful of trades into a specialty would be a pattern read into noise.</p>
      <p class="st-warblind-foot">Win rate and average return only count RESOLVED buys -- a trade still
        inside its 2-hour window is shown as pending, never folded in as a win, loss, or zero (a
        missing answer is not the same as a bad one). Sells aren't scored at all: we don't know a
        trader's entry cost, so calling a sell a win or a loss here would be invented.</p>
      <p class="st-warblind-foot">Numbers are thin right now -- the on-chain watch only started
        2026-09-09. Treat anything under ~10 resolved trades as noise, and even 50 as an early read,
        not a verdict (each row's own label says which it is).</p>
    </div>`;
  }

  function render() {
    const withData = rows.filter((r) => r.resolved >= 10).length;
    pill.innerHTML = loading
      ? `<span class="p">loading…</span>`
      : `<span class="p"><b>${rows.length}</b> trader${rows.length === 1 ? '' : 's'} with on-chain activity</span>
         <span class="p"><b>${withData}</b> past the too-thin-to-trust bar</span>`;

    wall.innerHTML =
      board({ label: `followed-trader buy performance — ${rows.length}`, tag: 'TRD-1', full: true, body: leaderboard() }) +
      board({ label: 'what this can and can\'t tell you', tag: 'TRD-2', full: true, body: caveats() });
  }

  async function load() {
    loading = true; error = null; render();
    try { rows = (await window.mcii.traderStats()) || []; }
    catch (e) { error = String(e.message || e); rows = []; }
    loading = false;
    if (active) render();
  }

  if (window.mcii?.onRefreshed) window.mcii.onRefreshed(() => { if (active) load(); });

  return {
    show() { active = true; root.hidden = false; load(); },
    hide() { active = false; root.hidden = true; },
    isActive: () => active,
  };
}
