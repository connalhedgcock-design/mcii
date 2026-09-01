#!/bin/bash
# Shows how much the social scanning has cost this month, and whether that pace
# keeps it inside the budget for the rest of the month.
#
# Usage:
#   ./spend.sh
#
# It grabs the latest record from the server first, so the number is current
# rather than whatever your laptop last saw. It changes nothing and shares
# nothing -- it only reads.
#
# ! The rate is worked out from how fast the number has moved over the last few
#   hours, NOT from the month's average. On the 1st of a month the average is
#   meaningless, and that is exactly when someone is most likely to look.

set -e
cd "$(dirname "$0")"

echo "Getting the latest figures..."
git fetch -q origin main 2>/dev/null || echo "  (couldn't reach GitHub -- showing what's on this laptop)"

python3 - "$@" <<'PY'
import json, subprocess, datetime, sys

def read(ref=None):
    p = "data/x-spend.json"
    if ref:
        out = subprocess.run(["git","show",f"{ref}:{p}"],capture_output=True,text=True)
        if out.returncode: return None
        return json.loads(out.stdout)
    return json.load(open(p))

# Prefer the server's copy over the laptop's -- the server is the only writer.
now = read("origin/main") or read()
usd, cap, posts = now["usd"], now["capUsd"], now["posts"]

# Walk back through the record to find a reading at least 3h old, and use the
# slope between then and now. A shorter window is too noisy to mean anything.
log = subprocess.run(
    ["git","log","--format=%H %ct","-40","origin/main","--","data/x-spend.json"],
    capture_output=True,text=True).stdout.strip().splitlines()

rate = None
if log:
    newest_t = int(log[0].split()[1])
    for line in log[1:]:
        h, t = line.split()
        t = int(t)
        hours = (newest_t - t) / 3600
        if hours >= 3:
            old = read(h)
            if old and old.get("month") == now.get("month"):
                rate = (usd - old["usd"]) / hours * 24
            break

stamp = datetime.datetime.fromtimestamp(int(log[0].split()[1])) if log else None

print()
print(f"  Spent this month   ${usd:,.2f} of ${cap:.0f}    ({posts:,} posts)")
if stamp:
    age = (datetime.datetime.now() - stamp).total_seconds()/3600
    print(f"  Figures from       {stamp:%d %b %H:%M}  ({age:.1f} hours ago)")

if rate is None:
    print()
    print("  Not enough history yet to work out the pace.")
    print("  Try again in a few hours -- it needs at least 3 hours between readings.")
else:
    month = rate * 30
    print(f"  Current pace       ${rate:,.2f} a day  ->  ${month:,.0f} a month")
    print()
    if month <= cap * 0.9:
        print(f"  ON TRACK. At this pace the month costs about ${month:,.0f}, inside the ${cap:.0f} budget.")
    else:
        left = cap - usd
        days = left / rate if rate > 0 else 999
        print(f"  OVER BUDGET. At this pace the ${cap:.0f} runs out in about {days:.0f} days,")
        print( "  and when it runs out the scanning STOPS COMPLETELY until next month.")
print()
PY
