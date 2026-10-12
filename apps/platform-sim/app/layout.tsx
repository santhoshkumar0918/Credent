import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SwiftDeliver Pilot Platform — Gig Operator & Payout Simulator",
  description: "Pilot gig-platform operator app for Credent attestation testing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#08090D] text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
