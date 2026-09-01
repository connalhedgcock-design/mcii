const history = require('./history');

// Alerts fire off the recorded history, not off single readings. A number is only alarming
// relative to its own past, so every rule needs at least two data points and says so when it
// hasn't got them yet. Silence here means "not enough recorded", never "all clear".

// ! HOW MUCH HE WOULD ACTUALLY SELL. Connal, 2026-09-01: "stop giving me the how much can you
// sell notifications... unless it dips below 1000 dollars because i am not selling any more than
// 1000 dollars of any coin right now."
// The exit number only matters where it constrains a sale he would actually make. His positions
// are $7-25 and his stated ceiling is $1,000, so an exit falling from $800k to $200k is a 75% drop
// and completely irrelevant to him — alerting on it is noise that teaches him to ignore the alert
// that eventually matters.
// ! this is a NOTIFICATION gate, not a data gate. The number is still measured, still recorded,
// still shown on the card. What stops is the interruption.
// ! raise this the moment he trades bigger. It is a fact about his position sizes, not about the
// market, and it silently becomes wrong if those change.
const EXIT_MATTERS_BELOW_USD = 1000;

const RULES = [
  {
    id: 'exit-drop',
    severity: 'HIGH',
    windowMs: 7 * 864e5,
    test: (t) => {
      const d = t.trend?.exitUsd;
      if (!d || d.spanHours < 1) return null;
      if (d.pct > -20) return null;
      // ! Only worth interrupting for if the exit has come down to a size he might actually sell.
      if (d.to >= EXIT_MATTERS_BELOW_USD) return null;
      return {
        title: `You can sell ${Math.abs(d.pct).toFixed(0)}% less ${t.sym} than before`,
        detail: `The amount you could offload without crashing the price fell from $${Math.round(d.from).toLocaleString()} to $${Math.round(d.to).toLocaleString()} over ${fmtSpan(d.spanHours)}. This is the constraint on your position, and it is tightening.`,
      };
    },
  },
  {
    id: 'liq-drain',
    severity: 'HIGH',
    test: (t) => {
      const d = t.trend?.liq;
      if (!d || d.spanHours < 1 || d.pct > -25) return null;
      return {
        title: `Money is leaving ${t.sym}'s trading pools`,
        detail: `Pool liquidity fell ${Math.abs(d.pct).toFixed(0)}% over ${fmtSpan(d.spanHours)}, from $${Math.round(d.from).toLocaleString()} to $${Math.round(d.to).toLocaleString()}. Liquidity leaving before price does is a warning; it means the exit gets narrower.`,
      };
    },
  },
  {
    // Ground truth from chain, hourly. Holders here means wallets with a balance, so a move is
    // people genuinely opening or emptying positions rather than an index recounting itself.
    id: 'holders-exodus',
    severity: 'HIGH',
    test: (t) => {
      const d = t.holderTruth;
      if (!d || d.changePct == null || d.changePct > -8) return null;
      return {
        title: `${t.sym} lost ${Math.abs(d.changePct).toFixed(0)}% of its holders`,
        detail: `Wallets holding ${t.sym} fell from ${d.from.toLocaleString()} to ${d.to.toLocaleString()} in ${d.hours < 2 ? Math.round(d.hours * 60) + ' minutes' : d.hours.toFixed(0) + ' hours'}. This is counted directly from the blockchain, so it is people actually selling out, not a data glitch.`,
      };
    },
  },
  {
    // A sudden influx is not automatically good. Airdrops, wash distribution and bot swarms all
    // look like this, and each of them means the new "holders" are not buyers.
    id: 'holders-surge',
    severity: 'MED',
    test: (t) => {
      const d = t.holderTruth;
      if (!d || d.changePct == null || d.changePct < 25) return null;
      return {
        title: `${t.sym} gained ${d.changePct.toFixed(0)}% more holders`,
        detail: `Wallets holding ${t.sym} went from ${d.from.toLocaleString()} to ${d.to.toLocaleString()} in ${d.hours < 2 ? Math.round(d.hours * 60) + ' minutes' : d.hours.toFixed(0) + ' hours'}. Worth checking why before reading it as demand — airdrops and distribution campaigns produce the same shape as genuine buying.`,
      };
    },
  },
  {
    id: 'holders-falling',
    severity: 'MED',
    test: (t) => {
      const d = t.trend?.holders;
      if (!d || d.spanHours < 6 || d.pct > -5) return null;
      return {
        title: `${t.sym} is losing holders`,
        detail: `Holder count fell ${Math.abs(d.pct).toFixed(1)}% over ${fmtSpan(d.spanHours)} (${Math.round(d.from).toLocaleString()} to ${Math.round(d.to).toLocaleString()}). People are leaving, not arriving.`,
      };
    },
  },
  {
    id: 'concentrating',
    severity: 'MED',
    test: (t) => {
      const d = t.trend?.top10;
      if (!d || d.spanHours < 6 || d.pct < 15) return null;
      return {
        title: `${t.sym} ownership is concentrating`,
        detail: `The top 10 wallets went from holding ${d.from.toFixed(1)}% to ${d.to.toFixed(1)}% over ${fmtSpan(d.spanHours)}. Fewer hands holding more means a single seller matters more.`,
      };
    },
  },
  {
    id: 'safety-flip',
    severity: 'CRITICAL',
    test: (t, prev) => {
      if (!prev || !t.gate) return null;
      if (prev.verdict === 'PASS' && t.gate.verdict !== 'PASS') {
        return {
          title: `${t.sym} no longer passes its safety check`,
          detail: `It was passing at the last reading and now reads ${t.gate.verdict}. ${(t.gate.findings[0]?.detail) || ''} Open the card and read the safety section before doing anything else.`,
        };
      }
      return null;
    },
  },
  {
    id: 'position-exceeds-exit',
    severity: 'HIGH',
    test: (t) => {
      if (!t.position?.tokens || !t.exit || !t.market) return null;
      const held = t.position.tokens * t.market.priceUsd;
      if (held <= t.exit.usd) return null;
      // ! And only if the exit is small in absolute terms. A position bigger than the market can
      // absorb is meaningless when the position is $12.
      if (t.exit.usd >= EXIT_MATTERS_BELOW_USD) return null;
      const pctStuck = ((held - t.exit.usd) / held) * 100;
      return {
        title: `Your ${t.sym} position is larger than the market can absorb`,
        detail: `You hold about $${Math.round(held).toLocaleString()} but only around $${Math.round(t.exit.usd).toLocaleString()} can be sold before the price drops 5%. Roughly ${pctStuck.toFixed(0)}% of this position cannot be exited at anything near the quoted price.`,
      };
    },
  },
  {
    id: 'volume-collapse',
    severity: 'MED',
    test: (t) => {
      const rows = history.read(t.ca, 7 * 864e5).filter((r) => r.v24 != null);
      if (rows.length < 2) return null;
      const first = rows[0].v24, last = rows[rows.length - 1].v24;
      if (!first || last / first > 0.35) return null;
      return {
        title: `Trading in ${t.sym} has dried up`,
        detail: `Daily volume fell from $${Math.round(first).toLocaleString()} to $${Math.round(last).toLocaleString()}. Interest is draining. Thin volume makes both the price and your exit less reliable.`,
      };
    },
  },
];

function fmtSpan(h) {
  return h < 1 ? 'under an hour' : h < 48 ? `${Math.round(h)} hours` : `${Math.round(h / 24)} days`;
}

function evaluate(token, prevGate) {
  const out = [];
  for (const r of RULES) {
    let hit;
    try { hit = r.test(token, prevGate); } catch { hit = null; }
    if (hit) out.push({ id: r.id, severity: r.severity, ca: token.ca, sym: token.sym, ...hit, at: Date.now() });
  }
  const rank = { CRITICAL: 0, HIGH: 1, MED: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

module.exports = { evaluate, RULES };
