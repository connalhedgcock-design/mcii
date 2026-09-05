#!/usr/bin/env python3
"""Merges MCII's data files when two machines collected at the same time.

Registered as a git merge driver (see `.gitattributes` + `share.sh`), so git calls this instead
of stopping with a conflict whenever `data/*.jsonl` or `data/holder-truth.json` differ on both
sides. Written 2026-09-05 after a real conflict: the always-on collection host appended ~25 runs
to market.jsonl while Connal's laptop appended its own, and git correctly refused to guess.

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


def main():
    if len(sys.argv) < 5:
        return 1
    _ancestor, ours, theirs, path = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    if path.endswith('.jsonl'):
        ok = merge_jsonl(ours, theirs, ours)
    elif path.endswith('holder-truth.json'):
        ok = merge_holder_truth(ours, theirs, ours)
    else:
        ok = False              # not a file this understands -- let git conflict normally
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
