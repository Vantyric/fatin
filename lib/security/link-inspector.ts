/**
 * Comprehensive Threat Link & Domain Inspector for FATIN Security.
 * Covers:
 * - IDN Homoglyphs & Punycode Brand Spoofing (Cyrillic/Greek/Accented)
 * - Ephemeral Phishing Hosts & Free Dynamic Tunnels (*.pages.dev, *.ngrok-free.app, etc.)
 * - Malicious OAuth Consent & Device Code Hijacking
 * - Compound Deceptive Brand Domains
 * - AitM (Adversary-in-the-Middle) Proxy Indicators
 */

import { inspectHomoglyphs, WATCHLIST_BRANDS, HomoglyphAnalysisResult } from "./homoglyph";

export interface LinkSecurityFlag {
  type:
    | "homoglyph_attack"
    | "brand_spoofing"
    | "suspicious_free_hoster"
    | "oauth_consent_phish"
    | "compound_deceptive_domain"
    | "aitm_proxy_indicator";
  severity: "high" | "medium";
  description: string;
}

export interface DetailedLinkInspection {
  rawUrl: string;
  normalizedUrl: string;
  hostname: string;
  isMaliciousOrDeceptive: boolean;
  flags: LinkSecurityFlag[];
  homoglyph: HomoglyphAnalysisResult;
  isBrandSpoofing: boolean;
  spoofedBrandName?: string;
  spoofedBrandNameAr?: string;
  isSuspiciousFreeHoster: boolean;
  isOAuthConsentPhish: boolean;
  isCompoundDeceptive: boolean;
  hardRuleFloor: number; // >= 90 if malicious spoofing
}

// Curated list of free hosting services and dynamic ephemeral tunnels commonly abused for phishing kits
const ABUSED_FREE_HOSTERS = [
  "pages.dev",
  "workers.dev",
  "weebly.com",
  "duckdns.org",
  "ngrok-free.app",
  "ngrok.io",
  "glitch.me",
  "firebaseapp.com",
  "web.app",
  "vercel.app",
  "netlify.app",
  "surge.sh",
  "000webhostapp.com",
  "loca.lt",
  "myshopify.com",
  "wixsite.com",
];

// Deceptive intent keywords often compounded with brand names
const DECEPTIVE_SECURITY_KEYWORDS = [
  "security",
  "secure",
  "login",
  "signin",
  "verify",
  "verification",
  "update",
  "support",
  "account",
  "portal",
  "unlock",
  "auth",
  "authenticate",
  "recovery",
  "help",
  "billing",
  "service",
  "center",
  "confirm",
  "wallet",
  "kyc",
  "dispute",
  "cancel",
];

// Official OAuth Identity Provider Domains
const LEGIT_OAUTH_PROVIDERS = [
  "login.microsoftonline.com",
  "accounts.google.com",
  "appleid.apple.com",
  "github.com",
  "gitlab.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
];

/**
 * Inspects a URL or domain against comprehensive modern threat heuristics.
 */
export function inspectLinkThreats(rawUrlOrDomain: string): DetailedLinkInspection {
  let hostname = rawUrlOrDomain.trim();
  let pathname = "";
  let search = "";
  let fullNormalized = rawUrlOrDomain.trim();

  try {
    const full = hostname.startsWith("http") ? hostname : `https://${hostname}`;
    const parsed = new URL(full);
    hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    pathname = parsed.pathname.toLowerCase();
    search = parsed.search.toLowerCase();
    fullNormalized = parsed.href;
  } catch {
    hostname = hostname.replace(/^[a-zA-Z]+:\/\//, "").split("/")[0].split("?")[0].toLowerCase().replace(/^www\./, "");
  }

  const flags: LinkSecurityFlag[] = [];
  let isMaliciousOrDeceptive = false;
  let hardRuleFloor = 0;

  // 1. Homoglyph & Punycode Analysis
  const homoglyph = inspectHomoglyphs(hostname);

  if (homoglyph.isHomoglyph) {
    isMaliciousOrDeceptive = true;
    hardRuleFloor = Math.max(hardRuleFloor, 90);

    if (homoglyph.isBrandSpoofing && homoglyph.targetBrand) {
      flags.push({
        type: "homoglyph_attack",
        severity: "high",
        description: `احتيال انتحال نطاق وعلامة تجارية (Brand Spoofing / Homoglyph Attack): استخدام تشفير بوني كود أو حروف متطابقة بصرياً لانتحال موقع (${homoglyph.targetBrand.nameAr} - ${homoglyph.targetBrand.name})`,
      });
    } else {
      flags.push({
        type: "homoglyph_attack",
        severity: "high",
        description: homoglyph.reasonAr || "النطاق يحتوي على حروف متطابقة بصرياً أو مشفرة (Punycode / Homoglyph) لتمويه اسم الموقع",
      });
    }
  }

  // 2. Suspicious Free Hoster & Ephemeral Tunnel Analysis
  let isSuspiciousFreeHoster = false;
  for (const hoster of ABUSED_FREE_HOSTERS) {
    if (hostname.endsWith(`.${hoster}`) || hostname === hoster) {
      // Check if subdomain or path carries deceptive terms or brand names
      const subdomain = hostname.replace(`.${hoster}`, "");
      const fullTarget = `${subdomain} ${pathname}`.toLowerCase();

      const hasDeceptiveKeyword = DECEPTIVE_SECURITY_KEYWORDS.some((kw) => fullTarget.includes(kw));
      const hasBrandName = WATCHLIST_BRANDS.some((b) => fullTarget.includes(b.key));

      if (hasDeceptiveKeyword || hasBrandName) {
        isSuspiciousFreeHoster = true;
        isMaliciousOrDeceptive = true;
        hardRuleFloor = Math.max(hardRuleFloor, 85);

        flags.push({
          type: "suspicious_free_hoster",
          severity: "high",
          description: `استضافة صفحة تصيد على خادم مجاني أو نفق مؤقت (${hoster}) لخداع الضحية وتجاوز أنظمة الحظر`,
        });
      }
      break;
    }
  }

  // 3. OAuth Consent Phishing & Device Code Token Theft
  let isOAuthConsentPhish = false;
  const isOAuthEndpoint =
    pathname.includes("oauth2/authorize") ||
    pathname.includes("oauth/authorize") ||
    pathname.includes("login/device/code") ||
    pathname.includes("devicelogin") ||
    pathname.includes("common/oauth2/v2.0/authorize");

  if (isOAuthEndpoint) {
    const isLegitProvider = LEGIT_OAUTH_PROVIDERS.some((p) => hostname === p || hostname.endsWith(`.${p}`));
    isOAuthConsentPhish = true;
    isMaliciousOrDeceptive = true;
    hardRuleFloor = Math.max(hardRuleFloor, 85);

    flags.push({
      type: "oauth_consent_phish",
      severity: "high",
      description: isLegitProvider
        ? "رابط يطلب تفويض صلاحيات الحساب (OAuth Consent / Device Code Phishing). احذر من منح أي تطبيقات غير موثوقة حق الوصول لبياناتك"
        : "محاولة انتحال صفحة تفويض دخول وسرقة بيانات الحساب عبر موقع خارجي (Fake OAuth Consent Portal)",
    });
  }

  // 4. Compound Deceptive Brand Domains
  let isCompoundDeceptive = false;
  let spoofedBrandName = homoglyph.targetBrand?.name;
  let spoofedBrandNameAr = homoglyph.targetBrand?.nameAr;

  if (!homoglyph.isHomoglyph) {
    for (const brand of WATCHLIST_BRANDS) {
      const isOfficial = brand.officialDomains.some(
        (od) => hostname === od || hostname.endsWith(`.${od}`)
      );
      if (isOfficial) continue;

      if (hostname.includes(brand.key)) {
        const hasDeceptiveWord = DECEPTIVE_SECURITY_KEYWORDS.some((kw) => hostname.includes(kw));
        if (hasDeceptiveWord || hostname.includes("-") || hostname.includes(".")) {
          isCompoundDeceptive = true;
          isMaliciousOrDeceptive = true;
          hardRuleFloor = Math.max(hardRuleFloor, 88);
          spoofedBrandName = brand.name;
          spoofedBrandNameAr = brand.nameAr;

          flags.push({
            type: "compound_deceptive_domain",
            severity: "high",
            description: `احتيال انتحال نطاق وعلامة تجارية: اسم نطاق خادع (${hostname}) يجمع اسم (${brand.nameAr}) مع كلمات أمنية مضللة`,
          });
          break;
        }
      }
    }
  }

  return {
    rawUrl: rawUrlOrDomain,
    normalizedUrl: fullNormalized,
    hostname,
    isMaliciousOrDeceptive,
    flags,
    homoglyph,
    isBrandSpoofing: homoglyph.isBrandSpoofing || isCompoundDeceptive,
    spoofedBrandName,
    spoofedBrandNameAr,
    isSuspiciousFreeHoster,
    isOAuthConsentPhish,
    isCompoundDeceptive,
    hardRuleFloor,
  };
}
