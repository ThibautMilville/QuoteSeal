"use client";

import {
  useId,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

export type FlowPhase =
  | "idle"
  | "describe"
  | "seal"
  | "buy"
  | "done";

export type FlowOutcome = {
  paidCount: number;
  blockedCount: number;
  raiseAsked: boolean;
};

type FlowDiagramProps = {
  /** Softer shell when nested inside another bordered panel. */
  embedded?: boolean;
  title?: string;
  /** Live chat phase - idle keeps a gentle product demo pulse. */
  phase?: FlowPhase;
  outcome?: FlowOutcome | null;
};

type StageId = "describe" | "seal" | "buy";

type DiagramRect = { x: number; y: number; w: number; h: number };

/** Shared SVG geometry - three equal columns across the viewBox. */
const VB_W = 644;
const VB_H = 288;
const COL_MARGIN_X = 22;
const NODE_W = 100;
const NODE_H = 52;
const NODE_Y = 52;
const ZONE_W = 180;
const ZONE_H = 72;
const ZONE_Y = 184;
const CHIP_Y = 266;
const CHIP_H = 16;
const BRANCH_CTRL_Y = 158;

const COL_SPAN = VB_W - COL_MARGIN_X * 2;
const COL_GAP = (COL_SPAN - ZONE_W * 3) / 2;
const COL_X = [0, 1, 2].map((i) => COL_MARGIN_X + i * (ZONE_W + COL_GAP));
const COL_CENTER = COL_X.map((x) => x + ZONE_W / 2);

const NODE: Record<StageId, DiagramRect> = {
  describe: {
    x: COL_CENTER[0] - NODE_W / 2,
    y: NODE_Y,
    w: NODE_W,
    h: NODE_H,
  },
  seal: {
    x: COL_CENTER[1] - NODE_W / 2,
    y: NODE_Y,
    w: NODE_W,
    h: NODE_H,
  },
  buy: {
    x: COL_CENTER[2] - NODE_W / 2,
    y: NODE_Y,
    w: NODE_W,
    h: NODE_H,
  },
};

const ZONE: Record<"paid" | "blocked" | "raise", DiagramRect> = {
  paid: { x: COL_X[0], y: ZONE_Y, w: ZONE_W, h: ZONE_H },
  blocked: { x: COL_X[1], y: ZONE_Y, w: ZONE_W, h: ZONE_H },
  raise: { x: COL_X[2], y: ZONE_Y, w: ZONE_W, h: ZONE_H },
};

const CHIP: { x: number; w: number; label: string }[] = [
  { x: COL_CENTER[0] - 60, w: 120, label: "1. Describe job" },
  { x: COL_CENTER[1] - 60, w: 120, label: "2. Approve seal" },
  { x: COL_CENTER[2] - 80, w: 160, label: "3. Buy / Block / Raise" },
];

const STAGES: { id: StageId; label: string; sub: string }[] = [
  { id: "describe", label: "Describe", sub: "your job" },
  { id: "seal", label: "Seal", sub: "you approve" },
  { id: "buy", label: "Buy", sub: "under the cap" },
];

const EDGE_PAIRS: [StageId, StageId][] = [
  ["describe", "seal"],
  ["seal", "buy"],
];

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function readReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function center(rect: DiagramRect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function right(rect: DiagramRect) {
  return { x: rect.x + rect.w, y: rect.y + rect.h / 2 };
}

function left(rect: DiagramRect) {
  return { x: rect.x, y: rect.y + rect.h / 2 };
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, size = 5) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a1 = angle - Math.PI / 7;
  const a2 = angle + Math.PI / 7;
  return `${x2},${y2} ${x2 - size * Math.cos(a1)},${y2 - size * Math.sin(a1)} ${x2 - size * Math.cos(a2)},${y2 - size * Math.sin(a2)}`;
}

function stageActive(id: StageId, phase: FlowPhase): boolean {
  if (phase === "idle") {
    return true;
  }
  if (phase === "describe") return id === "describe";
  if (phase === "seal") return id === "describe" || id === "seal";
  if (phase === "buy") return id === "seal" || id === "buy";
  if (phase === "done") return id === "buy";
  return false;
}

function statusLabel(
  phase: FlowPhase,
  outcome: FlowOutcome | null | undefined,
): string {
  if (phase === "describe") return "Listening…";
  if (phase === "seal") return "Awaiting approval";
  if (phase === "buy") return "Buying under seal…";
  if (phase === "done" && outcome) {
    if (outcome.blockedCount > 0 && outcome.paidCount > 0) {
      return "Paid + blocked";
    }
    if (outcome.blockedCount > 0) return "Blocked overspend";
    if (outcome.paidCount > 0) return "Quotes paid";
    return "Complete";
  }
  return "Product flow";
}

export function FlowDiagram({
  embedded = false,
  title = "Describe to sealed buys",
  phase = "idle",
  outcome = null,
}: FlowDiagramProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `qs-diagram-grad-${uid}`;
  const glowId = `qs-diagram-glow-${uid}`;
  const hubId = `qs-diagram-hub-${uid}`;
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    readReducedMotion,
    () => true,
  );

  const flowBusy = phase !== "idle" || !reduceMotion;
  const showPulses = flowBusy && !reduceMotion;
  const isDone = phase === "done";
  const hasPaid = Boolean(outcome && outcome.paidCount > 0) || phase === "idle";
  const hasBlocked =
    Boolean(outcome && outcome.blockedCount > 0) || phase === "idle";
  const hasRaise =
    Boolean(outcome && outcome.raiseAsked) || phase === "idle";

  const buyC = center(NODE.buy);
  const buyBottomY = NODE.buy.y + NODE.buy.h;
  const flowPath = STAGES.map((stage, index) => {
    const c = center(NODE[stage.id]);
    return `${index === 0 ? "M" : "L"}${c.x},${c.y}`;
  }).join(" ");

  // Fan from Buy into the three column centers with mirrored control offsets.
  const branchTo = (col: number) => {
    const tx = COL_CENTER[col];
    const dx = tx - buyC.x;
    const c1x = buyC.x + dx * 0.18;
    const c2x = buyC.x + dx * 0.72;
    return `M${buyC.x},${buyBottomY} C${c1x},${BRANCH_CTRL_Y} ${c2x},${BRANCH_CTRL_Y + 8} ${tx},${ZONE_Y}`;
  };
  const paidPath = branchTo(0);
  const blockedPath = branchTo(1);
  const raisePath = branchTo(2);

  const paidTitle =
    outcome && isDone
      ? outcome.paidCount === 0
        ? "No quotes paid"
        : `${outcome.paidCount} quote${outcome.paidCount === 1 ? "" : "s"} paid`
      : phase === "buy"
        ? "Paying allowed quotes…"
        : "Within the seal";

  const paidSub =
    outcome && isDone
      ? "Under your approved cap"
      : "Allowed spends go through";

  const blockedTitle =
    outcome && isDone
      ? outcome.blockedCount === 0
        ? "Nothing blocked"
        : `${outcome.blockedCount} blocked`
      : phase === "buy"
        ? "Checking each price…"
        : "Above the seal";

  const blockedSub =
    outcome && isDone && outcome.blockedCount > 0
      ? "Price above per-quote cap"
      : "Overspend never pays";

  const raiseTitle =
    outcome && isDone
      ? outcome.raiseAsked
        ? "New approval needed"
        : "No raise needed"
      : "Raise the seal";

  const raiseSub =
    outcome && isDone && outcome.raiseAsked
      ? "Ask before spending more"
      : "Never silent escalate";

  const highlightPaid = isDone
    ? Boolean(outcome && outcome.paidCount > 0)
    : phase === "idle" || phase === "buy";
  const highlightBlocked = isDone
    ? Boolean(outcome && outcome.blockedCount > 0)
    : phase === "idle" || phase === "buy";
  const highlightRaise = isDone
    ? Boolean(outcome && outcome.raiseAsked)
    : phase === "idle";

  return (
    <section
      className={
        embedded
          ? "qs-diagram-shell"
          : "qs-diagram-shell rounded-2xl border border-[rgba(91,238,190,0.2)] bg-[rgba(6,23,30,0.85)] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-5"
      }
      aria-label="QuoteSeal product flow diagram"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="m-0 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[rgba(117,217,231,0.7)]">
            Flow
          </p>
          <h3 className="page-title-flow m-0 mt-1 text-lg font-semibold tracking-[-0.02em] normal-case sm:text-xl">
            {title}
          </h3>
        </div>
        <span
          className={`font-mono text-[0.65rem] uppercase tracking-[0.1em] ${
            isDone && outcome && outcome.blockedCount > 0
              ? "text-[rgba(232,93,93,0.75)]"
              : isDone
                ? "text-[rgba(91,238,190,0.8)]"
                : phase === "buy" || phase === "seal"
                  ? "text-[rgba(117,217,231,0.75)]"
                  : "text-[rgba(138,163,173,0.85)]"
          }`}
        >
          {statusLabel(phase, outcome)}
        </span>
      </div>

      <div className="hidden overflow-hidden sm:block">
        <svg
          className="qs-diagram-svg mx-auto block h-auto w-full max-w-[900px]"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5beebe" />
              <stop offset="100%" stopColor="#75d9e7" />
            </linearGradient>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id={hubId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(91,238,190,0.18)" />
              <stop offset="100%" stopColor="rgba(91,238,190,0)" />
            </radialGradient>
          </defs>

          <rect
            className="qs-diagram-lane"
            x="12"
            y="30"
            width="620"
            height="98"
            rx="16"
          />
          <text className="qs-diagram-zone-label" x="32" y="46">
            Seal lane
          </text>

          <circle
            className="qs-diagram-hub-ring"
            cx={buyC.x}
            cy={buyC.y}
            r="44"
          />
          <circle
            className="qs-diagram-hub-ring qs-diagram-hub-ring-delayed"
            cx={buyC.x}
            cy={buyC.y}
            r="56"
          />
          <circle cx={buyC.x} cy={buyC.y} r="38" fill={`url(#${hubId})`} />

          {EDGE_PAIRS.map(([fromId, toId], index) => {
            const from = right(NODE[fromId]);
            const to = left(NODE[toId]);
            const path = `M${from.x},${from.y} L${to.x},${to.y}`;
            return (
              <g
                key={`${fromId}-${toId}`}
                className="qs-diagram-edge-group"
                style={{ "--diagram-delay": `${index * 0.18}s` } as CSSProperties}
              >
                <line
                  className="qs-diagram-edge"
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
                <polygon
                  className="qs-diagram-arrow"
                  points={arrowHead(from.x, from.y, to.x, to.y)}
                />
                {showPulses ? (
                  <circle
                    className="qs-diagram-pulse"
                    r="3.2"
                    filter={`url(#${glowId})`}
                  >
                    <animateMotion
                      dur={phase === "buy" ? "2.2s" : "3.6s"}
                      repeatCount="indefinite"
                      begin={`${index * 0.35}s`}
                      path={path}
                    />
                  </circle>
                ) : null}
              </g>
            );
          })}

          {showPulses ? (
            <circle
              className="qs-diagram-pulse qs-diagram-pulse-strong"
              r="4"
              filter={`url(#${glowId})`}
            >
              <animateMotion
                dur={phase === "buy" ? "2.8s" : "4.4s"}
                repeatCount="indefinite"
                path={flowPath}
              />
            </circle>
          ) : null}

          {STAGES.map((stage, index) => {
            const rect = NODE[stage.id];
            const active = stageActive(stage.id, phase);
            const c = center(rect);
            return (
              <g
                key={stage.id}
                className="qs-diagram-node"
                style={
                  { "--diagram-delay": `${0.06 + index * 0.07}s` } as CSSProperties
                }
              >
                <rect
                  className={
                    active
                      ? "qs-diagram-node-box qs-diagram-node-box-active"
                      : "qs-diagram-node-box"
                  }
                  style={
                    active
                      ? ({ stroke: `url(#${gradId})` } as CSSProperties)
                      : undefined
                  }
                  x={rect.x}
                  y={rect.y}
                  width={rect.w}
                  height={rect.h}
                  rx={12}
                />
                <text
                  className="qs-diagram-node-label"
                  x={c.x}
                  y={c.y - 4}
                  textAnchor="middle"
                >
                  {stage.label}
                </text>
                <text
                  className="qs-diagram-node-sub"
                  x={c.x}
                  y={c.y + 12}
                  textAnchor="middle"
                >
                  {stage.sub}
                </text>
              </g>
            );
          })}

          <path
            className={
              highlightPaid
                ? "qs-diagram-branch qs-diagram-branch-ok"
                : "qs-diagram-branch"
            }
            d={paidPath}
            fill="none"
          />
          <path
            className={
              highlightBlocked
                ? "qs-diagram-branch qs-diagram-branch-bad"
                : "qs-diagram-branch"
            }
            d={blockedPath}
            fill="none"
          />
          <path
            className={
              highlightRaise
                ? "qs-diagram-branch qs-diagram-branch-warn"
                : "qs-diagram-branch"
            }
            d={raisePath}
            fill="none"
          />

          {showPulses && hasPaid ? (
            <circle
              className="qs-diagram-pulse"
              r="3"
              filter={`url(#${glowId})`}
            >
              <animateMotion dur="3s" repeatCount="indefinite" path={paidPath} />
            </circle>
          ) : null}
          {showPulses && hasBlocked ? (
            <circle className="qs-diagram-pulse-bad" r="3">
              <animateMotion
                dur="3.2s"
                repeatCount="indefinite"
                path={blockedPath}
              />
            </circle>
          ) : null}
          {showPulses && hasRaise ? (
            <circle className="qs-diagram-pulse-warn" r="3">
              <animateMotion
                dur="3.4s"
                repeatCount="indefinite"
                path={raisePath}
              />
            </circle>
          ) : null}

          {(
            [
              {
                key: "paid" as const,
                delay: "0.42s",
                highlight: highlightPaid,
                activeClass: "qs-diagram-zone qs-diagram-zone-ok",
                eyebrow: "Buy",
                title: paidTitle,
                sub: paidSub,
              },
              {
                key: "blocked" as const,
                delay: "0.5s",
                highlight: highlightBlocked,
                activeClass: "qs-diagram-zone qs-diagram-zone-blocked",
                eyebrow: "Block",
                title: blockedTitle,
                sub: blockedSub,
              },
              {
                key: "raise" as const,
                delay: "0.58s",
                highlight: highlightRaise,
                activeClass: "qs-diagram-zone qs-diagram-zone-raise",
                eyebrow: "Raise",
                title: raiseTitle,
                sub: raiseSub,
              },
            ] as const
          ).map((zone) => {
            const rect = ZONE[zone.key];
            const cx = rect.x + rect.w / 2;
            return (
              <g
                key={zone.key}
                className="qs-diagram-node"
                style={{ "--diagram-delay": zone.delay } as CSSProperties}
              >
                <rect
                  className={zone.highlight ? zone.activeClass : "qs-diagram-zone"}
                  x={rect.x}
                  y={rect.y}
                  width={rect.w}
                  height={rect.h}
                  rx={14}
                />
                <text
                  className="qs-diagram-zone-label"
                  x={cx}
                  y={rect.y + 18}
                  textAnchor="middle"
                >
                  {zone.eyebrow}
                </text>
                <text
                  className="qs-diagram-outcome"
                  x={cx}
                  y={rect.y + 40}
                  textAnchor="middle"
                >
                  {zone.title}
                </text>
                <text
                  className="qs-diagram-outcome-sub"
                  x={cx}
                  y={rect.y + 56}
                  textAnchor="middle"
                >
                  {zone.sub}
                </text>
              </g>
            );
          })}

          {CHIP.map((chip, index) => {
            const cx = chip.x + chip.w / 2;
            const chipOk =
              index === 2 && isDone && Boolean(outcome && outcome.paidCount > 0);
            return (
              <g
                key={chip.label}
                className="qs-diagram-chip"
                style={
                  {
                    "--diagram-delay": `${0.62 + index * 0.07}s`,
                  } as CSSProperties
                }
              >
                <rect
                  className={
                    chipOk
                      ? "qs-diagram-chip-box qs-diagram-chip-box-ok"
                      : "qs-diagram-chip-box"
                  }
                  x={chip.x}
                  y={CHIP_Y}
                  width={chip.w}
                  height={CHIP_H}
                  rx={8}
                />
                <text
                  className="qs-diagram-chip-label"
                  x={cx}
                  y={CHIP_Y + 11}
                  textAnchor="middle"
                >
                  {chip.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="sm:hidden">
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {STAGES.map((stage, index) => {
            const active = stageActive(stage.id, phase);
            return (
              <li key={stage.id} className="relative">
                {index < STAGES.length - 1 ? (
                  <span
                    className="qs-diagram-mobile-rail absolute left-[15px] top-[46px] h-[calc(100%+4px)] w-px"
                    aria-hidden
                  />
                ) : null}
                <div
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    active
                      ? "border-[rgba(91,238,190,0.4)] bg-[rgba(91,238,190,0.1)]"
                      : "border-[rgba(91,238,190,0.15)] bg-[rgba(3,16,23,0.8)]"
                  }`}
                >
                  <span
                    className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-mono text-[0.65rem] font-semibold ${
                      active
                        ? "bg-[rgba(91,238,190,0.2)] text-[var(--accent)]"
                        : "bg-[rgba(30,41,59,0.8)] text-[var(--muted)]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold text-[var(--foreground)]">
                      {stage.label}
                    </p>
                    <p className="m-0 font-mono text-[0.68rem] text-[var(--muted)]">
                      {stage.sub}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <div
            className={`rounded-xl border px-3 py-2.5 ${
              highlightPaid
                ? "border-[rgba(91,238,190,0.35)] bg-[rgba(91,238,190,0.1)]"
                : "border-[rgba(91,238,190,0.15)] bg-[rgba(3,16,23,0.7)]"
            }`}
          >
            <p className="m-0 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--muted)]">
              Buy
            </p>
            <p className="m-0 mt-1 text-sm font-semibold">{paidTitle}</p>
            <p className="m-0 mt-0.5 font-mono text-[0.68rem] text-[var(--muted)]">
              {paidSub}
            </p>
          </div>
          <div
            className={`rounded-xl border px-3 py-2.5 ${
              highlightBlocked
                ? "border-[rgba(232,93,93,0.3)] bg-[rgba(232,93,93,0.1)]"
                : "border-[rgba(91,238,190,0.15)] bg-[rgba(3,16,23,0.7)]"
            }`}
          >
            <p className="m-0 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--muted)]">
              Block
            </p>
            <p className="m-0 mt-1 text-sm font-semibold">{blockedTitle}</p>
            <p className="m-0 mt-0.5 font-mono text-[0.68rem] text-[var(--muted)]">
              {blockedSub}
            </p>
          </div>
          <div
            className={`rounded-xl border px-3 py-2.5 ${
              highlightRaise
                ? "border-[rgba(212,160,23,0.35)] bg-[rgba(212,160,23,0.08)]"
                : "border-[rgba(91,238,190,0.15)] bg-[rgba(3,16,23,0.7)]"
            }`}
          >
            <p className="m-0 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--muted)]">
              Raise
            </p>
            <p className="m-0 mt-1 text-sm font-semibold">{raiseTitle}</p>
            <p className="m-0 mt-0.5 font-mono text-[0.68rem] text-[var(--muted)]">
              {raiseSub}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
