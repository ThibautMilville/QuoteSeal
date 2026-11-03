/** Live production base used in agent-facing docs (not a product localhost URL). */
export const QUOTESEAL_LIVE_BASE = "https://quoteseal.ozc.fr";

/** OpenAPI path (static file under public/). */
export const OPENAPI_PATH = "/openapi.yaml";

export const HEALTH_CURL = `# QuoteSeal health - OpenAPI: $BASE_URL/openapi.yaml
curl -s "$BASE_URL/api/health"`;

export const MANDATE_CURL = `# QuoteSeal mandate - free text to sealed plan
curl -s -X POST "$BASE_URL/api/mandate" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "message": "Get up to 3 quotes for a 40 m2 solar-film install in Lyon. Total budget 3 USDC. Max 1 USDC per quote. Valid for 2 hours."
  }'`;

export const RUN_CURL = `# QuoteSeal sealed run - pass MandatePlan from /api/mandate
# Tip: PLAN=$(curl -s -X POST "$BASE_URL/api/mandate" -H 'Content-Type: application/json' \\
#   -d '{"message":"40 m2 solar film in Lyon, 3 USDC total, 1 USDC max per quote"}')
# curl -s -X POST "$BASE_URL/api/run" -H 'Content-Type: application/json' -d "{\\"plan\\": $PLAN}"
curl -s -X POST "$BASE_URL/api/run" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "plan": {
      "mandate": {
        "job": "solar film install",
        "city": "Lyon",
        "areaM2": 40,
        "maxQuotes": 3,
        "maxAmountPerTx": 1,
        "maxTotalAmount": 3,
        "ttlHours": 2,
        "preferredTiers": ["cheap", "standard", "premium"]
      },
      "session": {
        "taskSummary": "Sealed quote run",
        "maxAmountPerTx": 1,
        "maxTotalAmount": 3,
        "ttlHours": 2,
        "assets": "USDC",
        "allowedEndpoints": [
          "$BASE_URL/api/x402/quote/cheap",
          "$BASE_URL/api/x402/quote/standard",
          "$BASE_URL/api/x402/quote/premium"
        ],
        "mode": "kite_sandbox"
      },
      "plan": [
        { "tier": "cheap", "reason": "Under seal", "expectedPriceUsdc": 0.3 },
        { "tier": "standard", "reason": "Under seal", "expectedPriceUsdc": 0.8 },
        { "tier": "premium", "reason": "May block", "expectedPriceUsdc": 1.5 }
      ],
      "rationale": "Agent sealed plan",
      "source": "fallback"
    }
  }'`;

export const X402_CURL = `# Quote network merchants (402 without X-PAYMENT; seal enforced with session token)
curl -s "$BASE_URL/api/x402/quote/cheap"
curl -s "$BASE_URL/api/x402/quote/standard"
curl -s "$BASE_URL/api/x402/quote/premium"`;

export const MCP_CURSOR_CONFIG = `{
  "mcpServers": {
    "quote-seal": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/absolute/path/to/QuoteSeal",
      "env": {
        "QUOTESEAL_BASE_URL": "https://quoteseal.ozc.fr"
      }
    }
  }
}`;

export const ENV_NOTES = `Environment (no secrets in chat or commits):
- SERV_API_KEY optional - without it, mandate compile uses a local parser
- SERV_BASE_URL defaults to the OpenServ inference API
- NEXT_PUBLIC_APP_URL - public origin for x402 resource URLs
- QUOTESEAL_BASE_URL - MCP proxy target (default https://quoteseal.ozc.fr)
Copy .env.example to .env.local. Never commit .env.local.`;
