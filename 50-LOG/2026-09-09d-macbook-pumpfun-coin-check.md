---
id: log.macbook-pumpfun-coin-check-2026-09-09d
t: log
v: 1
upd: 2026-09-09
machine: connal
---
# MACBOOK / "THE LAPTOP MACBOOK" — address-paste lookup, Solana pump.fun

Connal pasted `9ghc8N8BTtnsm6gjmVmcj5R85aPRu3BCUBz9zgXhpump` in chat, said it's "making me a lot of
money," asked for research ASAP — he is already in a position. Per mandate, disconfirming evidence
surfaced first. One prior vault record: `50-LOG/signals-Connals-Air.jsonl`, a `story-room`
narrative-lookup on the same address/name, no price captured at that time (id
`3f5c8020-a681-42d7-afe4-6540b173d0ef`), 7 headline hits under "THE LAPTOP MACBOOK", pump.fun
confirmed, not boosted. No decisions.md row on this coin.

## fact: live market data (DexScreener API, live pull this session)
- Name/symbol: "THE LAPTOP MACBOOK" / MACBOOK. Chain: Solana. DEX: PumpFun.
- Price: $0.00004076. Market cap / FDV: ~$40,765 (micro-cap — genuinely tiny).
- 24h volume: $16,498. 24h price change: +710%. 24h buys 178 / sells 86.
- Liquidity: $14,615 (from the rug-check pull, see below — DexScreener's own response didn't surface
  this field cleanly, cross-checked against the second source).
- Pair-created/age date returned by the fetch was internally contradictory (gave a 2025 date and
  "4 days old" in the same breath) — NOT trusted, flagged as unverified rather than stated as fact.

## fact: rug-check data (RugCheck API, live pull this session)
- Automated risk score: 1/10 ("minimal risk"), not independently validated by a human.
- Mint authority: revoked. Freeze authority: revoked. These two rug vectors (minting new supply,
  freezing your wallet) are closed off.
- LP: 100% locked, $14,615 locked value, no unlock mechanism found.
- Top holder: 20.09% of supply in one wallet. Top 5 holders: ~27.3% combined. 166 total holders.
- Creator balance: zero (creator is not sitting on an unsold allocation).

## ∴ what this means, conf ~65%
The two rug-pull mechanisms a rug-check score is best at catching (mint/freeze abuse, LP yank) are
closed off — that part of the "minimal risk" score is earned. But the score does not price the risk
that actually matters at a +710%-in-a-day, $40K-market-cap, 166-holder coin: one wallet holding a
fifth of the entire supply can simply sell into the open market. Against $14.6K of liquidity, that
wallet alone could move price hard, no rug mechanism required — normal selling would do it.

## falsifier
This reading is wrong if the top holder wallet's balance stays flat or shrinks gradually alongside
rising buy volume (distribution into demand, not a dump), or if holder count keeps climbing while
concentration falls. It's confirmed if top-holder balance drops sharply in one move without a matching
volume spike, or if 24h sell count starts overtaking buys.

## vibe / unknown — explicitly not fabricated
No independent news or project-info coverage found beyond the pump.fun listing and X chatter noted
in the prior signal record; genuine story behind "THE LAPTOP MACBOOK" is not established here — not
inventing one. Did not check wallet-level trade history for the top holder specifically (would need
Solscan/on-chain pull, not done this session).

## UPDATE, same day, 2nd pull — Connal reported it "got dumped but still fighting"
Fresh pulls confirm a real drop, but not the mechanism first flagged. Supersedes the falsifier
read above, doesn't reopen it.

### fact: it migrated off the pump.fun bonding curve to a PumpSwap AMM pool ~18 min before this check
Two pools now exist: the old PumpFun reference (stale, still showing the pre-migration +732% figure)
and the new PumpSwap pool, down **-45.85%** since it opened minutes ago. Live price $0.0000235,
down from the PumpFun peak reference of $0.00004186 — roughly a 44% pullback, consistent across both
sources. Liquidity now $11,482 (was $14,615), still **100% LP-locked**. Mint/freeze still revoked.

### fact: the top holder added, did not dump
Top wallet went from 20.09% (200.27M tokens) to **29.06%** (274.41M tokens) — bought more, not sold.
Total holder count rose 166 → 187 — net new buyers, not net exits. This means the original
falsifier condition ("top-holder balance drops sharply") did **not** fire — the drop is not that
wallet cashing out.

### ∴ revised read, conf ~60%
This is a bonding-curve "graduation dump": pump.fun coins that migrate to a real AMM pool very
often get hit hard in the first minutes/hours as earlier, smaller bonding-curve buyers take profit
into the newly-liquid market — a structural pattern for this launch mechanism, not a sign this
specific coin was targeted or that the big holder is exiting. "Still fighting" matches the data:
holder count climbing through the drop suggests demand is absorbing some of the sell pressure, not
that the dump is over.

### new falsifier (replaces the old one)
Confirmed bearish if price keeps making new lows over the next hour without holder count still
rising, or if the top holder's 29.06% position starts shrinking. Confirmed the worst has passed if
price stabilizes or recovers while holder count keeps climbing.

## FINAL, same day, 3rd pull — falsifier fired, "still fighting" read superseded
Price kept making new lows without holder growth holding up the earlier optimistic read — the
bearish branch of the last falsifier fired. Fresh pulls: price $0.00000208 (down ~91% from the
$0.0000235 checked last time), liquidity $2,074 (down from $11,482), PumpSwap pool selling
2-3x buy volume on every recent window (5m: 35 buys/104 sells; 1h: 111 buys/200 sells).
RugCheck's own `rugged` flag still reads **false** and LP still shows 100% locked — this was not a
classic dev-pulls-the-liquidity rug. It reads as a straight sell-off: far more sellers than buyers
hit a pool that only ever had ~$11-14K of depth, which is enough to crater price without anyone
needing to pull anything. Top-holder % jumped to 99.13% in this pull, almost certainly the AMM
pool's own token reserve being counted as a "holder" as sold tokens flowed back into it, not one
wallet acquiring the supply — noted as est, not independently confirmed. Net: functionally a rug
in outcome (Connal's practical experience), mechanically a liquidity-depth failure under heavy
selling rather than a malicious LP pull. conf 75%.

## SOURCES
- DexScreener API, token `9ghc8N8BTtnsm6gjmVmcj5R85aPRu3BCUBz9zgXhpump` — live pull, this session
  (first pull at initial check; second, cache-busted pull for this update).
- RugCheck API, same address — live pull, this session (same two-pass pattern).
- `50-LOG/signals-Connals-Air.jsonl` — prior narrative-lookup signal, same address, this vault.
