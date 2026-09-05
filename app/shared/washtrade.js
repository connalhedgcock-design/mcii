// Funding-link wash-trade filter -- the evidenced half of wallet tracking
// (`80-WHISPERS/whale-tracking/README.md`), and step 2 of that file's build order: this must run
// on `walletflow.js` output BEFORE step 3 (whale-sell alerts) or step 5 (buy-signal admission
// tiebreaker) are allowed to trust it. Nothing here reaches a screen or notification on its own --
// it only decides which of walletflow's flow rows are real vs manufactured.
//
// fact @Victor & Weintraud, "Detecting and Quantifying Wash Trading on Decentralized Cryptocurrency
// Exchanges" (WWW 2021, arXiv 2102.07001): wash-trading structures consist mainly of one or two
// accounts; self-trades occur frequently; colluding addresses are linkable because they must be
// funded for gas, leaving direct/indirect transfer links. This file operationalises both halves:
// (1) a wallet that both bought AND sold the same coin in one window, (2) wallets funded in SOL
// from the same source, treated as one actor rather than independent buyers.
//
// ! BOUNDED, NOT EXHAUSTIVE -- read before trusting a "clean" result.
// Finding a wallet's TRUE first-ever funding means paging its whole history back to genesis --
// expensive, and for an old/busy wallet potentially hundreds of calls for one answer. This looks
// back only `FUNDER_LOOKBACK` signatures per wallet and reports the earliest SOL transfer IN found
// within that window. A funding link OUTSIDE that window is MISSED, never wrongly cleared -- an
// owner with no funder found in the window is UNCHECKED, and this file never reports "unchecked" as
// "clean". `est:` conf 65% the window is deep enough for the case that matters most (a wallet
// created specifically to trade one coin, which has few signatures total); lower confidence for an
// old, busy wallet that happens to also be colluding -- that one can hide its funding outside the
// window by construction.
// ! RPC-BOUNDED ON PURPOSE. Every unique wallet checked costs one `getSignaturesForAddress` call
// plus up to `FUNDER_LOOKBACK` `getTransaction` calls. `MAX_WALLETS_PER_CHECK` caps this per call,
// spending the budget on the wallets with the largest net flow first (D-87's discipline: bound the
// cost of anything that loops over network calls, never let input size set it unbounded).

const { poolSignatures, rpc } = require('../main/adapters/walletflow');

const FUNDER_LOOKBACK = 20;
const MAX_WALLETS_PER_CHECK = 12;

// One transaction -> the SOL transfer INTO `walletAddress`, if the transaction contains one.
// Looks at top-level parsed system-program instructions and one level of inner instructions (a
// funding leg is commonly wrapped one level down inside a swap). ! NOT every way lamports can move
// -- a funding transfer routed through a program this does not recognise as a plain system transfer
// is missed, not misread. Returns null on no match, same "missed, not wrong" shape as the rest.
function findIncomingTransfer(tx, walletAddress) {
  const top = tx.transaction?.message?.instructions || [];
  const inner = (tx.meta?.innerInstructions || []).flatMap((i) => i.instructions || []);
  for (const ix of [...top, ...inner]) {
    if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
      const info = ix.parsed.info || {};
      if (info.destination === walletAddress && info.source && info.source !== walletAddress) {
        return { from: info.source, lamports: Number(info.lamports || 0) };
      }
    }
  }
  return null;
}

// Earliest SOL-funding transfer found for `walletAddress` within the last `lookback` signatures.
// null means "no funding transfer found in the window" -- UNCHECKED, not "self-funded" or "clean".
async function findFunder(walletAddress, { lookback = FUNDER_LOOKBACK } = {}) {
  const sigs = await poolSignatures(walletAddress, { limit: lookback }); // newest-first
  for (const sig of sigs.slice().reverse()) { // walk oldest-of-the-window first
    try {
      const tx = await rpc('getTransaction', [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]);
      if (!tx) continue;
      const found = findIncomingTransfer(tx, walletAddress);
      if (found) return { ...found, signature: sig };
    } catch (e) {
      // D-29: a failed read of ONE signature is skipped, never treated as "no funder found".
    }
  }
  return null;
}

// Groups `owners` (capped, largest-flow-first order expected from the caller) by shared funder.
// A cluster of size >= 2 means those wallets were funded from the same source -- treat as one
// actor, not independent buyers, per the Victor & Weintraud gas-link finding above.
async function clusterByFunder(owners, opts = {}) {
  const capped = owners.slice(0, opts.maxWallets ?? MAX_WALLETS_PER_CHECK);
  const unchecked = owners.slice(capped.length);

  const byFunder = new Map(); // funder address -> [owner, ...]
  for (const owner of capped) {
    let funding;
    try { funding = await findFunder(owner, opts); }
    catch (e) { unchecked.push(owner); continue; } // an RPC failure leaves the wallet UNCHECKED
    if (!funding) continue; // no funder found in window -- unchecked-by-outcome, not flagged
    if (!byFunder.has(funding.from)) byFunder.set(funding.from, []);
    byFunder.get(funding.from).push(owner);
  }

  const clusters = [...byFunder.entries()]
    .filter(([, list]) => list.length >= 2)
    .map(([funder, list]) => ({ funder, owners: list }));

  return { clusters, checked: capped, unchecked };
}

// Splits `flowRows` (walletflow.js's `{owner, mint, delta, ts, signature}` shape) into real vs
// flagged, using both signals: same-wallet self-trades, and funding-linked wallet clusters.
// Prioritises RPC spend on the owners with the largest net flow -- the ones a downstream alert or
// admission vote would actually weight most heavily.
async function filterWashTrading(flowRows, opts = {}) {
  const byOwner = new Map();
  for (const r of flowRows) {
    const cur = byOwner.get(r.owner) || { owner: r.owner, net: 0, buys: 0, sells: 0 };
    cur.net += r.delta;
    if (r.delta > 0) cur.buys++; else if (r.delta < 0) cur.sells++;
    byOwner.set(r.owner, cur);
  }
  const ownersByFlowSize = [...byOwner.values()]
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .map((o) => o.owner);

  // Signal 1: same wallet bought AND sold in this window. Not proof alone (a real trader can flip
  // too) -- combined with a funding link it is the two-signal shape the research actually supports.
  const selfTraders = new Set(
    [...byOwner.values()].filter((o) => o.buys > 0 && o.sells > 0).map((o) => o.owner)
  );

  // Signal 2: funding-linked clusters among the wallets that actually traded this coin.
  const { clusters, unchecked } = await clusterByFunder(ownersByFlowSize, opts);
  const linked = new Set(clusters.flatMap((c) => c.owners));

  const clean = [], flagged = [];
  for (const row of flowRows) {
    const reasons = [];
    if (linked.has(row.owner)) reasons.push('funded from the same source as another wallet trading this coin');
    if (selfTraders.has(row.owner)) reasons.push('same wallet bought and sold in this window');
    (reasons.length ? flagged : clean).push(reasons.length ? { ...row, reasons } : row);
  }

  const totalVolume = flowRows.reduce((s, r) => s + Math.abs(r.delta), 0);
  const flaggedVolume = flagged.reduce((s, r) => s + Math.abs(r.delta), 0);

  return {
    clean,
    flagged,
    clusters,
    uncheckedOwners: unchecked, // beyond the RPC budget, or no funder found -- NEITHER cleared NOR flagged
    manufacturedRatio: totalVolume > 0 ? +(flaggedVolume / totalVolume).toFixed(3) : null,
  };
}

module.exports = { findFunder, clusterByFunder, filterWashTrading, FUNDER_LOOKBACK, MAX_WALLETS_PER_CHECK };
