---
id: task.board
t: task-board
v: 5
upd: 2026-09-05
machine: connal
derived: true
---
# BOARD — everything, both people, worst first

!! DERIVED FILE. regenerated from `connal.md` + `austin.md`. ! on a merge conflict do not
hand-resolve — delete both sides and regenerate. see [[90-TASKS/README]].

## P0 · MONEY — real money at risk right now
_none._ ✓

## P1 · SILENTLY WRONG — showing something false, and nobody would notice
- [ ] T-039 @connal · 3 test files fail and were never flagged before (`history`/`importance`/
      `sweep`.test.js) — confirmed pre-existing, not newly broken. `sweep.test.js` looks like the
      same stale-fixture shape as T-018 · why: an unexplained red trains you to ignore red.
- [ ] T-037 @connal · `candidates.jsonl` can record an impossible price (STONK logged $269.64 for
      one reading inside a smooth ~$0.02 series, same shape as D-117's stablecoin bug on a
      different path) · why: anything reading that file's price field can be fed a fake
      +1,449,410% move and act on it as real.
- [ ] T-018 @connal · two alert tests have been failing since the $1,000 cutoff (D-114)
      · why: the fixture still checks a $10,000→$5,000 move, both above the new cutoff, so the
      alert correctly stays silent and the test calls that a failure — a suite that always shows
      red trains you to ignore red, which is how a real break gets through.
- [ ] T-011 @connal · CHECKED 09-05: "emerging" signal shows a real 62% hit rate (n=21 resolved),
      but a real entry-timing bias risk is unfixed and only the biggest win is spot-checked
      · why: promising, not yet trustworthy — needs the live labelled-outcome record's clean n
      before sizing anything on it (`[[60-KB/emerging-signal-backtest]]`).
- [ ] T-001 @connal · measure how often the liquidity alerter gets rate-limited and skips a check
      · why: DexScreener returns 429 to Cloudflare's shared addresses while the same request works
      from a laptop (D-94). a blocked check looks identical to a quiet market — the alerter would
      appear healthy while watching nothing.

## P2 · BLOCKED — someone can't proceed
- [ ] T-032 @unclear (connal + austin) · Elon/Trump tracker — Connal's X account is suspended, so
      Austin is following/enabling notifications on his own account instead, which moves where the
      mechanism has to run: Austin's Mac, not Connal's. See T-036 below — needs his own explicit
      Full Disk Access consent before anything reads his notifications.
- [ ] T-036 @austin · say yes/no to granting Full Disk Access on your own Mac so this project can
      read Elon/Trump notifications locally once you've set up following + notifications on your X
      account · why: the notification-reading trick only works on the machine whose browser is
      actually logged into that account — that's your Mac now, not Connal's, and his earlier
      consent for his own machine doesn't cover yours.
- [ ] T-027 @connal · IN PROGRESS · separate hype-burst social posts from real-world-story posts
      · why: the news half is built and already found a real lead (DOGE-1's rocket mission may be
      close to launching); the social-post half of the split still isn't built.
- [ ] T-002 @connal · create the Cloudflare API token so the app pushes holdings automatically
      · why: holdings are currently hand-seeded. a coin bought after today is invisible to the
      alerter — and the newest coin is the likeliest to rug.
- [ ] T-003 @austin · make `app/.env` actually load (no `dotenv` in the project today)
      · why: `alerts-push.js` reads a variable nothing populates. looks wired, silently no-ops.
- [ ] T-004 @austin · get `CLOUDFLARE_KV_TOKEN` onto Austin's machine
      · why: otherwise whichever machine last opened the portfolio decides what gets watched.
- [ ] T-017 @connal · work out what whale wallet tracking watches and what a move MEANS
      · why: largely answered — see `[[80-WHISPERS/whale-tracking/README]]`; still open: the
      out-of-sample persistence test (build order step 4) and deriving which wallets to follow.

## P3 · BUILD — real improvements, nothing broken
- [ ] T-005 @connal · the entry signal — what actually picks a coin to buy, and when to sell
      · why: the stated focus of the next session, and the piece the whole strategy waits on.
- [ ] T-006 @connal · define what counts as the strategy working, and against what baseline
      · why: the current bar can't be proven wrong, and profit in a rising market proves nothing.
- [ ] T-007 @connal · position sizing across the $100 paper budget — NO hard cap per Connal 09-05
      (D-120), sized by combined confidence instead · why: needs the actual mechanics worked out,
      not just the philosophy.
- [ ] T-008 @connal · promote organically-discussed tickers into actual tracking
      · why: closes the documented discovery gap — today candidates are only new-or-already-popular.
- [ ] T-009 @both · chart history while both laptops are closed · why: no REAL overnight candle
      history yet. ✓ partial fallback built 09-05 (`shared/chartfallback.js`, honestly labelled
      synthetic) — real full candles still need the app/collector-side build, Connal's call on scope.
- [ ] T-038 @austin · show `admission.js`'s new `tier` (red/yellow/green) as a yellow indicator
      with its reason wherever a coin's status is shown — right now yellow-tier coins (real
      evidence, not enough yet) are invisible even though the data exists.
- [ ] T-016 @connal · the combined system: whale moves + social + market numbers, scored together
      · why: D-117 requires a real surface — see T-020, the concrete app-side half of this. ! Connal
      09-05 wants this to go further: ANY sensor firing should trigger re-analysis of ALL of them
      for that coin, ranked by score, not a one-shot admit/reject — real design work, not done yet.
- [ ] T-020 @austin · a real screen showing why the algorithm admitted or rejected a coin
      · why: `admission.js` already returns the reasons; D-117 requires this reach a screen and it
      doesn't yet — an improvement nobody can see is indistinguishable from one never made.
- [ ] T-021 @austin · show wash-trade flags wherever wallet activity reaches a screen
      · why: some wallet "buying" is manufactured (self-trades, linked wallets) — a raw count would
      show fake interest as if it were real.
- [ ] T-025 @austin · a dedicated screen for the wallet tracker itself, not flags bolted onto
      other views · why: real wallet data exists (`walletflow.js` + `washtrade.js`) with nowhere to
      look at it.
- [ ] T-026 @austin · show the untracked-coin trend list on screen, labelled UNPROVEN, not a ranked
      leaderboard — Connal, 09-05: still valuable, wants more backtesting and a plain explanation
      of what statistic actually determines "trending" · why: a same-night walk-forward test found
      the ranking score does not reliably predict anything yet (`[[60-KB/trend-candidate-walkforward]]`).
- [ ] T-028 @austin · a screen for news — 3 kinds, kept separate, incl. a self-name candidate list
      that NEEDS A YES/NO CONTROL · why: real find already sitting in the data (DOGE-1's rocket
      mission may be close to launching) with nowhere to see it. ! WEAK/unconfirmed items must be
      shown YELLOW with a plain-language reason why (Connal, 09-05, D-119) — not hidden.
- ~~T-033~~ KILLED 09-05 — Connal: "this idea is dumb i dont want this." Wallet-derivation stopped.
- [ ] T-034 @connal · BUILT 09-05 (`shared/calendar.js`) — seeded with DOGE-1's sourced, flagged-
      as-estimate launch window · why still open: only one entry exists; Austin needs the screen.
- [ ] T-035 @connal · BUILT AND LIVE 09-05 (`app/main/pumpcapture.js`) — every real FOMO buy signal
      now starts a real 2h/90s price recording · why still open: n=0 until real signals fire while
      it's running.

## P4 · LATER
- [ ] T-010 @both · re-check the alert thresholds after the first real liquidity crash
      · why: proven end-to-end only against a crash I staged, never a real one.
- [ ] T-022 @austin · once the holders-vs-price read firms up with more data, show it on a coin's
      screen · why: real numbers exist now (`[[60-KB/trend-growth-analysis]]`) but it's one
      session's data on ~8 coins — not ready to trust on screen yet.
- [ ] T-023 @connal · re-check the trend-candidate score once more scan history exists, esp. for
      fone/OTC/STONK · why: walk-forward test 09-05 found the score doesn't predict anything yet —
      the 3 best-sampled coins scored ~zero, the "significant" ones were the least-sampled (the
      shape of noise). Answered for now: does not feed the algorithm.
- [ ] T-024 @connal · once the social record is much longer, check whether Twitter's own push
      behind a post lines up with coin growth · why: Connal's own idea, 09-05; today's sample is
      too short — the same night's 56-test social sweep showed how easily a short sample invents a
      fake pattern.
- [ ] T-029 @connal · decide whether real-time Elon/Trump post-tracking is worth new spend, as an
      ALTERNATIVE to the free browser-notification idea in T-032 if that doesn't pan out
      · why: it's a new query competing for the existing $24/mo social budget, not a free add-on.

## NEEDS A DECISION, NOT WORK → [[decisions]]
- trading frequency: Connal said yes to "a few times an hour", 09-05 — but that may answer a
  different question than D-20/D-36 asked (D-20/D-36 was about DISCOVERY speed on brand-new coins,
  not trade frequency on coins already tracked). Needs Connal to confirm which he meant before
  either rule gets written down as changed.

## STANDING
- `@both` and `@unclear` tasks need an owner agreed BEFORE work starts (D-89 — the lanes overlap,
  so silence gets read two different ways on two machines).
- Austin has not seen T-020/T-021/T-022/T-025/T-026/T-028/T-036/T-038 yet (added 09-05) — treat as
  proposed, not assigned, same as the rest of his section until he's seen it.
