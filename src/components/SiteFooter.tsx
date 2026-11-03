import Image from "next/image";
import { QuoteSealMark } from "@/shared/ui/QuoteSealMark";

const STACK = [
  {
    href: "https://openserv.ai",
    label: "OpenServ",
    markSrc: "/partners/openserv-logo-white.svg",
    markAlt: "OpenServ logo",
    markWidth: 120,
    markHeight: 29,
    markClassName: "h-5 w-auto sm:h-[1.35rem]",
    showLabel: false,
  },
  {
    href: "https://docs.gokite.ai",
    label: "Kite Passport",
    markSrc: "/partners/kite-mark.svg",
    markAlt: "Kite mark",
    markWidth: 24,
    markHeight: 24,
    markClassName: "h-6 w-6",
    showLabel: true,
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-4 border-t border-[var(--line)] pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:mt-5 sm:pt-6">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2.5 sm:justify-start">
            <QuoteSealMark className="h-8 w-8" />
            <p className="m-0 text-sm font-semibold tracking-tight text-[var(--foreground)]">
              QuoteSeal
            </p>
          </div>
          <p className="m-0 mt-2 max-w-md text-sm leading-snug text-[var(--muted)]">
            Any job, any city. Describe the quotes you need, approve a spending
            seal, and buys stay inside the cap.
          </p>
          <p className="m-0 mt-2.5 font-mono text-[0.68rem] leading-relaxed text-[var(--muted)]">
            &copy; 2026 QuoteSeal - no custody - pay only under the seal
          </p>
          <p className="m-0 mt-1 font-mono text-[0.68rem] leading-relaxed text-[var(--muted)]">
            Kite Passport identity · sealed quote network
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 sm:items-end">
          <p className="m-0 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Stack
          </p>
          <nav
            className="flex flex-wrap items-center justify-center gap-2 sm:justify-end"
            aria-label="Stack"
          >
            {STACK.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.label}
                className="group inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-100/12 bg-white/[0.03] px-3 py-2 transition-[border-color,background-color,color] hover:border-emerald-200/28 hover:bg-white/[0.055] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300/50"
              >
                <Image
                  src={item.markSrc}
                  alt={item.markAlt}
                  width={item.markWidth}
                  height={item.markHeight}
                  className={`${item.markClassName} opacity-80 transition-opacity group-hover:opacity-100`}
                  unoptimized
                />
                {item.showLabel ? (
                  <span className="font-mono text-[0.72rem] text-[var(--muted)] transition-colors group-hover:text-emerald-200/90">
                    {item.label}
                  </span>
                ) : null}
              </a>
            ))}
          </nav>
          <nav
            className="mt-0.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[0.78rem] sm:justify-end"
            aria-label="Footer links"
          >
            <a
              className="inline-flex min-h-9 items-center text-[var(--muted)] transition-colors touch-manipulation hover:text-[var(--accent)]"
              href="#chat"
            >
              Assistant
            </a>
            <a
              className="inline-flex min-h-9 items-center text-[var(--muted)] transition-colors touch-manipulation hover:text-[var(--accent)]"
              href="#kite"
            >
              Identity
            </a>
            <a
              className="inline-flex min-h-9 items-center text-[var(--muted)] transition-colors touch-manipulation hover:text-[var(--accent)]"
              href="#agents"
            >
              Agents
            </a>
            <a
              className="inline-flex min-h-9 items-center text-[var(--muted)] transition-colors touch-manipulation hover:text-[var(--accent)]"
              href="/openapi.yaml"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenAPI
            </a>
            <a
              className="inline-flex min-h-9 items-center text-[var(--muted)] transition-colors touch-manipulation hover:text-[var(--accent)]"
              href="https://github.com/ThibautMilville/QuoteSeal"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </nav>
          <p className="m-0 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)]">
            Pay only under the seal
          </p>
        </div>
      </div>
    </footer>
  );
}
