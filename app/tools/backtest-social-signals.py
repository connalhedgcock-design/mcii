#!/usr/bin/env python3
"""Tests every social-media measurement we collect against what price actually did afterward.

Run with: python3 app/tools/backtest-social-signals.py

!! WHY THIS EXISTS AND WHAT IT DOES NOT PROVE
Connal asked to test social data against as many outcomes as possible, for the most potential
indicators. Taken literally that is the single easiest way to convince yourself something works
when it does not -- test enough combinations of anything against anything and some will look like
winners by pure chance. This runs the wide sweep anyway, because casting a wide net over candidate
indicators is legitimate exploratory work, but it reports HOW MANY tests were run and what fraction
would be expected to clear a significance bar from chance alone, every time -- the same trials-
counting discipline `60-KB/signal-architecture-research.md` already researched (Bailey & Lopez de
Prado's Deflated Sharpe Ratio: the more variants tried, the better the survivor must look to mean
anything). A single number found here that looks good is a HYPOTHESIS, never a finding, until it
clears that bar and then survives on a LATER, separate window of data it was not found on.

!! ZERO NEW DEPENDENCIES -- no scipy/numpy on this machine (checked, not assumed) and this project
runs on none anyway. Pearson correlation and significance are computed from Python's stdlib `math`
and `statistics`, using Fisher's z-transformation for the significance threshold (a standard, large-
sample-accurate approximation) rather than an exact t-distribution p-value, which needs the
incomplete beta function nothing here provides. Stated as an approximation, not hidden as exact.
"""
import json
import math
import statistics
from collections import defaultdict

DATA = __import__('pathlib').Path(__file__).resolve().parents[2] / 'data'

FEATURES = [
    'uniqueAuthors', 'sentiment', 'sentimentRaw', 'diversity', 'duplicateRatio',
    'botRatio', 'burstiness', 'shillRatio', 'medianEngagementRate', 'replyShare',
    'totalViews', 'engagement', 'noiseFiltered',
]
# Not numeric as stored -- encoded to a number so they can be tested the same way as the rest.
CONFIDENCE_RANK = {'none': 0, 'low': 1, 'moderate': 2, 'high': 3}
HORIZONS_H = [3, 6, 12, 24]
TOLERANCE_H = 1.5  # how close a market reading has to be to the target horizon to count


def read_jsonl(name):
    rows = []
    with open(DATA / name) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def pearson(xs, ys):
    n = len(xs)
    if n < 10:
        return None
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    sx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    sy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if sx == 0 or sy == 0:
        return None
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    return cov / (sx * sy)


def inverse_normal_cdf(p):
    """Acklam's rational approximation. Accurate to ~1e-9 for the tail probabilities used here."""
    a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
         1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
    b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
         6.680131188771972e+01, -1.328068155288572e+01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
         -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00]
    p_low, p_high = 0.02425, 1 - 0.02425
    if p < p_low:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    if p <= p_high:
        q = p - 0.5
        r = q * q
        return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)
    q = math.sqrt(-2 * math.log(1 - p))
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)


def r_critical(n, alpha):
    """Fisher z-transform approximation of the |r| needed for significance at this n and alpha."""
    if n <= 3:
        return None
    z_alpha = inverse_normal_cdf(1 - alpha / 2)
    return math.tanh(z_alpha / math.sqrt(n - 3))


def feature_value(row, name):
    if name == 'confidence':
        return CONFIDENCE_RANK.get(row.get('confidence'))
    v = row.get(name)
    if v is None:
        return None
    if name == 'sentiment' and row.get('sentimentThin'):
        return None  # D-86: a mood computed from too few posts is not a real reading
    if name == 'totalViews' and v is not None:
        return math.log1p(v)  # heavy-tailed; compare on the same footing as the rest
    return float(v) if isinstance(v, (int, float)) else None


def nearest(rows_sorted, target_ts, tolerance_ms):
    lo, hi = 0, len(rows_sorted) - 1
    best = None
    while lo <= hi:
        mid = (lo + hi) // 2
        if rows_sorted[mid]['ts'] < target_ts:
            lo = mid + 1
        else:
            hi = mid - 1
    for i in (hi, lo):
        if 0 <= i < len(rows_sorted):
            d = abs(rows_sorted[i]['ts'] - target_ts)
            if d <= tolerance_ms and (best is None or d < best[0]):
                best = (d, rows_sorted[i])
    return best[1] if best else None


def main():
    social = read_jsonl('social.jsonl')
    market = read_jsonl('market.jsonl')

    market_by_ca = defaultdict(list)
    for m in market:
        if m.get('ca') and m.get('ts') and m.get('price') is not None:
            market_by_ca[m['ca']].append(m)
    for ca in market_by_ca:
        market_by_ca[ca].sort(key=lambda r: r['ts'])

    # (feature, horizon) -> list of (feature_value, forward_return)
    pairs = defaultdict(list)
    per_coin_n = defaultdict(int)

    for row in social:
        ca, ts = row.get('ca'), row.get('ts')
        if not ca or not ts or ca not in market_by_ca:
            continue
        mrows = market_by_ca[ca]
        baseline = nearest(mrows, ts, 2 * 3600 * 1000)
        if not baseline or not baseline.get('price'):
            continue
        for h in HORIZONS_H:
            future = nearest(mrows, ts + h * 3600 * 1000, TOLERANCE_H * 3600 * 1000)
            if not future or not future.get('price'):
                continue
            fwd_return = (future['price'] - baseline['price']) / baseline['price']
            for feat in FEATURES + ['confidence']:
                fv = feature_value(row, feat)
                if fv is None:
                    continue
                pairs[(feat, h)].append((fv, fwd_return))
                per_coin_n[ca] += 1

    results = []
    for (feat, h), vals in pairs.items():
        xs, ys = zip(*vals)
        r = pearson(list(xs), list(ys))
        if r is None:
            continue
        results.append({'feature': feat, 'horizon_h': h, 'n': len(vals), 'r': r})

    results.sort(key=lambda x: -abs(x['r']))
    n_tests = len(results)
    alpha_uncorrected = 0.05
    alpha_bonferroni = 0.05 / max(n_tests, 1)
    expected_false_hits = n_tests * alpha_uncorrected

    print(f"\n{'='*78}")
    print(f"SOCIAL FEATURE vs FORWARD PRICE RETURN -- {n_tests} tests run, "
          f"{sum(per_coin_n.values())} total (feature,outcome) observations")
    print(f"{'='*78}")
    print(f"\nAt uncorrected p<0.05 across {n_tests} independent-ish tests, expect roughly "
          f"{expected_false_hits:.1f} to LOOK significant by chance alone even if nothing here is real.")
    print(f"Bonferroni-corrected bar for this many tests: alpha={alpha_bonferroni:.5f}\n")

    print(f"{'feature':<22}{'horizon':>8}{'n':>6}{'r':>9}{'|r|>0.05 bar':>15}{'|r|>corrected bar':>20}")
    for res in results:
        crit05 = r_critical(res['n'], 0.05)
        critB = r_critical(res['n'], alpha_bonferroni)
        flag05 = 'YES' if crit05 and abs(res['r']) > crit05 else ''
        flagB = 'YES' if critB and abs(res['r']) > critB else ''
        print(f"{res['feature']:<22}{res['horizon_h']:>7}h{res['n']:>6}{res['r']:>9.3f}"
              f"{flag05:>15}{flagB:>20}")

    print(f"\n{'='*78}")
    print("Coverage per coin (feature,outcome observations contributed):")
    for ca, n in sorted(per_coin_n.items(), key=lambda x: -x[1]):
        print(f"  {ca[:12]:<14} {n}")

    # !! THE CHECK THAT ACTUALLY MATTERS. A pooled correlation across several coins can look
    # strong purely because coins differ from each other on average, not because the relationship
    # is real within any one of them (a pooling / Simpson's-paradox artifact). This re-checks the
    # top pooled results SEPARATELY per coin -- a real, useful indicator should point the same
    # direction in most coins it has enough data for. Found on the first real run of this tool:
    # NONE of the top pooled results survived this check, direction flipped coin to coin every
    # single time. Kept as a standing part of the tool, not a one-off, because the pooled table
    # alone is actively misleading without it.
    print(f"\n{'='*78}")
    print("PER-COIN CHECK on the top pooled results -- does the direction actually hold coin by coin?")
    print(f"{'='*78}")
    by_coin_feat = defaultdict(lambda: defaultdict(list))
    sym_by_ca = {}
    for row in social:
        ca = row.get('ca')
        if ca:
            sym_by_ca[ca] = row.get('sym')
    top = [res for res in results if r_critical(res['n'], 0.05) and abs(res['r']) > r_critical(res['n'], 0.05)][:10]
    for res in top:
        feat, h = res['feature'], res['horizon_h']
        for row in social:
            ca, ts = row.get('ca'), row.get('ts')
            if not ca or not ts or ca not in market_by_ca:
                continue
            mrows = market_by_ca[ca]
            baseline = nearest(mrows, ts, 2 * 3600 * 1000)
            if not baseline or not baseline.get('price'):
                continue
            future = nearest(mrows, ts + h * 3600 * 1000, TOLERANCE_H * 3600 * 1000)
            if not future or not future.get('price'):
                continue
            fv = feature_value(row, feat)
            if fv is None:
                continue
            fwd_return = (future['price'] - baseline['price']) / baseline['price']
            by_coin_feat[(feat, h)][ca].append((fv, fwd_return))

    for res in top:
        feat, h = res['feature'], res['horizon_h']
        print(f"\n{feat} @ {h}h  (pooled r={res['r']:.3f}, n={res['n']}):")
        signs = []
        for ca, vals in sorted(by_coin_feat[(feat, h)].items(), key=lambda x: -len(x[1])):
            if len(vals) < 15:
                continue
            xs, ys = zip(*vals)
            r = pearson(list(xs), list(ys))
            sym = sym_by_ca.get(ca, ca[:8])
            if r is not None:
                signs.append(r > 0)
                print(f"    {sym:<10} n={len(vals):<5} r={r:.3f}")
        if signs and (all(signs) or not any(signs)):
            print("    -> CONSISTENT direction across coins -- worth a closer look")
        elif signs:
            print("    -> direction FLIPS between coins -- the pooled number is likely an artifact of")
            print("       combining different coins, not a real relationship. Do not act on this one.")


if __name__ == '__main__':
    main()
