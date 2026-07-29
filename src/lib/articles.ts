export type FeatureArticle = {
  slug: string;
  href: string;
  publishedAt: string;
  publishedLabel: string;
  series: string;
  title: string;
  summary: string;
  cta: string;
  previewItems: string[];
  topics: string[];
};

export const featureArticles: FeatureArticle[] = [
  {
    slug: "engagement",
    href: "/features/engagement",
    publishedAt: "2026-07-28",
    publishedLabel: "2026年7月28日",
    series: "今日の横文字",
    title: "「エンゲージメントを高める」って、結局どういうこと？",
    summary: "SNSでは、いいねやコメント。職場では、仕事への意欲や会社への愛着。ひとつの言葉に詰め込まれた違いを、普段の日本語でほどきます。",
    cta: "中身を確かめる",
    previewItems: [
      "投稿 → いいねやコメント",
      "仕事 → 意欲や働きがい",
      "会社 → 愛着や信頼",
    ],
    topics: ["言い換え", "組織", "分析"],
  },
  {
    slug: "sanpu",
    href: "/features/sanpu",
    publishedAt: "2026-07-27",
    publishedLabel: "2026年7月27日",
    series: "今週の新漢語・第一回",
    title: "「算譜」を、もう一度使える言葉にできるか。",
    summary: "かつてプログラムの訳語として使われた「算譜」。作譜、算譜師、算譜言語、試譜まで、五つの関連語を文章の中で試します。",
    cta: "算譜語群を読む",
    previewItems: [
      "プログラム → 算譜",
      "プログラミング → 作譜",
      "テストプログラム → 試譜",
    ],
    topics: ["新漢語", "語族", "プログラミング"],
  },
];
