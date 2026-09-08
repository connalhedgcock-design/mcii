/**
 * virality.js — the traction track of the "important tweets" feed (D-122).
 * Asserted against the rule in its own header: an outlier against THIS sweep's
 * own distribution, never a fixed guessed number, and bot-driven reach excluded.
 */
const { flagViral, reach, median } = require('../shared/virality');

let pass = 0, fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${x ? '  ' + x : ''}`); }
  else { fail++; console.log(`  FAIL  ${n}${x ? '  ' + x : ''}`); }
};

const post = (over = {}) => Object.assign({
  id: Math.random().toString(36).slice(2), text: 'just bought $CATE', views: 100,
  likes: 5, reposts: 1, replies: 1, author: {},
}, over);

// A quiet sweep: everything ordinary, nothing should trip.
{
  const quiet = Array.from({ length: 20 }, () => post({ views: 80 + Math.round(Math.random() * 40) }));
  const { candidates } = flagViral(quiet);
  check('a sweep with no real outlier flags nothing', candidates.length === 0);
}

// One post far above everything else, from a normal-looking account.
{
  const posts = Array.from({ length: 20 }, () => post({ views: 100 }));
  posts.push(post({ id: 'the-big-one', views: 500000, text: 'this coin is going to $1' }));
  const { candidates } = flagViral(posts);
  check('a genuine outlier is flagged', candidates.some((c) => c.id === 'the-big-one'));
  check('...and says why, against the sweep\'s own numbers', /reach vs this sweep's typical/.test(candidates[0]?.why || ''));
}

// The same outlier, but from an account that looks like a bot ring -- excluded, because reach
// bought by a botnet is not organic traction.
{
  const posts = Array.from({ length: 20 }, () => post({ views: 100 }));
  posts.push(post({
    id: 'bot-driven', views: 500000,
    author: { createdAt: Date.now() - 2 * 864e5, postsPerDay: 400 },
  }));
  const { candidates } = flagViral(posts);
  check('bot-driven reach is excluded, even at huge scale', !candidates.some((c) => c.id === 'bot-driven'));
}

// Too small a sweep to have a meaningful distribution at all.
{
  const { candidates, stats } = flagViral([post(), post()]);
  check('a tiny sweep is not treated as having a real distribution', candidates.length === 0 && /too small/.test(stats.note || ''));
}

check('median of an odd list', median([1, 5, 3]) === 3);
check('median of an even list', median([1, 2, 3, 4]) === 2.5);
check('reach prefers views when present', reach({ views: 50, likes: 1000 }) === 50);
check('reach falls back to engagement when views is absent', reach({ likes: 5, reposts: 2, replies: 1 }) === 5 + 4 + 1);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
