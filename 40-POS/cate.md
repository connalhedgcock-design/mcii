---
id: pos.cate
t: pos
v: 2
upd: 2026-08-23
status: SAFETY-PASS / size-unknown
ca: Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump
chain: solana
venue: bought via fomo.family (non-custodial)
---
# CATE / Catecoin
## SAFETY GATE — PASS  @rugcheck+dexscreener 2026-08-23
mint_auth: revoked | freeze_auth: revoked | metadata_mutable: false | rugged: false | risks_flagged: none
holders: 221,218 | top1: 2.79% | top8: ~12% | insiders_flagged: 0
! lpLockedPct = null on all pools ∵ pump_fun_amm handles liq at protocol level, not a lockable LP token. EXPECTED, not a flag. status = unverified, not failed.

## MARKET @2026-08-23
mcap $29.99M | price $0.0311 | pool_age 28d
liq: pumpswap $1.49M + meteora $892k + meteora $360k = ~$2.7M | quote-side total ~$1.70M
vol24h $31.3M (turnover >1x mcap)
chg: 1h -12.81% | 6h -11.75% | **24h -42.44%** — still falling at time of read
txns24h: buys 75,736 / sells 54,422

## ! SIGNAL — DISTRIBUTION PATTERN
- buy TXNS exceed sell txns 1.39:1 while price -42% ∴ avg sell size >> avg buy size.
- ∴ larger holders exiting into small retail bids. conf 65% (one snapshot, no order-flow detail).
- falsifier: if next 72h shows price recovery on same txn mix, this read was wrong. also check whether one whale exit explains it vs broad selling — needs holder-delta tracking we don't have yet.

## EXITABLE (est) ~$20-50k @5% slip
- method: constant-product approx on quote reserves, 5% impact ≈ 2.6% of reserve. ! meteora pools are DLMM/concentrated — approximation understates near-price, overstates far-price depth.
- ! replace with jupiter quote sim. this is the spec'd feature. see [[scoring]] B.

## UPDATE 2026-08-24 — see [[2026-08-24-cate-pump]]
$0.06848 | mcap $66.0M | 24h +80.94% (79% of it in 6h) | liq $4.34M | pools 30
flow inverted to accumulation. exitability materially improved. realized 48h range: -42% then +81%.

## OPEN
- ? position size — BLOCKING for any risk math
