#!/usr/bin/env python3
# Connal, 2026-09-05: "we need analysis of when uptick in trend coincides with growth and analysis
# into what type of growth that is -- is that holders growth, is that market cap growth, or is
# there no connection at all." This answers that directly, from real recorded history
# (`data/market.jsonl`), stdlib only (no scipy/numpy on this machine -- checked, not assumed, same
# as `backtest-social-signals.py`).
#
# WHAT IT MEASURES: for each coin with enough recorded history, the correlation between one
# reading-to-reading PRICE move and the same window's HOLDER-COUNT move. A coin whose price rises
# together with its holder count is growing by people actually joining; a coin whose price rises
# with flat or falling holders is growing by existing money re-pricing the same supply --
# speculation, not adoption, even though both look identical on a bare price chart.
#
# ! REPORTED PER COIN, NEVER POOLED. `60-KB/social-signal-backtest.md`, run the same night, is the
# reason: pooling wildly different coins into one number can flip the sign of a real per-coin
# relationship entirely. Nothing here repeats that mistake.
# ! AUTOCORRELATION CAVEAT, same as that file: consecutive readings 30-60 minutes apart are not
# independent draws, so the true independent sample size behind any n below is smaller than n says.
# Read every number here as "did not obviously fail", never as "confirmed".

import json
import math
from collections import defaultdict

MARKET_FILE = 'data/market.jsonl'
MIN_PAIRS = 20  # below this, a correlation is closer to noise than a finding -- do not report it


def load_series():
    by_coin = defaultdict(list)
    with open(MARKET_FILE) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            by_coin[(d.get('ca'), d.get('sym'))].append(d)
    for key in by_coin:
        by_coin[key].sort(key=lambda r: r['ts'])
    return by_coin


def pct_change(a, b):
    if a is None or b is None or a == 0:
        return None
    return (b - a) / abs(a)


def pearson(xs, ys):
    n = len(xs)
    if n < 2:
        return None
    mx = sum(xs) / n
    my = sum(ys) / n
    sx = sum((x - mx) ** 2 for x in xs)
    sy = sum((y - my) ** 2 for y in ys)
    if sx == 0 or sy == 0:
        return None
    sxy = sum((xs[i] - mx) * (ys[i] - my) for i in range(n))
    return sxy / math.sqrt(sx * sy)


def fisher_z_significant(r, n, alpha=0.05):
    # Same large-sample approximation used in backtest-social-signals.py -- not an exact p-value,
    # this project runs no stats libraries.
    if r is None or n < 4 or abs(r) >= 1:
        return False
    z = 0.5 * math.log((1 + r) / (1 - r))
    se = 1 / math.sqrt(n - 3)
    z_crit = 1.96  # ~alpha=0.05, two-tailed
    return abs(z / se) > z_crit


def build_pairs(rows, field):
    """Reading-to-reading price % change paired with the same-window % change in `field`."""
    price_moves, field_moves = [], []
    prev = None
    for r in rows:
        if prev is not None:
            dp = pct_change(prev.get('price'), r.get('price'))
            df = pct_change(prev.get(field), r.get(field))
            if dp is not None and df is not None:
                price_moves.append(dp)
                field_moves.append(df)
        prev = r
    return price_moves, field_moves


def classify(r_holders, n_holders, r_top1, n_top1):
    if r_holders is None or n_holders < MIN_PAIRS:
        return 'not enough holder history to say'
    sig = fisher_z_significant(r_holders, n_holders)
    if r_holders > 0.2 and sig:
        return f'price moves WITH holder count (r={r_holders:.2f}, n={n_holders}) -- looks like real adoption, not just re-pricing'
    if r_holders < -0.2 and sig:
        return f'price moves AGAINST holder count (r={r_holders:.2f}, n={n_holders}) -- price rising while holders fall is a concentration/speculation shape, not adoption'
    return f'no reliable link between price and holder count (r={r_holders:.2f}, n={n_holders}) -- price moves look disconnected from who holds the coin'


def main():
    by_coin = load_series()
    results = []
    for (ca, sym), rows in by_coin.items():
        if len(rows) < MIN_PAIRS + 1:
            continue
        p_moves_h, h_moves = build_pairs(rows, 'holders')
        p_moves_t, t_moves = build_pairs(rows, 'top1')
        r_h = pearson(p_moves_h, h_moves) if len(p_moves_h) >= MIN_PAIRS else None
        r_t = pearson(p_moves_t, t_moves) if len(p_moves_t) >= MIN_PAIRS else None
        results.append({
            'sym': sym, 'ca': ca,
            'n_readings': len(rows),
            'n_holder_pairs': len(p_moves_h), 'r_price_vs_holders': r_h,
            'n_top1_pairs': len(p_moves_t), 'r_price_vs_top1': r_t,
            'read': classify(r_h, len(p_moves_h), r_t, len(p_moves_t)),
        })

    print(f'{"sym":<12} {"readings":>8} {"holder-pairs":>13} {"r(price,holders)":>17} {"top1-pairs":>11} {"r(price,top1)":>14}')
    for res in sorted(results, key=lambda x: -x['n_readings']):
        rh = f"{res['r_price_vs_holders']:.3f}" if res['r_price_vs_holders'] is not None else '—'
        rt = f"{res['r_price_vs_top1']:.3f}" if res['r_price_vs_top1'] is not None else '—'
        print(f"{res['sym']:<12} {res['n_readings']:>8} {res['n_holder_pairs']:>13} {rh:>17} {res['n_top1_pairs']:>11} {rt:>14}")
    print()
    for res in sorted(results, key=lambda x: -x['n_readings']):
        print(f"- {res['sym']}: {res['read']}")


if __name__ == '__main__':
    main()
