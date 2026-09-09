/**
 * localmodel — the fallback for when Claude cannot answer: not installed, not signed in, out of
 * usage, or timed out. Talks to Ollama (https://ollama.com), a small AI model server that runs
 * entirely on this Mac, no internet or account required once the model is downloaded.
 *
 * Deliberately dumb next to orion.js: no session memory, no live-repo tools, no auth flow. It only
 * ever answers ONE frozen prompt at a time (an evidence-packet read or a journal entry) -- the same
 * restricted shape orion.js already uses for evidence analysis -- so none of that machinery is
 * needed here.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const MODEL = 'qwen2.5:7b-instruct';

/** Is the model server running, and is the model itself actually downloaded? Two different "no"s:
 *  Ollama not running at all vs. running but this specific model was never pulled. */
async function status() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { installed: false, ready: false };
    const j = await res.json();
    const have = (j.models || []).some((m) => m.name === MODEL || m.model === MODEL);
    return { installed: true, ready: have, model: MODEL };
  } catch {
    return { installed: false, ready: false, model: MODEL };
  }
}

/** Ask the on-Mac model one frozen prompt. Resolves { ok, reply } or { ok:false, code, error } --
 *  same shape as orion.ask so callers can fall back between the two without special-casing either. */
async function ask(prompt, { timeout = 180000 } = {}) {
  const s = await status();
  if (!s.installed) {
    return { ok: false, code: 'not-running', error: 'The on-Mac model is not running (Ollama is not reachable).' };
  }
  if (!s.ready) {
    return { ok: false, code: 'no-model', error: `The on-Mac model "${MODEL}" has not been downloaded yet.` };
  }
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt, stream: false }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return { ok: false, code: 'failed', error: `The on-Mac model server returned an error (${res.status}).` };
    const j = await res.json();
    const reply = j.response ? String(j.response).trim() : '';
    if (!reply) return { ok: false, code: 'empty', error: 'The on-Mac model returned nothing.' };
    return { ok: true, reply };
  } catch (e) {
    const timedOut = e.name === 'TimeoutError' || e.name === 'AbortError';
    return { ok: false, code: timedOut ? 'timeout' : 'failed',
      error: timedOut ? 'The on-Mac model took too long and was stopped.' : String(e.message || e) };
  }
}

module.exports = { ask, status, MODEL };
