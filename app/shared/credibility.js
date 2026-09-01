// How much one account's word is worth, 0..1.
//
// WHY THIS EXISTS SEPARATELY FROM botLikelihood()
// `hype.js: botLikelihood()` answers a yes/no question — is this account automated — and it is
// right to be binary, because a bot's opinion is not a person's opinion at any weight. But the
// discovery path needs a different question: of the people naming a coin, how many are plausibly
// real? Counting heads there treats three week-old accounts posting 400 times a day exactly like
// three humans, and that is the difference between a signal and a botnet (measured 2026-09-01:
// the sweep surfaced 180 unknown tickers and nothing distinguished which were organic).
//
// GROUNDING — the features here are the ones the bot-detection literature actually supports, not
// invented. Account age and posting rate are primary indicators in Botometer's own feature set;
// default avatars, follower/following imbalance and bought-follower share are standard profile
// tells. See `60-KB/social-signal-research.md`. ! deliberately NOT included: anything about what
// the account says. Content-based scoring would collapse into "posts I agree with", and the
// research that holds up is about behaviour, not opinion.
//
// ! THIS IS A WEIGHT, NEVER A GATE ON TRUTH. A throwaway account can name a real coin. Low
// credibility means "do not count this as a person vouching", never "this post is false".

const NEW_ACCOUNT_DAYS = 30;

function credibility(a = {}) {
  const reasons = [];
  let score = 1;

  const knock = (amount, why) => { score -= amount; reasons.push(why); };

  // X's own automation label. Opt-in, so absence proves nothing, but presence is authoritative.
  if (a.declaredAutomated) knock(0.9, 'X labels this account automated');

  const ageDays = a.createdAt ? (Date.now() - a.createdAt) / 864e5 : null;
  // ! Age is unknown fairly often, and unknown must not read as new. Silence is not evidence.
  if (ageDays != null) {
    if (ageDays < 7) knock(0.45, 'account less than a week old');
    else if (ageDays < NEW_ACCOUNT_DAYS) knock(0.25, 'account under a month old');
  }

  // Posting rate. A human can post a lot; nobody sustains hundreds a day by hand.
  if (a.postsPerDay != null) {
    if (a.postsPerDay > 200) knock(0.45, 'posts hundreds of times a day');
    else if (a.postsPerDay > 50) knock(0.2, 'posts more than 50 times a day');
  }

  // Follows thousands, followed by nobody: the shape of an account made to amplify, not to talk.
  if (a.followers != null && a.following != null) {
    if (a.followers < 10) knock(0.2, 'almost no followers');
    else if (a.followers < 50 && a.following > 500) knock(0.25, 'follows many, followed by few');
  }

  if (a.defaultAvatar) knock(0.15, 'no profile picture');

  // X tracks low-quality followers separately; a large share is a strong purchased-audience tell.
  if (a.fastFollowers != null && a.followers > 0 && a.fastFollowers / a.followers > 0.25) {
    knock(0.2, 'large share of low-quality followers');
  }

  // Verification is weak evidence in both directions now that it is purchasable — a small nudge,
  // never a pass. ! do not raise this without a reason better than "it feels trustworthy".
  if (a.verified) score += 0.05;

  score = Math.max(0, Math.min(1, score));
  return { score: +score.toFixed(3), reasons, plausible: score >= 0.5 };
}

// The count that matters for discovery: not how many accounts named a coin, but how much real
// vouching that adds up to. Three accounts at 0.2 is 0.6 — less than one plausible person, which
// is the honest reading of three throwaways agreeing with each other.
function weightedPeople(authors) {
  let sum = 0;
  for (const a of authors) sum += credibility(a).score;
  return +sum.toFixed(2);
}

module.exports = { credibility, weightedPeople, NEW_ACCOUNT_DAYS };
