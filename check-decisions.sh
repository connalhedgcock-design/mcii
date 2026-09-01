#!/bin/bash
# Lists decisions that were LOCKED but never actually built.
#
# Usage:
#   ./check-decisions.sh
#
# HOW IT WORKS, and why it is this way rather than a hand-kept list:
# a decision row that needs code carries a marker, e.g.  `proof: PRICE_UP_PCT`.
# This script greps the codebase for each marker. Present = built. Absent = not.
# ! a hand-kept "still to build" list goes stale SILENTLY, which is the exact failure
#   D-93 rejected. A proof marker cannot go stale: you cannot mark something built
#   without there being real code carrying that name.
#
# ! ADDING A NEW DECISION THAT NEEDS CODE? Put `proof: <something-grep-able>` in the
#   row, and name the same thing in the code. If you cannot think of a marker, the
#   decision is probably too vague to build, which is worth knowing on the day you
#   write it rather than a week later.

set -uo pipefail
cd "$(dirname "$0")"

built=0; unbuilt=0
missing=()

while IFS= read -r line; do
  id=$(printf '%s' "$line" | grep -oE '^\| (D-[0-9]+)' | awk '{print $2}')
  marker=$(printf '%s' "$line" | grep -oE 'proof: [A-Za-z0-9_.-]+' | head -1 | cut -d' ' -f2)
  [ -z "${marker:-}" ] && continue
  # ! search the root scripts too -- not every decision is implemented inside app/.
  if grep -rqF "$marker" app/ cloudflare/ ./*.sh 2>/dev/null; then
    built=$((built+1))
  else
    unbuilt=$((unbuilt+1))
    summary=$(printf '%s' "$line" | cut -d'|' -f3 | cut -c1-96 | sed 's/^ *//')
    missing+=("  $id  $summary...")
  fi
done < 50-LOG/decisions.md

echo
if [ "$unbuilt" -eq 0 ]; then
  echo "  All $built decisions that need code have it."
else
  echo "  NOT BUILT YET — $unbuilt decision(s) locked but with no code behind them:"
  echo
  for m in "${missing[@]}"; do echo "$m"; done
  echo
  echo "  These were DECIDED, not proposed. Build them before starting anything new,"
  echo "  or reopen the decision on purpose and say so. A locked row with no code is"
  echo "  worse than an open question, because the vault reads as though it exists."
fi
echo "  ($built built, $unbuilt not)"
echo
