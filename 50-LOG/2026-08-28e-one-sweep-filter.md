---
id: log.20260828e
t: log
v: 1
prio: high
---
# 2026-08-28 ONE SWEEP + A FILTER. WATCHLIST NOW ACTUALLY REACHES THE CLOUD.

## OPERATOR ASK
"we need every coin on the watchlist, we need it scanning for anything related to memecoins and
you filter out what is important and whats not"

## !! THE BUG UNDERNEATH THE ASK — "every coin on the watchlist" WAS NOT POSSIBLE
- cloud-collect reads `data/watchlist.json`. **that file did not exist and nothing ever wrote it.**
  the collector had been falling back to two hardcoded coins since it was built.
- ∴ anything either of them added in the app was collected ONLY while that laptop was open and
  disappeared from the shared record when it closed.
- ! and it was silent in the worst way: a coin with no rows looks identical to a coin nobody talks about.
  same shape as the cron (nothing displayed its absence) and the holder index (a plausible zero).
  **seventh instance. absence of data must never be renderable as data.**
- ✓ app writes the file on add, on remove, and on startup. written as a UNION with what's already there
  ∴ austin's coins survive connal saving. removal is the one case that deletes, ∵ that's stated intent.

## THE ARCHITECTURE CHANGE — cost stops scaling with the watchlist
- yesterday I told him a 3rd coin breaks the $12 cap. that was true of the SHAPE, not of the problem.
  per-coin searching: cost = coins x queries x posts. 2 coins $8.64 | **3 coins $12.96 — over.**
- ✓ ONE broad sweep of memecoin chatter, then sorted afterwards. cost = queries x posts = **$6.48 flat,
  whatever they watch.** posts are attributed to whichever watchlist coins they name.
- ✓ leftover (~$5.50) is a POT DIVIDED across the watchlist, spread over the runs left in the month.
  2 coins > 20 extra posts each | 10 coins > 4 each. **depth divides, the bill does not.**
- ✓ a coin the sweep already covered gets no top-up at all ∴ the money goes to coins nobody mentioned.
- ! giving up depth is the correct trade: a breached cap stops collection entirely for everyone (D-28).
- ✓ the sweep now feeds BOTH the sector view and the per-coin rows. previous version fetched twice —
  I was buying the same chatter in the same run for two different screens.

## THE FILTER — shared/importance.js
ordering IS the opinion of the file:
1. about a coin they hold > HIGH. 2. a coin dying (rug/pulled liquidity/can't sell) > HIGH even if not theirs.
3. a coin the scanner passed, or talk about sector conditions > MED. 4. adverts, shotgun posts, bots > LOW.
- ! bad news about money already committed ranks above everything ∵ it is the least likely thing
  they'd seek out voluntarily. mandate: surface disconfirming evidence FIRST when they're in a position.
- ! a held coin inside a 5-ticker shotgun post is NOT attention — it's being used as a hashtag > LOW.
- ! an advert FOR a coin they hold still reaches them, labelled promotional. never hidden. (D-23)
- ! IT SORTS, IT DOES NOT DELETE. set-aside pile is stored, sampled on screen behind a fold, every item
  carrying its reason. ∵ a filter nobody can audit is one nobody can catch being wrong, and I wrote it. (D-26)
- promoShare (adverts+noise / total) is reported as a market reading, not housekeeping.
  a sector being sold to looks different from one being argued about.

## TESTS 140 > 175 (+24 importance, +11 sweep economics)
the economics are pinned by test: old shape breaks at 3 coins, new shape is flat, top-up divides.

## ! OPEN
- ticker attribution is by cashtag or address. a coin discussed by NAME only ("the cat one") is missed.
- sweep is 4 fixed searches. if memecoin talk moves to a term not in that list we see none of it. no detector for that.
- nothing yet warns when a coin has been on the watchlist for days with zero posts found.
