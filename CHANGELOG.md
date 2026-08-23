# What changed — for Nacho

Nacho: this is the batch of work that landed while we were not in sync. The
commits describe *what*, this describes *why*, and calls out the three things
that touch code you may be working in.

Range: `623d6ca` → `31ac677`.

---

## Read these three first

### 1. Goals now start as `draft` — `91f218c`

A goal used to appear in "Your goals" the moment it was analysed. That is wrong:
analysing costs nothing and commits nothing, so a list of goals was really a list
of things somebody was curious about once.

Now `createGoal` writes `status: "draft"`, and the goal is promoted to
`analyzed` only when the user accepts the strategy at step 03, via
`POST /api/goals/[id]/keep`. `listGoalHistory` filters drafts out with
`.neq("status", "draft")`.

**If you query goals anywhere, you need this filter or you will show drafts.**

We also cleaned the existing data: of 28 goals, 24 had never executed anything
and are now drafts; the 4 with confirmed transactions stayed visible. The split
was exactly `analyzed` = no transactions, `active` = has transactions, but the
update ran on explicit ids with a re-check immediately before the write, not on
the status predicate.

### 2. Analysis is split into two calls — `91f218c`

Measured: feasibility is **0.066s**, the full strategy is **16.1s**. They used to
run in sequence, so the user watched a button for all of it.

- `POST /api/goals/feasibility` — arithmetic only, no model, no persistence.
- `POST /api/goals` — unchanged, still the full analysis + strategy + persist.

The client awaits the fast one, then fires the slow one in the background. If you
need a verdict without paying 16 seconds and without writing a row, use the new
endpoint.

### 3. Your funding validation was replaced — `45b3603`

Your version (`14051d9`) summed all the USD₮ legs of the strategy. The server
does not send that: it sends **only the first leg, clamped to the per-transaction
cap**. So the numbers disagreed with reality in both directions:

- Capital 150, legs 65% + 10%, wallet holds 100 → yours blocks at 112.5, when the
  server would have sent 97.5 and succeeded.
- Capital 500, single 50% leg → yours reports 250 when the real figure is 100.

Reimplemented reading from the same server-side source the transfer actually
uses. Nothing wrong with the idea — the warning is good and it stayed — the
arithmetic just had to match what gets signed.

---

## Everything else

### Security — `dc3bff9`, `623d6ca`

**A confirmation bypass was found and fixed.** The approve endpoint re-read its
parameters from the request body on the second call, so nothing bound the quote
to the execution. Proven with one `curl`. Now the server issues an HMAC ticket
over the canonical claims with a 3-minute TTL, and on execute the claims are
derived server-side from the strategy — never from the body. Four attack
scenarios re-verified blocked. Details in `AUDIT.md`.

The daily-volume cap is now actually enforced (`deny-over-daily-volume`), and it
was verified firing distinctly from the per-transaction cap: 70 USD₮ hits the
daily rule, 500 USD₮ hits the per-tx rule.

### The dashboard — `11d9eae`

A returning user used to land on an empty goal form. They now land on where their
goal stands: capital deployed vs. target, months elapsed vs. horizon, the
verdict, the allocation, and the last settled transaction.

Everything on it is measured. There is no "your balance grew" figure, because we
have no yield feed and a dashboard is the worst possible place to be
approximately right. The card says so in plain text.

The active goal is picked as the one **with transactions**, not the one created
most recently.

### The agent is now visible while it works — `5158c9d`

The thinking card existed but almost nobody ever saw it: the strategy call starts
at submit and finishes while the reader is still on step 02.

Rather than delay the flow so an animation could play, the feasibility card now
shows a live strip — `GoFI is building the allocation`, with the real stage —
that switches to `GoFI finished the allocation` when the answer lands.

Also fixed: the thinking card's stages ran on fixed CSS delays that completed in
9 seconds while the request took 25, so the card looked finished while it was
still waiting. Stages now advance on a timer and hold on the last one.

### ETH price on the dashboard — `31ac677`

Added `@tetherto/wdk-pricing-provider` and `@tetherto/wdk-pricing-bitfinex-http`.
New route `GET /api/market/eth` returns price, 24h change, and a 7-day series;
the dashboard draws a sparkline **only when the strategy actually names ETH**.

It is labelled market reference, and says outright that GoFI has not bought any
ETH. We are not putting a price next to somebody's goal without that line.

**Two traps if you touch this code**, both found against the live API:

- Bitfinex quotes Tether as **`UST`**. `ETH/USDT` returns `null` — not an error,
  just null.
- History points are `{ price, ts }`, but the package's `.d.ts` declares
  `{ price, timestamp }`. Trust the types and the chart renders empty.

### UI — `f4f80d5`, `2a84589`, `b17cfe3`, `3f61e7e`, `ccf7a82`, `0ebe7d8`, `6982a73`

- Landing rebuilt around a hero that names WDK properly and a single
  "Connect wallet" action.
- Animated stepper (01–04) with a running recap of the goal.
- Goal history promoted from the avatar menu to its own view — history is a
  destination, not a setting.
- The form keeps what you typed when you go back to edit it.
- Editing a goal without changing the numbers no longer forces a 40-second
  re-analysis; it returns you to the verdict you already have.
- "Required return" now names the horizon, so a 12-month goal showing 100% and
  100% reads as an identity rather than a bug.
- "Back to wallet" became "Back to dashboard" and goes there, instead of sending
  a signed-in user to the connect screen.

---

## Repo change you will notice

`.gitignore` still ignores `*.md`, but four files are now unignored on purpose:
`CLAUDE.md`, `DEMO.md`, `AUDIT.md`, `CHANGELOG.md`. Rules, state, and the demo
script should not live only in a chat history you cannot read.

Please do not add a fifth unless a person needs it to do their job.

---

## Where things stand

Working end to end: wallet → goal → feasibility → strategy → approval →
on-chain execution, with four confirmed Sepolia transactions, each verified
through a different RPC node than the one that signed it.

Open items are in `AUDIT.md`. The short version: no auth (deliberate, localhost
only), and `account.simulate.<method>()` is available but unused — that is the
best next thing to pick up.
