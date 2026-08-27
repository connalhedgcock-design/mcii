---
id: tpl.forecast
t: tpl
v: 1
---
# FORECAST — every prediction gets one. this is the calibration record. n≥50 before any performance claim.
---
date:
q:               # must be resolvable, unambiguous, dated. "CATE does well" is not a question.
prob: __%
resolve_by:
market_implied:  # kalshi/polymarket price if one exists — are we beating the market or agreeing with it?
basis:           # what evidence. link vault notes.
---
resolved:
outcome: y/n
brier: (p - o)^2 =
lesson:          # ! what would I need to have seen to get this right
