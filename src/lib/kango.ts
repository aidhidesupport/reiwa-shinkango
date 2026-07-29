const KANJI_ONLY_PATTERN = /^[\p{Script=Han}々〆ヶ]+$/u;

export const KANGO_PROPOSAL_ERROR =
  "日本語案は、漢字だけで表記する漢語を入力してください。";

export function isKangoProposalText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 && KANJI_ONLY_PATTERN.test(normalized);
}
