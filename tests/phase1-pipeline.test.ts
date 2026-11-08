import { describe, it, expect } from "vitest";
import {
  deobfuscateAndNormalize,
  stripInvisibleAndBidi,
  collapseSpacedOutLetters,
  normalizeHomoglyphs,
  decodeLeetspeak,
  normalizeArabizi,
} from "@/lib/text/advancedNormalize";
import { extractEntities } from "@/lib/text/entityExtractor";
import { extractSignals } from "@/lib/rules/signalsEngine";
import { analyzeConversation } from "@/lib/text/conversationAnalyzer";

describe("Phase 1: Advanced De-obfuscation & Normalization", () => {
  it("strips invisible, zero-width, and bidi override characters", () => {
    // String containing zero-width spaces and right-to-left overrides
    const obfuscated = "م\u200Bب\u200Cر\u200Dو\uFEFFك \u202Eربحت\u202C";
    const cleaned = stripInvisibleAndBidi(obfuscated);
    expect(cleaned).toBe("مبروك ربحت");
  });

  it("collapses spaced-out letters intended to evade filters", () => {
    const text = "ارسل ر م ز الخاص بك لتنزيل a p k";
    const collapsed = collapseSpacedOutLetters(text);
    expect(collapsed).toContain("رمز");
    expect(collapsed).toContain("apk");

    const spacedWhatsapp = "تواصل معنا عبر و ا ت س ا ب";
    expect(collapseSpacedOutLetters(spacedWhatsapp)).toContain("واتساب");
  });

  it("normalizes Cyrillic and Greek homoglyphs to Latin equivalents", () => {
    // "zаin" with Cyrillic 'а' (U+0430)
    const cyrillicZain = "z\u0430in";
    const normalized = normalizeHomoglyphs(cyrillicZain);
    expect(normalized).toBe("zain");
  });

  it("decodes leetspeak embedded in words", () => {
    const leetText = "visit z41n to reset your p4ssw0rd";
    const decoded = decodeLeetspeak(leetText);
    expect(decoded).toBe("visit zain to reset your password");
  });

  it("normalizes Arabizi (Franco-Arabic) fraud vocabulary", () => {
    const arabizi = "mabrook rba7t 1000$ 3ala zaincash";
    const normalized = normalizeArabizi(arabizi);
    expect(normalized).toContain("مبروك");
    expect(normalized).toContain("ربحت");
    expect(normalized).toContain("زين كاش");
  });

  it("full de-obfuscation pipeline combines all operations smoothly", () => {
    const raw = "م\u200Bب\u200Cر\u200Dوك ر م ز الخاص بك z41n \u064Eم\u064Fكافأة";
    const cleaned = deobfuscateAndNormalize(raw);
    expect(cleaned).toContain("مبروك");
    expect(cleaned).toContain("رمز");
    expect(cleaned).toContain("زين");
    expect(cleaned).toContain("مكافاه");
  });
});

describe("Phase 1: Entity Extraction & Country-Brand Contradiction", () => {
  it("extracts phone numbers, brands, and detects foreign country contradiction", () => {
    // Text claiming to be Zain Iraq, but sending from a Nigerian (+234) number
    const scamText =
      "مرحباً من شركة زين العراق، تم تجميد حسابك، اتصل بنا على +2348012345678 لتأكيد البيانات";

    const entities = extractEntities(scamText);

    expect(entities.claimedBrands.some((b) => b.name === "Zain Iraq")).toBe(true);
    expect(entities.phoneNumbers.length).toBeGreaterThanOrEqual(1);

    const phone = entities.phoneNumbers.find((p) => p.country === "NG");
    expect(phone).toBeDefined();
    expect(phone?.isIraqi).toBe(false);
    expect(phone?.contradictsClaimedBrand).toBe(true);
    expect(entities.hasCountryBrandContradiction).toBe(true);
  });

  it("extracts remote access tools (AnyDesk, TeamViewer, RustDesk)", () => {
    const text = "قم بتحميل برنامج anydesk لمساعدتك في استرداد أرباحك من الدعم الفني";
    const entities = extractEntities(text);
    expect(entities.remoteAccessApps).toContain("AnyDesk");
  });

  it("extracts dangerous APK and USSD call-forwarding codes", () => {
    const text = "اطلب الكود *21*07801234567# لتفعيل الجائزة، أو حمل تحديث التطبيق update.apk";
    const entities = extractEntities(text);

    expect(entities.ussdCodes).toContain("*21*07801234567#");
    expect(entities.dangerousFileTypes).toContain(".apk");
  });

  it("extracts QR code mentions", () => {
    const text = "يرجى مسح الباركود QR code المرفق لتأكيد عملية الدفع";
    const entities = extractEntities(text);
    expect(entities.qrMentions.length).toBeGreaterThan(0);
  });
});

describe("Phase 1: Signals Provider Engine", () => {
  it("emits evidence signals with categories and floors risk on hard signals", () => {
    const text = "تواصل عبر AnyDesk واطلب الكود *21*07801234567#";
    const entities = extractEntities(text);
    const report = extractSignals(text, entities);

    expect(report.signals.length).toBeGreaterThanOrEqual(2);
    expect(report.hasHardSignal).toBe(true);
    expect(report.hardSignalFloor).toBeGreaterThanOrEqual(90);

    const remoteSignal = report.signals.find((s) => s.id === "remote_access_tool_request");
    expect(remoteSignal).toBeDefined();
    expect(remoteSignal?.category).toBe("malware");
    expect(remoteSignal?.isHardSignal).toBe(true);
  });

  it("preserves legit guard for normal OTP notifications without imposing hard floors", () => {
    const text = "رمز التحقق الخاص بك هو 948192. لا تشارك هذا الرمز مع أي شخص للحفاظ على سرية حسابك.";
    const entities = extractEntities(text);
    const report = extractSignals(text, entities);

    expect(report.isLegitGuarded).toBe(true);
    expect(report.hasHardSignal).toBe(false);
  });
});

describe("Phase 1: Conversation Analyzer", () => {
  it("detects chat transcript and identifies the turning-point quote", () => {
    const chatTranscript = `
المتصل [10:30]: سلام عليكم أخي، شلونك شخبارك؟
المستخدم [10:31]: وعليكم السلام، منو وياي؟
المتصل [10:32]: أنا المندوب، عندك حوالة أرباح 500 دولار بس دزلي كود التحقق اللي وصلك هسه حتى أحولها
المتصل [10:33]: بسرعة قبل ما ينلغي الطلب
    `.trim();

    const analysis = analyzeConversation(chatTranscript);

    expect(analysis.isConversation).toBe(true);
    expect(analysis.speakerCount).toBeGreaterThanOrEqual(2);
    expect(analysis.trajectory.hasRapportBuilding).toBe(true);
    expect(analysis.trajectory.hasPivot).toBe(true);
    expect(analysis.trajectory.hasUrgencyOrPressure).toBe(true);
    expect(analysis.turningPointQuote).toContain("دزلي كود التحقق");
    expect(analysis.turningPointExplanationAr).toBeTruthy();
  });

  it("does not classify single-statement messages as conversations", () => {
    const singleMsg = "مبروك ربحت سيارة من زين اضغط على الرابط";
    const analysis = analyzeConversation(singleMsg);
    expect(analysis.isConversation).toBe(false);
  });
});
