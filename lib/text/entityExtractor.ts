/**
 * Comprehensive Entity Extractor for Fatin Scam Analysis Engine.
 * Extracts structured entities BEFORE sensitive data masking:
 * - Phone numbers (with libphonenumber-js: country, type, Iraq brand contradiction)
 * - Claimed brands & institutions (Telecom, Banks, Wallets, Platforms, Government)
 * - Dangerous file types (.apk, .exe, etc.)
 * - Remote access tools (AnyDesk, TeamViewer, RustDesk, etc.)
 * - USSD call-forwarding codes (*21*, *401*, ##002#, etc.)
 * - QR code mentions
 * - URLs and domains
 */

import { findPhoneNumbersInText, parsePhoneNumberFromString } from "libphonenumber-js";
import { extractUrlsFromText } from "../url/analyzer";

export interface ExtractedPhoneNumber {
  raw: string;
  e164?: string;
  country?: string;
  type?: string;
  isIraqi: boolean;
  contradictsClaimedBrand?: boolean;
}

export interface ClaimedBrand {
  name: string;
  nameAr: string;
  category: "telecom" | "bank_wallet" | "platform" | "delivery" | "government" | "other";
  isIraqi: boolean;
}

export interface ExtractedEntities {
  urls: string[];
  domains: string[];
  phoneNumbers: ExtractedPhoneNumber[];
  claimedBrands: ClaimedBrand[];
  hasCountryBrandContradiction: boolean;
  dangerousFileTypes: string[];
  remoteAccessApps: string[];
  ussdCodes: string[];
  qrMentions: string[];
  hasVerificationCode: boolean;
}

// Known brand definitions
const KNOWN_BRANDS: Array<{
  regex: RegExp;
  name: string;
  nameAr: string;
  category: ClaimedBrand["category"];
  isIraqi: boolean;
}> = [
  // Iraqi Telecoms
  { regex: /(?:زين\s*العراق|شركة\s*زين|خط\s*زين|\bzain\b)/i, name: "Zain Iraq", nameAr: "زين العراق", category: "telecom", isIraqi: true },
  { regex: /(?:اسياسيل|اسيا\s*سيل|شركة\s*اسيا|\basiacell\b)/i, name: "Asiacell", nameAr: "آسياسيل", category: "telecom", isIraqi: true },
  { regex: /(?:كورك\s*تيليكوم|كورك|\bkorek\b)/i, name: "Korek", nameAr: "كورك تيليكوم", category: "telecom", isIraqi: true },

  // Iraqi Banks & Wallets
  { regex: /(?:كي\s*كارد|كي\s*كارت|بطاقة\s*كي|\bqi\s*card\b|\bqi\b)/i, name: "Qi Card", nameAr: "كي كارد", category: "bank_wallet", isIraqi: true },
  { regex: /(?:زين\s*كاش|محفظة\s*زين|\bzaincash\b|\bzain\s*cash\b)/i, name: "ZainCash", nameAr: "زين كاش", category: "bank_wallet", isIraqi: true },
  { regex: /(?:المصرف\s*العراقي\s*للتجارة|\btbi\b)/i, name: "Trade Bank of Iraq", nameAr: "المصرف العراقي للتجارة", category: "bank_wallet", isIraqi: true },
  { regex: /(?:مصرف\s*الرافدين|بنك\s*الرافدين|\brafidain\b)/i, name: "Rafidain Bank", nameAr: "مصرف الرافدين", category: "bank_wallet", isIraqi: true },
  { regex: /(?:مصرف\s*الرشيد|بنك\s*الرشيد|\brasheed\b)/i, name: "Rasheed Bank", nameAr: "مصرف الرشيد", category: "bank_wallet", isIraqi: true },
  { regex: /(?:المصرف\s*العراقي\s*الاول|\bfib\b)/i, name: "First Iraqi Bank", nameAr: "المصرف العراقي الأول", category: "bank_wallet", isIraqi: true },

  // Global Platforms
  { regex: /(?:واتساب|الواتساب|\bwhatsapp\b)/i, name: "WhatsApp", nameAr: "واتساب", category: "platform", isIraqi: false },
  { regex: /(?:تليجرام|تيليجرام|\btelegram\b)/i, name: "Telegram", nameAr: "تيليجرام", category: "platform", isIraqi: false },
  { regex: /(?:فيسبوك|فيس\s*بوك|\bfacebook\b)/i, name: "Facebook", nameAr: "فيسبوك", category: "platform", isIraqi: false },
  { regex: /(?:انستغرام|انستقرام|\binstagram\b)/i, name: "Instagram", nameAr: "إنستغرام", category: "platform", isIraqi: false },
  { regex: /(?:تيك\s*توك|\btiktok\b)/i, name: "TikTok", nameAr: "تيك توك", category: "platform", isIraqi: false },

  // Delivery & Logistics
  { regex: /(?:دي\s*اتش\s*ال|\bdhl\b)/i, name: "DHL", nameAr: "دي إتش إل", category: "delivery", isIraqi: false },
  { regex: /(?:ارامكس|\baramex\b)/i, name: "Aramex", nameAr: "أرامكس", category: "delivery", isIraqi: false },
  { regex: /(?:البريد\s*العراقي)/i, name: "Iraqi Post", nameAr: "البريد العراقي", category: "delivery", isIraqi: true },

  // Government & Official Agencies
  { regex: /(?:مكافحة\s*الاجرام|مكافحة\s*الجرائم\s*الالكترونية|مديرية\s*الامن)/i, name: "Cybercrime Directorate", nameAr: "مكافحة الجرائم الإلكترونية", category: "government", isIraqi: true },
  { regex: /(?:الرعاية\s*الاجتماعية|وزارة\s*العمل|منحة\s*الطوارئ)/i, name: "Social Care / Ministry", nameAr: "الرعاية الاجتماعية", category: "government", isIraqi: true },
  { regex: /(?:هيئة\s*التقاعد|رواتب\s*المتقاعدين)/i, name: "Retirement Commission", nameAr: "هيئة التقاعد", category: "government", isIraqi: true },
];

// Dangerous file extensions and installer mentions
const DANGEROUS_FILE_REGEX = /\b[\w-]+\.(apk|exe|scr|bat|vbs|iso|msi|cmd|pif|jar)\b/gi;
const APK_APP_TERMS = /(?:تثبيت\s*التطبيق|حمل\s*التطبيق|ملف\s*التحديث|تحديث\s*البرنامج|تطبيق\s*جديد|رابط\s*البرنامج)\s*.*(?:\.apk|\bapk\b|تثبيت)/gi;

// Remote access apps (AnyDesk, TeamViewer, RustDesk, etc.)
const REMOTE_ACCESS_APPS = [
  { name: "AnyDesk", regex: /(?:اني\s*ديسك|انيديسك|\banydesk\b)/i },
  { name: "TeamViewer", regex: /(?:تيم\s*فيور|تيمفيور|\bteamviewer\b)/i },
  { name: "RustDesk", regex: /(?:رست\s*ديسك|\brustdesk\b)/i },
  { name: "QuickSupport", regex: /(?:كويك\s*سبورت|\bquicksupport\b)/i },
  { name: "UltraViewer", regex: /(?:الترا\s*فيور|\bultraviewer\b)/i },
];

// USSD call-forwarding codes (*21*, *401*, ##002#, etc.)
const USSD_CODE_REGEX = /(?:\*|#){1,3}(?:21|401|67|61|62|002)(?:\*|#)[0-9*#]+/g;

// QR Code mentions
const QR_CODE_REGEX = /(?:امسح\s*(?:الرمز|الكود|الباركود)|رمز\s*الاستجابة\s*السريعة|سكان\s*(?:للكود|للرمز)|\bqr\s*code\b|\bscan\s*qr\b|كود\s*qr)/gi;

// Verification code keywords
const VERIFICATION_CODE_REGEX = /(?:رمز|كود|تحقق|تفعيل|تأكيد|otp|pin|verification\s*code|security\s*code)/i;

/**
 * Extracts structured entities from raw input text.
 */
export function extractEntities(text: string): ExtractedEntities {
  if (!text || text.trim().length === 0) {
    return {
      urls: [],
      domains: [],
      phoneNumbers: [],
      claimedBrands: [],
      hasCountryBrandContradiction: false,
      dangerousFileTypes: [],
      remoteAccessApps: [],
      ussdCodes: [],
      qrMentions: [],
      hasVerificationCode: false,
    };
  }

  // 1. URLs and Domains
  const urls = extractUrlsFromText(text);
  const domains: string[] = [];
  for (const urlStr of urls) {
    try {
      const parsed = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
      if (parsed.hostname && !domains.includes(parsed.hostname.toLowerCase())) {
        domains.push(parsed.hostname.toLowerCase());
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  // 2. Claimed Brands
  const claimedBrands: ClaimedBrand[] = [];
  for (const brand of KNOWN_BRANDS) {
    if (brand.regex.test(text)) {
      if (!claimedBrands.some((b) => b.name === brand.name)) {
        claimedBrands.push({
          name: brand.name,
          nameAr: brand.nameAr,
          category: brand.category,
          isIraqi: brand.isIraqi,
        });
      }
    }
  }

  // 3. Phone Numbers via libphonenumber-js
  const phoneNumbers: ExtractedPhoneNumber[] = [];
  const hasIraqiBrand = claimedBrands.some((b) => b.isIraqi);

  try {
    const parsedResults = findPhoneNumbersInText(text, "IQ");
    for (const match of parsedResults) {
      const parsed = parsePhoneNumberFromString(match.number.number, match.number.country || "IQ");
      const country = parsed?.country || match.number.country;
      const isIraqi = country === "IQ";

      // Check if there is an explicit contradiction:
      // Message claims to be from an Iraqi entity (e.g. Zain Iraq, Qi Card, Rafidain)
      // but the phone number originates from a foreign country (e.g. NG, GB, US, IN)
      const contradictsClaimedBrand = hasIraqiBrand && !isIraqi;

      phoneNumbers.push({
        raw: match.number.number,
        e164: parsed?.format("E.164") || match.number.number,
        country,
        type: parsed?.getType(),
        isIraqi,
        contradictsClaimedBrand,
      });
    }
  } catch {
    // If phone parsing throws on malformed text, continue gracefully
  }

  const hasCountryBrandContradiction = phoneNumbers.some((p) => p.contradictsClaimedBrand);

  // 4. Dangerous File Types
  const dangerousFileTypes: string[] = [];
  const fileMatches = text.match(DANGEROUS_FILE_REGEX);
  if (fileMatches) {
    for (const fm of fileMatches) {
      const ext = fm.split(".").pop()?.toLowerCase();
      if (ext && !dangerousFileTypes.includes(`.${ext}`)) {
        dangerousFileTypes.push(`.${ext}`);
      }
    }
  }
  if (APK_APP_TERMS.test(text) && !dangerousFileTypes.includes(".apk")) {
    dangerousFileTypes.push(".apk");
  }

  // 5. Remote Access Apps
  const remoteAccessApps: string[] = [];
  for (const app of REMOTE_ACCESS_APPS) {
    if (app.regex.test(text)) {
      if (!remoteAccessApps.includes(app.name)) {
        remoteAccessApps.push(app.name);
      }
    }
  }

  // 6. USSD Codes
  const ussdCodes: string[] = [];
  const ussdMatches = text.match(USSD_CODE_REGEX);
  if (ussdMatches) {
    for (const u of ussdMatches) {
      if (!ussdCodes.includes(u)) {
        ussdCodes.push(u);
      }
    }
  }

  // 7. QR Mentions
  const qrMentions: string[] = [];
  const qrMatches = text.match(QR_CODE_REGEX);
  if (qrMatches) {
    for (const q of qrMatches) {
      if (!qrMentions.includes(q)) {
        qrMentions.push(q);
      }
    }
  }

  // 8. Verification Code Flag
  const hasVerificationCode = VERIFICATION_CODE_REGEX.test(text);

  return {
    urls,
    domains,
    phoneNumbers,
    claimedBrands,
    hasCountryBrandContradiction,
    dangerousFileTypes,
    remoteAccessApps,
    ussdCodes,
    qrMentions,
    hasVerificationCode,
  };
}
