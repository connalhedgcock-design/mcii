const { fetchMarket } = require('./adapters/dexscreener');
const { fetchSafety } = require('./adapters/rugcheck');
const { maxExitable, fetchTokenMeta } = require('./adapters/jupiter');
const { evaluateSafety } = require('../shared/safety');
const history = require('./history');

// Tiered live monitoring.
//
// Measured 2026-08-26: DexScreener sustains 10 calls/sec with no failures, so watchlist market
// data can be near-real-time for free. The expensive checks cannot run at that rate, so they are
// triggered by change rather than by clock -- re-simulating an exit every ten seconds would burn
// 17 calls per token per tick to tell us nothing new.
//
// What live buys us is speed at noticing DANGER, not speed at entering. Entry speed is a race
// against colocated bots and is not winnable here; a liquidity pull that we see in fifteen
// seconds instead of forty minutes is.

const TIERS = {
  fastMs: 15000,          // price / liquidity / flow
  exitRecheckPct: 5,      // re-simulate the exit when liquidity moves this much
  safetyRecheckMs: 600000,// structural facts change rarely
  // Polling is fast; the permanent record is not. Writing every tick would add ~5,760 rows per
  // token per day and destroy the bounded-storage property, without adding information -- the
  // trend lines and alerts read fine at five-minute resolution.
  historyWriteMs: 300000,
};

class LiveMonitor {
  constructor({ onUpdate = () => {}, onAlert = () => {} } = {}) {
    this.onUpdate = onUpdate;
    this.onAlert = onAlert;
    this.tokens = new Map();     // ca -> live state
    this.timer = null;
  }

  watch(list) {
    for (const t of list) {
      if (!this.tokens.has(t.ca)) this.tokens.set(t.ca, { ...t, lastSafety: 0, lastExitLiq: null, lastHistory: 0, meta: null });
    }
    for (const ca of [...this.tokens.keys()]) if (!list.some((t) => t.ca === ca)) this.tokens.delete(ca);
  }

  start() { if (!this.timer) { this.tick(); this.timer = setInterval(() => this.tick(), TIERS.fastMs); } }
  stop() { clearInterval(this.timer); this.timer = null; }

  async tick() {
    for (const [ca, st] of this.tokens) {
      try { await this.pollOne(ca, st); }
      catch (e) { /* a failed poll is not a reading; leave prior state untouched */ }
    }
  }

  async pollOne(ca, st) {
    const market = await fetchMarket(ca);
    const prev = st.market;
    st.market = market;

    // Decimals are needed before any exit simulation can run, and never change. Fetched once.
    if (!st.meta) {
      try { st.meta = await fetchTokenMeta(ca); } catch { /* retried next tick */ }
    }

    // Immediate movement alerts, off live data rather than the recorded history. These fire on
    // what is happening now; the history-based alerts still cover slower drifts.
    if (prev) {
      const liqPct = prev.totalLiquidityUsd
        ? ((market.totalLiquidityUsd - prev.totalLiquidityUsd) / prev.totalLiquidityUsd) * 100 : 0;
      const pxPct = prev.priceUsd ? ((market.priceUsd - prev.priceUsd) / prev.priceUsd) * 100 : 0;

      if (liqPct <= -15) this.onAlert({
        severity: 'CRITICAL', ca, sym: st.sym, id: 'liquidity-pull',
        title: `${st.sym}: liquidity just dropped ${Math.abs(liqPct).toFixed(0)}%`,
        detail: `Pool liquidity fell from $${Math.round(prev.totalLiquidityUsd).toLocaleString()} to $${Math.round(market.totalLiquidityUsd).toLocaleString()} in the last ${TIERS.fastMs / 1000} seconds. A sudden drop is how a rug looks while it is happening.`,
        at: Date.now(),
      });
      else if (pxPct <= -12) this.onAlert({
        severity: 'HIGH', ca, sym: st.sym, id: 'price-drop',
        title: `${st.sym}: price fell ${Math.abs(pxPct).toFixed(0)}% in seconds`,
        detail: `From $${prev.priceUsd.toPrecision(4)} to $${market.priceUsd.toPrecision(4)}. Check liquidity before assuming this is a dip.`,
        at: Date.now(),
      });

      // Expensive check, triggered by change rather than by clock.
      const moved = st.lastExitLiq
        ? Math.abs((market.totalLiquidityUsd - st.lastExitLiq) / st.lastExitLiq) * 100 : 100;
      if (moved >= TIERS.exitRecheckPct && st.meta) {
        st.lastExitLiq = market.totalLiquidityUsd;
        maxExitable(ca, st.meta.decimals, market.priceUsd)
          .then((x) => { st.exit = x; this.onUpdate(this.snapshot(ca)); })
          .catch(() => {});
      }
    }

    if (Date.now() - st.lastSafety > TIERS.safetyRecheckMs) {
      st.lastSafety = Date.now();
      fetchSafety(ca).then((s) => {
        const gate = evaluateSafety(s, market);
        // A token that was passing and stops passing is the single most urgent thing this app
        // can tell you, so it is checked on a clock rather than waiting for a refresh.
        if (st.gate && st.gate.verdict === 'PASS' && gate.verdict !== 'PASS') this.onAlert({
          severity: 'CRITICAL', ca, sym: st.sym, id: 'safety-flip-live',
          title: `${st.sym} just failed its safety check`,
          detail: gate.findings[0]?.detail || 'A structural safety condition changed.',
          at: Date.now(),
        });
        st.safety = s; st.gate = gate;
        this.onUpdate(this.snapshot(ca));
      }).catch(() => {});
    }

    if (Date.now() - st.lastHistory > TIERS.historyWriteMs) {
      st.lastHistory = Date.now();
      history.record(ca, this.snapshot(ca));
    }
    this.onUpdate(this.snapshot(ca));
  }

  snapshot(ca) {
    const st = this.tokens.get(ca) || {};
    return { ca, sym: st.sym, market: st.market, safety: st.safety, gate: st.gate,
             exit: st.exit, meta: st.meta, updatedAt: Date.now() };
  }
}
module.exports = { LiveMonitor, TIERS };
