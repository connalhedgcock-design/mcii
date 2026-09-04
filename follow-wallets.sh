#!/bin/bash
# Adds a whole list of wallets at once -- paste them in, done.
#
# Usage, either way works:
#
#   ./follow-wallets.sh
#   (paste your list, press Enter, then press Control-D)
#
#   ./follow-wallets.sh mylist.txt
#   (a text file, one wallet per line)
#
# Each line can be just an address, or an address with a name after it:
#   J7NJrRiLcDZtFvKPgZcRJpAjNLwvCLuffABcHgtmozcE
#   9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump  the ansem wallet
#
# It's forgiving -- if you paste something messier (copied straight off a
# website, with other text around each address) it picks the address out of
# each line and uses whatever's left over as the name. Anything it can't
# find an address in gets skipped and shown to you, nothing is guessed at.
#
# It does NOT share the list with the other machine on its own -- run
# ./share.sh afterward, same as any other change.

set -e
cd "$(dirname "$0")"

if [ -n "$1" ]; then
  INPUT=$(cat "$1")
else
  echo "Paste your list below. When you're done, press Enter then Control-D."
  INPUT=$(cat)
fi

WHOAMI=$(python3 -c "
import json
try:
  print(json.load(open('$HOME/Library/Application Support/mcii/snapshot.json')).get('owner') or 'connal')
except Exception:
  print('connal')
" 2>/dev/null || echo "connal")

python3 - "$WHOAMI" <<PY
import json, sys, re, datetime

who = sys.argv[1]
raw = """$INPUT"""
ADDR_RE = re.compile(r'[1-9A-HJ-NP-Za-km-z]{32,44}')

p = "data/wallets.json"
try:
    wallets = json.load(open(p))
except Exception:
    wallets = []
existing = {w["address"] for w in wallets}

added, dupes, skipped = [], [], []
now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

for line in raw.splitlines():
    line = line.strip()
    if not line:
        continue
    m = ADDR_RE.search(line)
    if not m:
        skipped.append(line)
        continue
    addr = m.group(0)
    nick = (line[:m.start()] + line[m.end():]).strip(" ,-\t") or None
    if addr in existing:
        dupes.append(nick or addr)
        continue
    wallets.append({"address": addr, "nick": nick, "addedBy": who, "addedAt": now})
    existing.add(addr)
    added.append(nick or addr)

if added:
    json.dump(wallets, open(p, "w"), indent=2)
    open(p, "a").write("\n")

print()
if added:
    print(f"Added {len(added)}:")
    for a in added: print(f"  + {a}")
if dupes:
    print(f"\nAlready on the list ({len(dupes)}), left alone:")
    for d in dupes: print(f"  - {d}")
if skipped:
    print(f"\nCouldn't find an address on {len(skipped)} line(s), skipped:")
    for s in skipped: print(f"  ? {s}")
if not added and not dupes and not skipped:
    print("Nothing to add -- the paste looked empty.")
if added:
    print('\nRun ./share.sh "followed some wallets" to share this with the other machine.')
PY
