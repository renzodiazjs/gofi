# GoFI — Goal Finance

Aleph Hackathon 2026 · WDK Track · Ethereum Sepolia testnet
Team: `renzodiazjs`, `nacho-mazzoni`

An AI agent that turns a financial goal — *"I have 500 USDT, I want 700 in six
months, moderate risk"* — into an on-chain strategy, executed from a
self-custodial WDK wallet.

**The thesis, and the reason this project exists:** GoFI runs the compound
interest arithmetic **in code** and tells you when the goal does not add up. It
does not agree with you. An agent that says yes to 40% in six months is not
being helpful, it is being useless with extra steps.

---

## Non-negotiable rules

These are not style preferences. Breaking one of them breaks the project.

### 1. Never invent a WDK API

Before writing a single line against WDK:

1. Confirm the package exists on npm.
2. Confirm the method exists — read `node_modules/@tetherto/<pkg>/types/index.d.ts`.
3. Confirm the installed version matches what you are reading.
4. **If any of that is unclear: stop and ask.** Do not guess a plausible name.

Then one more step that has already saved this project twice: **verify against
the live API, not only against the types.** The shipped `.d.ts` files have been
wrong. See Gotchas for the two concrete cases.

### 2. Testnet only

Ethereum Sepolia, chain ID `11155111`. No mainnet. No real funds. Ever.

### 3. Secrets

- Never hardcode a seed phrase or private key.
- Never commit `.env.local`.
- Never store a private key in Supabase.
- Never expose a secret to the browser. **Anything named `NEXT_PUBLIC_*` ships
  to the client** — that is not a convention, it is what Next.js does.
- Never print a secret in a log, an error, or a commit message.
- The seed is read in exactly one place: `lib/wdk/client.ts`, behind
  `import "server-only"`. It does not travel anywhere else.

### 4. Markdown

`*.md` is gitignored. Four files are unignored on purpose — this one, `DEMO.md`,
`AUDIT.md`, `CHANGELOG.md` — because a teammate cloning the repo needs them. Do
not add a fifth unless a **person** needs it to do their job.

### 5. Commits

Conventional commits. Small and semantic — the history should show this was
built during the hackathon, not dumped in one push. **Never add `Co-Authored-By`
or any AI attribution.**

---

## Stack

| | |
|---|---|
| Framework | Next.js 16.3.2 (App Router, Turbopack), React 19.2.8 |
| Language | TypeScript, target **ES2022** (BigInt literals need it) |
| Styling | Tailwind 4 |
| Wallet | `@tetherto/wdk` 1.0.0-beta.16, `@tetherto/wdk-wallet-evm` 1.0.0-beta.17 |
| Pricing | `@tetherto/wdk-pricing-provider` + `-bitfinex-http`, both 1.0.0-beta.5 |
| Database | Supabase (Postgres) |
| Model | Claude Opus 5 (`claude-opus-5`) via `@anthropic-ai/sdk` |
| Validation | zod 4 |
| Package manager | **pnpm** |

## Running it

```bash
pnpm install
cp .env.example .env.local     # then fill it in
pnpm wallet:new                # generates a TESTNET seed into .env.local
pnpm dev
```

Run both migrations in `supabase/migrations/` in the Supabase SQL editor.

Fund the wallet from a Sepolia faucet, and get test USD₮ from Tether's faucet.
The token contract is `0xd077A400968890Eacc75cdc901F0356c943e4fDb` (6 decimals).

```bash
pnpm lint     # eslint
pnpm build    # must pass before every push
```

---

## Architecture

```
app/api/
  goals/feasibility     POST  arithmetic only, no model      (~0.07s)
  goals                 POST  full analysis + strategy       (~16-25s)
                        GET   goal history with tx + strategy
  goals/[id]/keep       POST  draft -> analyzed
  strategies/[id]/approve
                        POST  the write path: quote, then sign
  wallet                GET   balances
  wallet/transfer       POST  raw transfer
  transactions/[hash]   GET   confirmation status
  transactions/reconcile
  market/eth            GET   ETH/USD₮ market reference

lib/
  wdk/client.ts            singleton WDK. THE ONLY PLACE THE SEED IS READ.
  wdk/networks.ts          Sepolia + USD₮ token definition
  guardrails/policies.ts   WDK policies — read the section below first
  guardrails/config.ts     the caps themselves
  guardrails/daily-volume.ts
  security/quote-ticket.ts HMAC binding between a quote and its execution
  ai/goal-analyzer.ts      compound interest. No model. This is the thesis.
  ai/strategy-builder.ts   Claude Opus 5, grounded in real constraints
  pricing/eth.ts           market reference
  supabase/                typed data access
```

### The two-speed analysis

Feasibility is arithmetic and answers in **0.066s**. The allocation needs a model
and takes **16–25s**. Both measured. Running them in sequence made the user stare
at a button for the whole thing, so `analyze()` awaits the fast half and fires
the slow half in the background. The feasibility screen shows a live strip
saying the agent is still working, then that it finished.

Do not "fix" this by awaiting both. And do not add an artificial delay so an
animation gets to play — if the work is done, say it is done.

### Goal lifecycle

`draft` → `analyzed` → `active`

A goal is created as `draft` at analysis time. It becomes `analyzed` only when
the user accepts the strategy (`/api/goals/[id]/keep`), and `listGoalHistory`
filters drafts out. Analysing costs nothing and commits nothing — trying a goal
on should not fill somebody's list with things they were only curious about.

---

## Guardrails — read this before touching `policies.ts`

**The WDK policy engine is DEFAULT-DENY.** Verified in
`node_modules/@tetherto/wdk/src/policy/policy-evaluator.js:46-81`. If no ALLOW
rule matches, the operation is blocked. That is why the policy list ends with
`gofi-permitted-operations`: without those explicit ALLOW rules **nothing
executes at all**, and you get `governed-but-unmatched`.

DENY conditions are **fail-closed** — a condition that throws counts as a match.
ALLOW conditions are fail-open-as-no-match. This is why `daily-volume.ts`
deliberately **throws** rather than swallowing its error: an unreadable ledger
must block the transfer, not wave it through.

Current policies, all `scope: "project"`:

| Policy | Rules |
|---|---|
| `gofi-asset-allowlist` | DENY unlisted token |
| `gofi-spending-cap` | DENY over per-tx USD₮ cap, over native cap, over daily volume |
| `gofi-no-approvals` | DENY `approve`, `signAuthorization` |
| `gofi-permitted-operations` | the ALLOW rules that make anything work at all |

Caps live in `lib/guardrails/config.ts`: 100 USD₮ per transaction, 250 USD₮ per
UTC day, 0.05 ETH native.

### Verifying a guardrail — the mistake already made once

`quoteTransfer` and `quoteSendTransaction` run on the **read-only account and are
NOT governed by policies.** Only `transfer` and `sendTransaction` are.

A quote coming back clean proves nothing. **Always verify a policy on the write
path.** This was once claimed as "tested" on the basis of a `confirm:false`
quote, and that claim was wrong.

---

## Supabase

RLS is **default-deny**: RLS enabled plus `force row level security` on all four
tables, **zero policies**, `revoke all from anon, authenticated`, `grant all to
service_role`.

Verified empirically, not assumed: secret key → 200, publishable key → **401**.

All database access goes through the server with the secret key. There is no
client-side Supabase access, and there should not be.

---

## Gotchas

Each of these cost real time. They are written down so they cost it once.

**The Bitfinex pair is `UST`, not `USDT`.** `getLastPriceData("ETH","USDT")`
returns **`null`** — no error, no warning, just null. Use `ETH`/`UST`.

**The pricing package's types are wrong.** History points come back as
`{ price, ts }`; the `.d.ts` declares `{ price, timestamp }`. TypeScript compiles
happily and the chart renders empty. Also `getLastPriceData` is typed
`Promise<PriceData>` but can resolve to `null`. Both narrowed by hand in
`lib/pricing/eth.ts`.

**`sepolia.drpc.org` returns 400** — "chain is not available on free plan" —
despite being the endpoint WDK's own docs recommend. We use WDK's native provider
failover across publicnode / tenderly / 1rpc instead.

**`sodium-native` breaks `next build`.** Handled by `serverExternalPackages` in
`next.config.ts`.

**BigInt literals need ES2022.** If you change the target and get a parse error,
delete `.next` and the tsbuildinfo before believing the error.

**ERC-20 transfer fees are paid in native ETH**, not in the token. A wallet full
of USD₮ with no ETH cannot move anything.

**`react-hooks/set-state-in-effect` is enforced.** The pattern that satisfies it
is an async IIFE inside `useEffect` where the first `setState` happens *after* an
`await`, plus an `alive` flag in the cleanup.

**`account.simulate.<method>()` exists** and returns a `SimulationResult` with
`decision`, `policy_id`, `matched_rule`, `reason`, `trace[]`. Verified present in
the installed types. **Not used yet** — it is the cleanest way to preflight a
policy decision without signing.

---

## Working style

- Verify before agreeing. If a claim is wrong, say why, with evidence.
- Measure rather than assert. "It's faster" is not a finding; "0.066s vs 16.1s"
  is.
- Never report something as tested when what was tested was a different code
  path.
- Propose alternatives with tradeoffs when the choice actually matters.
