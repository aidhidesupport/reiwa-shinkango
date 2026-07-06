const HIRAGANA_START = 0x3041;
const HIRAGANA_END = 0x3096;
const KATAKANA_OFFSET = 0x60;

export function toKatakana(input: string) {
  return Array.from(input)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= HIRAGANA_START && code <= HIRAGANA_END) {
        return String.fromCharCode(code + KATAKANA_OFFSET);
      }
      return char;
    })
    .join("");
}

export function normalizeForSearch(input: string) {
  return toKatakana(input)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ \t\r\n\u3000・･/_‐‑‒–—―-]/g, "")
    .trim();
}

export function slugifyHeadword(input: string) {
  return normalizeForSearch(input)
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function splitLabels(labelsCsv: string | null | undefined) {
  if (!labelsCsv) return [];
  return labelsCsv
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}

export function joinLabels(labels: string[]) {
  return Array.from(new Set(labels.filter(Boolean))).sort().join(",");
}
