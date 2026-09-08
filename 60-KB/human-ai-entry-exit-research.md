---
id: kb.human-ai-entry-exit-research
t: research
v: 1
upd: 2026-09-07
machine: connal
---

Archived from the research task’s original report source; research claims were not independently re-run in the planning pass. Implementation plan: [[90-TASKS/TRACKING-BUILD-PLAN]].

# MCII Human and AI Entry and Exit Research

Audience: Connal and Austin  
Date: 7 September 2026  
Scope: How a human and AI should jointly interpret FOMO trader activity, social media, market data, and real-world news to improve memecoin entry and exit decisions. The existing rug filter remains separate. Ordinary ability to sell the intended position is assumed and is not treated as an entry signal.

## Direct answer

The best-supported design is not a combined score and not four independent trading rules. MCII should preserve the raw evidence from each source, align everything to the moment it became available, and give the AI a fixed evidence packet whenever something important changes. The AI should identify the order of events, competing explanations, confirming and conflicting evidence, and what it expects next over a stated time window. Connal should make an initial judgment before seeing that analysis, then record his final judgment after seeing it.

This design could work, but published research does not prove that it will work for MCII. Social attention and news often describe a move already under way. Influencer effects can occur within minutes and then reverse. “Top trader” status is vulnerable to selection bias and may not persist. Language models can produce convincing explanations without better forecasts. The system therefore earns trust only when its future calls, recorded before the outcome, improve on Connal alone, the AI alone, and simple market rules.

## What each source is good for

### FOMO followed traders

FOMO activity should be treated as named actors taking timed actions, not as a vote count. For every trader, MCII should retain the buy or sell time, coin, amount, repeat actions, prior position where available, and what the market had already done before the alert. A group of traders buying after a large rise may be late confirmation rather than useful foresight.

Research on social-trading rankings warns against assuming that recently popular traders will continue to outperform. [Broihanne and coauthors](https://doi.org/10.1016/j.frl.2026.110481) found abnormal performance before traders became popular but no persistence afterwards. Other research finds that a minority of individual investors can show persistent skill, so the correct response is to test each trader prospectively rather than discard trader tracking. MCII should judge a trader only on actions after the system began following or rating that person. It should include disappeared traders and failed coins, and compare the trader with simple momentum and with eligible traders chosen at the same time.

The useful AI question is not “how many top traders bought?” It is “who acted first, who followed, did their earlier actions on unrelated coins help, are they buying together unusually, and is the current move already mature?” Sells and buys must be read in context. A sell after a large gain can mean profit-taking; several skilled traders selling before other evidence weakens is a different pattern.

### Social media

Broad mood and mention counts have weak support as durable return forecasts. A [comprehensive out-of-sample study](https://doi.org/10.1016/j.physa.2022.127379) of major cryptocurrencies found that attention and volume worked in the historical fit but failed later tests. MCII’s own six-day attention study also found no reliable short lead from raw attention to price. These results do not prove social data is useless. They change its job.

Named-person posts and exceptional viral posts should be discrete events. A [study of about 36,000 tweets from 180 crypto influencers](https://link.springer.com/article/10.1007/s11142-024-09838-4) found an average 1.83 percent same-day rise, with larger initial moves in smaller coins, followed by average losses from days two through thirty. An [event study of 47 Elon Musk crypto tweets](https://doi.org/10.1016/j.techfore.2022.122112) found much of the reaction within minutes and prices beginning to decline after roughly an hour on average. This supports fast event detection, not a standing positive social score.

MCII should keep the exact post, author, time, coin identity, reach, repeated wording, likely automation, and the market move before and after the post. Raw reach and bot-adjusted reach should both remain visible. Coordinated promotion is adverse evidence, while authentic reach is evidence that attention changed; neither alone decides entry or exit.

### Market data

Market data tells the AI what traders are actually doing and whether an outside event is already reflected in price. For MCII’s purpose, the strongest fields are change over short and medium windows in price, trading intensity, signed buy-versus-sell flow, distinct buyers and sellers, volatility, holder concentration, liquidity removal, and disagreement across venues. Raw 24-hour totals are much less useful because they combine old and new activity and can be fabricated.

[Research on market crashes](https://doi.org/10.1371/journal.pone.0139356) connects weak buy-side liquidity and strongly negative order imbalance. [DEX research](https://arxiv.org/abs/2102.07001) shows that wash trading often consists of circular activity that leaves the linked group’s net position almost unchanged. MCII should therefore show both gross activity and net position change after known linked or circular wallets are discounted. The existing same-wallet and common-funder checks are useful but incomplete because multi-wallet cycles can escape them.

The rug filter stays separate and absolute. This report does not use ordinary sellability as a signal or a reason to reject an entry.

### News and real-world events

News should be stored as event types, not positive or negative headlines. A [BIS study of 151 regulatory events](https://www.bis.org/publ/qtrpdf/r_qt1809f.htm) found that legal-status decisions, trading restrictions, tailored frameworks, warnings, and central-bank announcements produced different responses; generic warnings were often insignificant. Other news research finds that same-day relationships are much stronger than later forecasting.

Each event needs the first primary source, publication time, first time MCII saw it, event type, affected entity, whether it is genuinely new, and independent confirmation. Repeated copies are one event, not several votes. A token-name match remains unconfirmed until a person or a reliable identity link establishes that it refers to the same coin. The AI should explain the economic or narrative connection and also state when the connection is merely a shared name or story.

## How the AI and human should work together

A [2024 review](https://www.nature.com/articles/s41562-024-02024-1) combined 106 controlled studies with 370 measured comparisons. Human and AI teams performed better than humans alone on average, but worse than the better of the human or AI working alone. Explanations and confidence displays did not reliably fix this. A successful partnership therefore needs a process that can reveal when each side adds value.

MCII should use the following sequence for every testable decision:

1. Freeze the evidence packet at the decision time. Later information must never enter it.
2. Connal records an initial choice and short reason before seeing the AI analysis.
3. The AI reads the same raw packet and produces its analysis independently.
4. The AI shows facts first, then its interpretation, the strongest opposing interpretation, missing information, and the next observation that would change its view.
5. Connal records the final choice and whether the AI changed it.
6. The outcome record later scores the initial human view, AI view, and final joint view separately.

This order prevents the AI from simply repeating Connal’s view and lets the project measure whether AI changes help or hurt. Experiments show that people can overweight algorithmic advice, and that fluent explanations do not reliably tell people when an answer is correct. A recent finance experiment found that merely naming an asset made language models more confident without improving hourly directional accuracy. MCII should therefore make the AI’s first pattern-reading pass without the ticker, project story, or current holding status where possible. A second pass can add identity and verified context. Differences between the two passes are themselves useful evidence of narrative influence.

## The evidence packet

Every triggered analysis should contain raw values plus changes from the coin’s own recent history. It should never contain a precomputed combined score as the main input.

The packet should include:

- the exact decision time and the age of every item;
- price and trading changes over several windows, with gross and net flow;
- FOMO actions in time order, with each trader’s forward-only record available separately;
- social posts in time order, including named-person posts, unusual reach, distinct credible authors, and coordination warnings;
- verified news events, earliest source, novelty, and corrections;
- the rug-filter result and the facts behind it;
- what was unavailable or late;
- the previous MCII analysis for comparison, clearly marked as a prior view rather than new evidence.

The AI output should answer a fixed set of questions:

- What changed first?
- Which evidence is independent, and which may be the same event echoed across sources?
- What supports an early move, a late chase, continued strength, exhaustion, or reversal?
- What is the strongest contrary reading?
- What entry or exit window is being discussed?
- What observation would change the reading?
- What is unknown?

The AI may use plain evidence bands such as weak, mixed, and strong. It should not invent a numerical confidence until its own past calls show what those numbers mean.

## Entry and exit analysis

The AI should analyze patterns rather than apply a single rule. Possible entry interpretations include informed actors moving before broader attention, a verified new event followed by early market confirmation, or authentic attention rising before price fully responds. Possible late-entry warnings include price moving before every outside signal, many copied stories, clustered promotion, followed traders arriving after the move, or rising attention with weakening net buying.

Exit analysis should compare the current evidence with the entry thesis. Useful changes include the expected event failing to produce continued response, the original actor group reversing, buying becoming concentrated while broader participation weakens, social reach continuing while net demand fades, adverse news, or a timed thesis expiring. The AI should not invent one permanent exit formula for every coin. It should state which original claim is failing and why.

## The test that can prove the system helps

MCII needs prospective comparisons, not stories fitted after a winner or loser is known. Each version should be frozen for a test window. Every material prompt, interpretation rule, and data treatment counts as a tested version. Changes happen between windows and remain in a trial log.

Four outputs should be recorded for the same frozen evidence packet:

- a simple market-only comparison;
- Connal’s initial judgment;
- the AI’s independent judgment;
- Connal’s final judgment after reading the AI analysis.

The main question is whether the final joint judgment improves on Connal alone. Secondary questions are whether AI alone adds useful information, which data source changes decisions, and whether those changes help. Run source-removal tests on stored packets: repeat the AI analysis without FOMO, social, market, or news data. This is the cleanest way to learn the added value of each source without pretending it works alone.

Entry and exit calls need a stated time window before the outcome. Score directional accuracy, the return reached before the view changed, worst move against the call, time to useful movement, and whether the final human decision improved or worsened the initial one. Report results by coin, market state, event type, source, and trader; pooled results can hide that a method works only on one coin or one person. Repeated readings from the same coin are not independent and should not be counted as if they were separate experiments.

Fifty resolved calls is enough for the first honest review, not proof of a lasting advantage. The stronger test is a later untouched period using the frozen method. Multiple tested prompt or rule variations raise the evidence needed to believe the best-looking one. [Survivorship research on 3,904 cryptocurrencies](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4287573) found that excluding dead assets inflated equal-weighted annual performance by 62.19 percent, so the record must include coins and traders that later disappear.

## Recommended build order

1. Replace the current vote-based combined entry result as the main analysis with the fixed evidence packet and written AI analysis. Keep existing votes visible only as old experimental features.
2. Build the independent-human then AI then final-human recording flow in the existing coin view.
3. Change FOMO storage from raw counts toward a forward-only record per trader, with timing relative to price and other traders.
4. Present social and news as timed events, preserving novelty, copies, identity certainty, reach, and coordination.
5. Improve market inputs from 24-hour totals to multiple timed changes, distinct participation, and gross-versus-net flow after manipulation checks.
6. Start the four-way prospective comparison and source-removal tests before adding more sources or changing the AI prompt.

## What is supported and what remains unproven

Supported: social and influencer activity can coincide with sharp short-lived moves; broad sentiment often fails later forecasting tests; popular-trader performance need not persist; news types and timing matter; raw crypto volume is often manipulated; AI can process high-dimensional financial information; human and AI teams do not automatically beat their stronger member.

Unproven: that MCII’s chosen FOMO traders have repeatable foresight; that its current social feed arrives before useful moves; that an AI can select entries or exits from these exact data at this trading horizon; and that Connal’s final decisions improve after seeing the AI. The proposed record is designed to answer those questions without changing the idea into a score-based system.

## Sources

- Vaccaro, Almaatouq and Malone. When combinations of humans and AI are useful. Nature Human Behaviour, 2024. https://www.nature.com/articles/s41562-024-02024-1
- Cao, Jiang, Wang and Yang. From Man vs Machine to Man plus Machine. NBER Working Paper 28800, 2021. https://www.nber.org/papers/w28800
- Wang. Confidence Without Competence. MIT working paper, 2026. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6896281
- Ganum and Atashbar. How Effectively Can Current LLMs Analyze Macrofinancial Issues. IMF Working Paper 2026 035. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6341799
- Kim, Lee and Kang. Out of sample forecasting of cryptocurrency returns. Physica A, 2022. https://doi.org/10.1016/j.physa.2022.127379
- Merkley, Pacelli, Piorkowski and Williams. Crypto influencers. Review of Accounting Studies, 2024. https://link.springer.com/article/10.1007/s11142-024-09838-4
- Ante. How Elon Musk's Twitter activity moves cryptocurrency markets. Technological Forecasting and Social Change, 2023. https://doi.org/10.1016/j.techfore.2022.122112
- Rill and coauthors. Wisdom of the crowd signals. Electronic Markets, 2025. https://link.springer.com/article/10.1007/s12525-025-00815-6
- Mirtaheri and coauthors. Identifying and Analyzing Cryptocurrency Manipulations in Social Media, 2019. https://arxiv.org/abs/1902.03110
- Qureshi and Zaman. Social media engagement and cryptocurrency performance. PLOS ONE, 2023. https://doi.org/10.1371/journal.pone.0284501
- Fiszeder, Orzeszko and Pietrzyk. News sentiment analysis using ChatGPT for Bitcoin price dynamics. Journal of Big Data, 2026. https://link.springer.com/article/10.1186/s40537-026-01392-x
- Auer and Claessens. Regulating cryptocurrencies assessing market reactions. BIS, 2018. https://www.bis.org/publ/qtrpdf/r_qt1809f.htm
- Broihanne and coauthors. When popularity strikes. Finance Research Letters, 2026. https://doi.org/10.1016/j.frl.2026.110481
- Coval, Hirshleifer and Shumway. Can Individual Investors Beat the Market. Review of Asset Pricing Studies, 2021. https://doi.org/10.1093/rapstu/raab017
- Donier and Bouchaud. Why Do Markets Crash. PLOS ONE, 2015. https://doi.org/10.1371/journal.pone.0139356
- Victor and Weintraud. Detecting and Quantifying Wash Trading on Decentralized Cryptocurrency Exchanges. WWW, 2021. https://arxiv.org/abs/2102.07001
- Cong, Li, Tang and Yang. Crypto Wash Trading. Management Science, 2023. https://www.nber.org/papers/w30783
- Ammann, Burdorf, Liebi and Stoeckl. Survivorship and Delisting Bias in Cryptocurrency Markets, 2022. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4287573
- Bailey and Lopez de Prado. The Deflated Sharpe Ratio. Journal of Portfolio Management, 2014. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2460551

## Research record

Discovery covered academic and primary evidence for social signals, named influencers, news event studies, market microstructure, DEX manipulation, trader-skill persistence, crypto survivorship, human and AI decision making, and financial language-model limits. Follow-up checks focused on the highest-impact claims and contradictions. Research stopped when every part of the proposed method had direct evidence or an explicit limitation, and further searches were returning variations of the same findings rather than changing the design.
