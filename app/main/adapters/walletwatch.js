// Watches Connal's own curated FOMO-followed traders directly on-chain, instead of relying on
// this Mac's local notifications (`fomonotifications.js`) -- which has produced ZERO real signals
// since it was built: checked 09-08, the notification-store folder that code creates the instant
// it runs does not exist on this Mac at all, meaning it has never actually run here even once.
//
// This reads the SAME curated list Connal already has -- D-16's "a person names it" rule intact,
// nothing derived or guessed -- through `walletflow.js`'s already-built, already-tested
// `walletHistory()` (built 2026-09-02 for exactly this purpose per its own header, but never
// wired to a real named-wallet list: `data/wallets.json`, the file it expects, has always been
// `[]`). Runs from the collector (Hetzner), the same always-on host `walletflow.js` already proved
// can read wallet activity where Cloudflare's worker cannot (D-93 / whale-tracking README).
//
// !! THE WALLET LIST ITSELF IS AN UNVERIFIED THIRD-PARTY CLAIM. `data/fomo-followed-wallets.json`
// (captured 09-07 from fomowalletfinder.com) says so itself: "not yet independently checked
// against chain transactions." A wrong handle->address mapping would silently attribute someone
// else's real trades to the wrong trader. Spot-checked 4 wallets live before this shipped -- all
// four came back with real, recent (within the last ~2 days), plausible trading activity, which is
// evidence the mapping isn't obviously wrong, NOT proof every one of the 45 is correctly resolved.
//
// !! ONLY A CHEAP PER-MINT SELF-TRADE CHECK, NOT `washtrade.js`'s FULL FILTER. That file's
// funding-cluster check answers "did multiple DIFFERENT wallets collude on this coin" -- not the
// question here, which is "does this ONE already-known, already-curated wallet's own trade look
// like a real position." A wallet buying then selling the SAME coin within one poll window is
// flagged here; cross-wallet collusion detection is not attempted, and this file says so rather
// than implying coverage it doesn't have.
//
// !! STABLECOIN/WSOL LEGS ARE NOT COIN SIGNALS. Found live, 09-08, spot-checking real wallets: a
// large share of their balance changes are wrapped SOL or USDC moving -- the payment leg of a
// trade, not the coin being bought or sold. Excluded here, same reasoning as excluding gas.

const fs = require('fs');
const walletflow = require('./walletflow');

const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const CURRENCY_MINTS = new Set([WSOL_MINT, USDC_MINT, USDT_MINT]);

function loadState(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}
function saveState(file, state) {
  fs.writeFileSync(file, JSON.stringify(state, null, 1) + '\n');
}

// One followed wallet's new coin activity since the last poll. `lastSeenTs` is ms; walletflow's
// rows carry `ts` in Solana's own seconds-since-epoch, converted here at the boundary.
async function pollWallet(handle, address, lastSeenTs, { limit = 20 } = {}) {
  const rows = await walletflow.walletHistory(address, { limit });
  const coinRows = rows.filter((r) => r.mint && !CURRENCY_MINTS.has(r.mint) && r.ts && r.ts * 1000 > lastSeenTs);

  const byMint = new Map();
  for (const r of coinRows) {
    const cur = byMint.get(r.mint) || { buys: 0, sells: 0 };
    if (r.delta > 0) cur.buys++; else cur.sells++;
    byMint.set(r.mint, cur);
  }

  const newestTs = rows.reduce((max, r) => (r.ts && r.ts * 1000 > max ? r.ts * 1000 : max), lastSeenTs);
  const signals = coinRows.map((r) => ({
    handle, wallet: address, mint: r.mint,
    direction: r.delta > 0 ? 'buy' : 'sell',
    // Bought AND sold the SAME coin inside this poll window -- a real trader can flip a position
    // too, so this is a flag to weigh, not an automatic exclusion (D-119: show it, don't hide it).
    selfTradeFlag: byMint.get(r.mint).buys > 0 && byMint.get(r.mint).sells > 0,
    ts: r.ts * 1000, signature: r.signature,
  }));
  return { signals, newestTs };
}

// All followed wallets, one poll cycle. Bounded and partial-failure-tolerant, same discipline as
// every other multi-source collector in this project (D-29: one wallet's RPC failure is skipped,
// never invented as "no activity"). ! a wallet with no saved watermark yet (first run) returns
// its most recent `limit` signatures' worth of activity as if it were all new -- a one-time
// backfill, not a claim that all of it "just happened".
async function pollFollowedWallets(followedWallets, stateFile, { limit = 20, onError = () => {} } = {}) {
  const state = loadState(stateFile);
  const allSignals = [];
  for (const w of followedWallets) {
    if (!w.solana) continue;
    const lastSeenTs = state[w.solana] || 0;
    try {
      const { signals, newestTs } = await pollWallet(w.handle, w.solana, lastSeenTs, { limit });
      allSignals.push(...signals);
      state[w.solana] = newestTs;
    } catch (e) { onError(w, e); }
  }
  saveState(stateFile, state);
  return allSignals;
}

module.exports = { pollWallet, pollFollowedWallets, CURRENCY_MINTS };
