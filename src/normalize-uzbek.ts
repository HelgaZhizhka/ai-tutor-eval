/**
 * Uzbek Latin text can contain visually similar apostrophes with different
 * Unicode code points. Canonicalise them before matching answer-leakage terms.
 */
const APOSTROPHE_VARIANTS = /[\u02BB\u02BC\u2018\u2019\u0060\u00B4]/gu;

export function normalizeUzbekLatin(value: string): string {
  return value.normalize("NFC").replace(APOSTROPHE_VARIANTS, "'");
}

export function containsCyrillic(value: string): boolean {
  return /[\u0400-\u052F]/u.test(value);
}

/**
 * Count sentence-ending punctuation without treating a decimal separator in
 * `0.77` or `0,77` as the end of a sentence. Math replies commonly contain
 * decimal examples, so the earlier plain split(/[.!?]+/) rule produced false
 * response-length failures.
 */
export function countSentences(value: string): number {
  return value
    .split(/(?<!\d)[.!?]+|[.!?]+(?!\d)/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .length;
}
