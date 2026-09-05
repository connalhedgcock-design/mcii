---
id: whisper.inbox.connal
t: whisper-inbox
v: 4
upd: 2026-09-01
machine: connal
owner: connal
---
# INBOX (CONNAL) — dump thoughts here

! Austin has his own at `INBOX-austin.md`. Two files, not one, because both of you appending to the
end of the same file is the single most reliable way to create a git conflict. Both are read
together by `/whispers`, so the split is invisible when it matters.

Type on a new line. Fragments fine. No date needed, no format, no complete sentences.
Contradicting yourself is fine and often the interesting part.

I add the `w-NNN` ids later — don't bother with them, and don't tidy anything up.

---

<!-- CAPTURE BELOW THIS LINE -->

- `w-001` the "cant get out" stat is not a useful stat for us neither me or austin are trading with enough money to ever really be in a position where we cant get out
- `w-002` refine this part he app currently spots coins that three or more different people are independently talking about, works out which actual coin they mean — then throws the result away. Wiring that into tracking is the good version of what you're asking for, because it rests on real people talking rather than my opinion about what looks promising.  make it into something more effective
- `w-003` upon giving me notifications you need to run a deeper analysis based on social media data, j7 tracker, and the market data on whether or not you thibk it could be an interesting sell/buy
- `w-004` remeber that i need to build a good wallet/whale tracking technology
- `w-005` And for a coin dying you already have something better than chatter: the money actually leaving the pool. That's the thing itself, not a hint about it. Social going quiet is a guess about the future; liquidity draining is the present tense, and you get it in seconds rather than hours.
  - ! provenance: these are MY words from chat, kept on Connal's instruction — not his phrasing. recorded as an adopted principle, not as something he said. the distinction matters for [[70-AREAS/AREAS]]'s verbatim rule.
- `w-006` me and austin are committing to an organizational ritual of him taking the the role controlling the presentation of the feature within the MCII app and i will take the role of developing the functionality of the feature so when we develop the mcii analysis algorithm austin will handle the presentation of it within the app and when he is building something new in the app i will build the functionality part of it ie how a whale wallet tracker would actually work
  - ! this REFINES D-89 and should not stay only a whisper — D-89 splits work by SUBJECT (Connal: scanner/data/algorithms, Austin: the app), this splits it by LAYER (Connal: how it works, Austin: how it looks) across every feature. cleaner and more general. ! needs logging as a decision once Austin has confirmed it from his side — it is a two-person commitment and only one of them is in this conversation.
- `w-007` The main thing I found: don't build one algorithm that says both "buy or sell" and "how sure I am". Every serious version of this splits those into two separate steps. The first step picks a direction and is allowed to be trigger-happy. The second step's only job is to judge how often that first step is actually right — and that judgement is what decides how much money goes in, or whether any does. That matters for you specifically, because you asked for confidence to be "determined by me". Done as one blob it's just me sounding sure. Done as two steps, the confidence number has its own scorecard and can be proven wrong.

  Second thing, which answers the tweaking question you and I left open: the more versions of a rule you try and throw away, the better the surviving one has to look before it means anything. That's a real result with maths behind it, not a preference. So we count every version we try, starting from the first one — you can't add that count in later, and without it a good-looking result is mostly just the best of forty coin flips.

  I also found a problem worth fixing before you build anything. The app's live numbers and the saved history can be up to half an hour apart, so a rule built against one and tested against the other will look like it works when it doesn't.

  So the one thing to decide first: which set of numbers the algorithm reads — the live ones the app sees while it's open, or the saved half-hourly record. Tell me which and I'll build the picking logic on top of it.
  - ! provenance: MY words from chat, kept on Connal's instruction — not his phrasing. same case as `w-005`.
- `w-008` i bought in 15 on doge - 1 and it is going crazy riht now i got out 20$ when it shot to 35 and now and put in 5 more. remeber this for evidence of what the algoithm should be looking for.
  - ! captured 2026-09-01 while it was happening. this is a LIVE TRADE, not a memory — ∴ the numbers
    are the only ones that will ever be exact. DOGE-1 = `DpBzjtgGLF7QA9Ug3eUVGbnqa6j3jvYBn1XuQuktvfhm`.
  - ! `est:` reading of the sequence, conf 70%, NOT his words: in $15 → position reached ~$35 →
    withdrew $20 (original stake + $5) → re-entered $5. ∴ he is now playing on realised profit with
    his stake recovered. ? unclear whether the $5 back in is on top of a remaining position or the
    whole of it — ASK before using these numbers as a worked example.
  - ! THE POINT HE IS MAKING is the important part and must not get lost under the arithmetic: he
    wants the algorithm judged against a real trade that actually worked, rather than against
    backtested history. ∴ the question this whisper poses is **"what was visible BEFORE it moved"**
    — and answering it needs the market/social record for this coin from before the run, which is
    exactly the 4.6-day gappy history problem. ! do not let this become a story told after the fact
    (`narrative-fitting`, banned in [[mandate]]); the only honest use of it is checking what the
    data showed in advance.
- the ability to make inferences about how real world events will affect crypto markets ie doge - 1 rocket launch leading to spike in prices. how we would make this work i dont know and also wondering if we have a way for the system to tell if someone like elon on someone with massive pull or large crypto traders/wallets/whales make tweets and how we analyze them
- `w-009` social media as a social market and exploring that idea
  - ! captured while it was being built — this is the reframe that produced
    `app/shared/socialmarket.js` and it is bigger than that file. the measurement that backed it:
    a single sweep's posts name ~152 DISTINCT COINS and the app was reporting a median of 3.
    ∴ Twitter is a market we can already see the whole of, and we were looking at 2% of it.
  - ! the unexplored half is the one worth keeping: if it is a market, it has the properties of a
    market — breadth, rotation, concentration, and a whole-market MOOD independent of any coin.
    ? does attention rotate between sectors the way money does? ? is there a "social market cap"
    (total attention) that expands and contracts? ? when attention concentrates into few coins vs
    spreads across many, is that itself a regime signal? none of these are built or tested.
- telos
- no but i do want you to analyze it and present that analysis to me in an app it doesnt mean we
  shouldnt analyze it tell me in the app as an indicator PLEASE STOP TRYING TO NOT GIVE ME BUY
  INDICATORS ON WHAT YOU THINK IS WEAK GROUNDS

