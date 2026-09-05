const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// !! PIN THE DATA FOLDER. DO NOT REMOVE, AND DO NOT ASSUME IT IS REDUNDANT.
// Electron's app.getName() prefers `productName` over `name` in package.json, and userData is
// derived from app.getName(). So adding `productName: "CII"` for the on-screen rename (D-118)
// silently moved everything to ~/Library/Application Support/CII: a fresh empty snapshot, and
// both venue logins gone, because the session partitions live under the old folder.
// Found 2026-09-01 by Connal noticing fomo and axiom were logged out. I had documented this exact
// risk and then caused it, because I believed `name` was the field that mattered. It is not.
// ! this line makes the display name and the storage location independent, so the app can be
// renamed again without touching anyone's data. The literal 'mcii' is a STORAGE KEY now, not a
// name — it should outlive any number of rebrands and must never be "tidied" to match the title.
app.setPath('userData', path.join(app.getPath('appData'), 'mcii'));
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
const portfolio = require('./portfolio');
const alertsPush = require('./alerts-push');
const walletAdapter = require('./adapters/wallet');
const venues = require('./venues');
const fomoNotifications = require('./adapters/fomonotifications');
const admission = require('../shared/admission');
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
const ICON_PATH = path.join(__dirname, '..', 'assets', 'icon.png');
// `wallets` is venue -> PUBLIC address ({ fomo: '...', axiom: '...' }). It lives here, in the
// per-machine sidecar, and never in the repo: the GitHub repo is public, and which addresses an
// operator holds is not something to publish on their behalf. Public addresses only -- no key or
// seed phrase is accepted anywhere in this app, and none is needed to read a balance.
let store = { tokens: {}, positions: {}, watchlist: null, owner: null, wallets: {} };
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
fomoNotifications.init(app.getPath('userData'));
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
    icon: ICON_PATH,
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
    // ⚠️ Fired together, not one after another. Safety, token details, and price history don't
    // depend on each other's results -- awaiting each in turn was the biggest single reason a coin
    // took ~10s to load and a growing watchlist took proportionally longer. This alone doesn't
    // touch any single service's request RATE (still one call each, same as before), just how the
    // waits overlap -- so it doesn't reopen the "several sources are rate limited" concern that
    // keeps loading tokens themselves sequential (see refreshAllTokens() below).
    progress(`${sym}: running safety checks, token details, and price history`);
    const safetyP = fetchSafety(ca)
      .catch((e) => { out.errors.push(`safety check unavailable (${e.message})`); return null; });
    const metaP = fetchTokenMeta(ca)
      .catch((e) => { out.errors.push(`token details unavailable (${e.message})`); return null; });
    // GeckoTerminal is queried against networks/solana too. It DOES serve other networks, but
    // under slugs we have not confirmed -- and a wrong slug returns someone else's chart rather
    // than an error, which is the worst outcome available. Skipped rather than guessed until each
    // chain's slug is verified.
    const historyP = fetchHistory(ca)
      .catch((e) => { out.errors.push(`price history unavailable (${e.message})`); return null; });

    out.meta = await metaP;
    // Needs meta + market only -- started as soon as those are ready rather than waiting on
    // safety or history too, since exit simulation depends on neither of them.
    const exitP = (out.meta && out.market)
      ? maxExitable(ca, out.meta.decimals, out.market.priceUsd)
          .catch((e) => { out.errors.push(`exit simulation failed (${e.message})`); return null; })
      : Promise.resolve(null);

    out.safety = await safetyP;
    // Holders and token accounts are different quantities and are kept apart deliberately.
    if (out.safety && out.meta) out.safety.totalHolders = out.meta.holderCount ?? null;
    if (out.safety) out.gate = evaluateSafety(out.safety, out.market);

    out.history = await historyP;
    if (out.meta && out.market) progress(`${sym}: simulating a real sale (this takes a moment)`);
    out.exit = await exitP;
  } else {
    out.limited = `${sym} trades on ${out.chain}, not Solana. Price, market cap, liquidity, `
      + `volume and 24h change are live and correct. The rug-pull safety checks, the `
      + `"how much can I actually sell" figure and the price chart are Solana-only, so they `
      + `are blank for this coin — not broken, just not covered yet.`;
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

// Loads several tokens with a SMALL bounded concurrency, not fully serial and not fully parallel.
// Fully serial is what made a growing watchlist take proportionally longer to load (2026-08-29 --
// Connal was worried adding more coins would make this too slow to use). Fully parallel would
// multiply, by watchlist size, the request rate against Jupiter specifically -- maxExitable()
// already runs its own 17-round search deliberately throttled to "stay well inside Jupiter's
// free-tier limits" (jupiter.js), and N of those running at once would undo that on purpose. 3 at
// a time gets most of the speedup from overlapping coins' waits without turning that throttle into
// a lie.
const LOAD_CONCURRENCY = 3;
async function loadTokensBounded(watchlist) {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < watchlist.length) {
      const i = next++;
      try { results[i] = await loadToken(watchlist[i]); } catch { results[i] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(LOAD_CONCURRENCY, watchlist.length) }, worker));
  return results.filter(Boolean);
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
    // Bounded concurrency, not fully sequential and not fully parallel -- see
    // loadTokensBounded()'s own comment for why (Jupiter's exit-simulation throttle, specifically).
    await loadTokensBounded(store.watchlist);
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
  // an empty card is worse than a slow one.
  const results = await loadTokensBounded(store.watchlist);
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

// !! AUTOMATIC DISCOVERY -- Connal, 2026-09-04: "we need a system where you can pick coins
// yourself and analyze them on the market based on the top trader tracking and the social media
// data ... and then you send notifications to my phone and present info in the app based on that
// data/analysis." This is that wiring. `shared/admission.js` does the actual scoring (gates then
// an equal vote, never one sensor confirming itself); everything below just gathers the three
// readings for a candidate and calls it.
//
// ! candidates come from FOMO signals ONLY right now -- a coin a followed trader just bought that
// is not already tracked. Social-only discovery (unknownTickers()/identify(), already computed
// into `sector.jsonl: identified` and displayed but never wired to tracking -- flagged 2026-08-31,
// still true) is a real second source and deliberately NOT added here yet: wiring one path,
// proving it against real data, then adding the next is the same discipline as everything else
// built this week, not an oversight.
//
// ! ADMISSION HAPPENS HERE, ON THIS MAC, BECAUSE FOMO SIGNALS ONLY EXIST HERE. The cloud collector
// (Hetzner) cannot see this Mac's notifications (`adapters/fomonotifications.js`'s own header).
// Once a coin is admitted it is written to the SAME `data/watchlist.json` a human editing it would
// write to, via the SAME syncWatchlist() below -- so the twice-hourly cloud collector picks it up
// on its own very next run and gives it full continuous coverage from then on, laptop open or not.
function runDiscovery() {
  let signals;
  try { signals = fomoNotifications.pollNewSignals(); }
  catch (e) { console.error(`discovery: ${e.message}`); return; } // FDA off/revoked degrades quietly (D-56)
  if (!signals.length) return;

  const byCoin = new Map();
  for (const s of signals) {
    if (!s.coinAddress) continue;
    if (!byCoin.has(s.coinAddress)) byCoin.set(s.coinAddress, { sym: s.coinTitle, fomo: [] });
    byCoin.get(s.coinAddress).fomo.push(s);
  }

  const social = readJsonl('sector.jsonl').filter((r) => r.kind === 'sector').pop() || null;
  const tickers = social ? (social.tickers || []) : [];

  for (const [ca, { sym, fomo }] of byCoin) {
    if (store.watchlist.some((w) => w.ca === ca)) continue; // already tracked -- nothing to decide

    (async () => {
      let market = null;
      try {
        const m = await fetchMarket(ca);
        market = { verdict: null, flags: null, liq: m.totalLiquidityUsd,
                   buys24: m.txns?.h24?.buys ?? null, sells24: m.txns?.h24?.sells ?? null };
      } catch (e) { /* no market read yet -- evaluateCandidate() rejects cleanly on null */ }

      const bareSym = String(sym || '').split(' ')[0]; // "SLINK at $30m MC" -> "SLINK"
      const socialMatch = tickers.find((t) => t.ticker?.toUpperCase() === bareSym.toUpperCase());
      const socialEvidence = socialMatch ? { weighted: socialMatch.people, mentions: socialMatch.mentions } : null;

      const result = admission.evaluateCandidate({ ca, sym: bareSym, market, fomo, social: socialEvidence });
      console.log(`discovery: ${bareSym} (${ca.slice(0, 8)}...) -> ${result.admit ? 'ADMIT' : 'reject'} -- ${result.reasons[0] || ''}`);
      if (!result.admit) return;

      store.watchlist.push({ ca, sym: bareSym });
      save();
      syncWatchlist();
      if (live) live.watch(store.watchlist);
      try {
        new Notification({
          title: `Now tracking ${bareSym}`,
          body: result.reasons.join(' · '),
        }).show();
      } catch {}
    })();
  }
}

// Every 10 minutes, not on every single FOMO notification -- a coin needs a few signals to
// accumulate before there is anything real to score, and this piggybacks on the same interval as
// nothing else, so it costs no extra polling of anything that has a rate limit.
setInterval(runDiscovery, 10 * 60 * 1000);
setTimeout(runDiscovery, 15000); // once shortly after launch, not only ten minutes in

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

// --- the portfolio -----------------------------------------------------------------------
// Read from the chain, per venue wallet. No venue login is involved and none is needed: both
// venues are non-custodial, so the holdings are in addresses the operator controls.
ipcMain.handle('wallet:list', () => ({ wallets: store.wallets || {}, owner: store.owner }));
ipcMain.handle('wallet:set', (_e, { venue, address }) => {
  const v = String(venue || '').trim().toLowerCase();
  if (!v) throw new Error('which venue?');
  const a = String(address || '').trim();
  // Refuse anything that is not an address rather than storing it and failing later at the RPC,
  // where the error would read as a network problem instead of a typo.
  if (a && !walletAdapter.isAddress(a)) throw new Error('that does not look like a Solana address');
  store.wallets = { ...(store.wallets || {}) };
  if (a) store.wallets[v] = a; else delete store.wallets[v];
  save();
  return store.wallets;
});
// The most recent reading, kept in memory so switching the chart between 24h/7d/30d does not
// re-read the chain and re-price every mint just to redraw a line.
let lastFolio = null;

ipcMain.handle('portfolio:load', async () => {
  const wallets = store.wallets || {};
  if (!Object.keys(wallets).length) return { venues: [], combined: null, empty: true };
  // Cost basis the operator entered by hand, if any. The chain cannot know it.
  const costBasis = {};
  for (const [ca, p] of Object.entries(store.positions || {}))
    if (p && p.costBasisUsd != null) costBasis[ca] = p.costBasisUsd;
  const out = await portfolio.load(wallets, { costBasis });
  lastFolio = out;
  // ! Reads the half-hourly record we already collect, so most positions need no network call at
  // all. Measured 2026-09-01: this step alone was 44.6s of a 45.2s load, almost all of it waiting
  // on a rate-limited API for prices already sitting in this file.
  let history = [];
  try {
    history = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'market.jsonl'), 'utf8')
      .trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch { /* no shared record on this machine yet; pnl24 falls back to fetching */ }
  try { out.pnl24 = await portfolio.pnl24(out.combined?.positions || [], { history }); }
  catch { out.pnl24 = null; }
  // Tell the offline alerter what is actually held. Deliberately not awaited: it is a side effect,
  // and a Cloudflare outage must not slow down or break the portfolio screen. See alerts-push.js.
  alertsPush.pushHoldings(out.combined?.positions || []).catch(() => {});
  return out;
});

// --- the venue rooms ---------------------------------------------------------------------
// A WebContentsView floats above the page and cannot be covered by CSS, so the renderer tells us
// exactly where to put it and, just as importantly, when to take it away.
ipcMain.handle('venue:list', () => Object.keys(venues.VENUES).map((id) => venues.status(id)));
ipcMain.handle('venue:open', (_e, { id, bounds }) => venues.open(win, id, store.owner, bounds));
ipcMain.handle('venue:hide', (_e, id) => venues.hide(win, id));
ipcMain.handle('venue:bounds', (_e, { id, bounds }) => { venues.setBounds(id, bounds); return { ok: true }; });
ipcMain.handle('venue:status', (_e, id) => venues.status(id));
ipcMain.handle('venue:reload', (_e, id) => venues.reload(id));
ipcMain.handle('venue:back', (_e, id) => venues.goBack(id));
ipcMain.handle('venue:external', (_e, id) => venues.openExternal(id));
ipcMain.handle('venue:appWindow', (_e, id) => venues.openAppWindow(id));
ipcMain.handle('venue:signOut', (_e, id) => venues.signOut(id, store.owner));

ipcMain.handle('portfolio:series', async (_e, { days }) => {
  const positions = lastFolio?.combined?.positions || [];
  if (!positions.length) return { points: [], days, missing: [] };
  return portfolio.series(positions, Number(days) || 1);
});

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
    await loadTokensBounded(store.watchlist);
    progress(null);
    if (win && !win.isDestroyed()) win.webContents.send('refreshed');
  }, 10 * 60 * 1000);
}

app.whenReady().then(() => {
  // The BrowserWindow `icon` option (in createWindow) covers Windows/Linux, but macOS ignores it
  // for a window running unpackaged -- the Dock reads its icon from the packaged app bundle, which
  // doesn't exist yet in dev (`electron .`). Setting it directly is what makes the Dock icon
  // non-blank pre-package; a packaged build gets it from the bundle instead, so this is dev-only.
  if (process.platform === 'darwin' && !app.isPackaged) {
    try { app.dock.setIcon(ICON_PATH); } catch {}
  }
  createWindow(); startAutoRefresh(); startLive(); startUpdateChecks();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
