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

/** Is the CLI present, and does it already have a signed-in account? */
function status() {
  const bin = findClaude({ refresh: true });
  if (!bin) return { installed: false, ready: false };
  // Presence of the credential store is the cheap check. Asking the CLI itself
  // would cost a round trip on every window focus.
  const signedIn = ['.credentials.json', 'credentials.json']
    .some((f) => fs.existsSync(path.join(os.homedir(), '.claude', f)))
    || fs.existsSync(path.join(os.homedir(), '.config', 'claude', 'credentials.json'));
  return { installed: true, ready: signedIn, path: bin };
}

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
].join(' ');

/**
 * Ask Orion something. Resolves { ok, reply } or { ok:false, error, code }.
 * `code` lets the renderer tell "not installed" from "not signed in" from
 * "it broke" — three different things that must never look the same.
 */
function ask(text) {
  return new Promise((resolve) => {
    const s = status();
    if (!s.installed) {
      return resolve({ ok: false, code: 'no-cli',
        error: 'The Claude CLI is not installed on this machine.' });
    }
    const child = execFile(s.path,
      ['-p', String(text), '--append-system-prompt', SYSTEM],
      { cwd: REPO, timeout: 180000, maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: 'mcii-observatory' } },
      (err, stdout, stderr) => {
        const out = String(stdout || '').trim();
        const msg = String(stderr || err?.message || '');
        if (!err && out) return resolve({ ok: true, reply: out });
        // Auth failures are the common case and deserve their own path: the
        // answer is a button, not an apology.
        if (/log ?in|unauthor|authenticat|api key|credential|not signed/i.test(msg)) {
          return resolve({ ok: false, code: 'auth',
            error: 'Not signed in to Claude on this machine.' });
        }
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
  if (!s.installed) return { ok: false, code: 'no-cli' };
  return new Promise((resolve) => {
    execFile('osascript', [
      '-e', 'tell application "Terminal" to activate',
      '-e', `tell application "Terminal" to do script "${s.path} /login"`,
    ], (err) => resolve(err ? { ok: false, error: String(err.message) } : { ok: true }));
  });
}

module.exports = { ask, status, login, findClaude };
