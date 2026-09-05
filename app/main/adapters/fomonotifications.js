// Reads Connal's own FOMO trade alerts straight off this Mac's notifications -- his 58 followed
// traders, curated by him on FOMO, not an algorithm's guess at "smart money" (see
// 80-WHISPERS/whale-tracking/README's finding that every free "known good trader" claim online is
// unverifiable vendor marketing). This is the opposite: a real person's own considered list,
// surfaced by a tool built for exactly that, read locally rather than scraped from FOMO's servers.
//
// !! THIS ONLY WORKS ON A MAC THAT HAS GRANTED FULL DISK ACCESS TO THE APP, ON PURPOSE, 2026-09-04.
// Connal chose this explicitly after being told plainly what it costs: it is a standing grant to
// the whole Claude desktop app, not scoped to this project, and it exposes every notification this
// Mac has ever shown, not only FOMO's. What keeps this narrow is BEHAVIOUR, not an OS wall -- this
// file only ever queries `app_id` for `family.fomo.app` and reads nothing else.
// ! do not widen this query to any other app without asking again -- that consent was for FOMO.
//
// !! LOCAL-ONLY DATA SOURCE. This lives in this Mac's own notification store
// (`~/Library/Group Containers/group.com.apple.usernoted/db2/db`), not on the chain and not on any
// server. It only sees a notification if this Mac was awake and the FOMO app running when it
// arrived, and it stops the moment the laptop sleeps or closes -- the same laptop-dependency this
// project already hit once with the collector (D-39) and solved by moving to an always-on host
// (D-98). There is no equivalent move available here; this signal exists only while this Mac does.
//
// !! NEVER COMMITTED TO THE REPO. The repo is public (D-92). A trade a followed trader made is
// their own public activity, but the LIST of who Connal follows is his own research, and a public
// history of every parsed signal would eventually reconstruct that list. Parsed signals are kept
// in the per-machine userData folder only, same footing as the sidecar and local history (D-47:
// identity is local-only, never synced) -- never in `data/`.
//
// !! NO NEW DEPENDENCY. This project ships with zero npm runtime dependencies (only Electron
// itself). The notification's content is an Apple binary plist, and a nested one inside that is an
// NSKeyedArchiver archive -- rather than adding an npm plist package, both are decoded by shelling
// out to `python3 -c` using the standard-library `plistlib`, which every Mac already has and which
// (checked directly, not assumed) loads an NSKeyedArchiver blob as a plain nested structure without
// needing to understand the archiver's own semantics.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FOMO_BUNDLE_ID = 'family.fomo.app';
const DB_PATH = path.join(process.env.HOME, 'Library/Group Containers/group.com.apple.usernoted/db2/db');

let storeDir = null;
function init(userDataPath) {
  storeDir = path.join(userDataPath, 'fomo-signals');
  fs.mkdirSync(storeDir, { recursive: true });
}
const watermarkFile = () => path.join(storeDir, 'watermark.json');
const signalsFile = () => path.join(storeDir, 'signals.jsonl');

function lastSeenId() {
  try { return JSON.parse(fs.readFileSync(watermarkFile(), 'utf8')).lastRecId || 0; } catch { return 0; }
}
function saveLastSeenId(id) {
  fs.writeFileSync(watermarkFile(), JSON.stringify({ lastRecId: id, at: Date.now() }));
}

// sqlite3 is a macOS system binary; no dependency needed. Runs as this same process, so it only
// ever has the access this process already has -- nothing new is being granted by calling it.
function querySqlite(sql) {
  try {
    return execFileSync('sqlite3', [DB_PATH, sql], { encoding: 'utf8', timeout: 10000 });
  } catch (e) {
    // A missing grant or a locked db shows up here as a normal failure, not a crash -- Full Disk
    // Access can be revoked at any time in System Settings, and that must degrade quietly, the
    // same way a rejected RPC call does elsewhere in this project (D-56).
    throw new Error(`FOMO notifications unreadable: ${e.message.split('\n')[0]}`);
  }
}

// One Python helper does both layers of decoding and prints exactly the fields this needs, as
// JSON -- so the fragile part (walking an NSKeyedArchiver's raw $objects array by shape, since it
// has no key names once inside) lives in one place, tested against real data, not re-derived here.
const DECODE_PY = `
import sys, json, plistlib, io, re

ADDR_RE = re.compile(r'^0x[0-9a-fA-F]{40}$|^[1-9A-HJ-NP-Za-km-z]{32,44}$')
UUID_RE = re.compile(r'^[0-9a-fA-F-]{36}$')

def main():
    raw = bytes.fromhex(sys.stdin.read().strip())
    outer = plistlib.load(io.BytesIO(raw))
    req = outer.get('req', {})
    out = {'title': req.get('titl'), 'body': req.get('body'), 'at': outer.get('date'),
           'coinAddress': None, 'tradeId': None, 'userId': None}
    usda = req.get('usda')
    if usda:
        try:
            inner = plistlib.load(io.BytesIO(bytes(usda)))
            objects = inner.get('$objects', [])
            uuids = []
            for o in objects:
                if isinstance(o, str) and ADDR_RE.match(o) and not out['coinAddress']:
                    out['coinAddress'] = o
                elif isinstance(o, str) and UUID_RE.match(o):
                    uuids.append(o)
            if uuids: out['tradeId'] = uuids[0]
            if len(uuids) > 1: out['userId'] = uuids[1]
        except Exception:
            pass  # the inner archive not decoding does not invalidate the plainer outer fields
    print(json.dumps(out))

main()
`;

function decodeRecord(hexBlob) {
  const out = execFileSync('python3', ['-c', DECODE_PY], { input: hexBlob, encoding: 'utf8', timeout: 5000 });
  return JSON.parse(out);
}

// The body text is one of two shapes -- a trade alert ("🟢 @handle bought $1,234.56" / "🔴 ...sold
// ...") or a social-style post from someone's feed, which this does not attempt to parse as a
// trade. ! matching nothing is correct here, not a failure -- it means this was not a trade.
const TRADE_RE = /^(🟢|🔴)\s*@(\S+)\s+(bought|sold)\s+\$([\d,]+\.\d{2})/;

const APPLE_EPOCH_OFFSET_MS = 978307200000; // 2001-01-01T00:00:00Z, in Unix ms
const toUnixMs = (appleSeconds) => appleSeconds != null ? Math.round(appleSeconds * 1000) + APPLE_EPOCH_OFFSET_MS : null;

function parseRecord(recId, hexBlob) {
  const d = decodeRecord(hexBlob);
  const m = TRADE_RE.exec(d.body || '');
  if (!m) return null; // not a trade alert -- a social/feed-style notification, correctly skipped
  const [, , handle, verb, amountStr] = m;
  return {
    recId, kind: 'trade', handle,
    direction: verb === 'bought' ? 'buy' : 'sell',
    usd: Number(amountStr.replace(/,/g, '')),
    coinTitle: d.title || null,
    coinAddress: d.coinAddress, tradeId: d.tradeId, userId: d.userId,
    at: toUnixMs(d.at),
  };
}

// Every trade signal seen since the last call. Call this on a timer while the app is open; it is
// a no-op (returns []) the moment Full Disk Access is off, revoked, or the db is briefly locked.
function pollNewSignals() {
  if (!storeDir) throw new Error('fomonotifications.init() was never called');
  const appRow = querySqlite(`SELECT app_id FROM app WHERE identifier='${FOMO_BUNDLE_ID}';`).trim();
  if (!appRow) return []; // FOMO not installed / never notified -- not an error, just nothing yet
  const appId = appRow.split('\n')[0];

  const since = lastSeenId();
  const rows = querySqlite(
    `SELECT rec_id, quote(data) FROM record WHERE app_id=${appId} AND rec_id > ${since} ORDER BY rec_id ASC;`
  ).trim();
  if (!rows) return [];

  const signals = [];
  let maxId = since;
  for (const line of rows.split('\n')) {
    const sep = line.indexOf('|');
    const recId = Number(line.slice(0, sep));
    const hexBlob = line.slice(sep + 1).slice(2, -1); // strip the X'...' quoting sqlite3 adds
    maxId = Math.max(maxId, recId);
    try {
      const parsed = parseRecord(recId, hexBlob);
      if (parsed) signals.push(parsed);
    } catch (e) { /* one bad record is skipped, never turned into a false trade (D-29's rule) */ }
  }
  saveLastSeenId(maxId);
  if (signals.length) {
    fs.appendFileSync(signalsFile(), signals.map((s) => JSON.stringify(s)).join('\n') + '\n');
  }
  return signals;
}

module.exports = { init, pollNewSignals };
