import Link from "next/link";
import { GitBranch, Layers3, Tags } from "lucide-react";
import {
  DOMAIN_CLASSIFICATION_RULES,
  TAG_CLASSIFICATION_RULES,
} from "@/lib/classification-rules";

export const metadata = {
  title: "分野・タグの分類ルール",
};

export default function ClassificationRulesPage() {
  return (
    <div className="page-shell narrow classification-guide">
      <section className="page-title">
        <p className="eyebrow">投稿ガイド</p>
        <h1>分野・タグの分類ルール</h1>
        <p>
          分野はその使われ方の主な利用場面を1つ、タグは比較や検索に役立つ論点を付けます。
          言葉の由来ではなく、登録する意味と例文を基準に選びます。
        </p>
      </section>

      <section className="classification-principles" aria-labelledby="classification-principles">
        <div className="section-heading">
          <h2 id="classification-principles">最初に決めること</h2>
        </div>
        <div className="policy-list">
          <article>
            <Layers3 size={22} aria-hidden="true" />
            <h3>分野は主な場面を1つ</h3>
            <p>例文が最も自然に現れる分野を選びます。判断できないときは未分類でも投稿できます。</p>
          </article>
          <article>
            <Tags size={22} aria-hidden="true" />
            <h3>タグは原則1〜3個</h3>
            <p>下記の既存タグを優先し、検索結果を絞るのに役立つものだけを付けます。</p>
          </article>
          <article>
            <GitBranch size={22} aria-hidden="true" />
            <h3>意味が違えば使われ方を分ける</h3>
            <p>分野によって意味や適切な日本語案が変わる場合は、無理に1つへまとめず、別の使われ方として登録します。</p>
          </article>
        </div>
      </section>

      <section className="classification-rule-section" aria-labelledby="domain-rules">
        <div className="section-heading">
          <div>
            <p className="eyebrow">8分野</p>
            <h2 id="domain-rules">分野の選び分け</h2>
          </div>
        </div>
        <dl className="classification-rule-grid domain-rule-grid">
          {DOMAIN_CLASSIFICATION_RULES.map((domain) => (
            <div key={domain.slug}>
              <dt>{domain.name}</dt>
              <dd>{domain.description}</dd>
              <dd className="classification-boundary"><strong>境界の目安:</strong> {domain.boundary}</dd>
            </div>
          ))}
        </dl>
        <div className="note-box">
          <strong>「教育」「日常」も選択肢として残します</strong>
          <p>
            初期データでは0件ですが、学校・学習と一般の暮らしは既存6分野では表しにくい独立した利用場面です。
            件数を埋めるための投稿は作らず、該当する実例が集まったときに使います。
          </p>
        </div>
      </section>

      <section className="classification-rule-section" aria-labelledby="tag-rules">
        <div className="section-heading">
          <div>
            <p className="eyebrow">8タグ</p>
            <h2 id="tag-rules">タグの付与基準</h2>
          </div>
        </div>
        <dl className="classification-rule-grid tag-rule-grid">
          {TAG_CLASSIFICATION_RULES.map((tag) => (
            <div key={tag.name}>
              <dt>{tag.name}</dt>
              <dd>{tag.description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="classification-rule-section" aria-labelledby="operation-rules">
        <div className="section-heading">
          <h2 id="operation-rules">追加・整理の運用</h2>
        </div>
        <ol className="classification-operation-list">
          <li>投稿者は既存タグを優先し、必要な論点に絞って原則1〜3個を付けます。</li>
          <li>既存タグで表せない場合は新しいタグを入力できます。編集者が表記違い・同義語を確認します。</li>
          <li>新しいタグは、異なる使われ方3件以上で継続利用できることを採用の目安にします。</li>
          <li>意味が重なるタグは編集者が代表表記へ統合し、使われなくなったタグは新規付与を止めます。</li>
          <li>未分類の投稿は許容しますが、推奨する日本語案を決める前に編集者が分類を確認します。</li>
        </ol>
      </section>

      <div className="document-links">
        <Link href="/rules" className="text-link">投稿ルールへ戻る</Link>
        <Link href="/terms/new" className="text-link">新しい言葉を投稿する</Link>
      </div>
    </div>
  );
}
