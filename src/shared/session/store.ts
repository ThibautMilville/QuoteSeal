import { randomBytes } from "crypto";
import type { Mandate, SessionProposal } from "@/shared/mandate/schema";

export type SealedSession = {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  mandate: Mandate;
  proposal: SessionProposal;
  spentTotal: number;
  payments: Array<{
    tier: string;
    amountUsdc: number;
    at: string;
    url: string;
  }>;
  status: "active" | "exhausted" | "expired";
};

declare global {
  var __quoteSealSessions: Map<string, SealedSession> | undefined;
}

function sessions(): Map<string, SealedSession> {
  if (!globalThis.__quoteSealSessions) {
    globalThis.__quoteSealSessions = new Map();
  }
  return globalThis.__quoteSealSessions;
}

export function createSealedSession(
  mandate: Mandate,
  proposal: SessionProposal,
): SealedSession {
  const id = `sess_${randomBytes(8).toString("hex")}`;
  const token = `qs_${randomBytes(16).toString("hex")}`;
  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + proposal.ttlHours * 60 * 60 * 1000,
  );

  const session: SealedSession = {
    id,
    token,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    mandate,
    proposal,
    spentTotal: 0,
    payments: [],
    status: "active",
  };

  sessions().set(token, session);
  return session;
}

export function getSessionByToken(token: string): SealedSession | null {
  const session = sessions().get(token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    session.status = "expired";
  }
  return session;
}

export type PayDecision =
  | { ok: true; session: SealedSession }
  | {
      ok: false;
      code:
        | "missing_payment"
        | "invalid_session"
        | "session_expired"
        | "session_rule_exceeded"
        | "session_total_exceeded"
        | "session_endpoint_forbidden";
      message: string;
      session?: SealedSession;
    };

export function authorizePayment(input: {
  token: string | null;
  amountUsdc: number;
  endpointUrl: string;
}): PayDecision {
  if (!input.token) {
    return { ok: false, code: "missing_payment", message: "X-PAYMENT header is required" };
  }

  const session = getSessionByToken(input.token);
  if (!session) {
    return { ok: false, code: "invalid_session", message: "Unknown demo session token" };
  }
  if (session.status === "expired" || new Date(session.expiresAt).getTime() < Date.now()) {
    session.status = "expired";
    return {
      ok: false,
      code: "session_expired",
      message: "Session TTL elapsed",
      session,
    };
  }

  const allowed = session.proposal.allowedEndpoints.some((url) => {
    try {
      return new URL(url).pathname === new URL(input.endpointUrl).pathname;
    } catch {
      return url.includes(new URL(input.endpointUrl).pathname);
    }
  });
  if (!allowed) {
    return {
      ok: false,
      code: "session_endpoint_forbidden",
      message: "Endpoint outside sealed session scope",
      session,
    };
  }

  if (input.amountUsdc > session.proposal.maxAmountPerTx) {
    return {
      ok: false,
      code: "session_rule_exceeded",
      message: `Per-tx cap ${session.proposal.maxAmountPerTx} USDC exceeded by ${input.amountUsdc}`,
      session,
    };
  }

  if (session.spentTotal + input.amountUsdc > session.proposal.maxTotalAmount) {
    session.status = "exhausted";
    return {
      ok: false,
      code: "session_total_exceeded",
      message: `Total cap ${session.proposal.maxTotalAmount} USDC would be exceeded`,
      session,
    };
  }

  return { ok: true, session };
}

export function recordPayment(
  session: SealedSession,
  tier: string,
  amountUsdc: number,
  url: string,
): void {
  session.spentTotal = Number((session.spentTotal + amountUsdc).toFixed(4));
  session.payments.push({
    tier,
    amountUsdc,
    at: new Date().toISOString(),
    url,
  });
  if (session.spentTotal >= session.proposal.maxTotalAmount) {
    session.status = "exhausted";
  }
}
