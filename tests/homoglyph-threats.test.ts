import { describe, it, expect } from "vitest";
import { inspectHomoglyphs, deconfuseString } from "@/lib/security/homoglyph";
import { inspectLinkThreats } from "@/lib/security/link-inspector";
import { extractSignals } from "@/lib/rules/signalsEngine";
import { extractEntities } from "@/lib/text/entityExtractor";
import { combineScores } from "@/lib/scoring/combiner";
import { analyzeUrl } from "@/lib/url/analyzer";

describe("Homoglyphs & Confusables Threat Detection", () => {
  it("detects Cyrillic lookalike letters in domain names", () => {
    // Cyrillic 'р' (\u0440) replacing Latin 'p'
    const cyrillicPaypal = "рaypal.com";
    const result = inspectHomoglyphs(cyrillicPaypal);

    expect(result.isHomoglyph).toBe(true);
    expect(result.hasConfusables).toBe(true);
    expect(result.punycodeDomain).toContain("xn--");
    expect(result.isBrandSpoofing).toBe(true);
    expect(result.targetBrand?.name).toBe("PayPal");
    expect(result.detectedHomoglyphChars).toContain("р");
  });

  it("detects Apple homoglyph spoof with Cyrillic 'а' and 'р'", () => {
    // Cyrillic 'а' (\u0430) and 'р' (\u0440)
    const cyrillicApple = "аррle.com";
    const result = inspectHomoglyphs(cyrillicApple);

    expect(result.isHomoglyph).toBe(true);
    expect(result.isBrandSpoofing).toBe(true);
    expect(result.targetBrand?.name).toBe("Apple");
  });

  it("handles Punycode encoded input (xn--...)", () => {
    // Punycode for "рaypal.com" (with Cyrillic 'р')
    const punycodePaypal = "xn--aypal-uye.com";
    const result = inspectHomoglyphs(punycodePaypal);

    expect(result.isHomoglyph).toBe(true);
    expect(result.hasPunycode).toBe(true);
    expect(result.isBrandSpoofing).toBe(true);
    expect(result.targetBrand?.name).toBe("PayPal");
  });

  it("returns safe for genuine legitimate domains without confusables", () => {
    const result = inspectHomoglyphs("paypal.com");
    expect(result.isHomoglyph).toBe(false);
    expect(result.isBrandSpoofing).toBe(false);
    expect(result.hasConfusables).toBe(false);
  });

  it("deconfuseString normalizes confusable Unicode to ASCII Latin", () => {
    const mixed = "рayраl"; // contains Cyrillic 'р' and 'а'
    const res = deconfuseString(mixed);
    expect(res.normalized).toBe("paypal");
    expect(res.replacedChars).toEqual(["р", "р", "а"]);
  });
});

describe("Link Threat Inspector (Deceptive Domains, Free Hosters & OAuth)", () => {
  it("detects compound deceptive domains targeting high-value brands", () => {
    const result1 = inspectLinkThreats("https://paypal-security-verification.com");
    expect(result1.isCompoundDeceptive).toBe(true);
    expect(result1.spoofedBrandName).toBe("PayPal");

    const result2 = inspectLinkThreats("https://appleid-unlock.support");
    expect(result2.isCompoundDeceptive).toBe(true);
    expect(result2.spoofedBrandName).toBe("Apple");

    const result3 = inspectLinkThreats("https://telegram-login-secure.me");
    expect(result3.isCompoundDeceptive).toBe(true);
    expect(result3.spoofedBrandName).toBe("Telegram");
  });

  it("flags suspicious free hosting platforms frequently abused for phishing", () => {
    const res1 = inspectLinkThreats("https://fake-login-service.pages.dev/auth");
    expect(res1.isSuspiciousFreeHoster).toBe(true);
    expect(res1.flags.some((f) => f.type === "suspicious_free_hoster")).toBe(true);

    const res2 = inspectLinkThreats("https://client-portal.ngrok-free.app/verify");
    expect(res2.isSuspiciousFreeHoster).toBe(true);
  });

  it("flags OAuth authorization and device-code consent endpoints", () => {
    const res = inspectLinkThreats("https://login.microsoftonline.com/common/oauth2/authorize?client_id=fake");
    expect(res.isOAuthConsentPhish).toBe(true);
    expect(res.flags.some((f) => f.type === "oauth_consent_phish")).toBe(true);
  });
});

describe("Advanced Threat Vectors (TOAD, Crypto Drainers, Task Scams)", () => {
  it("detects TOAD / Callback Phishing invoices with support call numbers", () => {
    const text = "Geek Squad Total Support: Invoice #GS-99281 for $499.99 auto-renewed. If you did not authorize this charge, call our support desk immediately at +1-800-555-0199.";
    const entities = extractEntities(text);
    const report = extractSignals(text, entities);

    expect(report.signals.some((s) => s.id === "toad_callback_invoice")).toBe(true);
  });

  it("detects Web3 Crypto Drainer signatures and Permit requests", () => {
    const text = "Airdrop claim portal: please sign the Permit2 message via eth_signTypedData_v4 to authorize your reward claim.";
    const entities = extractEntities(text);
    const report = extractSignals(text, entities);

    expect(report.signals.some((s) => s.id === "crypto_drainer_signature")).toBe(true);
  });

  it("detects daily task / rating job scams", () => {
    const text = "فرصة عمل أونلاين براتب يومي: اربح 150 دولار يومياً مقابل إكمال مهام تقييم التطبيقات والمنتجات اليومية عبر تيليجرام.";
    const entities = extractEntities(text);
    const report = extractSignals(text, entities);

    expect(report.signals.some((s) => s.id === "task_rating_scam")).toBe(true);
  });
});

describe("Scoring Combiner Hard Floors for Advanced Vectors", () => {
  it("enforces hard floor >= 90 for homoglyph / brand spoofing", () => {
    const result = combineScores({
      aiScore: 40,
      rulesScore: 40,
      hardFloors: { isHomoglyphOrBrandSpoof: true },
    });

    expect(result.finalScore).toBeGreaterThanOrEqual(90);
    expect(result.verdict).toBe("scam");
    expect(result.appliedFloors).toContain(
      "احتيال انتحال نطاق وعلامة تجارية (Brand Spoofing / Homoglyph Attack)"
    );
  });

  it("enforces hard floor >= 88 for TOAD callback phishing", () => {
    const result = combineScores({
      aiScore: 35,
      rulesScore: 35,
      hardFloors: { isToadInvoiceCallback: true },
    });

    expect(result.finalScore).toBeGreaterThanOrEqual(88);
    expect(result.verdict).toBe("scam");
    expect(result.appliedFloors).toContain(
      "احتيال هاتفي وفواتير وهمية (Callback Phishing / TOAD)"
    );
  });

  it("enforces hard floor >= 92 for crypto drainer attacks", () => {
    const result = combineScores({
      aiScore: 30,
      rulesScore: 30,
      hardFloors: { isCryptoDrainer: true },
    });

    expect(result.finalScore).toBeGreaterThanOrEqual(92);
    expect(result.verdict).toBe("scam");
    expect(result.appliedFloors).toContain(
      "توقيع احتيالي لسرقة المحفظة (Crypto Drainer / Permit Fraud)"
    );
  });
});

describe("URL Analyzer Integration with Homoglyph Detection", () => {
  it("flags homoglyph URL with high risk and spoofed brand identification", async () => {
    const result = await analyzeUrl("https://рaypal.com/verify-account");

    expect(result.isHomoglyphAttack).toBe(true);
    expect(result.isBrandSpoofing).toBe(true);
    expect(["PayPal", "باي بال"]).toContain(result.spoofedBrand);
    expect(result.hasHardFlag).toBe(true);
    expect(result.riskContribution).toBeGreaterThanOrEqual(85);
    expect(result.flags.some((f) => f.type === "homoglyph_attack")).toBe(true);
  });

  it("flags suspicious free hosting platform with risk score floor", async () => {
    const result = await analyzeUrl("https://update-security.pages.dev/login");

    expect(result.flags.some((f) => f.type === "suspicious_free_hoster")).toBe(true);
    expect(result.riskContribution).toBeGreaterThanOrEqual(50);
  });
});
