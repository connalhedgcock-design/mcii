// One shared throttle per host. The app, the collector and the screener all hit the same free
// tiers; without a central gate they collectively exceed limits that each individually respects.
const queues = new Map();

function limiter(host, perMinute) {
  if (!queues.has(host)) queues.set(host, { last: 0, minGap: 60000 / perMinute });
  return queues.get(host);
}

async function throttle(host, perMinute) {
  const q = limiter(host, perMinute);
  const wait = Math.max(0, q.last + q.minGap - Date.now());
  q.last = Date.now() + wait;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}
module.exports = { throttle };
