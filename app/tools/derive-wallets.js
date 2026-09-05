// T-033 -- derives candidate "worth following" wallets from real data, instead of a hand-kept
// list, per the method `80-WHISPERS/whale-tracking/README` already specified and never built:
//   1. find coins that did something notable (a real move, not a launch)
//   2. find who was buying before/during that move
//   3. discard wallets linked to each other by shared SOL funding (washtrade.js) -- a "successful
//      early buyer" funded from the same source as another buyer is a sockpuppet, not a signal
//   4. require repetition across DIFFERENT, unrelated coins -- one hit is luck at this project's
//      base rates ([[base-rates]]: ~0.26% graduation)
// ! run this, don't just read it -- it makes real RPC calls (`walletflow.js`) and only tells you
// anything true once it has actually queried real chain data for a real mover.

const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', '..', 'data');
const { poolFlow } = require('../main/adapters/walletflow');
const { filterWashTrading } = require('../shared/washtrade');

const MOVE_THRESHOLD = 0.30; // 30%+ between two consecutive readings -- "notable", not a rounding blip
const MAX_COINS_TO_CHECK = 8; // RPC-budget cap, largest movers first
// !! FOUND LIVE 2026-09-05: STONK showed a "+1,449,410%" move that does not exist -- two real,
// isolated readings of $269.64 and $310.92 sandwiched between a smooth ~$0.02 series, same shape
// as D-117's stablecoin-mispricing bug (a pool quote landing on the wrong side, or a stale read),
// just on `candidates.jsonl`'s ingestion path rather than the portfolio one D-117 already fixed.
// A move this large needs a human to look at it, not silently feed a real-money-adjacent wallet
// derivation. Capped, not deleted -- D-69's "sort, never discard" rule.
const SUSPECT_MOVE_RATIO = 5.0; // +500% between two readings -- plausible for this asset class, but rare enough to flag



function readJsonl(name) {
  try {
    return fs.readFileSync(path.join(DATA, name), 'utf8').trim().split('\n')
      .filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

// Only Solana coins have a usable mint for `walletflow.js` -- EVM chains need their own reader,
// not attempted here. A Solana CA is base58, 32-44 chars, no `0x` prefix.
const isSolanaCa = (ca) => typeof ca === 'string' && !ca.startsWith('0x') && ca.length >= 32 && ca.length <= 44;

function findNotableMoves() {
  const rows = [...readJsonl('candidates.jsonl'), ...readJsonl('market.jsonl')]
    .filter((r) => r.ca && r.price != null && isSolanaCa(r.ca));
  const byCa = {};
  for (const r of rows) (byCa[r.ca] ||= []).push(r);

  const moves = [];
  for (const [ca, list] of Object.entries(byCa)) {
    const sorted = list.sort((a, b) => a.ts - b.ts);
    for (let i = 1; i < sorted.length; i++) {
      const ret = (sorted[i].price - sorted[i - 1].price) / sorted[i - 1].price;
      if (ret >= SUSPECT_MOVE_RATIO) {
        console.log(`  ! SKIPPED as suspected bad data: ${sorted[i].sym} ${sorted[i - 1].price} -> ${sorted[i].price} (+${(ret * 100).toFixed(0)}%) -- needs a human look, not silently trusted`);
        continue;
      }
      if (ret >= MOVE_THRESHOLD) {
        moves.push({ ca, sym: sorted[i].sym, ret, ts: sorted[i].ts, peakPrice: sorted[i].price });
      }
    }
  }
  // largest, most recent moves first -- the RPC budget should spend on the clearest real cases
  moves.sort((a, b) => b.ret - a.ret);
  const seen = new Set();
  return moves.filter((m) => (seen.has(m.ca) ? false : (seen.add(m.ca), true))).slice(0, MAX_COINS_TO_CHECK);
}

async function main() {
  const moves = findNotableMoves();
  console.log(`${moves.length} notable Solana moves found (>=${(MOVE_THRESHOLD * 100).toFixed(0)}% between readings)`);

  const buyersByCoin = {};
  for (const m of moves) {
    console.log(`\n${m.sym} (${m.ca.slice(0, 10)}...): +${(m.ret * 100).toFixed(0)}% at ${new Date(m.ts).toISOString()}`);
    let flow;
    try {
      flow = await poolFlow(m.ca, m.ca, { limit: 40 });
    } catch (e) { console.log('  flow read failed:', e.message); continue; }
    if (!flow.length) { console.log('  no flow rows returned'); continue; }

    let filtered;
    try {
      filtered = await filterWashTrading(flow);
    } catch (e) { console.log('  wash filter failed:', e.message); continue; }

    const buyers = new Set(filtered.clean.filter((r) => r.delta > 0).map((r) => r.owner));
    console.log(`  ${flow.length} flow rows, ${filtered.flagged.length} flagged, ${buyers.size} clean distinct buyers`);
    buyersByCoin[m.sym] = { ca: m.ca, buyers: [...buyers] };
  }

  // Repetition check: a wallet buying into >=2 of these DIFFERENT, unrelated coins.
  const coinCountByWallet = {};
  for (const [sym, { buyers }] of Object.entries(buyersByCoin)) {
    for (const w of buyers) (coinCountByWallet[w] ||= new Set()).add(sym);
  }
  const repeats = Object.entries(coinCountByWallet).filter(([, coins]) => coins.size >= 2);

  console.log(`\n=== RESULT ===`);
  console.log(`${Object.keys(buyersByCoin).length} coins checked, ${repeats.length} wallet(s) bought into 2+ of them`);
  for (const [wallet, coins] of repeats) console.log(`  ${wallet} -> ${[...coins].join(', ')}`);

  const out = {
    derivedAt: Date.now(),
    coinsChecked: Object.keys(buyersByCoin).length,
    candidates: repeats.map(([wallet, coins]) => ({ wallet, coins: [...coins] })),
  };
  fs.writeFileSync(path.join(DATA, 'derived-wallets.json'), JSON.stringify(out, null, 1));
  console.log(`\nwritten to data/derived-wallets.json`);
}

if (require.main === module) main().catch((e) => { console.error('FATAL', e); process.exit(1); });
module.exports = { findNotableMoves, main };
