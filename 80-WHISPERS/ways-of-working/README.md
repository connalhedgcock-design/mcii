---
id: whisper.ways-of-working
t: whisper-topic
v: 1
upd: 2026-09-01
machine: connal
whispers: 1
---
# WAYS OF WORKING — the thinking, gathered

!! NOT A BUILD PROJECT. This folder holds whispers about how the two of them WORK, not about what
gets built. It exists so process thoughts have a home and do not get mis-filed into a build thread
where they would distort it. ! if you are looking for what to build, nothing here is it.

## THE WHISPERS IN THIS THREAD
- [[../INBOX-connal|w-006]] — Austin owns the PRESENTATION of every feature, Connal owns the
  FUNCTIONALITY of every feature. So Austin presents the analysis algorithm in the app, and Connal
  builds how a whale tracker actually works even though the tracker is a new app feature.

## WHY THIS MATTERS AND IS NOT YET A DECISION
- it REFINES D-89, which splits work by SUBJECT (Connal: scanner/data/algorithms — Austin: the app).
  w-006 splits by LAYER instead, across every feature. Cleaner, more general, and it resolves the
  overlap D-89 admits it has ("a scanner bug often IS an app bug").
- !! NOT LOGGED AS A DECISION YET, on purpose: it is a two-person commitment and only Connal was in
  the room. It needs Austin's confirmation from his own machine before it supersedes D-89.
- ∴ until then BOTH readings are live, and where they disagree, D-89 is still the locked row.

## OPEN `?`
- `?` where the boundary sits for something that is only functionality with no visible surface (a
  cron cadence, a storage format). Presumably Connal by default, but w-006 does not say.
