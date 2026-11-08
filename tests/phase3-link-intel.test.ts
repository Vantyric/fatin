import { describe, it, expect, vi } from "vitest";
import { isSafePublicHost, unshortenUrl, SHORTENER_ALLOWLIST } from "@/lib/url/unshortener";
import { detectLookalikeDomain, levenshteinDistance } from "@/lib/url/lookalike";
import { checkDomainAgeRdap } from "@/lib/url/rdap";

describe("Phase 3: Safe URL Unshortener & SSRF Guards", () => {
  it("blocks private, loopback, and cloud metadata hostnames from SSRF attacks", () => {
    expect(isSafePublicHost("127.0.0.1")).toBe(false);
    expect(isSafePublicHost("localhost")).toBe(false);
    expect(isSafePublicHost("::1")).toBe(false);
    expect(isSafePublicHost("10.0.0.5")).toBe(false);
    expect(isSafePublicHost("192.168.1.100")).toBe(false);
    expect(isSafePublicHost("172.20.0.1")).toBe(false);
    expect(isSafePublicHost("169.254.169.254")).toBe(false); // Cloud metadata IP
    expect(isSafePublicHost("metadata.google.internal")).toBe(false);
    expect(isSafePublicHost("database.local")).toBe(false);

    // Public hosts are accepted
    expect(isSafePublicHost("bit.ly")).toBe(true);
    expect(isSafePublicHost("tinyurl.com")).toBe(true);
    expect(isSafePublicHost("google.com")).toBe(true);
  });

  it("never connects to non-shortener destinations", async () => {
    // A domain that is NOT in the shortener allowlist
    const nonShortener = "https://arbitrary-site.example.com/some/path";
    const res = await unshortenUrl(nonShortener);

    expect(res.hops).toBe(0);
    expect(res.stoppedAtNonShortener).toBe(true);
  });

  it("blocks non-http(s) protocols", async () => {
    const res = await unshortenUrl("ftp://bit.ly/file");
    expect(res.error).toContain("Blocked non-http");
  });

  it("blocks non-standard ports", async () => {
    const res = await unshortenUrl("http://bit.ly:8080/xyz");
    expect(res.error).toContain("Blocked non-standard port");
  });
});

describe("Phase 3: Lookalike Domain & Typosquatting Detection", () => {
  it("computes Levenshtein distance accurately", () => {
    expect(levenshteinDistance("zain", "zain")).toBe(0);
    expect(levenshteinDistance("zain", "zainn")).toBe(1);
    expect(levenshteinDistance("asiacell", "asiace11")).toBe(2);
  });

  it("detects subdomain brand spoofing (e.g. zain.com.login-portal.top)", () => {
    const spoof = detectLookalikeDomain("https://zain.com.login-portal.top/account");
    expect(spoof.isLookalike).toBe(true);
    expect(spoof.targetBrand).toBe("zain");
    expect(spoof.severity).toBe("high");
  });

  it("detects typosquatting domains of Iraqi brands", () => {
    // Typosquatting Zain
    const typosquatZain = detectLookalikeDomain("https://zainn.com/login");
    expect(typosquatZain.isLookalike).toBe(true);
    expect(typosquatZain.targetBrand).toBe("zain");

    // Brand embedded in root domain
    const embeddedQi = detectLookalikeDomain("https://qicard-security-check.xyz");
    expect(embeddedQi.isLookalike).toBe(true);
    expect(embeddedQi.targetBrand).toBe("qicard");
  });

  it("recognizes genuine official domains without false alarms", () => {
    const officialZain = detectLookalikeDomain("https://www.zain.com/en");
    expect(officialZain.isLookalike).toBe(false);

    const officialIqZain = detectLookalikeDomain("https://iq.zain.com/ar");
    expect(officialIqZain.isLookalike).toBe(false);

    const officialAsiacell = detectLookalikeDomain("https://asiacell.com");
    expect(officialAsiacell.isLookalike).toBe(false);

    const officialQi = detectLookalikeDomain("https://qi.iq");
    expect(officialQi.isLookalike).toBe(false);
  });
});

describe("Phase 3: Domain Age via RDAP", () => {
  it("rejects invalid or dangerous domain names", async () => {
    const invalid = await checkDomainAgeRdap("not..valid..domain!!");
    expect(invalid.error).toBe("Invalid domain format");
    expect(invalid.isYoungDomain).toBe(false);
  });
});
