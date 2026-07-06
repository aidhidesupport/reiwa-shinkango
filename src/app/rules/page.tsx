import Link from "next/link";
import { BookOpenCheck, CheckCircle2, Scale, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "投稿ルール",
};

export default function RulesPage() {
  return (
    <div className="page-shell narrow">
      <section className="page-title">
        <p className="eyebrow">運用方針</p>
        <h1>投稿ルール</h1>
        <p>令和新漢語は、横文字の使用者を攻撃する場ではなく、伝わりやすい言い換えを共同で磨く場です。</p>
      </section>

      <section className="policy-list">
        <article>
          <BookOpenCheck size={22} />
          <h2>良い投稿</h2>
          <p>訳語案には、合う文脈、弱点、元文と言い換え文を添えてください。短い案でも、使用例があるほど評価しやすくなります。</p>
        </article>
        <article>
          <CheckCircle2 size={22} />
          <h2>評価の考え方</h2>
          <p>人気投票ではなく、「自然」「意味が正確」「堅い」「意味がずれる」などの観点で見ます。文脈によって複数案が併存します。</p>
        </article>
        <article>
          <ShieldAlert size={22} />
          <h2>禁止事項</h2>
          <p>差別、個人攻撃、外国語話者への攻撃、長文引用、個人情報、社外秘情報、宣伝、荒らしは禁止です。</p>
        </article>
        <article>
          <Scale size={22} />
          <h2>編集判断</h2>
          <p>編集者は重複整理、通報対応、推奨訳の設定、非推奨理由の記録を行います。判断理由は変更履歴に残します。</p>
        </article>
      </section>

      <div className="document-links">
        <Link href="/legal/terms" className="text-link">利用規約</Link>
        <Link href="/legal/privacy" className="text-link">プライバシー</Link>
      </div>
    </div>
  );
}
