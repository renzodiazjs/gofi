# GoFI — Security audit

Ethereum Sepolia testnet · no real funds at any point.

Everything below was **verified by running it**, not by reading the code and
concluding it looked right. Where something was only reasoned about, it says so.

---

## 1. Secret exposure — PASS

**Question:** does the wallet seed reach the browser?

**Method:** not a code review. The literal seed value was searched for across
the entire production build — 10 chunks in `.next/static` and everything in
`.next/server`.

**Result:** zero hits. The seed is read in one place, `lib/wdk/client.ts`, behind
`import "server-only"`, and never crosses into a client component.

**Standing rule:** anything named `NEXT_PUBLIC_*` ships to the client. That is
not convention, it is what Next.js does. The env schema in `lib/config/env.ts`
keeps the secret names and the public names apart on purpose.

---

## 2. Supabase RLS — PASS

**Question:** can the browser read the database directly?

**Configuration:** RLS enabled plus `force row level security` on all four
tables, **zero policies defined**, `revoke all from anon, authenticated`,
`grant all to service_role`. Default-deny, not policy-by-policy.

**Method:** the same query fired twice with different keys.

| Key | Result |
|---|---|
| secret key (`sb_secret_…`, server) | **200** |
| publishable key (`sb_publishable_…`, browser-safe) | **401** |

**Result:** PASS. There is no client-side Supabase access in the app, and even
if someone added one, it would get a 401.

---

## 3. Confirmation bypass — **FOUND, FIXED, RE-VERIFIED**

This is the real finding of the audit.

**The hole.** The approve endpoint had a two-step shape: `confirm:false` returns
a quote, `confirm:true` signs. But the second call re-read its parameters from
the **request body**. Nothing bound the thing that was quoted to the thing that
got signed.

**Proof.** Demonstrated with a single `curl` — quote one amount and recipient,
then execute a different one. It went through.

**The fix.** `lib/security/quote-ticket.ts`. The server issues an HMAC ticket
over the canonical claims — scope, recipient (lowercased), asset, amount,
expiry — with a 3-minute TTL. On `confirm:true` the claims are **derived
server-side from the strategy and `DEFAULT_GUARDRAILS`, never from the request
body**, and the ticket must verify against them.

`verifyTicket` **throws** `InvalidTicketError`. It never returns `false`. A
boolean return is one forgotten `if` away from being a bypass.

**Re-verified after the fix.** Four attack scenarios, all blocked:

- tampered amount → 409
- tampered recipient → 409
- expired ticket → 409
- absent ticket → 409

Policy violations return 403 with the `policyId` and `ruleName` that fired.

---

## 4. Guardrails on the write path — **FOUND, FIXED, RE-VERIFIED**

**The mistake.** The guardrails were reported as "tested" on the basis of a
`confirm:false` call coming back clean. That claim was **wrong, and it was
mine.**

`quoteTransfer` and `quoteSendTransaction` run on the read-only account and are
**not governed by policies at all.** Only `transfer` and `sendTransaction` are.
A clean quote proves nothing about whether a policy would have fired.

**Re-verified on the write path**, and the rules fire distinctly:

| Attempt | Rule that fired |
|---|---|
| 70 USD₮ (within per-tx cap, over the day's remaining volume) | `deny-over-daily-volume` |
| 500 USD₮ | `deny-token-transfer-over-cap` |

Two different rules, two different reasons. Not one catch-all.

**Related finding — fail-closed matters.** WDK treats a DENY condition that
*throws* as a match. `daily-volume.ts` therefore lets its error propagate rather
than swallowing it: if the ledger cannot be read, the transfer is blocked. A
`try/catch` returning `false` there would have turned an outage into an open
door.

**Also worth knowing:** the policy engine is **default-deny**. Without the
explicit ALLOW rules in `gofi-permitted-operations`, nothing executes at all.
Discovered the hard way when every transaction returned
`governed-but-unmatched`.

---

## 5. On-chain settlement — PASS

**Question:** did these transactions actually happen, or does our own database
just say they did?

**Method:** each hash was confirmed through a **different RPC node than the one
that signed it.** Asking the same node that told you it worked is not
verification.

| Goal | Amount | Block | Hash |
|---|---|---|---|
| #3 | 85 USD₮ | 11,544,351 | `0x87f1b63c…4b31c04a` |
| #4 | 97.5 USD₮ | 11,544,436 | `0x0799c76b…4e46957d` |
| #9 | 7 USD₮ | 11,545,241 | `0x7f45434b…be25a214` |
| #26 | 1.5 USD₮ | 11,547,026 | `0x31e5affd…04cc0fa7` |

All four confirmed on Sepolia.

---

## 6. Third-party types — **FOUND during the pricing integration**

Not a vulnerability, but the same class of problem: trusting a declaration
instead of the thing it describes.

The WDK pricing package's shipped `.d.ts` disagrees with its own runtime on two
counts, both found by calling the live API:

- History points are `{ price, ts }`; the types declare `{ price, timestamp }`.
  TypeScript compiles happily and the chart renders empty.
- `getLastPriceData` is typed `Promise<PriceData>` but returns **`null`** for an
  unresolvable pair — and `ETH/USDT` is unresolvable, because Bitfinex quotes
  Tether as `UST`.

Both are narrowed by hand in `lib/pricing/eth.ts` rather than trusted.

---

## Open — accepted for the hackathon

These are known and deliberate. They are listed so nobody discovers them in
front of a judge.

### No authentication

There is one shared development wallet and no user accounts. Anyone who can
reach the server can drive the agent. **Accepted** for a testnet demo that does
not leave localhost. This is the single largest thing standing between the
current state and anything resembling production.

### Quote ticket key is per-process

`randomBytes(32)` at module load. Two consequences: a server restart invalidates
outstanding tickets (harmless — the user re-quotes), and it will not survive
multiple instances behind a load balancer. Documented as a tradeoff in the file
itself. A shared secret from the environment is the fix when it matters.

### Daily volume is read from our ledger, not from chain

`usdtVolumeToday()` sums `pending` + `confirmed` rows in Supabase for the UTC
day. A transfer signed by that wallet through some other path would not be
counted. Acceptable while this wallet has exactly one agent driving it.

### `account.simulate.<method>()` is available and unused

Confirmed present in the installed types. It returns a `SimulationResult` with
`decision`, `policy_id`, `matched_rule`, `reason` and a `trace[]`, which is
strictly better than inferring a policy outcome from a quote. **This is the
first thing to pick up after the hackathon.**

### No rate limiting

Nothing throttles the analysis endpoint, which calls a model on every request.
On localhost this is a cost question rather than a security one.

### Protocol allowlist is empty

`allowedProtocols: []`. No lending or staking protocol is integrated, so the
strategy's non-USD₮ legs are recommendations that have never executed. The UI
states this explicitly on both the strategy step and the dashboard — a claim
about a position that does not exist would be the most damaging thing this
product could say.
