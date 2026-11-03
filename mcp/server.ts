/**
 * Thin QuoteSeal MCP server.
 * Tools HTTP-call the existing Next API (no duplicated seal logic).
 *
 * Run: npm run mcp
 * Env: QUOTESEAL_BASE_URL (default https://quoteseal.ozc.fr)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = (
  process.env.QUOTESEAL_BASE_URL?.trim() || "https://quoteseal.ozc.fr"
).replace(/\/$/, "");

async function request(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<string> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let pretty = text;
  try {
    pretty = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    /* keep raw */
  }
  if (!res.ok) {
    return `HTTP ${res.status} from ${path}\n${pretty}`;
  }
  return pretty;
}

const server = new McpServer({
  name: "quote-seal",
  version: "0.1.0",
});

server.registerTool(
  "quote_seal_mandate",
  {
    title: "QuoteSeal mandate",
    description:
      "Compile a plain-English quote request into a sealed spending plan (MandatePlan). Call before quote_seal_run. Proxies POST /api/mandate.",
    inputSchema: {
      message: z
        .string()
        .trim()
        .min(1)
        .max(1000)
        .describe(
          "Job, city, size, total budget, and max per quote (USDC). Max 1000 characters.",
        ),
    },
  },
  async ({ message }) => {
    const text = await request("POST", "/api/mandate", { message });
    return { content: [{ type: "text" as const, text }] };
  },
);

server.registerTool(
  "quote_seal_run",
  {
    title: "QuoteSeal sealed run",
    description:
      "Approve a MandatePlan and buy fixture quotes under the seal via POST /api/run. Overspend is blocked at pay time. Pass the full plan object returned by quote_seal_mandate (or a UI-shaped { plan } wrapper).",
    inputSchema: {
      plan: z
        .record(z.string(), z.unknown())
        .describe(
          "MandatePlan JSON from quote_seal_mandate (mandate, session, plan, rationale, source), or { plan: MandatePlan }.",
        ),
    },
  },
  async ({ plan }) => {
    const text = await request("POST", "/api/run", plan);
    return { content: [{ type: "text" as const, text }] };
  },
);

server.registerTool(
  "quote_seal_health",
  {
    title: "QuoteSeal health",
    description:
      "Readiness probe: app ok, optional SERV / Kite hints, fixture merchant list. Proxies GET /api/health.",
    inputSchema: {},
  },
  async () => {
    const text = await request("GET", "/api/health");
    return { content: [{ type: "text" as const, text }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("QuoteSeal MCP server error:", error);
  process.exit(1);
});
