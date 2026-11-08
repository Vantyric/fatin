/**
 * Advanced normalization and de-obfuscation pipeline for Fatin.
 * Handles:
 * 1. Zero-width and Bidi control characters stripping
 * 2. Unification of Arabic, Kurdish (Sorani), and Persian characters
 * 3. Collapsing spaced-out letters ("ر م ز" -> "رمز", "a p k" -> "apk")
 * 4. Homoglyphs & Leetspeak normalization
 * 5. Arabizi (Franco-Arabic) transliteration for common fraud keywords
 * 6. Digit conversion (Western, Arabic-Indic, Eastern-Arabic)
 */

import { convertDigitsToWestern } from "./normalize";

// Comprehensive invisible and Bidi control character regex
const INVISIBLE_BIDI_REGEX =
  /[\u200B-\u200F\uFEFF\u202A-\u202E\u2060-\u2069\u00AD\u061C\u2000-\u200A\u202F\u205F\u3000]/g;

// Cyrillic and Greek lookalikes mapped to Latin
const HOMOGLYPHS_MAP: Record<string, string> = {
  // Lowercase Cyrillic
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  і: "i",
  ј: "j",
  ѕ: "s",
  // Uppercase Cyrillic
  А: "A",
  В: "B",
  С: "C",
  Е: "E",
  Н: "H",
  І: "I",
  Ј: "J",
  К: "K",
  М: "M",
  О: "O",
  Р: "P",
  Т: "T",
  Х: "X",
  // Greek lookalikes
  α: "a",
  β: "b",
  ε: "e",
  ι: "i",
  κ: "k",
  ν: "v",
  ο: "o",
  ρ: "p",
  τ: "t",
  υ: "u",
  χ: "x",
  ω: "w",
};

// Kurdish Sorani and Persian letter normalization for fraud matching
const KURDISH_PERSIAN_MAP: Record<string, string> = {
  گ: "ك",
  چ: "ج",
  پ: "ب",
  ژ: "ز",
  ڤ: "ف",
  ۆ: "و",
  ێ: "ي",
  ە: "ه",
  ڵ: "ل",
  ڕ: "ر",
  ک: "ك",
  ی: "ي",
  ى: "ي",
};

// Common Arabizi (Franco-Arabic) fraud vocabulary mapped to Arabic
const ARABIZI_TERMS: Record<string, string> = {
  mabrook: "مبروك",
  mabrouk: "مبروك",
  mbark: "مبروك",
  rba7t: "ربحت",
  rbe7t: "ربحت",
  fuzt: "فزت",
  fozt: "فزت",
  "7sab": "حساب",
  "7sabak": "حسابك",
  "7esab": "حساب",
  "7esabak": "حسابك",
  rasid: "رصيد",
  raseed: "رصيد",
  floos: "فلوس",
  flous: "فلوس",
  amwal: "اموال",
  rabit: "رابط",
  rabet: "رابط",
  link: "رابط",
  ramz: "رمز",
  kood: "كود",
  code: "كود",
  otp: "رمز التحقق",
  tasjeel: "تسجيل",
  tasjil: "تسجيل",
  ta7deeth: "تحديث",
  ta7dith: "تحديث",
  ta3leeq: "تعليق",
  ta3liq: "تعليق",
  zain: "زين",
  asiacell: "اسياسيل",
  korek: "كورك",
  qicard: "كي كارد",
  zaincash: "زين كاش",
  wazaef: "وظائف",
  wazifa: "وظيفة",
  shoghol: "شغل",
  arba7: "ارباح",
  malyoon: "مليون",
  alf: "الف",
};

/**
 * Strips all zero-width, invisible, and bidirectional override characters.
 */
export function stripInvisibleAndBidi(text: string): string {
  if (!text) return "";
  return text.replace(INVISIBLE_BIDI_REGEX, "");
}

/**
 * Maps Cyrillic and Greek homoglyphs to their Latin equivalents.
 */
export function normalizeHomoglyphs(text: string): string {
  if (!text) return "";
  return text.replace(/[\u0400-\u04FF\u0370-\u03FF]/g, (char) => HOMOGLYPHS_MAP[char] || char);
}

/**
 * Collapses deliberately spaced-out letters intended to evade keyword filters:
 * e.g. "ر م ز" -> "رمز", "و ا ت س ا ب" -> "واتساب", "a p k" -> "apk"
 */
export function collapseSpacedOutLetters(text: string): string {
  if (!text) return "";

  let result = text;

  // Collapse Arabic spaced letters (3 or more single Arabic letters separated by spaces or punctuation)
  // e.g. "ر م ز" or "ك و د" or "و ا ت س ا ب"
  const arabicSpacedRegex = /(?:^|\s)([\u0600-\u06FF](?:[\s_.\-·•]+[\u0600-\u06FF]){2,})(?=\s|$|[.,!?;:])/g;
  result = result.replace(arabicSpacedRegex, (match, group) => {
    const collapsed = group.replace(/[\s_.\-·•]+/g, "");
    return match.replace(group, collapsed);
  });

  // Also collapse common 2-letter words like "ك د" if isolated
  result = result.replace(/(?:^|\s)(ك[\s_.\-·•]+د|ر[\s_.\-·•]+م)(?=\s|$)/g, (match) => {
    return match.replace(/[\s_.\-·•]+/g, "");
  });

  // Collapse Latin spaced letters (e.g. "a p k", "a n y d e s k", "o t p")
  const latinSpacedRegex = /(?:^|\s)([a-zA-Z](?:[\s_.\-·•]+[a-zA-Z]){2,})(?=\s|$|[.,!?;:])/g;
  result = result.replace(latinSpacedRegex, (match, group) => {
    const collapsed = group.replace(/[\s_.\-·•]+/g, "");
    return match.replace(group, collapsed);
  });

  return result;
}

/**
 * Decodes leetspeak embedded in Latin tokens (e.g. "z41n" -> "zain", "p4ssw0rd" -> "password").
 */
export function decodeLeetspeak(text: string): string {
  if (!text) return "";

  // Replace numbers inside alphabetic words
  return text.replace(/\b[a-zA-Z0-9@$]{3,}\b/g, (word) => {
    // Only transform if word contains both letters and digits/symbols
    if (!/[a-zA-Z]/.test(word) || !/[0-9@$]/.test(word)) {
      return word;
    }

    const decoded = word
      .replace(/0/g, "o")
      .replace(/1/g, "i")
      .replace(/3/g, "e")
      .replace(/4/g, "a")
      .replace(/5/g, "s")
      .replace(/7/g, "t")
      .replace(/@/g, "a")
      .replace(/\$/g, "s");

    return decoded;
  });
}

/**
 * Normalizes Kurdish Sorani and Persian characters to unified Arabic for consistent matching.
 */
export function normalizeKurdishAndPersian(text: string): string {
  if (!text) return "";
  return text.replace(/[گچپژڤۆێەڵڕکیى]/g, (char) => KURDISH_PERSIAN_MAP[char] || char);
}

/**
 * Translates common Arabizi (Franco-Arabic) fraud terms into Arabic.
 */
export function normalizeArabizi(text: string): string {
  if (!text) return "";

  return text.replace(/\b[a-zA-Z2356789]{2,}\b/g, (token) => {
    const lower = token.toLowerCase();
    if (ARABIZI_TERMS[lower]) {
      return ARABIZI_TERMS[lower];
    }
    return token;
  });
}

/**
 * Full advanced de-obfuscation and normalization pipeline:
 * 1. Strips invisible & Bidi control characters
 * 2. Maps homoglyphs (Cyrillic/Greek to Latin)
 * 3. Decodes leetspeak
 * 4. Collapses spaced-out letters
 * 5. Normalizes Kurdish and Persian variants
 * 6. Converts digits to Western
 * 7. Strips tashkeel and tatweel
 * 8. Unifies Alef, Ya, Ta Marbuta
 * 9. Normalizes Arabizi terms
 */
export function deobfuscateAndNormalize(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Strip invisible & Bidi overrides
  result = stripInvisibleAndBidi(result);

  // 2. Homoglyphs
  result = normalizeHomoglyphs(result);

  // 3. Leetspeak
  result = decodeLeetspeak(result);

  // 4. Collapse spaced-out letters
  result = collapseSpacedOutLetters(result);

  // 5. Convert digits to Western
  result = convertDigitsToWestern(result);

  // 6. Kurdish & Persian
  result = normalizeKurdishAndPersian(result);

  // 7. Strip diacritics & tatweel
  result = result.replace(/[\u064B-\u065F\u0670\u0640]/g, "");

  // 8. Unify Alef & Ta Marbuta
  result = result.replace(/[إأآٱ]/g, "ا").replace(/ة/g, "ه");

  // 9. Unify Ya
  result = result.replace(/[ىي]/g, "ي");

  // 10. Arabizi vocabulary expansion
  result = normalizeArabizi(result);

  // 11. Normalize whitespace
  result = result.replace(/\s+/g, " ").trim();

  return result;
}
