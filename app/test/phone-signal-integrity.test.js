const assert = require('node:assert/strict');
(async () => {
  const { run } = await import('../../cloudflare/telegram-alerts/src/index.js');
  const now = Date.now();
  let price = 269.64, sends = 0, failArchive = false;
  const db = new Map([['last-seen', JSON.stringify({ TEST: { priceUsd: .02, liquidityUsd: 100000, at: now - 300000 } })],
    ['holdings', JSON.stringify({ positions: [{ ca: 'TEST', sym: 'TEST', tokens: 10000 }], pushedAt: now })]]);
  const kv = { get: async (k) => db.get(k) || null, delete: async (k) => db.delete(k),
    put: async (k, v) => { if (failArchive && k.startsWith('signals:')) throw Error('disk unavailable'); db.set(k, v); } };
  global.fetch = async (url) => {
    if (url.includes('api.telegram.org')) { sends++; return new Response('{}'); }
    if (url.includes('watchlist.json')) return new Response(JSON.stringify([{ ca: 'TEST', sym: 'TEST' }]));
    if (url.includes('social-latest.json')) return new Response('{}');
    if (url.includes('dexscreener')) return new Response(JSON.stringify([{ baseToken: { address: 'TEST', symbol: 'TEST' },
      priceUsd: String(price), liquidity: { usd: 100000 }, chainId: 'solana' }]));
    throw Error(`Unexpected request ${url}`);
  };
  const env = { ALERTS_KV: kv, TELEGRAM_BOT_TOKEN: 'fake', TELEGRAM_CHAT_ID: 'fake' };
  await run(env); price = 310.92; await run(env);
  assert.equal(sends, 0); assert.equal(JSON.parse(db.get('last-seen')).TEST.priceUsd, .02);
  price = .01; await run(env);
  assert.equal(sends, 1);
  const archive = [...db].filter(([k]) => k.startsWith('signals:')).flatMap(([, v]) => JSON.parse(v));
  assert.equal(archive.length, 1);
  assert.equal(archive[0].ca, 'TEST'); assert.equal(archive[0].price, .01);
  assert(archive[0].ts > 0 && archive[0].reasons.length === 2);
  // Suppressed notifications still have their own signal records.
  price = .005; await run(env); assert.equal(sends, 1);
  assert.equal([...db.keys()].filter((k) => k.startsWith('signals:')).length, 2);
  failArchive = true; price = .002;
  await assert.rejects(run(env), /disk unavailable/); assert.equal(sends, 1);
  console.log('Phone signal integrity passed: repeated bad prices, real fall, saved suppressed alerts, failed save.');
})().catch((e) => { console.error(e); process.exitCode = 1; });
