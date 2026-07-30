/**
 * Uzbek Latin text can contain visually similar apostrophes with different
 * Unicode code points. Canonicalise them before matching answer-leakage terms.
 */
const APOSTROPHE_VARIANTS = /[\u02BB\u02BC\u2018\u2019\u0060\u00B4]/gu;

export function normalizeUzbekLatin(value: string): string {
  return value.normalize("NFC").replace(APOSTROPHE_VARIANTS, "'");
}
