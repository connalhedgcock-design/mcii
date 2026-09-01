/**
 * The door ring, asserted against the GEOMETRY rather than against a comment.
 *
 * "→ turns right" is the kind of fact that gets written down in a comment three
 * functions above the handler that ignores it. Prose cannot be called; this can.
 */
const path = require('path');
const url = require('url');

let pass = 0, fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${x ? '  ' + x : ''}`); }
  else { fail++; console.log(`  FAIL  ${n}${x ? '  ' + x : ''}`); }
};

(async () => {
  const g = await import(url.pathToFileURL(
    path.join(process.cwd(), 'renderer/station/station-geometry.js')).href);

  // ── where you land ────────────────────────────────────────────────────────
  const home = g.homeIndex();
  check('you land on the watchlist, not merely the first built door',
    g.DOORS[home].id === 'watch', `-> ${g.DOORS[home].label}`);
  check('...and it is dead centre when you get there',
    Math.abs(g.offsetFor(home, home)) < 1e-9, `offset ${g.offsetFor(home, home)}`);

  // ── the sign that keeps getting written down and not used ─────────────────
  // On a ring at negative z, rotateY(θ)translateZ(-R) puts a door at
  // x = -R·sin(θ): a POSITIVE angle renders to the LEFT.
  const xs = g.DOORS.map((_, i) => g.screenX(i, home));
  check('screen-x DESCENDS as array index rises (positive angle = left)',
    xs.every((x, i) => i === 0 || x < xs[i - 1] + 1e-9),
    xs.map((x) => x.toFixed(2)).join(' > '));

  // ── the arrows ────────────────────────────────────────────────────────────
  // The one the acceptance list says to actually check.
  const right = g.stepDoorScreen(home, +1);
  const left  = g.stepDoorScreen(home, -1);
  check('→ selects the door that is to the RIGHT on screen',
    g.screenX(right, home) > g.screenX(home, home),
    `${g.DOORS[home].label} -> ${g.DOORS[right].label}`);
  check('← selects the door that is to the LEFT on screen',
    g.screenX(left, home) < g.screenX(home, home),
    `${g.DOORS[home].label} -> ${g.DOORS[left].label}`);

  // ── clamped, not wrapped ──────────────────────────────────────────────────
  // A room's walls have ends. Wrapping spins the room 124° in one frame.
  const leftmost = g.DOORS.length - 1;
  check('walking into the left wall stops you',
    g.stepDoorScreen(leftmost, -1) === leftmost);
  check('walking into the right wall stops you',
    g.stepDoorScreen(0, +1) === 0);

  // ── every door lands in the same place ────────────────────────────────────
  // A proportional turn puts each door somewhere different, and "the door I am
  // facing" then means nothing.
  check('facing any door puts it at exactly the same spot',
    g.DOORS.every((_, i) => Math.abs(g.offsetFor(i, i)) < 1e-9));

  // ── the perspective singularity ───────────────────────────────────────────
  // Past ~90° off heading a door's z goes positive, it crosses the camera plane
  // and re-projects at enormous scale. Six doors across ±62 means a maximum
  // offset of 124°, so this is reached every time you face an outermost door.
  const worst = Math.max(...g.DOORS.map((_, i) =>
    Math.max(...g.DOORS.map((__, j) => Math.abs(g.offsetFor(i, j))))));
  check('the ring really does exceed 90 degrees somewhere', worst > 90,
    `max offset ${worst.toFixed(1)}deg`);
  check('...and those doors are hidden rather than left to blow up',
    g.DOORS.every((_, i) => g.DOORS.every((__, j) =>
      Math.abs(g.offsetFor(i, j)) < 85 || !g.doorVisible(i, j))));
  check('the door you face is never hidden',
    g.DOORS.every((_, i) => g.doorVisible(i, i)));

  // ── sealed doors ──────────────────────────────────────────────────────────
  check('unbuilt doors carry no view to open',
    g.DOORS.every((d) => d.built || d.view === null));
  check('every built door names a real tab',
    g.DOORS.filter((d) => d.built).every((d) => typeof d.view === 'string' && d.view));

  // ── the gauge divide-by-zero ──────────────────────────────────────────────
  // 0 must render as an EMPTY track, never a full one: the gauge reporting
  // nothing must not look like the gauge reporting everything.
  check('a gauge with nothing to scale against reads EMPTY', g.fraction(5, 0) === 0);
  check('...and so does one with no value', g.fraction(undefined, 10) === 0);
  check('a gauge cannot exceed its own maximum', g.fraction(50, 10) === 1);

  // ── the two numbers that must agree with the CSS ──────────────────────────
  check('the yield outlasts the turn, but only barely',
    g.NAVIGATING_MS > g.TURN_MS && g.NAVIGATING_MS < g.TURN_MS * 2.5,
    `${g.NAVIGATING_MS}ms yield vs ${g.TURN_MS}ms turn`);

  // ── the board wall ────────────────────────────────────────────────────────
  check('no two boards share an instrument',
    new Set(g.BOARDS.map((b) => b.instrument)).size === g.BOARDS.length,
    `${g.BOARDS.length} boards, ${new Set(g.BOARDS.map((b) => b.instrument)).size} silhouettes`);
  const growing = new Set(['strips', 'annun']);
  check('instruments that GROW take the tall boards',
    g.BOARDS.filter((b) => growing.has(b.instrument)).every((b) => b.span === 2));
  check('instruments with a FIXED size take the short boards',
    g.BOARDS.filter((b) => !growing.has(b.instrument)).every((b) => b.span === 1));
  check('a short room drops boards rather than squashing them',
    g.boardsFor(600).length < g.boardsFor(900).length,
    `${g.boardsFor(600).length} of ${g.boardsFor(900).length}`);
  // ⚠️ The real invariant, not a magic number: the arch must FRAME the globe.
  // Asserted against the projection the CSS actually performs, so raising either
  // the globe or the door cannot silently swallow one in the other.
  const doorPx = g.doorScreenWidth();
  check('the arch always frames the globe, at every room height',
    [400, 700, 900, 1200, 2000].every((h) => g.globeSize(h) < doorPx),
    `door ${doorPx.toFixed(0)}px vs globe ${g.globeSize(2000)}px at the cap`);
  check('...and the globe is never smaller than legible', g.globeSize(400) >= 150);

  // ⚠️ Six doors on a ring spaced for five overlap. Asserted against the real
  // projection, at every heading, so widening a door or adding a seventh fails
  // here instead of looking like a rendering fault.
  const gap = g.tightestDoorGap();
  check('neighbouring doors never overlap, at any heading', gap > doorPx,
    `tightest gap ${gap.toFixed(0)}px vs door ${doorPx.toFixed(0)}px`);

  // ── the hull ──────────────────────────────────────────────────────────────
  // ⚠️ The failure mode these guard against is not a crash — it is a HAIRLINE, or
  // a facet raking across the middle of the room. Both read as rendering faults
  // and both are invisible in the source.
  const segs = g.hullSegments();
  const vault = g.vaultSegments();
  const chord = 2 * (g.RING + g.WALL_Z) * Math.sin((g.HULL_SEG_DEG / 2) * Math.PI / 180);
  check('facets are wide enough to butt, never gap',
    g.hullFacetWidth() >= chord - 1e-9,
    `${g.hullFacetWidth().toFixed(1)}px facet vs ${chord.toFixed(1)}px chord`);

  // ! The wall sits IN FRONT of the door ring. That is what makes a door read as
  // set INTO the wall instead of as a portal stuck on the front of one.
  check('the wall is in front of the door ring, so doors are recessed', g.WALL_Z < 0,
    `${g.WALL_Z}px`);

  // ⚠️ EVERY DOOR ANGLE MUST BE A FACET CENTRE. That is the whole reason the
  // spacing is 7 and not 8: it lets the wall open cleanly for a doorway. At 8°
  // the doors landed between facets and every opening needed a half-panel fudge.
  check('every door angle lands on a facet centre',
    g.DOORS.every((d) => Number.isInteger(d.angle / g.HULL_SEG_DEG)));
  check('no wall facet is left standing inside a doorway',
    segs.every((seg) => g.DOORS.every((d) =>
      Math.abs(seg.angle - d.angle) >= g.doorHalfAngle() - g.HULL_SEG_DEG / 2)));

  // The corridor has to run PAST the outermost door, or it visibly stops exactly
  // where the eye was sent and the void comes back at the edge of the frame.
  const outermost = Math.max(...g.DOORS.map((d) => Math.abs(d.angle)));
  check('the corridor runs past the outermost door', g.HULL_SPAN_DEG > outermost + 40,
    `hull ±${g.HULL_SPAN_DEG}° vs door ±${outermost}°`);
  check('glazed bays only appear out past the last door',
    segs.filter((x) => x.kind === 'window').every((x) => Math.abs(x.angle) > outermost),
    `${segs.filter((x) => x.kind === 'window').length} bays`);

  // ⚠️ THE VAULT NEEDS A TIGHTER BOUND THAN THE WALL, and this is the reason:
  // a vault facet is tipped forward off the wall, so its near edge sits far
  // closer to the camera than its base. Out near the wall's own 85° limit the
  // tilt carries that edge past the camera plane and the facet re-projects as a
  // bright diagonal raking across the doors and the globe.
  check('the vault is bounded more tightly than the wall',
    g.DOORS.every((_, f) =>
      vault.filter((v) => g.vaultVisible(v.angle, f))
        .every((v) => Math.abs(v.angle - g.DOORS[f].angle) < 85 - 20)));
  check('...but still spans the room at every heading',
    g.DOORS.every((_, f) => vault.filter((v) => g.vaultVisible(v.angle, f)).length >= 9),
    `fewest ${Math.min(...g.DOORS.map((_, f) => vault.filter((v) => g.vaultVisible(v.angle, f)).length))} facets`);
  check('the vault is glazed in bays, not one continuous pane',
    vault.some((v) => v.kind === 'glazed') && vault.some((v) => v.kind === 'rib'));

  // Same camera-plane rule the doors obey (§9.12), asserted at every heading.
  check('no wall facet is ever shown past the camera plane, at any heading',
    g.DOORS.every((_, f) => segs.filter((seg) => g.hullVisible(seg.angle, f))
      .every((seg) => Math.abs(seg.angle - g.DOORS[f].angle) < 85)));
  check('...and the wall is never empty at any heading',
    g.DOORS.every((_, f) => segs.filter((seg) => g.hullVisible(seg.angle, f)).length >= 6),
    `fewest ${Math.min(...g.DOORS.map((_, f) => segs.filter((seg) => g.hullVisible(seg.angle, f)).length))} facets`);

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
