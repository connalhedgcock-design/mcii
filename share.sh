#!/bin/bash
# Saves your changes and shares them with Connal (or pulls his changes down to you).
#
# Usage:
#   ./share.sh "what you changed, in a few words"
#
# What it does, in order:
#   1. Saves everything you've edited as a labeled snapshot (a "commit").
#   2. Grabs any snapshots Connal has shared since you last checked.
#   3. Puts your snapshot on top of his, so the history stays a straight line.
#   4. Uploads your snapshot to GitHub so he can grab it too.
#
# If you and Connal both edited the SAME lines of the SAME file, step 2 will stop
# and tell you there's a conflict instead of guessing. That's normal — it just
# means you two should talk about which version to keep before continuing.
#
# EXCEPTION, added 2026-09-05: the collected DATA files (data/*.jsonl) no longer stop
# for that. The server collects every 30 minutes while you work, so both sides always
# have real readings the other doesn't — and both are true. Those get combined
# automatically, keeping every reading from both sides. Real code and notes still stop
# and ask, because two people editing the same line is a genuine disagreement.

set -e
cd "$(dirname "$0")"

# Teach this copy of git how to combine the data files. Safe to run every time — it just
# rewrites the same setting. Doing it here means neither machine needs any manual setup.
git config merge.mcii-data.name "combine collected data from both machines, losing nothing"
git config merge.mcii-data.driver "python3 \"$(pwd)/tools/merge-data.py\" %O %A %B %P"

if [ -z "$1" ]; then
  echo "Tell me what you changed, e.g.:"
  echo "  ./share.sh \"fixed the price chart colors\""
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Saving your changes..."
  git add -A
  git commit -m "$1"
else
  echo "Nothing new to save on your end — just checking for Connal's updates."
fi

echo "Checking for Connal's updates..."
if ! git pull --rebase origin main; then
  echo ""
  echo "!! Stopped: you and Connal both changed the same part of a file."
  echo "!! Your snapshot is saved locally and safe, but not shared yet."
  echo "!! Don't run this again yet — tell Connal, and get help sorting out"
  echo "!! which version of that part should win."
  echo ""
  echo "!! Note: collected data files combine on their own now, so this is a real"
  echo "!! disagreement about code or notes — worth an actual conversation."
  git rebase --abort 2>/dev/null || true
  exit 1
fi

echo "Sharing your changes..."
git push origin main

echo ""
echo "Done. You and Connal are in sync."
