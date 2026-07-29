import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  GitBranch,
  History,
  MessageSquareText,
  Network,
} from "lucide-react";

export const metadata = {
  title: "算譜語群―プログラムを日本語で考える",
  description: "プログラムの訳語「算譜」と、作譜・算譜師・算譜言語・試譜を、由来と使用例から現代の文章で試します。",
  alternates: {
    canonical: "/features/sanpu",
  },
  openGraph: {
    type: "article",
    locale: "ja_JP",
    siteName: "令和新漢語",
    title: "「算譜」を、もう一度使える言葉にできるか。",
    description: "プログラム、プログラミング、プログラマー、プログラミング言語、テストプログラムを一つの語族として試します。",
    url: "/features/sanpu",
    images: [{
      url: "/og.png",
      width: 1200,
      height: 630,
      alt: "令和新漢語―新しい概念を、日本語で考えられる言葉へ。",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "「算譜」を、もう一度使える言葉にできるか。",
    description: "休眠していたプログラミング用語を、五つの関連語と文章で試します。",
    images: ["/og.png"],
  },
};

const wordFamily = [
  {
    source: "プログラム",
    original: "program",
    proposal: "算譜",
    reading: "さんぷ",
    slug: "program",
    note: "計算や情報処理の手順を、一定の規則に従って記したもの。",
  },
  {
    source: "プログラミング",
    original: "programming",
    proposal: "作譜",
    reading: "さくふ",
    slug: "programming",
    note: "算譜を設計し、記述し、確かめ、直す一連の活動。",
  },
  {
    source: "プログラマー",
    original: "programmer",
    proposal: "算譜師",
    reading: "さんぷし",
    slug: "programmer",
    note: "算譜の設計や作成を専門または主要な活動とする人。",
  },
  {
    source: "プログラミング言語",
    original: "programming language",
    proposal: "算譜言語",
    reading: "さんぷげんご",
    slug: "programming-language",
    note: "算譜を記述するための構文と意味の規則を持つ人工言語。",
  },
  {
    source: "テストプログラム",
    original: "test program",
    proposal: "試譜",
    reading: "しふ",
    slug: "test-program",
    note: "別の算譜や機器の動作を確かめるために作る算譜。",
  },
];

const references = [
  {
    label: "神奈川大学プログラミング科学研究所「プログラミング科学とは？」",
    href: "https://lab.progsci.info.kanagawa-u.ac.jp/research/programming-science",
    note: "「算譜」をプログラムの訳語として、算譜意味論・算譜検証論を研究に用いている。",
  },
  {
    label: "D.グリース著・筧捷彦訳『プログラミングの科学』",
    href: "https://ci.nii.ac.jp/ncid/BN05839038",
    note: "1991年の訳書で「算譜の開発」「作譜」などを体系的に使用している。",
  },
  {
    label: "情報科学技術フォーラム FIT2015「日本語プログラミング言語『敷島』」",
    href: "https://www.ieice.org/publications/conference-FIT-DVDs/FIT2015/data/pdf/K-010.pdf",
    note: "プログラムを「算譜」と呼び、「算譜言語」という複合語を実際に用いている。",
  },
  {
    label: "精選版 日本国語大辞典「プログラム」",
    href: "https://kotobank.jp/word/%E3%81%B7%E3%82%8D%E3%81%90%E3%82%89%E3%82%80-3168632",
    note: "コンピューターのプログラムの訳語として「算譜」を収録し、1957年の用例を示している。",
  },
];

export default function SanpuFeaturePage() {
  return (
    <div className="page-shell narrow feature-page">
      <section className="feature-hero">
        <p className="eyebrow">今週の新漢語・第一回</p>
        <h1>「算譜」を、もう一度<br />使える言葉にできるか。</h1>
        <p>
          「算譜」は、プログラムのために今つくった新語ではありません。
          かつて辞書、専門書、研究で使われ、現在はまれになった言葉です。
          令和新漢語では、この一語を復活させるのではなく、
          関連語と文章の中で本当に働くかを公開で試します。
        </p>
      </section>

      <section className="feature-finding">
        <History size={25} aria-hidden="true" />
        <div>
          <p className="eyebrow">調査で分かったこと</p>
          <h2>新造ではなく、再発見でした。</h2>
          <p>
            「算譜」は少なくとも1950年代から用例が確認でき、
            1980年代の情報処理分野、1991年の専門書、現在の大学研究にも続いています。
            ただし一般にはほとんど定着せず、古めかしさや音楽の「譜」との混同も残ります。
          </p>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">五つの関連語</p>
          <h2>一語ではなく、語族として試す。</h2>
          <p>すべて暫定案です。各項目で、合う場面、弱点、言い換え例を確認できます。</p>
        </div>
        <div className="word-family-grid">
          {wordFamily.map((word) => (
            <Link key={word.slug} href={`/terms/${word.slug}`} className="word-family-card">
              <span className="word-family-source">{word.source}<small>{word.original}</small></span>
              <strong>{word.proposal}<small>{word.reading}</small></strong>
              <p>{word.note}</p>
              <span className="word-family-link">使用例と弱点を見る <ArrowRight size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="feature-trial">
        <div>
          <span>元の言葉を使った文</span>
          <p>
            プログラマーは、プログラミング言語を使ってプログラムを作り、
            テストプログラムで動作を確かめる。
          </p>
        </div>
        <ArrowRight size={24} aria-hidden="true" />
        <div>
          <span>語群を使った文</span>
          <p>
            算譜師は、算譜言語を使って算譜を作譜し、
            試譜で動作を確かめる。
          </p>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">検討する観点</p>
          <h2>短さだけでは、使える言葉になりません。</h2>
        </div>
        <div className="feature-question-grid">
          <article>
            <BookOpenText size={22} aria-hidden="true" />
            <h3>初見で意味を推測できるか</h3>
            <p>「算」と「譜」から、計算機へ与える構成された記述を想像できるでしょうか。</p>
          </article>
          <article>
            <Network size={22} aria-hidden="true" />
            <h3>派生語が自然か</h3>
            <p>算譜、作譜、算譜師、算譜言語、試譜は、同じ体系として無理なく読めるでしょうか。</p>
          </article>
          <article>
            <MessageSquareText size={22} aria-hidden="true" />
            <h3>文章と会話に入るか</h3>
            <p>専門文書だけでなく、授業、会話、開発現場で繰り返し使えるかを試します。</p>
          </article>
        </div>
      </section>

      <section className="feature-cautions">
        <div>
          <strong>現時点の良さ</strong>
          <p>短く、「書く・直す・実行する」と結びつき、関連語をまとめて造りやすい。</p>
        </div>
        <div>
          <strong>現時点の弱さ</strong>
          <p>読みが知られておらず、「作譜」は音楽用語と衝突し、「算譜師」は職業人に意味を狭める可能性がある。</p>
        </div>
      </section>

      <section className="feature-section feature-references">
        <div className="feature-section-heading">
          <p className="eyebrow">調査資料</p>
          <h2>根拠をたどれるようにする。</h2>
        </div>
        <ol>
          {references.map((reference) => (
            <li key={reference.href}>
              <a href={reference.href} target="_blank" rel="noreferrer">{reference.label}</a>
              <p>{reference.note}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="feature-invitation">
        <div>
          <p className="eyebrow">試用に参加する</p>
          <h2>「使える」「使いにくい」を、具体的な文で教えてください。</h2>
          <p>一語だけでも構いません。評価、コメント、新しい言い換え例を各項目から投稿できます。</p>
        </div>
        <div className="feature-invitation-actions">
          <Link href="/terms/program" className="button">
            「算譜」を評価する <ArrowRight size={17} />
          </Link>
          <Link href="/features" className="text-link">
            記事一覧へ <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
