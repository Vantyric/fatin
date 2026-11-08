/**
 * Arabic text normalization utilities for Fatin fraud detection engine.
 * Strips diacritics, unifies letter variants, converts Arabic-Indic digits to Western,
 * and handles common spacing irregularities.
 */

const ARABIC_INDIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

export function convertDigitsToWestern(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_INDIC_DIGITS[digit] || digit);
}

export function normalizeArabic(text: string): string {
  if (!text) return "";

  let result = text;

  // Convert Arabic-Indic and Eastern-Arabic digits to Western (0-9)
  result = convertDigitsToWestern(result);

  // Strip tashkeel (diacritics) & Quranic symbols: \u064B-\u065F, \u0670
  result = result.replace(/[\u064B-\u065F\u0670]/g, "");

  // Strip tatweel / kashida (\u0640)
  result = result.replace(/\u0640/g, "");

  // Unify alef variants (أ, إ, آ, ٱ -> ا)
  result = result.replace(/[إأآٱ]/g, "ا");

  // Unify ya variants (ى, ي, ی -> ي)
  result = result.replace(/[ىيى]/g, "ي");

  // Unify ta marbuta (ة -> ه) for flexible keyword matching
  result = result.replace(/ة/g, "ه");

  // Unify kaf (ك, ک -> ك)
  result = result.replace(/ک/g, "ك");

  // Unify zero-width spaces & non-breaking spaces
  result = result.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ");

  // Normalize whitespace to single spaces
  result = result.replace(/\s+/g, " ").trim();

  return result;
}
