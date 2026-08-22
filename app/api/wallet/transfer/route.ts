import { PolicyViolationError } from "@tetherto/wdk";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  InvalidTicketError,
  issueTicket,
  verifyTicket,
} from "@/lib/security/quote-ticket";
import {
  quoteNativeTransfer,
  quoteUsdtTransfer,
  sendNativeTransfer,
  sendUsdtTransfer,
} from "@/lib/wdk/transfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  to: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Recipient must be a 0x EVM address."),
  amount: z.string().min(1),
  asset: z.enum(["USDT", "ETH"]).default("USDT"),
  /**
   * Two-step by design: without an explicit confirmation the endpoint only
   * prices the transfer. Nothing is signed until the user approves the quote.
   */
  confirm: z.boolean().default(false),
  /** The ticket returned with the quote. Required to execute. */
  ticket: z.string().optional(),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { to, amount, asset, confirm, ticket } = parsed.data;
  const native = asset === "ETH";

  const claims = { scope: "transfer", recipient: to, asset, amount };

  try {
    if (!confirm) {
      const quote = native
        ? await quoteNativeTransfer({ to, amount })
        : await quoteUsdtTransfer({ to, amount });

      return NextResponse.json({
        status: "quote",
        quote,
        ticket: issueTicket(claims),
      });
    }

    // A confirmation that cannot name the quote it approves is not a
    // confirmation. Checked before signing, not after.
    verifyTicket(ticket, claims);

    const receipt = native
      ? await sendNativeTransfer({ to, amount })
      : await sendUsdtTransfer({ to, amount });

    return NextResponse.json({ status: "sent", receipt });
  } catch (error) {
    if (error instanceof InvalidTicketError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof PolicyViolationError) {
      return NextResponse.json(
        {
          error: error.reason,
          blockedBy: { policyId: error.policyId, ruleName: error.ruleName },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transfer failed." },
      { status: 500 }
    );
  }
}
