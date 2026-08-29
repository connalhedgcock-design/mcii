// Shared fetch wrapper. Every gotcha we hit in live testing is handled here, once.
const UA = 'MCII/0.1 (personal research dashboard)';

async function getJSON(url, { retries = 3, timeoutMs = 20000, headers = {}, method = 'GET', body } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(400 * Math.pow(2, attempt)); // exponential backoff
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      // Explicit User-Agent: default agents get 403 from several of these hosts.
      const res = await fetch(url, {
        method,
        body,
        // Caller headers must merge, not be ignored. Dropping them silently sent unauthenticated
        // requests that failed with 403 and no clue why.
        headers: { 'User-Agent': UA, accept: 'application/json', ...headers },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status === 429) { lastErr = new Error('rate limited'); continue; }
      // Auth failures are permanent -- retrying a bad key three times just wastes time.
      if (res.status === 401 || res.status === 403) throw new Error(`HTTP ${res.status} (auth rejected — check the API key)`);
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const text = await res.text();
      if (!text) { lastErr = new Error('empty body'); continue; }
      return JSON.parse(text);
    } catch (e) {
      clearTimeout(timer);
      // "fetch failed" from the runtime is almost always no network -- a sleeping laptop, dropped
      // wifi, or a VPN flap. Naming it makes the logs readable instead of mysterious.
      const offline = /fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|network/i.test(e.message || '');
      lastErr = offline ? Object.assign(new Error('no network connection'), { offline: true }) : e;
      if (e.name === 'AbortError') lastErr = new Error(`timed out after ${timeoutMs}ms`);
    }
  }
  throw lastErr || new Error('request failed');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
module.exports = { getJSON, sleep };
