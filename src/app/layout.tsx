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
  description: "新しい概念を、日本語で考えられる言葉へ。造語案を意味・語族・使用例から公開で育てる、現代のための造語所。",
  applicationName: "令和新漢語",
  verification: {
    google: "q_llTZ-8pvZlKmV4DBC5ZoIDqjVi-vDwQfF-Ukc1BcU",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "令和新漢語",
    title: "令和新漢語",
    description: "新しい概念を、日本語で考えられる言葉へ。造語案を意味・語族・使用例から公開で育てる、現代のための造語所。",
    images: [{
      url: "/og.png",
      width: 1200,
      height: 630,
      alt: "令和新漢語―新しい概念を、日本語で考えられる言葉へ。",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "令和新漢語",
    description: "新しい概念を、日本語で考えられる言葉へ。造語案を意味・語族・使用例から公開で育てる、現代のための造語所。",
    images: ["/og.png"],
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
