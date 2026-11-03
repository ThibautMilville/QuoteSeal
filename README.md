# QuoteSeal

**Sealed agent spending for quotes** - a SERV Hackathon demo on the **Kite** track.

QuoteSeal turns a plain-English request into a **spending seal**. You approve the seal once. Quotes inside the cap are paid; anything above is blocked. Raising the limit always needs a new approval - never a silent escalate.

No real money moves in this demo. Local x402-shaped merchants return fixture quotes. Kite Passport is optional and stays zero-spend unless you opt into a sandbox session yourself.

---

## Why

Agent wallets can overspend without hard caps. QuoteSeal shows a product pattern:

1. **Describe** the job in natural language (city, size, budget, max per quote).
2. **Seal** - review a typed spending plan and approve it.
3. **Buy / Block / Raise** - pay allowed quotes, refuse overspend at pay time, and ask before raising the seal.

The seal is enforced in code at payment time. Reasoning can propose a plan; it cannot unlock a payment past the seal.

---

## How it works

| Step | What you see | What runs |
| --- | --- | --- |
| Describe | Chat + scenario chips | `POST /api/mandate` compiles intent into a plan |
| Seal | Plain-English caps + Approve | Session proposal with per-tx and total limits |
| Buy | Paid quote cards | Local merchants under the seal |
| Block | Clear refusal copy | Pay-time rule check refuses overspend |
| Raise | New approval ask | Optional SERV phrasing for a higher cap |

The on-page **Product flow** diagram animates this lane (Describe - Seal - Buy) and the three outcomes (Buy / Block / Raise). It tracks the live chat when you run a demo.

---

## Architecture

```
Browser (Next.js UI)
  │
  ├─ Opening intro (Three.js seal)
  ├─ Mandate chat
  └─ Flow diagram (SVG schematic)
        │
        ▼
  API routes
  |- POST /api/mandate     - SERV or local parser - MandatePlan
  |- POST /api/run         - sealed session + local quote buys
  |- GET  /api/x402/quote/[tier]  - fixture merchants
  |- GET  /api/health
  +- /api/kite/*           - optional Passport status / session
```

**Stack:** Next.js 15, TypeScript, Tailwind 4, Three.js intro, Zod, OpenAI-compatible SERV client, optional `kpass` CLI.

**Safety model:** SERV (or the local parser) proposes. The sealed session store authorizes each payment. Overspend returns a blocked event; the UI asks for a new approval instead of auto-raising.

---

## Demo scenarios

Open http://localhost:3010 after `npm run dev`, skip or watch the intro, then use a chip or type your own request.

| Scenario chip | Message intent | Typical result |
| --- | --- | --- |
| Lyon · solar film · 1 USDC / quote | Default (40 m2, 3 USDC total) | Cheap + standard pay; **premium (~1.5) blocked** - raise ask |
| Nantes · office paint · 0.5 USDC / quote | Tight per-quote cap | More blocks (standard/premium often refused) |
| Paris · HVAC · 2 USDC / quote | Wide per-quote cap (5 USDC total) | Cheap + standard + **premium can all pay** |

**Suggested walkthrough (jury)**

1. Chip **Lyon · solar film · 1 USDC / quote** (or type the same message).
2. Read the spending seal (total + max per quote) - **limits** pillar.
3. Click **Approve and buy**.
4. See paid quotes, a blocked premium, and a raise ask - no silent escalate.
5. Optional second run: chip **Paris · HVAC · 2 USDC / quote** so premium pays too.
6. Scroll **Built for the Kite track** (`#kite`): identity optional, limits strong, payments = fixtures.
7. Watch the **Product flow** diagram update in sync.

---

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | App readiness + optional Kite CLI hints |
| `POST` | `/api/mandate` | Body `{ message }` - sealed plan JSON |
| `POST` | `/api/run` | Body `{ plan }` - session + buy/block/raise events |
| `GET` | `/api/x402/quote/cheap` | Fixture merchant (~0.3 USDC test) |
| `GET` | `/api/x402/quote/standard` | Fixture merchant (~0.8 USDC test) |
| `GET` | `/api/x402/quote/premium` | Fixture merchant (~1.5 USDC test) |
| `GET` | `/api/kite/status` | Passport / `kpass` install state |
| `POST` | `/api/kite/session` | Optional real Passport session when logged in |

Local merchants (x402-shaped fixtures):

| Path | Vendor | Price (USDC test) |
| --- | --- | --- |
| `/api/x402/quote/cheap` | NordGlass Express | 0.3 |
| `/api/x402/quote/standard` | Seine Film Pro | 0.8 |
| `/api/x402/quote/premium` | Atlas Solar Shield | 1.5 |

### Agent surface

| Piece | Where |
| --- | --- |
| OpenAPI 3 | [`/openapi.yaml`](./public/openapi.yaml) (live: https://quoteseal.ozc.fr/openapi.yaml) |
| UI | Sections `#developers` and `#agents` |
| MCP | `npm run mcp` - tools `quote_seal_mandate`, `quote_seal_run`, `quote_seal_health` |

```bash
npm run mcp   # QUOTESEAL_BASE_URL defaults to https://quoteseal.ozc.fr
```

```bash
BASE_URL=https://quoteseal.ozc.fr

curl -s "$BASE_URL/api/health"

curl -s -X POST "$BASE_URL/api/mandate" \
  -H 'Content-Type: application/json' \
  -d '{"message":"40 m2 solar film in Lyon, 3 USDC total, 1 USDC max per quote"}'
```

---

## Local setup

```bash
git clone https://github.com/ThibautMilville/QuoteSeal.git
cd QuoteSeal
cp .env.example .env.local
npm install
npm run dev
```

Open **http://localhost:3010**

Useful scripts:

```bash
npm run typecheck
npm run build
npm run lint
npm run mcp
```

### Environment variables

Copy `.env.example` to `.env.local`. **Never commit `.env.local`.** No real secrets belong in the repo.

| Variable | Required | Notes |
| --- | --- | --- |
| `SERV_API_KEY` | No | Optional. Without it, mandate compile uses a deterministic local parser and the app still works. Get a key at https://console.openserv.ai (hackathon credits). Server-only - never `NEXT_PUBLIC_`. |
| `SERV_BASE_URL` | No | Defaults to OpenServ inference API |
| `SERV_MODEL_FAST` / `SMALL` / `LARGE` | No | Model routing tiers |
| `NEXT_PUBLIC_APP_URL` | No | Public origin for x402 resource URLs (default `http://localhost:3010`) |
| `QUOTESEAL_BASE_URL` | No | MCP HTTP target (default `https://quoteseal.ozc.fr`) |
| `KPASS_BIN` | No | Absolute path to `kpass` if it is not on `PATH` |

Optional Kite Passport CLI:

```bash
curl -fsSL https://cli.gokite.ai/install.sh | bash
```

Health and kite routes report install / login state. The demo remains zero real spend until you explicitly use a sandbox Passport session.

---

## Hackathon context

- **Event:** SERV Hackathon 02
- **Track:** Kite (agent payments / Passport-shaped spending)
- **Story:** sealed quote purchases with hard caps, local merchants, optional Passport wiring
- **Non-goals:** custody, production payments, Amazon checkout, silent budget increases

### Built for the Kite track (honest demo map)

| Pillar (Kite) | What QuoteSeal shows | Caveat |
| --- | --- | --- |
| Verifiable identity | Optional `/api/kite/status` + session wiring; Passport is the identity rail | `demo_local` does **not** require a live Passport login |
| User-defined permissions / spending limits | Spending **seal**: total + max per quote, pay-time refuse, raise needs new approval | Strongest pillar in this demo |
| Agentic payments (shop / book / pay) | Local x402-shaped quote fixtures - buy / block / raise under the seal | Zero real spend on the public demo; Passport sandbox is opt-in |

UI section: `#kite` on https://quoteseal.ozc.fr

---

## Safety

- No custody and no real USDC in the default demo path.
- Overspend is refused at pay time in application code.
- Raising the seal requires a new user approval.
- Not financial advice. Fixture vendors and prices are for demonstration only.

---

## Screenshots / preview

Run the app locally and capture:

1. Opening seal intro
2. Chat with spending seal + Approve
3. Paid quotes + blocked overspend
4. Animated **Product flow** diagram (Describe - Seal - Buy / Block / Raise)

```bash
npm run dev
# open http://localhost:3010
```

---

## License

See `LICENSE` in this repository.
