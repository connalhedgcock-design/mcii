---
id: grill
t: grill
v: 1
upd: 2026-08-23
prio: max
---
# THE GRILL — every idea in this project, interrogated
format: CLAIM > verdict > why > what we do instead > what's still open
verdicts: ✓KEEP | ⚠MODIFY | X KILL | ?BLOCKED-ON-INFO

---
## G-01  "social sentiment predicts memecoin price"  ⚠MODIFY — this is the project's load-bearing assumption and it is half wrong
- what's wrong: by the time a coin is *trending* — FYP, front page, big-acct QT — the move is largely done. attention LEVEL is a lagging/coincident indicator, and it's the thing that's easiest to fake.
- what survives: the *second derivative* (Δ² attention) and *breadth* (unique authors, not post count) have a short, real, decaying edge — minutes to a few hours. we cannot reliably capture minutes-scale edge with free-tier polling. be honest about that.
- ∴ REFRAME, do not abandon: this tool's genuine edge is (a) RISK — spotting distribution/exit conditions, coordinated-shill detection, rug structure; (b) DISCIPLINE — forcing a written falsifiable thesis before money moves; (c) POST-HOC — measuring whether their own signals ever worked. it is NOT an alpha machine for entries. conf 80%.
- ! if we sell it internally as an entry-signal generator we will lose money and blame the code.
- falsifier: after 100+ logged signal>outcome pairs, if Δ²attention shows AUC>0.60 on 24h forward return, I'm wrong and entries become defensible. that is the bar. see [[scoring]] gate.

## G-02  "we'll build a proto-algorithm from our trade history"  ⚠MODIFY — correct instinct, fatal timeline
- ! with 2 positions and a few weeks of data, ANY correlation found is overfit noise. n<30 outcomes cannot distinguish skill from luck in an asset with this σ.
- worse: they'll find a pattern, believe it, and size up. this is the highest-expected-loss failure mode in the whole project.
- ✓ do instead: HARD GATE in code. the model emits NO probability output until n≥50 resolved predictions logged. before that it shows "INSUFFICIENT DATA (n=7/50)" and nothing else. non-overridable in UI.
- ✓ meanwhile: log predictions from day 1, score with Brier. free, and it's the only honest measure of whether the process works.

## G-03  "use groq for twitter, it has all of X"  X KILL (naming) + ⚠MODIFY (economics)
- fact: they mean **Grok** (xAI), not **Groq** (a chip/inference company — unrelated, no X data).
- fact: Grok Live Search bills ~$5/1k requests + ~$25/1k sources. at a $20/mo cap that's ~800 sources/MONTH. useless.
- ✓ do instead: **twitterapi.io** — 3rd-party X data at ~$0.00015/read (~$0.15/1k tweets), ~33x cheaper than official X API. $10/mo ≈ 66k tweets/mo ≈ 2.2k/day. that is a real budget.
- fact: official X API is now pay-per-use (~$0.005/read) for new devs; legacy $200 Basic closed. $20 = ~4k reads/mo = ~130/day. DEAD for our use.
- ! 3rd-party X providers are a dependency risk — they exist at X's sufferance and can vanish. abstract behind a provider interface, never call it directly from feature code.

## G-04  "track TikTok/Instagram FYP hits + interactions"  X KILL as specified — the data does not exist at our budget
- fact: TikTok Research API = gated to accredited academic institutions (US/EU), not open to us. TikTok Display API = your own account's content only.
- fact: Instagram Graph API killed public hashtag search for non-partners; you can read your own business account, not the ecosystem.
- fact: "how many posts are hitting For You Pages" is **not exposed by any API, at any price.** FYP reach is internal to TikTok. no vendor sells it. this requirement cannot be met as written by anyone.
- ⚠ nearest honest proxy: scrape *public post-level* engagement (views/likes/comments on posts matching a ticker) via Apify actors. Apify free plan ≈ $5/mo credit > a low-frequency trickle, maybe 1-2 pulls/day on a short watchlist. treat as a coarse weekly texture signal, NOT a live feed.
- ! ToS + IP-ban risk is real and sits with us. accept knowingly or drop these two platforms. my rec: **ship v1 without TikTok/IG.** X + Reddit + news + on-chain covers ~85% of the signal at ~0% of the legal and engineering pain. revisit at v2. conf 75%.

## G-05  "Syncthing for multiplayer + host failover"  ⚠MODIFY — right tool, wrong job for half the data
- ! Syncthing is eventually-consistent FILE sync. it has NO leader election, NO transactional merge, and it resolves conflicts by keeping BOTH copies (`.sync-conflict-*` files).
- !! putting SQLite (or any live DB) in a Syncthing folder is a well-known data-corruption pattern. two writers + file-level sync = shredded DB. NEVER do this.
- ✓ TIER THE STATE:
  - T1 vault / markdown / theses → **Syncthing.** text merges, conflicts are visible + harmless. this is what Syncthing is genuinely good at. KEEP.
  - T2 time-series + shared app state → **free cloud Postgres (Supabase or Neon free tier).** $0. one source of truth. solves "same information online" properly, which Syncthing structurally cannot.
  - T3 secrets → NEITHER. local `.env` + OS keychain. ! never let a key enter the vault or the sync folder.
- ✓ real failover = a `leader` row in Postgres w/ heartbeat: collector writes `last_beat` every 15s; if a follower sees `now-last_beat > 90s` it takes the lock and becomes leader. ~30 lines. this is the actual mechanism they were reaching for with "transfer hosting."
- ✓ "what if BOTH are offline" — neither machine collects, and the gap is permanent (you can't backfill social data). fix: **GitHub Actions cron** as always-on baseline collector. private repo = 2,000 free min/mo > every 30 min ≈ 1,440 min/mo, fits free. local machines layer faster polling on top when awake.
- ? "transfer emulation" — undefined term. I read it as "hand off the collector role." if they mean running machine A's *environment* on machine B, that's a different (much harder, unnecessary) problem. NEEDS ANSWER.

## G-06  "ground it in Hegelian logic"  ⚠MODIFY — keep the discipline, drop the metaphysics
- straight: Hegelian dialectic is not a forecasting method and there's no mechanism by which thesis/antithesis/synthesis prices an asset. if we pretend otherwise we've built the exact grifter-epistemics they said they hate.
- ✓ what IS worth keeping — operationalize it as a forced-falsification protocol, which is real and well-evidenced (Tetlock/Superforecasting, red-teaming, Bayesian updating):
  - THESIS: the claim + the mechanism + conf%
  - ANTITHESIS: the strongest bear case written by ME, not them, + the specific *observable* that would confirm it
  - SYNTHESIS: not a conviction — a **position size** and an **exit trigger**. the contradiction resolves into risk allocation, not certainty.
- ✓ enforced as a required template: no position may be logged without all 3 fields. see [[_tpl-thesis]].
- ∴ the value is the mandatory adversarial step. call it what it is; don't dress it up. conf 90%.

## G-07  "monte carlo like Kalshi for accurate predictions"  ⚠MODIFY — MC on unknown distributions is precise garbage
- ! MC requires a distribution. a 3-week-old memecoin has no estimable return distribution — the tails ARE the distribution, and the biggest one (goes to zero overnight) isn't in the sample yet.
- X do not use MC to forecast price/upside. it will produce confident nonsense.
- ✓ DO use MC for **risk**, bootstrapped from the coin's own realized 1m/5m returns: "given this token's own observed volatility, P(down ≥50% within 7d) = X%." that's defensible and it's the number they actually need.
- ✓ ALWAYS show the absorbing state separately: P(liquidity pulled) is a structural/rug question, not a volatility question. see [[scoring]] RUG gate.

## G-08  "expand into Kalshi / Polymarket"  ✓KEEP — and promote it, for a reason they didn't intend
- fact: both have free, no-auth public read APIs. $0.
- ! the real value here is not portfolio diversification, it's **calibration training**. prediction markets resolve to a hard yes/no on a known date. that is the only cheap environment where they can find out if their reasoning is any good — memecoins never give clean feedback ∵ luck dominates over any short sample.
- ✓ STRONG REC: run prediction markets as a *paper* calibration gym first. log 50 forecasts, score Brier vs the market's implied prob. if they can't beat the market's price on questions they care about, that's decisive evidence about the memecoin theses too — and it cost $0 to learn.
- ⚠ Kalshi = CFTC-regulated, US-legal, KYC. Polymarket = onchain, different legal posture by jurisdiction. ! they must check their own state/eligibility. not my call and not something I should hand-wave.

## G-09  "parse Coinbase / TradingView / FOMO app"  ⚠MODIFY — one of these three is not like the others
- coinbase: ✓ free public spot price API, fine. but ! coinbase does not list the tokens they actually hold. it covers majors only. useful for BTC/SOL context (the beta they're actually exposed to), useless for CATE/NEEGY.
- tradingview: ! no free data API. their ToS forbids scraping the feed. ✓ legitimate free path = embed the TradingView **widget** (free, sanctioned) for charting UI. we get charts, we do not get data. accept that split.
- "FOMO app": ? ambiguous — multiple products use this name. NEEDS ANSWER: exact app + URL. not going to guess and build against the wrong thing.

## G-10  "toddler-simple but looks like a space station"  ⚠MODIFY — these fight, and there's a right answer
- tension: space-station density = many numbers = the exact cognitive overload that makes novices trade on the flashiest number.
- ✓ resolve via **progressive disclosure + one verdict per screen**: L1 = a single plain-English verdict sentence + a color. L2 = the 3 numbers behind it. L3 = raw data. sci-fi treatment goes into *chrome* (typography, glow, motion, layout), never into *quantity of numbers on L1*.
- ! anti-slop rule: no purple-blue gradient, no glassmorphism-everywhere, no emoji as UI. dark instrument-panel palette, one accent, real data density where earned. cool comes from restraint + motion, not decoration.

## G-11  "CATE + NEEGY, want to diversify"  ?BLOCKED + ⚠concentration
- ! I do not know these tokens and will not pretend to. NEEDS: exact contract addresses + chain. ticker names are non-unique and impersonation tokens are the single most common way people buy the wrong asset. no analysis until I have the CA.
- ⚠ structural: two microcap memecoins is not a portfolio, it's one bet on the same factor (retail risk appetite). they correlate ~1 in a drawdown. "diversifying" into a 3rd memecoin does not reduce risk — it adds names, not diversification. conf 85%.
- ⚠ NEEGY specifically: if the name reads as slur-adjacent to a listing committee or a mainstream KOL, that imposes a hard ceiling — CEXes won't list it, large accounts won't touch it, and it caps the buyer pool structurally. that's a valuation input, not a moral comment. flag it, size accordingly.
- ✓ real diversification, if they want it inside crypto: it comes from *different risk factors* — majors (BTC/SOL beta), a yield/stable leg, and prediction markets (which resolve on real-world events, genuinely uncorrelated to crypto beta). that's the honest answer to their question.

## G-12  Electron  ✓KEEP with eyes open
- heavier + more RAM than Tauri, but: mature, huge docs surface, trivial local-process spawn (needed for Claude CLI integration), and they asked for it. novice-friendliness wins over binary size here.
- ! blocked: no node/npm installed. see [[constraints]].
- ! security posture is not optional in a finance app: contextIsolation ON, nodeIntegration OFF, sandbox ON, strict CSP, all network + key access in main process only. renderer never touches a secret.

---
## OPEN-Q  ! operators must answer before code starts
1. CATE + NEEGY: contract address + chain for each?
2. "FOMO app": which one exactly (link)?
3. "transfer emulation" — collector-role handoff, or something more?
4. austin's machine: OS + arch?
5. current position sizes + cost basis? (needed for any risk math; can be % of stack if they'd rather not state $)
6. ship v1 WITHOUT tiktok/ig (my rec), or accept the ToS/ban risk to include them?
7. is anyone else's money in this? (changes the ToS answer from personal>commercial and changes my whole posture)
