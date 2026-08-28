// Physical-plausibility guards on incoming data.
//
// Written after RugCheck's holder index reset on 2026-08-27 and reported CATE dropping from
// 252,968 to 7,522 in a single poll -- then climbing back as it re-scanned. The app recorded
// every one of those readings as fact and fired a "losing holders, -90%" alert off them.
//
// The lesson is not "RugCheck is unreliable". It is that a single vendor's number was treated as
// truth with nothing checking whether it was possible. Some changes cannot physically happen, and
// a reading that claims one is evidence about the SOURCE, not about the token.

const RULES = {
  // Holders are people who bought. The count can fall when they sell, but a real exodus is
  // gradual: every exit is a transaction. Losing most of a holder base inside minutes is not a
  // market event, it is a broken feed.
  holders: { maxDropPctPerHour: 25, floor: 0 },
  // Liquidity genuinely can vanish in one block -- that is what a rug is -- so this is NOT
  // guarded on magnitude. Never suppress the one signal that matters most.
  liq: null,
  // Supply is fixed once mint authority is revoked.
  supply: { maxChangePctPerHour: 1 },
};

function checkDelta(field, prev, next, hoursApart) {
  const rule = RULES[field];
  if (!rule || prev == null || next == null || !prev) return { ok: true };
  const hrs = Math.max(hoursApart, 1 / 60);
  const pct = ((next - prev) / prev) * 100;
  const perHour = pct / hrs;

  if (rule.maxDropPctPerHour != null && perHour < -rule.maxDropPctPerHour) {
    return { ok: false, field, prev, next, pct: +pct.toFixed(1),
      reason: `${field} fell ${Math.abs(pct).toFixed(0)}% in ${hrs < 1 ? Math.round(hrs * 60) + ' minutes' : hrs.toFixed(1) + ' hours'} — too fast to be real. Treating the source as broken rather than the token.` };
  }
  if (rule.maxChangePctPerHour != null && Math.abs(perHour) > rule.maxChangePctPerHour) {
    return { ok: false, field, prev, next, pct: +pct.toFixed(1),
      reason: `${field} changed ${pct.toFixed(1)}%, which should not be possible.` };
  }
  return { ok: true };
}

// Two independent sources for the same quantity. Disagreement does not get averaged -- averaging
// a broken number with a good one produces a number that is merely less obviously wrong.
function crossCheck(field, sources) {
  const vals = Object.entries(sources).filter(([, v]) => v != null && v > 0);
  if (vals.length < 2) return { ok: true, agreed: null, single: vals[0]?.[1] ?? null };
  const nums = vals.map(([, v]) => v);
  const hi = Math.max(...nums), lo = Math.min(...nums);
  const ratio = hi / lo;
  if (ratio > 1.5) {
    return { ok: false, field, sources: Object.fromEntries(vals), ratio: +ratio.toFixed(2),
      reason: `sources disagree by ${ratio.toFixed(1)}x on ${field} (${vals.map(([k, v]) => `${k} ${v.toLocaleString()}`).join(' vs ')}). Showing neither as fact.` };
  }
  return { ok: true, agreed: Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) };
}

module.exports = { checkDelta, crossCheck, RULES };
