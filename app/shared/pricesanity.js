// T-037 -- catching an impossible price BEFORE it becomes a signal. Found 2026-09-05: STONK was
// recorded at $269.64 and $310.92 inside an otherwise smooth ~$0.02 series, producing a
// "+1,449,410%" move that `derive-wallets.js` then treated as a real mover. CASHCAT is worse --
// one reading implies a 2.7e27x jump. Same family as D-117 (a wrong-pool/wrong-quote-side read),
// on the scanner ingestion path D-117's own fix never covered.
//
// !! THE RULE IS EVIDENCE-BASED, NOT A GUESSED THRESHOLD. Measured across every large consecutive
// price move in this project's whole history, real moves and bad quotes separate cleanly on ONE
// thing -- whether LIQUIDITY MOVED WITH THE PRICE:
//     REAL:  biketyson price 4.3x / liq 3.6x   fone 6.4x / 3.8x   CTO 3.7x / 4.3x
//            SOLCAT 3.7x / 2.9x   Sue 3.1x / 1.8x   MINI 3.5x / 2.1x
//     BAD:   STONK  price 11,688x / liq 1.4x   STONK 14,495x / 1.4x   CASHCAT 2.7e27x / 165x
// In a real pool, the USD value of liquidity moves with the token's price because the pool holds
// the token. A price that multiplies by thousands while the pool barely changes is arithmetic that
// cannot happen -- it is a bad quote, not a move.
//
// !! ONLY UPWARD SPIKES ARE EVER FLAGGED. A price COLLAPSING while liquidity holds is exactly what
// a rug looks like, and catching that is the single most valuable alert this project has (D-70).
// Suppressing a downward move to be safe would break the one thing that protects real money.
// ! and this MARKS, never deletes (D-69) -- a genuine 10x does happen in this asset class. The row
// is kept with `priceSuspect: true` so a person can look, and so downstream reads can exclude it
// instead of silently trusting it.

const SPIKE_RATIO = 10;          // below this, no move is questioned at all
const LIQ_FOLLOW_FACTOR = 10;    // liquidity must move at least spike/10 to be believable

// `prev` and `cur` are consecutive snapshot rows for ONE coin (`market.jsonl`/`candidates.jsonl`
// shape). Returns null when there is nothing to question -- the overwhelmingly common case.
function checkPrice(prev, cur) {
  if (!prev || !cur || !prev.price || !cur.price) return null;
  const priceRatio = cur.price / prev.price;
  if (priceRatio < SPIKE_RATIO) return null; // includes every downward move, deliberately

  // No liquidity on either side means we cannot corroborate -- say so rather than assume either way.
  if (!prev.liq || !cur.liq) {
    return { suspect: true, priceRatio, liqRatio: null,
      why: `price jumped ${priceRatio.toFixed(0)}x with no liquidity reading to corroborate it` };
  }

  const liqRatio = cur.liq / prev.liq;
  if (liqRatio < priceRatio / LIQ_FOLLOW_FACTOR) {
    return { suspect: true, priceRatio, liqRatio,
      why: `price jumped ${priceRatio.toExponential(1)}x while pool liquidity moved only ${liqRatio.toFixed(2)}x -- a real move takes the pool with it, so this reads as a bad quote` };
  }
  return null; // a big move, but the pool moved with it -- real as far as this check can tell
}

// Marks suspect rows in a coin's own series, oldest first. Returns the same rows, never fewer.
function markSeries(rows) {
  const sorted = [...rows].sort((a, b) => a.ts - b.ts);
  for (let i = 1; i < sorted.length; i++) {
    const verdict = checkPrice(sorted[i - 1], sorted[i]);
    if (verdict) { sorted[i].priceSuspect = true; sorted[i].priceSuspectWhy = verdict.why; }
  }
  return sorted;
}

// Convenience for every reader that just wants trustworthy points.
const cleanPrices = (rows) => markSeries(rows).filter((r) => !r.priceSuspect);

module.exports = { checkPrice, markSeries, cleanPrices, SPIKE_RATIO, LIQ_FOLLOW_FACTOR };
