#!/usr/bin/env python3
# Connal, 2026-09-05: "we will have to continue to do analysis of our records on what this data
# does ... please run tests on it even though it is still on display." This is that test, run the
# same night the trend-candidate list first went up: does the CONSISTENCY score
# (`app/tools/find-trending-candidates.js`) computed from data available AT THE TIME actually say
# anything about what the coin does NEXT, or is it noise dressed as a pattern -- same question, same
# method, as `backtest-social-signals.py` and `backtest-trend-growth.py`, applied to this metric.
#
# WHAT IT MEASURES, WALK-FORWARD, NO LOOKAHEAD: at every scan reading for a coin (once it has at
# least 4 prior readings), computes the consistency score and the price move SO FAR using only
# readings up to and including that point -- exactly what `find-trending-candidates.js` would have
# shown at that moment -- then checks the very NEXT reading's price move, which the metric could not
# have seen. Per-coin Pearson correlation between "consistency so far" and "what happened next."
#
# ! REPORTED PER COIN, NEVER POOLED -- same reason as the other two backtests: pooling different
# coins can flip a real per-coin relationship's sign entirely.
# ! AUTOCORRELATION CAVEAT IS STRONGER HERE THAN IN THE OTHER TWO FILES. The consistency score at
# reading i is built from the SAME price series whose next step is being predicted -- it is a
# momentum measure of one continuous series, not an independent external signal. A significant
# correlation here says "this coin's own recent direction tends/doesn't tend to continue"
# (momentum vs mean-reversion), not "this metric contains new information." That is still a real,
# useful, testable question -- it is a different question from the social/holders tests, and the
# read below says so explicitly rather than reusing the other files' framing by accident.

import json
import math
from collections import defaultdict

CANDIDATES_FILE = 'data/candidates.jsonl'
MIN_PRIOR_READINGS = 4  # matches find-trending-candidates.js's own MIN_READINGS
MIN_PAIRS = 15


def load_series():
    by_coin = defaultdict(list)
    with open(CANDIDATES_FILE) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            if d.get('price') is None:
                continue
            by_coin[(d.get('ca'), d.get('sym'))].append(d)
    for key in by_coin:
        by_coin[key].sort(key=lambda r: r['ts'])
    return by_coin


def consistency_so_far(prices):
    """Fraction of consecutive steps agreeing with the OVERALL (first->last) direction, using only
    `prices` up to the current point -- same definition as find-trending-candidates.js's own
    `consistency()`, just recomputed at each walk-forward step instead of once at the end."""
    if len(prices) < 2:
        return None
    overall_up = prices[-1] > prices[0]
    agree, total = 0, 0
    for i in range(1, len(prices)):
        d = prices[i] - prices[i - 1]
        if d == 0:
            continue
        total += 1
        if (d > 0) == overall_up:
            agree += 1
    return agree / total if total else None


def pearson(xs, ys):
    n = len(xs)
    if n < 2:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    sx = sum((x - mx) ** 2 for x in xs)
    sy = sum((y - my) ** 2 for y in ys)
    if sx == 0 or sy == 0:
        return None
    sxy = sum((xs[i] - mx) * (ys[i] - my) for i in range(n))
    return sxy / math.sqrt(sx * sy)


def fisher_z_significant(r, n):
    if r is None or n < 4 or abs(r) >= 1:
        return False
    z = 0.5 * math.log((1 + r) / (1 - r))
    se = 1 / math.sqrt(n - 3)
    return abs(z / se) > 1.96


def walk_forward_pairs(rows):
    """(consistency_so_far, next_step_return) pairs, no lookahead -- consistency at index i uses
    only rows[0..i], the outcome is the move from i to i+1, which the metric could not see."""
    prices = [r['price'] for r in rows]
    pairs = []
    for i in range(MIN_PRIOR_READINGS - 1, len(rows) - 1):
        cons = consistency_so_far(prices[: i + 1])
        if cons is None or prices[i] == 0:
            continue
        next_return = (prices[i + 1] - prices[i]) / prices[i]
        pairs.append((cons, next_return))
    return pairs


def main():
    by_coin = load_series()
    results = []
    for (ca, sym), rows in by_coin.items():
        pairs = walk_forward_pairs(rows)
        if len(pairs) < MIN_PAIRS:
            continue
        xs = [p[0] for p in pairs]
        ys = [p[1] for p in pairs]
        r = pearson(xs, ys)
        sig = fisher_z_significant(r, len(pairs))
        results.append({'sym': sym, 'ca': ca, 'n': len(pairs), 'r': r, 'sig': sig})

    results.sort(key=lambda x: -x['n'])
    print(f'{"sym":<14} {"n (decision points)":>20} {"r(consistency, next move)":>27} {"significant?":>13}')
    for res in results:
        r_str = f"{res['r']:.3f}" if res['r'] is not None else '—'
        print(f"{res['sym']:<14} {res['n']:>20} {r_str:>27} {str(res['sig']):>13}")

    n_sig_pos = sum(1 for r in results if r['sig'] and r['r'] and r['r'] > 0)
    n_sig_neg = sum(1 for r in results if r['sig'] and r['r'] and r['r'] < 0)
    print()
    print(f'{len(results)} coins had enough walk-forward decision points to test (n>={MIN_PAIRS}).')
    print(f'{n_sig_pos} showed momentum (consistency predicts MORE of the same direction next).')
    print(f'{n_sig_neg} showed reversal (consistency predicts the OPPOSITE next).')
    print(f'{len(results) - n_sig_pos - n_sig_neg} showed no reliable link either way.')


if __name__ == '__main__':
    main()
