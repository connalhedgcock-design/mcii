---
id: task.board
t: task-board
v: 1
upd: 2026-08-31
machine: connal
derived: true
---
# BOARD — everything, both people, worst first

!! DERIVED FILE. regenerated from `connal.md` + `austin.md`. ! on a merge conflict do not
hand-resolve — delete both sides and regenerate. see [[90-TASKS/README]].

## P0 · MONEY — real money at risk right now
_none._ ✓

## P1 · SILENTLY WRONG — showing something false, and nobody would notice
- [ ] T-001 @connal · measure how often the liquidity alerter gets rate-limited and skips a check
      · why: DexScreener returns 429 to Cloudflare's shared addresses while the same request works
      from a laptop (D-94). a blocked check looks identical to a quiet market — the alerter would
      appear healthy while watching nothing.

## P2 · BLOCKED — someone can't proceed
- [ ] T-002 @connal · create the Cloudflare API token so the app pushes holdings automatically
      · why: holdings are currently hand-seeded. a coin bought after today is invisible to the
      alerter — and the newest coin is the likeliest to rug.
- [ ] T-003 @austin · make `app/.env` actually load (no `dotenv` in the project today)
      · why: `alerts-push.js` reads a variable nothing populates. looks wired, silently no-ops.
- [ ] T-004 @austin · get `CLOUDFLARE_KV_TOKEN` onto Austin's machine
      · why: otherwise whichever machine last opened the portfolio decides what gets watched.

## P3 · BUILD — real improvements, nothing broken
- [ ] T-005 @connal · the entry signal — what actually picks a coin to buy, and when to sell
      · why: the stated focus of the next session, and the piece the whole strategy waits on.
- [ ] T-006 @connal · define what counts as the strategy working, and against what baseline
      · why: the current bar can't be proven wrong, and profit in a rising market proves nothing.
- [ ] T-007 @connal · position sizing across the $100 paper budget
      · why: named but never split; without it a paper trade has no size and no meaning.
- [ ] T-008 @connal · promote organically-discussed tickers into actual tracking
      · why: closes the documented discovery gap — today candidates are only new-or-already-popular.
- [ ] T-009 @both · chart history while both laptops are closed
      · why: no overnight history to analyse. ! scope is Connal's call, build is app-side.

## P4 · LATER
- [ ] T-010 @both · re-check the alert thresholds after the first real liquidity crash
      · why: proven end-to-end only against a crash I staged, never a real one.

## NEEDS A DECISION, NOT WORK → [[decisions]]
- trading frequency: "a few times an hour" vs the locked no-sniping rule (D-20/D-36). Connal is
  open to reopening it but has not. ! must not get settled by accident by whatever gets built first.

## STANDING
- `@both` and `@unclear` tasks need an owner agreed BEFORE work starts (D-89 — the lanes overlap,
  so silence gets read two different ways on two machines).
- Austin has not seen this board yet; his section is a proposal, not an assignment.
