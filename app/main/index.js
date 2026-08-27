const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { fetchMarket, searchTokens, discoverLatest } = require('./adapters/dexscreener');
const { fetchSafety } = require('./adapters/rugcheck');
const { fetchTokenMeta, maxExitable } = require('./adapters/jupiter');
const { fetchHistory } = require('./adapters/geckoterminal');
const history = require('./history');
const alerts = require('./alerts');
const { LiveMonitor } = require('./live');
const { Notification } = require('electron');
const { evaluateSafety, verdictSentence } = require('../shared/safety');

// Seeds only. The watchlist is user-managed and lives in the sidecar -- any Solana token can be
// added by address or by search. Nothing about this app is specific to these two.
const SEED_WATCHLIST = [
  { ca: 'Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump', sym: 'CATE' },
  { ca: '6oGuFDbEeaSzTcvrmmd2MqfNYwHKXFoN7regcR22pump', sym: 'NEEGY' },
];

// Rolling snapshot, not a database. Bounded by construction: one small object per token, so
// storage grows with the number of tokens, not with time or with how often we poll.
const SIDECAR = path.join(app.getPath('userData'), 'snapshot.json');
let store = { tokens: {}, positions: {}, watchlist: null };
try { store = { ...store, ...JSON.parse(fs.readFileSync(SIDECAR, 'utf8')) }; } catch {}
if (!Array.isArray(store.watchlist)) store.watchlist = SEED_WATCHLIST.slice();
const save = () => { try { fs.writeFileSync(SIDECAR + '.tmp', JSON.stringify(store)); fs.renameSync(SIDECAR + '.tmp', SIDECAR); } catch {} };

// Second argument points at the repo, so the app opens with the shared cloud history rather
// than only what this particular machine happened to observe.
history.init(app.getPath('userData'), path.join(__dirname, '..', '..'));

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 880, minWidth: 900,
    backgroundColor: '#0B0E13', titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // renderer cannot reach node
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

const progress = (m) => win && win.webContents.send('progress', m);

async function loadToken(entry) {
  const { ca, sym } = entry;
  const out = { ca, sym, errors: [] };
  try {
    progress(`${sym}: reading market data`);
    out.market = await fetchMarket(ca);
  } catch (e) { out.errors.push(`market data unavailable (${e.message})`); }
  try {
    progress(`${sym}: running safety checks`);
    out.safety = await fetchSafety(ca);
  } catch (e) { out.errors.push(`safety check unavailable (${e.message})`); }
  try {
    progress(`${sym}: finding token details`);
    out.meta = await fetchTokenMeta(ca);
  } catch (e) { out.errors.push(`token details unavailable (${e.message})`); }

  if (out.safety) out.gate = evaluateSafety(out.safety, out.market);

  if (out.meta && out.market) {
    progress(`${sym}: simulating a real sale (this takes a moment)`);
    try { out.exit = await maxExitable(ca, out.meta.decimals, out.market.priceUsd); }
    catch (e) { out.errors.push(`exit simulation failed (${e.message})`); }
  }
  try {
    progress(`${sym}: loading price history`);
    out.history = await fetchHistory(ca);
  } catch (e) { out.errors.push(`price history unavailable (${e.message})`); }

  // Write this reading to the permanent record before anything else can fail.
  history.record(ca, out);
  out.trend = {
    exitUsd: history.delta(ca, 'exitUsd', 7 * 864e5),
    liq: history.delta(ca, 'liq', 7 * 864e5),
    holders: history.delta(ca, 'holders', 7 * 864e5),
    top10: history.delta(ca, 'top10', 7 * 864e5),
    recorded: history.read(ca, 30 * 864e5).length,
  };

  const position = store.positions[ca] || null;
  out.position = position;

  const prevGate = store.tokens[ca]?.gate || null;
  out.alerts = alerts.evaluate(out, prevGate);
  // Only notify on things that are both serious and new -- a standing condition should not
  // re-nag every ten minutes, or it stops being read.
  const seen = (store.seenAlerts ||= {});
  for (const a of out.alerts) {
    const key = `${ca}:${a.id}`;
    const last = seen[key] || 0;
    const cooloff = a.severity === 'CRITICAL' ? 6 * 36e5 : 24 * 36e5;
    if (a.severity !== 'MED' && Date.now() - last > cooloff) {
      seen[key] = Date.now();
      try { new Notification({ title: a.title, body: a.detail, urgency: 'critical' }).show(); } catch {}
    }
  }
  if (out.gate) out.sentence = verdictSentence(sym, out.gate, out.market, out.exit, position);
  out.updatedAt = Date.now();
  store.tokens[ca] = out;
  save();
  return out;
}

ipcMain.handle('tokens:list', async () => {
  const results = [];
  for (const e of store.watchlist) results.push(await loadToken(e));
  progress(null);
  return results;
});
ipcMain.handle('tokens:refresh', async (_e, ca) => {
  const entry = store.watchlist.find((w) => w.ca === ca) || { ca, sym: '?' };
  const r = await loadToken(entry);
  progress(null);
  return r;
});
ipcMain.handle('tokens:search', async (_e, q) => {
  // A bare Solana address goes straight through; anything else is a name search.
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q.trim())) {
    try { return await searchTokens(q.trim()); } catch { return []; }
  }
  return searchTokens(q);
});
ipcMain.handle('watchlist:add', async (_e, { ca, sym }) => {
  if (!store.watchlist.some((w) => w.ca === ca)) store.watchlist.push({ ca, sym });
  save();
  if (live) live.watch(store.watchlist);
  const r = await loadToken({ ca, sym });
  progress(null);
  return r;
});
ipcMain.handle('watchlist:remove', (_e, ca) => {
  store.watchlist = store.watchlist.filter((w) => w.ca !== ca);
  delete store.tokens[ca];
  save();
  if (live) live.watch(store.watchlist);
  return store.watchlist;
});
ipcMain.handle('discover:latest', () => discoverLatest());
ipcMain.handle('alerts:all', () => {
  const all = [];
  for (const ca of Object.keys(store.tokens)) all.push(...(store.tokens[ca].alerts || []));
  const rank = { CRITICAL: 0, HIGH: 1, MED: 2 };
  return all.sort((a, b) => rank[a.severity] - rank[b.severity]);
});
ipcMain.handle('history:series', (_e, { ca, field, days }) =>
  history.series(ca, field, (days || 30) * 864e5));
ipcMain.handle('tokens:setPosition', (_e, { ca, tokens }) => {
  store.positions[ca] = tokens ? { tokens: Number(tokens) } : null;
  save();
  return store.positions[ca];
});
ipcMain.handle('shell:open', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

// Live monitoring replaces the old ten-minute refresh for market data. On-chain data is free and
// DexScreener sustains ten calls a second, so there is no reason to look at a stale price.
let live = null;
function startLive() {
  if (live) { live.watch(store.watchlist); return; }
  live = new LiveMonitor({
    onUpdate: (snap) => {
      const cur = store.tokens[snap.ca] || {};
      // Merge rather than replace: the live tier does not carry price history or social data.
      store.tokens[snap.ca] = { ...cur, ...snap,
        history: cur.history, trend: cur.trend, position: store.positions[snap.ca] || null };
      if (win && !win.isDestroyed()) win.webContents.send('live', store.tokens[snap.ca]);
    },
    onAlert: (a) => {
      if (win && !win.isDestroyed()) win.webContents.send('live-alert', a);
      const seen = (store.seenAlerts ||= {});
      const key = `${a.ca}:${a.id}`;
      // Live alerts are urgent but must not repeat every fifteen seconds; a shorter cooloff than
      // the history-based ones, since these describe something happening right now.
      if (Date.now() - (seen[key] || 0) > 15 * 60000) {
        seen[key] = Date.now();
        try { new Notification({ title: a.title, body: a.detail, urgency: 'critical' }).show(); } catch {}
      }
    },
  });
  live.watch(store.watchlist);
  live.start();
}

// The slower pass still runs: price history and the recorded-trend alerts are not live concerns.
let autoTimer = null;
function startAutoRefresh() {
  if (autoTimer) return;
  autoTimer = setInterval(async () => {
    for (const e of store.watchlist) { try { await loadToken(e); } catch {} }
    progress(null);
    if (win && !win.isDestroyed()) win.webContents.send('refreshed');
  }, 10 * 60 * 1000);
}

app.whenReady().then(() => { createWindow(); startAutoRefresh(); startLive(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
