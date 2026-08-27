---
id: log.20260826d
t: log
v: 1
---
# 2026-08-26 SOCIAL SCORING ENGINE BUILT (no key needed yet)

## D-12 RESOLVED — X terms permit our use, unlike reddit
- fact @X dev agreement: bans using X API/content to "fine-tune or train a foundation or frontier model."
- ∴ scope is LLM/foundation training. our proto-model = statistical correlation (attention accel > fwd return). NOT a foundation model. conf 80%, not a lawyer.
- ∴ we also never touch X's own API — twitterapi.io is the counterparty, and their terms permit "monitor and analyze publicly available information... research... legitimate business purposes."
- ! materially DIFFERENT from reddit, whose policy explicitly covered non-commercial *mining* + "machine learning or AI models" broadly. do not conflate the two.
- ✓ constraint kept anyway: store aggregates + bounded samples, not bulk post archives. small exposure, good practice.
- ! residual risk is twitterapi.io's own standing with X, not our compliance. already covered by D-02 provider abstraction.

## BUILT
- shared/sentiment.js — crypto lexicon scorer. negation, intensifiers, dampeners, emoji, ALLCAPS, question-softening.
  ! key property: no-vocabulary-hit returns scored:false, NOT 0. averaging fabricated neutrals is how a sentiment index rots.
- shared/hype.js — bucket() > uniqueAuthors, log1p engagement, engagement-weighted sentiment, HHI author diversity,
  duplicateRatio (normalised text), botLikelihood (transparent heuristics, not a black box), burstiness, shillRatio.
  hypeIndex() = z-score vs the token's OWN trailing history, refuses to emit below 20 buckets.
  derivatives() velocity + acceleration. divergence() reports BOTH readings, never resolves the ambiguity.
- main/adapters/twitterapi.js — provider-isolated. normalises into exactly the shape hype.js wants ∴ scoring never learns the provider.
  ! hard budget enforcement BEFORE each request. $12/mo cap, per-post cost accounting, auto-pause at cap.
  ! queries by CONTRACT ADDRESS weighted 3x vs cashtag 2x ∵ ticker searches collide, addresses don't.

## ! TWO DESIGN FIXES THE TESTS FOUND (not test bugs — real gaps)
1. reliability gate conflated "thin sample" with "manipulated". SPLIT. they demand opposite responses:
   thin > wait, says nothing about the token. manipulated > that IS information and it's bad.
   thresholds: MIN_AUTHORS 12 (below = thin), GOOD_AUTHORS 30. manipulated requires >=2 markers ∵ one is noise.
   confidence: none | low | moderate | good.
2. shill/promotional register was invisible to the sentiment lexicon ("100x", "dont miss out", "last chance", "guaranteed").
   ✓ added SHILL_PATTERNS as a MANIPULATION marker, deliberately NOT folded into sentiment.
   ∵ "next 100x" tells you nothing about the token, only that someone is selling it to you. keeping them separate stops the two blurring.

## TESTS 38/38  (`npm test`)
- alerts 7 (incl. negative control) | hype 21 | sentiment 10
- ! the hype suite's core proof: synthetic ORGANIC (40 authors, varied copy, aged accounts, spread timing) PASSES with confidence 'good';
  synthetic COORDINATED (3 accounts, identical copy, 90s window, fresh eggs) FAILS with confidence 'none' and is marked coordinated.
  a loudly-positive shill campaign must never read as bullish. verified.

## BLOCKING TO GO LIVE
- ? twitterapi.io key. $10 credit. nothing else outstanding.
- ! deliberately NOT wiring UI until real data exists — building a display against a mock then discovering the real shape differs is the mistake we already avoided w/ jupiter + dexscreener.
