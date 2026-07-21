import type { Metadata } from "next";
import { bebas, inter, jetbrains, sairaCondensed } from "@/lib/ai/prompt";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Providers from "@/components/layout/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "CricInsights — Data-First AI Cricket Intelligence",
  description:
    "Data-first AI cricket insights for IPL & The Hundred. Player intelligence, role-aware comparisons, and league analytics — every number from the database, with shareable cards as a bonus.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${bebas.variable} ${sairaCondensed.variable} ${jetbrains.variable} antialiased`}
      >
        {/* ambient stage: aurora blobs + pitch grid + grain */}
        <div className="stage-bg" aria-hidden>
          <div className="aurora aurora-1" />
          <div className="aurora aurora-2" />
          <div className="aurora aurora-3" />
        </div>
        <Providers>
          <SiteHeader />
          <main className="pt-[88px]">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
