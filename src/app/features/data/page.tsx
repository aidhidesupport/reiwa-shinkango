import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Filter,
  GitBranch,
  Layers3,
  Scale,
} from "lucide-react";

export const metadata = {
  title: "「データ」を漢字二字にできるか―456万通りから「与象」を考える",
  description: "dataの語源「与えられたもの」から出発し、常用漢字二字の456万通りを規則で絞り、「与象」という暫定案に至るまでを公開します。",
  alternates: {
    canonical: "/features/data",
  },
  openGraph: {
    type: "article",
    locale: "ja_JP",
    siteName: "令和新漢語",
    title: "「データ」を漢字二字にできるか。",
    description: "常用漢字二字の456万通りから、語源、意味の広さ、既存語との衝突、語族展開を順に検査します。",
    url: "/features/data",
    images: [{
      url: "/og.png",
      width: 1200,
      height: 630,
      alt: "令和新漢語―新しい概念を、日本語で考えられる言葉へ。",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "「データ」を漢字二字にできるか。",
    description: "456万通りから規則を重ね、暫定案「与象」を炙り出します。",
    images: ["/og.png"],
  },
};

const filterStages = [
  {
    source: "全組合せ",
    proposal: "4,562,496",
    note: "常用漢字2,136字を二つ並べる。順序を区別し、同じ字の重複も許した出発点です。",
  },
  {
    source: "意味に関係し得る二字",
    proposal: "10,609",
    note: "授受、取得、記録、表現、差異、内容、材料などに関係する103字へ絞ります。",
  },
  {
    source: "語源を厳密に残す",
    proposal: "27",
    note: "第一字を「与」に限定し、所与・既与・被与という文法的な形も例外として残します。",
  },
  {
    source: "日本語として試す",
    proposal: "5",
    note: "推義性、音、既存語との衝突、複合語への展開まで通った最終候補です。",
  },
];

const finalists = [
  {
    source: "一般的なdata",
    proposal: "与象",
    reading: "よしょう",
    note: "与えられた表象。形式や真偽を限定せず、数値、文字、画像、音声、観測、生成を広く受け止めます。",
    example: "観測与象を分析し、与象庫へ保存する。",
  },
  {
    source: "datum・data item",
    proposal: "与項",
    reading: "よこう",
    note: "与えられた個々の項目。表やデータ構造には強い一方、非構造化データ全体には狭い案です。",
    example: "欠けている与項を補う。",
  },
  {
    source: "分析材料としてのdata",
    proposal: "与料",
    reading: "よりょう",
    note: "処理や判断のために与えられた材料。「与料量」としたときの音の重なりが弱点です。",
    example: "学習用の与料を整える。",
  },
  {
    source: "前提・input data",
    proposal: "与件",
    reading: "よけん",
    note: "既存語で、語源にも忠実です。ただし前提条件や所与の事実という意味がすでに強くあります。",
    example: "計算の与件を入力する。",
  },
  {
    source: "哲学・論理上のdata",
    proposal: "所与",
    reading: "しょよ",
    note: "「与えられたもの」の忠実な既存訳ですが、所与型、所与庫などの技術的な派生には向きません。",
    example: "感覚の所与から考察を始める。",
  },
];

const wordFamily = [
  ["データ処理", "与象処理"],
  ["データ分析", "与象分析"],
  ["データ型", "与象型"],
  ["データ構造", "与象構造"],
  ["データセット", "与象集"],
  ["データベース", "与象庫"],
  ["個人データ", "個人与象"],
  ["生データ", "原与象"],
];

const references = [
  {
    label: "Merriam-Webster「datum」",
    href: "https://www.merriam-webster.com/dictionary/datum",
    note: "datumを、推論の基礎として与えられ、または認められたものと説明し、dataがその複数形であることを示している。",
  },
  {
    label: "榎本啄杜「オープンサイエンス時代の『データ』を哲学する」",
    href: "https://www.jstage.jst.go.jp/article/jpssj/58/2/58_3/_pdf",
    note: "データの語源と、表象的・関係的・差異的という三つの見方を整理している。「差・異・別・区」を候補字へ加える根拠にもなった。",
  },
  {
    label: "精選版 日本国語大辞典・日本大百科全書「与件」",
    href: "https://kotobank.jp/word/%E4%B8%8E%E4%BB%B6-653799",
    note: "与件を、推理や研究の出発点として与えられる事物とし、dataの訳であることも示している。",
  },
  {
    label: "経済産業省「平成24年延長産業連関表の作成方法」",
    href: "https://www.meti.go.jp/statistics/tyo/kanieio/result/result_13/pdf/H24keio-making.pdf",
    note: "「与件データ」という実用例があり、現代日本語の「与件」が一般的なデータより狭く使われていることを確認できる。",
  },
];

export default function DataFeaturePage() {
  return (
    <div className="page-shell narrow feature-page">
      <section className="feature-hero">
        <p className="eyebrow">今週の新漢語・第二回</p>
        <h1>「データ」を漢字二字にできるか。<br />456万通りから「与象」を考える。</h1>
        <p>
          思いついた熟語を並べて、響きのよいものを選ぶ。それだけでは、
          なぜ別の字を落としたのかが残りません。そこで今回は、常用漢字二字の
          全組合せから出発し、規則を一つずつ加えて候補を炙り出しました。
        </p>
      </section>

      <section className="feature-finding">
        <Filter size={25} aria-hidden="true" />
        <div>
          <p className="eyebrow">暫定提案</p>
          <h2>データ → 与象（よしょう）</h2>
          <p>
            「与」は、ある観察者や処理過程に与えられたもの。
            「象」は、対象そのものではなく、数値、文字、画像、音声などの形で現れた表象です。
            ただし、これは完成した訳語ではありません。規則を公開し、弱点を含めて試すための第一候補です。
          </p>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">語源から始める</p>
          <h2>dataは「与えられたもの」だった。</h2>
          <p>
            dataはラテン語datumの複数形です。datumは「与えられたもの」を意味し、
            推論や計算の出発点を指しました。だから第一の中心字は「与」になります。
            しかし現代のデータは、ただ発見されるだけでなく、目的に応じて収集され、
            生成され、加工され、伝達されます。「与」だけで概念を決め切ることもできません。
          </p>
        </div>
        <div className="feature-question-grid">
          <article>
            <BookOpenText size={22} aria-hidden="true" />
            <h3>語源</h3>
            <p>推論や処理の段階で「与えられたもの」であることを「与」で残します。</p>
          </article>
          <article>
            <Layers3 size={22} aria-hidden="true" />
            <h3>現代の広がり</h3>
            <p>数値だけでなく、文字、画像、音声、人工的に生成した内容まで含めます。</p>
          </article>
          <article>
            <Scale size={22} aria-hidden="true" />
            <h3>認識上の中立</h3>
            <p>データは誤りや雑音を含み得るため、「実」「証」「知」を本質にしません。</p>
          </article>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">全組合せから絞る</p>
          <h2>一語ずつ眺めず、規則で候補群を落とす。</h2>
          <p>
            4,562,496語を人が順番に品評したわけではありません。
            意味のない組合せをまとめて除く規則を先に定め、残った語だけを個別に読みました。
            調査の途中で差異的なデータ観を知り、「差・異・別・区」の四字も候補集合へ追加しています。
          </p>
        </div>
        <div className="engagement-context-grid">
          {filterStages.map((stage) => (
            <article key={stage.source} className="engagement-context-card">
              <span>{stage.source}</span>
              <strong>{stage.proposal}</strong>
              <p>{stage.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">加えた規則</p>
          <h2>形式、真偽、用途を勝手に狭めない。</h2>
        </div>
        <div className="feature-question-grid">
          <article>
            <Filter size={22} aria-hidden="true" />
            <h3>形式限定を除く</h3>
            <p>値、数、量、文、音、像など、一種類のデータだけを表す字を基幹語から外しました。</p>
          </article>
          <article>
            <Scale size={22} aria-hidden="true" />
            <h3>真実性を加えない</h3>
            <p>事、実、証、知、情、報は、事実・証拠・情報であることを先回りしてしまいます。</p>
          </article>
          <article>
            <GitBranch size={22} aria-hidden="true" />
            <h3>保存を本質にしない</h3>
            <p>記、録、存、蓄は有力ですが、流れている途中のデータまで含む基幹語には狭すぎます。</p>
          </article>
        </div>
      </section>

      <section className="feature-trial">
        <div>
          <span>語源規則まで通った27語</span>
          <p>
            与物、与件、与項、与象、与差、与異、与別、与区、与体、与記、与録、
            与載、与存、与蓄、与料、与資、与材、与素、与拠、与基、与本、与原、
            与元、与集、所与、既与、被与
          </p>
        </div>
        <ArrowRight size={24} aria-hidden="true" />
        <div>
          <span>意味・音・語族まで通った5語</span>
          <p>与象、与項、与料、与件、所与</p>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">五つの最終候補</p>
          <h2>一つの勝者ではなく、合う範囲も残す。</h2>
          <p>
            「与差」は意味の上では注目に値しましたが、「よさ」が日常語の「良さ」と衝突し、
            与差庫・与差型なども定着させにくいため最終候補から外しました。
          </p>
        </div>
        <div className="engagement-context-grid">
          {finalists.map((candidate) => (
            <article key={candidate.proposal} className="engagement-context-card">
              <span>{candidate.source}</span>
              <strong>{candidate.proposal}<small>（{candidate.reading}）</small></strong>
              <p>{candidate.note}</p>
              <blockquote>{candidate.example}</blockquote>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">なぜ「与件」ではないのか</p>
          <h2>正しい既存語でも、範囲が足りない。</h2>
          <p>
            「与件」は、辞書にもdataの訳として載る有力語です。一方、現在は研究や計算の前提、
            経済分析で外から与える条件という意味が強く、実務では「与件データ」とも書かれます。
            文章、画像、音声、ログなどをまとめて「与件」と呼ぶには、既存義とのずれが残ります。
            「所与」はさらに語源に忠実ですが、哲学語としての色が強く、技術的な複合語を作りにくい。
            その二語を退けるのではなく、合う領域を限定して残します。
          </p>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-section-heading">
          <p className="eyebrow">語族試験</p>
          <h2>「与象」は周辺語を作れるか。</h2>
          <p>
            基幹語は、一語だけ美しくても足りません。処理、構造、集合、保存先などへ
            広げたときに働くかを試します。以下はすべて暫定案です。
          </p>
        </div>
        <div className="engagement-context-grid">
          {wordFamily.map(([source, proposal]) => (
            <article key={source} className="engagement-context-card">
              <span>{source}</span>
              <strong>{proposal}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-trial">
        <div>
          <span>元の文</span>
          <p>センサーが測定データをデータベースへ送り、プログラムがデータを分析する。</p>
        </div>
        <ArrowRight size={24} aria-hidden="true" />
        <div>
          <span>暫定語を使った文</span>
          <p>センサーが測定与象を与象庫へ送り、算譜が与象を分析する。</p>
        </div>
      </section>

      <section className="feature-cautions">
        <div>
          <strong>現時点の良さ</strong>
          <p>
            語源の「与」を保ち、「象」によって数値以外の表現も含められます。
            与象処理、与象型、与象庫など、計算機分野の語族にも展開できます。
          </p>
        </div>
        <div>
          <strong>現時点の弱さ</strong>
          <p>
            初見でデータを推測するのは難しく、「象」から象の動物を思い浮かべる人もいます。
            また、すべてのデータを何かの表象とみなせるかは、哲学的にも決着していません。
          </p>
        </div>
      </section>

      <section className="feature-section feature-references">
        <div className="feature-section-heading">
          <p className="eyebrow">調査資料</p>
          <h2>候補集合も、規則も、後から直せるようにする。</h2>
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
          <p className="eyebrow">試用を始める</p>
          <h2>「与象」は、まだ結論ではありません。</h2>
          <p>
            技術文書、授業、会話へ実際に入れ、意味を推測できるか、
            繰り返しても邪魔にならないかを確かめます。別の規則や候補も公開で検討します。
          </p>
        </div>
        <div className="feature-invitation-actions">
          <Link href="/terms/new" className="button">
            別案を提案する <ArrowRight size={17} />
          </Link>
          <Link href="/features" className="text-link">
            記事一覧へ <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
