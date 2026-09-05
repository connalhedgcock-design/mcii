// Market-side manipulation detection -- the "rework the wash-trade filter" Connal asked for
// (T-030-adjacent), grounded in real research rather than invented heuristics. Complements, does
// NOT replace, `washtrade.js` (which works on individual wallets and needs RPC calls); this works
// purely on the price/volume/liquidity snapshots ALREADY collected every cycle, so it costs
// nothing and can run over the entire history retroactively.
//
// !! THE BASE RATE THAT MAKES THIS URGENT -- fact @Mongardini & Mei, "A Midsummer Meme's Dream:
// Investigating Market Manipulations in the Meme Coin Ecosystem" (arXiv 2507.01963), 34,988 tokens
// across Ethereum / BNB / Solana / Base over three months:
// **82.8% of high-return meme coins (>100% gains) showed evidence of artificial growth strategies.**
// ! read that against what this project actually selects for. The trend-candidate list, the
// "notable movers", and the emerging-signal backtest's "hit target" wins are ALL filters for large
// gains -- i.e. they select the exact population where roughly four in five are manipulated. That
// is not a footnote, it is the single most important number for interpreting any win rate this
// project produces, and it was not known when tonight's 62% figure was written up.
//
// TWO DETECTORS, both from the same literature, both computable from data already in hand:
// 1. VOLUME/PRICE DIVERGENCE -- volume spiking while price barely moves is the classic wash-trade
//    signature (fact @wash-trading detection literature: volume up >500% with price change <5%
//    contrasts with natural markets, where a real volume surge moves price).
// 2. LIQUIDITY-POOL PRICE INFLATION (LPI) -- the reverse shape: a dramatic price move on tiny
//    volume relative to pool depth, i.e. "small strategic purchases trigger dramatic price
//    increases" (Mongardini & Mei's own named category). A real move needs real money through the
//    pool; a big move on almost no volume means the pool was thin enough to push.
//
// ! FLAGS, NEVER VERDICTS (D-106's wording rule, and D-69: mark, never delete). Both detectors
// describe a SHAPE consistent with manipulation. A real coin can produce either by accident.

const VOL_SPIKE_RATIO = 5.0;      // +500% volume vs the previous reading
const FLAT_PRICE_MOVE = 0.05;     // ...while price moved less than 5%
const LPI_PRICE_MOVE = 0.30;      // a 30%+ price jump...
const LPI_VOLUME_TO_LIQ = 0.10;   // ...on volume under 10% of pool liquidity

// `rows` = one coin's own snapshots (`market.jsonl` / `candidates.jsonl` shape), any order.
// Returns one entry per consecutive pair that tripped a detector -- never a score, never a verdict.
function scanCoin(rows) {
  const sorted = rows
    .filter((r) => r.price != null)
    .sort((a, b) => a.ts - b.ts);

  const flags = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1], cur = sorted[i];
    const priceMove = prev.price ? (cur.price - prev.price) / prev.price : null;
    const vol = cur.vol24 ?? cur.v24 ?? null;
    const prevVol = prev.vol24 ?? prev.v24 ?? null;
    const liq = cur.liq ?? null;
    if (priceMove == null) continue;

    // 1. Volume spiked, price didn't follow.
    if (vol != null && prevVol) {
      const volRatio = vol / prevVol;
      if (volRatio >= VOL_SPIKE_RATIO && Math.abs(priceMove) < FLAT_PRICE_MOVE) {
        flags.push({
          ts: cur.ts, kind: 'volume-without-price',
          detail: `volume ${volRatio.toFixed(1)}x its previous reading while price moved only ${(priceMove * 100).toFixed(1)}%`,
        });
      }
    }

    // 3. Price climbing while HOLDERS DO NOT -- added after detectors 1 and 2 measured almost
    // nothing on this project's real data (2% of coins, and the single "hit" was a known price
    // bug). Root cause, found by running them: both are written for per-TRADE data, and this
    // project has 30-minute snapshots of 24-HOUR rolling aggregates -- a 24h volume figure barely
    // moves between two readings, so a "5x volume spike vs the previous reading" essentially
    // cannot fire. Detector 3 is the same idea at the granularity actually available.
    // ! grounded in this project's OWN measurement, not borrowed: `60-KB/trend-growth-analysis.md`
    // found CATE and DOGE-1 rise WITH holder count (r=+0.22/+0.26) while LaPeace rose AGAINST it
    // (r=-0.45) -- and LaPeace is the coin that later went nowhere. Real adoption adds holders; a
    // pushed price does not. That is the same "artificial growth" shape Mongardini & Mei name,
    // expressed in the one field this project measures reliably every cycle.
    if (prev.holders != null && cur.holders != null && prev.holders > 0
        && priceMove >= LPI_PRICE_MOVE) {
      const holderMove = (cur.holders - prev.holders) / prev.holders;
      if (holderMove <= 0) {
        flags.push({
          ts: cur.ts, kind: 'price-without-holders',
          detail: `price +${(priceMove * 100).toFixed(0)}% while holder count went ${(holderMove * 100).toFixed(1)}% -- price rising without new people arriving`,
        });
      }
    }

    // 2. Price jumped without the volume to justify it, in a pool thin enough to push.
    if (vol != null && liq && priceMove >= LPI_PRICE_MOVE && vol / liq < LPI_VOLUME_TO_LIQ) {
      flags.push({
        ts: cur.ts, kind: 'price-without-volume',
        detail: `price +${(priceMove * 100).toFixed(0)}% on 24h volume worth only ${((vol / liq) * 100).toFixed(1)}% of pool liquidity -- a thin pool being pushed, not real buying`,
      });
    }
  }
  return flags;
}

// !! THE READ THAT ACTUALLY SEPARATES REAL FROM MANUFACTURED, ON THIS PROJECT'S OWN DATA.
// Connal, 2026-09-05, asking what makes a pump "fake" and whether the answer is a better
// wash-trade filter. Measured rather than argued -- three real coins, full recorded history:
//   DOGE-1  price +117%  holders 18,372 -> 21,674 (UP)   top1 5.0% -> 3.4% (DOWN)
//   LaPeace price  -32%  holders  2,731 ->  2,556 (DOWN)  top1 18.4% -> 22.1% (UP)
//   CATE    price  -50%  holders 252k   -> 118k  (DOWN)  top1 2.80% -> 2.85% (flat)
// ∴ the separating signal is not volume at all -- it is WHO ENDS UP HOLDING IT. Real growth adds
// holders while the biggest wallet's share SHRINKS (new people diluting them). The dying shape is
// the exact inverse: holders leaving while the top wallet's share GROWS, i.e. a crowd exiting into
// a whale who is still sitting there. LaPeace is that shape, and it is the coin Connal removed.
//
// ! this is a DESCRIPTION of what happened, never a prediction of what happens next, and never a
// verdict (D-106's wording rule). Both fields come from a Solana-only source, so any coin on
// another chain returns `unknown` -- absent data is stated, never guessed (D-29).
function growthQuality(rows) {
  const withHolders = rows
    .filter((r) => r.holders != null && r.price != null)
    .sort((a, b) => a.ts - b.ts);
  if (withHolders.length < 2) return { verdict: 'unknown', why: 'no holder history for this coin (holder counts are Solana-only)' };

  const first = withHolders[0], last = withHolders[withHolders.length - 1];
  const priceMove = (last.price - first.price) / first.price;
  const holderMove = (last.holders - first.holders) / first.holders;
  const top1Move = (first.top1 != null && last.top1 != null) ? last.top1 - first.top1 : null;

  const pct = (x) => `${(x * 100).toFixed(0)}%`;
  const base = `price ${priceMove >= 0 ? '+' : ''}${pct(priceMove)}, holders ${holderMove >= 0 ? '+' : ''}${pct(holderMove)}`
    + (top1Move != null ? `, biggest holder's share ${top1Move >= 0 ? 'up' : 'down'} ${Math.abs(top1Move).toFixed(1)} points` : '');

  if (priceMove > 0 && holderMove > 0 && (top1Move == null || top1Move <= 0)) {
    return { verdict: 'real-looking-growth', why: `${base} -- more people arriving and the biggest wallet's grip loosening`, priceMove, holderMove, top1Move };
  }
  if (holderMove < 0 && top1Move != null && top1Move > 0) {
    return { verdict: 'crowd-leaving-whale-staying', why: `${base} -- people exiting while the biggest wallet's share grows`, priceMove, holderMove, top1Move };
  }
  if (priceMove > 0 && holderMove <= 0) {
    return { verdict: 'price-up-nobody-arriving', why: `${base} -- price rose without new people`, priceMove, holderMove, top1Move };
  }
  return { verdict: 'mixed', why: base, priceMove, holderMove, top1Move };
}

module.exports = { scanCoin, growthQuality, VOL_SPIKE_RATIO, FLAT_PRICE_MOVE, LPI_PRICE_MOVE, LPI_VOLUME_TO_LIQ };
