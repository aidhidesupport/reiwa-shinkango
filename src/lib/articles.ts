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
    slug: "data",
    href: "/features/data",
    publishedAt: "2026-07-29",
    publishedLabel: "2026年7月29日",
    series: "今週の新漢語・第二回",
    title: "「データ」を漢字二字にできるか。",
    summary: "常用漢字二字の456万通りから、語源、意味の広さ、既存語との衝突、語族展開を順に検査し、暫定案「与象」を炙り出します。",
    cta: "絞り込みを読む",
    previewItems: [
      "4,562,496通り → 全組合せ",
      "27語 → 語源に忠実",
      "5語 → 最終候補",
      "第一候補 → 与象",
    ],
    topics: ["新漢語", "データ", "造語"],
  },
  {
    slug: "engagement",
    href: "/features/engagement",
    publishedAt: "2026-07-28",
    publishedLabel: "2026年7月28日",
    series: "今日の横文字",
    title: "「エンゲージメントを高める」って、結局どういうこと？",
    summary: "反応度、関与度、熱意度、愛着度。「エンゲージメント」に詰め込まれた違いを、四つの三字漢語に分けて考えます。",
    cta: "四つの漢語を見る",
    previewItems: [
      "投稿 → 反応度",
      "利用 → 関与度",
      "職務 → 熱意度",
      "組織 → 愛着度",
    ],
    topics: ["新漢語", "組織", "分析"],
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
