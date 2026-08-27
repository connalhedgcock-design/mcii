---
id: spec.creds
t: spec
v: 1
upd: 2026-08-23
---
# CREDENTIALS — provisioning notes. ! no secret VALUES ever in this vault.

## REDDIT  (free tier, non-commercial, 100 QPM)
- app type: **script** (not web/installed)
- redirect_uri: `http://localhost:8080` — required by form, unused by script grant. must just be valid URL.
- about_url: blank. ! a 404 link reads worse to a human reviewer than an empty field.
- description: must state (a) personal/2-person, (b) non-commercial + not monetized, (c) aggregate-only storage / no content redistribution, (d) low volume vs 100 QPM. vague descriptions get bounced.
- ! manual human approval since late-2025. lead-time item — provision FIRST.
- ! rate limit is per CLIENT ID, not per user. connal+austin sharing one app = sharing 100 QPM.
  ∴ reddit polling belongs to the LEADER collector only, never both machines independently. see [[sync]].
- ! the description is a commitment. if outside money ever enters > free tier no longer applies > stop, don't quietly continue. ties to [[grill]] OPEN-Q 7.
- script grant auths AS the creating account. shared creds = both operating as connal's account. acceptable for personal use; note it.

## NO-KEY SOURCES (nothing to provision)
dexscreener | geckoterminal | rugcheck | kalshi | polymarket | coinbase-public | jupiter

## KEYED
- twitterapi.io — prepay credits, no expiry, no minimum. $10 initial.
- supabase/neon — DATABASE_URL.
- apify — only if tiktok/ig accepted at v2.

## STORAGE
- per-machine `.env` in vault root. ! gitignored + stignored. verify both before first commit/sync.
- GHA collector > same values as Actions secrets, provisioned separately.
- ! any key that touches a synced folder, a screenshot, or a chat log = rotate it. routine, not a crisis.

## REDDIT — SUBMITTED DESCRIPTION  ! this is a commitment, not marketing copy. build must match it.
- watchlist FIXED at 7, declared to reddit: CryptoCurrency, CryptoMarkets, solana, altcoin, memecoins, CryptoMoonShots, SatoshiStreetBets
  (3 broad-market for baseline context + 4 speculative where memecoin chatter originates)
- ! declared behaviours we are now bound to:
  - read-only. NEVER post/vote/comment/message. no write scopes requested.
  - exponential backoff on 429.
  - descriptive User-Agent identifying app + contact account.
  - listing+comment calls every 15–30m only.
  - aggregate scores persisted ONLY. no raw reddit content republished/displayed/redistributed/resold.
  - ! NO dynamic subreddit discovery. adding a sub = amending the registration, not a code change.
- ∴ raw-post retention policy in [[arch]] must exclude reddit bodies from anything user-visible or synced. aggregates + counts only.

## REDDIT — BLOCKED 2026-08-23
- symptom: HTTP 500 on app-create submit. reproduced on old.reddit > NOT a new-UI wrapper issue.
- ! searched: no documented cause. reasoning from principles, not a known fix.
- isolation test issued: minimal app (name/type/`test` desc/localhost redirect). succeeds > payload was the cause. 500s > account-level, rewording is futile.
- account-level suspects, in order: unverified email (reddit gates app-create on this, throws instead of warning) | account age/karma | duplicate app name from a partial submit.
- ! side door explicitly REJECTED > D-10. public .json endpoints need no registration but using them to route around a blocked registration falsifies the submitted description. no reddit is an acceptable outcome; bypass is not.
- impact: LOW. reddit is one panel. X + onchain + safety gate are independent and safety gate ships first.

## REDDIT — CLOSED 2026-08-23. DO NOT RE-ATTEMPT. see D-11.
- fact: the 500 was self-serve registration being closed, not a bug. @Responsible Builder Policy (upd ~Jun 2026).
- fact policy: "You must request access and get explicit approval before accessing any Reddit data through our API."
- three approval lanes, we fit NONE: Devvit (apps running ON reddit) | mod tools (must be a mod) | RFR (academic program; "any research using reddit data collected outside RFR is in violation").
- !! the killer clause, verbatim: "You must not sell, license, share, or otherwise commercialize Reddit data without express written approval. This extends to commercial and **non-commercial mining, scraping**, or using data for purposes like ads targeting or **to train machine learning or AI models**."
  ∴ (a) non-commercial is NOT an exemption — we assumed it was, we were wrong
  ∴ (b) our proto-model = training an ML model on reddit-derived data = named prohibition
  ∴ (c) v1 sentiment scoring is itself "mining" > NO safe subset to build while a ticket pends
- ! also: policy bars inferring characteristics about users. our bot-detection profiles authors (age/cadence/ratios). fine on X, problem on reddit.
- ∴ CLOSED. not blocked, not pending — closed. do not propose a reddit panel, a reddit adapter, or a "just while we wait" version.
- cost of losing it: LOW. reddit lags X by hours on memecoin chatter. we lose a slow confirmation signal + community-depth read. safety gate / exitable value / onchain / X all untouched.
- ! OPEN, carried to D-12: does X (via twitterapi.io ToS + X's own terms) permit training a model on collected posts? the proto-model runs entirely on X data now. settle BEFORE building the model.
