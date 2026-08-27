---
id: spec.ui
t: spec
v: 1
upd: 2026-08-23
---
# UI — "space station, toddler-simple". resolution = progressive disclosure + one verdict per screen. see [[grill]] G-10.

## DESIGN LAW  (anti-AI-slop)
- X no purple>blue gradients. X no glassmorphism everywhere. X no emoji as UI. X no decorative 3D. X no centered hero with a big glow and 4 words.
- ✓ reference: real instrument panels — Bloomberg terminal density, mission-control legibility, aircraft PFD colour discipline.
- ✓ palette: near-black ground (#0A0C10), 2 elevated greys, ONE accent (amber/cyan), semantic colours reserved EXCLUSIVELY for state: red=danger, amber=caution, green=clear. ! never use red/green decoratively — they must only ever mean risk.
- ✓ type: one mono for numbers (tabular figures, mandatory — digits must not jitter on update), one clean sans for prose.
- ✓ motion: only to show change (value ticks, sparkline draw, alert arrival). never ambient. motion = information.
- ✓ "cool" comes from restraint, density-where-earned, and precise alignment. not decoration.

## HIERARCHY (the toddler-simple part)
- **L1 VERDICT**: one plain-English sentence + one colour. "CATE: SAFE TO HOLD structurally. Attention falling 2 days. You can exit ~$340 of your ~$900."
- **L2 DRIVERS**: the 3 numbers behind the sentence, each with an arrow + timeframe.
- **L3 RAW**: full tables, charts, source rows w/ fetch timestamps.
default view = L1 + L2. L3 behind one click. ! never make L1 a number.

## SCREENS
1. **BRIDGE** (home) — watchlist as cards. each: verdict sentence, RUG light, exitable value, attention sparkline + arrow. sorted by *what changed most*, not alphabetically or by size.
2. **TOKEN** — L1/L2/L3 for one token. TradingView widget. social feed w/ per-post sentiment. news column. thesis + antithesis pinned at top ! (their own written bear case is the first thing they see when they open a losing position — this is the whole point).
3. **RADAR** — cross-token: attention acceleration ranked, DIVERGENCE alerts, new-pool feed pre-filtered by the rug gate.
4. **PORTFOLIO** — cost basis, exitable value (not notional), drawdown, correlation matrix ! (shows them their "diversified" bags move as one — G-11).
5. **JOURNAL** — thesis/antithesis/synthesis entries, forecast log, Brier + reliability curve.
6. **MARKETS** — Kalshi/Polymarket board, their paper forecasts vs market implied.
7. **SIDEBAR (persistent)** — Claude chat, context-packed w/ the current screen's data + provenance.

## BEHAVIORAL LAYER  ! they asked for behavioral economics — this is where it goes, in the mechanics not the copy
- **pre-commitment**: exit rules entered at position-open, displayed permanently, changing one logs a violation.
- **cooling-off**: 10-min timer between an alert firing and the "log a trade" button unlocking. friction on impulse.
- **FOMO counter**: when an alert fires, show "of the last N similar signals, X ended flat or down." kills the feeling of uniqueness.
- **disposition-effect flag**: highlights losers held long + winners sold fast. names the bias on screen.
- **denominator discipline**: default P&L display is exitable-value vs cost basis, NOT notional. no paper-gain dopamine.
- **overtrade meter**: trades/week vs their own baseline. see spec S6.
- **sunk-cost banner**: on any position down >50%, show "would you open this position today at this price?" ! the single highest-value prompt in the app.
- ! all of this must be non-dismissible-by-default. the whole value is that it's there when they don't want it.

## PROVENANCE  ! non-negotiable
every number renders w/ source + age. stale >15m = greyed + timestamp. stale >1h = struck through.
∵ [[ops]]: their top risk is believing a number because it's on a dashboard.
