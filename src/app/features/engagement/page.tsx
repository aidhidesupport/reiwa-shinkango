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
  title: "「エンゲージメント」は、なぜ一語で訳せないのか",
  description: "投稿への反応、利用者の関与、社員の働きがい、組織への愛着。同じ「エンゲージメント」を、測る対象と文脈から日本語に言い分けます。",
  alternates: {
    canonical: "/features/engagement",
  },
  openGraph: {
    type: "article",
    locale: "ja_JP",
    siteName: "令和新漢語",
    title: "「エンゲージメント」は、なぜ一語で訳せないのか。",
    description: "投稿への反応と社員の働きがいは、同じものではありません。文脈ごとに四つの日本語を試します。",
    url: "/features/engagement",
    images: [{
      url: "/features/engagement-og.png",
      width: 1200,
      height: 630,
      alt: "エンゲージメントを、反応度、関与度、働きがい、組織への愛着に言い分ける図。",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "「エンゲージメント」は、なぜ一語で訳せないのか。",
    description: "投稿への反応と社員の働きがいは、同じものではありません。文脈ごとに四つの日本語を試します。",
    images: ["/features/engagement-og.png"],
  },
};

const contexts = [
  {
    source: "投稿のエンゲージメント",
    proposal: "反応度",
    example: "投稿への反応度を分析する。",
    note: "いいね、返信、共有など、投稿に現れた反応を数値として扱う場面。",
  },
  {
    source: "利用者のエンゲージメント",
    proposal: "関与度",
    example: "利用者の関与度を確かめる。",
    note: "閲覧、利用、参加など、サービスとの関わりを広く捉える場面。",
  },
  {
    source: "社員のエンゲージメント",
    proposal: "働きがい",
    example: "社員の働きがいを高める。",
    note: "仕事への活力、熱意、没頭を、社員向けに分かりやすく伝える場面。",
  },
  {
    source: "組織へのエンゲージメント",
    proposal: "組織への愛着",
    example: "組織への愛着を測る調査を行う。",
    note: "所属する組織との心理的な結びつきに焦点を当てる場面。",
  },
];

const references = [
  {
    label: "厚生労働省「令和元年版 労働経済の分析」",
    href: "https://www.mhlw.go.jp/wp/hakusyo/roudou/19/dl/19-1-2-3.pdf",
    note: "ワーク・エンゲイジメントを、活力・熱意・没頭がそろった心理状態として整理している。",
  },
  {
    label: "Gallup「What Is Employee Engagement?」",
    href: "https://www.gallup.com/workplace/285674/employee-engagement.aspx",
    note: "従業員の仕事と職場への関与や熱意として、employee engagementを説明している。",
  },
  {
    label: "Google Analytics Help「Engagement rate and bounce rate」",
    href: "https://support.google.com/analytics/answer/12195621",
    note: "一定時間、重要な行動、複数ページ閲覧という条件から、Web上のengagement rateを定義している。",
  },
  {
    label: "Facebook Help Center「About Dashboard」",
    href: "https://www.facebook.com/help/3714470172128723",
    note: "投稿への関わりを示す情報として、閲覧、再生、反応、コメント、共有などを挙げている。",
  },
];

export default function EngagementFeaturePage() {
  return (
    <div className="page-shell narrow feature-page">
      <section className="feature-hero">
        <p className="eyebrow">今日の横文字・2026年7月28日</p>
        <h1>「エンゲージメント」は、<br />なぜ一語で訳せないのか。</h1>
        <p>
          投稿への反応と、社員の働きがいは同じものではありません。
          ところが日本語では、どちらも「エンゲージメント」と呼ばれます。
          言葉を置き換える前に、何を測り、何を良くしたいのかを確かめます。
        </p>
      </section>

      <section className="feature-finding">
        <CircleHelp size={25} aria-hidden="true" />
        <div>
          <p className="eyebrow">今日の問い</p>
          <h2>「高める」の中身は、何ですか。</h2>
          <p>
            投稿なら、増やしたいのは反応かもしれません。
            職場なら、必要なのは仕事への活力や熱意かもしれません。
            原語をそのまま残すと、対象の違いが一つの言葉に隠れてしまいます。
          </p>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">四つの文脈</p>
          <h2>先に意味を決め、それから日本語を選ぶ。</h2>
          <p>
            次の四案は、いつでも交換できる同義語ではありません。
            文の目的に合わせて選ぶ、暫定的な言い分けです。
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
          <span>数字を見たい文</span>
          <p>投稿のエンゲージメントを分析する。</p>
        </div>
        <ArrowRight size={24} aria-hidden="true" />
        <div>
          <span>測るものを示した文</span>
          <p>投稿への反応度を分析する。</p>
        </div>
      </section>

      <section className="feature-trial engagement-workplace-trial">
        <div>
          <span>職場を良くしたい文</span>
          <p>社員のエンゲージメントを高める。</p>
        </div>
        <ArrowRight size={24} aria-hidden="true" />
        <div>
          <span>目指す状態を示した文</span>
          <p>社員の働きがいを高める。</p>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">訳す前の三問</p>
          <h2>カタカナを消すことより、意味を見せる。</h2>
        </div>
        <div className="feature-question-grid">
          <article>
            <BarChart3 size={22} aria-hidden="true" />
            <h3>何を数えるのか</h3>
            <p>反応数、滞在時間、参加回数、心理状態では、同じ指標になりません。</p>
          </article>
          <article>
            <Users size={22} aria-hidden="true" />
            <h3>誰と何の関係か</h3>
            <p>利用者と投稿、社員と仕事、個人と組織のどの関係を指すか確かめます。</p>
          </article>
          <article>
            <Target size={22} aria-hidden="true" />
            <h3>何を変えたいのか</h3>
            <p>反応を増やす施策と、働きやすい職場をつくる施策は分けて考えます。</p>
          </article>
        </div>
      </section>

      <section className="feature-cautions">
        <div>
          <MessageCircle size={20} aria-hidden="true" />
          <strong>言い分ける良さ</strong>
          <p>「誰の、何への、どんな関わりか」が文に現れ、次に取る行動を話し合いやすくなります。</p>
        </div>
        <div>
          <HeartHandshake size={20} aria-hidden="true" />
          <strong>一語に決める弱さ</strong>
          <p>「働きがい」は活力・熱意・没頭より広く、「愛着」だけでは仕事への関与や熱意を十分に表せません。</p>
        </div>
      </section>

      <section className="feature-section feature-references">
        <div className="feature-section-heading">
          <p className="eyebrow">調査資料</p>
          <h2>分野ごとの定義を、混ぜずに読む。</h2>
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
          <h2>その「エンゲージメント」は、何への関わりですか。</h2>
          <p>実際に使った文と文脈があれば、合う日本語案や、言い換えにくい境界を教えてください。</p>
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
