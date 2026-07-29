import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";
import { featureArticles } from "@/lib/articles";

export const metadata = {
  title: "記事一覧",
  description: "令和新漢語で公開した「今日の横文字」「今週の新漢語」などの記事を、新しい順にまとめています。",
  alternates: {
    canonical: "/features",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "令和新漢語",
    title: "記事一覧｜令和新漢語",
    description: "横文字の言い換え、新漢語の由来、語族の試用を扱った記事をまとめて読めます。",
    url: "/features",
    images: [{
      url: "/og.png",
      width: 1200,
      height: 630,
      alt: "令和新漢語―新しい概念を、日本語で考えられる言葉へ。",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "記事一覧｜令和新漢語",
    description: "横文字の言い換え、新漢語の由来、語族の試用を扱った記事をまとめて読めます。",
    images: ["/og.png"],
  },
};

export default function FeaturesPage() {
  return (
    <div className="page-shell narrow article-index-page">
      <section className="article-index-hero">
        <p className="eyebrow"><BookOpenText size={15} /> 記事一覧</p>
        <h1>言葉を調べ、<br />文章の中で試した記録。</h1>
        <p>
          横文字の文脈別の言い換え、眠っていた日本語の再発見、
          関連語をまとめた語族の試用を、新しい記事から順に読めます。
        </p>
      </section>

      <section className="article-archive" aria-labelledby="article-archive-title">
        <div className="article-archive-heading">
          <h2 id="article-archive-title">すべての記事</h2>
          <p>{featureArticles.length}件</p>
        </div>

        <div className="article-archive-list">
          {featureArticles.map((article, index) => (
            <article key={article.slug} className="article-archive-card">
              <div className="article-archive-meta">
                <span>{article.series}</span>
                <time dateTime={article.publishedAt}>{article.publishedLabel}</time>
              </div>
              <div className="article-archive-copy">
                {index === 0 ? <span className="article-latest-label">最新</span> : null}
                <h2>
                  <Link href={article.href}>{article.title}</Link>
                </h2>
                <p>{article.summary}</p>
                <div className="article-topic-list" aria-label="記事の話題">
                  {article.topics.map((topic) => <span key={topic}>{topic}</span>)}
                </div>
              </div>
              <Link href={article.href} className="article-archive-link" aria-label={`${article.title}を読む`}>
                {article.cta} <ArrowRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
