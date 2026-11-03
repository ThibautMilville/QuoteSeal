export type KiteIdentitySource = "kpass" | "published" | "none";

export type KiteStatus = {
  installed: boolean;
  bin: string | null;
  version: string | null;
  backendReachable: boolean | null;
  loggedIn: boolean | null;
  agentRegistered: boolean | null;
  sessionActive: boolean | null;
  /** Internal runner hint - UI should prefer `rail`. */
  modeHint: "demo_local" | "kite_sandbox";
  /** Product-facing rail: Passport when identity is live, else sealed local. */
  rail: "passport" | "sealed";
  identitySource: KiteIdentitySource;
  canCreateSession: boolean;
  agentId: string | null;
  agentType: string | null;
  agentLabel: string | null;
  userId: string | null;
  userEmail: string | null;
  sessionId: string | null;
  connectUrl: string;
  nextCommand: string | null;
  error: string | null;
};
