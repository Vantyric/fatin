/**
 * Safe URL Unshortener for Fatin.
 *
 * CRITICAL SECURITY CONSTRAINTS:
 * 1. Connects EXCLUSIVELY to an explicit allowlist of known shortener hosts.
 * 2. Follows Location headers manually up to 5 hops using HEAD/GET.
 * 3. STOPS AT THE FIRST NON-SHORTENER HOST. It NEVER connects to or fetches the destination!
 * 4. Strictly blocks non-HTTP/HTTPS schemes, non-standard ports (only 80, 443 permitted).
 * 5. Strictly blocks private, loopback, link-local, and cloud metadata IPs to prevent SSRF.
 */

export const SHORTENER_ALLOWLIST = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "cutt.ly",
  "is.gd",
  "rb.gy",
  "ow.ly",
  "buff.ly",
  "rebrand.ly",
  "v.gd",
  "shorturl.at",
  "tiny.cc",
]);

// Private and link-local IP prefixes
const BLOCKED_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local / Cloud metadata (AWS, GCP, Azure 169.254.169.254)
  /^0\./, // Current network
  /^localhost$/i,
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 Unique local
  /^fe80:/i, // IPv6 Link-local
];

export interface UnshortenResult {
  originalUrl: string;
  destinationUrl?: string;
  hops: number;
  stoppedAtNonShortener: boolean;
  error?: string;
}

/**
 * Validates whether a host or IP is safe from SSRF.
 */
export function isSafePublicHost(hostname: string): boolean {
  if (!hostname || hostname.trim().length === 0) return false;
  const clean = hostname.toLowerCase().trim();

  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(clean)) {
      return false;
    }
  }

  // Ensure hostname is not an internal domain like .local, .internal, .lan
  if (/\.(local|internal|lan|corp|home|arpa)$/i.test(clean)) {
    return false;
  }

  return true;
}

/**
 * Unshortens a URL safely by only querying allowlisted shortener hosts.
 */
export async function unshortenUrl(rawUrl: string): Promise<UnshortenResult> {
  if (process.env.ENABLE_UNSHORTEN === "false") {
    return {
      originalUrl: rawUrl,
      hops: 0,
      stoppedAtNonShortener: false,
    };
  }

  let currentUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  let hops = 0;
  const maxHops = 5;

  while (hops < maxHops) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      return {
        originalUrl: rawUrl,
        destinationUrl: currentUrl,
        hops,
        stoppedAtNonShortener: true,
        error: "Invalid URL structure",
      };
    }

    // 1. Verify scheme is http or https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        originalUrl: rawUrl,
        hops,
        stoppedAtNonShortener: true,
        error: "Blocked non-http(s) protocol",
      };
    }

    // 2. Verify port is standard
    if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
      return {
        originalUrl: rawUrl,
        hops,
        stoppedAtNonShortener: true,
        error: "Blocked non-standard port",
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 3. Verify host is safe from SSRF
    if (!isSafePublicHost(hostname)) {
      return {
        originalUrl: rawUrl,
        hops,
        stoppedAtNonShortener: true,
        error: "Blocked private or metadata host",
      };
    }

    // 4. INVARIANT: Only connect if host is in the allowlist!
    if (!SHORTENER_ALLOWLIST.has(hostname)) {
      // Reached a non-shortener destination! STOP immediately!
      return {
        originalUrl: rawUrl,
        destinationUrl: currentUrl,
        hops,
        stoppedAtNonShortener: true,
      };
    }

    // Fetch the shortener header with manual redirect
    hops++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "FatinSafetyBot/2.0 (+https://fatin.iq)",
        },
      });

      clearTimeout(timeoutId);

      const location = res.headers.get("location");
      if (!location) {
        // No redirect header; stop
        return {
          originalUrl: rawUrl,
          destinationUrl: currentUrl,
          hops,
          stoppedAtNonShortener: false,
        };
      }

      // Resolve relative location
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = nextUrl;
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        originalUrl: rawUrl,
        destinationUrl: currentUrl,
        hops,
        stoppedAtNonShortener: false,
        error: err?.message || "Request failed",
      };
    }
  }

  return {
    originalUrl: rawUrl,
    destinationUrl: currentUrl,
    hops,
    stoppedAtNonShortener: true,
  };
}
