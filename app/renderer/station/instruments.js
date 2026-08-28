/**
 * instruments — the six hanging boards.
 *
 * THE LAW OF THIS FILE: no two instruments share a silhouette. An operator
 * reads a panel by SHAPE before they read a label — the round dial is the
 * attitude, the vertical tape is the speed, the row of lamps is the caution
 * panel. Six identical cards showing six different numbers is a card grid, and
 * a card grid throws away the cheapest source of legibility there is.
 *
 * ⚠️ Every board renders from ONE snapshot of ONE fetch, so no two gauges on
 * screen can be describing different moments.
 *
 * ⚠️ A board with no data draws its frame and SAYS SO. It never draws an empty
 * gauge — an empty gauge is a reading, and "I could not check" is a different
 * claim from "there is nothing there".
 */

import { fraction, WINDOWS } from './station-geometry.js'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const fmtUsd = (n) => {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + Math.round(n)
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE SNAPSHOT — one fetch, one moment.
   Each source is caught independently: a feed that is down must darken its own
   lamp, not blank the whole wall.
   ═══════════════════════════════════════════════════════════════════════════ */
export async function snapshot(windowId = '24h') {
  const api = window.mcii || {}
  const win = WINDOWS.find((w) => w.id === windowId) || WINDOWS[1]
  const out = { at: Date.now(), win, tokens: null, screen: null, alerts: null, health: null, series: null }

  // ⚠️ cachedTokens, not getTokens. `getTokens` re-fetches four upstream APIs per
  // coin; this wall redraws on resize and on every window change, and a gauge is
  // not a reason to hit the network. Falls back only if the channel is missing.
  const [tokens, screen, alerts, health] = await Promise.allSettled([
    api.cachedTokens ? api.cachedTokens() : api.getTokens ? api.getTokens() : Promise.reject(new Error('no api')),
    api.screenLatest ? api.screenLatest() : Promise.reject(new Error('no api')),
    api.allAlerts ? api.allAlerts() : Promise.reject(new Error('no api')),
    api.collectionHealth ? api.collectionHealth() : Promise.reject(new Error('no api')),
  ])
  if (tokens.status === 'fulfilled') out.tokens = tokens.value
  if (screen.status === 'fulfilled') out.screen = screen.value
  if (alerts.status === 'fulfilled') out.alerts = alerts.value
  if (health.status === 'fulfilled') out.health = health.value

  // The trace needs a subject: the largest thing being tracked.
  const lead = (out.tokens || []).slice().sort(
    (a, b) => (b.market?.totalLiquidityUsd || 0) - (a.market?.totalLiquidityUsd || 0))[0]
  if (lead && api.historySeries) {
    try {
      out.series = { sym: lead.sym, rows: await api.historySeries(lead.ca, 'price', win.ms / 864e5) }
    } catch { out.series = null }
  }
  return out
}

/* ═══════════════════════════════════════════════════════════════════════════
   1 · THE CHANNEL STRIP — several categories compared.
   Horizontal, because a vertical bar is about 30px wide for seven series and no
   real word fits in 30px — a vertical chart forces you to abbreviate your own
   taxonomy. Segmented rather than continuous, because a lit count reads back as
   a number and a smooth bar does not.
   ═══════════════════════════════════════════════════════════════════════════ */
const SEGS = 12
function strips(snap) {
  const all = snap.tokens
  if (!all) return nodata('could not read')
  if (!all.length) return nodata('nothing tracked')

  // ⚠️ EVERY tracked coin gets a row, including one whose feed has not answered.
  // Dropping it would silently shrink the universe the panel claims to show, and
  // an unlit meter beside a name is itself the reading: "tracked, no depth known".
  const rows = all.slice()
    .sort((a, b) => (b.market?.totalLiquidityUsd || 0) - (a.market?.totalLiquidityUsd || 0))
    .slice(0, 7)
  const max = Math.max(...rows.map((r) => r.market?.totalLiquidityUsd || 0), 1)

  const body = rows.map((r) => {
    const liq = r.market?.totalLiquidityUsd
    const lit = liq == null ? 0 : Math.round(fraction(liq, max) * SEGS)
    // ⚠️ Unlit segments are DRAWN. The empty half is what makes the lit half a
    // reading.
    const segs = Array.from({ length: SEGS }, (_, i) => {
      const on = i < lit
      const hot = on && i >= SEGS - 2
      return `<span class="st-strip-seg"${on ? ' data-on' : ''}${hot ? ' data-hot' : ''}></span>`
    }).join('')
    return `<div class="st-strip">
      <span class="st-strip-name">${esc(r.sym)}</span>
      <span class="st-strip-num">${liq == null ? '—' : fmtUsd(liq)}</span>
      <span class="st-strip-meter">${segs}</span>
    </div>`
  }).join('')

  const known = rows.filter((r) => r.market?.totalLiquidityUsd != null)
  const total = known.reduce((s, r) => s + r.market.totalLiquidityUsd, 0)
  const sum = `<div class="st-strips-sum">
    <span>tracked</span><b>${all.length}</b>
    <span>pooled</span><b>${known.length ? fmtUsd(total) : '—'}</b>
    <span>deepest</span><b>${known.length ? esc(known[0].sym) : '—'}</b>
  </div>`

  return `<div class="st-strips">${body}${sum}</div>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 · THE ARC GAUGE — a value inside a known range.
   Position on an arc is preattentive: you see "high" before you read a digit.
   ⚠️ The dial carries its own digital readout and range endpoints, because a
   86px circle alone in a 240px panel is a hole, and the answer to a hole is
   always more instrument — never a bigger version of the same one.
   ═══════════════════════════════════════════════════════════════════════════ */
function arc(snap) {
  const t = (snap.tokens || []).filter((x) => x.market?.priceChange?.h24 != null)
  if (!t.length) return nodata('no price data')
  const up = t.filter((x) => x.market.priceChange.h24 >= 0).length
  const v = fraction(up, t.length)
  return `<div class="st-arc">
    <div class="st-arc-face" style="--v:${v.toFixed(3)};--redline:1">
      <span class="st-arc-scale"></span>
      <span class="st-arc-fill"></span>
      <span class="st-arc-needle"></span>
      <span class="st-arc-hub"></span>
    </div>
    <div class="st-arc-read"><b>${up}/${t.length}</b><i>up 24h</i></div>
    <div class="st-arc-ends"><span>0</span><span>${t.length}</span></div>
  </div>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   3 · THE ODOMETER + TAPE — one number that matters more than the others.
   Scale IS the hierarchy. The tape beneath it says where that number sits,
   which the digits alone cannot carry.
   ═══════════════════════════════════════════════════════════════════════════ */
function odo(snap) {
  const t = (snap.tokens || []).filter((x) => x.market)
  if (!t.length) return nodata('no market data')
  const total = t.reduce((s, x) => s + (x.market.totalLiquidityUsd || 0), 0)
  const txt = fmtUsd(total)
  // Per-digit cells with a seam, because that is what a mechanical counter is.
  const digits = txt.split('').map((c) => /[0-9]/.test(c)
    ? `<span class="st-odo-d">${c}</span>`
    : `<span class="st-odo-sep">${esc(c)}</span>`).join('')

  // The tape: where this sits against the deepest single pool.
  const max = Math.max(...t.map((x) => x.market.totalLiquidityUsd || 0), 1)
  const offset = Math.round((0.5 - fraction(total / t.length, max)) * 120)
  // The label is the value alone: prefixed with "avg " it ran past the tape's
  // own right edge and was clipped mid-word by the strip's overflow.
  return `<div class="st-odo">${digits}</div>
    <div class="st-tape" style="margin-top:10px">
      <span class="st-tape-scale" style="--tape:${offset}px"></span>
      <span class="st-tape-now" data-v="${fmtUsd(total / t.length)}"></span>
    </div>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   4 · THE ANNUNCIATOR — a set of binary states.
   You read the PATTERN of lit cells, not each cell.
   ⚠️ An unlit lamp is DRAWN, dark, legend still legible. A caution panel is
   supposed to enumerate every condition it monitors INCLUDING the ones that are
   fine — the dark lamps are half the reading.
   ═══════════════════════════════════════════════════════════════════════════ */
function annun(snap) {
  const lamps = []

  // One lamp per tracked coin: its safety verdict.
  for (const t of (snap.tokens || []).slice(0, 6)) {
    const v = t.gate?.verdict
    lamps.push({
      legend: t.sym,
      lit: v === 'FAIL' ? 'alarm' : v === 'CAUTION' ? 'warn' : v === 'PASS' ? 'ok' : null,
    })
  }

  // One lamp per feed. A feed that errored on ANY token is degraded, and the
  // lamp says so rather than the wall going quiet.
  const errs = (snap.tokens || []).flatMap((t) => t.errors || []).join(' ').toLowerCase()
  const feed = (name, needle) => ({
    legend: name,
    lit: snap.tokens == null ? null : errs.includes(needle) ? 'warn' : 'ok',
  })
  lamps.push(feed('dex', 'market data'))
  lamps.push(feed('rugchk', 'safety'))
  lamps.push(feed('jupiter', 'exit'))
  lamps.push(feed('gecko', 'price history'))

  // The shared cloud record — the only thing filling in while both laptops are
  // shut. `stale` is the app's own word for it.
  const h = snap.health
  lamps.push({
    legend: 'cloud',
    lit: h == null ? null : (h.stale || h.quiet) ? 'warn' : 'ok',
  })

  // The signal layer gets its own hue — it is the product's whole thesis.
  const social = (snap.tokens || []).some((t) => t.social || t.socialLatest)
  lamps.push({ legend: 'signal', lit: social ? 'sig' : null })

  // Live alerts, loudest first.
  const a = snap.alerts || []
  const crit = a.filter((x) => x.severity === 'CRITICAL').length
  const high = a.filter((x) => x.severity === 'HIGH').length
  lamps.push({ legend: `crit ${crit}`, lit: crit ? 'alarm' : null })
  lamps.push({ legend: `high ${high}`, lit: high ? 'warn' : null })

  if (!lamps.length) return nodata('nothing monitored')
  return `<div class="st-annun">${lamps.map((l) =>
    `<span class="st-lamp"${l.lit ? ` data-lit="${l.lit}"` : ''}>${esc(l.legend)}</span>`
  ).join('')}</div>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   5 · THE SPARKLINE — a value over time. Shape over time IS the reading; a
   single number would throw it away.
   ═══════════════════════════════════════════════════════════════════════════ */
function spark(snap) {
  const s = snap.series
  if (!s || !Array.isArray(s.rows) || s.rows.length < 2) return nodata('not enough history')
  const rows = s.rows.slice(-40)
  const vals = rows.map((r) => r.v)
  const lo = Math.min(...vals), hi = Math.max(...vals)
  const span = (hi - lo) || hi || 1
  const first = vals[0], last = vals[vals.length - 1]
  return `<div class="st-spark">${vals.map((v, i) => {
    const h = 8 + ((v - lo) / span) * 92
    const now = i === vals.length - 1
    const dir = v >= first ? 'data-up' : 'data-down'
    return `<span class="st-spark-bar" ${now ? 'data-now' : dir} style="height:${h.toFixed(1)}%"></span>`
  }).join('')}</div>`
}

function sparkHead(snap) {
  const s = snap.series
  if (!s || !Array.isArray(s.rows) || s.rows.length < 2) return { text: '—', cls: 'is-none' }
  const v = s.rows.map((r) => r.v)
  const pct = ((v[v.length - 1] - v[0]) / v[0]) * 100
  return {
    text: (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%',
    cls: pct >= 0 ? 'is-up' : 'is-down',
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   6 · THE ROTARY SELECTOR — a discrete choice.
   ⚠️ Instead of a dropdown, which hides the options you did not pick. A rotary
   shows the whole range at rest, which is information you get for free.
   ⚠️ And it shows what the selection YIELDS. A selector with no visible
   consequence is a control looking for a panel to live on.
   ═══════════════════════════════════════════════════════════════════════════ */
function rotary(snap) {
  const i = Math.max(0, WINDOWS.findIndex((w) => w.id === snap.win.id))
  const rot = -60 + (i / Math.max(1, WINDOWS.length - 1)) * 120

  const recorded = (snap.tokens || []).reduce((s, t) => s + (t.trend?.recorded || 0), 0)
  const scanned = snap.screen?.tokens?.length ?? null
  const lastScan = snap.screen?.lastScan
    ? Math.round((Date.now() - snap.screen.lastScan) / 60000) + 'm ago' : '—'

  // ⚠️ Knob, legends and readout sit on ONE ROW. Stacked, they came to ~111px in
  // a body that is ~95px tall on a 900px screen and the last line was clipped
  // away. A span-1 board is wide and short; the instrument has to be too.
  return `<div class="st-rotary">
      <span class="st-rot-knob" style="--rot:${rot}deg" role="button" tabindex="0"
            aria-label="time window"></span>
      <span class="st-rot-opts">${WINDOWS.map((w) =>
        `<span class="st-rot-opt ${w.id === snap.win.id ? 'is-on' : ''}" data-win="${w.id}">${esc(w.label)}</span>`
      ).join('')}</span>
      <span class="st-rot-yield">
        <span>readings</span><b>${recorded || '—'}</b>
        <span>scanned</span><b>${scanned ?? '—'}</b>
        <span>scan</span><b>${esc(lastScan)}</b>
      </span>
    </div>`
}

function nodata(why) {
  return `<div class="st-nodata">${esc(why)}</div>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   The headline number on each board's header. `null` renders faint, never zero
   — "I could not check" and "there is nothing there" must never look the same.
   ═══════════════════════════════════════════════════════════════════════════ */
function headlineFor(board, snap) {
  const t = snap.tokens
  switch (board.instrument) {
    case 'strips': return t ? { text: String(t.length), cls: '' } : { text: '—', cls: 'is-none' }
    case 'arc': {
      if (!t?.length) return { text: '—', cls: 'is-none' }
      const withCh = t.filter((x) => x.market?.priceChange?.h24 != null)
      if (!withCh.length) return { text: '—', cls: 'is-none' }
      const avg = withCh.reduce((s, x) => s + x.market.priceChange.h24, 0) / withCh.length
      return { text: (avg >= 0 ? '+' : '') + avg.toFixed(1) + '%', cls: avg >= 0 ? 'is-up' : 'is-down' }
    }
    case 'odo': return { text: '', cls: '' }
    case 'annun': {
      const n = (snap.alerts || []).length
      return snap.alerts == null
        ? { text: '—', cls: 'is-none' }
        : { text: String(n), cls: n ? 'is-down' : 'is-up' }
    }
    case 'spark': return sparkHead(snap)
    case 'rotary': return { text: snap.win.id, cls: '' }
    default: return { text: '', cls: '' }
  }
}

const RENDER = { strips, arc, odo, annun, spark, rotary }

/** Build one board's DOM. */
export function renderBoard(board, snap) {
  const el = document.createElement('section')
  el.className = 'st-board'
  el.dataset.board = board.id
  el.style.transform = `rotateY(${board.tilt}deg)`
  el.style.flexGrow = String(board.span)

  const head = headlineFor(board, snap)
  const body = (RENDER[board.instrument] || (() => nodata('no instrument')))(snap)
  const label = board.instrument === 'spark' && snap.series
    ? `${board.label} · ${snap.series.sym}` : board.label

  el.innerHTML = `
    <header class="st-board-head">
      <span class="st-label">${esc(label)}</span>
      <span class="st-board-num ${head.cls}">${esc(head.text)}</span>
    </header>
    <div class="st-board-body">${body}</div>
    <span class="st-placard">${esc(board.tag)}</span>
    <span class="st-board-screws" aria-hidden="true"></span>`
  return el
}
