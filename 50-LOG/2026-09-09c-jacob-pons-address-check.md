---
id: log.jacob-pons-address-check-2026-09-09c
t: log
v: 1
upd: 2026-09-09
machine: connal
---
# JACOB / "Be like Jacob" — address-paste lookup, Pons/Robinhood Chain

Connal pasted `0x3df3644BCF4cE0d993E18C86c3080e53bFea06F1` in chat and asked for the coin + what
Pons is as a whole. No prior vault record of this specific coin. Robinhood Chain / Pons background
already covered in `[[robinhood-chain-research]]` (09-05) — this entry adds the specific coin and
one new systemic finding (the redirect pattern) that research didn't surface.

## fact: what the address resolves to
Via DexScreener API (`chainId: robinhood`, confirmed working per `[[robinhood-chain-research]]`):
- Name/symbol: "Be like Jacob" / JACOB. Market cap ≈ $3.19M, FDV same (fixed supply, all live).
- Primary pool liquidity: $145K. 24h volume: $13.5M — a ~93:1 volume-to-liquidity ratio.
- 25 separate trading pairs (fragmented across USDG and ETH pairs), 24h buys 28,796 / sells 26,296.
- Site listed on DexScreener: `belikejacobrbh.com`.

## fact: the redirect finding (new, systemic — worth remembering for other Pons coins)
`belikejacobrbh.com` 302-redirects to `https://pons-family.eu.com/launchpad/0x3df36...`. The real
Pons operator is Pons Labs, LLC, official launchpad domain `ponslaunchpad.com` (confirmed via
KuCoin/airdropalert/Decrypt coverage, and matches `[[robinhood-chain-research]]`'s own sourcing).
`pons-family.eu.com` is not that domain — it borrows the Pons name/branding on an unrelated TLD.
Did not proceed past the redirect (treated as a possible phishing/clone surface per this session's
untrusted-content rules). ∴ this specific coin's own promo link does not point at the real
launchpad. Whether that means the coin listing itself is fake, or just that a third party stood up
a copycat frontend for it, is unresolved — falsifier: fetching `ponslaunchpad.com`'s own listing
for this exact address and checking whether it shows the same token would settle it.

## est: risk reading
The 93:1 volume/liquidity ratio is high even for a memecoin — it means the tradable depth is a
small fraction of the money moving through it daily, so a real attempt to exit a meaningful
position would move price hard. conf 70% this is normal/expected wash-trade-heavy churn for a
brand-new Pons-launched coin rather than something specific to Jacob (Pons coins launch with thin
locked liquidity by design — `[[robinhood-chain-research]]`). Not itself proof of a scam.

## vibe / unknown — explicitly not fabricated
No independent press coverage of "Jacob"/"Be like Jacob" exists (checked, zero hits beyond the
generic Pons/PONS-token pieces). No holder-concentration or contract-verification data — Robinhood
Chain's explorer is Cloudflare-blocked to scripted access (`[[robinhood-chain-research]]`, unchanged).
Did not generate a backstory for "Jacob" — there isn't one to find yet.

## fact: what Pons (the platform/token) is, for context
Pons Labs' launchpad on Robinhood Chain (mainnet since 2026-07-13, ~12 days after chain launch):
deploy a fixed 1B-supply token + pool in one tx, no code, liquidity auto-locked. 1% trade fee, 70%
to token creator / 30% to Pons protocol; 80% of the protocol's cut buys PONS on the open market and
burns it. PONS itself (the platform's own token, separate from JACOB) is up roughly 180x from its
07-17 low, and the platform ranked among DeFiLlama's top-4 fee earners on 09-03 ($5.95M/day). This
is the same functional role pump.fun plays on Solana, now running on Robinhood's chain instead.

## SOURCES
- DexScreener API, `chainId=robinhood`, token `0x3df3644...` — live pull, this session.
- `belikejacobrbh.com` → 302 → `pons-family.eu.com` — live pull, this session.
- [Pons Launchpad — official site](https://www.ponslaunchpad.com/)
- [What Is PONS Token? — KuCoin](https://www.kucoin.com/blog/pons-token-robinhood-chain-pump-fun-rival)
- [What Is Pons? — Decrypt](https://decrypt.co/377349/pons-robinhood-chain-meme-coin-token-factory)
- [A memecoin making app becomes crypto's top fee generator — CoinDesk](https://www.coindesk.com/tech/2026/09/03/a-memecoin-making-app-becomes-crypto-s-top-fee-generators-as-robinhood-chain-activity-explodes)
- `[[robinhood-chain-research]]` (60-KB, 09-05) — chain background, reused not re-derived.
