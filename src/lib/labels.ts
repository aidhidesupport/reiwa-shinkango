export const EVALUATION_LABEL_IDS = [
  "natural",
  "clear",
  "concise",
  "accurate",
  "document_friendly",
  "conversation_friendly",
  "too_stiff",
  "too_long",
  "meaning_shift",
  "old_fashioned",
  "too_coined",
] as const;

export type EvaluationLabelId = (typeof EVALUATION_LABEL_IDS)[number];

export type EvaluationLabel = {
  id: EvaluationLabelId;
  label: string;
  description: string;
};

export type EvaluationLabelGroup = {
  id: "strength" | "caution";
  label: string;
  description: string;
  labels: readonly EvaluationLabel[];
};

export const EVALUATION_LABEL_GROUPS = [
  {
    id: "strength",
    label: "良いところ",
    description: "この日本語案を使いやすくしている特徴",
    labels: [
      { id: "natural", label: "自然", description: "文章の中で不自然さなく使える" },
      { id: "clear", label: "分かりやすい", description: "初めて読む人にも意味が伝わりやすい" },
      { id: "concise", label: "短い", description: "元の言葉を簡潔に言い換えられる" },
      { id: "accurate", label: "意味が正確", description: "元の言葉が持つ意味を保っている" },
      { id: "document_friendly", label: "文書向き", description: "資料や公的な文章に使いやすい" },
      { id: "conversation_friendly", label: "会話向き", description: "日常の会話で口にしやすい" },
    ],
  },
  {
    id: "caution",
    label: "注意点",
    description: "使う場面を選ぶ可能性がある特徴",
    labels: [
      { id: "too_stiff", label: "堅い", description: "日常の場面では改まりすぎて聞こえる" },
      { id: "too_long", label: "長い", description: "元の言葉より文章が長くなりやすい" },
      { id: "meaning_shift", label: "意味がずれる", description: "文脈によって元の意味を保てない" },
      { id: "old_fashioned", label: "古くさい", description: "現代の文章では古めかしく聞こえる" },
      { id: "too_coined", label: "造語感が強い", description: "説明なしでは意味を想像しにくい" },
    ],
  },
] as const satisfies readonly EvaluationLabelGroup[];

export const EVALUATION_LABELS: readonly EvaluationLabel[] = [
  ...EVALUATION_LABEL_GROUPS[0].labels,
  ...EVALUATION_LABEL_GROUPS[1].labels,
];

export const RECOMMENDATION_LEVELS = [
  { id: "tentative", label: "暫定推奨", description: "有力だが、追加の評価や確認が必要" },
  { id: "recommended", label: "推奨", description: "示した場面で基本的に勧められる" },
  { id: "limited", label: "限定推奨", description: "特定の分野や場面に限って勧められる" },
  { id: "discouraged", label: "非推奨", description: "意味や使いやすさの問題から使用を勧めない" },
] as const;

export const REGISTERS = [
  { id: "casual", label: "会話" },
  { id: "neutral", label: "標準" },
  { id: "formal", label: "文書" },
  { id: "technical", label: "専門" },
  { id: "official", label: "公用" },
] as const;
