---
id: area.observatory.design
t: area-design
v: 1
upd: 2026-08-29
machine: austin
---
# THE OBSERVATORY — design language

Extracted from Peter's spatial-UI handoff + what was actually decided for MCII's version (cold,
space-station register, not Peter's warm-brass one). Written to be REUSABLE — if a second spatial
room ever gets built in this app, or a non-spatial screen wants the same visual family, the
principles below apply; they are not wired to the Observatory's specific geometry.

## THE ONE IDEA
> The instruments are bolted to YOU. The room is beyond them.
Motion parallax between a fixed foreground and a moving background is the strongest depth cue
available and it is nearly free. It also keeps instruments readable while navigating — if the
boards rotated with the room, turning would swing half the wall out of frame.

## COLOUR LAW — six subsystem hues, each one a WORD, never decoration
| hue | means | where it is allowed |
|---|---|---|
| cyan-blue | THE MACHINE | the globe, active selection, live ticks |
| green | UP / HEALTHY | gains, nominal lamps |
| red | DOWN / WARNING | losses, warning lamps, guarded controls |
| amber | CAUTION / STALE | degraded feeds, advisory lamps |
| violet | THE SIGNAL LAYER | social/behavioural data ONLY — never a fill, never a gradient, never
| | | beside blue in a ramp (this is the closest hue to AI-slop purple; the guard is real) |
| bone | STRUCTURE | labels, rules, placards |

Two hard guards: never a gradient BETWEEN two subsystem hues (blue→violet is the most recognisable
AI-generated-UI tell there is). Never colour a container — colour the READING, never the box; a red
panel means nothing and burns the ability to say something with red later.

## TYPE
Every number/ticker/timestamp is monospace with `font-variant-numeric: tabular-nums` — not style,
column alignment; a proportional price column jitters its own width as digits change. Everything
else (labels, prose) is the system sans stack. 11px uppercase micro-labels at `letter-spacing:
0.20em` is "the station voice" — used for every board header and placard.

## MOTION
Transitions: 120/180/240/300ms, one easing curve everywhere (`cubic-bezier(0.3,0.86,0.36,1)`), no
bounce/spring. Ambient motion (the globe breathing/drifting) is a SEPARATE class, exempt from that
cap, but: never linear, never synchronised between elements, <8% amplitude, suspended when the
window is hidden, off entirely under `prefers-reduced-motion`.
!! only ever animate `opacity`, `transform`, `filter`, `color`. Never `width/height/top/left` —
forces layout recalc every frame. Never animate `filter: blur()` across a large layer — see LOG.md,
this one cost real time to diagnose (reads as BOTH "laggy" and "no animation" from one bug).

## THE ANTI-EMPTINESS RULE
Every large surface carries structure at two scales — a macro form read in one glance, micro
texture (etched grids, rivets, screw heads, placards) noticed at arm's length. BUT every mark is
either encoding real data or is structural — a tick mark or waveform that maps to nothing is a lie,
and once the eye catches one fake mark it stops trusting the real instruments too.

## NO TWO INSTRUMENTS ALIKE
An operator reads a panel by SHAPE before they read a label. Six identical cards is a card grid —
banned outright — because it throws away the cheapest source of legibility there is. Six silhouettes
exist, each earned by the reading it carries:
| reading | instrument | why that shape |
|---|---|---|
| value in a known range | arc gauge + needle | position on an arc is preattentive |
| several categories compared | channel strip, horizontal segments | a lit-count reads back as a number |
| value over time | strip chart / sparkline | shape over time IS the reading |
| set of binary states | annunciator, grid of lamps | you read the PATTERN, not each cell |
| one number that matters most | odometer + tape | scale IS the hierarchy |
| a discrete choice | rotary selector | shows the whole range at rest; a dropdown hides it |

Rule for extending the wall: match instrument to board SPAN. Instruments that GROW with their data
(channel strip, annunciator) take the tall (span-2) board. Fixed-size instruments (arc, odometer,
rotary) take the short (span-1) board and must be SIZED TO FIT that board — see LOG.md's arc-gauge
entries for what happens when a fixed instrument is taller than its panel.

## HARDWARE FURNITURE (structural, not decorative — the only category allowed to be decorative)
Placards (small monospace tag, a real taxonomy — `MKT-1`, `SIG-1`, `SYS-2`), rivets, cable clamps,
hazard-tape on sealed doors, screw heads on board corners. These are the highest-leverage detail
for not looking AI-generated, because no generic template has a reason to contain them.

## THE BANNED LIST (refuse on sight — this is what a generic AI-generated UI looks like)
Indigo→purple gradients (any gradient between two hues, really) · identical cards in a row ·
`border-radius` above ~10px · centred hero + subtitle + two buttons · emoji as iconography ·
glassmorphism applied because it looks modern · one accent colour used uniformly on everything ·
bounce/spring/elastic easing · a tab bar for room navigation.

## THE TEST
Screenshot the room. Ask: could this be any other product? If yes, it isn't finished. The specific,
slightly obsessive details — placards, a real subsystem taxonomy, a serial number on the sill — are
worthless to a generic template, which is exactly why they work.
