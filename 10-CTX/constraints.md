---
id: ctx.constraints
t: ctx
v: 2
upd: 2026-08-31
---
# CONSTRAINTS
## MONEY  ! HARD
- fact: free-first. total recurring spend cap = $30/mo ALL-IN. raised from $20 on 2026-08-31
  (D-90) — Connal, explicitly, to fund twice-hourly scanning: "i understand we will need more
  money and am okay with it." original cap was $20, stated 2026-08-23.
- ∴ any design requiring official X API, Grok Live Search, Reddit commercial, or paid Birdeye = DEAD ON ARRIVAL. see [[data-sources]] for the math.
- allocation as of 08-31: twitterapi.io ~$24 (X_MONTHLY_CAP_USD, `.github/workflows/collect.yml`)
  | apify overflow ~$5 | reserve ~$1 | everything else $0.
- ! LLM inference cost must be ~$0 marginal > route through the Claude Code CLI subscription they already pay for, NOT metered API keys. this is the single most important cost decision in the project.

## MACHINE
- ✓ RESOLVED 2026-08-23: node v26.7.0 + npm 11.19.0 via homebrew 6.0.18 at /opt/homebrew. machine A build-ready.
  ! root cause of the earlier 'not installed' reading: brew shellenv was never added to ~/.zshrc, so nothing was on PATH. fixed. remember this pattern — 'command not found' on a mac often means PATH, not missing.
- python 3.9.6 system-only. too old for modern tooling. need 3.11+ via uv/homebrew if python used.
- ? machine B (austin) unknown. blocking for [[sync]] design finalization.

## LEGAL / ToS  (not lawyer advice, but these are real project risks)
- dexscreener ToS: free API ok, prohibits building a *competing product*. personal dashboard = fine. do not redistribute.
- reddit API: free ONLY for non-commercial/personal. 100 QPM. ! self-serve app registration closed late-2025 > manual approval ticket required. apply early, it's a lead-time item.
- tiktok/instagram: no viable free public API for hashtag/FYP data. scraping breaches ToS + IP-ban risk. see [[grill]] G-04.
- ! never monetize this or take outside money without revisiting every ToS above. the free tiers evaporate the moment it's commercial.

## SCOPE GUARD
- ! this tool does NOT execute trades. no exchange keys, no wallet keys, ever, in this codebase. read-only, analysis-only.
- ∵ removes the entire class of catastrophic bug (a loop that drains a wallet) and removes most regulatory surface.
