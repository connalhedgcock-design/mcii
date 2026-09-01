/**
 * Regressions for the Observatory's stylesheet.
 *
 * Every assertion here is a bug that actually shipped, was reported by the
 * operator as something else entirely, and cost a round trip to find. They all
 * share a shape: the CSS parses, the braces balance, the room still renders, and
 * the defect shows up only as motion or as a colour that comes and goes. None of
 * them are catchable by reading the file, which is why they are catchable here.
 */
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}${x ? '  ' + x : ''}`); }
  else { fail++; console.log(`  FAIL  ${n}${x ? '  ' + x : ''}`); }
};

const raw = fs.readFileSync(
  path.join(process.cwd(), 'renderer/station/station.css'), 'utf8');
// ⚠️ Assert against CODE, not prose. This file's comments quote the very
// declarations they warn against — "do not add will-change: opacity here" — and
// the first version of this suite dutifully failed on its own documentation.
// Comments can also carry unbalanced braces, which would break the brace count.
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

/** The declaration block that follows a selector, by brace matching. */
function blockAfter(src, idx) {
  const open = src.indexOf('{', idx);
  if (open < 0) return '';
  let depth = 1, i = open + 1;
  while (i < src.length && depth) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; i++; }
  return src.slice(open + 1, i - 1);
}

// ── 1. braces ────────────────────────────────────────────────────────────────
// ⚠️ A line-based edit that deletes a rule can leave half of one behind. It
// happened: removing an animation left a dangling `to { … } }`, the sheet still
// "worked", and every rule after it silently stopped applying.
check('braces balance',
  (css.match(/\{/g) || []).length === (css.match(/\}/g) || []).length,
  `${(css.match(/\{/g) || []).length} open / ${(css.match(/\}/g) || []).length} close`);

// ⚠️ And the nastier variant: deleting a rule's declarations but leaving its
// SELECTOR LIST, which then merges into the next rule and silently restyles it.
// That is how the window band ended up wearing the white panel's styling and the
// windows went black. A selector list ending in a comma with no selector after it
// (only a comment) is the fingerprint.
check('no selector list left dangling by a deleted rule',
  !/,\s*(?:\/\*(?:[^*]|\*(?!\/))*\*\/\s*)*\{/.test(css));

// ── 2. animation cost ────────────────────────────────────────────────────────
// ⚠️ THE LAG, TWICE. `background-position` is a paint property and `filter`
// forces a re-raster of the element and everything it groups; both were animated
// here across ~25 panes, under a comment claiming the compositor owned them.
// Only transform and opacity are composited. This is checkable, so check it.
const keyframeProps = [];
for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
  const body = blockAfter(css, m.index);
  for (const p of body.matchAll(/(^|[{;\s])([a-z-]+)\s*:/g)) {
    const prop = p[2];
    if (prop !== 'transform' && prop !== 'opacity') keyframeProps.push(`${m[1]}:${prop}`);
  }
}
check('no @keyframes animates a paint property',
  keyframeProps.length === 0, keyframeProps.join(', ') || 'transform/opacity only');

// ── 3. the 3D chain ──────────────────────────────────────────────────────────
// ⚠️ The single most expensive rule in this file: a grouping property on the
// element carrying `transform-style: preserve-3d` forces a flattened
// representation, preserve-3d is SILENTLY ignored, and the room loses its depth
// while every transform still looks correct in the source.
const worldIdx = css.search(/^\.st-beyond-world\s*\{/m);
const world = worldIdx >= 0 ? blockAfter(css, worldIdx) : '';
check('.st-beyond-world exists and declares preserve-3d',
  /transform-style:\s*preserve-3d/.test(world));
const grouping = ['filter', 'clip-path', 'mask', 'mask-image', 'overflow', 'backdrop-filter']
  .filter((p) => new RegExp(`(^|[;{\\s])${p}\\s*:`).test(world));
if (/(^|[;{\s])opacity\s*:\s*(0?\.\d+|0)\s*;/.test(world)) grouping.push('opacity<1');
check('.st-beyond-world carries no grouping property',
  grouping.length === 0, grouping.join(', ') || 'clean');

// ── 4. layer stability ───────────────────────────────────────────────────────
// ⚠️ THE FLICKER. Without an explicit hint Chromium composites these implicitly:
// promoting on turn, demoting after, and re-rasterising each facet as its
// projected scale changes every frame. Groups of elements get missed during that
// redraw, which reads as a panel's surface dropping out mid-turn.
for (const sel of ['.st-hull-seg', '.st-hull-jamb', '.st-vault', '.st-portal', '.st-beyond-floor'])
  check(`${sel} is promoted with will-change:transform`,
    new RegExp(`${sel.replace('.', '\\.')}[^{]*\\{[^}]*will-change:\\s*transform`).test(css)
    || new RegExp(`${sel.replace('.', '\\.')}\\s*,[\\s\\S]{0,220}?will-change:\\s*transform`).test(css));

// ⚠️ ...but ONLY transform. `will-change: opacity` / `filter` create exactly the
// flattened representation that rule 3 exists to prevent.
check('will-change never asks for a grouping property',
  !/will-change:\s*[^;]*\b(opacity|filter|mask|clip-path)\b/.test(css));

// ── 5. the panes carry no bitmap ─────────────────────────────────────────────
// ⚠️ "The colour goes away to the default blue when I move" was a pane's
// background IMAGE being dropped and repainted during a turn. The sky belongs to
// one flat backdrop behind the room; a pane paints gradients only.
check('no leftover per-pane sky image',
  !/--sky-img|--st-sky-img|--st-sky-w/.test(css),
  'panes are gradients only');

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
