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
  description: "SNSでは、いいねやコメント。職場では、仕事への意欲や会社への愛着。「エンゲージメント」の中身を、普段の日本語で言い直します。",
  alternates: {
    canonical: "/features/engagement",
  },
  openGraph: {
    type: "article",
    locale: "ja_JP",
    siteName: "令和新漢語",
    title: "「エンゲージメントを高める」って、結局どういうこと？",
    description: "SNSでは、いいねやコメント。職場では、仕事への意欲や会社への愛着。ひとつの言葉に詰め込まれた違いをほどきます。",
    url: "/features/engagement",
    images: [{
      url: "/features/engagement-og-v2.png",
      width: 1200,
      height: 630,
      alt: "エンゲージメントが、投稿への反応、利用の続き方、仕事への意欲、会社への愛着という意味で使われることを示す図。",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "「エンゲージメントを高める」って、結局どういうこと？",
    description: "SNSでは、いいねやコメント。職場では、仕事への意欲や会社への愛着。ひとつの言葉に詰め込まれた違いをほどきます。",
    images: ["/features/engagement-og-v2.png"],
  },
};

const contexts = [
  {
    source: "投稿のエンゲージメント",
    proposal: "投稿への反応",
    example: "この投稿は、いいねやコメントが多かった。",
    note: "SNSの数字を見ているなら、何が増えたのかをそのまま書く方が伝わります。",
  },
  {
    source: "利用者のエンゲージメント",
    proposal: "どれくらい使われているか",
    example: "利用者が、どのくらい続けて使っているかを見る。",
    note: "サイトやアプリでは、利用時間、再訪、登録など、実際に見ている行動を示します。",
  },
  {
    source: "社員のエンゲージメント",
    proposal: "仕事への意欲",
    example: "社員が、意欲を持って働ける職場にする。",
    note: "仕事に前向きに取り組めているかを話すなら、「意欲」や「働きがい」が自然です。",
  },
  {
    source: "組織へのエンゲージメント",
    proposal: "会社への愛着",
    example: "この会社で働き続けたいと思えるかを尋ねる。",
    note: "会社との結びつきについて聞きたいなら、愛着、信頼、帰属意識などに分けて考えます。",
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
          SNSなら、いいねやコメントの話かもしれません。
          職場なら、社員の意欲や会社への愛着の話かもしれません。
        </p>
      </section>

      <section className="feature-finding">
        <CircleHelp size={25} aria-hidden="true" />
        <div>
          <p className="eyebrow">今日の問い</p>
          <h2>ひとことで済ませると、話がぼやける。</h2>
          <p>
            「エンゲージメント」は便利な言葉です。
            便利だからこそ、何を指しているのかを言わないまま話が進みがちです。
            数字を増やしたいのか、もっと使ってほしいのか、
            気持ちよく働ける職場にしたいのか。そこを日本語で言い直してみます。
          </p>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">場面ごとに言い直す</p>
          <h2>決まった訳語より、伝わる一文を。</h2>
          <p>
            同じカタカナ語でも、場面が変われば中身も変わります。
            一語にそろえず、その場で本当に言いたいことを書いてみます。
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
          <p>この投稿は、エンゲージメントが高かった。</p>
        </div>
        <ArrowRight size={24} aria-hidden="true" />
        <div>
          <span>言い直した文</span>
          <p>この投稿は、いいねやコメントが多かった。</p>
        </div>
      </section>

      <section className="feature-trial engagement-workplace-trial">
        <div>
          <span>元の文</span>
          <p>社員のエンゲージメントを高める。</p>
        </div>
        <ArrowRight size={24} aria-hidden="true" />
        <div>
          <span>言い直した文</span>
          <p>社員が、意欲を持って働ける職場にする。</p>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">書き換える前に</p>
          <h2>まず、何の話をしているのか確かめる。</h2>
        </div>
        <div className="feature-question-grid">
          <article>
            <BarChart3 size={22} aria-hidden="true" />
            <h3>実際に見ているのは何か</h3>
            <p>いいねの数なのか、利用時間なのか。見ているものを、そのまま書けないか考えます。</p>
          </article>
          <article>
            <Users size={22} aria-hidden="true" />
            <h3>誰の気持ちの話か</h3>
            <p>利用者の行動なのか、社員の仕事への意欲なのか、会社への愛着なのかを分けます。</p>
          </article>
          <article>
            <Target size={22} aria-hidden="true" />
            <h3>どうなれば成功なのか</h3>
            <p>反応が増えればよいのか、長く使ってほしいのか。目指すところをはっきりさせます。</p>
          </article>
        </div>
      </section>

      <section className="feature-cautions">
        <div>
          <MessageCircle size={20} aria-hidden="true" />
          <strong>具体的に書くと</strong>
          <p>何を良くしたいのかが見えます。読む人も、次に何をすればよいか考えやすくなります。</p>
        </div>
        <div>
          <HeartHandshake size={20} aria-hidden="true" />
          <strong>一語で言い切れないこともある</strong>
          <p>仕事への意欲と会社への愛着は別のものです。必要なら、無理にまとめず二つに分けて書きます。</p>
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
          <h2>「エンゲージメント」と書きたくなったら、ひと呼吸。</h2>
          <p>その文で本当に伝えたいことは何でしょう。実際の一文があれば、ぜひ教えてください。</p>
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
