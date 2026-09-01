const crypto = require('crypto');
const { credibility } = require('./credibility');

// THE BULK TRACK. One row per post PAID FOR, whatever the filter decided about it.
//
// WHY THIS EXISTS
// Measured 2026-09-01: 874 posts had been fetched, classified as off-topic, and dropped entirely.
// They were bought and then thrown away. Meanwhile the sweep had surfaced 180 distinct unknown
// tickers with nothing recorded about who named them or when. Connal asked for a hybrid: a strict
// high-quality track for signals, and a wide one kept for finding patterns later. This is the wide
// one, and it costs nothing extra — the posts are already paid for at the moment they arrive, so
// keeping what they contain is free and discarding it is pure waste.
//
// ! FACTS, NOT POSTS. No text, no handles, no author ids. D-22 settled that the project stores
// aggregates rather than a corpus of X content, and that still holds. What is kept here is what a
// post OBSERVED — which coins it named, roughly how believable the account was, when, and how much
// real reaction it got. That is enough to answer "was anything visible before this coin moved",
// which is the question w-008 poses, without keeping anyone's posts.
//
// Author identity is a salted hash: it can tell you the same account appeared twice, and cannot
// tell you who they are. The salt is per-install and never committed, so the hashes are not even
// comparable between machines — deliberately, since cross-referencing accounts across operators
// is not something this project needs and not something it should quietly become able to do.
//
// ! wording is stored as a FINGERPRINT, not as words. Two accounts posting the same distinctive
// sentence is the coordination signal the research supports (`60-KB/social-signal-research.md`),
// and a hash of normalised wording detects that without retaining the sentence.

let SALT = null;
function salt() {
  if (SALT) return SALT;
  SALT = process.env.MCII_HASH_SALT || crypto.randomBytes(16).toString('hex');
  return SALT;
}
const h8 = (s) => crypto.createHash('sha256').update(salt() + String(s)).digest('hex').slice(0, 12);

// Normalised wording fingerprint. Lowercased, urls/tickers/numbers stripped, whitespace collapsed
// — so "just aped $ABC at 30k" and "just aped $XYZ at 90k" collapse to the same shape. ! that is
// the point: a template reused across accounts is what a campaign looks like, and the coin and the
// number are exactly the parts a campaign varies.
function wordingPrint(text) {
  const norm = String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\$[a-z0-9]+/g, ' ')
    .replace(/[1-9a-z]{32,44}/gi, ' ')
    .replace(/[\d.,]+[kmb]?/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // ! Short posts are not fingerprinted. "gm" and "buying this" are shared by thousands of people
  // innocently; treating that as coordination would flag the whole platform. Only wording long
  // enough to be distinctive counts, which is the same reason the research keys on unusual
  // phrasing rather than common slang.
  const words = norm.split(' ').filter(Boolean);
  if (words.length < 8) return null;
  return h8(words.join(' '));
}

// `cls` is the output of importance.classify() for this post — passed in rather than recomputed,
// since the caller has already done that work for the strict track.
function factsFor(post, cls = {}) {
  const cred = credibility(post.author || {});
  const named = (cls.names || []).map((n) => n.ca).filter(Boolean);
  const tickers = (cls.tags || []).slice(0, 8);
  return {
    ts: post.createdAt || Date.now(),
    author: h8(post.authorId || post.handle || 'unknown'),
    cred: cred.score,
    kind: cls.kind || 'unknown',
    // Coins this post actually identified, by address. The cleanest thing a post can give us.
    cas: named.slice(0, 8),
    tickers,
    views: post.views || 0,
    // Reaction relative to reach. Reach with no reaction is the fingerprint of promotion (D-25).
    er: post.engagementRate != null ? +post.engagementRate.toFixed(5) : null,
    reply: !!post.isReply,
    print: wordingPrint(post.text),
    src: post.source || null,          // posting client — an automation tell, previously unused
  };
}

// Coordination across a set of posts: the same distinctive wording from DIFFERENT accounts inside
// a tight window. Both halves are required — Connal's own addition, and it matches the literature:
// timing alone catches a busy hour, wording alone catches a popular phrase, together they are hard
// to produce by accident.
function coordination(facts, { windowMs = 30 * 60000, minAccounts = 3 } = {}) {
  const byPrint = new Map();
  for (const f of facts) {
    if (!f.print) continue;
    if (!byPrint.has(f.print)) byPrint.set(f.print, []);
    byPrint.get(f.print).push(f);
  }
  const flagged = [];
  for (const [print, group] of byPrint) {
    const accounts = new Set(group.map((g) => g.author));
    if (accounts.size < minAccounts) continue;      // one account repeating itself is not a campaign
    const times = group.map((g) => g.ts).sort((a, b) => a - b);
    const span = times[times.length - 1] - times[0];
    if (span > windowMs) continue;
    flagged.push({
      print, accounts: accounts.size, posts: group.length, spanMin: Math.round(span / 60000),
      cas: [...new Set(group.flatMap((g) => g.cas))].slice(0, 5),
      tickers: [...new Set(group.flatMap((g) => g.tickers))].slice(0, 5),
    });
  }
  return flagged.sort((a, b) => b.accounts - a.accounts);
}

// THE CORPUS. The post's actual words, kept so a better idea next month can be tested against
// data already paid for.
//
// ! WHY THIS IS SEPARATE FROM factsFor() AND NOT COMMITTED.
// The repo is PUBLIC (D-92). Committing tweet text would republish other people's posts on a
// public GitHub page — a different act from analysing them privately, and not one to do casually
// or by accident. So the corpus is gitignored and lives on the collection server only.
// ! the cost of that choice, stated plainly: it is NOT backed up and NOT on either laptop. If the
// server is lost the corpus is lost, and only the derived facts (which ARE committed) survive.
// That is a deliberate trade of durability for not republishing, and it should be revisited if the
// corpus ever becomes load-bearing rather than exploratory.
//
// ! this changes D-22's posture ("store aggregates anyway") from a rule into a scoped one:
// aggregates are what gets SHARED; the raw text is kept locally for re-analysis. The reasoning
// behind D-22 was about not building a redistributable corpus of X content, and a gitignored file
// on one server is not that.
function corpusRow(post, cls = {}) {
  return {
    id: post.id,
    ts: post.createdAt || Date.now(),
    author: h8(post.authorId || post.handle || 'unknown'),
    cred: credibility(post.author || {}).score,
    kind: cls.kind || 'unknown',
    // Trimmed, not because of storage -- 5 MB a year -- but because anything past a couple of
    // hundred characters is thread padding rather than the claim being made.
    text: String(post.text || '').slice(0, 400),
    tickers: (cls.tags || []).slice(0, 8),
    cas: (cls.names || []).map((n) => n.ca).filter(Boolean).slice(0, 8),
    views: post.views || 0,
    er: post.engagementRate != null ? +post.engagementRate.toFixed(5) : null,
  };
}

module.exports = { factsFor, corpusRow, wordingPrint, coordination };
