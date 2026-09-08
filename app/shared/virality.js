const { botLikelihood } = require('./hype');

// TRACK B of the "important tweets" feed (D-122): a post from ANYONE that blows up inside crypto
// Twitter, found by looking at the sector sweep the app already buys (twitterapi.js:
// sectorQueries()) — no new collection, this reads posts already paid for.
//
// ! OUTLIER AGAINST THE SWEEP'S OWN DISTRIBUTION, NEVER A FIXED NUMBER. A magic "5000 views is
// viral" guess would be exactly the kind of invented precision the project has already burned
// itself on once (`social-collection/README.md`: the old queries were tuned on intuition and
// measured wrong). Median + MAD (median absolute deviation) is a robust "how far from typical,
// for THIS sweep, today" — cheap, needs no persisted history file, and degrades sensibly on a
// quiet sweep where even the loudest post is unremarkable.
//
// ! NOT PROVEN. Nothing here has been checked against what actually moved a coin's price
// afterwards — this only says "unusually large reach", not "unusually predictive". Log it,
// then look at the record before trusting it (same discipline `importance.js`'s `emerging`
// admits it still owes).
const MIN_VIEWS_FLOOR = 5000;    // below this, "loudest in a quiet sweep" still isn't loud
const MAD_K = 6;                 // conservative on purpose: false alarms cost a phone buzz

function reach(post) {
  if (post.views) return post.views;
  return (post.likes || 0) + (post.reposts || 0) * 2 + (post.replies || 0);
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const n = s.length;
  if (!n) return 0;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

/** @param posts the sweep's own posts (any shape twitterapi.js's normalize() produces)
 *  @returns { candidates: post[], stats } — candidates carry `why` explaining the outlier. */
function flagViral(posts, { minViews = MIN_VIEWS_FLOOR, madK = MAD_K } = {}) {
  const pool = posts || [];
  if (pool.length < 5) return { candidates: [], stats: { n: pool.length, note: 'sweep too small to have a distribution' } };

  const reaches = pool.map(reach);
  const med = median(reaches);
  const mad = median(reaches.map((v) => Math.abs(v - med))) || 1;    // never divide by zero
  const threshold = Math.max(minViews, med + madK * mad);

  const candidates = [];
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i], r = reaches[i];
    if (r < threshold) continue;
    // A post juiced by a bot ring reads as "viral" by the numbers and is not organic traction —
    // the same distinction credibility.js draws for named accounts, applied here to the poster.
    const bot = botLikelihood(p.author || {});
    if (bot.likely) continue;
    candidates.push({ ...p, why: `${r.toLocaleString()} reach vs this sweep's typical ${Math.round(med).toLocaleString()}` });
  }
  return { candidates, stats: { n: pool.length, median: Math.round(med), mad: Math.round(mad), threshold: Math.round(threshold) } };
}

module.exports = { flagViral, reach, median };
