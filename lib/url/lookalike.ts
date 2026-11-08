/**
 * Lookalike & Brand Impersonation Domain Detector for Fatin.
 * Protects Iraqi users against typosquatting, homoglyph attacks,
 * and subdomain spoofing targeting local telecoms, banks, wallets, and global platforms.
 */

export interface LookalikeBrand {
  brandKey: string;
  nameAr: string;
  officialDomains: string[];
}

export const MAINTAINED_BRANDS: LookalikeBrand[] = [
  // Iraqi Telecoms
  { brandKey: "zain", nameAr: "زين العراق", officialDomains: ["zain.com", "iq.zain.com", "zain.iq"] },
  { brandKey: "asiacell", nameAr: "آسياسيل", officialDomains: ["asiacell.com"] },
  { brandKey: "korek", nameAr: "كورك تيليكوم", officialDomains: ["korektelecom.com"] },

  // Iraqi Banks & Wallets
  { brandKey: "qicard", nameAr: "كي كارد", officialDomains: ["qi.iq", "qicard.net"] },
  { brandKey: "zaincash", nameAr: "زين كاش", officialDomains: ["zaincash.iq"] },
  { brandKey: "tbi", nameAr: "المصرف العراقي للتجارة", officialDomains: ["tbi.com.iq"] },
  { brandKey: "rafidain", nameAr: "مصرف الرافدين", officialDomains: ["rafidain-bank.gov.iq"] },
  { brandKey: "rasheed", nameAr: "مصرف الرشيد", officialDomains: ["rasheedbank.gov.iq"] },
  { brandKey: "fib", nameAr: "المصرف العراقي الأول", officialDomains: ["fib.iq"] },

  // Global Platforms
  { brandKey: "whatsapp", nameAr: "واتساب", officialDomains: ["whatsapp.com", "wa.me"] },
  { brandKey: "telegram", nameAr: "تيليجرام", officialDomains: ["telegram.org", "t.me"] },
  { brandKey: "facebook", nameAr: "فيسبوك", officialDomains: ["facebook.com", "fb.me", "fb.com"] },
  { brandKey: "instagram", nameAr: "إنستغرام", officialDomains: ["instagram.com"] },
  { brandKey: "dhl", nameAr: "دي إتش إل", officialDomains: ["dhl.com", "dhl.iq"] },
  { brandKey: "aramex", nameAr: "أرامكس", officialDomains: ["aramex.com"] },
];

export interface LookalikeResult {
  isLookalike: boolean;
  targetBrand?: string;
  targetBrandAr?: string;
  officialDomain?: string;
  reasonAr?: string;
  severity?: "high" | "medium";
}

/**
 * Standard Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if a parsed URL or hostname is a lookalike impersonating an official brand.
 */
export function detectLookalikeDomain(urlStringOrDomain: string): LookalikeResult {
  let hostname = urlStringOrDomain.toLowerCase().trim();
  let pathname = "";

  try {
    const fullUrl = urlStringOrDomain.startsWith("http")
      ? urlStringOrDomain
      : `https://${urlStringOrDomain}`;
    const parsed = new URL(fullUrl);
    hostname = parsed.hostname.toLowerCase();
    pathname = parsed.pathname.toLowerCase();
  } catch {
    // If not a full URL, treat as hostname
  }

  // Remove leading www.
  hostname = hostname.replace(/^www\./, "");

  // If the hostname belongs to ANY official domain in our maintained brands, it is safe
  const isAnyOfficialDomain = MAINTAINED_BRANDS.some((b) =>
    b.officialDomains.some((od) => hostname === od || hostname.endsWith(`.${od}`))
  );
  if (isAnyOfficialDomain) {
    return { isLookalike: false };
  }

  // Check each maintained brand
  for (const brand of MAINTAINED_BRANDS) {
    // 1. If it IS one of the genuine official domains, it's NOT a lookalike
    const isOfficial = brand.officialDomains.some(
      (od) => hostname === od || hostname.endsWith(`.${od}`)
    );
    if (isOfficial) {
      continue;
    }

    // 2. Subdomain Trick: brand name inside a subdomain of an unrelated domain
    // e.g. "zain.com.login-verify.top" or "qi.iq.portal-check.xyz"
    for (const od of brand.officialDomains) {
      if (hostname.includes(od) && !hostname.endsWith(`.${od}`) && hostname !== od) {
        return {
          isLookalike: true,
          targetBrand: brand.brandKey,
          targetBrandAr: brand.nameAr,
          officialDomain: od,
          reasonAr: `استخدام اسم النطاق الرسمي (${od}) كجزء فرعي لخداع المستخدم وإخفاء النطاق الحقيقي (${hostname})`,
          severity: "high",
        };
      }
    }

    // 3. Brand name embedded in root domain / subdomain:
    // e.g. "zain-cash-security.top" or "qicard-login.com"
    const rootParts = hostname.split(".");
    const rootName = rootParts.length >= 2 ? rootParts[rootParts.length - 2] : hostname;

    if (rootName.includes(brand.brandKey)) {
      return {
        isLookalike: true,
        targetBrand: brand.brandKey,
        targetBrandAr: brand.nameAr,
        officialDomain: brand.officialDomains[0],
        reasonAr: `انتحال اسم الجهة (${brand.nameAr}) في نطاق خارجي (${hostname}) غير تابع للموقع الرسمي (${brand.officialDomains[0]})`,
        severity: "high",
      };
    }

    // 4. Typosquatting / Levenshtein Distance against official root names
    for (const od of brand.officialDomains) {
      const odParts = od.split(".");
      const odRoot = odParts.length >= 2 ? odParts[odParts.length - 2] : od;

      // Check distance if root names have similar lengths
      if (Math.abs(rootName.length - odRoot.length) <= 2 && rootName.length >= 4) {
        const dist = levenshteinDistance(rootName, odRoot);
        if (dist === 1 || (dist === 2 && rootName.length >= 7)) {
          return {
            isLookalike: true,
            targetBrand: brand.brandKey,
            targetBrandAr: brand.nameAr,
            officialDomain: od,
            reasonAr: `تشابه خطير ومضلل في الأحرف (${rootName}) مع اسم النطاق الرسمي (${odRoot}) للجهة (${brand.nameAr})`,
            severity: "high",
          };
        }
      }
    }

    // 5. Brand in path of suspicious TLD (e.g. example.xyz/zain/bonus)
    const suspiciousTlds = ["xyz", "top", "click", "icu", "live", "cfd", "sbs", "rest", "buzz"];
    const tld = rootParts[rootParts.length - 1];
    if (suspiciousTlds.includes(tld) && pathname.includes(brand.brandKey)) {
      return {
        isLookalike: true,
        targetBrand: brand.brandKey,
        targetBrandAr: brand.nameAr,
        officialDomain: brand.officialDomains[0],
        reasonAr: `استغلال اسم (${brand.nameAr}) في مسار رابط ينتمي إلى نطاق عالي الخطورة (.${tld})`,
        severity: "medium",
      };
    }
  }

  return { isLookalike: false };
}
