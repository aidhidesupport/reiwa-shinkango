import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CircleHelp,
  HeartHandshake,
  MessageCircle,
  Target,
  Users,
} from "lucide-react";

export const metadata = {
  title: "「エンゲージメントを高める」って、結局どういうこと？",
  description: "反応度、関与度、熱意度、愛着度。「エンゲージメント」の中身を、文脈ごとに四つの三字漢語へ分けて考えます。",
  alternates: {
    canonical: "/features/engagement",
  },
  openGraph: {
    type: "article",
    locale: "ja_JP",
    siteName: "令和新漢語",
    title: "「エンゲージメントを高める」って、結局どういうこと？",
    description: "反応度、関与度、熱意度、愛着度。ひとつの言葉に詰め込まれた違いを、四つの三字漢語へ分けます。",
    url: "/features/engagement",
    images: [{
      url: "/features/engagement-og-v3.png",
      width: 1200,
      height: 630,
      alt: "エンゲージメントを、反応度、関与度、熱意度、愛着度という四つの三字漢語へ分けた図。",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "「エンゲージメントを高める」って、結局どういうこと？",
    description: "反応度、関与度、熱意度、愛着度。ひとつの言葉に詰め込まれた違いを、四つの三字漢語へ分けます。",
    images: ["/features/engagement-og-v3.png"],
  },
};

const contexts = [
  {
    source: "投稿のエンゲージメント",
    proposal: "反応度",
    example: "投稿への反応度を分析する。",
    note: "いいね、コメント、共有など、投稿に現れた反応の強さを示す漢語です。",
  },
  {
    source: "利用者のエンゲージメント",
    proposal: "関与度",
    example: "利用者の関与度を月ごとに測定する。",
    note: "利用時間、再訪、登録など、サービスとの関わりの深さを示す漢語です。",
  },
  {
    source: "社員のエンゲージメント",
    proposal: "熱意度",
    example: "社員の熱意度を高める環境を整える。",
    note: "仕事に向ける活力、熱意、没頭の強さを、組織への愛着と分けて捉える三字漢語です。",
  },
  {
    source: "組織へのエンゲージメント",
    proposal: "愛着度",
    example: "組織への愛着度を測る調査を実施する。",
    note: "所属する組織への愛着や心理的な結びつきの強さを、職務への熱意と分けて示す三字漢語です。",
  },
];

const references = [
  {
    label: "厚生労働省「令和元年版 労働経済の分析」",
    href: "https://www.mhlw.go.jp/wp/hakusyo/roudou/19/dl/19-1-2-3.pdf",
    note: "「ワーク・エンゲイジメント」を、活力・熱意・没頭の三つがそろった状態だと説明している。",
  },
  {
    label: "Gallup「What Is Employee Engagement?」",
    href: "https://www.gallup.com/workplace/285674/employee-engagement.aspx",
    note: "employee engagementを、従業員が仕事や職場にどれだけ熱意を持って関わっているかという言葉で説明している。",
  },
  {
    label: "Google Analytics Help「Engagement rate and bounce rate」",
    href: "https://support.google.com/analytics/answer/12195621",
    note: "閲覧時間や重要な行動、見たページ数をもとに、Webサイトのengagement rateを数えている。",
  },
  {
    label: "Facebook Help Center「About Dashboard」",
    href: "https://www.facebook.com/help/3714470172128723",
    note: "投稿への反応として、閲覧、再生、リアクション、コメント、共有などを挙げている。",
  },
];

export default function EngagementFeaturePage() {
  return (
    <div className="page-shell narrow feature-page">
      <section className="feature-hero">
        <p className="eyebrow">今日の横文字・2026年7月28日</p>
        <h1>「エンゲージメントを高める」って、<br />結局どういうこと？</h1>
        <p>
          「エンゲージメントを高めたい」。仕事の場で、よく耳にする言い方です。
          でも、何をすれば高まったことになるのでしょう。
          令和新漢語では、説明句へほどくだけで終わらせず、
          文脈ごとに使い続けられる漢語を造ります。
        </p>
      </section>

      <section className="feature-finding">
        <CircleHelp size={25} aria-hidden="true" />
        <div>
          <p className="eyebrow">今日の問い</p>
          <h2>意味を分け、漢語として名づける。</h2>
          <p>
            「エンゲージメント」は便利な言葉です。
            便利だからこそ、何を指しているのかを言わないまま話が進みがちです。
            そこで、投稿、利用、職務、組織という四つの対象に分け、
            それぞれを漢語で表す案を立てます。
          </p>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">四つの漢語案</p>
          <h2>文脈ごとに、三字漢語を立てる。</h2>
          <p>
            提案語は、必ず漢語で造ります。
            今回はすべて「度」で結び、漢字三字にそろえました。
            対象は前後の文で補い、語そのものを短く保ちます。
          </p>
        </div>
        <div className="engagement-context-grid">
          {contexts.map((context) => (
            <article key={context.source} className="engagement-context-card">
              <span>{context.source}</span>
              <strong>{context.proposal}</strong>
              <p>{context.note}</p>
              <blockquote>{context.example}</blockquote>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-trial">
        <div>
          <span>元の文</span>
          <p>投稿のエンゲージメントを分析する。</p>
        </div>
        <ArrowRight size={24} aria-hidden="true" />
        <div>
          <span>漢語を使った文</span>
          <p>投稿への反応度を分析する。</p>
        </div>
      </section>

      <section className="feature-trial engagement-workplace-trial">
        <div>
          <span>元の文</span>
          <p>社員のエンゲージメントを高める。</p>
        </div>
        <ArrowRight size={24} aria-hidden="true" />
        <div>
          <span>漢語を使った文</span>
          <p>社員の熱意度を高める。</p>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">造語前の三点</p>
          <h2>漢字を並べる前に、概念を分ける。</h2>
        </div>
        <div className="feature-question-grid">
          <article>
            <BarChart3 size={22} aria-hidden="true" />
            <h3>指標対象</h3>
            <p>いいねの数なのか、利用時間なのか。見ているものを、そのまま書けないか考えます。</p>
          </article>
          <article>
            <Users size={22} aria-hidden="true" />
            <h3>関係主体</h3>
            <p>利用者の関与度なのか、社員の熱意度なのか、組織への愛着度なのかを分けます。</p>
          </article>
          <article>
            <Target size={22} aria-hidden="true" />
            <h3>改善目標</h3>
            <p>反応が増えればよいのか、長く使ってほしいのか。目指すところをはっきりさせます。</p>
          </article>
        </div>
      </section>

      <section className="feature-cautions">
        <div>
          <MessageCircle size={20} aria-hidden="true" />
          <strong>漢語で名づける強み</strong>
          <p>同じ概念を何度も短く呼べ、関連語や指標名へ展開しやすくなります。</p>
        </div>
        <div>
          <HeartHandshake size={20} aria-hidden="true" />
          <strong>一語に統合しない</strong>
          <p>熱意度と愛着度は別の概念です。漢語にしても、異なる意味を無理にまとめません。</p>
        </div>
      </section>

      <section className="feature-section feature-references">
        <div className="feature-section-heading">
          <p className="eyebrow">調査資料</p>
          <h2>同じ言葉でも、分野によって意味が違う。</h2>
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
          <p className="eyebrow">あなたの文で試す</p>
          <h2>新漢語は、必ず漢語で造る。</h2>
          <p>意味の精確さと、文章での使いやすさを両立できているか。実際の用例から一緒に検証してください。</p>
        </div>
        <div className="feature-invitation-actions">
          <Link href="/terms/engagement" className="button">
            日本語案を見る <ArrowRight size={17} />
          </Link>
          <Link href="/features" className="text-link">
            記事一覧へ <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
