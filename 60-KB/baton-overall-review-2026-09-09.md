---
id: kb.baton-overall-review
t: research
v: 1
upd: 2026-09-09
machine: connal
---
# Baton — exact-address overall review

Mint: `Hg5Ja55T5wESq4vyFoiVCMeHXtGyVA69X2UHq8hgpump`, Solana, ticker/name baton. Research snapshot: September 9, 2026, 8:28 p.m. Eastern / September 10 00:28 UTC. No trade or price forecast.

## Assessment

est: High-risk speculative launch with substantial reported trading activity, but insufficient evidence to value it as a working community-rewards project. Conf 90% in that evidence classification, subjective and not a measured probability of loss or fraud. Falsifier: attributable documentation and working reward transactions tied to this exact mint, credible team/project history, and evidence of sustained independent use would change the classification. Lack of available evidence does not prove lack of a product.

Bear case first: Under four hours of visible market history; project website fails; reward story unverified; linked-wallet groups flagged; large trading turnover relative to pool reserves. Bull case: substantial activity and thousands of reported holders; basic mint/freeze controls disabled; scanner reports main pool LP locked/burned. Those positives support tradability and remove certain technical hazards, not durable demand.

## Identity and project claims

fact: RugCheck identifies Pump.fun launch, rapidlaunch creation platform, creator `Fzz2amRoCCpEvxtwdurs8qLVLSdrd3dcraJVpNjE4rp4`. Current reported supply 998,787,862.444644 tokens, six decimals.

fact: Direct token metadata at https://m.rapidlaunch.io/m/LRzt7gxgX contains only the generic description “Created on https://rapidlaunch.io”; both social and website fields point to https://x.com/connortrenches/status/2097774013242052853 . DexScreener metadata instead lists https://mtscrypto.com as website. The latter returned an nginx 404 page. X could not be retrieved; public post mirror returned NOT_FOUND. Do not infer the post was deleted merely from these failures.

Unknown: responsible team, project origin story, actual rewards rules, eligibility, reward currency, funding, payout history, code or audit, official relationship to historical Baton Finance or Pump.fun's operator. No verified partnership, revenue claim or reward entitlement was found. Other Baton coins and TON's BTN are not evidence for this mint.

## Market at final snapshot

fact, DexScreener: principal PumpSwap BATON/PUMP pool created September 9 at 20:32:14 UTC, about 3h56m before snapshot. Price $0.001652; reported market cap $1,650,609. That valuation is not cash available to holders.

fact: main pool reports $15.16m turnover in its 24h field, but its life is under four hours. All returned pools sum to approximately $19.86m reported turnover and $231,355 total two-sided liquidity. Main pool holds $148,566 of that liquidity. Reported volume can include repeat trades, arbitrage, bots and possible manufactured activity; no wash-trade adjustment was performed. It is not $19.86m of net new money.

fact: final main-pool change +25.84% over five minutes, +3.54% over one hour. Earlier in this same review it showed $0.001487 and -15.83% over one hour. These rapidly moving snapshots are useful evidence of volatility, not a stable trend signal. Small pools show extreme/disagreeing percentage changes, so avoid using them for headline performance.

est: Exit depth is limited relative to turnover and valuation. Total liquidity includes Baton itself and assets on the other side; it is not all money available to sellers. Main pool's other asset is PUMP, not a dollar-stable coin, adding exposure to PUMP's dollar price. No executable sell quote or price-impact test was obtained; no safe position size is inferred.

## Token controls and ownership

fact, RugCheck report: mint authority absent; freeze authority absent; token metadata immutable; no transfer fee, permanent delegate, transfer hook or pause configuration reported. This reduces specific token-control risks. It does not establish safe economics or honest ownership. These are scanner-reported fields, not a separately completed chain audit.

fact: report gives risks=[], normalized score 1 and rugged=false. Its same response reports 17 graph-linked accounts across four transfer-linked networks. Therefore the low headline score must not be presented as a safety guarantee.

fact: reported holders 10,812. Largest listed non-pool holding 2.59%. The ten largest listed holdings after removing owners matching reported market addresses total approximately 16.04%; all 18 remaining listed holdings total 24.55%. Largest listed holder overall, 4.87%, is the main pool and must not be called a whale. Holder/account counts are not unique humans; wallet relationships outside scanner coverage remain unknown.

fact: the four linked networks list 4, 5, 4 and 4 accounts. Summed reported tokenAmount divided by supply is about 9.82%. This calculation describes scanner fields; current beneficial ownership, double-counting treatment and insider identity were not independently established. Transfer links alone do not prove common control, coordinated dumping or wrongdoing.

fact: creatorBalance reported zero. This does not establish that the creator sold everything, has no other wallets or cannot benefit elsewhere.

fact: scanner marks principal PumpSwap pool lpLockedPct=100 with current LP supply zero, consistent with burned LP. Do not extend that claim to every pool: its Meteora DLMM records have zero-valued LP fields, which do not establish a reliable lock status. Scanner lockerScanStatus is “none”; totalLPProviders=0 is not proof no providers exist. Likewise “totalStableLiquidity” should not be quoted as stablecoin reserves because main quote assets are PUMP/SOL.

## Social evidence and saved MCII data

fact: exact-address public search surfaced repetitive price-promotion posts inviting readers into private Telegram groups. These are weak evidence of real community participation; promotional claimed highs were not accepted as historical prices. Primary linked X post remains unreadable. Community size, independent contributors and organic engagement are unverified.

fact: existing MCII log has four Story-room lookups reporting 33–34 X results under the name baton and ten headlines. It stores counts, not underlying article/post content, and explicitly marks these unconfirmed. Thus it cannot corroborate rewards or coin identity across same-name projects.

fact: saved Ubuntu signal log includes 17 wallet-buy events and three wallet-sell events for four tracked handles, plus one scan. These are internal observations with transaction IDs; transactions and identity mappings were not independently rechecked in this review. No trade amounts or complete balances are available in those event rows. Do not turn counts into net buying, endorsement or “smart money accumulation.”

## What matters next

1. Project proof: exact-mint official explanation and independently readable payout transactions.
2. Ownership proof: trace funding and transfers of flagged wallet groups; distinguish distribution from common control.
3. Market durability: repeated observations of non-pool holders, independent activity, usable sell depth and retained liquidity after initial attention cools.

Current conclusion: the technical checks are encouraging within their narrow scope, while the community-rewards investment story remains unsupported. No defensible return target or probability of price appreciation from this evidence.

## Sources and reproducibility

- Market API: https://api.dexscreener.com/latest/dex/tokens/Hg5Ja55T5wESq4vyFoiVCMeHXtGyVA69X2UHq8hgpump
- Market page: https://dexscreener.com/solana/Cb7ZRgPLhji3Th7htXyKEqbXvNjPpeTvckXuWakBUhXu
- Security/ownership API: https://api.rugcheck.xyz/v1/tokens/Hg5Ja55T5wESq4vyFoiVCMeHXtGyVA69X2UHq8hgpump/report
- Token metadata: https://m.rapidlaunch.io/m/LRzt7gxgX
- Promotional search evidence: https://mobile.twstalker.com/hashtag/%23MemeCoin (changing page; not independent verification).
- Frozen provider response: [[50-LOG/research/baton-2026-09-09-snapshot.json]]. retrievedAt refers to wrapper save time; RugCheck fetched a few minutes before final market refresh. detectedAt is initial scanner detection, not refresh time.
- Internal logs: `50-LOG/signals-Connals-Air.jsonl`, `50-LOG/signals-ubuntu-4gb-hel1-1.jsonl`.
- Earlier identity/comparison work: [[baton-participation-rewards-comparables-2026-09-09]].

No new project rule or trading decision. No code modified. Graphify exact-token query returned no nodes; established context and earlier ledger/Drive checks reused.
