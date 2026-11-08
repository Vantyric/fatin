import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultCard } from "@/components/ResultCard";
import { HighlightedText } from "@/components/HighlightedText";
import { AnalyzeResult } from "@/lib/ai/schemas";
import { formatRemainingChecks, formatChecksCount } from "@/lib/text/plural";
import { formatWesternDate } from "@/lib/text/dateFormat";

describe("Fix 2: Safe Verdict UI and Exact Substring Highlighting", () => {
  it("does NOT render the 'العبارات المشبوهة' section for safe messages with empty suspiciousPhrases", () => {
    const safeResult: AnalyzeResult = {
      id: "safe-check-1",
      verdict: "safe",
      verdictLabelAr: "يبدو سليماً",
      riskScore: 10,
      confidence: "high",
      scamType: "none",
      summary: "رسالة عادية من صديق بدون أي طلبات مالية أو روابط مشبوهة.",
      reasons: ["الرسالة محادثة طبيعية", "لا توجد روابط أو طلبات لبيانات حساسة"],
      suspiciousPhrases: [],
      doList: [
        "يمكنك متابعة محادثتك بشكل طبيعي مع مراعاة الحذر المعتاد.",
        "احرص دائماً على عدم مشاركة أي رموز تحقق (OTP) أو كلمات سر مستقبلاً.",
        "إذا طُلب منك لاحقاً تحويل أموال أو بيانات بطاقتك، أعد الفحص هنا فوراً.",
      ],
      dontList: [
        "لا ترسل أي معلومات مالية أو صور بطاقات مصرفية مستقبلاً.",
        "لا تشارك أي رموز أمان أو كلمات مرور تصل إلى هاتفك.",
      ],
      isUrgentAccountRisk: false,
      maskedExcerpt: "مرحبا شلونك باجر نلتقي؟",
      originalText: "مرحبا شلونك باجر نلتقي؟",
      degraded: false,
      remainingDailyChecks: 2,
      createdAt: "2026-11-08T12:00:00.000Z",
    };

    render(<ResultCard result={safeResult} onReset={vi.fn()} />);

    // Verify "العبارات المشبوهة" header does NOT exist in the document
    expect(screen.queryByText(/العبارات المشبوهة/i)).not.toBeInTheDocument();

    // Verify safe do/dont list is displayed
    expect(
      screen.getByText("يمكنك متابعة محادثتك بشكل طبيعي مع مراعاة الحذر المعتاد.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("لا ترسل أي معلومات مالية أو صور بطاقات مصرفية مستقبلاً.")
    ).toBeInTheDocument();

    // Verify generic scam warning is NOT rendered
    expect(
      screen.queryByText(/تحت وطأة الخوف أو الاستعجال/i)
    ).not.toBeInTheDocument();
  });

  it("does NOT render 'العبارات المشبوهة' if suspicious phrases are not substrings of input", () => {
    const resultWithPhantomPhrases: AnalyzeResult = {
      id: "phantom-phrases-check",
      verdict: "suspicious",
      verdictLabelAr: "مشبوه، انتبه",
      riskScore: 50,
      confidence: "medium",
      scamType: "other",
      summary: "رسالة غير واضحة",
      reasons: ["طلب غير معتاد"],
      suspiciousPhrases: ["كلمة غير موجودة في النص إطلاقاً"],
      doList: ["تريث وتحقق", "لا تتسرع", "تأكد من هوية المرسل"],
      dontList: ["لا ترسل معلومات", "لا تضغط روابط"],
      isUrgentAccountRisk: false,
      maskedExcerpt: "سلام عليكم نريد نلتقي بخصوص العمل",
      originalText: "سلام عليكم نريد نلتقي بخصوص العمل",
      degraded: false,
      remainingDailyChecks: 1,
      createdAt: "2026-11-08T12:00:00.000Z",
    };

    render(<ResultCard result={resultWithPhantomPhrases} onReset={vi.fn()} />);

    // Since the phrase is not a substring of the text, the section should NOT be rendered
    expect(screen.queryByText(/العبارات المشبوهة/i)).not.toBeInTheDocument();
  });

  it("HighlightedText only highlights phrases that are exact substrings of the input", () => {
    const text = "مبروك ربحت 1000 دولار مع شركة زين ارسل الرمز الآن";
    const phrases = ["ربحت 1000 دولار", "جائزة وهمية غير موجودة", "ارسل الرمز"];

    const { container } = render(<HighlightedText text={text} phrases={phrases} />);

    // Check highlighted <mark> elements
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(2);
    expect(marks[0].textContent).toBe("ربحت 1000 دولار");
    expect(marks[1].textContent).toBe("ارسل الرمز");

    // The phantom phrase should not appear in any mark
    marks.forEach((mark) => {
      expect(mark.textContent).not.toBe("جائزة وهمية غير موجودة");
    });
  });
});

describe("Fix 3: Arabic Plural, Western Dates, and Normal Font", () => {
  it("formats remaining checks with proper Arabic plural grammar", () => {
    // 1 check -> فحص واحد متبقٍ اليوم
    expect(formatRemainingChecks(1)).toBe("فحص واحد متبقٍ اليوم");
    // 2 checks -> فحصان متبقيان اليوم
    expect(formatRemainingChecks(2)).toBe("فحصان متبقيان اليوم");
    // 3-10 checks -> باقي لك X فحوصات اليوم
    expect(formatRemainingChecks(3)).toBe("باقي لك 3 فحوصات اليوم");
    expect(formatRemainingChecks(5)).toBe("باقي لك 5 فحوصات اليوم");
    expect(formatRemainingChecks(10)).toBe("باقي لك 10 فحوصات اليوم");
    // 11+ checks -> باقي لك X فحصاً اليوم
    expect(formatRemainingChecks(11)).toBe("باقي لك 11 فحصاً اليوم");
  });

  it("formats check count phrases correctly", () => {
    expect(formatChecksCount(1)).toBe("فحص واحد");
    expect(formatChecksCount(2)).toBe("فحصان");
    expect(formatChecksCount(3)).toBe("3 فحوصات");
    expect(formatChecksCount(12)).toBe("12 فحصاً");
  });

  it("formats dates using Western digits (2026/11/8) instead of Eastern Arabic-Indic numerals", () => {
    const date = new Date(2026, 10, 8); // 8 Nov 2026
    const formatted = formatWesternDate(date);
    expect(formatted).toBe("2026/11/8");

    // Verify it contains standard ASCII digits
    expect(/^[0-9/]+$/.test(formatted)).toBe(true);
    // Verify it does NOT contain Eastern Arabic digits
    expect(/[\u0660-\u0669]/.test(formatted)).toBe(false);
  });

  it("renders Western date and dual plural in ResultCard", () => {
    const mockResult: AnalyzeResult = {
      id: "result-polish-test",
      verdict: "scam",
      verdictLabelAr: "نصب على الأغلب",
      riskScore: 90,
      confidence: "high",
      scamType: "otp_takeover",
      summary: "محاولة احتيال لسرقة كود الواتساب",
      reasons: ["طلب رمز التحقق"],
      suspiciousPhrases: ["ارسل الكود"],
      doList: ["لا ترسل الرمز", "احظر الرقم", "سجل الخروج"],
      dontList: ["لا تشارك الكود", "لا تضغط الروابط"],
      isUrgentAccountRisk: true,
      maskedExcerpt: "ارسل الكود",
      originalText: "ارسل الكود بسرعة",
      degraded: false,
      remainingDailyChecks: 2,
      createdAt: "2026-11-08T10:00:00.000Z",
    };

    const { container } = render(<ResultCard result={mockResult} onReset={vi.fn()} />);

    // Verify plural: 2 remaining checks displayed as dual
    expect(screen.getByText("فحصان متبقيان اليوم")).toBeInTheDocument();

    // Verify date is formatted with Western digits
    expect(screen.getByText(/تاريخ الفحص: 2026\/11\/8/)).toBeInTheDocument();

    // Verify the container for highlighted text does not have font-mono
    const highlightedContainer = container.querySelector(".overflow-y-auto");
    expect(highlightedContainer).not.toBeNull();
    expect(highlightedContainer?.classList.contains("font-mono")).toBe(false);
  });
});
