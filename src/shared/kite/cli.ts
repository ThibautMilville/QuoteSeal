import { execFile } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

const CANDIDATES = [
  process.env.KPASS_BIN?.trim(),
  join(homedir(), ".local/bin/kpass"),
  join(homedir(), ".kpass/bin/kpass"),
  "kpass",
].filter(Boolean) as string[];

export type KiteStatus = {
  installed: boolean;
  bin: string | null;
  version: string | null;
  backendReachable: boolean | null;
  loggedIn: boolean | null;
  agentRegistered: boolean | null;
  sessionActive: boolean | null;
  modeHint: "demo_local" | "kite_sandbox";
  nextCommand: string | null;
  error: string | null;
};

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
        timeout: 15000,
        env: { ...process.env, PATH: `${homedir()}/.local/bin:${homedir()}/.kpass/bin:${process.env.PATH ?? ""}` },
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

export async function getKiteStatus(): Promise<KiteStatus> {
  const bin = await resolveKpassBin();
  if (!bin) {
    return {
      installed: false,
      bin: null,
      version: null,
      backendReachable: null,
      loggedIn: null,
      agentRegistered: null,
      sessionActive: null,
      modeHint: "demo_local",
      nextCommand: "curl -fsSL https://cli.gokite.ai/install.sh | bash",
      error: null,
    };
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
    return {
      installed: true,
      bin,
      version,
      backendReachable: null,
      loggedIn: null,
      agentRegistered: null,
      sessionActive: null,
      modeHint: "demo_local",
      nextCommand: null,
      error: status.error,
    };
  }

  const data = status.data as Record<string, unknown>;
  const user = (data.user ?? {}) as Record<string, unknown>;
  const agent = (data.agent ?? {}) as Record<string, unknown>;
  const session = (data.session ?? {}) as Record<string, unknown>;
  const backend = (data.backend ?? {}) as Record<string, unknown>;
  const loggedIn = Boolean(user.logged_in);
  const agentRegistered = Boolean(agent.registered);

  return {
    installed: true,
    bin,
    version,
    backendReachable: backend.reachable === true || backend.status === "ok",
    loggedIn,
    agentRegistered,
    sessionActive: Boolean(session.active),
    modeHint: loggedIn ? "kite_sandbox" : "demo_local",
    nextCommand: typeof data.next_command === "string" ? data.next_command : null,
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
    "agent:session",
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
    "--payment-approach",
    "x402_http",
  ]);
}
