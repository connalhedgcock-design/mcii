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
