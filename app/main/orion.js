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

// A resumed session the CLI no longer has (cleared, expired, or from before an
// upgrade) fails the whole turn instead of just forgetting -- and since this is
// keyed off the CLI's own wording, one bad match should not brick every future
// question. Detected once per turn, below, and healed by dropping back to a
// fresh conversation rather than surfacing it to the operator as an error.
const NO_SUCH_SESSION = /no conversation found with session id/i;

// Orion's memory of the current conversation, as a Claude Code session id. Kept
// in process memory only -- restarting the app starts a new conversation, the
// same way closing and reopening a chat app would. `--resume` is what turns a
// string of one-shot `claude -p` calls into an actual back-and-forth: without
// it, every question was answered with no idea what was asked before it.
let sessionId = null;

// ⚠️ ORION IS A GENERAL ASSISTANT THAT HAPPENS TO LIVE HERE — NOT A REPO QUERY TOOL.
//
// The first version told it to give "readings backed by the data in this repo" and to say it did
// not have anything absent from the repo. It obeyed, and the result was a bot that answered
// "that's an Axiom/wallet mechanics question, not something in this repo's data — I'm scoped to
// reading the observatory's records" to a perfectly ordinary question about moving USDC. Refusing
// a question you can answer, because of where the answer lives, is not caution — it is a worse
// assistant. The repo is Orion's PRIVILEGE (two sources nobody else has), never its CEILING.
const SYSTEM = [
  'You are Orion, the assistant inside CII — a memecoin research station run by two beginners,',
  'Austin and Connal. You are a general-purpose Claude assistant that happens to live in their',
  'app. Answer whatever they ask, on any subject, the way Claude normally would: wallet and',
  'bridging mechanics, what a term means, how some protocol works, an idea they are chewing on,',
  'or something with nothing to do with crypto at all.',
  '',
  '! NEVER refuse or deflect a question merely because its answer is not in this repo. If you know',
  'it, answer it. "That is not in this repo" is not a reason to be unhelpful, and saying you are',
  '"scoped to" the repo is wrong — you are not.',
  '',
  'You do have two sources nobody else has: this repo (their vault, notes and the shared',
  'historical record) and a <live-readings> block of the app\'s current state. Use them whenever',
  'the question touches their coins, positions, forecasts or notes.',
  '',
  'When a question is about THEIR data, stay grounded in it and never invent a figure — if a',
  'number is not in the repo, the live block or their message, say you do not have it. That rule',
  'is about their data only. It does not apply to general knowledge, where you should answer from',
  'what you know and flag real uncertainty the way you normally would.',
  '',
  'A <live-readings> block, when present, is the app\'s CURRENT state and is fresher than the repo',
  'files, which are the shared historical record and can lag it by an hour. If the two disagree,',
  'prefer the live block and say the record has not caught up. Never tell them there is no data',
  'for a coin that appears in the live block.',
  '',
  'Match the length to the question: a quick factual one gets a short answer, a real one gets the',
  'room it needs. Explain WHY, not just what.',
  '',
  'You cannot place trades, and you must not tell them to buy or sell a specific asset or how big',
  'a position to take — they are two beginners with real money at risk. Describe what the evidence',
  'shows and what would change it. Being a yes-man to either of them is a failure.',
].join(' ');

/**
 * Ask Orion something. Resolves { ok, reply } or { ok:false, error, code }.
 * `code` lets the renderer tell "not installed" from "not signed in" from
 * "it broke" — three different things that must never look the same.
 */
function ask(text, live, { retrying = false } = {}) {
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

    // `--output-format json` is what surfaces the session id to resume next turn --
    // plain text output has no id in it at all. `--resume` is the actual memory:
    // without it this is a fresh `claude -p` call every time, with no idea what
    // was asked a moment ago. cwd stays fixed at REPO across every call, which is
    // what makes the resumed session line up with the same conversation instead
    // of a different one per directory.
    const args = ['-p', prompt, '--append-system-prompt', SYSTEM, '--output-format', 'json'];
    if (sessionId) args.push('--resume', sessionId);

    const child = execFile(s.path, args,
      { cwd: REPO, timeout: 180000, maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: 'mcii-observatory' } },
      (err, stdout, stderr) => {
        const raw = String(stdout || '').trim();
        const msg = String(stderr || err?.message || '');
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch {}
        const out = parsed && typeof parsed.result === 'string' ? parsed.result : raw;

        // A stale session (cleared, expired, or from before a CLI upgrade) fails
        // the whole turn. Drop it and ask again as a fresh conversation once,
        // rather than leaving Orion broken until the app is restarted.
        if (!retrying && NO_SUCH_SESSION.test(msg)) {
          sessionId = null;
          return resolve(ask(text, live, { retrying: true }));
        }
        // ⚠️ Check the OUTPUT for a login prompt before treating it as an answer.
        if (NOT_SIGNED_IN.test(out) || NOT_SIGNED_IN.test(msg)) {
          return resolve({ ok: false, code: 'auth',
            error: 'Not signed in to Claude on this machine.' });
        }
        if (!err && out) {
          if (parsed?.session_id) sessionId = parsed.session_id;
          return resolve({ ok: true, reply: out });
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
