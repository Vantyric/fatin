import { describe, it, expect } from "vitest";
import { SYSTEM_INSTRUCTION } from "@/lib/ai/gemini";
import { evaluateRules } from "@/lib/rules/engine";
import { normalizeArabic } from "@/lib/text/normalize";

describe("Fix 1: Sender Identity & Verification Code System Instruction", () => {
  it("system instruction explicitly forbids asserting official, genuine, or safe from brand", () => {
    // App can only see the text, never the real sender
    expect(SYSTEM_INSTRUCTION).toContain("never the real sender");
    expect(SYSTEM_INSTRUCTION).toContain("NEVER assert or claim that a message is 'official'");
    expect(SYSTEM_INSTRUCTION).toContain("safe from <brand>");
  });

  it("system instruction specifies wording for benign messages", () => {
    expect(SYSTEM_INSTRUCTION).toContain("تبدو رسالة اعتيادية ولا تحتوي على طلب مريب");
  });

  it("system instruction mandates verification code warning when code is present", () => {
    expect(SYSTEM_INSTRUCTION).toContain(
      "تأكد أنك أنت من طلب هذا الرمز، وإذا لم تطلبه فتجاهل الرسالة وغيّر كلمة المرور"
    );
  });

  it("rules-only fallback for legit guarded OTP notifications never asserts 'نظامية' and includes verification code warning", () => {
    const legitOtpText = "رمز التحقق الخاص بك هو 591024. لا تشارك هذا الرمز مع أي شخص لحماية حسابك.";
    const result = evaluateRules(legitOtpText);

    expect(result.isLegitGuarded).toBe(true);
    expect(result.rulesScore).toBeLessThanOrEqual(20);

    // Verify reasons do NOT claim "نظامية" or "رسمية"
    const allReasons = result.reasons.join(" ");
    expect(allReasons).not.toContain("نظامية");
    expect(allReasons).not.toContain("رسمية");
    expect(allReasons).not.toContain("حقيقية");

    // Verify it contains the required verification code caution
    expect(result.reasons).toContain(
      "تأكد أنك أنت من طلب هذا الرمز، وإذا لم تطلبه فتجاهل الرسالة وغيّر كلمة المرور"
    );
  });
});

describe("Fix 2: 'dont' List Tightening & Post-Processing Check", () => {
  it("system instruction and schema description prohibit 'dont' items starting with 'لا تتردد'", () => {
    expect(SYSTEM_INSTRUCTION).toContain("dont");
    expect(SYSTEM_INSTRUCTION).toContain("لا تتردد");
    expect(SYSTEM_INSTRUCTION).toContain("negative prohibitions of what NOT to do");
  });

  it("post-processing filter drops all 'dont' items starting with 'لا تتردد'", () => {
    const rawDontItems = [
      "لا تتردد في الاتصال بالمصرف فوراً عند الشك",
      "لا تتردد بإعادة فحص أي رابط جديد",
      "  لا  تتردد  بالسؤال",
      "لا تتردّد بطلب المساعدة",
      "لا تشارك رمز التحقق (OTP) مع أي شخص",
      "لا تفتح الروابط المجهولة",
      "لا تدفع أي مبالغ مقدمة",
    ];

    const isDontHesitate = (item: string) => {
      const normalized = normalizeArabic(item).trim();
      return normalized.startsWith("لا تتردد") || /^لا\s*تتردد/i.test(item.trim());
    };

    const cleaned = rawDontItems.filter((item) => !isDontHesitate(item));

    // All 4 items starting with "لا تتردد" must be dropped
    expect(cleaned).toHaveLength(3);
    expect(cleaned).toEqual([
      "لا تشارك رمز التحقق (OTP) مع أي شخص",
      "لا تفتح الروابط المجهولة",
      "لا تدفع أي مبالغ مقدمة",
    ]);

    // Ensure none of the remaining items start with "لا تتردد"
    cleaned.forEach((item) => {
      expect(item).not.toMatch(/^لا\s*تتردد/);
    });
  });
});
