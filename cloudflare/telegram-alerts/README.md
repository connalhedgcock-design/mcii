# Telegram liquidity-pull alerts

Sends a Telegram message when a **held** coin's liquidity drops ≥15% or its price drops ≥12%,
**while both laptops are closed**. Thresholds are copied from `app/main/live.js` rather than
invented separately — those are the numbers this project already trusts.

Runs on Cloudflare's cron scheduler every 5 minutes. Not GitHub Actions: GH's scheduler is the one
this project has already been burned by (D-61, `50-LOG/2026-08-29-scanner-hang.md`), so running the
alerter there would put the alert on the exact clock that already failed. Not a local background
process either — the whole point is coverage while the laptops are shut, and a local clock stops
precisely then.

## How holdings get here

The worker **cannot read the wallet itself.** Measured from a Worker on 2026-09-01, every free
keyless Solana RPC refuses `getTokenAccountsByOwner`:

| endpoint | result |
|---|---|
| `api.mainnet-beta.solana.com` | `403 "Your IP or provider is blocked"` (blocks datacenter IPs) |
| `solana-rpc.publicnode.com` | `403 "Request blocked"` for this method; `getHealth` returns 200 |
| `solana.drpc.org` | `400 "chain is not available on free plan"` |
| `rpc.ankr.com/solana` | `403 "API key is not allowed"` |

It's an expensive account-scan call and the free tiers all block it. So the **desktop app pushes**
the current holdings into KV (`app/main/alerts-push.js`, called on every portfolio load) and this
worker prices them every 5 minutes. DexScreener, unlike the RPCs, does answer Cloudflare.

A pushed list would normally risk going stale, but barely does here: a coin can only be *bought*
while a laptop is open, and the app pushes every time the portfolio loads. The gap it cannot cover
is a trade made on a phone away from the app — so the worker sends a warning if the list hasn't been
refreshed in 72 hours rather than quietly watching coins you may have sold.

Nothing about holdings is committed to the repo. **This repo is public** (D-92) — a committed
"here is what we hold" file would broadcast it. KV keeps it private to the Cloudflare account.

## Setup already done

- Cloudflare account, `wrangler login`
- KV namespace `ALERTS_KV` (`13c26aa744c24d7b9286fc90c72ca136`)
- Secrets `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- Deployed, cron `*/5 * * * *`, `workers_dev = false` (no public URL)

## Remaining setup — the app-push token

The app needs a Cloudflare API token to write the holdings key. Create it once, then put it on
both machines.

1. Go to https://dash.cloudflare.com/profile/api-tokens → **Create Token** → **Create Custom Token**
2. Permissions: **Account** → **Workers KV Storage** → **Edit**
3. Account Resources: your account only
4. Create, copy the token
5. On each laptop, add it to `app/.env`:

```
CLOUDFLARE_KV_TOKEN=paste_the_token_here
```

`.env` is gitignored (`*.env`), so the token never reaches the public repo. Without the token the
app simply skips the push and logs it — the portfolio screen is unaffected.

> ⚠️ **`app/.env` is not currently auto-loaded** — the project has no `dotenv` dependency, and
> `TWITTERAPI_KEY` reaches the collector through GitHub Actions secrets instead. Until that's
> wired up, export the variable before launching the app, or the push stays skipped.

## Managing holdings by hand

Normally the app does this. To inspect or set it manually:

```bash
npx wrangler kv key get holdings --binding ALERTS_KV --remote
```

```bash
npx wrangler kv key put holdings --path ./holdings.json --binding ALERTS_KV --remote
```

Shape: `{"pushedAt": <epoch ms>, "positions": [{"ca": "...", "sym": "CATE", "tokens": 296.07}]}`

## Testing

The worker has **no public URL** (`workers_dev = false`) — a workers.dev URL would be an
unauthenticated endpoint anyone who guessed it could fire, and firing it sends real Telegram
messages. Run a tick locally instead:

```bash
npx wrangler dev --remote --port 8801
```

then in another terminal:

```bash
curl http://localhost:8801/
```

It returns which positions were tracked and any pricing errors. Note `--test-scheduled` is *not*
useful here: it does not await `ctx.waitUntil()`, so it returns before any work happens and proves
nothing.

Live logs from the deployed worker:

```bash
npx wrangler tail
```

## Known limitations

- **DexScreener intermittently rate-limits Cloudflare's shared egress IPs.** Observed 429s from the
  Worker while the same request returned 200 from a laptop. Calls retry with exponential backoff,
  but a tick can still be lost; a lost tick means a delayed alert. Measure before trusting.
- **Solana only.** Holdings on other chains (CASHCAT is on an EVM chain) are not covered.
- **Liquidity is the deepest pool's**, not summed across pools — that's what the batch endpoint
  returns. For crash detection that's the right number: an LP pull drains the pool you'd sell into.
- **Positions under $1 are ignored** as dust, matching `portfolio.js`.
- **Not yet proven against a real liquidity crash.** The logic is a port of `live.js`'s tick-over-tick
  comparison, which is proven in the app, but this worker has not yet caught a real rug.

## Tuning

- Cadence: `wrangler.toml` `[triggers]`.
- **KV write budget**: all last-seen readings share ONE key, so cost is 1 write per tick — 288/day
  at 5-minute cadence — however many coins are held. Free tier allows 1,000/day, so cadence could go
  to ~2 min before that matters. (The first version wrote one key per coin, which would have broken
  past 3 coins; that cost was a design artifact, not a real limit.)
- Thresholds and the 15-minute re-alert cooldown are constants at the top of `src/index.js`.
