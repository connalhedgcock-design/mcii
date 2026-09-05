# MCII — handoff for a fresh session

Paste this into a new chat to pick up where the last one left off. Written for Claude, but a
human can read it. Rewritten 2026-09-05 — the previous version was from 09-01 and most of section
4, 8 and 9 below were wrong by the time this was written. Read the vault, not memory of an old copy
of this file, if the two ever disagree.

---

## 1. Read the vault first

**Real memory lives in the Obsidian vault at the repo root, not in this file.** This is a summary;
the vault is the source, and it is written in shorthand FOR Claude — do not "clean it up" into prose.

Start at **`00-INDEX.md`** — it carries the legend and the load order. Then, in order:
`10-CTX/mandate.md` (non-negotiable posture) → `10-CTX/ops.md` (who the operators are, how to talk
to Connal) → `10-CTX/constraints.md` (budget/legal) → `70-AREAS/mcii-overview/OVERVIEW.md` (what
the app actually is, as-built — trust this over `20-SPEC/`, which is the 08-23 pre-build plan and
disagrees with reality in several places) → `50-LOG/decisions.md` (run `./check-decisions.sh` —
every decision that needs code is checked against the real codebase automatically; do not
hand-count decisions, the file grows constantly).

**Two standing project-wide instructions, both learned the hard way, both apply to every session:**
- Run `git log --oneline -15` before auditing or proposing anything. A full social-collection audit
  was once run against a state Austin had already rebuilt hours earlier — files were read
  correctly, commits were not. Two people in one folder means "I read the files" ≠ "I know what
  changed." (`00-INDEX.md`)
- Run `./check-decisions.sh` before starting new work. It greps the codebase for a `proof:` marker
  on every decision that needs code and reports any locked-but-unbuilt row. A locked decision with
  no code is worse than an open question — the vault reads as though it exists. (D-116)

---

## 2. What this is

A desktop app for two friends — **Connal** and **Austin** — who got into memecoins with no finance
background. **Peter** helped write the original brief and returns later; he is technical, they are
not. **Display name is "CII"** as of D-118 (the internal storage name is still `mcii` — see the
warning in `app/package.json`, do not "fix" that mismatch, it is load-bearing).

Three questions the app answers about any coin: can this rug me (mint/freeze/LP authority), how
much could I actually sell (simulated against real pool depth, not market cap), and what's
changing (price/liquidity/holders/social, recorded over time). **No wallet or exchange keys, no
trade execution, ever (D-08) — permanent.**

**What changed since the last handoff (09-01 → 09-05), because it is a lot:**
- Social collection was rebuilt around measured output, not intuition, twice — see
  `70-AREAS/social-collection/` (README + LOG). Two tracks over one purchase (strict `emerging`
  signal + a kept bulk record), credibility-weighted head-counting, coordination detection.
- **A real, previously-silent bug**: the twice-hourly cadence (D-98's move off GitHub Actions) was
  costing ~3x its designed budget because two places in `cloud-collect.js` still assumed an hourly
  trigger. Fixed. Check spend any time with `./spend.sh`.
- **`CLOUDFLARE_KV_TOKEN` was never actually loaded** — this project has no dotenv, so a real key
  sitting in `app/.env` was silently unread, meaning the Telegram position-alert push
  (`alerts-push.js`) likely never worked on this machine. Fixed with a tiny built-in loader in
  `index.js` (no new dependency). Still needs Connal to put a real Cloudflare token in `app/.env`.
- **Wallet tracking exists now**, on-chain, free: `app/main/adapters/walletflow.js` reads who
  bought/sold a coin straight from Solana transaction data (`preTokenBalances`/`postTokenBalances`
  diffing — deliberately NOT parsing pump.fun/Raydium/PumpSwap instructions, which differ and
  would be a silent-wrong-parsing risk). Query by the coin's MINT, not one specific pool address —
  measured live, pool-address queries only caught ~10-28% of real activity, the mint catches 40-72%.
- **FOMO's own trade notifications are read directly off this Mac**, with Connal's informed,
  explicit consent to a standing Full Disk Access grant (`app/main/adapters/fomonotifications.js`).
  Reads ONLY `app_id` for `family.fomo.app` — never widen that without asking again. This is how
  his 58 followed traders' real buy/sell activity reaches the app. Local-only: stops the moment
  this Mac sleeps, same laptop-dependency the collector itself solved by moving to a host, with no
  equivalent fix available here.
- **A real coin-picking algorithm exists**: `app/shared/admission.js` — gates before an equal vote
  (a safety FAIL or followed-traders-net-selling rejects outright; market agreeing with itself is
  NEVER enough alone, needs a second independent sensor). Wired into `index.js: runDiscovery()`,
  polls FOMO signals every 10 minutes, auto-adds a coin to the real watchlist on admit using the
  exact same code path a human clicking "add" uses. Tested against real data the night it was
  built — correctly rejected two coins followed traders were selling, correctly rejected a coin
  with 13 genuine buyers for lacking independent confirmation (that coin crashed −92% within the
  hour — the reject was right).
- **Two honest backtests exist**, both concluding "not enough data to trust yet," both real
  findings not failures: `app/tools/backtest-walkforward.js` (market-only proxy rule, n=11, lost
  money — the walk-forward MECHANISM is proven correct, the rule is not) and
  `app/tools/backtest-social-signals.py` (56 social-feature-vs-price tests; 14 looked significant
  pooled across coins, ALL 14 flipped direction when checked per-coin — a live demonstration of
  why `20-SPEC/scoring.md`'s "never compare across coins" rule exists).
- **`geckoterminal.js` is now chain-aware** (was hardcoded to Solana). Also found a real gap while
  fixing it: an entire chain DexScreener calls "robinhood" has no historical price data anywhere,
  free or paid — not a code problem, a data-availability wall.
- **!! THE DOGE-1 CHECK — read before anyone builds a "real-world catalyst" feature.** The Solana
  coin Connal holds called `DOGE-1 Satellite` is NOT the real Dogecoin-funded Geometric Energy
  Corporation lunar mission — it is an unaffiliated memecoin (created 2025-08-12) that borrowed the
  name; confirmed via its own meme-branded socials and independent reporting stating no official
  endorsement exists. It DID jump +200% in Nov 2025 on pure speculative reaction to an Elon post
  about the real mission — so news-about-the-real-thing genuinely moves this coin, just via
  narrative, never via any actual financial stake. See `60-KB/news-catalyst-research.md`. Told to
  Connal directly; he is holding it knowingly, informed of the real mechanism.
- Research files worth reading before extending the analysis further, all in `60-KB/`:
  `signal-architecture-research.md`, `watchlist-admission-research.md`, `market-signal-research.md`,
  `social-signal-backtest.md`, `news-catalyst-research.md`.

---

## 3. How to behave — this matters more than the code

Connal asked explicitly, repeatedly, for no yes-man and for plain language. Full mandate in
`10-CTX/mandate.md`, full jargon-avoidance rules in `10-CTX/ops.md`. The short version:

- **Every claim needs a falsifier and a confidence number.** Bear case before bull case.
- **Never say buy / sell / allocate.** Synthesise; humans decide. Reporting a move (up or down) IS
  analysis; recommending an action is not — D-95/D-96 draw that line and it is a fine one.
- **Never invent facts about a token or event.** The DOGE-1 check above is what happens when this
  rule is actually followed — check before assuming a coin's story is what it claims to be.
- **Plain language, short, no tables in chat, at most one heading.** He has asked more than three
  times. Detail goes in vault files, never the chat reply.
- **Simplify the delivery, never the analysis.** The rigour is what protects the money.
- **Decide once**, per `mandate.md`'s decision hygiene section — weigh, decide, log it, move on.
- **Test before claiming something works.** This project's single most repeated failure shape is a
  silent thing that looks exactly like a working thing (D-55, D-60, D-85, and the KV-token bug
  above). Verify inside the running system; do not trust that reading the code is the same as
  running it.
- **Check `git log` and `./check-decisions.sh` before proposing anything**, per section 1 above.

---

## 4. Open items, honestly

1. Presentation is Austin's lane (D-89/w-006) and is genuinely behind the analysis layer — the
   admission algorithm's reasoning (`result.reasons`/`result.evidence`) has no UI panel yet, and
   new-admission phone pushes need a real Cloudflare token before they do anything at all.
2. The wash-trading / funding-link filter for wallet tracking is designed
   (`80-WHISPERS/whale-tracking/README.md`) but not built — nothing from `walletflow.js` should
   reach a screen or notification before it exists.
3. Discovery today runs on ONE signal source (FOMO). Social-side discovery
   (`resolve.js: unknownTickers()/identify()`) is a real second candidate source, computed and
   displayed, never wired to admission — deliberately sequenced, not forgotten.
4. The pump-duration-after-a-big-post measurement (how long a window exists to act after a famous
   account posts) is newly unblocked now that an always-on host and the FOMO reader both exist —
   worth a session of its own, not built yet.
5. `data/watchlist.json` currently tracks coins beyond what Connal said he actually holds
   (check the file — it changes) — worth a periodic "is this list still what you want" check.
6. Austin's own machine — nothing in this handoff has been verified working there.
