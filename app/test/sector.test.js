const path = require('path');
const s = require(path.join(process.cwd(), 'shared/sector.js'));
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

const HOUR = 36e5, NOW = 1787932966842;
const post = (author, text, views = 100) => ({ authorId: author, text, views });

// --- what people are naming --------------------------------------------------
// The failure this guards against: a campaign reading as a trend. Three accounts posting about
// $PUSH twenty times must never outrank eight people mentioning $REAL once each.
const posts = [
  ...Array.from({ length: 20 }, (_, i) => post(`bot${i % 3}`, `$PUSH to the moon 100x`, 5000)),
  ...Array.from({ length: 8 }, (_, i) => post(`person${i}`, `anyone looking at $REAL`, 40)),
];
const tk = s.tickers(posts);
check('a coin named by more people ranks first', tk[0].ticker === 'REAL', `-> ${tk.map(t=>t.ticker).join(', ')}`);
check('...even though the other has far more posts', tk[1].ticker === 'PUSH' && tk[1].mentions > tk[0].mentions);
check('...and far more views', tk[1].views > tk[0].views);
check('people are counted distinctly', tk[0].people === 8 && tk[1].people === 3);

// One post naming the same coin repeatedly is one person caring, not six.
const rep = s.tickers([post('a', '$SAME $SAME $SAME $SAME'), post('b', '$SAME')]);
check('repeats inside one post count once', rep[0].mentions === 2, `-> ${rep[0].mentions}`);

check('a coin only one person mentioned is dropped', !s.tickers([post('a', '$LONE')]).length);
check('big coins are marked, not hidden', s.tickers([post('a','$SOL'),post('b','$SOL')])[0].major === true);
check('a campaign shows up as a push ratio', s.pushRatio(tk) > 0, `-> ${s.pushRatio(tk)}`);

// --- the market as a whole ---------------------------------------------------
const obs = [
  { ca: 'a', ts: NOW - 2 * HOUR, chg24: 40, liq: 100000 },
  { ca: 'a', ts: NOW - 1 * HOUR, chg24: 50, liq: 90000 },
  { ca: 'b', ts: NOW - 1 * HOUR, chg24: -30, liq: 60000 },
  { ca: 'c', ts: NOW - 1 * HOUR, chg24: -12, liq: 40000 },
  { ca: 'd', ts: NOW - 1 * HOUR, chg24: 0.5, liq: 80000 },
  { ca: 'e', ts: NOW - 1 * HOUR, chg24: 900, liq: 30000 },
];
const b = s.breadth(obs);
check('each coin counts once, using its newest reading', b.n === 5, `-> ${b.n}`);
check('up and down are counted', b.up === 2 && b.down === 2 && b.flat === 1, `-> ${b.up}/${b.down}/${b.flat}`);
// One coin up 900% must not drag the headline number. Medians are used precisely because this
// asset class produces numbers like 11,489% and a mean would report the outlier as the market.
check('a 900% outlier does not move the middle', Math.abs(b.median) < 15, `-> ${b.median}%`);

// --- survival ----------------------------------------------------------------
const old = (ca, liqNow) => ([
  { ca, ts: NOW - 40 * HOUR, chg24: 5, liq: 200000 },
  { ca, ts: NOW - 1 * HOUR, chg24: 5, liq: liqNow },
]);
const survObs = [...old('x', 5000), ...old('y', 800), ...old('z', 120000),
                 ...old('p', 400), ...old('q', 90000), ...old('r', 1200),
                 { ca: 'fresh', ts: NOW - 2 * HOUR, chg24: 3, liq: 50000 }];
const sv = s.cohort(survObs, { now: NOW });
check('a coin found an hour ago is too new to judge', sv.tracked === 6, `-> ${sv.tracked}`);
check('coins whose pool drained below the floor are counted', sv.drained === 4, `-> ${sv.drained}`);
// ! the bug this replaced: the old version reported 100% survival on live data, because it asked
// "of the coins that cleared the floor, how many still clear it" after dropping every coin that
// vanished. A coin that stops appearing must be reported as unknown, never as a survivor.
const stale = s.cohort([{ ca: 'gone', ts: NOW - 200 * HOUR, liq: 90000 },
                        { ca: 'gone', ts: NOW - 190 * HOUR, liq: 90000 }], { now: NOW });
check('a coin that stopped appearing is not counted as surviving', stale.tracked === 0, `-> ${stale.tracked}`);
check('...it is counted as unknown instead', stale.vanished === 1);

// --- the synthesis -----------------------------------------------------------
const out = s.synthesize({ breadth: b, cohort: sv, funnel: { universe: 60, survivors: 7, topRejects: [['liquidity only $X', 38]] },
  social: { uniqueAuthors: 40, posts: 60, shillRatio: 0.45 }, tickers: tk });
// The funnel leads because it is the only figure counted over everything looked at.
check('the scan result is stated first', /looked at 60 coins/.test(out.lines[0]), `-> ${out.lines[0]}`);
check('the reason most coins were dropped is second', /liquidity/.test(out.lines[1]), `-> ${out.lines[1]}`);
check('what happened to the cohort is reported without claiming a death rate',
  out.lines.some((l) => /less money in the pool/.test(l)) && !out.lines.some((l) => /survival rate/i.test(l)));
check('heavy sales language is called out', out.lines.some((l) => /sales language/.test(l)));
// D-43 and G-01: this screen must always carry its own limits.
check('it always says chatter is not a buy signal',
  out.caveats.some((c) => /not the same as being worth buying/.test(c)));
check('it admits the coins found have mostly already moved',
  out.caveats.some((c) => /already moved/.test(c)));
check('a small sample admits it is small', out.caveats.some((c) => /moves it a lot/.test(c)));
// ! stated every time, not only when the numbers look bad.
check('the survivorship bias is always disclosed',
  out.caveats.some((c) => /kinder than the truth/.test(c)) &&
  s.synthesize({}).caveats.some((c) => /kinder than the truth/.test(c)));
check('a thin sample refuses to be read for tone',
  s.synthesize({ social: { uniqueAuthors: 4 } }).caveats.some((c) => /Too few people/.test(c)));
check('no jargon reaches the screen',
  !/on-chain|z-score|pipeline|adapter|schema|throttle|provenance/i.test(out.lines.concat(out.caveats).join(' ')));

// Nothing collected must produce no claims rather than empty confident ones.
const empty = s.synthesize({ breadth: s.breadth([]), cohort: s.cohort([]), funnel: s.funnel([]) });
check('with no data it makes no claims', empty.lines.length === 0);
check('...and says the history is too short', empty.caveats.some((c) => /Not enough history/.test(c)));

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
