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
  function scan(result, source = 'scanner') {
    return [...result.survivors, ...result.rejectedStage1, ...result.rejectedStage2].map((c) => record({
      kind: 'scan', ca: c.ca, sym: c.symbol, ts: c.fetchedAt || result.scannedAt, source,
      market: c, reasons: c.rejected ? [c.rejected] : ['Passed market and safety screening', ...(c.gate?.findings || []).map((f) => f.detail || f.label).filter(Boolean)],
      evidence: c,
    }));
  }
  return { file, record, scan };
}
module.exports = { createStore, ...createStore() };
