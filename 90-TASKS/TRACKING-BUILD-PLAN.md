---
id: task.tracking-build-plan
t: build-plan
v: 1
upd: 2026-09-07
machine: connal
status: step-1-verified-live-2026-09-09
---
# MCII — research-to-build plan

One coin, one timed evidence record, one honest AI explanation, then your decision. Collect trader moves, important posts, market activity and real-world news together. Keep the rug check separate. Record the judgment before its outcome so we can learn whether the system helps.

## Authority and scope

Source conversation: **Research best tracking methods**, task `01a07eb6-fe7e-74d1-856a-55c64bdad409`, all available turns read on 7 September 2026. This plan includes the later wallet-discovery discussion as well as the original research. Research archive: [[60-KB/human-ai-entry-exit-research]]; readable report: [research report](../deliverables/MCII%20Human%20and%20AI%20Entry%20and%20Exit%20Research.docx).

User-set direction: AI and human interpret all four streams for entries and exits; no combined score as the main answer; ordinary sellability is excluded as an entry variable; rug/blocked-selling checks remain. The server should watch public wallets even while laptops are closed. More watched wallets must not mean more phone notifications. Connal makes the final call; no trade execution or private wallet keys.

Planning choices below are implementation proposals, not claims that code exists or that the strategy makes money. Existing safety and data-integrity rules remain. Historical green/vote rules can remain labelled comparison methods; they must not be the primary new analysis or silently filter all evidence reaching it. D-125's unresolved presentation is answered here by the existing per-coin view. No new raw-trade phone alerts. The earlier roadmap's score-first sequence and D-121 comparison are historical where they conflict with this conversation and D-122/123.

## What the research changes

- Traders: popularity, wallet size and one profitable coin do not establish repeatable skill. Save selection time and judge later trades, including failures. Distinguish acting before a move from following it.
- Social: retain important named-person posts, unusual genuine reach and coordinated promotion as separate events. Attention can arrive after price and can reverse; a half-hour scan cannot establish minute-level foresight.
- Market: preserve price and flow through time. Gross turnover is not net demand; transaction counts are not distinct people. Linked wallets and circular trades can inflate activity.
- News: find the original announcement, novelty, corrections and actual coin connection. Twenty copied articles are one event. Shared names are not identity proof.
- Human plus AI: fluent explanations do not prove better decisions. Compare the human's first view, independent AI view and human's final view using identical information available at the time.

These are design lessons from the archived research, not proof they transfer to these memecoins or these operators. Every source and research limitation stays in the archive; do not substitute this summary for it when changing the method.

## Starting position and corrections

fact: the saved FOMO file lists 58 followed profiles, 45 third-party wallet matches and 13 unresolved profiles. Its own sourceStatus explicitly says the matches are **not independently checked against chain transactions**. Call them candidate matches, not verified traders. Preserve the original file; record verification separately.

fact: the existing Hetzner collection host is documented to run twice hourly. Local FOMO notifications depend on the Mac and app being awake. Orion uses the existing Claude CLI subscription. Existing market, news, notable-post, signal and price-guard code can be extended. This planning pass did not re-test the live host or prove always-on AI operation.

fact: the old Birdeye holder-profile link now redirects to general documentation. Access to trader history, holder labels and their exact cost is **unverified**. Paid Birdeye is outside the current constraints. It cannot be a required dependency.

fact: Helius advertises a free plan with 1M monthly credits and 10 requests/second. That does not establish how many active wallets we can cover or how much recovery/history costs. Measure the chosen method on a small group before promising hundreds. [Current pricing](https://www.helius.dev/pricing).

## Build order and finish lines

### 1. Finish one analysis using data already collected

Lead: Connal for evidence and analysis; Austin for presentation, following their standing roles. Implement the record builder first so UI work has a stable input.

Create a versioned evidence packet for one chain + coin address + decision time. Read existing market, FOMO, notable-post and news records; show unavailable streams explicitly. Add an on-demand Analyze action to the existing coin view through Orion. Keep earlier readings reproducible rather than overwriting them. Store a separate rug result with its evidence and age.

The packet carries: packet ID/version/hash; chain and coin address; decision cutoff; event time, first-observed time and saved time; source and source-event ID; source link or transaction signature; raw values; units; identity certainty; source age/coverage/errors; related-event group; previous analysis reference. Include only information observed by the cutoff. Later revisions are new records. A post's later reach must not appear in its earlier packet.

Organize four arrays (trades, posts, market observations, news), plus rug checks and missing-data notes. Include raw evidence or exact local references that Orion can resolve. Bound input size deterministically, record what was omitted and allow expansion; never trim opposing evidence simply because it is inconvenient. Treat post/article text as evidence, never as instructions to the assistant.

AI output: what changed first; independent evidence versus echoes; early/late/continuing/fading/reversal interpretation; entry and exit considerations; strongest opposing case; unknowns; stated forecast window and what would change the view. For held coins show disconfirming evidence first. Prior AI prose is a prior opinion, never a new source. Preserve the mandate's confidence number as an explicitly uncalibrated estimate until scored; do not imply it is a measured success rate. The report's preference for bands does not silently amend the mandate.

Finish: one real coin produces an inspectable four-stream packet and visible analysis. Missing data, a failed AI call and a stale source each display clearly. A replay excludes later observations and reproduces the same packet hash. A suspect price cannot become a valid outcome. No aggregate score controls the conclusion.

### 2. Bring a small wallet group onto the server

Lead: Connal. Start with five candidate Solana wallets as a proposed test size, not a trading rule. Confirm mapping through an explicit first-party public address link or sufficiently identifying published transaction evidence. A matching handle, token or approximate amount alone is insufficient. Unproven addresses may be observed anonymously, with identity uncertain.

Choose a documented read-only Helius collection method after checking exact entitlement, credit charges, authentication and recovery behavior. For push delivery, add an authenticated HTTPS receiver; the current host permits SSH only, so a receiver is real additional setup. An outbound subscription avoids a public receiver but needs reconnect and catch-up handling. Pick the method after this bounded check; do not promise both.

Save successful swaps with transaction signature, chain, slot/block time, observed time, wallet, assets in/out, amounts, fee and valuation source/time. Distinguish swaps from transfers, airdrops, staking and failed transactions. Missing valuations stay unknown. Preserve multi-leg evidence while avoiding counting routed swaps twice. Deduplicate repeated delivery and FOMO observations of the same provable trade. Never merge uncertain matches by guess.

Keep a durable cursor; reconnect, backfill and mark unrecoverable gaps. Reconcile against independently fetched transaction history. Log delivery delay and actual credits. Do not run a second paid social collector. Batch shared data writes through one writer so streaming and scheduled collection do not race.

Finish: known buys, sells, transfers and failed transactions are classified correctly; restart/repeated delivery do not duplicate trades; a forced outage recovers or visibly marks the gap. Demonstrate collection while both laptops are closed. Expand 5 → verified candidate set → larger set only after measured usage fits the budget. Preserve unknown extra wallets and exchange activity as coverage limits.

### 3. Build separate trader and large-holder records

Lead: Connal. Reuse the existing wallet discovery and manipulation work before adding another implementation.

Trader candidates: combine verified followed-wallet candidates with traders discovered across a broad, dated coin set. DexScreener supplies coin/pool candidates, not evidence of wallet skill. Use Birdeye only if the needed documented data are accessible within budget; otherwise use a small manually seeded set plus the forward record. Do not scrape around denied access. Existing free documented chain data can provide holders where supported, with incomplete coverage shown.

Store why and when each wallet was selected. Measure repeated realized results across unrelated coins, time before later moves, losses, holding duration, turnover and profit concentration. Remove deposits/airdrops from trading profit. Unknown cost basis prevents a profit claim. Compare outcomes available after MCII observed the trade, not hypothetical fills before we could see it. Keep unsuccessful/departed wallets and dead coins.

Keep creator, insider, sniper, bot, exchange, pool and linked-wallet labels with their evidence and uncertainty. Exclude supported privileged/mechanical activity from the skill comparison, retaining it as context. Shared funding alone is a suspicion, not proof of common control. Show related actors together so ten addresses do not become ten independent endorsements.

Large holders: record balance/share and changes separately from skill. Distinguish real owners from token accounts, pools and exchanges. A large transfer is not a sale. Large-holder action is evidence of possible market impact, not an automatic bearish or bullish vote.

Finish: a wallet can be large without being called skilled; one lucky win cannot establish skill; uncertain labels remain uncertain; a transfer cannot be reported as selling. New candidates never gain a past-looking performance advantage in the forward test.

### 4. Improve timing across market, social and news

Lead: Connal. Extend existing collectors rather than buying duplicate feeds.

Market: persist available short-window price/volume/buy/sell fields and source timestamps; request finer observations only for the small active set when measured free capacity allows. Proposed display windows: 5m, 15m, 1h and 24h, only where the actual source supports them. Half-hour snapshots cannot reconstruct intervening five-minute moves. Rolling 24h total differences are not five-minute volume. Add distinct participants and gross-versus-net flow only from transaction-level evidence; otherwise mark unavailable. Keep second-source disagreement separate, price integrity checks, and real liquidity-pull warnings. Ordinary sellability remains outside the entry analysis.

Social: retain the existing named-person and traction tracks (D-123), source text/links, observed reach history, identity match, credibility and coordination evidence. A celebrity post with no confirmed connection can be displayed as possible context without falsely naming the coin. Do not restore averaged mood or a mention-count trading score. Record detection delay and promotion suspicions.

News: supplement current discovery with original issuer/project/regulator sources and scheduled events where accessible. Save first publication, first seen, corrections, expected event time, category, coin linkage and a shared event ID for copies. AI may propose a narrative connection; mark it inferred until verified. Retain copies as references without independent weight.

Finish: copied news and an echoing tweet group under one underlying event; ambiguous coin names stay ambiguous; late posts show the market move that preceded detection; gaps never become zero activity. Each displayed number can be traced to a source and time.

### 5. Record whether human plus AI actually helps

Lead: Connal for evaluation, Austin for the short interaction in the existing view.

In test mode, freeze the packet; privately record the operator's initial view and reason; generate the AI view without exposing the initial answer; reveal it; record the operator's final view and what changed. Keep Connal and Austin separate. Permit a clearly labelled skipped initial view in ordinary use, but do not count it as a paired comparison. Optional identity-blind first pass is an experiment, not required for the first usable version.

Before the first counted case, freeze prompt/model/version, event eligibility, forecast target and horizon, comparison rule, resolution source and handling of missing data. A proposed first review is 50 resolved calls across at least 14 days; these are review checkpoints, not proof. Repeated readings of one coin are grouped, not counted as independent wins. Keep the learned-model restriction in D-05.

Compare market-only, human-first, AI-only and human-final outputs on the same target. Record direction, adverse/favorable movement, time to movement, forecast accuracy and whether AI-induced changes helped. If simulated returns are reported, use prices available after observation and explicit ordinary transaction costs; do not revive a position-sellability entry filter. If a candle touches both outcome barriers with unknown ordering, mark unresolved. Existing +20%/-15%/24h can be a labelled historical comparator, not the universal new exit rule.

Source-removal experiments use frozen old packets and the same model version, never future trader ratings or revised news. They test incremental information, not proof of causation. Include missed/rejected coins and all triggered analyses; no winners-only report. Freeze changes between test periods and retain the full trial count.

Finish: one packet has distinct initial, AI and final judgments and an auditable later outcome. Missing outcomes remain missing. Review whether final human judgments improve on human-first and on the stronger standalone method. No improvement means revise or reject the assistance method, not claim success from good prose. Validate any promising method again on later untouched observations.

## Cost and operating rules

Ceiling remains $30/month recurring infrastructure/data, with the existing AI subscription treated as already paid under D-07. Earlier session estimates were ~$23–24 social plus ~€4 server, not a fresh invoice check. Calculate remaining dollars from actual billing, exchange conversion and tax before expansion. Shared spend tracking must include named-account queries and the broad sweep; no hidden second allowance. Retain a reserve and stop paid collection before exceeding the ceiling, showing the resulting gap.

No paid Birdeye or paid Helius upgrade is assumed. Helius capacity estimate = observed credits/day × billing-period days, including recovery and history, with headroom. Wallet count alone is not a cost estimate. Measure seven representative days before larger expansion; shorten/restrict coverage visibly if needed. The first evidence-packet build does not depend on those new accounts.

Start AI analysis on demand in the desktop with its existing signed-in CLI. Server collection and always-on AI are different capabilities. A continuously running server analyst requires a separate verified account/runtime/usage check; queued evidence must remain readable if AI is unavailable. No new AI API billing.

Keep phone delivery quiet for individual wallet moves (D-125). Existing rug and notable-event alerts remain under their existing rules. New grouped analytical alerts require a concrete rule and a noise test; the previous assistant's suggestion was not permission to create a fresh notification stream.

Do not publish personal forecasts, holdings, account associations or keys to this public repository. Choose private local/operator storage or an established private server/KV path for those records; share only non-personal market evidence through the existing public data path. Source wallet candidates are already local; this plan does not authorize publishing their association with Connal.

## First build assignment

**Build Step 1 now as the next implementation task:** one real coin → frozen four-stream evidence packet → Orion analysis in the existing coin view → saved analysis with source links and missing-data labels. Proposed new code boundary: `app/shared/evidencepacket.js`, connected through existing `app/main/orion.js`, main/preload handlers and current coin view. Add focused tests for cutoff leakage, identity collisions, missing data and source disagreement, then verify the running app. Step 2 can follow without blocking this useful first result.

This document is the plan, not evidence of implementation. Mark each finish line complete only after a real demonstration. No application code, subscriptions, collection settings or notifications were changed by this planning task.

## Step 1 — VERIFIED LIVE, 2026-09-09

Driven with a real Electron+Playwright session against the actual running app (not just the unit
tests, which already passed) — `app/shared/evidencepacket.js`'s 18 tests, plus a live run against
CATE (`Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump`), both via a direct bridge call and via the real
"War Room" screen's own analyze button (`renderer/station/room-warroom.js`, wired since a prior
session — this planning pass did not know it already reached the UI, not just `main/index.js`).

fact: two full runs each produced a real Orion reply — bear case first, a stated falsifier
("what would change this view"), confidence framed explicitly as an uncalibrated guess, and correct
handling of zero-data streams (trades/posts/news showed as `0` and named in `missingData`, never
hidden or silently treated as safe). Hash/replay guarantees (cutoff leakage, same-input same-hash,
version bump on re-analyze) are covered by the existing test suite and held live too.

est: a single Orion call took ~65-80s in the fastest observed run and did not finish inside 120s in
two other same-session runs (all under the code's own 180s timeout, so not a hang, just slow and
variable) — not dug into further; plausible cause is CLI-level contention with other concurrent
`claude` usage on this machine during testing, not confirmed. Worth watching if it's used live and
the delay becomes annoying, not worth fixing blind.

Finish line met: real coin, real four-stream packet, real visible Orion analysis, missing data
labelled not hidden, no aggregate score gating the read. Step 2 (wallet group onto the server) is
next per the build order above, and is a `[[whale-tracking/README]]`-owned decision, not this one.

## Speed investigation, 2026-09-09 — one real fix shipped, the actual slowness NOT yet solved

Connal asked directly for analysis to be a lot faster. Real work done, honestly reported:

fact: BUILT AND TESTED — `orion.ask()` (`app/main/orion.js`) now takes a `restricted` option, used
only by `evidence:analyze` (`app/main/index.js`). It passes `--tools ''` and `--safe-mode` (stops
Orion wandering into the vault for "more context" on its own initiative -- a real risk, since
anything it reads that way could postdate the frozen cutoff, exactly what the hash/replay tests
exist to prevent) and it no longer reads or writes the shared `sessionId` (an evidence-analysis call
was previously riding on the SAME session memory as the general Orion chat window -- an unrelated
conversation's history silently included in what was supposed to be an independent read, and, as
that history grew over a session, a second real reason later calls would get slower). This is a real
correctness fix, worth keeping regardless of speed. All 20 test suites still pass.

est/falsified: my working theory was that tool-call round-trips were the main cost. Measured live,
twice, with the fix in place, on the same real coin (CATE): 78.8s and 115.1s. That is NOT faster
than the unrestricted baseline (65-80s best case, 120s+ up to the 180s timeout on slower runs) --
so tool-wandering was NOT the dominant cost. Theory rejected by its own test; not restated as true.

fact, found while measuring: the actual prompt sent to Orion for a well-populated coin (CATE, 150
market readings at the current cap) is ~93,000 characters, roughly 20-25k tokens. That is a real,
substantial input, and combined with the deliberately thorough 8-part required answer shape
(`buildOrionPrompt`'s "HOW TO READ THIS" section -- disconfirming evidence first, independent vs
echoed evidence, early/late/reversal read, opposing case, unknowns, forecast window; researched and
specified in `[[60-KB/human-ai-entry-exit-research]]`, not decoration) produces a genuinely long
reply (4,400-5,700 characters observed) -- this looks like the real cost: a thorough answer to a
large amount of evidence, on a subscription CLI call rather than a raw low-latency API, simply takes
a real amount of time to generate. Not confirmed by a controlled model-vs-model timing test -- that
test was starting (comparing the default model against an explicit faster tier on the identical real
prompt) when this session was told to stop spending on it and write up what's known instead.

Three real levers exist, NONE decided or built -- his call, each has a real cost:
1. **Shrink the market stream further.** `STREAM_BOUNDS.market` is already 150, cut down once
   before from 500 for this same complaint (`shared/evidencepacket.js` comment, 2026-09-07). Cutting
   it further (say to 60-80) directly shrinks the prompt and should genuinely help -- cost: less
   price history in view, coarser trend-reading.
2. **Ask for a shorter reply.** The 8-part structure is the researched design, not filler --
   shortening it is exactly the kind of "simplify the analysis, not just the delivery" move the
   mandate says costs money. Possible middle ground: keep all 8 points, ask for fewer sentences per
   point -- untested.
3. **Try a faster model tier for this call specifically** (e.g. `--model haiku` vs the account
   default). Untested for whether analysis QUALITY holds up on this specific task -- speed without
   knowing if the read stays trustworthy is not a win. This needs a real side-by-side comparison
   before trusting it, not a guess.

Not yet measured: how much of the ~80-115s is input processing (prefill) vs the reply being
generated (decode) -- that split would say whether lever 1 (shrink input) or lever 2/3 (shrink or
speed up output) matters more, and wasn't isolated before this session stopped.
