---
id: log.20260828f
t: log
v: 1
prio: max
---
# 2026-08-28 IDENTIFYING WHICH COIN A POST IS ABOUT
## !! AND THE FINDING THAT CAME OUT OF IT: SIX SOLANA COINS USE THE TICKER "CATE"

## OPERATOR ASK
"develop a way to identify what coins they are talking about"

## SHIPPED — shared/resolve.js, confidence-tiered attribution
| tier | how | example |
|---|---|---|
| certain | full contract address | `Ai66LH...` (also handles `Ai66LH...ppump` shortened form) |
| strong | $CASHTAG matching a coin we know | `$CATE` |
| probable | bare ticker + trading context + not an ordinary word | `CATE chart looks weak, selling` |
| possible | project name | `apeonfone` |
- ! never returns a plain yes. every match carries HOW it was made; the caller sets its own floor.
- ! CONTEXT gate is load-bearing: their own scan record contains a coin called **fone**.
  "dropped my fone in the sink" must not become a sentiment reading. tested both directions.
- ! AMBIGUOUS_WORDS blocks tickers that are ordinary english (TOP, MOON, GAME...). bare-word only, $ overrides.
- ! two known coins sharing a ticker > BOTH returned, flagged. never pick the bigger one silently.
  same principle as D-50: an answer that looks confident and can't be checked later is worse than "unclear".

## unknownTickers() + identify() — turning talk into checkable coins
- a $TICKER used by >=3 DIFFERENT people that we've never seen > queued, looked up via dexscreener
  search (free), resolved to a real address + pool size + age.
- ∴ chatter becomes something the safety and exit checks can actually run against.
- ! refuses to resolve when two solana coins share the ticker with comparable liquidity. reports both.

## ! BUG I SHIPPED AND CAUGHT ON THE LIVE TEST (would have silently returned nothing, forever)
- identify() searched `$WIF`. dexscreener then returns tokens whose SYMBOL IS LITERALLY "$WIF" — a
  different token. live: 4 results, none of them the coin anyone means. WIF/BONK/CATE all resolved to nothing.
- ∴ **a wrong query returns a clean empty list that looks exactly like "nobody uses this ticker".**
  sixth time this project has hit "an error shaped like an empty result". searched bare now; test pins it.

## !! THE FINDING — THIS AFFECTS THEIR OWN MONEY
checked live 2026-08-28, dexscreener:
```
CATE  Catecoin              8xR7tEjV...  liq $248,347,633   <- not theirs
CATE  Catecoin (cate.meme)  89x86Bx9...  liq  $73,764,282   <- not theirs
CATE  Catecoin              Ai66LH...    liq   $2,001,249   <- THEIRS, 3rd of 6
CATE  CATE APE              6y6j2SQb...  liq   $1,477,202
CATE  CATE APE              7wMwuNXe...  liq   $1,432,737
CATE  Catecoin              6YCYaiuX...  liq      $60,333
```
- ∴ **a post saying "$CATE" is probably NOT about their coin.** theirs is third by pool size, behind
  one 124x larger.
- !! and queriesFor() has been searching `$CATE` since the social engine was built (08-26). every
  cashtag-sourced reading for CATE has been mixing in other coins' chatter. the tone, breadth and
  hype numbers for CATE are contaminated by an unknown amount. **I do not know how much.**
- ! NEEGY is clean — no other solana coin uses the ticker. its readings stand.
- ! this is not a market call and not commentary on the position (D-18). it is a defect in my
  measurement, which I have to report.

## FIX
- findContested() runs ~daily against the watchlist > data/ticker-collisions.json.
- a contested ticker DOWNGRADES a cashtag from `strong` to `possible`, kills bare-word matching, and
  kills name matching (the rivals are all literally called "Catecoin").
- ! the top-up search now uses ADDRESS ONLY for a contested ticker. a cashtag search there buys
  posts about somebody else's coin and files them under theirs.
- social rows carry `tickerShared` ∴ a later reader can see the reading was taken under that condition.
- UI: red line above the social numbers on the coin's own card, and a card on the sector tab.

## TESTS 179 > 211 (+32 resolve)

## ! OPEN
- **the contaminated history is still in the record.** not quarantined, ∵ unlike the holder-index
  reset I cannot tell WHICH rows are affected — the posts weren't stored before 08-28 (D-59 is new).
  ? options: mark all pre-08-28 CATE social rows `tickerShared:true` and exclude from baselines, or
  discard them. leaning exclude-not-delete, same as the holder quarantine. NOT DONE — needs a call.
- a coin referred to only by description ("the cat one") is still missed. no plan for that.
- the 4 sweep searches are fixed terms. if the conversation moves elsewhere we see none of it, silently.

## PART 2 — OPERATOR CALL: DELETE. DONE.
- I recommended exclude-not-delete (same as the holder quarantine, keep the receipt). **operator said delete.**
  stated once, executed. not re-litigated. (mandate: their call, log it, move on.)
- removed:
  - `data/social.jsonl` 8 rows > 4. **4 CATE readings gone.**
  - this machine's `<userData>/history/Ai66...social.jsonl` — **18 readings, file deleted.**
  - `Ai66...seen.json` — **131 remembered post ids cleared.** ∵ that memory was built from the same
    contaminated searches; leaving it would make a genuinely relevant post get skipped as "already counted".
- NEEGY untouched and verified: 4 shared + 20 local rows, 0 CATE rows remaining anywhere.
- ! the 4 shared rows survive in git history (they were committed). the 18 local ones do not. stated as fact, not as an argument.

## ! CHECKED BEFORE DELETING — that an empty history fails loud, not quiet
- hypeIndex > `null, "needs 20 live readings, has 0"`. breadthIndex > `null, "needs 10 readings, has 0"`.
- ∴ CATE's card reads "No social readings collected yet" + the red shared-ticker line. no fabricated zero.
- ! this was the actual risk of deleting and it is why I checked first: a wiped history that silently
  computes from n=0 would be worse than the contamination.

## REGRESSION GUARD
- test pins it: a contested ticker yields ADDRESS-ONLY queries, and no query may contain the cashtag.
  NEEGY still gets both. ∴ nothing can quietly reintroduce the query shape that caused this.
- TESTS 211 > 214.

## PART 3 — TELLING THEM APART IN CONVERSATION AND IN THE APP
- operator: "you need to be able to identify which cate im talking about, or any coin in general".
- ✓ NICK: he names a coin himself, stored on the shared watchlist ∴ unique to his list, and readable
  by any future session without comparing addresses by eye.
- ✓ last 4 chars of the address shown beside every coin name, on cards and in search results.
- ✓ search: coins he already holds are sorted FIRST and badged `yours`. ∵ searching "CATE" returns six
  and the largest is not his — picking by name is exactly how someone buys the copy.
- ✓ D-79 written: resolution order is nick > sym > address against data/watchlist.json, and ASK when
  a name is shared and not on the list. never resolve to the biggest match.
