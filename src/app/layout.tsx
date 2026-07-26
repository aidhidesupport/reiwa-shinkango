import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/Header";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "令和新漢語",
    template: "%s | 令和新漢語",
  },
  description: "横文字を文脈に合う日本語へ。日本語案と使用例を公開で推敲する場。",
  applicationName: "令和新漢語",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "令和新漢語",
    title: "令和新漢語",
    description: "横文字を文脈に合う日本語へ。日本語案と使用例を公開で推敲する場。",
  },
  twitter: {
    card: "summary",
    title: "令和新漢語",
    description: "横文字を文脈に合う日本語へ。日本語案と使用例を公開で推敲する場。",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <a className="skip-link" href="#main-content">本文へ移動</a>
        <Header />
        <main id="main-content" tabIndex={-1}>{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
