// Append-only observations, separate from operators' forecasts. Never fabricate a past price.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const { checkPrice } = require('../shared/pricesanity');
const safe = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '-');
function createStore(root = path.join(__dirname, '../..'), machine = os.hostname()) {
  const file = path.join(root, '50-LOG', `signals-${safe(machine)}.jsonl`);
  function record({ kind, ca, sym, ts = Date.now(), market = null, reasons, evidence = {}, source = 'desktop' }) {
    if (!kind || !ca || !Number.isFinite(ts) || ts <= 0 || !Array.isArray(reasons) || !reasons.some((s) => typeof s === 'string' && s.trim())) {
      throw new Error('signal needs kind, coin, time and reasoning');
    }
    const rawPrice = market?.rawPrice ?? market?.priceUsd ?? market?.price ?? null;
    const priceTs = market?.fetchedAt ?? market?.ts ?? null;
    const suspect = !!market?.priceSuspect || (rawPrice != null && !!checkPrice(null, { price: rawPrice }));
    const status = suspect ? 'suspect' : rawPrice == null ? 'unavailable'
      : !Number.isFinite(priceTs) || Math.abs(priceTs - ts) > 5 * 60000 ? 'stale' : 'observed';
    const row = { id: randomUUID(), version: 1, machine, source, kind, ca, sym: sym || null,
      chain: market?.chain || null, ts, recordedAt: Date.now(),
      price: status === 'observed' ? rawPrice : null, priceTs, priceStatus: status,
      rawPrice: Number.isFinite(rawPrice) ? rawPrice : null,
      priceReason: market?.priceSuspectWhy || (status === 'observed' ? null : `price ${status} at signal time`),
      reasons, evidence };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(row) + '\n'); // failure propagates, never reports success
    return row;
  }
  // Every machine's own signals file, read together -- `50-LOG/signals-*.jsonl` is git-shared (each
  // machine writes only its own file, per `machine` above), so this sees what EITHER operator's
  // machine has recorded, not just this one. Used by the HUD's creator-rug-history check: was any
  // one of a creator's other coins ever flagged by this project's own alerts. Bounded by `limit`.
  function readForCa(ca, { kinds = null, sinceMs = null, limit = 200 } = {}) {
    if (!ca) return [];
    const dir = path.dirname(file);
    let names = [];
    try { names = fs.readdirSync(dir).filter((n) => /^signals-.*\.jsonl$/.test(n)); } catch { return []; }
    const cutoff = sinceMs ? Date.now() - sinceMs : 0;
    const kindSet = kinds ? new Set(kinds) : null;
    const out = [];
    for (const name of names) {
      let text;
      try { text = fs.readFileSync(path.join(dir, name), 'utf8'); } catch { continue; }
      for (const line of text.trim().split('\n')) {
        if (!line) continue;
        let row;
        try { row = JSON.parse(line); } catch { continue; }
        if (row.ca !== ca) continue;
        if (kindSet && !kindSet.has(row.kind)) continue;
        if (row.ts < cutoff) continue;
        out.push(row);
        if (out.length >= limit) return out.sort((a, b) => b.ts - a.ts);
      }
    }
    return out.sort((a, b) => b.ts - a.ts);
  }
  function scan(result, source = 'scanner') {
    return [...result.survivors, ...result.rejectedStage1, ...result.rejectedStage2].map((c) => record({
      kind: 'scan', ca: c.ca, sym: c.symbol, ts: c.fetchedAt || result.scannedAt, source,
      market: c, reasons: c.rejected ? [c.rejected] : ['Passed market and safety screening', ...(c.gate?.findings || []).map((f) => f.detail || f.label).filter(Boolean)],
      evidence: c,
    }));
  }
  return { file, record, scan, readForCa };
}
module.exports = { createStore, ...createStore() };
