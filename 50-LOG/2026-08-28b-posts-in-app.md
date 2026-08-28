---
id: log.20260828b
t: log
v: 1
---
# 2026-08-28 ACTUAL POSTS SHOWN IN THE APP
- operator: "we need info being pulled from X into the app". data WAS already flowing (21 CATE / 23 NEEGY readings,
  breadth index live at 0.79 / 0.94) — the gap was that the panel showed only SCORES, never a single post.
- ∴ a score with no example behind it cannot be sanity-checked. being able to read the posts is how you catch the
  SCORER being wrong — which matters here because I wrote the scorer.
- ✓ bucket() now keeps topPosts: 5 most-viewed, text capped 240 chars, w/ handle, views, likes, per-post tone.
  bounded at k=5 ∴ storage stays flat as time passes (same discipline as the sidecar design).
- ✓ card renders them under the social strip: handle, view count, tone chip (green/red/grey), text.

## LIVE PULL
- CATE 24 people, tone +0.316. top post 3,828 views (a $500 giveaway promo), two whale-buy bot posts ~3k views.
- NEEGY 20 people, tone +0.818. ! top post only 108 views; the rest 73/43/35/25.
  ∴ NEEGY's high tone score is computed over very small-reach posts. the number is real, the reach behind it is not.
  ? consider surfacing median reach next to tone so a strong score on tiny posts reads honestly.
- 0 spam filtered on both this round.

## TESTS 103. spend $0.0115 of $12.
