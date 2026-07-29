import Link from "next/link";
import { BookOpenCheck, CheckCircle2, Scale, ShieldAlert } from "lucide-react";
import { getPublicPolicyConfig } from "@/lib/public-config";

export const metadata = {
  title: "投稿ルール",
};

export default function RulesPage() {
  const { contactEmail, licenseLabel } = getPublicPolicyConfig();
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
          <p>日本語案は、漢字音を組み合わせた漢語に限ります。よく合う場面、弱い点、元の文と言い換えた文も添えてください。</p>
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
          <p>編集者は修正提案、重複整理、通報対応、推奨する日本語案の設定、非推奨理由の記録を行います。直接編集や差し戻しの理由は変更履歴に残します。</p>
        </article>
      </section>

      <div className="note-box">
        <strong>投稿データと申告窓口</strong>
        <p>現在の投稿データ方針は「{licenseLabel}」です。削除依頼、権利侵害、個人情報に関する申告は <a href={`mailto:${contactEmail}`}>{contactEmail}</a> へ、対象URLと理由を添えて連絡してください。</p>
      </div>

      <div className="document-links">
        <Link href="/rules/classification" className="text-link">分野・タグの分類ルール</Link>
        <Link href="/rules/permissions" className="text-link">役割と権限</Link>
        <Link href="/legal/terms" className="text-link">利用規約</Link>
        <Link href="/legal/privacy" className="text-link">プライバシー</Link>
      </div>
    </div>
  );
}
