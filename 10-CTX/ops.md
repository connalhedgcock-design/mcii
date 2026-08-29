---
id: ctx.ops
t: ctx
v: 4
upd: 2026-08-29
prio: high
---
# OPERATORS

## connal — PRIMARY. machine A. the person I actually talk to.
- macOS arm64 / zsh / MacBook Air. node 26.7 + npm 11.19 @ /opt/homebrew. obsidian. build target.
- !! TECH LEVEL: LOW, AND I HAD THIS WRONG UNTIL 2026-08-26.
  the technical parts of the original brief (electron, sidecar json, monte carlo, api architecture) were typed by PETER on connal's machine. I calibrated to that voice for days. WRONG AUDIENCE.
- finance: little/none. cannot read charts. no valuation/market-structure background. (this part was accurate.)

## austin — machine B. money in. specs UNKNOWN (still blocking his install docs, not the build).
## peter — technical. helping + will use it. NOT present now, returns later. NO money in.
- ∴ 3 devices eventually, not 2. see [[sync]]. ∴ D-13 (only connal+austin capital) UNCHANGED.
- ∴ vault + spec staying technical is FINE — peter reads it later. the CHAT with connal is what must be plain.

## !! WORK SPLIT — set 2026-08-29, read before starting any task
Connal, verbatim: "me and austin came up with a new work split, i will be handling any issues with
the scanners effectiveness, handling the interpretation of the data we collect from the scanner,
writing any algorithms needed to analyze the data we collect, austin will be fixing issues within
the app and adding to the app itself so new roooms or features within the app will mostly go
through him."
- **Connal's lane**: whether the scanner actually finds/ranks the right coins, what the collected
  data MEANS, any new analysis/scoring algorithm.
- **Austin's lane**: the app itself — bugs in it, new rooms/features/UI, the Observatory, anything
  Electron/renderer-side that isn't about what the numbers mean.
- ! not a hard wall — the two overlap constantly in practice (a scanner bug often IS an app bug;
  an analysis change often needs a UI to show it). Read as: whose CALL it is when the two disagree
  or when it's unclear who asked for something, not as "refuse to touch the other's files." If a
  session on Austin's machine gets an analysis-shaped request, or a session with Connal gets asked
  for a new room, that's a decent moment to check who's actually driving that piece before
  building it — not a hard refusal.

## !! HOW I TALK TO CONNAL — non-negotiable
## ! REINFORCED 2026-08-28 — he asked AGAIN. I drifted back into jargon. this is now a standing failure of mine.
## !! THIRD ASK, SAME DAY, 2026-08-28. I did it again within hours of writing the line above.
##    what I actually sent: tables, headers, "contaminated", "regression guard", "query shape", "cashtag",
##    "contract address", "null", "n=0". four long replies in a row. HE HAD TO ASK A THIRD TIME.
##    ∴ this is not a preference I keep forgetting. it is a defect I keep re-introducing under the
##    pressure of having done a lot of work and wanting to show it. THE WORK IS NOT THE REPLY.
## - HARD SHAPE for every reply from now: a few sentences. no tables. at most one heading.
##   what it means for him > what changed > the one thing to do. detail goes to 50-LOG, never the chat.
## - test before sending: would I say this out loud to a friend with no coding or finance background?
##   if a sentence needs a second read, rewrite it. if the reply needs scrolling, it is too long.
- banned unless defined in the same sentence: ground truth | vendor index | RPC | fallback | graceful degradation
  | on-chain | adapter | pipeline | schema | throttle | quarantine | provenance | z-score | derivative
  | ADDED 08-28 (all used on him): contaminated | regression guard | query shape | cashtag | contract address
  | denominator | survivorship | lexicon | attribution | confidence tier | null | n=0 | sweep | funnel
- plain swaps that work: contract address > "the coin's long ID code" | cashtag > "the $NAME people type"
  | contaminated > "mixed up with other coins" | regression guard > "a check so it can't come back"
- lead with WHAT IT MEANS FOR HIM, never with what I built or how.
- shorter. a 400-word explanation is a failure even if every word is simple.
- analogy first when the idea is unfamiliar (bank accounts / customers worked well for the holder-count fix).
- ! if I catch myself writing a term I would not say out loud to a friend with no finance or coding background, cut it.
- ONE step at a time. checkpoint before the next. never a wall of commands.
- I check machine state MYSELF (bash) instead of asking him to run diagnostics and report back.
- when something breaks, I debug it. do not hand him a numbered troubleshooting list.
- plain name for a thing BEFORE the jargon term, first use, every time.
- ! evidence I got this wrong: the node install. gave him a 3-command wall; actual problem was one missing PATH line I could have detected in 2 seconds with a `ls /opt/homebrew/bin`. check first, instruct second.

## !! WHAT DOES *NOT* GET SIMPLIFIED
- the financial analysis. same rigour. the "undervalued doesn't apply" pushback, the retracted correlation claim, the base rates, the falsifiers.
- ∵ that layer is what protects their money. softening it to be friendlier makes it worthless. see [[mandate]].
- simplify the DELIVERY, never the CONTENT.

## !! WHICH COIN HE MEANS — never guess, 2026-08-28
- six solana coins are called CATE. his is 3rd by pool size. "CATE" in a sentence is AMBIGUOUS.
- ! resolution order, every time he names a coin: 1) `data/watchlist.json` — nick, then sym, then ca.
  that file is the shared list and is the authority on which coin is HIS. 2) if it is not there and
  the name is shared by several live coins, ASK. do not pick the biggest, do not pick the newest.
- ✓ coins now carry a NICK he sets himself + the last 4 chars of the address shown beside the name.
  a nick is unique to his list ∴ it is the safest thing for either of us to say out loud.
- ! in the app: search results put coins he already holds first and label them `yours`.
  ∵ searching a ticker returns the copies too, and the biggest result is usually not his.

## SHARED FAILURE MODES
- ! they will trust a number because it's on a dashboard > every score ships w/ reliability flag + n + fetch time.
- ! real risk isn't bad analysis, it's overtrading on noise > behavioural gates in [[ui]] are load-bearing, not decoration.
- they pattern-match to crypto-twitter framing ∵ it's their only prior. counter it actively.
