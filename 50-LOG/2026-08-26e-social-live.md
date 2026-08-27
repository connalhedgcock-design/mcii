---
id: log.20260826e
t: log
v: 1
---
# 2026-08-26 SOCIAL LIVE — key working, pipeline end-to-end on real X data
- twitterapi.io key received + stored app/.env chmod 600. gitignored + stignored + verified absent from all vault markdown.
- ! key was pasted into chat > told operator plainly, offered rotation, left the call to them. read-only + $12 cap = low blast radius.
- COST: 79 posts = $0.0118. 79,921 posts remain this month. budget model is comfortable.

## REAL FIELD SHAPE (verified, not assumed)
- tweets[] + has_next_page + next_cursor (pagination available, unused so far)
- ! author.isAutomated + automatedBy = X's OWN bot label. authoritative when set, but OPT-IN ∴ heuristics stay as second line.
- ! tweet.viewCount present > ENGAGEMENT RATE not raw counts. 61 likes/1911 views vs 0 likes/12 views are the same "post" by volume and nothing alike by reception.
  reach w/ no reaction = promotion, not interest. now a manipulation marker (views>2000 & median rate <0.2%).
- also: lang, isReply, source, bookmarkCount, fastFollowersCount (bought-follower tell), profile_bio.

## !! THREE BUGS FOUND BY RUNNING IT, NOT BY READING IT
1. http.js accepted a `headers` option and NEVER PASSED IT to fetch > api key silently dropped > 403 on every call.
   ✓ merge caller headers. ✓ 401/403 now throw immediately instead of retrying a bad key 3x.
2. !! queriesFor destructured `symbol` but tokens carry `sym` > every cashtag search was literally "$undefined".
   pulled unrelated posts AND attributed the SAME posts to BOTH tokens > would have manufactured a fake CATE/NEEGY correlation.
   ! this is the worst class of bug in this project: silent dataset poisoning that looks like a working feature.
   ✓ accept either key, drop the query if symbol missing, never build from the string "undefined", defensive filter on results.
   ✓ test/queries.test.js — 7 regression tests.
   ! effect of the fix, measured: CATE botRatio 26%>5%, diversity up, median engagement 4.52%>13.51%. contamination was distorting everything.
3. empty bucket reported manipulation markers computed over zero posts ("a handful of accounts produced most of the posts" w/ 0 posts).
   ✓ empty > thin only, confidence none, honest verdict string.

## ADDRESS-MENTION SPAM — found in live NEEGY results
- @SOLWhaleEntry posts pitching $CYBERLEEK while name-dropping NEEGY's CA. counting that as NEEGY attention is simply wrong.
- ✓ offTopic() + partition(): shotgun detection (>=4 tokens named, >=3 not ours) + "mentions our CA but pitches another cashtag".
- ✓ noise is SEPARATED and reasoned, not deleted ∴ noiseRatio is itself a signal about how much farming targets this token.

## TESTS 53/53 — alerts 7 | hype 21 | sentiment 10 | queries 7 | offtopic 8

## NOT YET DONE
- ? partition() not yet wired into the live collector path (built + tested, not called).
- ? social not yet wired into main/index.js or the UI. deliberate: wanted verified real data shape first. now have it.
- ? hypeIndex needs 20 buckets of history before it emits ∴ z-scores start ~5h after continuous collection begins.
