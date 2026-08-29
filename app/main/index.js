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
const scanstore = require('./scanstore');
const hype = require('../shared/hype');
const journal = require('./journal');
const updater = require('./updater');
const orion = require('./orion');
const { Notification } = require('electron');
const { evaluateSafety, verdictSentence } = require('../shared/safety');
const collection = require('../shared/collection');
const sector = require('../shared/sector');

// Seeds only. The watchlist is user-managed and lives in the sidecar -- any Solana token can be
// added by address or by search. Nothing about this app is specific to these two.
const SEED_WATCHLIST = [
  { ca: 'Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump', sym: 'CATE' },
  { ca: '6oGuFDbEeaSzTcvrmmd2MqfNYwHKXFoN7regcR22pump', sym: 'NEEGY' },
];

// Rolling snapshot, not a database. Bounded by construction: one small object per token, so
// storage grows with the number of tokens, not with time or with how often we poll.
const SIDECAR = path.join(app.getPath('userData'), 'snapshot.json');
let store = { tokens: {}, positions: {}, watchlist: null, owner: null };
try { store = { ...store, ...JSON.parse(fs.readFileSync(SIDECAR, 'utf8')) }; } catch {}
if (!Array.isArray(store.watchlist)) store.watchlist = SEED_WATCHLIST.slice();
const save = () => { try { fs.writeFileSync(SIDECAR + '.tmp', JSON.stringify(store)); fs.renameSync(SIDECAR + '.tmp', SIDECAR); } catch {} };

// Second argument points at the repo, so the app opens with the shared cloud history rather
// than only what this particular machine happened to observe.
history.init(app.getPath('userData'), path.join(__dirname, '..', '..'));
// Publish the watchlist on startup too, so a machine that already had coins does not have to
// add one before the cloud job learns about them. (Declaration is hoisted; it only touches
// `store`, which is already loaded above.)
syncWatchlist();
scanstore.init(app.getPath('userData'));
journal.init(path.join(__dirname, '..', '..'));

let win;
function createWindow() {
  // Bounds are per-machine (like identity), not synced -- Austin and Connal each keep whatever
  // size they left the window at.
  const b = store.windowBounds;
  win = new BrowserWindow({
    width: b?.width || 1280, height: b?.height || 880, x: b?.x, y: b?.y,
    minWidth: 900, minHeight: 640,
    backgroundColor: '#0B0E13', titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // renderer cannot reach node
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'),
    process.env.MCII_ASK ? { hash: 'ask' } : process.env.MCII_MEASURE ? { hash: 'measure' } : undefined);
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });

  // Renderer console and uncaught errors, forwarded to the terminal.
  // A renderer exception is INVISIBLE from outside: it kills the handler it was
  // thrown in and the button re-enables itself as though it had worked. Three
  // buttons were dead for days behind exactly that. A failure that produces
  // nothing is worse than one that produces an error, so this makes them audible.
  if (!app.isPackaged) {
    // ⚠️ Electron changed this signature: it used to be
    // (event, level:number, message, line, sourceId) and is now a single event
    // object with level as a STRING. Reading the old shape on the new Electron
    // silently filters everything out -- a logger that logs nothing, which is
    // the exact failure mode it exists to prevent. Handle both.
    win.webContents.on('console-message', (e, level, message, line, sourceId) => {
      const lvl = typeof e === 'object' && e && 'level' in e ? e.level : level;
      const msg = typeof e === 'object' && e && 'message' in e ? e.message : message;
      const src = typeof e === 'object' && e && 'sourceId' in e ? e.sourceId : sourceId;
      const ln  = typeof e === 'object' && e && 'lineNumber' in e ? e.lineNumber : line;
      const bad = lvl === 'error' || lvl === 'warning' || Number(lvl) >= 2;
      if (!bad) return;
      console.error(`[renderer] ${msg}${src ? `  (${path.basename(String(src))}:${ln})` : ''}`);
    });
    win.webContents.on('render-process-gone', (_e, d) => {
      console.error('[renderer] process gone:', d.reason);
    });
  }

  let saveBoundsTimer = null;
  const saveBounds = () => {
    clearTimeout(saveBoundsTimer);
    saveBoundsTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      store.windowBounds = win.getBounds();
      save();
    }, 500);
  };
  win.on('resize', saveBounds);
  win.on('move', saveBounds);
}

const progress = (m) => win && win.webContents.send('progress', m);

async function loadToken(entry) {
  const { ca, sym } = entry;
  const out = { ca, sym, errors: [] };
  try {
    progress(`${sym}: reading market data`);
    out.market = await fetchMarket(ca);
  } catch (e) { out.errors.push(`market data unavailable (${e.message})`); }
  // ⚠️ RugCheck and Jupiter are SOLANA-ONLY. Calling them with an address from
  // another chain returns HTTP 400 and "not found", which the app then reported
  // as three separate mysterious failures — so a perfectly healthy coin on
  // another chain looked broken rather than partly-supported. Say which it is.
  out.chain = out.market?.chain || null;
  const solana = !out.chain || out.chain === 'solana';
  if (solana) {
    try {
      progress(`${sym}: running safety checks`);
      out.safety = await fetchSafety(ca);
    } catch (e) { out.errors.push(`safety check unavailable (${e.message})`); }
    try {
      progress(`${sym}: finding token details`);
      out.meta = await fetchTokenMeta(ca);
    } catch (e) { out.errors.push(`token details unavailable (${e.message})`); }
  } else {
    out.limited = `${sym} trades on ${out.chain}, not Solana. Price, market cap, liquidity, `
      + `volume and 24h change are live and correct. The rug-pull safety checks, the `
      + `"how much can I actually sell" figure and the price chart are Solana-only, so they `
      + `are blank for this coin — not broken, just not covered yet.`;
  }

  // Holders and token accounts are different quantities and are kept apart deliberately.
  if (out.safety && out.meta) out.safety.totalHolders = out.meta.holderCount ?? null;
  if (out.safety) out.gate = evaluateSafety(out.safety, out.market);

  if (solana && out.meta && out.market) {
    progress(`${sym}: simulating a real sale (this takes a moment)`);
    try { out.exit = await maxExitable(ca, out.meta.decimals, out.market.priceUsd); }
    catch (e) { out.errors.push(`exit simulation failed (${e.message})`); }
  }
  // GeckoTerminal is queried against networks/solana too. It DOES serve other
  // networks, but under slugs we have not confirmed — and a wrong slug returns
  // someone else's chart rather than an error, which is the worst outcome
  // available. Skipped rather than guessed until each chain's slug is verified.
  if (solana) {
    try {
      progress(`${sym}: loading price history`);
      out.history = await fetchHistory(ca);
    } catch (e) { out.errors.push(`price history unavailable (${e.message})`); }
  }

  // Write this reading to the permanent record before anything else can fail.
  history.record(ca, out);
  out.trend = {
    exitUsd: history.delta(ca, 'exitUsd', 7 * 864e5),
    liq: history.delta(ca, 'liq', 7 * 864e5),
    holders: history.delta(ca, 'holders', 7 * 864e5),
    top10: history.delta(ca, 'top10', 7 * 864e5),
    // ⚠️ NOT the same thing as market.priceChange.h24. DexScreener's h24 is reported by whichever
    // single pool currently has the most liquidity -- and which pool that is can change day to
    // day as new pools open. A pool that only recently became "the deepest" reports its OWN price
    // history, which can look like a 40% move even while the token's real, tradeable price barely
    // moved -- exactly what happened with ANSEM on 08-29. Computed from our own recorded readings
    // instead, which do not depend on any one pool staying in first place.
    price24h: history.delta(ca, 'price', 24 * 36e5),
    recorded: history.read(ca, 30 * 864e5).length,
  };

  const position = store.positions[ca] || null;
  out.position = position;
  out.nick = (store.watchlist.find((w) => w.ca === ca) || {}).nick || null;

  // Hour-on-hour holder change, computed on chain by the cloud collector. Read from the shared
  // record rather than recomputed here -- the query costs ~60MB and belongs on the server, not on
  // a laptop that may be on battery.
  try {
    const rows = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'holders-onchain.jsonl'), 'utf8')
      .trim().split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((r) => r && r.ca === ca && r.kind === 'holder-change');
    if (rows.length) {
      const latest = rows[rows.length - 1];
      // Only surface it while it is still current; a change from three days ago is history.
      if (Date.now() - latest.ts < 6 * 36e5) out.holderTruth = latest;
    }
  } catch {}

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

// ! opens with what we already know, then refreshes behind the window.
//
// This used to fetch every coin before showing anything. Each coin costs a market call, a safety
// call, an exit simulation of roughly seventeen calls, and a price history -- about ten seconds.
// Fine at two coins, and the watchlist is now four, so the app sat on a loading screen for the
// best part of a minute before drawing a single thing.
//
// The last reading for every coin is already in the sidecar. Showing it immediately costs
// nothing and is honest, because every figure on screen already carries the time it was taken.
// The refresh then runs and the window redraws itself when it lands.
// ! the guard matters: the window redraws when a refresh lands, and redrawing asks for the list
// again. Without a floor on how often this may run, that is an endless refresh loop that would
// quietly burn every rate limit the project has.
let refreshing = false, lastRefresh = 0;
const REFRESH_FLOOR_MS = 60000;
async function refreshAllTokens() {
  if (refreshing || Date.now() - lastRefresh < REFRESH_FLOOR_MS) return;
  refreshing = true;
  lastRefresh = Date.now();
  try {
    // Sequential on purpose: several of these sources are rate limited, and three of this
    // project's worst bugs came from processes that each assumed they were the only caller.
    for (const e of store.watchlist) { try { await loadToken(e); } catch {} }
    progress(null);
    if (win && !win.isDestroyed()) win.webContents.send('refreshed');
  } finally { refreshing = false; }
}

ipcMain.handle('tokens:list', async () => {
  const cached = store.watchlist.map((e) => store.tokens[e.ca]).filter(Boolean);
  if (cached.length === store.watchlist.length) {
    refreshAllTokens();          // deliberately not awaited
    return cached;
  }
  // Nothing remembered for at least one coin -- a first run, or a newly added coin. Wait, because
  // an empty card is worse than a slow one. try/catch per token, unlike a bare loop: one coin
  // stuck in a way loadToken() itself didn't catch must never block every other coin from ever
  // showing up on startup.
  const results = [];
  for (const e of store.watchlist) { try { results.push(await loadToken(e)); } catch {} }
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
// !! THE WATCHLIST HAD TO BE WRITTEN INTO THE REPO, AND WAS NOT.
// The cloud collector reads data/watchlist.json and nothing ever wrote that file, so it fell
// back to two hardcoded coins forever. Anything either of them added in the app was collected
// only while that laptop happened to be open, and vanished from the shared record the moment it
// closed -- silently, because a coin with no rows looks exactly like a coin nobody talks about.
//
// Written as a UNION with whatever is already in the file: the other machine's coins must survive
// this one saving. Removal is the one case that takes a coin out, because that is a stated
// intention rather than an absence.
const WATCHLIST_FILE = path.join(__dirname, '..', '..', 'data', 'watchlist.json');
function syncWatchlist({ removed = null } = {}) {
  let shared = [];
  try { shared = JSON.parse(fs.readFileSync(WATCHLIST_FILE, 'utf8')); } catch {}
  if (!Array.isArray(shared)) shared = [];
  const by = new Map(shared.filter((w) => w && w.ca).map((w) => [w.ca, w]));
  for (const w of store.watchlist) if (w && w.ca) by.set(w.ca, { ca: w.ca, sym: w.sym, nick: w.nick || null });
  if (removed) by.delete(removed);
  const out = [...by.values()];
  try {
    fs.mkdirSync(path.dirname(WATCHLIST_FILE), { recursive: true });
    fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(out, null, 2) + '\n');
  } catch {}
  return out;
}

ipcMain.handle('watchlist:add', async (_e, { ca, sym }) => {
  if (!store.watchlist.some((w) => w.ca === ca)) store.watchlist.push({ ca, sym });
  save();
  syncWatchlist();
  if (live) live.watch(store.watchlist);
  const r = await loadToken({ ca, sym });
  progress(null);
  return r;
});
// A name you choose for a coin, so two coins called the same thing stop being the same thing.
// Stored on the shared list, so both machines -- and anyone reading the record later -- know
// which coin "the small cate" refers to without having to compare addresses by eye.
ipcMain.handle('watchlist:rename', (_e, { ca, nick }) => {
  const e = store.watchlist.find((w) => w.ca === ca);
  if (e) { e.nick = String(nick || '').trim().slice(0, 24) || null; save(); syncWatchlist(); }
  return store.watchlist;
});

ipcMain.handle('watchlist:remove', (_e, ca) => {
  store.watchlist = store.watchlist.filter((w) => w.ca !== ca);
  delete store.tokens[ca];
  save();
  syncWatchlist({ removed: ca });
  if (live) live.watch(store.watchlist);
  return store.watchlist;
});
// How long the shared record has been quiet. Asked for by the window rather than pushed, so a
// machine that has been closed for a week reports the truth the moment it opens.
ipcMain.handle('collection:health', () =>
  collection.health(path.join(__dirname, '..', '..', 'data')));


// The sector read. Everything here is computed from files already on disk -- no network call, so
// opening the tab costs nothing and works on a plane. What is missing is reported as missing.
const readJsonl = (name) => {
  try {
    return fs.readFileSync(path.join(__dirname, '..', '..', 'data', name), 'utf8')
      .trim().split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
};

// Tickers of theirs that other coins also use. Read from the shared record so both machines see
// the same answer, and so the app does not have to make network calls to find out.
function tickerCollisions() {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'ticker-collisions.json'), 'utf8'));
    return d.tickers || {};
  } catch { return {}; }
}
ipcMain.handle('tickers:collisions', () => tickerCollisions());

ipcMain.handle('sector:latest', () => {
  const social = readJsonl('sector.jsonl').filter((r) => r.kind === 'sector').pop() || null;
  const obs = readJsonl('candidates.jsonl');
  const scans = readJsonl('scans.jsonl');
  const b = sector.breadth(obs);
  const co = sector.cohort(obs);
  const fun = sector.funnel(scans);
  const tk = social ? (social.tickers || []) : [];
  return {
    social, breadth: b, cohort: co, funnel: fun, tickers: tk,
    collisions: tickerCollisions(),
    // The newest coins the funnel let through, newest first. Deliberately NOT sorted by how much
    // they moved -- that ordering is what makes a screen tell you to chase things (D-43).
    recent: sector.latestPerToken(obs).sort((a, b2) => b2.ts - a.ts).slice(0, 12),
    ...sector.synthesize({ breadth: b, cohort: co, funnel: fun, social, tickers: tk }),
    collectedAt: social ? social.ts : null,
  };
});

ipcMain.handle('discover:latest', () => discoverLatest());
// The last reading of every token, straight from the snapshot -- no network at all.
// `tokens:list` re-fetches four upstream APIs per coin, which is right when the user asked for
// fresh numbers and wrong for an instrument wall that redraws on resize and on every window
// change. Same data, no traffic.
ipcMain.handle('tokens:cached', () => Object.values(store.tokens));
ipcMain.handle('alerts:all', () => {
  const all = [];
  for (const ca of Object.keys(store.tokens)) all.push(...(store.tokens[ca].alerts || []));
  const rank = { CRITICAL: 0, HIGH: 1, MED: 2 };
  return all.sort((a, b) => rank[a.severity] - rank[b.severity]);
});
// Everything the market scanner has found. The app previously showed only the watchlist, which
// made the scanner invisible -- it had been running for hours with nowhere to display results.
ipcMain.handle('screen:latest', () => {
  const REPO = path.join(__dirname, '..', '..');
  const readJsonl = (f) => {
    try {
      return fs.readFileSync(f, 'utf8').trim().split('\n')
        .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    } catch { return []; }
  };
  // Local scans and cloud scans are the same record collected from two places.
  const local = scanstore.readObs(7 * 864e5);
  const cloud = readJsonl(path.join(REPO, 'data', 'candidates.jsonl'));
  const all = local.concat(cloud).sort((a, b) => a.ts - b.ts);

  // Latest observation per token, so the list shows current state rather than a history dump.
  const latest = new Map();
  for (const o of all) latest.set(o.ca, o);

  const risers = scanstore.risers({ minScans: 3, windowMs: 12 * 36e5 });
  const riserBy = new Map(risers.map((r) => [r.ca, r]));

  const rows = [...latest.values()].map((o) => {
    const r = riserBy.get(o.ca);
    const seen = all.filter((x) => x.ca === o.ca);
    return { ...o, scans: seen.length,
      firstSeen: seen[0]?.ts ?? o.ts,
      accumulating: r?.accumulating ?? false,
      holderGrowth: r?.holderGrowth ?? null,
      liqGrowth: r?.liqGrowth ?? null,
      priceGrowth: r?.priceGrowth ?? null,
      onWatchlist: store.watchlist.some((w) => w.ca === o.ca) };
  });

  const scans = readJsonl(path.join(REPO, 'data', 'scans.jsonl'));
  return {
    tokens: rows.sort((a, b) => (b.accumulating - a.accumulating) || (b.scans - a.scans) || (b.liq - a.liq)),
    scanCount: scans.length + (scanstore.readObs(7 * 864e5).length ? 1 : 0),
    lastScan: Math.max(0, ...all.map((o) => o.ts)),
  };
});

// Social readings for one token: local live buckets merged with the hourly cloud record.
ipcMain.handle('social:token', (_e, ca) => {
  const rows = history.readSocial(ca, { sinceMs: 7 * 864e5 });
  if (!rows.length) return { rows: [], latest: null, breadth: null };
  const latest = rows[rows.length - 1];
  const rel = hype.reliability(latest);
  const breadth = hype.breadthIndex(latest, rows.slice(0, -1));
  return { rows, latest, reliability: rel, breadth };
});

// Identity is stored locally and never synced -- each machine knows only who is sitting at it.
ipcMain.handle('journal:owner', () => store.owner);
ipcMain.handle('journal:setOwner', (_e, name) => {
  store.owner = String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || null;
  save();
  return store.owner;
});
ipcMain.handle('journal:owners', () => journal.owners());
ipcMain.handle('journal:theses', () => journal.listTheses());
ipcMain.handle('journal:saveThesis', (_e, t) => journal.saveThesis({ ...t, owner: t.owner || store.owner }));
ipcMain.handle('journal:forecasts', (_e, owner) => journal.readForecasts(owner === undefined ? store.owner : owner));
ipcMain.handle('journal:addForecast', (_e, f) => journal.addForecast({ ...f, owner: store.owner }));
ipcMain.handle('journal:resolve', (_e, { id, outcome, lesson }) => journal.resolveForecast(id, outcome, lesson));
ipcMain.handle('journal:calibration', (_e, owner) => journal.calibration(owner || store.owner));
ipcMain.handle('journal:notes', (_e, owner) => journal.readNotes(owner === undefined ? store.owner : owner));
ipcMain.handle('journal:addNote', (_e, n) => journal.addNote({ ...n, owner: store.owner }));

ipcMain.handle('history:series', (_e, { ca, field, days }) =>
  history.series(ca, field, (days || 30) * 864e5));
ipcMain.handle('tokens:setPosition', (_e, { ca, tokens }) => {
  store.positions[ca] = tokens ? { tokens: Number(tokens) } : null;
  save();
  return store.positions[ca];
});
ipcMain.handle('shell:open', (_e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });

// Orion — the Claude CLI, not the API. No key, no per-token billing; whoever is
// at the machine signs in with their own account.
ipcMain.handle('orion:status', () => orion.status());
ipcMain.handle('orion:ask', (_e, text) => orion.ask(text, liveContext()));

// A compact picture of what the app is showing RIGHT NOW, for Orion.
// Deliberately small: one line per coin plus the live alerts. The point is to
// close the gap between what is on screen and what is on disk, not to paste the
// whole store into a prompt.
function liveContext() {
  const n = (v) => (v == null || !Number.isFinite(v) ? '?' : Math.round(v).toLocaleString());
  const lines = [];
  for (const t of Object.values(store.tokens)) {
    const m = t.market, g = t.gate;
    lines.push([
      `${t.sym || '?'}`,
      m ? `price $${m.priceUsd}` : 'price ?',
      m ? `mcap $${n(m.marketCap)}` : 'mcap ?',
      m ? `liquidity $${n(m.totalLiquidityUsd)}` : 'liquidity ?',
      m?.priceChange?.h24 != null ? `24h ${m.priceChange.h24}%` : '24h ?',
      t.safety?.totalHolders != null ? `holders ${n(t.safety.totalHolders)}` : 'holders ?',
      t.exit ? `sellable-before-5pct $${n(t.exit.usd)}` : 'sellable ?',
      g ? `safety ${g.verdict}` : 'safety ?',
      `readings ${t.trend?.recorded ?? 0}`,
      t.position?.tokens ? `holding ${n(t.position.tokens)} tokens` : 'no position',
      t.errors?.length ? `feed-errors: ${t.errors.join('; ')}` : '',
    ].filter(Boolean).join(' · '));
  }
  const alerts = [];
  for (const ca of Object.keys(store.tokens)) {
    for (const a of store.tokens[ca].alerts || []) {
      alerts.push(`${a.severity}: ${a.title} — ${a.detail}`);
    }
  }
  return [
    lines.length ? 'WATCHLIST:' : 'WATCHLIST: (empty)',
    ...lines,
    alerts.length ? '\nACTIVE ALERTS:' : '\nACTIVE ALERTS: none',
    ...alerts,
  ].join('\n');
}
ipcMain.handle('orion:login', () => orion.login());

ipcMain.handle('update:check', () => updater.checkForUpdates());
ipcMain.handle('update:apply', () => updater.applyUpdate());
ipcMain.handle('update:restart', () => { app.relaunch(); app.exit(0); });
ipcMain.handle('update:share', (_e, message) => updater.shareChanges(message));

// Silent background check so the button shows a badge without the person having to remember to
// click it. Never applies anything on its own -- pulling code out from under a running app would
// be surprising, so this only ever informs.
function startUpdateChecks() {
  const check = () => updater.checkForUpdates().then((r) => {
    if (r.ok && win && !win.isDestroyed()) win.webContents.send('update-status', r);
  });
  check();
  setInterval(check, 15 * 60 * 1000);
}

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

app.whenReady().then(() => { createWindow(); startAutoRefresh(); startLive(); startUpdateChecks(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
