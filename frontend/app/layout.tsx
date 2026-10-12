import type { Metadata } from "next";
import { Inter, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { RoleProvider } from "@/lib/role-context";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Credent — Open credit-evidence layer on Monad",
  description:
    "Portable, source-proven credit attestations for people the credit system cannot see. Built on Monad.",
  openGraph: {
    title: "Credent",
    description: "Open on-chain credit evidence for the underbanked",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full">
        <Providers>
          <RoleProvider>
            {children}
          </RoleProvider>
        </Providers>
      </body>
    </html>
  );
}
