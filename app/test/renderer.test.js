const fs = require('fs');
const path = require('path');
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

const src = fs.readFileSync(path.join(process.cwd(), 'renderer/app.js'), 'utf8');
// Strip comments so the explanation of the bug does not read as the bug.
const code = src.replace(/^\s*\/\/.*$/gm, '');

// !! window.prompt() THROWS in Electron -- "prompt() is not supported" -- and takes the whole
// click handler with it. No error, no log, the button just does nothing. It killed:
//   Save & share my changes (nobody could publish from the app at all),
//   resolving a forecast (the calibration record), and naming a coin.
// Three dead buttons, live for days, because the failure produced silence rather than an error.
check('nothing calls window.prompt', !/(^|[^.\w])prompt\s*\(/.test(code),
  '(it throws in Electron and kills the handler)');
check('there is a replacement dialog', /function askText\(/.test(code));
check('the share button uses it', /askText\('What did you change/.test(code));
check('resolving a forecast uses it', /askText\('What would you have needed/.test(code));
check('naming a coin uses it', /askText\('What do you want to call/.test(code));

// alert and confirm DO work in Electron and are left alone -- verified, not assumed.
check('alert is still used for results', /alert\(/.test(code));

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
