import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  GitBranch,
  MessageSquareText,
  Network,
  Search,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "活動理念",
  description: "令和新漢語が目指す公開造語活動と、言葉を調べ、造り、試し、育てるための原則。",
  alternates: {
    canonical: "/vision",
  },
  openGraph: {
    type: "article",
    locale: "ja_JP",
    siteName: "令和新漢語",
    title: "活動理念｜令和新漢語",
    description: "新しい概念を、日本語で考えられる言葉へ。令和新漢語が目指す公開造語活動。",
    url: "/vision",
    images: [{
      url: "/og.png",
      width: 1200,
      height: 630,
      alt: "令和新漢語―新しい概念を、日本語で考えられる言葉へ。",
    }],
  },
};

const principles = [
  {
    title: "必ず漢語で造る",
    body: "提案語は、漢字音を組み合わせた漢語とします。和語や外来語との混成は、新漢語案には採りません。",
  },
  {
    title: "意味を精確にする",
    body: "原概念の中心と範囲、隣接する概念との違いを調べ、字面の面白さだけで決めません。",
  },
  {
    title: "見て推測できる",
    body: "初めて見る人が、漢字や語の組み合わせから意味の方向を想像できるかを確かめます。",
  },
  {
    title: "関連語へ広げられる",
    body: "動作、担い手、対象、性質などの語を自然につくれ、一つの語族として働くかを試します。",
  },
  {
    title: "文章の中で使える",
    body: "名詞として置くだけでなく、書く、話す、教える場面で無理なく繰り返せるかを見ます。",
  },
  {
    title: "弱点も公開する",
    body: "採用案だけでなく、誤解の可能性、不採用理由、判断が分かれた論点も記録します。",
  },
  {
    title: "使いながら改める",
    body: "推奨は永久の決定ではありません。新しい用例や社会の変化に応じて見直します。",
  },
];

export default function VisionPage() {
  return (
    <div className="page-shell narrow vision-page">
      <section className="vision-hero">
        <p className="eyebrow">令和新漢語の活動理念</p>
        <h1>新しい概念を、<br />日本語で考えられる言葉へ。</h1>
        <p className="vision-lead">
          原語の音を写すだけでも、長い説明にほどくだけでもなく、
          意味を担い、関連する語を生み、実際の文章で使える日本語をつくります。
        </p>
        <div className="top-actions">
          <Link href="/terms/engagement" className="button">
            日本語案を見る <ArrowRight size={17} />
          </Link>
          <Link href="/terms/new" className="button secondary">
            造語に参加する
          </Link>
        </div>
      </section>

      <section className="vision-statement">
        <Sparkles size={26} aria-hidden="true" />
        <div>
          <p className="eyebrow">活動宣言</p>
          <blockquote>
            新しい概念を、日本語で考えられる言葉に造り直し、社会へ渡す。
          </blockquote>
        </div>
      </section>

      <section className="vision-section">
        <div className="vision-section-heading">
          <p className="eyebrow">何を目指すのか</p>
          <h2>言い換え辞書ではなく、公開造語活動です。</h2>
        </div>
        <div className="vision-copy">
          <p>
            近代の日本では、社会、科学、哲学、経済など、新しい知識を受け止める言葉が数多く造られました。
            それらは外国語の置き換えにとどまらず、日本語で学び、論じ、次の概念を生み出す基盤になりました。
          </p>
          <p>
            現代にも、情報技術、経営、金融、生命科学、環境など、外国語の形のまま入ってくる概念が増えています。
            令和新漢語は、それらを日本語の内部で運用できる言葉として造り直し、検討の過程ごと公開します。
          </p>
        </div>
      </section>

      <section className="vision-balance">
        <div>
          <strong>外来語を排除しません</strong>
          <p>
            定着した外来語や、原語のまま使う意味がある言葉は残ります。
            新漢語は強制ではなく、日本語で理解し、選び、使うためのもう一つの道です。
          </p>
        </div>
        <div>
          <strong>漢字ならよい、とも考えません</strong>
          <p>
            硬すぎる、読みにくい、既存語と紛らわしい、意味を誤って想像させる。
            そうした弱点も、実際の文と議論の中で検証します。
          </p>
        </div>
      </section>

      <section className="vision-section">
        <div className="vision-section-heading">
          <p className="eyebrow">造語の原則</p>
          <h2>一語の美しさより、長く使える強さを見る。</h2>
        </div>
        <div className="vision-principles">
          {principles.map((principle, index) => (
            <article key={principle.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="vision-section">
        <div className="vision-section-heading">
          <p className="eyebrow">言葉の育て方</p>
          <h2>調査から定着まで、判断の根拠を残します。</h2>
        </div>
        <ol className="vision-process">
          <li>
            <Search size={21} aria-hidden="true" />
            <div><strong>原概念を調べる</strong><p>定義、歴史、隣接概念、既存訳を整理します。</p></div>
          </li>
          <li>
            <BookOpenText size={21} aria-hidden="true" />
            <div><strong>複数の案を造る</strong><p>造語の根拠と、合う場面・合わない場面を示します。</p></div>
          </li>
          <li>
            <Network size={21} aria-hidden="true" />
            <div><strong>語族として検証する</strong><p>関連語や派生語へ広げ、体系として破綻しないか見ます。</p></div>
          </li>
          <li>
            <MessageSquareText size={21} aria-hidden="true" />
            <div><strong>文章と会話で試す</strong><p>教材、技術文書、会話などで使い、結果を持ち寄ります。</p></div>
          </li>
          <li>
            <GitBranch size={21} aria-hidden="true" />
            <div><strong>推奨し、育て続ける</strong><p>根拠を示して推奨し、新しい用例に応じて改めます。</p></div>
          </li>
        </ol>
      </section>

      <section className="vision-invitation">
        <div>
          <p className="eyebrow">参加する</p>
          <h2>一つの正解より、使える言葉を一緒につくる。</h2>
          <p>
            造語案だけでなく、原概念の知識、実際に使った感想、
            「この場面では意味がずれる」という指摘も大切な参加です。
          </p>
        </div>
        <Link href="/terms/new" className="button">
          最初の一語を提案 <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
