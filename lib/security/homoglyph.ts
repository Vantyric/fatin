/**
 * Advanced Homoglyph, Punycode & Confusable Domain Detector for FATIN Security.
 * Protects against Internationalized Domain Name (IDN) homoglyph spoofing,
 * mixed-script attacks, and brand typosquatting.
 */

import { domainToASCII, domainToUnicode } from "url";

// Curated dictionary of Unicode lookalikes (Cyrillic, Greek, Latin Extended) mapped to Latin ASCII
export const CONFUSABLE_HOMOGLYPHS: Record<string, string> = {
  // Cyrillic Lowercase
  "\u0430": "a", // а
  "\u0441": "c", // с
  "\u0435": "e", // е
  "\u043E": "o", // о
  "\u0440": "p", // р
  "\u0455": "s", // ѕ
  "\u0445": "x", // х
  "\u0443": "y", // у
  "\u0456": "i", // і
  "\u0458": "j", // ј
  "\u0432": "b", // в
  "\u043A": "k", // к
  "\u043C": "m", // м
  "\u043D": "h", // н
  "\u0442": "t", // т
  "\u0448": "w", // ш
  "\u045C": "k", // ќ
  "\u040D": "i", // ѝ
  "\u0501": "d", // ԁ
  "\u051B": "q", // ԛ
  "\u051D": "w", // ԝ
  "\u04CF": "l", // ӏ (palochka)

  // Cyrillic Uppercase
  "\u0410": "A", // А
  "\u0412": "B", // В
  "\u0421": "C", // С
  "\u0415": "E", // Е
  "\u041D": "H", // Н
  "\u0406": "I", // І
  "\u0408": "J", // Ј
  "\u041A": "K", // К
  "\u041C": "M", // М
  "\u041E": "O", // О
  "\u0420": "P", // Р
  "\u0405": "S", // Ѕ
  "\u0422": "T", // Т
  "\u0425": "X", // Х
  "\u04AE": "Y", // Ү

  // Greek Lowercase
  "\u03B1": "a", // α
  "\u03B2": "b", // β
  "\u03B5": "e", // ε
  "\u03B9": "i", // ι
  "\u03BA": "k", // κ
  "\u03BD": "v", // ν
  "\u03BF": "o", // ο
  "\u03C1": "p", // ρ
  "\u03C4": "t", // τ
  "\u03C5": "u", // υ
  "\u03C7": "x", // χ
  "\u03C9": "w", // ω

  // Accented & Latin Extended
  "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "ā": "a",
  "è": "e", "é": "e", "ê": "e", "ë": "e", "ē": "e",
  "ì": "i", "í": "i", "î": "i", "ï": "i", "ī": "i",
  "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ö": "o", "ō": "o",
  "ù": "u", "ú": "u", "û": "u", "ü": "u", "ū": "u",
  "ñ": "n", "ç": "c", "ý": "y", "ÿ": "y",
};

// High-Value Brand Watchlist
export interface BrandTarget {
  key: string;
  name: string;
  nameAr: string;
  officialDomains: string[];
}

export const WATCHLIST_BRANDS: BrandTarget[] = [
  { key: "google", name: "Google", nameAr: "جوجل", officialDomains: ["google.com", "accounts.google.com"] },
  { key: "apple", name: "Apple", nameAr: "آبل", officialDomains: ["apple.com", "icloud.com", "appleid.apple.com"] },
  { key: "microsoft", name: "Microsoft", nameAr: "مايكروسوفت", officialDomains: ["microsoft.com", "live.com", "office.com", "outlook.com"] },
  { key: "paypal", name: "PayPal", nameAr: "باي بال", officialDomains: ["paypal.com", "paypal.me"] },
  { key: "binance", name: "Binance", nameAr: "بينانس", officialDomains: ["binance.com"] },
  { key: "meta", name: "Meta", nameAr: "ميتا", officialDomains: ["meta.com", "facebook.com", "instagram.com"] },
  { key: "whatsapp", name: "WhatsApp", nameAr: "واتساب", officialDomains: ["whatsapp.com", "wa.me"] },
  { key: "telegram", name: "Telegram", nameAr: "تيليجرام", officialDomains: ["telegram.org", "t.me"] },
  { key: "amazon", name: "Amazon", nameAr: "أمازون", officialDomains: ["amazon.com", "amazon.ae", "amazon.sa"] },
  { key: "netflix", name: "Netflix", nameAr: "نتفليكس", officialDomains: ["netflix.com"] },
  { key: "dhl", name: "DHL", nameAr: "دي إتش إل", officialDomains: ["dhl.com", "dhl.iq"] },
  { key: "fedex", name: "FedEx", nameAr: "فيديكس", officialDomains: ["fedex.com"] },
  { key: "aramex", name: "Aramex", nameAr: "أرامكس", officialDomains: ["aramex.com"] },
  { key: "zain", name: "Zain", nameAr: "زين", officialDomains: ["zain.com", "zain.iq", "zaincash.iq"] },
  { key: "fib", name: "First Iraqi Bank", nameAr: "المصرف العراقي الأول", officialDomains: ["fib.iq"] },
  { key: "qi", name: "Qi Card", nameAr: "كي كارد", officialDomains: ["qi.iq", "qicard.net"] },
  { key: "asiacell", name: "Asiacell", nameAr: "آسياسيل", officialDomains: ["asiacell.com"] },
  { key: "korek", name: "Korek", nameAr: "كورك تيليكوم", officialDomains: ["korektelecom.com"] },
];

export interface HomoglyphAnalysisResult {
  isHomoglyph: boolean;
  hasPunycode: boolean;
  hasConfusables: boolean;
  rawInput: string;
  unicodeDomain: string;
  punycodeDomain: string;
  deconfusedDomain: string;
  detectedHomoglyphChars: string[];
  targetBrand?: BrandTarget;
  isBrandSpoofing: boolean;
  reasonAr?: string;
}

/**
 * Normalizes any domain by replacing lookalike/confusable characters with their ASCII equivalents.
 */
export function deconfuseString(str: string): { normalized: string; replacedChars: string[] } {
  let normalized = "";
  const replacedChars: string[] = [];

  for (const char of str) {
    if (CONFUSABLE_HOMOGLYPHS[char]) {
      normalized += CONFUSABLE_HOMOGLYPHS[char].toLowerCase();
      replacedChars.push(char);
    } else {
      normalized += char.toLowerCase();
    }
  }

  return { normalized, replacedChars };
}

/**
 * Inspects a domain name or URL for homoglyph characters, Punycode tricks, and brand spoofing.
 */
export function inspectHomoglyphs(domainOrUrl: string): HomoglyphAnalysisResult {
  let hostname = domainOrUrl.trim();

  // Extract hostname if a full URL was provided
  try {
    const full = hostname.startsWith("http") ? hostname : `https://${hostname}`;
    const parsed = new URL(full);
    hostname = parsed.hostname;
  } catch {
    // Treat as raw hostname/string
    hostname = hostname.replace(/^[a-zA-Z]+:\/\//, "").split("/")[0].split("?")[0];
  }

  hostname = hostname.toLowerCase().replace(/^www\./, "");

  const hasPunycode = hostname.includes("xn--");
  let unicodeDomain = hostname;
  let punycodeDomain = hostname;

  if (hasPunycode) {
    try {
      unicodeDomain = domainToUnicode(hostname);
    } catch {
      unicodeDomain = hostname;
    }
  } else {
    try {
      punycodeDomain = domainToASCII(hostname);
    } catch {
      punycodeDomain = hostname;
    }
  }

  // Check if unicodeDomain contains any confusable characters
  const { normalized: deconfusedDomain, replacedChars } = deconfuseString(unicodeDomain);
  const hasConfusables = replacedChars.length > 0;
  const isHomoglyph = hasPunycode || hasConfusables;

  // Check if deconfused domain targets any brand from our watchlist
  let targetBrand: BrandTarget | undefined;
  let isBrandSpoofing = false;
  let reasonAr: string | undefined;

  for (const brand of WATCHLIST_BRANDS) {
    // If it's the genuine official domain, it's NOT spoofing
    const isOfficial = brand.officialDomains.some(
      (od) => hostname === od || hostname.endsWith(`.${od}`)
    );
    if (isOfficial) {
      continue;
    }

    // Check if the deconfused domain matches or targets the brand
    const deconfusedRoot = deconfusedDomain.split(".")[0];
    const deconfusedFull = deconfusedDomain;

    const brandMatched =
      deconfusedRoot === brand.key ||
      deconfusedRoot.includes(brand.key) ||
      brand.officialDomains.some((od) => deconfusedFull.includes(od.split(".")[0]));

    if (brandMatched) {
      targetBrand = brand;
      isBrandSpoofing = true;

      if (isHomoglyph) {
        reasonAr = `احتيال انتحال نطاق وعلامة تجارية (Brand Spoofing / Homoglyph Attack): استخدام حروف متطابقة بصرياً (${replacedChars.join(
          "، "
        )}) لانتحال هوية (${brand.nameAr} - ${brand.name})`;
      } else {
        reasonAr = `انتحال علامة تجارية رسمية (${brand.nameAr}) في نطاق خارجي مشبوه (${hostname})`;
      }
      break;
    }
  }

  if (isHomoglyph && !reasonAr) {
    reasonAr = `يحتوي النطاق على حروف مشفرة أو متطابقة بصرياً (IDN Homoglyph / Punycode: ${punycodeDomain}) لتمويه اسم الموقع الحقيقي`;
  }

  return {
    isHomoglyph,
    hasPunycode,
    hasConfusables,
    rawInput: domainOrUrl,
    unicodeDomain,
    punycodeDomain,
    deconfusedDomain,
    detectedHomoglyphChars: Array.from(new Set(replacedChars)),
    targetBrand,
    isBrandSpoofing,
    reasonAr,
  };
}
