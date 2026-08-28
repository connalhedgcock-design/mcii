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

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
