#!/bin/bash
# Adds a wallet to the list the app watches on-chain activity for.
#
# Usage:
#   ./follow-wallet.sh <solana address> ["a name for it"]
#
# What it does: adds the address to data/wallets.json. It does NOT share it with Austin's
# machine or the server on its own -- run ./share.sh afterward, same as any other change.
#
# ! who goes on this list is your call, not the app's -- there is no honest, free way for the
#   app to decide "this wallet is worth following" on its own. Pick them yourself (Axiom's
#   wallet tracker, or wherever you find one worth watching) and add them here.

set -e
cd "$(dirname "$0")"

ADDR="$1"
NICK="${2:-}"

if [ -z "$ADDR" ]; then
  echo "Usage: ./follow-wallet.sh <solana address> [\"a name for it\"]"
  exit 1
fi

if ! [[ "$ADDR" =~ ^[1-9A-HJ-NP-Za-km-z]{32,44}$ ]]; then
  echo "That doesn't look like a Solana address (expected 32-44 letters/numbers, no 0, O, I or l)."
  exit 1
fi

WHOAMI=$(python3 -c "
import json
try:
  print(json.load(open('$HOME/Library/Application Support/mcii/snapshot.json')).get('owner') or 'connal')
except Exception:
  print('connal')
" 2>/dev/null || echo "connal")

python3 - "$ADDR" "$NICK" "$WHOAMI" <<'PY'
import json, sys, datetime
addr, nick, who = sys.argv[1], sys.argv[2] or None, sys.argv[3]
p = "data/wallets.json"
try:
    wallets = json.load(open(p))
except Exception:
    wallets = []
if any(w["address"] == addr for w in wallets):
    print(f"Already on the list ({addr[:6]}...{addr[-4:]}).")
    sys.exit(0)
wallets.append({
    "address": addr, "nick": nick, "addedBy": who,
    "addedAt": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
})
json.dump(wallets, open(p, "w"), indent=2)
open(p, "a").write("\n")
label = nick or f"{addr[:6]}...{addr[-4:]}"
print(f"Added {label} to the followed-wallet list.")
print("Run ./share.sh \"followed a wallet\" to share it with the other machine.")
PY
