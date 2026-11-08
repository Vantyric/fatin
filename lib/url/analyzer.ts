/**
 * URL Static Analyzer & Threat Detector for Fatin.
 *
 * CRITICAL SECURITY INVARIANT:
 * This module NEVER performs HTTP GET/POST to visit the target URL.
 * Doing so would expose the server to SSRF, malware execution, or tracking beacons.
 * All checks are performed statically on the parsed URL structure, with an optional
 * lookup to Google Safe Browsing API v4 if configured.
 */

import { unshortenUrl } from "./unshortener";
import { checkDomainAgeRdap } from "./rdap";
import { detectLookalikeDomain } from "./lookalike";
import { inspectLinkThreats } from "../security/link-inspector";

export interface UrlFlag {
  type:
    | "shortener"
    | "ip_host"
    | "punycode"
    | "suspicious_tld"
    | "non_https"
    | "excessive_subdomains"
    | "brand_spoofing"
    | "at_symbol_trick"
    | "long_hyphenated"
    | "lookalike_domain"
    | "domain_young"
    | "unshortened"
    | "safe_browsing_threat"
    | "homoglyph_attack"
    | "suspicious_free_hoster"
    | "oauth_consent_phish"
    | "compound_deceptive_domain"
    | "aitm_proxy_indicator";
  severity: "high" | "medium" | "low";
  description: string;
}

export interface UrlAnalysisResult {
  url: string;
  normalizedUrl: string;
  domain: string;
  isValid: boolean;
  flags: UrlFlag[];
  riskContribution: number; // 0 to 100
  isShortener: boolean;
  isPhishingSuspect: boolean;
  isHomoglyphAttack?: boolean;
  isBrandSpoofing?: boolean;
  spoofedBrand?: string;
  hasHardFlag?: boolean;
  safeBrowsingThreat?: string;
  domainAgeDays?: number;
  unshortenedUrl?: string;
  lookalikeTarget?: string;
}

// Known Iraqi and major platforms + their genuine domains
const OFFICIAL_BRAND_DOMAINS: Record<string, string[]> = {
  zain: ["zain.com", "zain.iq", "zaincash.iq"],
  asiacell: ["asiacell.com"],
  korek: ["korektelecom.com"],
  qi: ["qi.iq", "qicard.net"],
  qicard: ["qi.iq", "qicard.net"],
  rafidain: ["rafidain-bank.gov.iq"],
  rasheed: ["rasheedbank.gov.iq"],
  cbi: ["cbi.iq"],
  tbi: ["tbi.com.iq"],
  whatsapp: ["whatsapp.com", "wa.me"],
  telegram: ["telegram.org", "t.me"],
  facebook: ["facebook.com", "fb.me"],
  instagram: ["instagram.com"],
};

// Known URL shorteners
const SHORTENER_DOMAINS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "is.gd",
  "cutt.ly",
  "rb.gy",
  "shorturl.at",
  "ow.ly",
  "buff.ly",
  "rebrand.ly",
  "shorte.st",
  "adf.ly",
  "soo.gd",
  "v.gd",
  "bc.vc",
]);

// High-abuse TLDs commonly used in rapid-fire phishing campaigns
const SUSPICIOUS_TLDS = new Set([
  "xyz",
  "top",
  "click",
  "icu",
  "live",
  "cfd",
  "sbs",
  "buzz",
  "rest",
  "tk",
  "ml",
  "ga",
  "cf",
  "gq",
  "work",
  "monster",
  "fit",
  "fun",
  "bar",
  "cam",
  "vip",
  "shop",
  "site",
  "pw",
  "cc",
]);

/**
 * Normalizes input URL strings: adds https if scheme is missing,
 * parses through standard URL constructor, and cleans trailing slashes.
 */
export function normalizeUrl(rawUrl: string): { parsed: URL | null; normalized: string } {
  let cleaned = rawUrl.trim();
  if (!cleaned) return { parsed: null, normalized: "" };

  // If no scheme present, prepend https://
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = "https://" + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    // Only accept http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { parsed: null, normalized: "" };
    }
    return { parsed, normalized: parsed.href };
  } catch {
    return { parsed: null, normalized: "" };
  }
}

/**
 * Extracts URLs from plain text messages.
 */
export function extractUrlsFromText(text: string): string[] {
  if (!text) return [];
  const urlRegex = /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`]+|(?:[a-zA-Z0-9-]+\.)+(?:com|iq|net|org|xyz|top|live|info|me|site|online|app|click|cfd|sbs|icu)(?:\/[^\s<>"'{}|\\^`]*)?/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches));
}

/**
 * Analyzes a URL statically without fetching it.
 */
export async function analyzeUrl(rawUrl: string): Promise<UrlAnalysisResult> {
  const { parsed, normalized } = normalizeUrl(rawUrl);

  if (!parsed) {
    return {
      url: rawUrl,
      normalizedUrl: rawUrl,
      domain: "",
      isValid: false,
      flags: [
        {
          type: "brand_spoofing",
          severity: "high",
          description: "رابط غير صالح أو به رموز غير قياسية",
        },
      ],
      riskContribution: 40,
      isShortener: false,
      isPhishingSuspect: false,
    };
  }

  const flags: UrlFlag[] = [];
  const hostname = parsed.hostname.toLowerCase();
  const domainParts = hostname.split(".");
  const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1] : "";

  // 1. Check for URL shorteners
  const isShortener = SHORTENER_DOMAINS.has(hostname) || (domainParts.length >= 2 && SHORTENER_DOMAINS.has(`${domainParts[domainParts.length - 2]}.${tld}`));
  if (isShortener) {
    flags.push({
      type: "shortener",
      severity: "medium",
      description: "رابط مختصر يخفي الوجهة الحقيقية للموقع",
    });
  }

  // 2. IP Address host (e.g. http://192.168.1.1)
  const isIpv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  const isIpv6 = hostname.startsWith("[") && hostname.endsWith("]");
  if (isIpv4 || isIpv6) {
    flags.push({
      type: "ip_host",
      severity: "high",
      description: "الرابط يستخدم عنوان IP مباشر بدلاً من اسم موقع موثوق",
    });
  }

  // 3. Punycode / Internationalized domain names (IDN homoglyphs)
  const isPunycode = hostname.includes("xn--");
  if (isPunycode) {
    flags.push({
      type: "punycode",
      severity: "high",
      description: "يحتوي الرابط على تشفير بوني كود (Punycode) لتمويه حروف مشابهة",
    });
  }

  // 4. '@' Trick (e.g. https://zain.iq@evil.com)
  if (parsed.username || rawUrl.includes("@")) {
    flags.push({
      type: "at_symbol_trick",
      severity: "high",
      description: "استخدام خدعة الرمز (@) لتضليل المستخدم عن النطاق الحقيقي",
    });
  }

  // 5. Suspicious TLD
  if (SUSPICIOUS_TLDS.has(tld)) {
    flags.push({
      type: "suspicious_tld",
      severity: "medium",
      description: `استخدام نطاق (${tld}.) غير تقليدي وشائع في حملات النصب السريعة`,
    });
  }

  // 6. Non-HTTPS (Insecure HTTP)
  if (parsed.protocol === "http:") {
    flags.push({
      type: "non_https",
      severity: "low",
      description: "اتصال غير مشفر (HTTP) بدلاً من الاتصال الآمن (HTTPS)",
    });
  }

  // 7. Excessive subdomains (e.g. login.zain.iq.secure.auth.site.com)
  if (domainParts.length >= 4) {
    flags.push({
      type: "excessive_subdomains",
      severity: "medium",
      description: "تعدد غير معتاد للنطاقات الفرعية للتمويه",
    });
  }

  // 8. Long hyphenated domain (e.g. qi-card-iraq-account-verify-support.com)
  const hyphenCount = (hostname.match(/-/g) || []).length;
  if (hyphenCount >= 3 || (hyphenCount >= 2 && hostname.length > 28)) {
    flags.push({
      type: "long_hyphenated",
      severity: "medium",
      description: "اسم النطاق طويل ومليء بالفواصل لمحاكاة أسماء الشركات",
    });
  }

  // 9. Brand Spoofing Check: Look for brand names in subdomain or path when main domain is NOT the brand's official domain
  const rootDomain = domainParts.length >= 2 ? `${domainParts[domainParts.length - 2]}.${tld}` : hostname;
  let isPhishingSuspect = false;

  for (const [brandKey, officialList] of Object.entries(OFFICIAL_BRAND_DOMAINS)) {
    const isActuallyOfficial = officialList.some((official) => hostname === official || hostname.endsWith(`.${official}`));

    if (!isActuallyOfficial) {
      // Check if the brand name is present anywhere in hostname or path
      const brandInHost = hostname.includes(brandKey);
      const brandInPath = parsed.pathname.toLowerCase().includes(brandKey);

      if (brandInHost || brandInPath) {
        isPhishingSuspect = true;
        flags.push({
          type: "brand_spoofing",
          severity: "high",
          description: `اسم الجهة (${brandKey}) مستخدم في نطاق غير رسمي (${rootDomain})`,
        });
        break;
      }
    }
  }

  // 10. Advanced Lookalike & Typosquatting Detection
  const lookalike = detectLookalikeDomain(normalized);
  let lookalikeTarget: string | undefined;
  if (lookalike.isLookalike) {
    isPhishingSuspect = true;
    lookalikeTarget = lookalike.targetBrandAr || lookalike.targetBrand;
    flags.push({
      type: "lookalike_domain",
      severity: lookalike.severity || "high",
      description: lookalike.reasonAr || "نطاق ينتحل اسماً شبيهاً لعلامة تجارية أو مصرفية معروفة",
    });
  }

  // 11. Unshorten known shortener hosts safely (stops at first non-shortener)
  let unshortenedUrl: string | undefined;
  if (isShortener && process.env.ENABLE_UNSHORTEN !== "false") {
    try {
      const unshortenRes = await unshortenUrl(normalized);
      if (unshortenRes.destinationUrl && unshortenRes.destinationUrl !== normalized) {
        unshortenedUrl = unshortenRes.destinationUrl;
        flags.push({
          type: "unshortened",
          severity: "medium",
          description: `الرابط المختصر يوجه بالنتيجة إلى: ${unshortenRes.destinationUrl}`,
        });
      }
    } catch {
      // Continue safely without failing
    }
  }

  // 12. Domain Age Check via RDAP
  let domainAgeDays: number | undefined;
  if (process.env.ENABLE_RDAP !== "false") {
    try {
      const rdapRes = await checkDomainAgeRdap(hostname);
      if (rdapRes.domainAgeDays !== undefined) {
        domainAgeDays = rdapRes.domainAgeDays;
        if (rdapRes.isYoungDomain) {
          isPhishingSuspect = true;
          flags.push({
            type: "domain_young",
            severity: "high",
            description: `النطاق حديث التسجيل (${rdapRes.domainAgeDays} يوماً فقط)، وهي سمة رئيسية لمواقع الاصطياد المؤقتة`,
          });
        }
      }
    } catch {
      // Continue safely
    }
  }

  // 13. Optional Google Safe Browsing API check if configured
  let safeBrowsingThreat: string | undefined;
  if (process.env.GOOGLE_SAFE_BROWSING_API_KEY) {
    try {
      safeBrowsingThreat = await checkGoogleSafeBrowsing(normalized, process.env.GOOGLE_SAFE_BROWSING_API_KEY);
      if (safeBrowsingThreat) {
        flags.push({
          type: "safe_browsing_threat",
          severity: "high",
          description: `مدرج في قائمة Google للمواقع الضارة (${safeBrowsingThreat})`,
        });
      }
    } catch {
      // Skip silently as per requirement
    }
  }

  // 13b. Advanced Link Threats (Homoglyph, Free Phishing Hosters, OAuth Consent, Compound Domains)
  const linkThreats = inspectLinkThreats(normalized);
  if (linkThreats.isMaliciousOrDeceptive) {
    for (const flag of linkThreats.flags) {
      if (!flags.some((f) => f.description === flag.description)) {
        flags.push(flag);
      }
    }
    if (linkThreats.isBrandSpoofing) {
      isPhishingSuspect = true;
    }
  }

  // Calculate risk contribution based on severity
  let riskScore = 0;
  for (const flag of flags) {
    if (flag.severity === "high") riskScore += 35;
    else if (flag.severity === "medium") riskScore += 20;
    else if (flag.severity === "low") riskScore += 10;
  }
  if (linkThreats.hardRuleFloor > 0) {
    riskScore = Math.max(riskScore, linkThreats.hardRuleFloor);
  }
  riskScore = Math.min(100, riskScore);

  return {
    url: rawUrl,
    normalizedUrl: normalized,
    domain: hostname,
    isValid: true,
    flags,
    riskContribution: riskScore,
    isShortener,
    isPhishingSuspect,
    isHomoglyphAttack: linkThreats.homoglyph.isHomoglyph,
    isBrandSpoofing: linkThreats.isBrandSpoofing,
    spoofedBrand: linkThreats.spoofedBrandNameAr || linkThreats.spoofedBrandName,
    hasHardFlag: linkThreats.hardRuleFloor >= 85,
    safeBrowsingThreat,
    domainAgeDays,
    unshortenedUrl,
    lookalikeTarget,
  };
}

/**
 * Safe Browsing API v4 caller (server-side only, non-blocking fallback)
 */
async function checkGoogleSafeBrowsing(targetUrl: string, apiKey: string): Promise<string | undefined> {
  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        client: {
          clientId: "fatin-iraq",
          clientVersion: "1.0.0",
        },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "UNWANTED_SOFTWARE",
            "POTENTIALLY_HARMFUL_APPLICATION",
          ],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url: targetUrl }],
        },
      }),
    });

    if (!res.ok) return undefined;
    const data = (await res.json()) as { matches?: Array<{ threatType: string }> };
    if (data.matches && data.matches.length > 0) {
      return data.matches[0].threatType;
    }
    return undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeoutId);
  }
}
