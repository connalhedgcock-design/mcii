# MCII — handoff for a fresh session

Paste this into a new chat to pick up where the last one left off. Written for Claude, but a
human can read it.

---

## 1. Read the vault first

**Real memory lives in the Obsidian vault at the repo root, not in this file.** This is a summary;
the vault is the source.

Start at **`00-INDEX.md`** — it carries the shorthand legend and the load order. Then:

| File | What it holds |
|---|---|
| `10-CTX/mandate.md` | **Read before responding. Non-negotiable.** Role, posture, banned behaviours. |
| `10-CTX/ops.md` | Who the operators are and how to talk to them |
| `10-CTX/constraints.md` | Budget and machine limits |
| `30-GRILL/grill.md` | Every idea interrogated, with verdicts |
| `50-LOG/decisions.md` | **55 locked decisions.** Read before proposing anything. |
| `50-LOG/*.md` | Daily logs, including every mistake and why it happened |
| `20-SPEC/*.md` | Architecture, data sources, scoring, UI |

The vault is deliberately terse shorthand for Claude. Do not rewrite it into prose.

---

## 2. What this is

A desktop app for two friends — **Connal** and **Austin** — who got into memecoins with no finance
background and wanted something grounded rather than crypto-Twitter noise. **Peter** helped write
the original brief and will use it later; he is technical, they are not.

The app answers three questions about any Solana coin:

1. **Can this rug me?** — can anyone mint more, freeze your tokens, or pull the liquidity
2. **How much could I actually sell?** — simulated against real pools, not market cap
3. **What's changing?** — price, liquidity, holders, and X chatter, recorded over time

It holds **no wallet or exchange keys** and **cannot trade**. That is permanent (D-08).

---

## 3. How to behave — this matters more than the code

Connal asked explicitly, in caps, for no yes-man. The full mandate is in `10-CTX/mandate.md`.
The short version:

- **Every claim needs a falsifier and a confidence number.** Bear case before bull case.
- **Never say buy / sell / allocate.** Synthesise; humans decide.
- **Never invent facts about a token.** Hallucinated ticker facts cost real money.
- **Plain language, short.** He has asked twice. There is a banned-jargon list in `ops.md`
  (ground truth, on-chain, RPC, fallback, adapter, pipeline, z-score…). Lead with what it means
  for him, not what was built. Analogies work well.
- **Simplify the delivery, never the analysis.** The financial honesty is the part that protects
  their money.
- **Decide once.** He called out waffling on 2026-08-26. Weigh, decide, write it in
  `decisions.md`, state the reopen trigger, move on. Do not offer "slightly better variants" of
  settled calls.
- **During build work, no unsolicited market commentary** on their holdings (D-18). Analysis is a
  separate mode, on request.

---

## 4. What exists and runs

**Stack:** Electron, no framework, no build step. `cd ~/Documents/MCII/app && npm start`.
Node 26.7 via Homebrew. **103 tests** — `npm test`.

**Three tabs:**
- **Your coins** — watchlist, live prices every 15s, safety, sellable amount, charts, social panel
  with the 5 most-viewed posts
- **Market** — every coin the scanner finds, sorted by accumulation then persistence, **never by
  price change**
- **Journal** — per-person forecast log scored by Brier, positions written as vault markdown

**Supposed to run continuously — verify before believing it:**
- GitHub Actions, meant to be hourly — market, social, holder count from chain, full market scan.
  Commits results into `data/`. This is the part that is supposed to survive laptops sleeping.
  **As of 2026-08-28 it had never once fired on schedule** — 27 hours, 0 scheduled runs, every
  entry in the record came from a run someone started by hand. Cron moved from `:07` to `:37`;
  unproven. Check with `gh run list` before repeating the claim that this runs hourly.
- Local scanner daemon, every 5 min, stores every scan — dies when the laptop sleeps
- The app itself when open: 15s price polling, instant alerts

The app now shows how long the shared record has been quiet, at the top of every view. Green means
collection is alive; red means the history has a hole. That banner is the only trustworthy answer
to "is this running?" — see `50-LOG/2026-08-28c-cron-never-fired.md`.

**Repo:** `github.com/connalhedgcock-design/mcii` — **public**. It was made public on the theory
that private repos never fire scheduled jobs; that theory was wrong, since it still did not fire
once public. Austin has write access. Personal email scrubbed from history.

**Data sources, all free except one:**
DexScreener (price, liquidity, flow) · GeckoTerminal (price history) · RugCheck (safety) ·
Jupiter (sale simulation, holder count) · Solana RPC (holder ground truth) ·
**twitterapi.io ~$10/mo** — the only paid one, hard-capped at $12 in code.

---

## 5. Decisions most likely to be re-proposed by mistake

Full list in `50-LOG/decisions.md`. These are the ones a fresh session will trip over:

- **No Reddit.** Their Responsible Builder Policy prohibits non-commercial mining and ML training
  on their data. Not a rate-limit problem — a permission problem. Do not propose a workaround, and
  never use their public `.json` endpoints to route around a refused registration (D-10, D-11).
- **X is fine.** Their ban targets foundation-model training; a statistical model is not that, and
  we go through twitterapi.io rather than X's own API (D-22).
- **No TikTok or Instagram.** FYP reach is not sold by anyone at any price (grill G-04).
- **No sniping.** Millisecond entry is unwinnable from a laptop. The scanner deliberately skips
  anything under 2 hours old. Live monitoring is aimed at **exits**, not entries (D-20, D-36).
- **Model stays locked** until 50 resolved forecasts. Non-overridable in the UI (D-05).
- **Never rank the market view by price change** — that rebuilds a trending list (D-43).
- **Never blend two people's forecast scores** (D-46).
- **Git, not Postgres or Syncthing.** A database would still need something to run the collector
  (D-40).

---

## 6. Mistakes already made — do not repeat

Each of these cost real time. They are logged in full in `50-LOG/`.

**Errors masquerading as empty data — five separate times.**
GeckoTerminal returns rate-limit errors inside a normal-looking body. Querying the wrong Solana
token program returns zero accounts, which looks exactly like "nobody holds this." A parser that
reads an error as `0` is worse than one that crashes. Always check.

**A number was never defined, so two correct sources looked like they disagreed.**
RugCheck counts token *accounts* including empty ones; Jupiter counts wallets *holding a balance*.
CATE: 258,731 accounts, 116,155 holders. Both right. The app flagged them as contradictory because
"holders" was never defined anywhere. **Define the quantity before deciding sources conflict.**

**Adding a second instance breaks what the first assumed it was alone in — four times.**
Three processes sharing one rate limit. Two collectors each enforcing "the" $12 cap, permitting
$24. Two people sharing one accuracy score. Before adding any second instance of anything, ask
what the first assumed it was alone in.

**Alerts built on unvalidated data fired confidently and falsely.**
RugCheck's holder index reset; the app recorded a 97% drop as fact and warned that CATE was losing
holders. Guards now live in `shared/sanity.js`. **Liquidity is deliberately unguarded** — a rug
looks identical to a broken feed, and suppressing it would be the worse error.

**The accumulation signal was built on the broken number.**
It required holder growth, and during an index rebuild every coin appears to gain holders fast —
the exact shape of a crowd arriving. Only prices not being flat prevented a false signal. Now
computed from pool state instead. **Prefer data read directly from the thing being measured over
data derived by an index that must scan the world.**

**A collector with no display is indistinguishable from a broken one.**
The scanner ran for hours with nowhere to show results. Build the surface with the collector.

**Debugged a form for two rounds before reading the policy.**
Reddit's 500 error was a permission gate, not a bug. **Check whether something is disallowed
before debugging it as broken.**

---

## 7. Honest state of the analysis

Say this plainly if asked; do not oversell:

- **The safety gate is table stakes, not protection.** Pump.fun auto-revokes minting and freezing,
  so nearly everything passes. What actually killed coins in scans was **liquidity** — 38 of 60
  rejected because you couldn't get out. "Passed safety" ≠ "safe" (D-33).
- **Discovery is still momentum-biased.** Sources are trending and promoted feeds, so the market
  tab surfaces coins that already ran. Ranking no longer rewards that, but the universe still
  does. Unsolved.
- **No forecast has been logged yet.** The calibration record — the only evidence any of this
  reasoning works — is empty. It needs ~50 resolutions.
- **Both thesis files are empty.** No claim, no exit trigger written for either position.
- **The claim that social sentiment predicts price is half wrong** and was flagged as such on day
  one (grill G-01). This tool's real value is risk and discipline, not entry signals.

---

## 8. Open items

1. Position sizes never entered — the sellable-amount figure is abstract without them
2. Non-momentum discovery axis for the scanner
3. Local scanner still dies when the laptop sleeps; should move into the hourly cloud job
4. NEEGY's tone score is computed over posts almost nobody saw — consider showing reach beside tone
5. Austin has the app; nothing verified working on his machine yet

---

## 9. Facts about the two positions

Both are Solana, both pass every structural safety check, neither is a rug candidate.

| | CATE | NEEGY |
|---|---|---|
| Contract | `Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump` | `6oGuFDbEeaSzTcvrmmd2MqfNYwHKXFoN7regcR22pump` |
| Holders | ~116,000 | ~5,800 |
| Sellable before −5% | ~$135,000 | ~$3,700 |

NEEGY's name is slur-adjacent, which caps its buyer pool structurally — no major exchange listing
path, no mainstream amplification. That is a valuation input, not a moral comment, and it belongs
in any bear case (grill G-11).
