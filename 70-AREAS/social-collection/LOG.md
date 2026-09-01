---
id: area.social-collection.log
t: area-log
v: 1
upd: 2026-09-01
machine: connal
---
# SOCIAL COLLECTION — log (append-only)

## 2026-09-01 — 1. MEASURED AUDIT OF THE PRE-REBUILD RECORD (the "before" numbers)
- machine: connal
- Connal: "for now we need to make sure we are getting what we need from social media and at a
  good rate." Audited `data/social.jsonl` (376 rows at the time, 08-27 13:10 → 09-01 06:13 UTC,
  9 tickers), `data/sector.jsonl` and `data/x-spend.json` + its git history.
- !! TIMING MATTERS FOR READING THIS ENTRY: measured against the record as it stood BEFORE the
  two-track rebuild described in this area's README landed. Two of the four findings were already
  being fixed in parallel. Kept in full anyway — it is the independent "before" baseline, and two
  findings were arrived at from different data than the README's, which is corroboration rather
  than repetition.

### FINDING A — 99% of readings sat below our own reliability bar  ! STILL TRUE OF THE OLD RECORD
- fact: uniqueAuthors per bucket — min 4, median 13, max 26. `20-SPEC/scoring.md` §D sets the bar
  at U < 25 → "UNRELIABLE — n too small". **389 of 391 rows (99.5%) fell under it.**
- fact: confidence tiers across the whole record — moderate 258, low 130, none 3. Never once high.
- → the README's credibility weighting is the right response and supersedes the fix I would have
  proposed (more depth). ! but note what changed: weighting replaces head-COUNTING, it does not
  raise head COUNT. A weighted "three plausible people" is a better three than an unweighted three;
  it is still three. ∴ Finding A is not closed by the rebuild, it is reframed by it.

### FINDING B — the burn rate empties the month early  !! SHARPER NOW, NOT RESOLVED
- fact @`x-spend.json` + git history, re-measured 07:13 UTC AFTER the rebuild: $0.54525 spent,
  3,635 posts. Month-to-date rate = **$1.81/day ≈ $54/mo ⇒ cap hit ~day 13**. The most recent
  1h23m slope is steeper still ($3.71/day ⇒ ~day 6.5).
- !! this DISAGREES with the README's "ceiling $18.16/mo · September running at ~2%". Those are not
  the same kind of number: $18.16 is the DESIGNED ceiling of the configured cadence, and "~2%" is a
  point-in-time fraction spent on the first morning of the month, which says nothing about rate.
  ! a percentage-spent on day 1 is not a burn rate and must not be read as reassurance.
- ∴ `?` either the designed ceiling is not being enforced, or the first hours carry catch-up from
  the rebuild. ! DO NOT act on either reading yet — both are consistent with the data.
  ✓ cheap resolving check, and it should be standing rather than one-off: re-read `x-spend.json`
  at day 3 and day 7 and compute $/day. If day-3 rate ≤ $0.60/day the ceiling is holding.
- ! and per D-28/D-42 the consequence is not "overspend", it is that **collection stops entirely**
  at the cap. A strong fortnight then silence is the worst shape for a record meant to accumulate.

### FINDING C — the broad sweep supplies ~1% of posts  ✓ INDEPENDENTLY CONFIRMED
- fact: across 376 rows, `fromSweep` = 76 posts vs `topUp` = 7,154. **Sweep share 1.1%.** 307 of
  376 rows received nothing from it at all.
- ✓ the README reached the same conclusion from different data (1 of 175 posts on the first live
  run). Two independent measurements, same answer ∴ this is not a sampling artefact. D-67's
  "cost must not scale with the watchlist" is being violated in practice, and that is the most
  likely driver of Finding B.
- ! still not diagnosed: sweep returning little / results attributed to top-up / the 2→6 query
  widening changing the accounting. Two of those three are bookkeeping and one is a real outage,
  and they need opposite responses. ! diagnose before fixing.

### FINDING D — we stored conclusions, not evidence  ✓ LARGELY FIXED THE SAME DAY
- fact (of the old record): the only per-post data kept was `topPosts` — 5 posts per bucket with
  `at, handle, likes, replies, sentiment, text, url, views`. Author id, account age, postsPerDay,
  `declaredAutomated`, `defaultAvatar`, follower counts, `fastFollowers`, posting client and
  per-post addresses were all received by `twitterapi.js: normalize()`, used once, and dropped.
- ✓ CLOSED by `shared/postfacts.js` → `data/post-facts.jsonl` (325 rows at time of writing), which
  stores one row per post paid for: `author` (salted hash), `cas`, `tickers`, `cred`, `er`, `kind`,
  `print`, `reply`, `views`, `ts`. Coordination-by-timing and wording fingerprints are now
  recomputable. That was the finding I had ranked fix-first ∵ it was the only irreversible one.
- ! RESIDUE THAT SURVIVES, and it is the same mistake one level down: the bulk row stores `cred`,
  the SCORE, not the inputs it was computed from (age, postsPerDay, follower shape, avatar,
  automation label). ∴ credibility can never be RE-scored against this record under a better
  formula — only re-used. Same failure as storing a summary instead of the evidence, at a smaller
  scale. `est:` conf 80% it is worth also storing the handful of raw account fields; they are a few
  bytes and `60-KB/signal-architecture-research.md`'s replayability principle applies unchanged.
  ! falsifier: if the credibility formula is genuinely final and will never be retuned, this is
  wasted bytes. I do not believe that, and the README itself calls the detector untested.

### SIDE OBSERVATION — junk in the tracked set
- fact: the record carries buckets for `fone`, `invest` and `ANTSEM`. Two are ordinary English
  words; the third looks like a mis-resolution of ANSEM. D-72 predicted this exact failure and
  named `fone` specifically. Still present, still costing real budget on non-coins.

### ORDER OF WORK COMING OUT OF THIS AUDIT (revised after reading the rebuild)
1. **Re-measure the burn at day 3 and day 7** and reconcile the $54/mo observation against the
   $18.16/mo design ceiling. This is now the top item — Finding D took the previous top slot and
   is done.
2. **Diagnose the sweep** (Finding C), do not fix it blind.
3. **Store the credibility INPUTS, not only the score** (Finding D residue).
4. **Drop the junk tickers** (D-72 already says how).

### DEFERRED, STATED BY CONNAL THE SAME DAY
"we need live chart data all the time even when offline" — a real requirement, explicitly parked by
him ("but for now..."). ! also the prerequisite for the famous-account window measurement in
`80-WHISPERS/analysis-algorithm/README` — a twice-hourly record cannot resolve a 30-minute window.
Two separate asks, one shared blocker. Not started.

### ARTIFACT
Plain-language version of this audit, for reading rather than for reference:
https://claude.ai/code/artifact/e9aeb8ef-45b3-41a9-9c54-964e7924d0d1
! it was written before the rebuild landed and carries a correction note to that effect.

## 2026-09-01 — 2. ROOT CAUSE OF THE BURN GAP: THE CODE ASSUMES ONE RUN AN HOUR, THE SERVER RUNS TWO
- machine: connal
- Connal: "work on a plan for solutions to these problems and come back to me with it." Before
  planning, chased entry 1's Finding B (observed ~$54/mo against a design ceiling of $18.16/mo).
  ! it is one root cause, not two independent problems, and it is arithmetic rather than tuning.

### THE CAUSE
D-98 moved collection to a systemd timer at `*:12,42` — **twice** an hour. `cloud-collect.js` was
written when the trigger was hourly, and two places still assume that:
1. `if (q.everyHours > 1 && !dueForQuery(q.kind, q.everyHours))` — the due-check is SKIPPED for any
   query whose cadence is exactly 1 hour. ∴ `dying`, `links`, `asking` and `buying` (150 of ~166
   swept posts an hour) fire on **both** runs. They are labelled hourly and behave half-hourly.
   ! `mood` (6h) and `crowd` (2h) are gated correctly — which is why this hid: the queries that
   LOOK like they prove the gate works are the only ones it applies to.
2. `const runsLeftThisMonth = Math.max(1, hoursLeftInMonth())` — the name says runs, the value is
   hours. The per-run top-up allowance is therefore twice what the month can afford.
   ! currently MASKED: `Math.min(20, …)` and `Math.min(topUpPostsPerCoin, 15)` bind first, so the
   pacing maths is inert — spend is set by the ceilings, not by the budget. ∴ **the budget guard is
   not currently guarding anything.** That is worse than the 2×, and it is invisible from outside.

### THE ARITHMETIC, CHECKED AGAINST REAL SPEND
- fact: sweep as designed (once/hr) = 165.8 posts/hr → **$17.91/mo**. ✓ matches the README's quoted
  $18.16 ceiling — the design number was right; the design is not what runs.
- fact: sweep as actually running = 315.8 posts/hr → **$34.11/mo**.
- fact: one observed run (07:03→07:13, `x-spend.json` git history) = $0.03975 = 265 posts.
  At two runs an hour → **$57.24/mo** against a $24 cap. Sweep ~$34 + top-ups ~$23. The residual
  matches top-up almost exactly, so nothing unexplained remains.
- ∴ cap exhausted ~day 10, then collection STOPS (D-28/D-42). conf 90% — three independent numbers
  (design, code path, observed spend) agree.

### ! WHY THIS IS A P1 (SILENTLY WRONG), NOT A P3
Nothing looks broken. Every log line is truthful, the queries return posts, the cap is not yet hit,
and `x-spend.json` is accurate. The only symptom is a number nobody was comparing to a rate — the
README even reported "September running at ~2%" on the first morning, which is true and tells you
nothing. Same family as D-60/D-63/D-85: working and broken are indistinguishable from outside.
! and it is the third time in this project that a CADENCE CHANGE outran the code that assumed the
old one (D-88's internal loop, D-90's twice-hourly, now D-98's timer). ∴ the durable fix is not
this patch — it is that cadence must live in ONE place that the code reads, never be assumed twice.

### NOT FIXED YET — this entry is the diagnosis, the plan follows
