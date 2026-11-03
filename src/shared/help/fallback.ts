/** Local product help - no jargon, English UI copy. */

/** Prefill / focus the main MandateChat from the BR help FAB. */
export const QS_HELP_HANDOFF = "qs-help-handoff";

export type HelpReply = {
  text: string;
  /** Prefill the main MandateChat and scroll to #chat. */
  handoff?: string;
};

const FAQ: { pattern: RegExp; reply: HelpReply }[] = [
  {
    pattern: /\bhow (does|do)|what is quote\s?seal|explain|overview\b/i,
    reply: {
      text: "QuoteSeal turns a plain-English request into a spending seal. You approve the seal once. Quotes inside the cap are paid; anything above is blocked. Raising the limit always needs a new approval - never a silent raise.",
    },
  },
  {
    pattern: /\bseal|budget|cap|limit|spending\b/i,
    reply: {
      text: "The spending seal is your hard cap: a total budget and a max per quote. Nothing is spent until you approve. After that, each buy is checked against the seal at pay time.",
    },
  },
  {
    pattern: /\bmoney|real|paid|usdc|payment|charge\b/i,
    reply: {
      text: "Safety note: quote-network buys on this host do not move real funds unless you approve a Passport spending session. The seal still enforces buy, block, and raise under your caps.",
    },
  },
  {
    pattern: /\bblock|overspend|refuse|denied\b/i,
    reply: {
      text: "If a quote would break the seal, QuoteSeal blocks it and explains why. It never quietly raises your limit - you would approve a new seal first.",
    },
  },
  {
    pattern: /\braise|increase|higher|more budget\b/i,
    reply: {
      text: "To spend more, approve a new seal with a higher total or max per quote. The assistant will ask - it will not auto-escalate.",
    },
  },
  {
    pattern: /\bkite|passport|kpass|identity|permission\b/i,
    reply: {
      text: "Passport is the identity rail: the Identity section shows agent id and session status from /api/kite/status. Approve can create a Passport spending session when the host is connected. The seal always enforces hard caps. See #kite.",
    },
  },
  {
    pattern: /\bapi|developer|integrat|endpoint|mcp|agent|openapi\b/i,
    reply: {
      text: "Integrators can use POST /api/mandate and POST /api/run, plus OpenAPI at /openapi.yaml. See For developers and Agents on this page for curls and npm run mcp - the main chat stays product-only.",
    },
  },
  {
    pattern: /\bstart|begin|demo|try|example\b/i,
    reply: {
      text: "Open the main assistant above, pick a scenario chip (Lyon, Nantes, or Paris), approve the seal, then watch buy / block / raise in the flow diagram.",
      handoff: "",
    },
  },
  {
    pattern: /\bboulogne\b/i,
    reply: {
      text: "QuoteSeal works for any job and city - try Lyon solar film, Nantes painting, or Paris HVAC from the chips above.",
      handoff: "",
    },
  },
];

/** True when the user is describing a quote job rather than asking for help. */
export function looksLikeQuoteRequest(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  if (/\?/.test(t) && !/\bm2\b|\busdc\b|\bquote/i.test(t)) return false;
  return (
    /\b(quote|quotes|solar|film|hvac|paint|painting|window|roof|m2|m²|lyon|nantes|paris|lille|budget|usdc)\b/i.test(
      t,
    ) && /\d/.test(t)
  );
}

export function answerHelp(question: string): HelpReply {
  const q = question.trim();
  if (!q) {
    return { text: "Ask how QuoteSeal works, what a seal is, or how to try the demo." };
  }

  if (looksLikeQuoteRequest(q)) {
    return {
      text: "That looks like a quote job. I will open the main assistant so you can approve a spending seal and run the buy flow there.",
      handoff: q,
    };
  }

  for (const item of FAQ) {
    if (item.pattern.test(q)) return item.reply;
  }

  return {
    text: "I can explain the seal, buy / block / raise, or how to try the demo. For a real quote request (city, size, budget), use the main assistant on this page.",
  };
}
