---
id: log.decisions
t: log
v: 2
upd: 2026-08-23
prio: high
---
# DECISION LEDGER — LOCKED
!! rule: a decision here is CLOSED. I do not re-open it, re-litigate it, or offer alternatives to it.
!! the ONLY thing that re-opens a row is its own listed trigger firing. if a trigger fires: reweigh ONCE, write a new row, move the old to SUPERSEDED w/ what changed. never drift.
!! offering a "slightly better variant" of a locked decision = the exact failure this ledger exists to prevent.

| # | decision | locked | reopen ONLY if |
|---|---|---|---|
| D-02 | X data via twitterapi.io. not official X API, not Grok | 08-23 | provider dies/degrades, or budget cap lifts |
| D-03 | v1 ships WITHOUT tiktok + instagram | 08-23 | a compliant affordable source appears, or operators accept ToS/ban risk in writing |

| D-05 | proto-model hard-locked until n>=50 resolved forecasts | 08-23 | ! nothing. n>=50 IS the trigger. this row protects real money. |
| D-06 | electron. contextIsolation on / nodeIntegration off / sandbox on | 08-23 | blocking platform issue |
| D-07 | LLM work routes through claude CLI subscription, not metered API | 08-23 | CLI bridge proves technically unworkable |
| D-08 | no trade execution. no wallet or exchange keys. ever. | 08-23 | ! never. permanent. |
| D-10 | ! NEVER bypass a denied/blocked API registration via public unauth endpoints (reddit .json etc) | 08-23 | ! never. permanent. a closed door is an answer, not an obstacle. |
| D-11 | **REDDIT OUT.** dropped from the build entirely. X is the sole social source for v1. | 08-23 | reddit grants express written approval covering BOTH data access AND model training. not expected. |
| D-12 | ! verify X / twitterapi.io terms permit training a model on collected posts, BEFORE building the proto-model. blocks the model, not v1. | 08-23 | resolved either way |

| D-21 | NO deployer-history build. operators use J7Tracker manually for it. | 08-26 | they notice they aren't actually checking it, OR a free indexed API for wallet>launches appears |

## SUPERSEDED  (never delete — the reasoning is the value)
- **D-04** postgres for timeseries + syncthing for markdown. > superseded by D-40 (2026-08-27).
  trigger: building it. postgres is storage but not compute — GHA was needed regardless, making postgres a second service for no gain.
  and syncthing requires simultaneous connections, which two people who trade at different hours will rarely have.
  ! lesson: I designed the sync layer on day one from first principles and it survived four days before contact with the actual runner requirement.
- **D-34** don't schedule the screener until discovery is fixed. > superseded by D-37 next day.
  trigger: realised the dependency ran the other way. a growth rate needs two observations, so storage must come FIRST.
  ! lesson: I blocked a build on a prerequisite that was actually downstream of it. check direction of dependency before gating work.
- **D-01** reddit app description, strict wording. > dead with D-11. never submitted; registration was closed, not failing.
  ! keep the lesson: 3 revisions of one form field before locking it. cause of the DECISION HYGIENE rule in [[mandate]].
- **D-09** reddit timeboxed 2 wks. > superseded same day by D-11.
  trigger: read the actual Responsible Builder Policy instead of inferring from the error. the 500 was a policy gate, not a bug, and the policy prohibits the use case rather than merely gating registration.
  ! lesson: I diagnosed a 500 as an engineering fault through two rounds of debugging when it was a policy answer. READ THE POLICY BEFORE DEBUGGING THE FORM. cheap check, skipped it.
| D-13 | operators confirmed: ONLY connal + austin money. no outside capital. > personal/non-commercial posture stands for all ToS. | 08-23 | outside money enters. then re-verify EVERY free-tier licence. |
| D-14 | build P1 on connal's machine ONLY. local, single-user, no sync, no cloud db. sync/multiplayer deferred to P2. | 08-26 | P1 done and in real use |
| D-15 | ! chat delivery to connal = plain + one step at a time + I self-check machine state. analysis rigour UNCHANGED. | 08-26 | ! never relax the analysis half. |
| D-16 | app is token-agnostic: user-managed watchlist, search by name, add by address. no hardcoded tokens. | 08-26 | ! never revert. operator was explicit. |
| D-17 | market-wide screening needs a FUNNEL (cheap bulk filter > expensive per-token sim). universe def unresolved. | 08-26 | design settled at P2 |
| D-18 | during build work: build + report. NO unsolicited market commentary on holdings. analysis is a separate mode, on request. | 08-26 | operator asks for analysis |
| D-19 | history = append-only JSONL per token, not sqlite. crash costs one line; no native deps; portable. | 08-26 | file size becomes a real problem |
| D-20 | no J7Tracker integration. no public API + it's a sniping tool for a game retail cannot win. | 08-26 | they ship a documented public API AND we want that data |

| D-22 | X/twitterapi.io CLEARED for our use. their ban targets foundation-model training; ours is a statistical model, and we never touch X's own API. store aggregates anyway. | 08-26 | X or twitterapi.io changes terms |
| D-23 | sentiment and manipulation are SEPARATE signals. promotional language ("100x","dont miss out") is a manipulation marker, never folded into sentiment. | 08-26 | ! never merge them |
| D-24 | reliability distinguishes THIN (wait) from MANIPULATED (bad news). never collapse into one "unreliable". | 08-26 | ! never collapse |
| D-25 | engagement measured as RATE (interactions/views), not raw counts. reach w/o reaction is a manipulation marker. | 08-26 | — |
| D-26 | off-topic posts are PARTITIONED and reasoned, never silently dropped. noiseRatio is itself signal. | 08-26 | — |
| D-27 | NO social backfill. sampled windows can't produce the author census breadthIndex needs; the count would scale with spend, not reality. | 08-26 | a real historical/firehose endpoint becomes available in budget |
| D-28 | collector cadence is set by budget (40min ≈ $8.60/mo), never by preference. exhausting the cap stops collection entirely. | 08-26 | budget changes |
| D-29 | a failed fetch NEVER writes a row. failure != zero. applies to every collector, forever. | 08-26 | ! never |
| D-30 | social buckets measure NEW posts (persistent seen-set), with the full snapshot recorded alongside. | 08-26 | — |
| D-31 | any reading from a full page is flagged `truncated` — a floor, not a count. | 08-26 | pagination implemented |
| D-32 | screener is a FUNNEL: bulk-cheap > safety > expensive-per-token. skips <2h old by design; not a sniper. | 08-26 | — |
| D-33 | ! "passed safety" must never be presented as "safe". pump.fun auto-revokes authorities so the gate is table stakes; the history/alerts layer is the real protection. | 08-26 | ! never oversell the gate |

| D-35 | live tiering: 15s market / change-triggered exit sim / 10min safety / 5min history write. never write history at poll rate. | 08-26 | — |
| D-36 | live monitoring is aimed at EXIT speed, not ENTRY speed. never market it as being-first. | 08-26 | ! never |
| D-37 | scanner scheduled 5min + EVERY scan stored. supersedes D-34: storage is a prerequisite for non-lagging discovery, not blocked by it. | 08-27 | — |
| D-38 | "accumulating" = holders+liq growing while price flat. ranks on arrivals-per-price-move. a token that already ran must score ZERO. | 08-27 | ! never rank on price change |
| D-39 | ! background processes die on sleep and announce nothing. need supervision or off-laptop collection. | 08-27 | P2 cloud collector lands |
| D-40 | git repo (GitHub) is the shared store AND the runner. no postgres, no syncthing. supersedes D-04. | 08-27 | volume outgrows git, or concurrent writers appear |
| D-41 | cloud cron hourly. cadence set by GHA free minutes; exhausting them stops collection entirely. | 08-27 | repo made public (unlimited minutes) or budget changes |
| D-42 | exactly ONE social collector may run. cloud is it; local is superseded. per-process budget guards do not compose. | 08-27 | cloud collector disabled |
| D-43 | market view sorts by accumulation then persistence. NEVER by price change — that rebuilds a trending list. | 08-27 | ! never |
| D-44 | theses are markdown in 40-POS/, forecasts JSONL in 50-LOG/. both in the repo ∴ shared + readable without the app. | 08-27 | — |
| D-45 | calibration verdict must be blunt. n<50 = "too few"; brier>0.25 = "no demonstrated edge". no softening words. tested. | 08-27 | ! never soften |
| D-46 | forecasts are per-person files. a blended Brier describes neither forecaster and must never be produced. | 08-28 | ! never blend |
| D-47 | identity is local-only, never synced. each machine knows who sits at it. | 08-28 | — |
| D-48 | ! every external number needs a plausibility guard AND a second source. one vendor is never truth. | 08-28 | ! permanent |
| D-49 | ! liquidity deltas are NEVER suppressed by sanity guards. a rug looks like a broken feed; always err toward showing it. | 08-28 | ! never |
| D-50 | disagreeing sources are shown as disagreeing, never averaged. averaging a broken value yields a less-obviously-wrong one. | 08-28 | ! never average |
| D-51 | accumulation signal runs on pool state (liquidity, buy/sell flow), never on holder counts. holder growth is advisory only. | 08-28 | a holder source proves stable across months |
| D-52 | prefer directly-read data (pool reserves) over index-derived data (wallet counts). indexes re-scan silently. | 08-28 | ! design principle |
| D-53 | "holders" = wallets with a NON-ZERO balance. token accounts are a different quantity and never displayed as holders. | 08-28 | ! definition is fixed |
| D-54 | jupiter holderCount is the live source (0.14% verified). ground truth from chain runs daily to confirm it still deserves trust. | 08-28 | drift exceeds 10% |
| D-55 | ! auto-detect the token program before any on-chain query. guessing returns an empty result that looks like a real zero. | 08-28 | ! permanent |
| D-56 | on-chain holder truth runs hourly. RPC rejection = no data point, never a fallback recorded as truth. | 08-28 | RPC blocks us persistently; then a keyed free tier |
| D-57 | a holder SURGE is MED not good news — airdrops and wash distribution look identical to buying. | 08-28 | ! never frame a surge as demand |
| D-58 | ! explanations to connal must be plainer AND shorter. banned-jargon list in [[ops]]. he has asked twice; treat a third as a serious failure. | 08-28 | ! never relax. analysis rigour is untouched — simplify DELIVERY only. |
| D-59 | store + show the 5 most-seen posts with every reading. a score you cannot check an example against is unverifiable. | 08-28 | — |
| D-60 | ! the shared record's AGE is displayed in the app at all times. a collector whose age nothing shows is indistinguishable from a broken one — fifth instance. | 08-28 | ! permanent |
| D-61 | github's scheduler is treated as best-effort, NEVER as a guarantee. D-40/D-41 stand, but "it survives sleeping laptops" is only claimable while the staleness display is green. | 08-28 | cron proves reliable over 2 weeks, or collection moves to a trigger we control |
| D-62 | sector view answers "what kind of market is this", never "what should I get into". tickers rank by DISTINCT PEOPLE; coins list newest-first, never by price move. | 08-28 | ! never — this is D-43 applied to the new screen |
| D-63 | ! any rate computed from the scan record must state what its denominator EXCLUDES. survivors-only storage made a "survival rate" read 100%. | 08-28 | ! permanent |
| D-64 | per-coin social collection outranks the sector read for budget. sector stops below a $2 reserve. | 08-28 | budget changes |
| D-65 | ! the watchlist is not free: each coin costs ~$4.32/mo in social collection. a 3rd coin breaks the $12 cap. must be surfaced before anyone adds one. | 08-28 | cap or cadence changes |
| D-66 | ! the app WRITES data/watchlist.json into the repo. the cloud collector had been running on two hardcoded coins ∵ nothing ever wrote that file. union on save, so one machine never deletes the other's coins. | 08-28 | — |
| D-67 | X collection is ONE broad sweep, sorted afterwards — never one search per coin. cost must not scale with the watchlist. | 08-28 | a per-coin source becomes free |
| D-68 | leftover budget is a pot DIVIDED across the watchlist. adding a coin costs depth, never money. supersedes D-65's framing. | 08-28 | budget changes |
| D-69 | ! the filter sorts, it never deletes. what was set aside is stored with its reason and shown behind a fold. | 08-28 | ! permanent |
| D-70 | ! bad news about a coin they hold outranks everything on every screen, including their own coin's good news. | 08-28 | ! never |

## SUPERSEDED (cont.)
- **D-65** watchlist not free, 3rd coin breaks the cap. > superseded by D-67/D-68 same day.
  trigger: the operator asked for every coin covered, which forced the question of why cost scaled at all.
  ! lesson: I reported a constraint as a fact when it was a property of MY design. before telling them
  something cannot be afforded, check whether the shape causing the cost is load-bearing. it was not.
| D-71 | coin attribution is CONFIDENCE-TIERED: address=certain, cashtag=strong, bare ticker+context=probable, name=possible. never a plain yes. | 08-28 | — |
| D-72 | ! a bare ticker only matches inside a post about trading, and never if it is an ordinary english word. their scan record contains a coin called "fone". | 08-28 | ! permanent |
| D-73 | ! where several coins share a ticker, a cashtag stops being evidence. address-only searching, downgraded confidence, and it is stated on screen. CATE is 3rd of 6. | 08-28 | ! permanent |
| D-74 | a ticker >=3 different people used that we do not know is looked up and resolved to a real address. chatter that cannot be tied to a coin is not actionable. | 08-28 | — |
| D-75 | ! identify() searches the BARE ticker. searching "$X" returns coins whose symbol is literally "$X" and yields a clean empty list — an error shaped like an answer. | 08-28 | ! permanent |
| D-76 | CATE's 22 contaminated social readings DELETED (4 shared + 18 local + 131 seen-ids), on operator instruction. I recommended quarantine; overruled; executed. | 08-28 | — |
| D-77 | ! before deleting any history, verify the empty case fails loud. a wiped record that computes from n=0 is worse than the bad data it replaced. checked: both indexes return null with a reason. | 08-28 | ! permanent |
| D-78 | ! THIRD ask for plainer language, 08-28. every reply: a few sentences, no tables, at most one heading, ends with the one thing to do. detail goes to 50-LOG, not the chat. | 08-28 | ! never relax. supersedes D-58's framing — that one asked me to be plainer and I did not hold it. |
| D-79 | ! when he names a coin, resolve against data/watchlist.json (nick > sym > address). if it is not there and the name is shared, ASK. never pick the biggest match. | 08-28 | ! permanent |
| D-80 | coins carry a user-set NICK + the last 4 of the address on screen. search marks coins he already holds and shows them first. | 08-28 | — |
| D-81 | X searching is NARROW AND DEEP: complete coverage of coins dying (~44/hr, $4.71/mo), not a sample of the firehose (~351/hr for one phrase, 68% adverts, $37/mo). | 08-28 | operator asks for breadth again knowing the price |
| D-82 | ! searchPosts paginates and returns `truncated`. one page is 20 posts; a count that hit a ceiling is a FLOOR and must never read as "that was all there was". closes D-31. | 08-28 | — |
| D-83 | each search carries its own depth and cadence, stamped in data/query-runs.json. "every 6 hours" means wall clock, never 6 firings of an unreliable schedule. | 08-28 | — |
| D-84 | ! never window.prompt() — it THROWS in electron and kills the handler silently. use askText(). pinned by a source test. | 08-28 | ! permanent |
| D-85 | ! any control whose failure looks identical to its idle state must be verified INSIDE a running electron window, not by reading the code. eighth instance of a silent failure in this project. | 08-28 | ! permanent |
| D-86 | ! tone is withheld below 3 posts containing scoreable wording. one post produced "0.818" live. raw value kept in the record, never offered as a reading. | 08-28 | ! never show a mood from one voice |
| D-87 | ! every network call in the collector must go through `getJSON()` (timeout + backoff), never a raw `fetch()`. one untimed RPC call froze the collector for 3h46m — see 2026-08-29-scanner-hang. | 08-29 | ! permanent |
| D-88 | collect.yml runs ONE pass per trigger and exits, matching cloud-collect.js's own contract. supersedes the 6-hour internal-loop workaround (D- from 08-28's "one trigger buys six hours") — that loop, combined with a single-run concurrency lock, turned one hang into a multi-hour outage for every scheduled trigger behind it. `cancel-in-progress: true` so a stuck run is replaced by the next hourly trigger instead of blocking it. | 08-29 | if cron itself proves unreliable again, per D-61 |
| D-89 | work split: Connal owns scanner effectiveness, data interpretation, and analysis algorithms. Austin owns the app itself — bugs, new rooms/features. See `10-CTX/ops.md` for the full note; not a hard wall, but the default owner when it's unclear who a task belongs to. | 08-29 | either of them says otherwise |
| D-90 | cloud scan moved hourly -> twice-hourly (`:12,:42`). funded by raising the X/social cap $12->$24/mo and the ALL-IN spend ceiling $20->$30/mo (`10-CTX/constraints.md`) — Connal, explicitly: "i understand we will need more money and am okay with it." part of building toward a real, tested trading strategy (see 50-LOG's ongoing strategy-design conversation, 08-31); not itself a trading decision. | 08-31 | if the extra cadence doesn't prove worth the cost once real results exist |
| D-91 | telegram liquidity-pull alerts for held positions run on Cloudflare Workers Cron Triggers, NOT GitHub Actions — GH's scheduler is the thing D-61 already proved unreliable, so a faster GH cron doesn't fix that, it ticks the same bad clock faster. 5-min cadence. a LOCAL background process was proposed and rejected for one reason only: the requirement is coverage while BOTH laptops are closed, and a local clock stops exactly then (confirmed with Connal: no always-on machine exists). telegram SENDING needs nothing external — it is one POST to api.telegram.org — cloudflare is there for the clock, not the send. `cloudflare/telegram-alerts/`. | 08-31 | if Cloudflare's scheduler proves unreliable (symmetric to D-61), or an always-on box appears |
| D-92 | ! held-position data lives in Cloudflare KV, never committed to the repo. this GitHub repo is PUBLIC (confirmed via `gh repo view`) — a committed positions file would broadcast real holdings. applies to ANY future feature needing to know what's held, not just the alerter. | 08-31 | repo goes private |
| D-93 | ! a cloud worker CANNOT read the wallet: every free keyless solana RPC refuses `getTokenAccountsByOwner` from a datacenter IP. measured 09-01 — mainnet-beta `403 "Your IP or provider is blocked"`, publicnode `403 "Request blocked"` for that method while `getHealth` returns 200, drpc paid-only, ankr key-required. ∴ the APP pushes holdings to KV on portfolio load (`app/main/alerts-push.js`) and the worker only prices them. rejected: a free Helius key (another account), a hand-kept coin list (goes stale silently, exactly when a new coin is most likely to rug). ! mainnet-beta's refusal arrives as a well-formed JSON-RPC error body — check `.error` separately from HTTP status or a refusal reads as data. | 08-31 | a free RPC starts allowing the call, or an RPC key is accepted into the budget |
| D-95 | ! UPWARD moves ARE reported, on any tracked coin, held or not. Connal, verbatim: "it is not your job to babysit my money i want you to become a genuine data analyst to me not tell me what is potentially safe or not." I argued once that pushing pump alerts for unheld coins is a buy tip with a timer and would nudge overtrading; overruled, and he is right on the substance — I had conflated REPORTING upside with RECOMMENDING a buy. the mandate bans directives ("buy this"), never analysis of a move's upside. ∴ report the move + the evidence + conf% + falsifier, and never a directive. D-08 (no execution) and D-36's "never market this as being-first" both UNCHANGED — this changes what I report, not what the product claims to be. ! do not re-litigate this per turn. | 08-31 | if he later reports the alerts changed how often he trades, reweigh ONCE with that evidence |
| D-96 | every notification carries the ANALYSIS, not just the number: what moved, what the social read says (distinct people, organic vs promotional), what market data says (depth, holders, age, buy/sell pressure), then a call w/ conf% + falsifier. ∵ a bare "price +40%" is exactly the unfalsifiable signal this project bans; the same alert with its evidence is analysis. | 08-31 | — |
| D-97 | ! J7 tracker STILL cannot feed any of this — not a policy preference, a fact. it is a token DEPLOYMENT platform, its "API key" is a Fernet-encrypted deploy-wallet credential not a read key, and its site blocks embedding via Cloudflare Turnstile. see `70-AREAS/j7-tracker/README`. Connal has now asked for J7 data twice; the answer is the same and the reason is that there is nothing readable there. | 08-31 | real read-only J7 docs/API surface, which have never been located |
| D-94 | ! DexScreener rate-limits Cloudflare's SHARED egress IPs: repeated `429` from the worker while the identical request returned `200` from the laptop, at one call per 5 min. not our volume — IP-pool contention. retries w/ exponential backoff added; a lost tick is still a delayed alert. this is the likeliest cause of the alerter quietly under-performing. | 08-31 | measure the real hit rate; if bad, add GeckoTerminal as a fallback price source |

| D-98 | ! collection moved OFF github actions onto a €4/mo hetzner server (`37.27.210.62`, systemd timer `*:12,42`). D-61's reopen trigger fired as designed: its bar was "cron proves reliable over 2 weeks" and it did not — 08-27..09-01 shows FIVE blackouts, ~13h missing from a 4.6-day record, and only one was noticed at the time. four were runs cancelled mid-flight by the next trigger (`cancel-in-progress`, itself the fix for the 08-29 hang — the fix traded a cascading outage for silent partial losses); one was github never firing for ~3h. workflow kept as manual `workflow_dispatch` backup, cron commented out. ! never run both — double collection, double X spend, racing pushes. | 09-01 | the server proves less reliable than github did, which is the bar it must now beat |
