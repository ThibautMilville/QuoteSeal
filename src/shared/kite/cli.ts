import { execFile } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type { KiteIdentitySource, KiteStatus } from "@/shared/kite/types";

export type { KiteIdentitySource, KiteStatus } from "@/shared/kite/types";

const execFileAsync = promisify(execFile);

const CANDIDATES = [
  process.env.KPASS_BIN?.trim(),
  join(homedir(), ".local/bin/kpass"),
  join(homedir(), ".kpass/bin/kpass"),
  "kpass",
].filter(Boolean) as string[];

const CONNECT_URL = "https://docs.gokite.ai";

function publishedIdentity(): {
  agentId: string | null;
  agentLabel: string | null;
  userEmail: string | null;
} {
  return {
    agentId: process.env.KITE_PUBLISHED_AGENT_ID?.trim() || null,
    agentLabel: process.env.KITE_PUBLISHED_AGENT_LABEL?.trim() || null,
    userEmail: process.env.KITE_PUBLISHED_USER_EMAIL?.trim() || null,
  };
}

function maskEmail(email: string | null): string | null {
  if (!email || !email.includes("@")) return email;
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const keep = Math.min(2, user.length);
  return `${user.slice(0, keep)}…@${domain}`;
}

async function resolveKpassBin(): Promise<string | null> {
  for (const candidate of CANDIDATES) {
    if (candidate === "kpass") {
      try {
        await execFileAsync("kpass", ["--version"], { timeout: 4000 });
        return "kpass";
      } catch {
        continue;
      }
    }
    try {
      await access(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function runKpassJson(
  args: string[],
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const bin = await resolveKpassBin();
  if (!bin) return { ok: false, error: "kpass not installed" };
  try {
    const { stdout } = await execFileAsync(
      bin,
      [...args, ...(args.includes("--output") ? [] : ["--output", "json"])],
      {
        timeout: 20000,
        env: {
          ...process.env,
          PATH: `${homedir()}/.local/bin:${homedir()}/.kpass/bin:${process.env.PATH ?? ""}`,
          KPASS_NO_BROWSER: "1",
        },
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    try {
      return { ok: true, data: JSON.parse(stdout) };
    } catch {
      return { ok: true, data: { raw: stdout.trim() } };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

function emptyStatus(
  partial: Partial<KiteStatus> &
    Pick<KiteStatus, "installed" | "bin" | "identitySource">,
): KiteStatus {
  const published = publishedIdentity();
  const hasPublished = Boolean(published.agentId);
  const identitySource =
    partial.identitySource === "kpass"
      ? "kpass"
      : hasPublished
        ? "published"
        : "none";

  return {
    version: null,
    backendReachable: null,
    loggedIn: null,
    agentRegistered: null,
    sessionActive: null,
    modeHint: "demo_local",
    rail: identitySource === "kpass" ? "passport" : "sealed",
    canCreateSession: false,
    agentId: identitySource === "published" ? published.agentId : null,
    agentType: null,
    agentLabel:
      identitySource === "published"
        ? published.agentLabel || "QuoteSeal agent"
        : null,
    userId: null,
    userEmail: identitySource === "published" ? maskEmail(published.userEmail) : null,
    sessionId: null,
    connectUrl: CONNECT_URL,
    nextCommand: null,
    error: null,
    ...partial,
    identitySource,
  };
}

export async function getKiteStatus(): Promise<KiteStatus> {
  const bin = await resolveKpassBin();
  if (!bin) {
    return emptyStatus({
      installed: false,
      bin: null,
      identitySource: "none",
      nextCommand: "curl -fsSL https://cli.gokite.ai/install.sh | bash",
    });
  }

  let version: string | null = null;
  try {
    const { stdout } = await execFileAsync(bin, ["--version"], { timeout: 4000 });
    version = stdout.trim();
  } catch {
    version = null;
  }

  const status = await runKpassJson(["status"]);
  if (!status.ok) {
    return emptyStatus({
      installed: true,
      bin,
      version,
      identitySource: "none",
      error: status.error,
    });
  }

  const data = status.data as Record<string, unknown>;
  const user = (data.user ?? {}) as Record<string, unknown>;
  const agent = (data.agent ?? {}) as Record<string, unknown>;
  const session = (data.session ?? {}) as Record<string, unknown>;
  const backend = (data.backend ?? {}) as Record<string, unknown>;
  const loggedIn = Boolean(user.logged_in);
  const agentRegistered = Boolean(agent.registered);
  const agentId =
    typeof agent.agent_id === "string" && agent.agent_id
      ? agent.agent_id
      : null;
  const agentType =
    typeof agent.type === "string" && agent.type ? agent.type : null;
  const sessionId =
    typeof session.current_session_id === "string"
      ? session.current_session_id
      : null;
  const userEmail =
    typeof user.email === "string" && user.email ? maskEmail(user.email) : null;
  const userId =
    typeof user.user_id === "string" && user.user_id ? user.user_id : null;
  const canCreateSession = loggedIn && agentRegistered;

  return {
    installed: true,
    bin,
    version,
    backendReachable: backend.reachable === true || backend.status === "ok",
    loggedIn,
    agentRegistered,
    sessionActive: Boolean(session.active),
    modeHint: loggedIn ? "kite_sandbox" : "demo_local",
    rail: canCreateSession ? "passport" : "sealed",
    identitySource: "kpass",
    canCreateSession,
    agentId,
    agentType,
    agentLabel: agentRegistered
      ? `QuoteSeal ${agentType || "agent"}`
      : null,
    userId,
    userEmail,
    sessionId,
    connectUrl: CONNECT_URL,
    nextCommand:
      typeof data.next_command === "string" && data.next_command
        ? data.next_command
        : null,
    error: null,
  };
}

/**
 * Request a Kite spending session (requires logged-in Passport + passkey approval).
 * Returns the raw CLI JSON so the UI can show approval_url.
 */
export async function createKiteSessionRequest(input: {
  taskSummary: string;
  maxAmountPerTx: number;
  maxTotalAmount: number;
  ttlHours: number;
}): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  return runKpassJson([
    "session",
    "create",
    "--task-summary",
    input.taskSummary,
    "--max-amount-per-tx",
    String(input.maxAmountPerTx),
    "--max-total-amount",
    String(input.maxTotalAmount),
    "--ttl",
    `${input.ttlHours}h`,
    "--assets",
    "USDC",
    "--no-browser",
    "--separate",
  ]);
}

/** Pull a passkey approval URL from assorted Passport CLI payloads. */
export function extractApprovalUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  for (const key of [
    "approval_url",
    "approve_url",
    "url",
    "passkey_url",
    "approvalUrl",
  ]) {
    const value = record[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  }
  for (const nestedKey of ["session", "sessionRequest", "data", "result"]) {
    const nested = extractApprovalUrl(record[nestedKey]);
    if (nested) return nested;
  }
  return null;
}
