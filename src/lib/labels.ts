export const EVALUATION_LABELS = [
  { id: "natural", label: "自然" },
  { id: "clear", label: "分かりやすい" },
  { id: "concise", label: "短い" },
  { id: "accurate", label: "意味が正確" },
  { id: "document_friendly", label: "文書向き" },
  { id: "conversation_friendly", label: "会話向き" },
  { id: "too_stiff", label: "堅い" },
  { id: "too_long", label: "長い" },
  { id: "meaning_shift", label: "意味がずれる" },
  { id: "old_fashioned", label: "古くさい" },
  { id: "too_coined", label: "造語感が強い" },
] as const;

export const RECOMMENDATION_LEVELS = [
  { id: "tentative", label: "暫定推奨" },
  { id: "recommended", label: "推奨" },
  { id: "limited", label: "限定推奨" },
  { id: "discouraged", label: "非推奨" },
] as const;

export const REGISTERS = [
  { id: "casual", label: "会話" },
  { id: "neutral", label: "標準" },
  { id: "formal", label: "文書" },
  { id: "technical", label: "専門" },
  { id: "official", label: "公用" },
] as const;
