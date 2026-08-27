const tw = require('./adapters/twitterapi');
const h = require('../shared/hype');
const history = require('./history');

// Rebuilds social history for windows the app was not running. Day-sized buckets: finer
// granularity would multiply cost without adding much, since the useful backfilled signals
// (how many distinct people, what they said, coordination markers) move on a daily scale.
async function backfillToken(token, { days = 14, onProgress = () => {} } = {}) {
  const have = history.haveSocialBuckets(token.ca);
  const results = [];
  const dayMs = 864e5;
  const todayStart = new Date().setUTCHours(0, 0, 0, 0);

  for (let i = days; i >= 1; i--) {
    const from = todayStart - i * dayMs;
    const to = from + dayMs - 1;
    if (have.has(from)) { results.push({ ts: from, skipped: 'already recorded' }); continue; }

    const b = tw.budget();
    if (b.remainingUsd <= 0.5) { results.push({ ts: from, skipped: 'budget reserve reached' }); continue; }

    onProgress(`${token.sym}: ${new Date(from).toISOString().slice(0, 10)}`);
    const all = [];
    for (const q of tw.queriesFor(token)) {
      try {
        const r = await tw.searchWindow(q.q, from, to, { maxPosts: 20 });
        all.push(...r.posts);
      } catch (e) {
        results.push({ ts: from, error: e.message });
      }
      await new Promise((r) => setTimeout(r, 600));
    }
    const seen = new Set();
    const unique = all.filter((p) => !seen.has(p.id) && seen.add(p.id));
    const { onTopic, noise, noiseRatio } = h.partition(unique, token);

    // A day with no posts is a real reading, not a missing one -- silence is information, and
    // skipping it would bias the baseline upward by only recording days people were talking.
    const bucket = h.bucket(onTopic, { bucketMs: dayMs, ts: from });
    bucket.noiseFiltered = noise.length;
    bucket.noiseRatio = +noiseRatio.toFixed(3);
    history.recordSocial(token.ca, bucket, 'backfill');
    results.push({ ts: from, posts: onTopic.length, authors: bucket.uniqueAuthors, filtered: noise.length });
  }
  return results;
}
module.exports = { backfillToken };
