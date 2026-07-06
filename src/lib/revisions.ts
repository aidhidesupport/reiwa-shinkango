type JsonObject = Record<string, unknown>;

export type RevisionFieldDiff = {
  key: string;
  before: string;
  after: string;
  changed: boolean;
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

export function formatRevisionValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "なし";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function diffRevisionJson(beforeJson: string | null | undefined, afterJson: string) {
  const before = parseJsonObject(beforeJson);
  const after = parseJsonObject(afterJson) ?? {};
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after)]));

  return keys.map((key) => {
    const beforeValue = before?.[key];
    const afterValue = after[key];
    const beforeText = formatRevisionValue(beforeValue);
    const afterText = formatRevisionValue(afterValue);
    return {
      key,
      before: beforeText,
      after: afterText,
      changed: beforeText !== afterText,
    } satisfies RevisionFieldDiff;
  });
}

