---
id: area.trading-strategy.open-questions
t: area-questions
v: 2
upd: 2026-09-05
machine: connal
prio: max
---
# OPEN QUESTIONS — the algorithm, how it shows up in the app, and what we're tracking

!! Connal answered most of this same night, 2026-09-05 — full detail in `[[LOG]]` and the task
board. Headlines: weak/unproven findings now get SHOWN not hidden (D-119); position sizing has no
cap, sized by confidence, his final call (D-120); "a few times an hour" trading is on the table
(needs one clarifying confirmation — see the board's decision-needed section); the labelled-outcome
record, the news filter, and Robinhood Chain research are all done. This file's own text below is
left as originally written, not edited to look pre-answered — the LOG has the real record.

Written for Connal to read and answer over time, not shorthand — requested 2026-09-05 as a
standalone reference doc, separate from the historical `[[30-GRILL/grill|GRILL]]` (that one is the
08-23 pre-build interrogation; this is the current, live list). Pulled together from tonight's
session plus everything already open in the vault. Answer any of these whenever — nothing here
blocks anything, it's the map of what's still undecided.

## 1. THE ALGORITHM ITSELF

**What feeds it, and how sure are we about each piece**
- Wallet "smart money" — does a wallet that made money before keep making money? Never tested.
  Rated below a coin-flip's worth of confidence right now.
- Wash-trade filter — built and runs, but never yet caught a REAL known case of wash trading to
  prove it actually works, only run on clean data so far.
- Trend/consistency score (untracked coins) — tested tonight, found NOT to predict anything yet.
  Keep it as a "watch" list, drop it, or redesign the score itself?
- Holders-vs-price finding (CATE/DOGE-1 grow with real holders, LaPeace didn't) — real, but should
  it ever become part of a coin's score, or just something shown?
- News self-name candidates (the DOGE-1-style "next big thing" finder) — once you or I confirm one
  is real, does it become permanent for that coin, or does it get re-checked each time?

**How it decides**
- Right now a coin is either ADMITTED or REJECTED — no middle ground. Given you want weak signals
  shown too, should there be a third state — "watching, not confirmed" — that shows up differently
  than a real admit?
- Should a weak/unconfirmed indicator ever be allowed to push a notification to your phone, or
  should those only ever show up when you open the app?
- What actually triggers a coin to be scored at all, right now — only your followed traders'
  trades. Should the trend list or the self-name news candidates ALSO be able to trigger a check,
  or should they only ever be things a human looks at first?

**The trading plan itself — still mostly undecided**
- The actual buy/sell entry rule — still "we don't know yet."
- How wide a stop-loss/profit-target should be per coin (scale to how much that coin normally
  swings, or one flat number for everyone?).
- Is trading "a few times an hour" back on the table, or does the no-sniping-under-2-hours rule
  still hold? You said you're open to changing it, never that you decided to.
- What actually counts as "the algorithm worked" — needs a real yes/no bar, not just "made money,"
  since a rising market makes anything look good.
- How the $100 test budget splits across coins, and how much per trade.

## 2. HOW IT SHOWS UP IN THE APP

None of the below is built yet — these are Austin's build list, added tonight:
- A screen showing WHY a coin got picked or rejected (the reasons the algorithm already has, with
  nowhere to display them).
- Wallet activity — flagged for fake trading wherever it's shown, plus its own dedicated screen.
- The "coins trending up" list — needs to be clearly marked unproven, not a ranked leaderboard.
- News — three separate kinds (your coin's real-world story, general crypto news, and the
  "next DOGE-1" candidate finder) — the candidate finder specifically needs a yes/no button per
  item since it can be wrong (real news about someone else entirely with the same name).

**Still undecided, worth answering before Austin builds it:**
- What should a WEAK/unconfirmed indicator actually look like on screen, so it's clearly different
  from something confirmed — a color, a badge, a separate section? Not designed yet.
- Where does each of the above live — one combined "signals" screen, or spread across existing
  screens (coin detail, wallet screen, discovery screen)?

## 3. WHAT WE'RE TRACKING (or should be)

- **Robinhood Chain** — a real blockchain CASHCAT and a few other coins run on, mentioned twice now
  by real news sources, never actually researched: what is it, who runs it, can we get real price
  history for coins on it at all (checked once already — no, GeckoTerminal doesn't index it).
- **Elon/Trump tracking** — your idea: use notifications on your own computer the same way we
  already read FOMO's notifications for free, instead of paying for a live feed. Worth checking if
  that's actually possible before building anything.
- **The labelled outcome record** — flagged days ago as the single most important thing to start
  recording (so we can ever prove anything works) — is it actually running day to day, or did it
  stall? Worth a direct check.
- **Which wallets to follow** — still not derived from real data, just whoever you've manually
  added so far.
- **Chart history while both laptops are closed** — still doesn't happen; only price/liquidity
  snapshots get recorded, not full charts.
- **A calendar of known future dates** — coin unlocks, listings, anything scheduled — flagged weeks
  ago as cheap and useful, never built.
- **How long a real pump lasts after a big post** — the always-on server now makes this
  measurable; still hasn't been run.
- **`curl` on the collection server** — the news feature quietly depends on it being installed
  there; not yet confirmed it is.

## HOW TO USE THIS
Answer whatever you want, whenever — in chat, or just edit this file directly and I'll pick up the
changes next session. Nothing above is blocking; it's the honest map of what's still open so
nothing gets silently decided by whatever gets built first.
