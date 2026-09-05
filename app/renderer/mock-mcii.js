// VISUAL VERIFICATION HARNESS — kept on purpose (see 70-AREAS/observatory/LOG.md #20).
// Not wired into the real index.html and not shipped by any code path in it.
// Fakes window.mcii so index.html can be opened in a plain browser and the real rooms/screens
// can be screenshotted without Electron. Data shapes copied from the real preload.js calls and
// the fields app.js / the room-*.js modules actually read.
(function () {
  const now = Date.now();
  const HOUR = 3600000, DAY = 86400000;

  // A believable walk, so the chart's axes, gridlines and crosshair are exercised
  // against real-looking spacing rather than a straight line.
  const walk = (n, start, step, drift, vol) => Array.from({ length: n }, (_, i) => ({
    ts: now - (n - 1 - i) * step,
    v: +(start * (1 + drift * (i / n) + Math.sin(i / 3.1) * 0.045 + Math.sin(i / 1.7) * 0.02)).toPrecision(6),
    vol: Math.round(vol * (0.6 + 0.8 * Math.abs(Math.sin(i / 2.3)))),
  }));
  const daysOf = (n, start, drift, vol) => walk(n, start, DAY, drift, vol)
    .map((p) => ({ ts: p.ts, c: p.v, v: p.vol }));

  const tok = (over) => Object.assign({
    ca: 'CA' + Math.random().toString(36).slice(2, 10),
    sym: 'SYM', nick: null,
    gate: { verdict: 'PASS', lpStatus: 'locked', findings: [] },
    market: {
      priceUsd: 0.004182, marketCap: 4180000, totalLiquidityUsd: 212000,
      poolCount: 3, volume: { h24: 96200 }, priceChange: { h1: 1.2, h24: 12.4 },
      txns: { h24: { buys: 120, sells: 80 } }, fetchedAt: now, name: 'Sample Coin',
    },
    exit: { usd: 18000, tokens: 4300000, fetchedAt: now },
    safety: { mintAuthority: false, freezeAuthority: false, metadataMutable: false, top1Pct: 3.9, top10Pct: 12.1, fetchedAt: now, totalHolders: 8412, tokenAccounts: 15000 },
    sentence: 'Mint and freeze authority are both revoked, the pool is locked, and no single wallet holds more than 4%.',
    trend: { price24h: { pct: 12.4, spanHours: 24 }, exitUsd: { pct: 3, spanHours: 24 }, liq: { pct: 1, spanHours: 24 }, holders: { pct: 2, spanHours: 24 }, top10: { pct: -1, spanHours: 24 }, recorded: 12 },
    alerts: [],
    history: { days: daysOf(30, 0.0038, 0.12, 90000) },
    position: null,
    errors: [],
  }, over);

  const tokens = [
    tok({ sym: 'CATE', nick: 'CATE', alerts: [{ severity: 'HIGH', title: 'CATE holder count fell 12% in an hour', detail: 'Checked against the other feed; both agree.' }] }),
    tok({ sym: 'WIF', gate: { verdict: 'CAUTION', lpStatus: 'locked', findings: [{ level: 'warn', label: 'Concentration', detail: 'Top 10 hold 38%' }] }, sentence: 'The top ten wallets hold 38% of the supply between them.', exit: { usd: null },
      trend: { price24h: { pct: -6.1, spanHours: 24 }, exitUsd: { pct: -12, spanHours: 24 }, liq: { pct: -9, spanHours: 24 }, holders: { pct: -3, spanHours: 24 }, top10: { pct: 4, spanHours: 24 }, recorded: 30 },
      history: { days: daysOf(30, 2.4, -0.22, 900000) }, market: { priceUsd: 1.9204, marketCap: 1920000000, totalLiquidityUsd: 4200000, poolCount: 6, volume: { h24: 900000 }, priceChange: { h1: -0.4, h24: -6.1 }, txns: { h24: { buys: 50, sells: 90 } }, fetchedAt: now, name: 'dogwifhat' } }),
    tok({ sym: 'BONK2', exit: { usd: 4600, tokens: 900000, fetchedAt: now } }),
    tok({ sym: 'DOGE3', gate: null, market: null, exit: null, sentence: null, alerts: [{ severity: 'MED', title: 'WIF liquidity down 4%', detail: 'Still deep enough that the exit simulation is unchanged.' }] }),
    tok({ sym: 'MEW' }),
    tok({ sym: 'MOON' }),
  ];

  const screenTokens = Array.from({ length: 12 }, (_, i) => ({
    ca: 'CA' + i, sym: ['PONKE', 'POPCAT', 'SLERF', 'MYRO', 'WEN', 'TOSHI', 'MEW', 'BOME', 'SILLY', 'RETARDIO', 'GECKO', 'SMOG'][i],
    name: 'Sample ' + i, accumulating: i < 3, onWatchlist: i === 0,
    holderGrowth: 8, liqGrowth: 5, priceGrowth: 1, scans: 4 + i,
    liq: 180000 - i * 8000, mcap: 2100000 - i * 90000, chg24: (i % 2 ? -1 : 1) * (4 + i),
    holders: 3000 + i * 90, ageH: 20 + i * 6,
    price: 0.0004 * (i + 1),
    vol24: Math.round(40000 * (1 + i * 0.4)),
    volAvg: Math.round(40000 * (1 + i * 0.4) / (1 + [2.4, -0.6, 1.8, 0.05, -0.72, 0.9, 0.02, -0.55, 1.2, 0.03, -0.4, 0.6][i])),
    volShockPct: Math.round([240, -60, 180, 5, -72, 90, 2, -55, 120, 3, -40, 60][i]),
    verdict: ['PASS', 'CAUTION', 'PASS', 'PASS', 'FAIL', 'PASS', 'PASS', 'CAUTION', 'PASS', 'PASS', 'PASS', 'PASS'][i],
    flags: i % 3,
  }));

  const posts = [
    { handle: 'anon412', views: 4100, text: 'CATE holders bailing, careful', kind: 'held' },
    { handle: 'ct_wolf', views: 1800, text: 'wif top wallets look coordinated' },
    { handle: 'rugradar', views: 900, text: 'new pool locked, watching' },
  ];

  const positions = [
    { sym: 'CATE', tokens: 610000, priceUsd: 0.004182, valueUsd: 2550, change24h: 12.4, byVenue: { fomo: 1 } },
    { sym: 'WIF', tokens: 457, priceUsd: 1.9204, valueUsd: 878, change24h: -6.1, byVenue: { axiom: 1 } },
    { sym: 'MEW', tokens: 900000, priceUsd: 0.00042, valueUsd: 376, change24h: 1.0, byVenue: { fomo: 1 } },
    { sym: 'BONK2', tokens: 900000, priceUsd: 0.00042, valueUsd: 376, change24h: 3.1, byVenue: { fomo: 1, axiom: 1 } },
  ];

  window.mcii = {
    getTokens: async () => tokens,
    cachedTokens: async () => tokens,
    refresh: async () => {},
    setPosition: async () => {},
    search: async () => [],
    addToken: async () => {},
    removeToken: async () => {},
    renameToken: async () => {},
    discover: async () => ({}),
    collectionHealth: async () => ({ state: 'ok' }),
    sector: async () => ({
      collectedAt: now - 1000 * 60 * 6,
      lines: [
        'The last scan looked at 36 coins and 10 got through.',
        'Among the 119 coins that passed recent scans, 84 are up and 33 are down over 24 hours.',
      ],
      caveats: ['Being talked about is not the same as being worth buying.'],
      social: {
        sentiment: 0.4, posts: 200, uniqueAuthors: 142, shillRatio: 0.6, duplicateRatio: 0.1,
        filter: { total: 200, promoShare: 0.6 }, important: posts, background: new Array(140).fill(0),
        setAsideSample: posts.slice(0, 2), identified: [
          { ticker: 'MURAD', resolved: { name: 'Murad Coin', sym: 'MURAD' }, matches: [{ liquidityUsd: 140000, ageDays: 22 }] },
          { ticker: 'ANSEM', ambiguous: true, matches: [{}, {}, {}] },
          { ticker: 'GIGI', resolved: null, reason: 'no pool found under this name' },
        ], uniqueAuthorsThin: false,
        sentimentThin: false, topPosts: posts.map((p, i) => ({ ...p, views: 4100 - i * 900 })),
      },
      tickers: [
        { ticker: 'MURAD', people: 3, mentions: 4, major: false },
        { ticker: 'ANSEM', people: 3, mentions: 3, major: false },
        { ticker: 'GIGI', people: 2, mentions: 2, major: false },
      ],
      collisions: { cate: { of: 4, ticker: 'CATE', rank: 2, rivals: [{ name: 'Copycat', liquidityUsd: 90000 }] } },
      breadth: { n: 119, up: 84, down: 33, median: 2.4 },
      cohort: { tracked: 22, drained: 3, halved: 5 },
      funnel: { survivors: 10, universe: 36, topRejects: [['not enough liquidity', 14], ['too new to judge', 7], ['mint authority still live', 5]] },
      recent: Array.from({ length: 8 }, (_, i) => ({
        ts: now - (i + 1) * 1000 * 60 * 37, sym: ['PONKE', 'SLERF', 'MYRO', 'WEN', 'BOME', 'SILLY', 'GECKO', 'SMOG'][i],
        liq: 190000 - i * 14000, chg24: (i % 2 ? -1 : 1) * (3 + i * 2), ageH: 14 + i * 9,
      })),
    }),
    tickerCollisions: async () => ({}),
    openExternal: async () => {},
    owner: async () => 'austin',
    setOwner: async () => {},
    allOwners: async () => ['austin', 'connal'],
    theses: async () => ([
      { id: 'pos.cate', claim: 'Strong community, low float.', invalidation: 'Liquidity drops below $100k', confidence: 60, mechanism: 'Volume keeps growing', timeStop: '2026-09-30' },
    ]),
    saveThesis: async () => {},
    forecasts: async () => ([
      { id: 'f1', question: 'CATE holds past $5M mcap', prob: 55, resolveBy: '2026-09-15', resolved: false },
      { id: 'f2', question: 'WIF top-10 sells this week', prob: 40, resolveBy: '2026-09-10', resolved: true, outcome: false, brier: -0.16, marketImplied: 35 },
    ]),
    addForecast: async () => {},
    resolveForecast: async () => {},
    calibration: async () => ({ brier: 0.18, baseline: 0.25, verdict: 'Below 0.25 is better than guessing. This needs 50 to mean much.', n: 31, open: 7, marketBrier: 0.22 }),
    notes: async () => ([{ owner: 'austin', ts: now - 1000 * 60 * 60, text: 'Watching CATE closely this week.' }]),
    addNote: async () => {},
    screenLatest: async () => ({ tokens: screenTokens, lastScan: now - 1000 * 60 * 3 }),
    socialFor: async (ca) => {
      if (String(ca).startsWith('CA1')) return { rows: [], latest: null, breadth: null };   // one coin with nothing, on purpose
      return {
        rows: new Array(41).fill(0),
        latest: {
          posts: 128, uniqueAuthors: 46, sentiment: 0.31, sentimentN: 88, botRatio: 0.18,
          duplicateRatio: 0.09, shillRatio: 0.34, noiseFiltered: 22,
          topPosts: posts.map((p) => ({ ...p, sentiment: 0.4 })),
        },
        reliability: { ok: true, thin: false, manipulated: false, confidence: 'good', problems: [], verdict: null },
        breadth: { value: 1.4, reading: 'more people than usual are posting about this' },
      };
    },
    allAlerts: async () => ([]),
    orionStatus: async () => ({ connected: false }),
    orionAsk: async (q) => (/Ask ME questions/.test(q)
      ? 'Which of your coins would you sell first if liquidity halved overnight, and why that one?\n'
        + 'CATE has been in the log four times this week — is that conviction or attention?\n'
        + 'What would the scanner have to show for you to stop tracking a coin entirely?\n'
        + 'Is the 24h volume rule catching moves early enough to act on, or only after the fact?\n'
        + 'Which forecast on the board are you least willing to defend right now?'
      : 'Two entries a week apart both say CATE holders are leaving, but the second one is more confident with no new evidence between them.\n'
        + 'The WIF note contradicts the open forecast at 40% — one of the two should move.\n'
        + 'Every entry this week is about coins already held; nothing is written about anything passed over.'),
    orionLogin: async () => {},
    historySeries: async (ca, field, days) => {
      const n = days === 1 ? 26 : days === 7 ? 60 : 90;
      const step = (days * DAY) / n;
      const base = field === 'v24' ? 96000 : 0.0041;
      return walk(n, base, step, field === 'v24' ? -0.1 : 0.14, 1).map((p) => ({ ts: p.ts, v: p.v }));
    },
    wallets: async () => ({ wallets: { fomo: 'Ax1cE9mK4pQwerty000000000000000000000000', axiom: 'Bx2cE9mK4pQwerty000000000000000000000000' } }),
    setWallet: async () => {},
    portfolio: async () => ({
      combined: { positions, totalUsd: 4180, topWeightPct: 61 },
      pnl24: { absUsd: 240, pct: 6.2 },
      venues: [
        { venue: 'fomo', totalUsd: 2926, sol: 1.2, positions: positions.filter((p) => p.byVenue.fomo), address: 'Ax1cE9mK4pQwerty000000000000000000000000' },
        { venue: 'axiom', totalUsd: 1254, sol: 0.4, positions: positions.filter((p) => p.byVenue.axiom), address: 'Bx2cE9mK4pQwerty000000000000000000000000' },
      ],
    }),
    portfolioSeries: async () => ({ points: Array.from({ length: 24 }, (_, i) => ({ ts: now - (24 - i) * 3600000, usd: 3900 + Math.sin(i / 3) * 200 + i * 12 })), missing: [], truncated: false }),
    venueList: async () => ([{ id: 'fomo', label: 'fomo' }, { id: 'axiom', label: 'axiom' }]),
    venueOpen: async () => {}, venueHide: async () => {}, venueBounds: async () => {}, venueReload: async () => {},
    venueBack: async () => {}, venueExternal: async () => {}, venueAppWindow: async () => {}, venueSignOut: async () => {},
    venueStatus: async (id) => ({ configured: false, embeddable: false, label: id, why: 'preview harness — venues are not embedded here.' }),
    onLive: () => {}, onLiveAlert: () => {}, onRefreshed: () => {}, onProgress: () => {},
    checkForUpdates: async () => ({ upToDate: true }),
    applyUpdate: async () => {},
    restartApp: async () => {},
    onUpdateStatus: () => {},
    shareChanges: async () => ({ ok: true }),
  };
})();
