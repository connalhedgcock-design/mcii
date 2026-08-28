const { execFile } = require('child_process');
const path = require('path');
const util = require('util');
const execFileP = util.promisify(execFile);

const REPO = path.join(__dirname, '..', '..');
const APP_DIR = path.join(__dirname, '..');

function git(args) {
  return execFileP('git', args, { cwd: REPO, timeout: 30000 }).then((r) => r.stdout.trim());
}

// Fetches from GitHub and reports how far local main is from origin/main, without changing
// any files. Safe to call as often as we like.
async function checkForUpdates() {
  try {
    await git(['fetch', 'origin', 'main']);
    const [status, behind, ahead, latestMessage] = await Promise.all([
      git(['status', '--porcelain']),
      git(['rev-list', '--count', 'main..origin/main']),
      git(['rev-list', '--count', 'origin/main..main']),
      git(['log', 'origin/main', '-1', '--pretty=%s']),
    ]);
    return {
      ok: true,
      behind: Number(behind) || 0,
      ahead: Number(ahead) || 0,
      hasLocalChanges: status.length > 0,
      latestMessage,
    };
  } catch (e) {
    return { ok: false, reason: e.message.split('\n')[0] };
  }
}

// Applies Connal's (or your own already-shared) updates. Only ever fast-forwards -- if that is
// not possible, or there is anything uncommitted here, it refuses rather than guessing, and the
// person should use share.sh instead (that path handles saving and merging your own edits).
async function applyUpdate() {
  const status = await git(['status', '--porcelain']);
  if (status.length > 0) return { ok: false, reason: 'local-changes' };

  const ahead = Number(await git(['rev-list', '--count', 'origin/main..main'])) || 0;
  if (ahead > 0) return { ok: false, reason: 'unpushed-commits' };

  const before = await git(['rev-parse', 'HEAD']);
  try {
    await git(['merge', '--ff-only', 'origin/main']);
  } catch (e) {
    return { ok: false, reason: 'diverged', detail: e.message.split('\n')[0] };
  }
  const after = await git(['rev-parse', 'HEAD']);

  // Only reinstall if the update actually touched what the app depends on.
  const changed = await git(['diff', '--name-only', before, after]);
  const needsInstall = changed.split('\n').some((f) => /^app\/package(-lock)?\.json$/.test(f));
  if (needsInstall) {
    await execFileP('npm', ['install'], { cwd: APP_DIR, timeout: 120000 });
  }
  return { ok: true, ranNpmInstall: needsInstall };
}

// Saves any edits here (needs a description), lines them up after whatever Connal has already
// shared, and uploads. Mirrors share.sh exactly, so the two stay interchangeable -- someone who
// prefers Terminal can keep using share.sh and this button without the two ever disagreeing.
async function shareChanges(message) {
  const status = await git(['status', '--porcelain']);
  const hadLocalChanges = status.length > 0;
  if (hadLocalChanges) {
    if (!message || !message.trim()) return { ok: false, reason: 'no-message' };
    await git(['add', '-A']);
    await git(['commit', '-m', message.trim()]);
  }

  const before = await git(['rev-parse', 'HEAD']);
  try {
    await git(['pull', '--rebase', 'origin', 'main']);
  } catch (e) {
    // Your snapshot is still safe in local history -- only the rebase attempt is undone.
    try { await git(['rebase', '--abort']); } catch {}
    return { ok: false, reason: 'conflict' };
  }
  const after = await git(['rev-parse', 'HEAD']);

  const changed = before === after ? '' : await git(['diff', '--name-only', before, after]);
  const needsInstall = changed.split('\n').some((f) => /^app\/package(-lock)?\.json$/.test(f));
  if (needsInstall) await execFileP('npm', ['install'], { cwd: APP_DIR, timeout: 120000 });

  try {
    await git(['push', 'origin', 'main']);
  } catch (e) {
    return { ok: false, reason: 'push-failed', detail: e.message.split('\n')[0] };
  }
  return { ok: true, saved: hadLocalChanges, ranNpmInstall: needsInstall };
}

module.exports = { checkForUpdates, applyUpdate, shareChanges };
