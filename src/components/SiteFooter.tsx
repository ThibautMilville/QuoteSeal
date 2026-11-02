import { QuoteSealMark } from "@/shared/ui/QuoteSealMark";

export function SiteFooter() {
  return (
    <footer className="mt-4 border-t border-[var(--line)] pt-6 pb-2 sm:mt-6 sm:pt-7">
      <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 max-w-md">
          <div className="flex items-center gap-2.5">
            <QuoteSealMark className="h-8 w-8" />
            <p className="m-0 text-sm font-semibold tracking-tight text-[var(--foreground)]">
              QuoteSeal
            </p>
          </div>
          <p className="m-0 mt-2 text-sm leading-snug text-[var(--muted)]">
            Describe the quotes you need. Approve a spending seal. Buys stay
            inside the cap.
          </p>
          <p className="m-0 mt-3 font-mono text-[0.68rem] leading-relaxed text-[var(--muted)]">
            No real money · no custody · demo quotes only
          </p>
        </div>

        <nav
          className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:text-right"
          aria-label="Footer"
        >
          <a
            className="text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
            href="#chat"
          >
            Assistant
          </a>
          <a
            className="text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
            href="#how"
          >
            How it works
          </a>
          <a
            className="text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
            href="#developers"
          >
            For developers
          </a>
          <a
            className="text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
            href="https://github.com/ThibautMilville/quote-seal"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
