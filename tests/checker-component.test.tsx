import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CheckerCard } from "@/components/CheckerCard";
import { ResultCard } from "@/components/ResultCard";
import { AnalyzeResult } from "@/lib/ai/schemas";

describe("Phase 4: Checker & Result UI Component States", () => {
  it("renders empty checker state with disabled submit button", () => {
    const handleResult = vi.fn();
    render(<CheckerCard onResult={handleResult} />);

    // Verify tabs are rendered
    expect(screen.getByRole("tab", { name: /نص/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /رابط/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /صورة/i })).toBeInTheDocument();

    // Verify textarea is empty and counter shows 0 / 4000
    const textarea = screen.getByRole("textbox", { name: /نص الرسالة المشبوهة/i });
    expect(textarea).toHaveValue("");
    expect(screen.getByText("0 / 4000")).toBeInTheDocument();

    // Verify submit button is disabled when input is empty
    const submitBtn = screen.getByRole("button", { name: /افحص الآن/i });
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit button and updates text when a sample chip is clicked", () => {
    const handleResult = vi.fn();
    render(<CheckerCard onResult={handleResult} />);

    // Click on a sample chip
    const chip = screen.getByRole("button", { name: /سحب جوائز وهمية/i });
    fireEvent.click(chip);

    // Textarea should now be populated
    const textarea = screen.getByRole("textbox", { name: /نص الرسالة المشبوهة/i });
    expect(textarea).not.toHaveValue("");
    expect((textarea as HTMLTextAreaElement).value).toContain("مبروك! تم اختيار رقمك");

    // Submit button should now be enabled
    const submitBtn = screen.getByRole("button", { name: /افحص الآن/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it("switches between Text, Link, and Image tabs", () => {
    const handleResult = vi.fn();
    render(<CheckerCard onResult={handleResult} />);

    // Switch to Link tab
    const linkTab = screen.getByRole("tab", { name: /رابط/i });
    fireEvent.click(linkTab);
    expect(screen.getByPlaceholderText(/example.com\/claim-prize/i)).toBeInTheDocument();

    // Switch to Image tab
    const imageTab = screen.getByRole("tab", { name: /صورة/i });
    fireEvent.click(imageTab);
    expect(screen.getByText(/اضغط لرفع لقطة شاشة/i)).toBeInTheDocument();
  });

  it("renders ResultCard with verdict banner, reasons, and calls onReset", () => {
    const handleReset = vi.fn();
    const mockResult: AnalyzeResult = {
      id: "test-check-1",
      verdict: "scam",
      verdictLabelAr: "نصب على الأغلب",
      riskScore: 92,
      confidence: "high",
      scamType: "otp_takeover",
      summary: "رسالة احتيالية لسرقة حسابك عبر كود التحقق",
      reasons: ["طلب مباشر لكود التحقق", "استعجال وضغط نفسي"],
      suspiciousPhrases: ["دزلي الكود"],
      doList: ["لا ترسل الكود لأحد", "سجل خروج الأجهزة الغريبة", "فعّل التحقق بخطوتين"],
      dontList: ["لا تشارك رمزك", "لا تضغط روابط"],
      isUrgentAccountRisk: true,
      maskedExcerpt: "دزلي الكود اللي وصلك [رمز]",
      originalText: "دزلي الكود اللي وصلك 592810",
      degraded: false,
      remainingDailyChecks: 2,
      createdAt: new Date().toISOString(),
    };

    render(<ResultCard result={mockResult} onReset={handleReset} />);

    // Verify verdict banner
    expect(screen.getByText("نصب على الأغلب")).toBeInTheDocument();
    expect(screen.getByText("دقة عالية")).toBeInTheDocument();

    // Verify urgent safety box is shown
    expect(screen.getByText(/إجراء أمني عاجل لحماية حسابك وأموالك/i)).toBeInTheDocument();

    // Verify reasons are rendered
    expect(screen.getByText("طلب مباشر لكود التحقق")).toBeInTheDocument();

    // Verify action buttons
    const resetBtn = screen.getByRole("button", { name: /فحص رسالة ثانية/i });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
