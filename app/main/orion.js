/**
 * orion — the voice in the Observatory.
 *
 * Wired to the CLAUDE CLI, not to the Anthropic API. That is the whole point:
 * there is no API key anywhere in this project, nobody pays per token, and
 * whoever is sitting at the machine signs in with their own Claude account the
 * same way they would in a terminal.
 *
 * ⚠️ SHELL SAFETY. Every invocation uses execFile with an ARGUMENT ARRAY and no
 * shell. The prompt is user text that will contain quotes, backticks and
 * newlines; interpolating it into a command string would hand the user's own
 * shell to anything they pasted in.
 *
 * ⚠️ Orion runs with cwd = the repo, which is also the Obsidian vault. That is
 * deliberate and is what lets it answer from 50-LOG, 20-SPEC and the rest. It
 * inherits whatever permissions the CLI itself enforces; this file grants none
 * of its own.
 */

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.join(__dirname, '..', '..');

// Where the CLI actually lives. `which` from inside Electron is unreliable: a
// GUI app does not inherit the login shell's PATH, so a CLI that works
// perfectly in Terminal is simply invisible here. Look in the real places, then
// fall back to asking a login shell.
const CANDIDATES = [
  path.join(os.homedir(), '.claude', 'local', 'claude'),
  path.join(os.homedir(), '.local', 'bin', 'claude'),
  '/opt/homebrew/bin/claude',
  '/usr/local/bin/claude',
  '/usr/bin/claude',
];

let cached = null;

function fromLoginShell() {
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync(process.env.SHELL || '/bin/zsh', ['-lc', 'command -v claude'],
      { encoding: 'utf8', timeout: 5000 }).trim();
    return out && fs.existsSync(out) ? out : null;
  } catch { return null; }
}

function findClaude({ refresh = false } = {}) {
  if (cached && !refresh && fs.existsSync(cached)) return cached;
  cached = CANDIDATES.find((p) => { try { return fs.existsSync(p); } catch { return false; } })
    || fromLoginShell();
  return cached;
}

/** Is the CLI present, and is this machine signed in?
 *
 * ⚠️ `claude auth status --json` is the real answer and costs nothing — no
 * tokens, no round trip to the model. Two worse versions came before it: a
 * credentials FILE check (wrong — macOS keeps them in the Keychain, so it read
 * "not signed in" forever), and then not checking at all and letting the UI
 * imply the answer (worse — it showed a sign-in button to someone already
 * signed in, which is indistinguishable from being logged out). */
function status() {
  const bin = findClaude({ refresh: true });
  if (!bin) return { installed: false, ready: false };
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync(bin, ['auth', 'status', '--json'],
      { encoding: 'utf8', timeout: 15000, cwd: REPO });
    const j = JSON.parse(out);
    return { installed: true, ready: !!j.loggedIn, email: j.email || null,
             method: j.authMethod || null, path: bin };
  } catch (e) {
    // The CLI is there but would not answer. Report it as present and unknown
    // rather than as logged out: refusing to answer is not the same as "no".
    return { installed: true, ready: false, unknown: true, path: bin };
  }
}

// The CLI can also say this in the OUTPUT, with exit code 0. Treated as a normal
// answer it would be printed as though Orion had said it — a login prompt
// rendered as analysis. Match it before anything else.
const NOT_SIGNED_IN = /not logged in|please run \/login|claude auth login|unauthor|authenticat|invalid api key/i;

const SYSTEM = [
  'You are Orion, the voice of the MCII Observatory — a memecoin research station',
  'run by two beginners, Austin and Connal.',
  '',
  'You are NOT their trader and NOT a yes-man. Give grounded readings backed by',
  'the data in this repo and say plainly when the data does not support a claim.',
  'Never invent a number: if it is not in the repo or the message, say you do not',
  'have it. Explain WHY, not just what. Be brief — three or four sentences unless',
  'asked for more; this is a glance surface, not a chat window.',
  '',
  'You cannot place trades and must never tell them to buy or sell a specific',
  'asset. Describe what the evidence shows and what would change it.',
  '',
  'A <live-readings> block may accompany the question. That is the app\'s CURRENT',
  'state and is more up to date than the files in the repo, which are the shared',
  'historical record and can lag it by an hour. If the two disagree, prefer the',
  'live block and say the record has not caught up yet. Never tell them there is',
  'no data for a coin that appears in the live block.',
].join(' ');

/**
 * Ask Orion something. Resolves { ok, reply } or { ok:false, error, code }.
 * `code` lets the renderer tell "not installed" from "not signed in" from
 * "it broke" — three different things that must never look the same.
 */
function ask(text, live) {
  return new Promise((resolve) => {
    const s = status();
    if (!s.installed) {
      return resolve({ ok: false, code: 'no-cli',
        error: 'The Claude CLI is not installed on this machine.' });
    }
    // ⚠️ THE LIVE READINGS ARE NOT IN THE REPO. The app keeps them in its
    // sidecar under Application Support; the repo only carries what the hourly
    // cloud collector has written. A coin added an hour ago is fully populated on
    // screen and completely absent from data/market.jsonl — so Orion, reading
    // only files, would truthfully report "no market data" about a coin the
    // operator is looking at. Truthful and useless is still useless. Hand it the
    // current state alongside the question.
    const prompt = live
      ? `<live-readings note="what the app is showing right now; the repo files are the historical record and may lag this">\n${live}\n</live-readings>\n\n${text}`
      : String(text);

    const child = execFile(s.path,
      ['-p', prompt, '--append-system-prompt', SYSTEM],
      { cwd: REPO, timeout: 180000, maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: 'mcii-observatory' } },
      (err, stdout, stderr) => {
        const out = String(stdout || '').trim();
        const msg = String(stderr || err?.message || '');
        // ⚠️ Check the OUTPUT for a login prompt before treating it as an answer.
        if (NOT_SIGNED_IN.test(out) || NOT_SIGNED_IN.test(msg)) {
          return resolve({ ok: false, code: 'auth',
            error: 'Not signed in to Claude on this machine.' });
        }
        if (!err && out) return resolve({ ok: true, reply: out });
        if (err?.killed) {
          return resolve({ ok: false, code: 'timeout', error: 'Orion took too long and was stopped.' });
        }
        resolve({ ok: false, code: 'failed', error: msg.split('\n')[0] || 'Orion did not answer.' });
      });
    child.stdin?.end();
  });
}

/**
 * Sign in. The CLI's login is an interactive terminal flow that opens a browser,
 * so the honest thing is to hand the user a real terminal running it rather than
 * to fake a login screen inside the app and mishandle their credentials.
 * Electron never sees the account, the token, or the password.
 */
function login() {
  const s = status();
  if (!s.installed) return Promise.resolve({ ok: false, code: 'no-cli' });
  return new Promise((resolve) => {
    // ⚠️ AppleScript string escaping, done properly. The previous version
    // interpolated JSON.stringify(REPO) — which carries its own double quotes —
    // straight into `do script "..."`, producing nested unescaped quotes and an
    // AppleScript syntax error every time. It reported "could not open a
    // terminal" and looked like a permissions problem.
    const shell = `cd ${shQuote(REPO)} && ${shQuote(s.path)} auth login`;
    const asStr = (t) => '"' + String(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    execFile('osascript', [
      '-e', 'tell application "Terminal" to activate',
      '-e', `tell application "Terminal" to do script ${asStr(shell)}`,
    ], (err) => {
      if (!err) return resolve({ ok: true });
      // Terminal may be unavailable or blocked. Falling back to running the
      // login directly still opens the browser; it just has no visible console.
      execFile(s.path, ['auth', 'login'], { cwd: REPO, timeout: 5000 }, () => {});
      resolve({ ok: true, headless: true });
    });
  });
}

/** POSIX single-quote escaping. Paths here are ours, but a home directory with
 *  an apostrophe in it is not exotic and would otherwise break the command. */
function shQuote(v) {
  return "'" + String(v).replace(/'/g, `'\\''`) + "'";
}

module.exports = { ask, status, login, findClaude };
