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
    title: "「エンゲージメント」は、なぜ一語で訳せないのか。",
    summary: "投稿への反応と、社員の働きがいは同じものではありません。何を測り、何を良くしたいのかによって、四つの日本語に言い分けます。",
    cta: "言い分けを読む",
    previewItems: [
      "投稿 → 反応度",
      "社員 → 働きがい",
      "組織 → 組織への愛着",
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
