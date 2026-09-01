---
id: area.observatory.design
t: area-design
v: 4
upd: 2026-09-01
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

## THE FLAT ROOMS SPEAK THIS TOO (2026-08-31)
!! this doc used to describe the Observatory only, and `renderer/style.css` had drifted into a
SECOND design system: its own hex palette, its own accent, its own nine label sizes. Both files
declared `:root` and neither knew about the other, so green-in-the-room and green-on-a-card were
literally different greens and walking through a door read as leaving the app. Fixed — what changed,
and the three traps that produced it:
- ✓ **one palette.** `style.css`'s names (`--ok`, `--crit`, `--warn`, `--panel`, …) are now ALIASES
  onto the `--st-*` tokens. ! never put a literal colour in `style.css` again — add it to
  station.css's palette and alias it, or the drift restarts. (`--accent` survives as a legacy alias
  onto the machine hue so an un-migrated rule cannot land back on amber.)
- ✓ **amber means caution and nothing else.** It had been the brand colour AND the warning colour:
  `#D9903F` against `#D9A93F`, indistinguishable at the 9–11px these labels render at. A hue on the
  logo, every link, every focus ring and every headline number cannot also mean "this feed is
  stale". Everything meaning "the system is doing something" — live ticks, active tab, selection,
  what you can click, "this one is yours" — moved to the machine hue, which is what the colour law
  above said all along. `X` "one accent colour used uniformly on everything" was on the banned list
  the whole time and the flat rooms were doing it in the caution hue.
- ✓ **three voice rungs, not nine sizes × ten trackings.** `--voice` 11px/.20em is the placard
  register (`.st-label`). `--voice-sm` 9.5px/.14em is stat keys, chips, badges. Controls keep 11px
  at .14em — a button is a word you click, not a plate bolted to a panel, the same deliberate
  two-register split the door-plate/sill pair already uses. Use the vars; do not type a size.
- ✓ **the furniture crossed the threshold.** `X` the glowing amber corner brackets that were on
  every `.card` and `.jbox` — stock sci-fi HUD, drawn in the caution hue, and identical on every
  panel, which is the banned "identical cards in a row". Replaced with screws, an etched grid on
  `.stats` (masked, structural, encodes nothing) and a placard.
- the placard taxonomy is REAL and shared: `MKT-*`, `SIG-*`, `SYS-*`, `LIQ-*` belong to the room's
  boards (`station-geometry.js: BOARDS`); the flat rooms took `WCH-*` (watchlist bay numbers, not
  coin IDs — the coin's unique tail is already printed beside its name), `LOG-*`, `POS-*`, `FOL-*`,
  and `EXT-*` for the venue rooms. ! extend it, never restart it.
- the venue rooms get `EXT-1`/`EXT-2` in the bar rather than a corner placard, because they label
  the whole viewport, not one board. The visual jump to somebody else's product is real and
  permanent — naming it as an external feed makes it read as a viewport onto another system rather
  than as this app losing its footing.
- `X` hazard tape along the venue frame's threshold (proposed 08-31, rejected by operator on taste,
  same day, never built). The reasoning was that the app already uses hazard striping on sealed
  doors so it would mark "past this line is not MCII" in a vocabulary the app speaks. Do not
  re-propose. ! the constraint that shaped it still holds and is the thing to remember: a
  `WebContentsView` is a NATIVE layer above the DOM, so nothing can be drawn ON the venue page —
  every idea for these rooms has to live in the frame around the rectangle, never over it.

## THE ROOM IS A RING CORRIDOR (operator, 08-31)
!! The Observatory had a floor and a ceiling and NOTHING BETWEEN THEM — seven arches standing in
open dark. The operator's words: "instead of just rooms in like black nothingness i want it to
actually look like a space station". ✓ The diagnosis that mattered: it was not missing TEXTURE, it
was missing a HULL. No amount of pattern on the black would have fixed it, and that is the trap to
remember — "the background is too plain" reads as a surface-detail problem and was a structural one.

✓ Built: `.st-hull-seg` + `.st-hull-cornice`, a cylinder section at the doors' own radius, 33 facets
each, generated by `station-geometry.js: hullSegments()`. Doors are drawn OVER it, so a doorway is
an arch mounted on a wall rather than an aperture cut through one.

- ✓ **REGISTER: futuristic, not used-future** (operator, explicit). Smooth panels, machined seams,
  recessed bays, a continuous light cove. `X` rivets, grime, hazard tape, worn edges on the HULL —
  the industrial hardware stays on the instruments hanging in front of it, and that contrast is
  deliberate: the panels are equipment, the hull is architecture.
- ! **ARCHITECTURE IS LOW-CHROMA, ALWAYS.** Every hull colour sits under chroma 0.03. Chroma above
  ~0.1 is reserved for the subsystem hues — a wall that glows cyan spends the one hue that has a job.
- ! **The hull sits BEHIND the door ring (`HULL_Z = 14`).** At the doors' own radius the two are
  coplanar, the depth sort is arbitrary and the wall paints over the arches — they vanish entirely
  and the room reads as a smooth tube with name plates floating on it. Asserted in station.test.js.
- ! **Facet detail is positioned in the facet's OWN box, and getting that box wrong costs a whole
  iteration silently.** The first pass ran the box from world y −900 and put the cove at 7% — world
  y −828, far above the window, behind the ceiling. The wall rendered as one flat sheet through two
  passes while every theory was about the wrong thing. The mapping is now written into the CSS.
- ! **Seam widths are in WORLD px and the ring projects at ~0.475.** Anything under ~3px lands on a
  sub-pixel and disappears. 2px seams rendered as no seams at all.
- ! **A recess is a surface in shadow, not a hole.** Bays drawn too dark read as windows onto the
  void — the exact thing the hull exists to remove, reintroduced one rectangle at a time.
- the vault's alpha was raised (0.62→0.94 at its near edge): at the old value the void showed
  through the ceiling and it read as a scrim laid over the picture rather than the roof you are
  under. Enclosure lost to a number nobody would have questioned.
- the deck's transverse joints are HAND-PLACED and spread as they come toward you, for the same
  reason the ceiling ribs are: `repeating-linear-gradient` cannot vary its own spacing, and even
  spacing after projection is exactly the tell that a surface is fake.
- !! **THE FIRST BUILD WAS TOO DARK TO SEE AND THE OPERATOR'S VERDICT WAS "it literally looks the
  exact same".** The hull ran 0.09–0.19 lightness against a 0.09 void, because "instruments stay
  brightest" was read as "hold everything else at black". A wall you have to go looking for is not a
  wall. Raised to ~0.15–0.34 with the deck, cove and bridge base lifted to match, and the panels
  still read fine — real instruments hold their hierarchy through their own frames and lit readouts,
  the way they do against a lit bulkhead. ! that rule is about RELATIVE hierarchy between elements,
  never a licence to crush the whole scene to the bottom of the range.
- ✓ KEPT, on operator instruction: the Orion globe and all six instrument panels. The environment
  around them is fair game; they are not.

## THE ROOM, REBUILT AS A REAL INTERIOR (operator, 09-01)
Operator: "make the background look fully like you are in a futuristic space station", and on the
first hull: the ceiling "does not look like a room and it extends past the doors", the floor is
"just grid panels", the doors "look in front of the actual walls, more of a portal rather than a
door". All four were fair. What the rebuild settled:

- ✓ **BLUE STRUCTURE, WHITE PANELS, ~70/30.** Operator's call, and it is the palette law for the
  room now. Blue carries the frame, the shadow and the light; white is the panel material set into
  it. `X` beige and warm neutrals — proposed off the back of NASA's ISS interior spec, rejected on
  sight ("beige is wierd"). ! blue-dominant does NOT mean dark blue; see the too-dark entry above.
- ✓ **ORIENTATION GRADIENT: overhead brightest → wall mid → deck darkest.** Not taste. NASA's ISS
  interior colour work (SSP 50008) uses exactly this, because crews read "which way is up" from
  which surface is brighter and report feeling upright when the brighter field is overhead. It is
  also the cheapest way to make a rendered box read as a room. ! do not brighten the deck past the
  wall; it inverts the cue and the room starts reading upside down.
- ✓ **DOORS ARE HOLES IN THE WALL, not plates in front of it.** `WALL_Z` is NEGATIVE: the wall face
  sits 16px in FRONT of the door ring, and `.st-hull-jamb` cuts the opening out with `clip-path`
  (legal only because it is a leaf). The door is then seen 16px back through a hole with the wall's
  own thickness showing as a reveal. This single change did more than every surface treatment.
  ! the hole is scaled by (RING+WALL_Z)/RING — an identically-sized hole in a nearer plane subtends
  a WIDER angle and leaves a sliver of void down each side of the door.
- ✓ **FACET SPACING IS 7°, and that is load-bearing.** Every door angle (0, ±28, ±56, ±84) is a
  multiple of 7, so every door lands on a facet CENTRE and the wall can open cleanly for it.
  Asserted. At 8° the doors landed between facets and every opening needed a half-panel fudge.
- ✓ **THE OVERHEAD IS PER-FACET AND BELONGS TO THE RING**, so it stops where the corridor stops.
  `X` the screen-fixed ceiling: `left:-25%; right:-25%` ran it out past the last door on both sides,
  which is exactly the "extends past the doors" complaint. Retired, not deleted — `render()` still
  writes `starPan()` to `.st-ceil-stars` and a missing node throws there.
- !! **A TIPPED FACET NEEDS A TIGHTER ANGULAR BOUND THAN A VERTICAL ONE.** The vault leans forward
  off the wall, so its near edge sits hundreds of px closer to the camera than its base. At the
  wall's own 85° limit the tilt carried that edge past the camera plane and the facet re-projected
  as a bright diagonal raking across the doors and the globe. `vaultVisible()` bounds it at 45° and
  the vault was shortened to 380px so it reaches less far across the room. Found by bisection —
  hiding the vault removed the streaks, then halving the visible span located them — because the
  geometry that produced it is two transforms away from where it appears.
- ✓ the deck is plate, not wireframe: hand-placed transverse joints that spread toward you, a centre
  runner down the axis, and the cove's specular return. That return is most of what separates
  "polished deck" from "dark carpet".
- ✓ space-station kit on the bulkheads: louvred return-air grilles, panel fasteners, door placards.

## THE ROOM, SECOND PASS: GLAZING, MOTION, AND THE TURN (operator, 09-01)
- !! **FLICKER ON A TURN WAS PANELS BEING DELETED MID-ROTATION.** `render()` runs the instant the
  heading changes, while the CSS transition is still playing, so pruning to the NEW heading's
  visible set removes wall and vault panels out from under a rotation that is still showing them.
  The room now holds the UNION of the old and new headings for the length of the turn and prunes
  once, when nothing is moving (`setDoor()`, `settling`). ! any future visibility rule keyed to
  heading must do the same, or it reintroduces exactly this.
- !! **"THE TEXT IS BEHIND THE PANELS" WAS A REGRESSION FROM RECESSING THE DOORS.** Once the wall
  moved in FRONT of the door ring, anything left on the door's own plane — the door plate — was
  behind the bulkhead and simply gone. Fixed with `translateZ(30px)` on `.st-portal-plate`, which
  is also where a real door placard lives: on the wall, not floating in the opening.
- ✓ **ONE SKY, WRAPPED ROUND THE RING.** Every pane carrying its own copy of `--st-sky` put the
  same planet in all six windows at once, which is the fastest way to say "wallpaper, not windows".
  `skyAt()` sizes the sky to the corridor and offsets each pane to its own slice.
  ! but NOT to the full 266°: sized that way it was continuous, correct, and looked like nothing —
  each 118px pane showed 2.6% of the sky, so the planet sat in two panes off to one side and every
  other window was empty. 1700px is the number: a viewful spans ~70% of the sky, and the repeat
  lands ~100° away so two planets are never in frame together.
  ! the drift animates background-position-Y ONLY. Panning horizontally slides each pane off its
  slice and walks the planet from one window into the next.
- ✓ **space is TV space, not photographic space** (operator: "not actuality space, tv space"). Real
  space is mostly empty and slightly boring; this has a dust lane, nebulosity with a findable edge,
  a planet, two moons, and stars at three magnitudes so the eye reads a distribution rather than
  noise. Content is spread across the sky's width so no slice of it is dead.
- ✓ **the window band above the doors.** Doors shortened (560→500, top −400→−340) and the wall
  raised (−560→−660) to open it. ! this budget is zero-sum: the camera stands at the ring's centre,
  so vertical frame is scarce — the window band and the overhead are spending the same pixels. At a
  wall top of −760 there is no room left for a vault at all.
- ✓ **the vault is phase-locked to the doors at 14°.** Every door angle is an EVEN multiple of 14
  and every pillar an odd one, so a rib sits over each doorway and a glazed bay over each pillar, at
  every heading. At the wall's own 7° the ribs landed wherever and the overhead read as a separate
  object resting on the room. Halving the facet count also halves what a turn re-rasterises.
- ✓ ambience: the cove breathes (27s), air moves through the return grilles (19s), the sky drifts
  (240s). ! deliberately unsynchronised — two ambient loops on one clock read as a single stutter.
- ! **ASSERT THE INVARIANT, NOT THE IMPLEMENTATION.** The vault test pinned "at least 9 facets" and
  failed the moment facets got WIDER, while covering more of the room than before. It asserts
  angular coverage now. A test that pins the detail instead of the invariant fails on improvements.

## PERFORMANCE: WHAT THE COMPOSITOR ACTUALLY OWNS (09-01)
!! Operator, twice: the turn is laggy. Both times the cause was in this file, and both times a
comment right above the offending rule claimed the opposite.
- `X` **animating `background-position`.** It is a PAINT property. Animating it on ~25 panes meant
  repainting a multi-layer gradient stack on every one, every frame, on top of a heading change that
  already re-rasterises the room.
- `X` **animating `filter: brightness()`** across the bulkhead. `filter` forces a re-raster of the
  element and everything it groups. This file ALREADY carried the warning — "never animate filter
  across a large layer" — and it got broken anyway, by me, with a comment asserting it was cheap.
- ✓ **ONLY `transform` AND `opacity` MAY BE ANIMATED IN THIS ROOM.** Both are composited; neither
  repaints. This is checkable: walk every `@keyframes` block and confirm the properties inside. Do
  that instead of trusting the comment above the rule.
- ✓ **THE SKY IS PRERENDERED TO A BITMAP** (`buildSky()`, canvas → data URI). It was ~24 CSS gradient
  layers painted per pane on ~25 panes; a gradient stack is not free just because it is declarative,
  it is re-evaluated on every repaint, per element. One decode, then every pane is a blit.
  The tile is seamless and its width is a whole number of wall facets, which is what lets the panes
  line up — sizing the image at one scale and computing the offsets at another is what left the
  planets not lining up.
- ! **A LINE-BASED EDIT THAT DELETES A CSS RULE CAN LEAVE ITS SELECTOR LIST BEHIND.** Removing an
  animation declaration left `.st-hull-seg::before, .st-hull-jamb::after,` dangling, which merged
  into the NEXT rule's selector list and silently gave the window band the white panel's styling.
  The stylesheet still parsed and the braces still balanced. Symptom: the windows went black.
  Diagnosed by probing `getComputedStyle(pane, '::before')`, not by reading — the file looked right.
- ! the floor is PLATES, not a grid. Line-work over a flat tone is a wireframe however many lines
  you add. Two alternating radial wedges crossed with two alternating transverse bands give four
  tone levels, and the eye resolves those as panels before it ever sees a line.

## THE TURN: WHAT WAS ACTUALLY WRONG (operator, 09-01)
Three separate things were being reported as one word, "lag", and only one of them was paint cost.
- !! **"THE UI DISAPPEARS FOR A SECOND" WAS `.st-hub.is-yielded { opacity: 0.24 }`.** Not lag at
  all. The hub carries the globe AND the Orion prompt, and the pair dropped to a quarter opacity for
  520ms on every arrow press. The yield exists so the globe does not hide the door you are facing —
  a job now largely done by the architecture, since the door is a lit arch cut into a bright wall
  rather than a faint outline in the dark. Softened to 0.58 / 400ms. ! a deliberate effect that gets
  reported as a bug is a bug; check for one before optimising anything.
- !! **`void fresh.offsetWidth` IN `afterTurn()` FORCED A SYNCHRONOUS LAYOUT OF THE WHOLE 3D SCENE**
  — every facet, jamb, vault panel and portal — inside the keypress handler, on the critical path of
  the turn it was decorating. The smear node is freshly cloned and does not carry its class yet, so
  adding the class in a `requestAnimationFrame` restarts the animation just as reliably without
  demanding layout mid-handler.
- ✓ **EVERY PANE NOW PAINTS ITS OWN PRE-CUT SLICE, 1:1.** Measured: 18 panes carry sky, 0 of them
  scale it. Before, each pane scaled and tiled one large bitmap at a projected size on every frame.
- ✓ measured too: 44 hull elements exist, 20 are visible at any heading, and no `@keyframes` block
  in the room animates anything but `transform`/`opacity`. Those are checks, not claims — walk the
  stylesheet's keyframes and read the properties rather than trusting the comment above the rule.

## ALIGNMENT: WHY THE PLANETS KEPT NOT LINING UP
Three attempts, each failing differently, and the pattern is worth keeping:
1. one gradient sky per pane → the same planet in all six windows at once.
2. one shared image with per-pane offsets → continuous arithmetic, but the image was TILED, so the
   tile's seam and its repeat both landed inside one view: half a planet on one panel, something
   unrelated on the next.
3. ✓ **one sky spanning the whole corridor, cut into one exact slice per pane.** Adjacent crops of a
   single continuous image cannot disagree — there is no offset arithmetic left to get wrong. When a
   continuity bug survives two rounds of better arithmetic, stop improving the arithmetic and remove
   it from the problem.

## THE FLOOR NEEDED CONTRAST, NOT MORE STRUCTURE
`X` plates at 0.055 alpha. The structure was already right — alternating radial wedges crossed with
alternating transverse bands — and it was invisible, so the operator's verdict was unchanged: "still
just a blue grid". Tone differences between plates have to be readable BEFORE the joints are. !
raising plate CONTRAST is not the same as raising the deck's BRIGHTNESS; the deck stays the darkest
surface in the room (orientation gradient, above) and the plates read anyway.

## THE SKY IS A BACKDROP, NOT A SURFACE TREATMENT (operator, 09-01)
!! The operator got to this before I did, and the argument is geometric, not aesthetic:
> "if we are in a space station with curved walls, why should the sky outside also be curved and
> have that same perspective. it should be a backdrop... and flat. this causes the sky to look like
> stickers rather than actual space."

Exactly right, and it explains three separate bugs that had each been "fixed" twice:
- the wall is a CYLINDER around the camera, so anything painted on it inherits the cylinder's
  curvature and its per-facet breaks. Space is at infinity. A sky that curves with the wall and
  steps at every mullion has a sticker's projection, so it reads as a sticker.
- ✓ **ONE FLAT PLANE BEHIND THE ROOM** (`.st-sky-plate`), occluded by the hull, seen through
  openings CUT in the wall — the window band is transparent in the wall's own gradient, not a
  picture of a window. Panned with the heading at HALF the star layer's rate; parallax at infinity
  is a slide, never a rotation, and the depth cue is the DIFFERENCE between the two rates.
- ✓ alignment stopped being a problem rather than being solved again: there is one image, so there
  is nothing to align. Three prior attempts (per-pane gradients → shared image with per-pane offsets
  → per-pane crops) were all increasingly correct arithmetic applied to a wrong structure.
- ✓ **"the colour goes away to the default blue when I move" was the panes' background IMAGE being
  dropped and repainted during the turn**, showing the structural gradient underneath. Panes carry
  no bitmap now, so a turn re-rasterises only cheap gradients. A hole cannot flicker.
- ! the plate is MASKED to the band it is seen through. The room is not uniformly opaque — the deck
  deliberately fades out at the horizon — and unmasked, the starfield came through the FLOOR.
- ! the image is scaled so its full height lands inside that masked band. Sized to the plate's whole
  height, the band showed only the top fifth of the sky and every planet was outside it.

## PANELS: SCALES OF DETAIL, NOT MORE SHAPES
Operator: the panels are "blocky and toddler like", and want "more seams within them, a greater
feeling of connectivity". The rule, from model-making practice and the reason greebles work at all:
a surface reads as ENGINEERED when it carries a hierarchy of scales — large division, recessed
frame, seam, fastener — and as a toy when it carries one big rectangle and stops. The bulkhead
panels had two scales and now have four. ! symmetry is part of what reads as toy: the vertical seam
is deliberately off-centre.

## NO DISCLAIMERS, NO SELF-EXPLANATION (operator, 08-31)
`X` on-screen copy whose job is to explain the app to its user or reassure them about what it does
— privacy/no-keys notes, "how this works" text, onboarding prose. The audience is TWO PEOPLE and
both of them write the code. "we both know whats going on." That kind of copy is clutter here, not
care. ! do not confuse this with the plain-language prose about the MARKET DATA (the verdict
sentence on every card, the sector view's "what this does not tell you", the note that the folio
chart is a reconstruction) — that stays. Explaining the DATA is the product; explaining the APP is
noise.

## THE TEST
Screenshot the room. Ask: could this be any other product? If yes, it isn't finished. The specific,
slightly obsessive details — placards, a real subsystem taxonomy, a serial number on the sill — are
worthless to a generic template, which is exactly why they work.
