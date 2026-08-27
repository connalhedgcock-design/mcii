---
id: spec
t: spec
v: 1
upd: 2026-08-23
prio: max
---
# SPEC — THE REPROMPT
this file replaces the operators' original brief. it is what I execute against. original intent preserved, contradictions resolved, undeliverables cut w/ reasons in [[grill]].

## PRODUCT (one sentence)
A local-first, cross-device Electron dashboard that fuses on-chain market data, cross-platform social attention, and news into per-token **risk** and **attention** scores — with a Claude sidebar that reads the same data the screen shows, and a forced-falsification journal that makes every position carry a written bear case and a pre-committed exit.

## WHAT IT IS NOT  ! guardrails, restate these in every planning turn
- not a trading bot. no order execution, no exchange keys, no wallet private keys, ever.
- not an alpha signal generator (see [[grill]] G-01). entry signals stay locked until the AUC gate is met.
- not financial advice. it synthesizes; humans decide.

## PRIMARY JOBS (ranked — build in this order)
1. **Don't get rugged.** hard safety gate on every token. this ships first ∵ it's the only feature with proven, immediate, measurable $ value.
2. **Know what you can actually exit.** liquidity-adjusted position value. the number nobody displays.
3. **See attention change, not attention level.** Δ and Δ² of engagement-weighted, bot-discounted mentions, z-scored against the token's own history.
4. **Force a falsifiable thesis.** thesis/antithesis/synthesis template gates every position.
5. **Score ourselves.** Brier-scored forecast log from day 1. the only honest evidence the process works.
6. **Calibration gym.** paper forecasts vs Kalshi/Polymarket implied probs. free, hard feedback.
7. *(gated, later)* proto-model correlating social features > forward returns. locked until n≥50.

## SUCCESS CRITERIA  ! measurable, not vibes
- S1: zero positions entered in a token with an active mint/freeze authority or unlocked LP. (target: 100%)
- S2: every open position has a written antithesis + pre-committed invalidation. (target: 100%)
- S3: ≥50 scored forecasts within 90 days; Brier trending down.
- S4: monthly infra spend ≤ $20. (see [[constraints]])
- S5: dashboard cold-loads in <2s and answers "am I safe / what can I exit / what changed" without a click.
- ! S6 (anti-goal): trade count per week does NOT rise after the dashboard ships. if it does, we built a slot machine.

## PHASES
- P0 setup: node, repo, postgres, syncthing, obsidian, keys. see 99-SETUP.
- P1 skeleton + SAFETY: electron shell, token watchlist, RugCheck+onchain gate, exitable-value calc. **usable on its own.**
- P2 market: dexscreener/geckoterminal price+OHLCV, TradingView widget, portfolio view.
- P3 social: X (twitterapi.io) + Reddit collectors > sentiment > HYPE scoring w/ reliability flags.
- P4 news + AI: RSS/news layer, Claude CLI sidebar w/ context packing.
- P5 journal + calibration: thesis templates surfaced in-app, forecast log, Brier dashboard, Kalshi/Polymarket board.
- P6 gated model: only if AUC gate passes.
! do not start P3 before P1 is used for real for 2 weeks. the safety layer is where the money is.

## AI ROLE IN-APP
- sidebar chat, context-packed w/ exactly what's on screen + provenance (source, fetch timestamp, staleness).
- ! every AI answer must render its data provenance. an AI claim about a token w/o a timestamped source is a bug, not an answer.
- runs via local **Claude Code CLI** subprocess (main process only) — $0 marginal, uses existing subscription.
- context assembled from the sidecar JSON snapshot, not from raw DB dumps. see [[arch]].
