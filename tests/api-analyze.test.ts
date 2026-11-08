import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateImageBase64 } from "@/lib/security/imageValidator";
import {
  getBaghdadDateString,
  getSecondsUntilBaghdadMidnight,
  hashSubject,
  checkAndIncrementUsage,
  evaluateGuestUsage,
} from "@/lib/security/rateLimiter";
import { POST } from "@/app/api/analyze/route";
import { NextRequest } from "next/server";

// Mock Gemini
vi.mock("@/lib/ai/gemini", () => ({
  callGeminiAnalysis: vi.fn(),
  callTwoTierGeminiAnalysis: vi.fn().mockResolvedValue({ analysis: null, deepPassRan: false }),
}));

import { callGeminiAnalysis } from "@/lib/ai/gemini";

describe("Phase 3: Image Validation & Rate Limiting & API Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // Image Magic Bytes & Size Validation
  // ==========================================
  describe("Image Validator (Magic Bytes & Size)", () => {
    it("accepts valid JPEG buffer (FF D8 FF)", () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      const base64 = jpegBuffer.toString("base64");
      const res = validateImageBase64(base64, "image/jpeg");
      expect(res.valid).toBe(true);
      expect(res.detectedMimeType).toBe("image/jpeg");
    });

    it("accepts valid PNG buffer (89 50 4E 47 0D 0A 1A 0A)", () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const base64 = pngBuffer.toString("base64");
      const res = validateImageBase64(base64, "image/png");
      expect(res.valid).toBe(true);
      expect(res.detectedMimeType).toBe("image/png");
    });

    it("accepts valid WebP buffer (RIFF....WEBP)", () => {
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00, // length
        0x57, 0x45, 0x42, 0x50, // WEBP
        0x56, 0x50, 0x38, 0x20, // VP8
      ]);
      const base64 = webpBuffer.toString("base64");
      const res = validateImageBase64(base64, "image/webp");
      expect(res.valid).toBe(true);
      expect(res.detectedMimeType).toBe("image/webp");
    });

    it("rejects invalid magic bytes (e.g. text or executable disguised as image)", () => {
      const fakeImage = Buffer.from("MZThisIsAnExecutableFileNotAnImage");
      const base64 = fakeImage.toString("base64");
      const res = validateImageBase64(base64, "image/jpeg");
      expect(res.valid).toBe(false);
      expect(res.errorAr).toContain("غير مدعوم أو تالف");
    });

    it("rejects empty image payload", () => {
      const res = validateImageBase64("");
      expect(res.valid).toBe(false);
    });
  });

  // ==========================================
  // Rate Limiting & Baghdad Timezone
  // ==========================================
  describe("Rate Limiting", () => {
    it("returns formatted Baghdad date YYYY-MM-DD", () => {
      const dateStr = getBaghdadDateString();
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns remaining seconds until Baghdad midnight (> 0 and <= 86400)", () => {
      const seconds = getSecondsUntilBaghdadMidnight();
      expect(seconds).toBeGreaterThan(0);
      expect(seconds).toBeLessThanOrEqual(86400);
    });

    it("produces deterministic SHA-256 salted hashes", () => {
      const hash1 = hashSubject("192.168.1.1");
      const hash2 = hashSubject("192.168.1.1");
      const hash3 = hashSubject("10.0.0.1");
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1.length).toBe(32);
    });

    it("enforces in-memory limits when max count is reached", async () => {
      const testSubject = `test-user-${Date.now()}`;
      const res1 = await checkAndIncrementUsage(testSubject, 2);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(1);

      const res2 = await checkAndIncrementUsage(testSubject, 2);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(0);

      const res3 = await checkAndIncrementUsage(testSubject, 2);
      expect(res3.allowed).toBe(false);
      expect(res3.remaining).toBe(0);
    });

    it("applies guest usage limit of 3 checks per day", async () => {
      const guestIp = `198.51.100.${Math.floor(Math.random() * 200)}`;
      const devId = `dev-${Math.random()}`;

      const check1 = await evaluateGuestUsage(guestIp, devId);
      expect(check1.allowed).toBe(true);
      expect(check1.limit).toBe(3);

      await evaluateGuestUsage(guestIp, devId);
      await evaluateGuestUsage(guestIp, devId);

      const check4 = await evaluateGuestUsage(guestIp, devId);
      expect(check4.allowed).toBe(false);
      expect(check4.remaining).toBe(0);
    });
  });

  // ==========================================
  // API Route Handler Tests
  // ==========================================
  describe("POST /api/analyze Handler", () => {
    it("returns 400 when body is invalid or empty", async () => {
      const req = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        body: JSON.stringify({ kind: "text", text: "" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("handles text analysis with mocked Gemini response", async () => {
      vi.mocked(callGeminiAnalysis).mockResolvedValueOnce({
        verdict: "scam",
        risk_score: 95,
        confidence: "high",
        scam_type: "prize",
        reasons: ["ادعاء وهمي بالفوز"],
        suspicious_phrases: ["ربحت مليون"],
        do: ["تجاهل الرسالة", "احظر الرقم", "أبلغ عن الاحتيال"],
        dont: ["لا ترسل فلوس", "لا تشارك الرمز"],
        summary: "رسالة فوز كاذبة تهدف للنصب",
        extracted_text: "",
      });

      const req = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          kind: "text",
          text: "مبروك ربحت مليون دولار من سحب زين اتصل الآن 07801234567",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.verdict).toBe("scam");
      expect(data.verdictLabelAr).toBe("نصب على الأغلب");
      expect(data.riskScore).toBeGreaterThanOrEqual(70);
      expect(data.maskedExcerpt).toContain("[هاتف]");
      expect(data.maskedExcerpt).not.toContain("07801234567");
    });

    it("falls back to degraded mode (rules only) when Gemini fails/returns null", async () => {
      vi.mocked(callGeminiAnalysis).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          kind: "text",
          text: "أرسل لي رمز التحقق الخاص بواتساب فوراً",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.degraded).toBe(true);
      expect(data.verdict).toBe("scam"); // HARD flag floors at 85
      expect(data.isUrgentAccountRisk).toBe(true);
    });

    it("analyzes link input statically without crashing", async () => {
      vi.mocked(callGeminiAnalysis).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          kind: "link",
          url: "https://bit.ly/test-fake-prize",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.urlDetails).toBeDefined();
      expect(data.urlDetails.domain).toBe("bit.ly");
    });

    it("for benign messages with verification code, adds mandatory warning and never asserts official/genuine", async () => {
      vi.mocked(callGeminiAnalysis).mockResolvedValueOnce({
        verdict: "safe",
        risk_score: 5,
        confidence: "high",
        scam_type: "none",
        reasons: ["تبدو رسالة اعتيادية ولا تحتوي على طلب مريب."],
        suspicious_phrases: [],
        do: [
          "احرص دائماً على عدم مشاركة رمز التحقق مع أي شخص.",
          "تأكد أنك أنت من طلب هذا الرمز، وإذا لم تطلبه فتجاهل الرسالة وغيّر كلمة المرور",
        ],
        dont: [
          "لا تتردد في مراجعة الإعدادات",
          "لا تشارك رمز الأمان مع أي متصل",
        ],
        summary: "تبدو رسالة اعتيادية ولا تحتوي على طلب مريب.",
        extracted_text: "",
      });

      const req = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          kind: "text",
          text: "رمز التحقق الخاص بك هو 849201. لا تشاركه مع أي شخص.",
        }),
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "192.168.10.50",
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.verdict).toBe("safe");
      expect(data.summary).toContain("تبدو رسالة اعتيادية ولا تحتوي على طلب مريب");

      // Verify the mandatory verification code caution is present
      const combinedOutput = JSON.stringify(data);
      expect(combinedOutput).toContain(
        "تأكد أنك أنت من طلب هذا الرمز، وإذا لم تطلبه فتجاهل الرسالة وغيّر كلمة المرور"
      );

      // Verify no claim of being official or genuine
      expect(combinedOutput).not.toContain("رسالة رسمية");
      expect(combinedOutput).not.toContain("رسالة حقيقية");

      // Verify "لا تتردد" item was dropped from dontList
      expect(data.dontList).toBeDefined();
      data.dontList.forEach((item: string) => {
        expect(item).not.toMatch(/^لا\s*تتردد/);
      });
      expect(data.dontList).toContain("لا تشارك رمز الأمان مع أي متصل");
    });

    it("in rules-only fallback for benign OTP message, includes mandatory verification code warning", async () => {
      vi.mocked(callGeminiAnalysis).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          kind: "text",
          text: "رمز التحقق للدخول هو 491029. لا تشارك هذا الرمز مع أحد.",
        }),
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "192.168.10.51",
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.verdict).toBe("safe");
      expect(data.degraded).toBe(true);

      const allText = JSON.stringify(data);
      expect(allText).toContain(
        "تأكد أنك أنت من طلب هذا الرمز، وإذا لم تطلبه فتجاهل الرسالة وغيّر كلمة المرور"
      );
      expect(allText).not.toContain("نظامية");
      expect(allText).not.toContain("رسمية");
    });
  });
});
