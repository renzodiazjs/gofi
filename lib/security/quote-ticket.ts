import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signing key for quote tickets.
 *
 * Generated per process rather than read from configuration, deliberately: a
 * ticket should not outlive the server that issued it, and a key nobody has to
 * manage is a key nobody can leak. The tradeoff is that tickets do not survive
 * a restart and would not validate across multiple instances — if GoFI is ever
 * deployed behind more than one process, this has to become a shared secret.
 */
const KEY = randomBytes(32);

/** Long enough for a person to read a quote, short enough to be worthless later. */
const TTL_MS = 3 * 60_000;

/**
 * Exactly what the user was shown and therefore exactly what may be signed.
 * Every field here is re-derived on the server at confirmation time and must
 * match, so changing any of them invalidates the ticket.
 */
export type QuoteClaims = {
  scope: string;
  recipient: string;
  asset: string;
  /** The amount string as it will be handed to the wallet, not a rounded copy. */
  amount: string;
};

function seal(payload: string): string {
  return createHmac("sha256", KEY).update(payload).digest("base64url");
}

function canonical(claims: QuoteClaims, expiresAt: number): string {
  // Fixed field order: a JSON stringify of an object whose key order varied
  // would produce a different signature for the same quote.
  return [
    claims.scope,
    claims.recipient.toLowerCase(),
    claims.asset.toUpperCase(),
    claims.amount,
    expiresAt,
  ].join("|");
}

export class InvalidTicketError extends Error {}

/** Issues a ticket for a quote the user has just been shown. */
export function issueTicket(claims: QuoteClaims): string {
  const expiresAt = Date.now() + TTL_MS;
  const payload = canonical(claims, expiresAt);

  return `${expiresAt}.${seal(payload)}`;
}

/**
 * Verifies that this ticket was issued by this server, has not expired, and
 * was issued for exactly these claims.
 *
 * Throws rather than returning false: the only correct response to a bad
 * ticket is to refuse, and a boolean invites a caller to carry on past it.
 */
export function verifyTicket(ticket: unknown, claims: QuoteClaims): void {
  if (typeof ticket !== "string" || !ticket.includes(".")) {
    throw new InvalidTicketError(
      "This confirmation is missing its quote. Request a quote and confirm that."
    );
  }

  const [rawExpiry, signature] = ticket.split(".");
  const expiresAt = Number(rawExpiry);

  if (!Number.isFinite(expiresAt)) {
    throw new InvalidTicketError("This confirmation is not a valid quote.");
  }

  if (Date.now() > expiresAt) {
    throw new InvalidTicketError(
      "This quote has expired. Preview the transaction again."
    );
  }

  const expected = seal(canonical(claims, expiresAt));
  const given = Buffer.from(signature, "base64url");
  const wanted = Buffer.from(expected, "base64url");

  // timingSafeEqual throws on a length mismatch, so guard before comparing.
  if (
    given.length !== wanted.length ||
    !timingSafeEqual(given, wanted)
  ) {
    throw new InvalidTicketError(
      "This confirmation does not match the quote it claims to approve."
    );
  }
}
