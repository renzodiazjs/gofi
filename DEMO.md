# GoFI — demo script

Aleph Hackathon 2026 · WDK Track
Target length: **4 minutes**. Ethereum Sepolia testnet, no real funds.

---

## Before you present

- [ ] `pnpm build && pnpm start` — demo on the production build, not `dev`.
      Turbopack HMR has already faked one bug for us.
- [ ] **Turn off Chrome's auto-translate.** It rewrote our English UI into
      Spanish mid-demo once. It looks like a bug in our product.
- [ ] Wallet funded: some Sepolia ETH for gas **and** test USD₮. ERC-20 fees are
      paid in ETH — a wallet full of USD₮ and no ETH cannot move anything.
- [ ] Check today's daily volume. The cap is 250 USD₮ per UTC day and it is
      enforced. If you rehearsed all morning, the live transfer will be blocked
      by our own guardrail — impressive in the wrong slot.
- [ ] Second tab open on `sepolia.etherscan.io`, blank.
- [ ] Know your numbers: 100 USD₮ per transaction, 250 per day, 0.05 ETH native.

---

## 00:00 — The problem (25s)

> "Ask any AI assistant to turn 500 dollars into 700 in six months and it will
> happily build you a plan. That is a 40% return. Nobody can promise that, and
> the assistant knows it — it just does not want to disappoint you.
>
> GoFI does the arithmetic instead."

Land on the hero. Do not linger — the landing's job is to say what this is, name
WDK, and get out of the way.

Click **Connect wallet**. Real balances load from Sepolia.

---

## 00:25 — The goal, and the refusal (60s)

**This is the demo. Everything else is supporting material.**

Enter the goal that does not work: **500 → 700, 6 months, moderate.**

Click **Analyze goal**. The verdict lands in about a tenth of a second.

> "That verdict took 66 milliseconds, because no model was involved. It is
> compound interest, computed in code, in `lib/ai/goal-analyzer.ts`. A language
> model cannot be talked out of arithmetic that never asked it."

Point at **UNREALISTIC**, then at the suggestions block.

> "It does not just say no. It tells you what *would* work — the same capital
> over a longer horizon, or a lower target over the same one. Those numbers are
> computed, and the model is handed them with instructions to quote them
> verbatim rather than invent its own."

Then point at the live strip at the bottom of the card.

> "And while you have been reading this, the agent has been working. That is the
> allocation being built right now — the real stage, not a spinner."

Wait for it to say **finished**.

---

## 01:25 — The strategy (45s)

Click **See the strategy**. It is already there — no wait.

> "Claude Opus 5, but grounded: it is told exactly what can execute today.
> Sepolia, USD₮ and ETH only, no protocols integrated, no yield feed."

Point at the forward-looking labels on the ETH legs.

> "Aave and Lido are named as forward-looking, not as positions. GoFI has not
> bought anything it says it has not bought. That distinction is the whole
> product."

Click **Keep this strategy**.

> "And only now does this become one of your goals. Analysing costs nothing and
> commits nothing — we are not going to fill your list with things you were
> curious about once."

---

## 02:10 — Execution and the guardrail (75s)

On the approval card, show the quote: amount, recipient, fee in ETH.

**Execute.** Take the hash to the Etherscan tab. Confirmed.

> "Signed by a self-custodial WDK wallet. The seed lives in one file behind
> `server-only` — we grepped the entire production bundle for it and it is not
> there."

Now the part judges remember. Set an amount **over the cap** and execute.

> "Blocked. And read what it says — `deny-token-transfer-over-cap`, from policy
> `gofi-spending-cap`."

> "That is not our form validation. That is WDK's policy engine refusing to
> sign, inside the wallet layer. The engine is default-deny: with no matching
> ALLOW rule, nothing executes at all.
>
> And there is a second rule with its own reason — go over 250 in a day and you
> get `deny-over-daily-volume` instead. Two rules, two answers."

Optional, if the room is technical:

> "The daily-volume check throws rather than returning false, on purpose. WDK
> counts a throwing DENY condition as a match — so if our ledger cannot be read,
> the transfer is blocked. Fail closed."

---

## 03:25 — Where the goal stands (25s)

Go to the dashboard.

> "Come back tomorrow and you land here, not on a blank form."

Point at the two meters.

> "Capital actually deployed, months actually elapsed. Both measured."

Then the honesty note.

> "There is no 'your portfolio is up 4%' number, and that is deliberate. We have
> no yield feed. The ETH price below is labelled market reference and says
> outright that GoFI has not bought any."

---

## 03:50 — Close (10s)

> "GoFI is the agent that tells you your goal does not work — with the
> arithmetic to prove it, and guardrails in the wallet layer that stop it even
> if the model tries."

---

## If something breaks

**The transfer is blocked and you did not mean it to.** Almost certainly the
daily volume cap. Say so out loud — "that is our own guardrail, and it just
demonstrated itself" — and move on. Do not debug live.

**The strategy call hangs.** The verdict is already on screen and needed no
model. Talk over it: the arithmetic is the thesis, the allocation is the
garnish.

**The RPC fails.** WDK fails over across three endpoints on its own. Give it a
moment before touching anything.

**Nothing loads at all.** Check that you are on the built server and not a
half-started `dev`.

---

## Questions to expect

**"How is this different from asking ChatGPT?"**
It refuses. The feasibility verdict is arithmetic in code, not an opinion, and
the model is handed the computed alternatives rather than asked to invent them.

**"Are the guardrails just UI?"**
No — they compile into WDK policies and are enforced at signing. Demonstrated
live. And they were verified on the write path: quotes are *not* governed by
policies, so a clean quote proves nothing. We learned that the hard way and it
is written down in `AUDIT.md`.

**"Is any of this real?"**
Four confirmed Sepolia transactions, each verified through a different RPC node
than the one that signed it. Hashes in `AUDIT.md`.

**"What about the ETH and the yield?"**
Not integrated, and the UI says so in three places. We would rather show less
than imply a position that does not exist.

**"What is missing?"**
Authentication — one shared wallet, localhost only, deliberate for a testnet
demo. And `account.simulate()` is available in WDK and we have not used it yet;
it is the first thing after this.
