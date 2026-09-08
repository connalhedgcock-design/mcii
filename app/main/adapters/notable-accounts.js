const fs = require('fs');
const path = require('path');

// TRACK A of the "important tweets" feed (D-122): specific named people, curated by hand.
// This file only knows WHO and WHAT TO ASK. Fetching happens in cloud-collect.js, same split as
// twitterapi.js's sectorQueries() — what to search for lives apart from how the search runs.
//
// ! THE LIST IS A HUMAN'S CALL, NOT AN ALGORITHM'S. There is no scoring here that decides who
// counts as "notable" — Connal/Austin add a row to data/notable-accounts.json and it starts being
// watched, no code change, no deploy. Guessing at a list of "important crypto people" instead
// would be exactly the kind of invented-sounding specificity the mandate bans for coins; the same
// caution applies to picking which humans to trust.
function loadAccounts(dataDir) {
  const file = path.join(dataDir, 'notable-accounts.json');
  try {
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(list) ? list.filter((a) => a && a.handle) : [];
  } catch {
    return [];
  }
}

// `from:<handle>` is exact — no ticker collision, no "everyone talking about" ambiguity. Cheap
// enough that depth is generous: unlike the sector sweep, each of these queries touches exactly
// one person's own feed, not a firehose.
function queryFor(account, { maxPosts = 15 } = {}) {
  return { q: `from:${account.handle} -is:reply -is:retweet`, maxPosts, kind: 'notable-person', account };
}

// Elon and Trump post about far more than crypto. Keep only posts that are plausibly ABOUT
// something on-chain — a coin's cashtag/address/name (checked by the caller via resolve.js) or
// plain crypto vocabulary. This is deliberately loose (a false keep costs nothing but a log line;
// a false drop silences the one thing this track exists to catch), the coin-matching that feeds
// scoring is the strict half, done separately with resolve.js's confidence levels.
const CRYPTO_WORDS = /\b(crypto|cryptocurrency|bitcoin|btc|ethereum|eth|sol|solana|memecoin|meme ?coin|token|altcoin|doge|dogecoin|pump\.fun|blockchain|web3|nft)\b/i;
const CASHTAG = /\$[A-Za-z][A-Za-z0-9]{1,9}\b/;

function looksCryptoRelevant(text) {
  const t = String(text || '');
  return CRYPTO_WORDS.test(t) || CASHTAG.test(t);
}

module.exports = { loadAccounts, queryFor, looksCryptoRelevant };
