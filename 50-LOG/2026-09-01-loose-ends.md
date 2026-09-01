---
id: log.2026-09-01.loose-ends
t: log
v: 1
upd: 2026-09-01
machine: connal
---
# LOOSE ENDS — things Connal asked for that are not built
!! Swept on his instruction ("check on loose ends in our files, find out things i have mentioned
that havent been built yet"). ! EVERY ROW VERIFIED AGAINST THE CODE TODAY, not carried over from a
note. Two items I expected to find open had in fact been built hours earlier; those are marked ✓
and left in as receipts.

## HIS OWN WORDS, STILL UNBUILT
| # | what he asked for | where it is recorded | state (checked in code) |
|---|---|---|---|
| L-1 | close the discovery loop — coins ≥3 real people name should get TRACKED, not just listed | w-002, `70-AREAS/trading-strategy/README` | **open.** `cloud-collect.js:449` writes `identified` into the sector row; nothing adds a watchlist entry. Only `main/index.js` (a human clicking) ever appends. → design now exists: [[60-KB/watchlist-admission-research]] |
| L-2 | notifications must carry the ANALYSIS, not just a number | **D-96, LOCKED** | **open.** `telegram-alerts/src/index.js` sends price, pool size, position value. No social read reaches the phone at all. |
| L-3 | report UPWARD moves on any tracked coin, held or not | **D-95, LOCKED** — he overruled me to get this | **open.** worker has `LIQ_DROP_PCT`/`PRICE_DROP_PCT` only, and iterates held positions only. No upward branch exists. |
| L-4 | "i need to build a good wallet/whale tracking technology" | w-004 | **open.** reading one wallet already works (`adapters/wallet.js`); which wallets and what a move MEANS are both unanswered. ! blocked by D-93 for anything always-on. |
| L-5 | "we need live chart data all the time even when offline" | 09-01 chat, parked by him | **open.** `fetchHistory` is called only by the desktop app while open. ! also the prerequisite for the famous-account-window measurement he asked for. The €4 host (D-98) makes this cheap now — it was impossible before. |
| L-6 | $100 paper-trading budget "split up into different coins" | `70-AREAS/trading-strategy/README` | **open.** the figure is real and stated; the split was never worked out — he was interrupted mid-sentence proposing it. |
| L-7 | the coin picker itself (entry/exit rules) | his stated focus for "the next chat", 08-31 | **open.** blocked on one unanswered question: does the algorithm read the LIVE app state or the SAVED record. Asked 3× today, not yet answered. |
| L-8 | measure how long the window is after a famous account posts | 09-01 chat, verbatim: "run the numbers when we are done with this project" | **open, and cannot be done retrospectively** — needs minute-level prices around a timestamped post, which nothing records. Depends on L-5. |

## OPEN IN THE FILES, NOT SAID BY HIM — worth his attention anyway
- **L-9 `?` nothing tells anyone when collection STOPS.** (`70-AREAS/collection-host/README`) The
  whole reason for the server move was that blackouts went unnoticed for days. Still unnoticed —
  the move reduced the frequency of silent failure, not its silence. ! the Telegram alerter already
  reaches their phones and could carry a staleness line. Cheapest real safety win on this list.
- **L-10 `?` Austin has no access to the collection host.** Single-person dependency on the one box
  that produces all the data.
- **L-11 `?` no off-server backup of `/etc/mcii.env`.** Recoverable from twitterapi.io, but know it
  before deleting anything.
- **L-12** the 09-01 analysis work (credibility weighting, coordination rings, raw-vs-weighted gap)
  reaches NEITHER screen. See this file's sibling entry, `70-AREAS/social-collection/LOG.md` §3.
- **L-13** junk tickers `fone`, `invest`, `ANTSEM` still in the record. D-72 predicted `fone` by name.

## ✓ CHECKED AND FOUND ALREADY DONE (receipts, so nobody re-opens them)
- ✓ storing per-post evidence rather than only summaries — `shared/postfacts.js` +
  `data/post-facts.jsonl`, built 09-01. This was my top-priority finding this morning and it was
  closed the same day.
- ✓ manipulation thresholds calibrated against a labelled sample rather than guessed (D-104..D-106).

## ! THE PATTERN WORTH NAMING
Six of the eight things in the first table are DELIVERY, not analysis: getting a result to a screen
or a phone. The analysis layer has been rebuilt repeatedly today; the two surfaces a human looks at
have not changed once. `est:` conf 85% — the binding constraint on this project is no longer what
it can compute, it is what it can show. ! that is Austin's lane under D-89/w-006, which makes L-2,
L-3 and L-12 a HANDOFF, not a backlog item for Connal.
