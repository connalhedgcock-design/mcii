---
id: task.roadmap
t: roadmap
v: 2
upd: 2026-09-07
machine: connal
---
# MCII — THE ORDER OF WORK

!! 2026-09-07 update: [[90-TASKS/TRACKING-BUILD-PLAN]] is the current build order for trader, social, market and news analysis, following Connal’s later Research best tracking methods conversation. Its evidence-first human/AI design supersedes the score-first steps, ordinary-sellability entry variable and D-121 comparison below. The older roadmap is retained as history; unrelated product backlog remains. Start with the new plan’s Step 1.

## THE RULE FOR THE NEXT STAGE
Finish one trustworthy loop before expanding the app:

**collect evidence → explain the signal → show it in the app and on the phone → record the paper result → judge it against fresh results**

MCII already collects a lot. The main problem is that several useful parts stop halfway: some
analysis exists only in files, some screens do not show the reasoning, and the continuous entry
read is not yet producing a complete paper-trading record. New rooms and new data sources will
make that harder to finish, not easier.

## HOW WORK MOVES FROM NOW ON

- Only one milestone below is active at a time.
- Connal and Austin may each have one active job inside that milestone.
- A real money danger or a silently wrong reading interrupts everything. Nothing else does.
- New ideas go into the owner's queue. They do not become today's work just because they are good.
- Research starts only when it answers a named question in the active milestone.
- A feature is done only when it works on a real example, is visible where it matters, fails
  clearly when data is missing, has a test, and leaves a useful record for later review.
- At the end of each week, either finish the milestone or state the exact missing piece. Do not
  open the next milestone to create the feeling of progress.

## MILESTONE 1 — MAKE THE RECORD TRUSTWORTHY

This is the active milestone.

Connal's job:

1. Measure how often the five-minute phone alert check is blocked or skipped (T-001).
2. Confirm the collection server is producing fresh market, news, holder and signal records.
3. Connect the continuous `entryWorthy` read to its own automated paper-trade record. Today only a
   new watchlist admission creates an automatic forecast; the continuous entry rule does not.
4. Keep automated strategy results separate from Connal's and Austin's personal forecast files.
5. Record the price actually available at the time, data age, missing inputs, reasons, and later
   result. A missing or suspicious price never becomes zero and never resolves a paper trade.

Austin's job:

1. Verify his copy of the app loads its local settings and can reach the phone-alert handoff.
2. Do no new room work yet. Prepare the smallest existing coin or What's Happening view that can
   display the result completed in Milestone 3.

Finish line:

- One real continuous entry event creates a complete paper record.
- One losing, expired, or winning result resolves correctly from later prices.
- A skipped collection or phone check is visible instead of looking like a quiet market.
- The full app test passes.

## MILESTONE 2 — FREEZE PAPER STRATEGY VERSION 1

Connal owns this because it decides what the data means.

Write one numbered rule before looking at its fresh results. It must state:

- what makes a coin eligible;
- what exact evidence creates an entry;
- which evidence can block an entry;
- how old each input may be;
- what happens when one input is missing;
- the profit, loss and time exits;
- how fees, price movement during the trade and the amount actually sellable are counted;
- how the $100 paper account is divided and tracked;
- what it must beat to count as useful;
- what result would make us reject or change it.

Start with the current green entry rule and the existing +20% / -15% / 24-hour exits as **Version
1**, not as proven truth. Do not adjust the rule during its test. Any change creates Version 2 and
starts a new result window. D-120 still stands: this plan does not invent a hard real-money limit
or tell either person what to invest.

Finish line:

- The rule can be followed by code without Claude filling in a judgment after the result is known.
- The comparison and failure rule are written before the first counted event.
- Every eligible, yellow and rejected event is retained, so selected coins can be compared with
  the ones the rule passed over.

## MILESTONE 3 — COMPLETE THE LOOP PEOPLE CAN ACTUALLY SEE

Connal's job:

1. Finish what wallet activity means (T-017): followed-trader buys, sells and fake-looking flows
   must remain separate facts.
2. Add the missing buy/sell detection on top of the wallet reader and wash-trade checks.
3. Feed market, wallet, social and confirmed news evidence into the same Version 1 decision.
4. Keep disagreements visible. Do not average conflicting readings into a confident-looking score.

Austin's job:

1. Put the existing red/yellow/green state and its plain reason on the current coin screen.
2. Show what changed since the last scan, the coin's real-world story, contrary evidence, missing
   evidence and the age of every important reading.
3. Put the deeper explanation in What's Happening before building a separate War Room.
4. Put the same strong signal on the phone. Yellow and unproven findings remain visible in the app
   with their reason, but do not create phone noise under the current notification rule.

Finish line:

- One real event travels all the way from collection to a visible explanation, phone message and
  paper result.
- Connal can answer “why did MCII flag this?” in under ten seconds without opening a data file.
- The screen says when sources disagree or when one is missing.

## MILESTONE 4 — LEAVE IT ALONE AND COLLECT FRESH RESULTS

Run Version 1 for at least two weeks and until at least 50 clean results have resolved. Fifty is
the minimum point where the project is allowed to start judging a learned model; it is not proof
by itself.

During this period:

- Keep the strategy rules fixed.
- Keep the social collector running for the already-decided two-week comparison (D-121).
- Record which source found each coin first: social, followed wallets, unusual market movement, or
  real news and scheduled events.
- Compare selected coins with eligible coins the rule did not select, after realistic costs.
- Check collection health daily, but do not redesign the system because of one win or loss.
- Repair data faults immediately; record strategy ideas for the next version without applying them.

Finish line:

- At least 14 calendar days and 50 clean results.
- The comparison was decided before the results and cannot be rewritten to rescue a bad outcome.
- Social has a clear keep, narrow or cut decision based on unique useful finds, not opinion.

## MILESTONE 5 — MAKE ONE DECISION FROM THE RESULTS

Choose one outcome:

- **Keep Version 1:** it beat the written comparison after costs and the result survives checks.
- **Replace it with Version 2:** name the single weakness being changed and begin a new test.
- **Stop this rule:** it showed no useful advantage. Keep the record and move to a different idea.

Only after this review should MCII consider a learned prediction model or an always-running AI
analyst. The AI must first make dated predictions from a fixed evidence packet and have those
predictions scored. More agents are not proof of better analysis.

## MILESTONE 6 — EXPAND THE PRODUCT IN THIS ORDER

Once the core loop works, build the rest in this order:

1. User-set price-above and price-below phone alerts.
2. The scheduled-events calendar and stronger coin-story view already supported by collected news.
3. The dedicated Wallet room.
4. The War Room for the deeper combined explanation.
5. Real overnight chart history instead of relying mainly on reconstructed points.
6. Full phone access to the app, beyond notifications.
7. An AI analyst that reads fixed evidence, produces scored claims and stays inside a measured
   time and cost limit.
8. A maintenance agent, only for checks that have a clear pass/fail answer and a visible failure.
9. Return the visible name to MCII without moving or losing its saved data, then make the new app
   icon and finish wider visual polish.

The trend list may be displayed as unproven information, but it does not feed the entry rule until
new testing changes the current finding that it does not predict the next move.

## PARKED UNTIL THE CORE LOOP WORKS

- New celebrity trackers beyond the already-started Elon/Trump experiment.
- Prediction markets.
- A wholesale Observatory redesign or several new rooms at once.
- Replacing the current rules with continuous AI judgment.
- Adding more data sources without naming the decision they improve.
- Turning off social before the two-week side-by-side discovery test finishes.

These are delayed, not rejected. A parked item may move forward early only if it blocks the active
milestone or prevents an observation that cannot be collected later.

## THE WEEKLY RHYTHM

Start of week:

- Check for real-money dangers, silently wrong readings and stale collection.
- Choose the next unfinished item inside the active milestone.
- Confirm one owner and one finish line for Connal; do the same for Austin.

During the week:

- Finish before switching.
- Put new ideas in the queues.
- Save the evidence and reason for every change.

End of week:

- Demonstrate the work with one real example.
- Mark finished tasks done and rebuild the combined board.
- Record what is still unproven.
- Open the next milestone only when the current finish line is met.

## SOURCES USED FOR THIS ORDER

Google Drive notes:

- [going thru mcii](https://docs.google.com/document/d/1mOBfj6udBGXDdYLRRDah2-hM9g2aNFY3mHdGYy5Nqdk/edit)
- [MCII Open Questions](https://docs.google.com/document/d/1o0NaYWXouqT7VaZz12U5g9lP9O6gweOC/edit)
- [MCII Observatory — Room Design Questions](https://docs.google.com/document/d/1ky1pQ8t3CXU1CxiU44voB_aTlgSZ6kLdFvs42i-mGxM/edit)
- [MC Analysis Questions #1](https://docs.google.com/document/d/1V_48KP_ZAIOvAOpXkXkUQqeOmSJGMpxbEioLuHWXQAA/edit)
- [token efficiency system](https://docs.google.com/document/d/1OwHqUbc0tHUbOGbhPGmvxyaon9RvdqeUETpFohG477Y/edit)

Project evidence:

- `50-LOG/2026-09-07-project-focus-audit.md`
- `50-LOG/2026-09-07-price-signal-integrity.md`
- `50-LOG/decisions.md`, especially D-05, D-08, D-117, D-119, D-120 and D-121
- `70-AREAS/trading-strategy/README.md`
- `60-KB/emerging-signal-backtest.md`
- `60-KB/social-signal-backtest.md`
- `60-KB/trend-candidate-walkforward.md`
- `90-TASKS/connal.md` and `90-TASKS/austin.md`
