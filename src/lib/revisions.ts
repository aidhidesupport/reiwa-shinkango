type JsonObject = Record<string, unknown>;

export type RevisionFieldDiff = {
  key: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
};

export type RevisionFormatOptions = {
  entityType?: string;
  domainNames?: ReadonlyMap<string, string>;
};

const entityLabels: Record<string, string> = {
  term: "項目",
  sense: "使われ方",
  proposal: "日本語案",
  example: "使用例",
  comment: "コメント",
  recommendation: "推奨判断",
  user: "利用者",
};

const fieldLabels: Record<string, string> = {
  headword: "言葉",
  summary: "概要",
  firstSense: "最初の使われ方",
  firstSenseDomainId: "最初の使われ方の分野",
  firstSenseTags: "最初の使われ方のタグ",
  firstProposal: "最初の日本語案",
  title: "見出し",
  description: "説明",
  usageNote: "用法メモ",
  domainId: "分野",
  tags: "タグ",
  text: "日本語案",
  fitContext: "よく合う場面",
  unfitContext: "避けたい場面",
  rationale: "理由・判断根拠",
  pros: "良い点",
  cons: "弱い点",
  register: "文体",
  originalSentence: "元の文",
  rewrittenSentence: "言い換えた文",
  contextNote: "例文の場面・補足",
  level: "推奨レベル",
  context: "推奨する場面",
  status: "公開・検討状態",
  mergedSource: "統合元の項目",
  senseCount: "使われ方の件数",
  proposalCount: "日本語案の件数",
  exampleCount: "使用例の件数",
  displayName: "表示名",
  handle: "ハンドル",
  accountStatus: "アカウント状態",
  passwordResetRequired: "次回ログイン時のパスワード変更",
  value: "内容",
};

const valueLabels: Record<string, string> = {
  draft: "草案",
  active: "公開中・検討中",
  published: "公開中",
  hidden: "非公開",
  tentative: "暫定推奨",
  recommended: "推奨",
  limited: "限定推奨",
  discouraged: "非推奨",
  casual: "会話",
  neutral: "標準",
  formal: "文書",
  technical: "専門",
  official: "公用",
  deleted: "削除済み",
};

function parseJsonObject(value: string | null | undefined): JsonObject | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
    return { value: parsed };
  } catch {
    return { value };
  }
}

export function revisionEntityLabel(entityType: string) {
  return entityLabels[entityType] ?? "変更対象";
}

export function revisionFieldLabel(key: string) {
  return fieldLabels[key] ?? "その他の項目";
}

function formattedScalar(key: string, value: string | number | boolean, options: RevisionFormatOptions) {
  if (typeof value === "boolean") return value ? "必要" : "不要";
  if (typeof value === "number") return value.toLocaleString("ja-JP");
  if (
    typeof value === "string"
    && (key === "domainId" || key === "firstSenseDomainId")
    && options.domainNames
  ) {
    return options.domainNames.get(value) ?? "設定済みの分野";
  }
  if (key.endsWith("Id")) return "参照先を設定";
  return valueLabels[value] ?? value;
}

export function formatRevisionValue(
  key: string,
  value: unknown,
  options: RevisionFormatOptions = {},
): string {
  if (value === undefined || value === null || value === "") return "なし";
  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map((item) => formatRevisionValue(key, item, options)).join("、")
      : "なし";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return formattedScalar(key, value, options);
  }
  if (typeof value === "object") {
    return Object.entries(value as JsonObject)
      .map(([nestedKey, nestedValue]) =>
        `${revisionFieldLabel(nestedKey)}: ${formatRevisionValue(nestedKey, nestedValue, options)}`)
      .join("／");
  }
  return String(value);
}

export function diffRevisionJson(
  beforeJson: string | null | undefined,
  afterJson: string,
  options: RevisionFormatOptions = {},
) {
  const before = parseJsonObject(beforeJson);
  const after = parseJsonObject(afterJson) ?? {};
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after)]));

  return keys.map((key) => {
    const beforeText = formatRevisionValue(key, before?.[key], options);
    const afterText = formatRevisionValue(key, after[key], options);
    return {
      key,
      label: revisionFieldLabel(key),
      before: beforeText,
      after: afterText,
      changed: beforeText !== afterText,
    } satisfies RevisionFieldDiff;
  });
}
