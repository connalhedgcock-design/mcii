---
id: kb.alert-threshold-research
t: kb
v: 1
upd: 2026-09-05
machine: connal
prio: high
---
# SHOULD WEAK INDICATORS PUSH TO THE PHONE? — researched, and the answer is no

!! Connal, 2026-09-05, on whether a weak/unconfirmed indicator should be allowed to push a phone
notification or only appear in the app: "Potentially we have to research that." Researched.

## THE EVIDENCE
- fact @alerting best practice (SOC/monitoring literature): the working targets are a **false-
  positive rate below 10%** for anything that interrupts a person, and an **alert-to-action
  conversion above 20%**.
- fact @Microsoft/Omdia State of the SOC 2026: **46% of all security alerts are false positives**
  in practice — roughly half of every analyst's workload produces nothing.
- fact @clinical alarm literature: **74–99% of physiological monitor alarms are non-actionable**,
  and clinicians **override 49–96%** of interruptive warnings. Override rates exceed 90% in some
  settings.
- fact: **25–30% of alerts go uninvestigated entirely** once overload sets in.
- ∴ the failure mode is not "a bad alert wastes a second." It is that a person who learns alerts
  are usually wrong stops reading the one that matters. The evidence for that is overwhelming and
  it is measured in every field that has studied it.

## THIS PROJECT ALREADY REACHED THE SAME CONCLUSION BY INSTINCT — this is the receipt
D-114 capped the exit alert at $1,000 with exactly this reasoning, in Connal's own situation:
alerting on a drop irrelevant to his real position sizes "teaches him to ignore the alert that
eventually matters." The research above is that argument, measured, across three unrelated fields.

## ∴ THE ANSWER, AND HOW IT MAPS ONTO WHAT'S BUILT
- **GREEN tier (`admission.js`'s real admit bar) — push-eligible.** It requires two independent
  sensors agreeing and every gate cleared. That is the project's highest-confidence signal.
- **YELLOW tier — IN-APP ONLY, never a push.** Yellow is by construction the "real evidence, not
  enough of it" bucket, so its false-positive rate is high by design. Pushing it would blow past
  the 10% ceiling and take the green alerts' credibility down with it.
- **Self-name news candidates — definitively never a push.** Measured live the same night: before
  the crypto-context filter, roughly HALF the results were namesake collisions (Cate Blanchett for
  CATE, a Hugging Face robot for microduck, funeral notices for BONER). ~50% false-positive rate —
  five times the recommended ceiling for something allowed to interrupt someone.
- ! this does NOT conflict with D-119 ("show weak findings, labelled, never hide them"). Showing
  and interrupting are different acts: D-119 governs what appears on a screen, this governs what
  is allowed to buzz a phone. Weak evidence gets shown in full, always; it just doesn't get to
  interrupt.

## FALSIFIER
If, over a real stretch, Connal reports he checks the app rarely enough that in-app-only findings
go unseen for days, the tradeoff changes and this should be reweighed once — a signal nobody ever
sees has its own cost. Track that against real behaviour, not assumption.

## SOURCES
- [What Is Alert Fatigue? Causes, Risks & How to Reduce It (Panther)](https://panther.com/blog/what-is-alert-fatigue)
- [Alert Fatigue: What It Is & How to Fix It (Dropzone AI)](https://www.dropzone.ai/glossary/alert-fatigue-in-cybersecurity-definition-causes-modern-solutions-5tz9b)
- [Alert Fatigue (Vectra AI)](https://www.vectra.ai/topics/alert-fatigue)
- [AI Detection False Positives and Alert Fatigue (Adaptive Security)](https://www.adaptivesecurity.com/blog/ai-phishing-detection-false-positives)
