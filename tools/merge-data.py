#!/usr/bin/env python3
"""Merges MCII's data files when two machines collected at the same time.

Registered as a git merge driver (see `.gitattributes` + `share.sh`), so git calls this instead
of stopping with a conflict whenever `data/*.jsonl`, `data/holder-truth.json`,
`data/wallet-watch-state.json`, or `data/x-spend.json` differ on both sides. Written 2026-09-05
after a real conflict: the always-on collection host appended ~25 runs to market.jsonl while
Connal's laptop appended its own, and git correctly refused to guess. Extended 2026-09-10 after
the same thing hit `x-spend.json`, which wasn't covered yet and so still stopped `share.sh`.

!! THE WHOLE POINT: "whose lines win" IS THE WRONG QUESTION for these files. They are append-only
logs of things that really happened, on two machines, at different moments. Both sides are true.
Losing either would put a hole in the record -- and this project's own history says holes are the
expensive failure (D-98: five collection blackouts, ~13h missing, only one noticed at the time).
∴ this NEVER picks a side. It keeps every line from both, drops exact duplicates, and puts them
back in timestamp order.

! it deliberately handles ONLY the data files named in `.gitattributes`. A conflict in real code
or in a vault note still stops and asks a human, which is correct -- two people editing the same
function is a genuine disagreement, and this must never silently resolve one of those.

Git calls this as:  merge-data.py %O %A %B %P
  %O ancestor   %A our version (ALSO where the result must be written)   %B their version
  %P the real path, used only to decide which shape of file this is.
Exit 0 = merged cleanly. Exit 1 = could not, leave it conflicted for a person.
"""
import json
import sys


def read_lines(path):
    try:
        with open(path, encoding='utf-8') as f:
            return [ln.strip() for ln in f if ln.strip()]
    except FileNotFoundError:
        return []


def merge_jsonl(ours_path, theirs_path, out_path):
    """Every line from both sides, deduplicated, back in time order."""
    seen, rows = set(), []
    for path in (ours_path, theirs_path):
        for line in read_lines(path):
            if line in seen:
                continue
            seen.add(line)
            try:
                ts = json.loads(line).get('ts', 0)
            except Exception:
                ts = 0          # an unparseable line is KEPT, just sorted to the front, never dropped
            rows.append((ts, line))
    rows.sort(key=lambda r: r[0])
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(line for _, line in rows) + '\n')
    return True


def merge_holder_truth(ours_path, theirs_path, out_path):
    """A per-coin snapshot, not a log -- so the NEWEST reading for each coin wins, per coin."""
    try:
        ours = json.load(open(ours_path, encoding='utf-8'))
        theirs = json.load(open(theirs_path, encoding='utf-8'))
    except Exception:
        return False            # malformed on either side -- hand it back to a person
    merged = dict(ours.get('tokens', {}))
    for ca, rec in theirs.get('tokens', {}).items():
        current = merged.get(ca)
        if current is None or (rec.get('fetchedAt') or 0) > (current.get('fetchedAt') or 0):
            merged[ca] = rec
    out = {
        'checkedAt': max(ours.get('checkedAt', 0), theirs.get('checkedAt', 0)),
        'tokens': merged,
    }
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2)
        f.write('\n')
    return True


def merge_wallet_state(ours_path, theirs_path, out_path):
    """Per-wallet watermark (address -> last-seen ms). Not a log -- the LATER timestamp wins per
    wallet, same shape as `merge_holder_truth`. Never take the earlier one: that would replay
    activity as if it were new on whichever machine runs next."""
    try:
        ours = json.load(open(ours_path, encoding='utf-8'))
        theirs = json.load(open(theirs_path, encoding='utf-8'))
    except Exception:
        return False
    merged = dict(ours)
    for addr, ts in theirs.items():
        if ts is not None and (merged.get(addr) is None or ts > merged[addr]):
            merged[addr] = ts
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, indent=1)
        f.write('\n')
    return True


# Must track adapters/twitterapi.js's COST_PER_POST -- only used to recompute the informational
# remainingUsd/postsRemaining fields here, so a mismatch is cosmetic, not a budget bug: the app
# overwrites this file from its own live count on every real run (collector.js, cloud-collect.js).
COST_PER_POST = 0.00015


def merge_spend(ancestor_path, ours_path, theirs_path, out_path):
    """Each machine's own running total of what IT has spent this month against the shared
    twitterapi.io budget (D-98's collection host + Connal's laptop both call the API directly).
    usd/posts are a counter, not a snapshot -- unlike holder-truth/wallet-state, the higher of the
    two is NOT "more current", it is missing the other machine's real spend. Taking it anyway
    would under-report true spend and risk quietly blowing the cap (D-90). Real fix: a 3-way merge
    that adds back each side's own delta since the last common point, so neither side's spend is
    dropped and neither is double-counted."""
    try:
        ours = json.load(open(ours_path, encoding='utf-8'))
        theirs = json.load(open(theirs_path, encoding='utf-8'))
    except Exception:
        return False
    month = ours.get('month')
    if theirs.get('month') != month:
        return False             # crossed a month boundary mid-conflict -- genuinely ambiguous, ask a person

    try:
        ancestor = json.load(open(ancestor_path, encoding='utf-8'))
        if ancestor.get('month') != month:
            ancestor = None      # ancestor predates this month's reset -- its counters don't apply
    except Exception:
        ancestor = None
    anc_usd = (ancestor or {}).get('usd', 0) or 0
    anc_posts = (ancestor or {}).get('posts', 0) or 0

    ours_usd, theirs_usd = ours.get('usd', 0) or 0, theirs.get('usd', 0) or 0
    ours_posts, theirs_posts = ours.get('posts', 0) or 0, theirs.get('posts', 0) or 0
    # max(...) floor: real spend never goes down, so the merged total must never read lower than
    # either side already recorded, even if the delta math above somehow undershoots.
    usd = max(ours_usd + theirs_usd - anc_usd, ours_usd, theirs_usd)
    posts = max(ours_posts + theirs_posts - anc_posts, ours_posts, theirs_posts)

    cap = max(ours.get('capUsd', 0) or 0, theirs.get('capUsd', 0) or 0)  # cap has only ever been raised (D-90)
    out = {
        'month': month,
        'usd': round(usd, 6),
        'posts': posts,
        'capUsd': cap,
        'remainingUsd': round(cap - usd, 4),
        'postsRemaining': max(0, int((cap - usd) / COST_PER_POST)),
    }
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2)
        f.write('\n')
    return True


def main():
    if len(sys.argv) < 5:
        return 1
    ancestor, ours, theirs, path = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    if path.endswith('.jsonl'):
        ok = merge_jsonl(ours, theirs, ours)
    elif path.endswith('holder-truth.json'):
        ok = merge_holder_truth(ours, theirs, ours)
    elif path.endswith('wallet-watch-state.json'):
        ok = merge_wallet_state(ours, theirs, ours)
    elif path.endswith('x-spend.json'):
        ok = merge_spend(ancestor, ours, theirs, ours)
    else:
        ok = False              # not a file this understands -- let git conflict normally
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
