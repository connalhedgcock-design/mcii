---
id: log.20260828h
t: log
v: 1
prio: high
---
# 2026-08-28 !! THREE BUTTONS HAVE NEVER WORKED. window.prompt() THROWS IN ELECTRON.

## HOW IT SURFACED
- operator: "i clicked the button and nothing happend". he was right and I had told him to click it
  **four times across this session.**

## ROOT CAUSE
- `window.prompt()` in an electron renderer **throws** `prompt() is not supported`. verified directly:
  `try { window.prompt('t') } catch(e)` > `THREW: prompt() is not supported.`
- ! it is NOT a no-op returning null. it throws, which kills the click handler at its first line.
  no dialog, no alert, no console line the operator would ever see, and the button re-enabled itself
  as though nothing had been asked of it.
- three handlers dead since the day each was written:
  1. **Save & share my changes** (added 08-28, commit 88ada13) — ∴ NEITHER OPERATOR HAS EVER BEEN
     ABLE TO PUBLISH FROM THE APP. everything since has sat unpublished on one laptop.
  2. **resolve a forecast** — the lesson prompt. ∴ the calibration record, the one piece of evidence
     this project works, could not be completed. n=0 was partly THIS, not just disuse.
  3. **name a coin** — written by me an hour ago, same bug, would have shipped broken.

## ! THE PATTERN, AGAIN — eighth instance
a failure that produces NOTHING beats a failure that produces an error, every time, in this codebase:
the cron that never fired | the watchlist file nobody wrote | holder counts from the wrong program |
`$WIF` search returning a clean empty list | and now a button that silently does nothing.
**I keep building things whose failure state is indistinguishable from their idle state.**

## FIX
- `askText()` — an in-app dialog: label, input, Cancel/OK, Enter confirms, Escape cancels, click-outside
  cancels. returns a promise of the string or null. replaces all three call sites.
- verified INSIDE a real electron window, not just by reading: typed a value, clicked OK, got the value
  back, dialog closed. cancel returns null.
- alert() and confirm() DO work in electron — checked rather than assumed — so those are untouched.
- test/renderer.test.js greps the source: nothing may call prompt() again, and each of the three
  buttons must use askText. comments are stripped first so the explanation is not read as the bug.

## TESTS 219 > 225
