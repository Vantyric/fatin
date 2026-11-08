import { describe, it, expect, vi, beforeEach } from "vitest";
import { callGeminiAnalysis } from "@/lib/ai/gemini";

// Mock @google/genai
vi.mock("@google/genai", () => {
  return {
    Type: {
      OBJECT: "OBJECT",
      STRING: "STRING",
      INTEGER: "INTEGER",
      ARRAY: "ARRAY",
    },
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: vi.fn().mockImplementation(({ model }) => {
            // Simulate 404 for obsolete/missing model like gemini-2.5-flash
            if (model === "gemini-2.5-flash" || model === "obsolete-model") {
              const error: any = new Error("This model models/gemini-2.5-flash is no longer available to new users.");
              error.status = 404;
              throw error;
            }

            // Fallback model succeeds
            return Promise.resolve({
              text: JSON.stringify({
                verdict: "scam",
                risk_score: 95,
                confidence: "high",
                scam_type: "otp_takeover",
                reasons: ["طلب رمز التحقق"],
                suspicious_phrases: ["دزلي الكود"],
                do: ["لا ترسل الكود لأحد", "احظر الرقم", "سجل الخروج من الأجهزة المرتبطة"],
                dont: ["لا تشارك رمزك", "لا تضغط روابط"],
                summary: "محاولة اختراق الحساب عبر كود التحقق",
                extracted_text: "",
              }),
            });
          }),
        },
      };
    }),
  };
});

describe("Gemini Model Fallback and Error Resilience", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = "test-gemini-key";
  });

  it("falls back to working model if configured model returns 404", async () => {
    // Configure an obsolete/missing model
    process.env.GEMINI_MODEL = "gemini-2.5-flash";

    const result = await callGeminiAnalysis({
      text: "دزلي الكود اللي وصلك هسه على رقمك",
    });

    // Should not be null because fallback model succeeded
    expect(result).not.toBeNull();
    expect(result?.verdict).toBe("scam");
    expect(result?.scam_type).toBe("otp_takeover");
    expect(result?.risk_score).toBe(95);
  });

  it("returns null gracefully if GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;

    const result = await callGeminiAnalysis({
      text: "أي نص للفحص",
    });

    expect(result).toBeNull();
  });
});
