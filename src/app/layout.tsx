import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OpeningIntro } from "@/shared/ui/OpeningIntro";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuoteSeal - sealed quote buys",
  description:
    "Describe the quotes you need, approve a spending seal, and buy under the cap. Anything above the seal is blocked.",
  applicationName: "QuoteSeal",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon.svg",
  },
};

const introBootScript = `
(function () {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("qs-intro-done", "qs-intro-chrome-ready");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introBootScript }} />
      </head>
      <body className="min-h-full bg-[#02090d] font-sans text-[#f5fbfd] antialiased">
        <OpeningIntro>{children}</OpeningIntro>
      </body>
    </html>
  );
}
