---
id: area.observatory.room-brief
t: area-design
v: 1
upd: 2026-09-05
machine: austin
---
# ROOM BRIEF — the operator's own answers, 2026-09-05

Source: the 34-question room-design worksheet handed to Austin after the five rooms shipped
(LOG.md #19/#20). Answers came back as a filled Google Doc. **Section A below is VERBATIM** — it is
the operator's own wording and is the thing to re-read, not this file's summary of it. Section B is
my derivation from it: what is decided, what is buildable today, what is blocked. Section C is what
he did NOT answer — do not invent these.

Read with [[DESIGN|DESIGN.md]] (the colour law and the anti-slop bans still hold over everything
below) and [[../functionality/INSTRUMENTS|functionality/INSTRUMENTS.md]].

---
## A. VERBATIM ANSWERS

### Feel, per room
- **Your Coins (dock of berths)** — "The design given in the original render was good, it was just
  poorly executed. Everything was overlapping, none of the information was clear, etc"
- **The Market (sensor sweep)** — "I like the sensor sweep and it should be decorative, i want you
  to find a creative and unique way to represent the same data in that decorative sensor sweep way"
- **What's Happening (texture)** — "Kind of a mix of both. I like the moving graph and the circle
  which gives that noisy and chattery feel but i dont want it to be so much that it feels chaotic"
- **The Journal (instrument vs ship's log)** — "Narrative and chronological"
- **The Portfolio (cargo sized by weight)** — "Cargo sized by weight works fine"
- **Wallets, sealed door** — "Maybe something like" *(sentence ends there — see Section C)*
- **Prediction Markets, sealed door** — "Fully assimilated" (not external/alien)
- **A room with a different mood from the rest** — "no"

### Indicators — what must read at a glance
- **Your Coins** — "The numbers for what my coins are doing that day but i want to see social media
  data for those coins, the graph (which i want improved the graph is shit), top wallets that
  purchased the coin that day, a star next to it if theres a real world event pertaining to the
  coin, the daily synthesis of that information as a value indicator on the coin."
- **The Market** — "Coins with the most increases in trading volume that day, coins that dropped the
  most in trading volume that day (compared to their average)m so basically coins that blew up/fell
  off that day. The coins will be represented as the planets in this tab and when you click on the
  coins you should see social media data that day and whether its positive/negative compared to the
  average yesterday, any top wallets that purchased today and when. Coins that we are holding and or
  coins that fit the criteria above with the trading volume should be represented as planets.
  Asteroids can represent Smaller coins and coins that are not being tracked as planets that had the
  most significant change in trading volume that day, if those coins stick around for some period of
  time we would determine after analysis they could be come represented as planets"
- **What's Happening** — "Synthesis of data from the real world data tracker and social media data
  tracker. Direct posts in the crypto world that gathered a lot of traction, some general trends
  that were in social media data that day etc be creative more indicators like that"
- **The Journal** — "There should be a questions tab that is asking us questions to refine analysis
  of the coins or how to improve the app, finance related questions about strategies we could be
  trying out. There should also be an open journaling tab it should look into connals whispers files
  and build off that idea where it puts in or we say things into the journal where we put things
  into the journal and ai reads those thoughts and looks for connections other journal entries or
  uses them to build its own ideas/refine those ideas and give them as suggestions"
- **The Portfolio** — "I want to see my joint portfolio between fomo and axiom in $ amount and the
  24/hr change with a graph and something representing the 'cargo sized by weight'"
- **What was cut when the rooms were built (funnel stats, J7 Tracker link, coins-scanner-found
  table)** — "No dont lose those find a new way to display all the same information in the new
  system"

### Synthesis across data types
- **Agreeing signals** — "Show all the individual stuff as it is important but also show a verdict
  and say if its relatively positive or negative"
- **Conflicting signals** — "Warning state"
- **Low confidence** — "Needle could be cool with like a confidence meter"
- **Whale sell/buy asymmetry** — "hard sells and hard buys should visually hit hard"
- **Does synthesis get its own room?** — "there should be a smaller panel on the coins and market
  tab and a much more in depth synthesis in the war room where you can see how the data is being
  assessed"
- **Name / look of it** — "The war room and im not sure think of something unique and creative"

### Colour law for new data types
- **Trader/wallet money movement** — "Red sells green buys but label opportunities and risk as well"
- **Prediction-market odds** — "market data" (i.e. cyan-blue, no new hue)

### The two sealed rooms
- **Wallets, physically** — "i imagine the wallet tracking room more or less looking like one wall
  of followed traders and their activity sorted by recency and it should be organized like name of
  trader name of coin sell/ buy amount and theyre status on the trade (whether they are up or down).
  Find a unique and creative way to represent this that fits the futuristic space station theme
  using 3d layers and motion"

---
## B. WHAT THIS DECIDES, AND WHAT IT COSTS

### Decided, no further asking needed
1. No room gets a mood of its own; the station is one register throughout (answer 8: "no").
2. The five built rooms keep their metaphors — berth dock, sensor sweep, waveform+circle, cargo.
   The Journal's calibration-dial framing is the one **rejected**: it must read narrative and
   chronological, a log, not a lab instrument. That is a redesign of `room-journal.js`, not a
   refinement.
3. Nothing that was cut in #19's scope cut stays cut. The funnel stats, the coins-the-scanner-found
   table and the J7 Tracker link all have to come back in spatial form.
4. Colour law gains no new hue. Wallet flow reuses red/green — but ! with an explicit word next to
   it ("risk" / "opportunity"), because red/green already means down/up and the operator asked for
   the meaning to be labelled, not inferred. Prediction-market odds are cyan-blue, market data.
5. A seventh instrument silhouette is now owed: a **confidence needle/meter** that physically shows
   low confidence rather than printing "45%".
6. **The War Room** is approved: the deep synthesis lives there, with a compact version of the same
   verdict as a panel inside Your Coins and The Market.
   ! CORRECTED 2026-09-05 (see LOG.md #21). This point originally read "an eighth door", and that
   part was wrong — not rejected on taste, disproved by the geometry. Door angles must be even
   multiples of 14° so a vault rib lands over each doorway, and past ~90° the projection turns back
   toward the centre so a door there renders BETWEEN two existing ones. That leaves exactly
   0, ±28, ±56, ±84, and all seven are taken: **the ring is full.** The War Room is therefore
   reached from the tab bar and from a "How was this read?" link under the compact verdict in Your
   Coins and The Market. Still open, and worth asking before spending on it: there is no way into
   it from inside the Observatory itself.

### Buildable today against data that already exists
- Your Coins' graph rebuild (`historySeries()` is live, the operator's word for the current one is
  "shit").
- The Market as planets + asteroids by volume change: `data/market.jsonl` + `screenLatest()` carry
  volume; the planet/asteroid split is a threshold rule over data we already collect.
- What's Happening's restored funnel stats and top posts: `sector()` already returns `topPosts`,
  `posts`, `uniqueAuthors`, `sentiment`, `botRatio`, `shillRatio`, `movers`, `important`.
- The Portfolio's joint FOMO+Axiom dollar figure, 24h change and graph: `portfolio()` +
  `portfolioSeries()` are live.
- The Journal's rebuild as a chronological log, and the open-journaling tab reading Connal's
  whispers pattern: `notes()`, `addNote()`, `theses()`, `forecasts()` are live and
  `80-WHISPERS/` is right there in the vault.
- The confidence needle, the verdict reading and the conflict warning state: all three read numbers
  the gate/screener already produces.

### ! BLOCKED — asked for, but the data does not exist in the app yet
- **"top wallets that purchased the coin that day"** (Your Coins, The Market, and the whole Wallets
  room). `app/main/adapters/walletflow.js` can extract who moved a token from the chain, but it is
  **not wired to any IPC handler** and `data/wallets.json` is an empty array — nobody is followed
  yet. `follow-wallets.sh` exists to fill it. Also unbuilt: the funding-link / wash-trade filter
  that whale-tracking's own README says must run BEFORE any flow reaches a screen. Wash trading is
  the base rate in this asset class; shipping raw flow would put manufactured activity on the wall
  dressed as real interest.
- **"a star next to it if theres a real world event pertaining to the coin"** — there is no
  real-world event feed. Nothing collects it, nothing stores it.
- **Prediction markets** — no source, no adapter, no data file.
- **The Journal's questions tab** — the questions have to be generated by something. Orion exists
  (`orionAsk`) and could do it, but nothing today produces or stores a question queue.

! all four are pipeline work in `app/main/`, not room work in `app/renderer/station/`. Designing the
room around them is fine; shipping a room that renders them as empty boxes is not.

---
## C. NOT ANSWERED — do not invent these
- **6.** What "watching someone else's vault from across the room" looks like — the sentence ends
  mid-thought at "Maybe something like". Answer 28 partly covers it (a wall of traders sorted by
  recency) but the architectural image was never finished.
- **15.** Anything he checks today with no instrument anywhere yet.
- **16.** Whether any existing instrument should be demoted.
- **25/27.** Whether wallet flow deserves a genuinely new hue, and any colour he already associates
  with it. (24 answers red/green, so this is settled enough to build; treat 25 as closed by 24.)
- **29/30.** What the Prediction Markets room looks like, and any real-world reference for either
  sealed room.
- **31.** Whether both sealed doors open at once, or one matters more now.
- **32/33/34.** Any built room needing full redesign (answer 4 implies The Journal), any
  never-raised reading he has wanted since day one, anything to steal from Peter's handoff.
