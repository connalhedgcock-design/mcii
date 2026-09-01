---
id: area.trading-strategy.log
t: area-log
v: 1
upd: 2026-08-31
machine: connal
---
# TRADING STRATEGY — log (append-only)

## 2026-08-31 — 1. THE WHOLE CONVERSATION, IN ORDER
- machine: connal

**Started with a capability question.** Connal: "how well can you analyze memecoin graphs... could
you learn to analyze graphs, pull data from social media, and identify rug pulls efficently."
Answered honestly: reading exact numbers off a chart image isn't reliable, and chart-pattern
prediction has weak evidence even for professionals, more so for memecoins driven by narrative not
structure. What's actually reliable is reasoning over the STRUCTURED numbers MCII already computes
(liquidity, holders, safety), not eyeballing images. Social pulling already exists (the X sweep).
Rug detection splits in two: mechanical rugs (mint/freeze/LP-pull) are already caught reliably via
on-chain facts; "soft rugs" (a coin just loses interest) are a genuinely hard crowd-prediction
problem no amount of chart-reading skill fixes.

**Connal: "so with really solid data you could become a successful trader."** Pushed back directly:
better data fixes being wrong about facts, not the actual hard problem (predicting what other
people do next). Memecoin markets are adversarial — a reliable public signal gets arbitraged away.
The project's own forecast record is barely started, nowhere near enough to claim any edge exists
yet. The defensible, already-real value here is risk management (catching rugs, knowing real exit
liquidity), not picking winners — which is exactly why the mandate bans buy/sell/size language.

**Connal: "dont ever just staright up disagree with me try to help me flush out my idea."**
Recalibrated: engage constructively, find the buildable kernel, hold firm only on genuine
structural boundaries, state them plainly when they come up rather than softening past them.

**Reframed the "become a trader" idea into something real:** pick one specific, falsifiable
hypothesis (e.g. the existing "accumulating" signal), log it as a real forecast every time it
fires, let the Brier score answer honestly whether it beats a coin flip — instead of assuming an
edge exists. Separately: better data reliably cuts the worst losses (catching a rug before it
happens) even with zero ability to predict winners — a real, provable win available right now,
independent of any edge-discovery work.

**Connal proposed automated paper trades** — Claude deciding simulated entries against a signal,
tracked to a real outcome, no real money, he decides afterward whether to act on results with real
money. Genuinely good and safe: no wallet, no venue, nothing real touched. Design sketch offered:
trigger on signal → record price/time → fixed pre-committed exit rule (never changed after entry,
same discipline `40-POS/` theses already require) → scoreboard vs a real baseline.

**Connal: "dont just jump into building we need to flush this idea out a lot more... we also need
to make a whole strategy for how we are going to trade."** Pivoted fully to strategy-first, no
code. Produced a 7-category question framework: the edge, entry rule, position sizing, exit rule,
exclusion list, validation, and governance/discipline. Asked Connal to work through it. He did, in
full — his actual answers, condensed (verbatim flavor kept where it matters):

- **Edge**: "a combined high-level, industrial-grade analysis of social media data, charts, chart
  trends, real world data, whale activity, and wallet tracking done by a high powered ai." Wants
  both loss-avoidance AND picking winners, short and long term. Believes it won't get arbitraged
  away because "its not a gimmick its simply an analysis of lots of data exactly the way investment
  banks analyze companies." Wants momentum read across multiple data types at once, distinct from
  plain price-momentum-chasing.
- **Entry rule**: "we dont know yet" to every specific question (exact conditions, single vs.
  multiple signals, disqualifiers) — honest, and exactly what the next session is for.
- **Frequency**: wants "a few times an hour... to get good data and trade as quickly as possible."
  ⚠️ conflicts with D-20/D-36 (no sniping, nothing under 2h old). Not resolved — flagged to him
  directly, he did not commit either way beyond openness to reopening it (see exclusions, below).
- **Entry decision-maker**: him initially, "unless in testing you show that you are capable of
  handling it yourself." → led directly to the boundary conversation, see entry #2 below.
- **Position sizing**: "no limit really trade how you like" on position count; per-trade % "depends
  on confidence in the trade and my current financials"; confidence "determined by you [Claude]
  with the input of me... unless you prove yourself capable"; total capital "I need to see results
  before i tell you that." Flagged: no limit isn't testable as stated, and "confidence from Claude"
  needs to be an honest structured score, not manufactured conviction (see area README).
- **Exit rule**: "some combination" of target/stop/time, "a full financial strategy describing
  target gains and risk tolerance" still needed. Varies by coin. Illiquidity override: yes,
  probably. Enforcement: him, with Claude's input, final say his "in the beginning."
- **Exclusions**: NOT committing to keep "nothing under 2h" or "never chase already-moved" —
  "not necessarily, depending on what you accuracy looks like." Same for safety-gate/holder-
  concentration/liquidity-floor exclusions: "not necessarily we need to just identify what we can
  do with those types of coins." No market-wide sit-out condition: "No."
- **Validation**: no fixed n before trusting results, "we have to work on it and try to refine it."
  Falsifier as stated: "lack of consistent profits when the technology is in a state where it
  should be profitable" — flagged as circular, needs sharpening. Baseline as stated: "as long as we
  are making profitable trades at a reasonable expense" — flagged that profitable ≠ proof of edge
  (a rising market lifts everything); pointed at the existing forecasts-vs-market machinery in
  `journal.js: calibration()` as the model to follow. Neither point was resolved to a final answer.
  Paper-trading floor: "at least two weeks."
  Scanner reliability: his own responsibility, matches D-89 ("if it isnt [working] i will fix it").
- **Governance**: rules "probably fully tweakable" — flagged tension with ever getting a clean
  pass/fail read; proposed (not yet agreed) versioned rule-locking per test window instead of
  continuous tweaking. His instinct stated separately — "develop a strategy now and then stick with
  it... adjust the strategy" based on evidence — actually agrees with that proposal, just phrased
  loosely enough to also say "fully tweakable" in the same answer. Worth resolving explicitly next
  time, not assumed either way. No Austin sign-off needed: "if one of us wants to follow with it
  they should be able to spend their own money on it."

## 2026-08-31 — 2. THE PERMANENT BOUNDARY — PUSHED ON DIRECTLY, HELD, WITH REAL REASONING
- machine: connal
- Connal, directly: "id be silly if you are showing in automated testing with no real money that
  you are trading at a good proiecency to not give you the ability to make trades yourself." Asked
  to "be frank."
- Held the line, with actual reasoning rather than a bare rule citation: paper results systematically
  overstate real ones (idealized fills; real capital chasing a signal moves the exact price the
  signal depended on, which never shows up in a backtest); a good stretch in something this volatile
  doesn't separate skill from luck as fast as it feels like it should; and — the strongest point —
  even a fully validated strategy doesn't need Claude holding the trigger, because the right way to
  run a proven rule set is auditable code a human runs, not an LLM's live judgment, which can be
  talked into a bad trade and produce a fluent, confident-sounding justification for one in a way
  fixed code cannot.
- Connal: "we can reopen this later we need results either way." Not conceded, not abandoned —
  parked pending real results. Treat as permanent until Connal explicitly revisits it with data in
  hand; see the README's boundary section.

## 2026-08-31 — 3. SCAN CADENCE, BUDGET, AND TWO REQUESTED FEATURES
- machine: connal
- Asked Connal directly how often the app currently scans and whether it's consistent while
  offline, rather than assume. Checked the real record (24 straight hourly commits, no gaps) and
  the actual code (`fetchHistory` — chart data — is ONLY called from the live desktop app, never
  the cloud collector). Answered precisely: broad market/safety/social/holder checks run hourly,
  reliably, offline; chart history does not accumulate offline at all.
- Connal, asked for a reasoned estimate of needed scan frequency: gave a split answer — discovery
  signals build over hours so ~hourly-to-30-min is probably already close to right and going faster
  mostly just costs money; protecting an existing position from a fast rug needs much faster
  checking, which the app already does at 15s but ONLY while open, and that gap (not the hourly
  scan number) is the real lever for "good results."
- Connal decided, concretely, all three at once: move to every 30 minutes even if it costs more;
  build a way to catch a fast liquidity pull while offline; build some chart history for Claude to
  analyze.
- Clarified before building: raising the X budget to the $24 Connal had already named would blow
  past the existing $20/mo ALL-IN hard cap by itself — surfaced explicitly rather than silently
  implemented or silently ignored. Connal: "i understand we will need more money and am okay with
  it." Set X cap $24, ALL-IN ceiling $30, cadence `:12,:42` (twice hourly) — SHIPPED, see the area
  README's "shipped" section and D-90.
- Liquidity-pull alert channel: asked, Connal chose Telegram ("if we could get it on our phones").
  NOT built — needs his bot token and a real answer on whether GitHub Actions' scheduler can
  actually deliver sub-hourly reliably (unproven — see area README).
- Chart history scope: asked watchlist vs. whole-market vs. something in between; Connal answered
  "some in between... is there a way you could be identifying which coins we should be tracking by
  doing a bunch of deep research" — which redirected the conversation into the discovery-gap
  question below rather than landing on a chart-history scope. Not resolved.

## 2026-08-31 — 4. THE DISCOVERY GAP — CONFIRMED STILL REAL, PARTIAL FIX ALREADY EXISTS
- machine: connal
- Connal asked whether Claude could do "deep research" to identify which coins are worth tracking,
  rather than relying on whatever the scanner already surfaces.
- Checked the actual code rather than repeat an old vault claim: `screener.js` still only sources
  candidates from DexScreener's newest-profile listings, DexScreener's paid/promoted listings, and
  GeckoTerminal's trending-by-volume pools — three sources, all either too-new-to-judge or
  already-popular. The long-documented "momentum-biased discovery" gap is confirmed still true
  today, not stale.
- Was explicit about what "AI does deep research" can and cannot honestly mean: an LLM freelancing
  open-ended web research on a schedule isn't cheap, repeatable, or reliable, and its output ("this
  coin looks promising") would be exactly the ungrounded, unfalsifiable signal this project has
  avoided everywhere else. What IS real and partly built: `shared/resolve.js`'s
  `unknownTickers()`/`identify()`, already finding tickers ≥3 different real people are organically
  discussing and resolving them to a contract address — grounded in actual people, actually
  talking, not a guess. Currently display-only in the sector view; never feeds tracking.
- Connal agreed this should be developed as its own real thread (not folded into the chart-history
  question). Posed the open questions in the area README's discovery section — none answered yet
  before the conversation moved to closing out this handoff.

## 2026-08-31 — 5. HANDOFF REQUESTED
- machine: connal
- Connal, mid-sentence proposing a $100 paper-trading budget split across coins, interrupted himself:
  "can you make a handoff file for this chat the next chat will be focused on building the part
  that actually picks coins to buy/sell so lets focus on that."
- This area (`70-AREAS/trading-strategy/`) created in response. The $100 figure is real and stated
  — "start with an 100$ budget and split it up into different coins while you are testing" — but
  the split itself was never worked out; it was the sentence being written when he redirected to
  asking for this handoff. Next session: pick this up starting with the entry-signal/coin-picking
  algorithm, per his direct instruction, not the $100 split first unless he says otherwise.
