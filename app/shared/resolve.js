// Working out which coin a post is actually about.
//
// The sweep brings back memecoin chatter; almost none of it is polite enough to write a contract
// address. People write $CATE, or CATE, or "cate coin", or the project's name, or a truncated
// address, or nothing identifiable at all. Attribution is the whole problem, and getting it wrong
// is expensive in both directions:
//
//   too strict  -> a coin they hold is discussed all day and the app says nobody is talking
//   too loose   -> "fone" matches a post about phones and their sentiment score measures nothing
//
// ! so this never returns a plain yes. Every match carries how it was made, and the caller
// decides what is good enough. A contract address is proof. A bare word that happens to spell a
// ticker is a guess, and is labelled as one.
//
// ! and a ticker matching two known coins returns BOTH, flagged. Picking the bigger one silently
// is the same mistake as averaging two disagreeing sources: it produces an answer that looks
// confident and is unfalsifiable afterwards (D-50).

// Ordered strongest first. The caller compares against these by name, never by number, so
// inserting a tier later cannot silently change a threshold somewhere else.
const CONFIDENCE = ['certain', 'strong', 'probable', 'possible'];
const atLeast = (c, floor) => CONFIDENCE.indexOf(c) <= CONFIDENCE.indexOf(floor);

// A bare word only counts as a ticker when the post is clearly about trading. Without this,
// ordinary English does the matching for us -- and their own scan record contains a coin called
// "fone", which appears in any post about a phone.
const CONTEXT = /\b(coin|token|chart|charts|mcap|market ?cap|holders?|liquidity|liq|buy|buying|bought|sell|selling|sold|sold out|pump|pumping|dump|dumping|ape|aped|bag|bags|moon|mooning|rug|rugged|dev|devs|entry|exit|ath|dip|send|sending|long|short|position|hodl|hold|holding)\b/i;

// Words that are tickers and also ordinary language. A cashtag ($) overrides this; a bare word
// never does, whatever context surrounds it.
const AMBIGUOUS_WORDS = new Set([
  'A','I','IT','IS','ON','TO','BE','AT','SO','NO','UP','ALL','AND','ANY','ARE','BUY','CAN','FOR',
  'GET','GOT','HAS','HOW','ITS','NEW','NOT','NOW','ONE','OUT','OWN','SEE','THE','TOP','TWO','WHY',
  'YES','YOU','GOOD','HERE','JUST','LIKE','MOON','MORE','NEXT','ONLY','OVER','REAL','SAFE','SOON',
  'THAT','THIS','TIME','VERY','WELL','WHAT','WHEN','WITH','GAME','LIFE','LOVE','CASH','GOLD','KING',
  'MAKE','MANY','MUCH','NEED','PLAY','SAID','SAME','TAKE','THEM','THEY','WANT','WILL','WORK','YOUR',
]);

const CASHTAG = /\$([A-Za-z][A-Za-z0-9]{1,9})\b/g;
const ADDRESS = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
// "Ai66LH...ppump" -- how addresses are actually written in a post.
const TRUNCATED = /\b([1-9A-HJ-NP-Za-km-z]{3,10})(?:\.{2,3}|…)([1-9A-HJ-NP-Za-km-z]{3,10})\b/g;

const norm = (s) => String(s || '').trim().toUpperCase();
// Some tokens carry the dollar sign inside the symbol itself ("$WIF"), so comparing a ticker to
// a symbol has to strip it from both sides or an exact match never happens.
const bare = (s) => norm(s).replace(/^\$+/, '');

// An index over every coin we know of: the watchlist, plus everything the scanner has passed.
// Built once per sweep rather than per post -- with a few hundred known coins and a few hundred
// posts, doing it per post is the difference between instant and noticeable.
// `contested` is the set of tickers known to be used by more than one live Solana coin. It
// changes what a cashtag is worth, so it belongs in the index rather than being applied later.
//
// !! THIS IS NOT HYPOTHETICAL AND IT AFFECTS A COIN THEY HOLD. Checked live on 2026-08-28:
// SIX Solana coins use the ticker CATE. Theirs is the third largest by pool size, behind one at
// $248M and one at $74M. A post saying "$CATE" is therefore more likely to be about a different
// coin than about theirs, and every social reading taken from a cashtag search has been mixing
// them together.
function buildLexicon(coins, { contested = new Set() } = {}) {
  const byTicker = new Map(), byName = new Map(), byAddress = new Map();
  for (const c of coins || []) {
    if (!c) continue;
    const ca = c.ca || c.address || null;
    const sym = norm(c.sym || c.symbol);
    const name = norm(c.name);
    const entry = { ca, sym: c.sym || c.symbol || null, name: c.name || null, source: c.source || null };
    if (ca) byAddress.set(ca, entry);
    if (sym) { if (!byTicker.has(sym)) byTicker.set(sym, []); byTicker.get(sym).push(entry); }
    // Names shorter than four characters are not distinctive enough to match on their own.
    if (name && name.length >= 4) { if (!byName.has(name)) byName.set(name, []); byName.get(name).push(entry); }
  }
  const contestedSet = contested instanceof Set ? contested : new Set((contested || []).map(norm));
  return { byTicker, byName, byAddress, contested: contestedSet, size: byAddress.size };
}

function dedupe(hits) {
  const seen = new Set();
  const out = [];
  for (const h of hits) {
    const key = `${h.ca || h.ticker}|${h.confidence}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

// Every coin a post might be about, each with how the match was made.
function mentions(text, lex) {
  const t = String(text || '');
  const hits = [];
  const hasContext = CONTEXT.test(t);

  // 1. A full contract address is proof, not a guess.
  for (const a of new Set(t.match(ADDRESS) || [])) {
    const known = lex.byAddress.get(a);
    hits.push({ ca: a, sym: known ? known.sym : null, ticker: known ? norm(known.sym) : null,
                confidence: 'certain', via: 'contract address', known: !!known });
  }

  // 2. A truncated address, matched against coins we already know by both ends. Cannot resolve an
  //    unknown coin -- there is nothing to match against -- so it is only ever a lookup, not a guess.
  TRUNCATED.lastIndex = 0;
  let m;
  while ((m = TRUNCATED.exec(t))) {
    const [, head, tail] = m;
    for (const [ca, e] of lex.byAddress) {
      if (ca.startsWith(head) && ca.endsWith(tail))
        hits.push({ ca, sym: e.sym, ticker: norm(e.sym), confidence: 'certain',
                    via: 'shortened address', known: true });
    }
  }

  // 3. Cashtags. Strong when we know the coin, and reported as unknown when we do not -- an
  //    unknown ticker several people are using is the most useful thing in the whole sweep,
  //    because it is a coin nobody here has looked at yet.
  CASHTAG.lastIndex = 0;
  const tags = new Set();
  while ((m = CASHTAG.exec(t))) tags.add(norm(m[1]));
  for (const tag of tags) {
    const known = lex.byTicker.get(tag);
    const isContested = lex.contested && lex.contested.has(tag);
    if (known && known.length) {
      // ! two coins with the same ticker: return both, flagged. Never pick the bigger one.
      const ambiguous = known.length > 1 || isContested;
      // A cashtag is only strong evidence when the ticker belongs to one coin. Where several
      // coins share it, the tag says what someone typed, not which coin they meant.
      const confidence = isContested ? 'possible' : 'strong';
      const via = isContested ? 'cashtag, but several coins use this ticker' : 'cashtag';
      for (const e of known)
        hits.push({ ca: e.ca, sym: e.sym, ticker: tag, confidence, via,
                    known: true, ambiguous, contested: isContested });
    } else {
      hits.push({ ca: null, sym: tag, ticker: tag, confidence: 'strong', via: 'cashtag', known: false });
    }
  }

  // 4. A bare word that spells a ticker we know. Only with trading context, only when the word
  //    is not ordinary English, and never for very short tickers -- "IT" would match everything.
  for (const [tag, entries] of lex.byTicker) {
    if (tags.has(tag)) continue;                       // already matched with a $
    if (tag.length < 3 || AMBIGUOUS_WORDS.has(tag)) continue;
    // A bare word is already the weakest signal. On a ticker several coins share it is worthless.
    if (lex.contested && lex.contested.has(tag)) continue;
    if (!hasContext) continue;
    if (!new RegExp(`\\b${tag}\\b`, 'i').test(t)) continue;
    const ambiguous = entries.length > 1;
    for (const e of entries)
      hits.push({ ca: e.ca, sym: e.sym, ticker: tag, confidence: 'probable',
                  via: 'name used without a $, in a post about trading', known: true, ambiguous });
  }

  // 5. The project's name rather than its ticker -- "apeonfone" instead of $fone.
  for (const [name, entries] of lex.byName) {
    if (!new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t)) continue;
    for (const e of entries) {
      if (hits.some((x) => x.ca && x.ca === e.ca)) continue;
      // A coin whose ticker several coins share usually has a name they share too -- the rivals
      // for CATE are all called some version of "Catecoin". A name match there proves nothing.
      if (lex.contested && lex.contested.has(bare(e.sym))) continue;
      hits.push({ ca: e.ca, sym: e.sym, ticker: norm(e.sym), confidence: 'possible',
                  via: 'project name', known: true });
    }
  }

  return dedupe(hits);
}

// Tickers several different people used that we have never looked up. This is the queue that
// turns chatter into something checkable: a name here becomes a real coin with real liquidity,
// which the safety checks can then be run against.
// ! COUNTS ARE WEIGHTED BY HOW REAL THE ACCOUNTS LOOK, not by how many there are.
// Added 2026-09-01. The old version counted distinct author ids, which made three week-old
// accounts posting hundreds of times a day worth exactly as much as three people — and a botnet
// is much cheaper to assemble than three people. `weightedPeople` sums each account's credibility
// (`shared/credibility.js`), so three throwaways at 0.2 come to 0.6: less than one plausible
// person, which is the honest reading of three sockpuppets agreeing with each other.
//
// Raw `people` is still reported alongside `weighted`. ! never drop it — the GAP between the two
// is itself the signal. Twelve accounts weighing 1.4 is not quiet interest, it is a campaign, and
// collapsing them into one number would hide exactly the thing worth seeing.
//
// ! `minPeople` now gates on the WEIGHTED figure, so the bar means "three plausible people".
function unknownTickers(posts, lex, { minPeople = 3 } = {}) {
  const { credibility } = require('./credibility');
  const seen = new Map();
  for (const p of posts || []) {
    const author = p.authorId || p.handle || 'unknown';
    for (const h of mentions(p.text, lex)) {
      if (h.known || !h.ticker) continue;
      if (!seen.has(h.ticker)) {
        seen.set(h.ticker, { ticker: h.ticker, people: new Map(), mentions: 0, views: 0, firstSeen: p.createdAt || null });
      }
      const e = seen.get(h.ticker);
      // Keyed by author so one account posting ten times still counts once, at its own weight.
      if (!e.people.has(author)) e.people.set(author, credibility(p.author || {}).score);
      e.mentions++;
      e.views += p.views || 0;
      if (p.createdAt && (!e.firstSeen || p.createdAt < e.firstSeen)) e.firstSeen = p.createdAt;
    }
  }
  return [...seen.values()]
    .map((e) => {
      const weights = [...e.people.values()];
      const weighted = +weights.reduce((s, w) => s + w, 0).toFixed(2);
      return { ticker: e.ticker, people: e.people.size, weighted, mentions: e.mentions,
               views: e.views, firstSeen: e.firstSeen,
               // 1.0 = every account looks real; near 0 = a crowd of throwaways.
               quality: e.people.size ? +(weighted / e.people.size).toFixed(2) : 0 };
    })
    .filter((e) => e.weighted >= minPeople)
    .sort((a, b) => b.weighted - a.weighted);
}

// Turn a ticker into an actual coin, using whatever search the caller passes in. Kept free of the
// network so it can be tested against fixed answers.
//
// ! tickers are not unique and the busiest match is not necessarily the one being discussed.
// When two live Solana coins share a ticker, both are returned and the result says so, because a
// wrong address here would point every later check at the wrong coin entirely.
async function identify(ticker, search, { minLiquidityUsd = 5000 } = {}) {
  let results = [];
  // ! searched WITHOUT the dollar sign. Passing "$WIF" makes the search return tokens whose symbol
  // is literally "$WIF", which is a different coin from WIF -- it found four results, none of them
  // the one everybody means.
  try { results = await search(bare(ticker)); } catch (e) { return { ticker, error: e.message, matches: [] }; }
  const solana = (results || [])
    .filter((r) => r.chain === 'solana' && bare(r.symbol) === bare(ticker))
    .filter((r) => (r.liquidityUsd || 0) >= minLiquidityUsd)
    .sort((a, b) => (b.liquidityUsd || 0) - (a.liquidityUsd || 0));

  if (!solana.length) return { ticker, matches: [], resolved: null, reason: 'no Solana coin with that ticker and real liquidity' };
  const [best, second] = solana;
  // Close in size means genuinely ambiguous. A clear leader is safe to name.
  const ambiguous = !!second && (second.liquidityUsd || 0) > (best.liquidityUsd || 0) * 0.3;
  return {
    ticker,
    matches: solana.slice(0, 3).map((r) => ({ ca: r.ca, sym: r.symbol, name: r.name,
      liquidityUsd: Math.round(r.liquidityUsd || 0), ageDays: r.ageDays != null ? +r.ageDays.toFixed(1) : null })),
    resolved: ambiguous ? null : { ca: best.ca, sym: best.symbol, name: best.name },
    ambiguous,
    reason: ambiguous ? `more than one Solana coin uses $${ticker} — not guessing which` : null,
  };
}

// Which of our own tickers are shared with other live Solana coins. Run against the watchlist so
// the app knows when "$X" cannot be trusted to mean their X. Cheap: one search per ticker.
// ! THE RIVAL SIZE BAR IS RELATIVE, NOT FIXED. Changed 2026-09-01.
// A flat $50,000 floor is the wrong question. LaPeace has $28k of liquidity of its own, so a $40k
// namesake — BIGGER than theirs, and far more likely to be what "$LaPeace" refers to — was being
// filtered out as too small to matter. Meanwhile for CATE at $3.2M a $60k namesake is noise.
// What matters is a rival's size RELATIVE to theirs, so the bar scales: a tenth of their own pool,
// floored at $5k so genuinely dead coins are still ignored, capped at $50k so a large coin does
// not start reporting every trivial namesake.
async function findContested(coins, search, { minLiquidityUsd = null } = {}) {
  const out = {};
  for (const c of coins || []) {
    const ticker = bare(c.sym || c.symbol);
    if (!ticker) continue;
    let results = [];
    try { results = await search(ticker); } catch { continue; }
    const sameName = (results || [])
      .filter((r) => r.chain === 'solana' && bare(r.symbol) === ticker);
    const ownLiq = sameName.find((r) => r.ca === (c.ca || c.address))?.liquidityUsd || 0;
    const floor = minLiquidityUsd != null
      ? minLiquidityUsd
      : Math.max(5000, Math.min(50000, ownLiq * 0.1));
    const rivals = sameName
      .filter((r) => (r.liquidityUsd || 0) >= floor || r.ca === (c.ca || c.address))
      .sort((a, b) => (b.liquidityUsd || 0) - (a.liquidityUsd || 0));
    const others = rivals.filter((r) => r.ca !== (c.ca || c.address));
    if (others.length) {
      const ours = rivals.find((r) => r.ca === (c.ca || c.address));
      out[ticker] = {
        ticker, ca: c.ca || c.address, sym: c.sym || c.symbol,
        rivals: others.slice(0, 4).map((r) => ({ ca: r.ca, name: r.name, liquidityUsd: Math.round(r.liquidityUsd || 0) })),
        // Where theirs ranks by pool size among coins sharing the name. Rank 1 means a cashtag
        // probably does mean theirs; rank 3 of 6 means it probably does not.
        rank: ours ? rivals.indexOf(ours) + 1 : null,
        of: rivals.length,
      };
    }
  }
  return out;
}

module.exports = { buildLexicon, mentions, findContested, unknownTickers, identify, atLeast, bare, CONFIDENCE, AMBIGUOUS_WORDS, CONTEXT };
