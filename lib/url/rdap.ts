/**
 * Domain Age Lookup via RDAP (Registration Data Access Protocol).
 *
 * CRITICAL SECURITY CONSTRAINTS:
 * 1. Strict validation of hostname (only valid domain characters, no path injection).
 * 2. Short 3-second timeout with in-memory caching.
 * 3. Graceful fallback on network failure or unsupported TLDs.
 * 4. A domain younger than 30 days is marked as a strong phishing signal.
 */

export interface RdapResult {
  domain: string;
  registrationDate?: string;
  domainAgeDays?: number;
  isYoungDomain: boolean; // < 30 days
  error?: string;
}

const RDAP_CACHE = new Map<string, RdapResult>();

// Strict domain name regex (RFC 1035 / 1123)
const STRICT_DOMAIN_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Checks domain registration age via RDAP.
 */
export async function checkDomainAgeRdap(domain: string): Promise<RdapResult> {
  const cleanDomain = domain.toLowerCase().trim();

  if (process.env.ENABLE_RDAP === "false") {
    return { domain: cleanDomain, isYoungDomain: false };
  }

  // Validate hostname strictly to prevent URL injection
  if (!STRICT_DOMAIN_REGEX.test(cleanDomain)) {
    return {
      domain: cleanDomain,
      isYoungDomain: false,
      error: "Invalid domain format",
    };
  }

  // Check in-memory cache
  if (RDAP_CACHE.has(cleanDomain)) {
    return RDAP_CACHE.get(cleanDomain)!;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const rdapUrl = `https://rdap.org/domain/${encodeURIComponent(cleanDomain)}`;
    const res = await fetch(rdapUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/rdap+json, application/json",
        "User-Agent": "FatinSafetyBot/2.0 (+https://fatin.iq)",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const fallbackResult: RdapResult = {
        domain: cleanDomain,
        isYoungDomain: false,
        error: `RDAP returned HTTP ${res.status}`,
      };
      RDAP_CACHE.set(cleanDomain, fallbackResult);
      return fallbackResult;
    }

    const data: any = await res.json();
    let registrationDateStr: string | undefined;

    if (Array.isArray(data.events)) {
      const regEvent = data.events.find(
        (e: any) => e.eventAction === "registration" || e.eventAction === "registered"
      );
      if (regEvent && regEvent.eventDate) {
        registrationDateStr = regEvent.eventDate;
      }
    }

    if (!registrationDateStr) {
      const result: RdapResult = { domain: cleanDomain, isYoungDomain: false };
      RDAP_CACHE.set(cleanDomain, result);
      return result;
    }

    const regDate = new Date(registrationDateStr);
    const now = new Date();
    const diffMs = now.getTime() - regDate.getTime();
    const ageDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    const result: RdapResult = {
      domain: cleanDomain,
      registrationDate: registrationDateStr,
      domainAgeDays: ageDays,
      isYoungDomain: ageDays < 30,
    };

    RDAP_CACHE.set(cleanDomain, result);
    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const errorResult: RdapResult = {
      domain: cleanDomain,
      isYoungDomain: false,
      error: err?.message || "RDAP lookup failed",
    };
    return errorResult;
  }
}
