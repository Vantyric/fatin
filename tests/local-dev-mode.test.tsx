import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { isSupabaseConfigured, isSupabaseServerConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { POST } from "@/app/api/analyze/route";
import { resetInMemoryUsageForTesting } from "@/lib/security/rateLimiter";
import { NextRequest } from "next/server";

// Mock Gemini
vi.mock("@/lib/ai/gemini", () => ({
  callGeminiAnalysis: vi.fn(),
  callTwoTierGeminiAnalysis: vi.fn().mockResolvedValue({ analysis: null, deepPassRan: false }),
}));

import { callGeminiAnalysis } from "@/lib/ai/gemini";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Local Development Mode (Without Supabase)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Ensure Supabase env vars are undefined
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetInMemoryUsageForTesting();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Supabase Configuration Detector", () => {
    it("reports false when Supabase environment variables are missing", () => {
      expect(isSupabaseConfigured()).toBe(false);
      expect(isSupabaseServerConfigured()).toBe(false);
    });

    it("reports false when Supabase environment variables contain placeholder values", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "your-anon-key";
      expect(isSupabaseConfigured()).toBe(false);
    });

    it("reports true when valid Supabase environment variables are present", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcdefghijk.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "valid-anon-key-123";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "valid-service-key-456";

      expect(isSupabaseConfigured()).toBe(true);
      expect(isSupabaseServerConfigured()).toBe(true);
    });

    it("createClient throws an informative error in local mode instead of silent failure", () => {
      expect(() => createClient()).toThrow(/Supabase is not configured.*local development mode/i);
    });
  });

  describe("Header UI in Local Development Mode", () => {
    it("hides login and history buttons when Supabase is missing", () => {
      render(<Header />);

      // Login and history buttons must be hidden
      expect(screen.queryByRole("link", { name: /تسجيل الدخول/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /السجل والحساب/i })).not.toBeInTheDocument();

      // Navigation links to static pages remain visible
      expect(screen.getByRole("link", { name: /أنواع النصب/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /الخصوصية/i })).toBeInTheDocument();

      // Local mode indicator is present
      expect(screen.getByText("وضع محلي")).toBeInTheDocument();
    });

    it("shows login button when Supabase env vars are present", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcdefghijk.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "valid-anon-key-123";

      render(<Header />);

      expect(screen.getByRole("link", { name: /تسجيل الدخول/i })).toBeInTheDocument();
      expect(screen.queryByText("وضع محلي")).not.toBeInTheDocument();
    });
  });

  describe("API & Rate Limiting in Local Development Mode", () => {
    it("runs /api/analyze successfully with only GEMINI_API_KEY and RATE_LIMIT_SALT", async () => {
      process.env.RATE_LIMIT_SALT = "test-salt-123";
      process.env.GEMINI_API_KEY = "test-gemini-key";

      vi.mocked(callGeminiAnalysis).mockResolvedValueOnce({
        verdict: "scam",
        risk_score: 90,
        confidence: "high",
        scam_type: "prize",
        reasons: ["رسالة جائزة كاذبة"],
        suspicious_phrases: ["مبروك ربحت"],
        do: ["تجاهل الرسالة", "احظر الرقم", "أبلغ عن الاحتيال"],
        dont: ["لا ترسل أموال", "لا تشارك الرمز"],
        summary: "رسالة فوز احتيالية تهدف للنصب",
        extracted_text: "",
      });

      const req = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          kind: "text",
          text: "مبروك ربحت سيارة تواصل لاستلام جائزتك 07801234567",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.verdict).toBe("scam");
      expect(data.riskScore).toBeGreaterThanOrEqual(70);
      expect(data.remainingDailyChecks).toBe(2); // 3 - 1 = 2
    });

    it("enforces in-memory rate limiting without database and without login suggestion", async () => {
      process.env.RATE_LIMIT_SALT = "test-salt-rate-limit";
      vi.mocked(callGeminiAnalysis).mockResolvedValue({
        verdict: "safe",
        risk_score: 10,
        confidence: "high",
        scam_type: "none",
        reasons: ["رسالة عادية"],
        suspicious_phrases: [],
        do: ["لا تفعل شيئاً", "كن حذراً", "تأكد من المصدر"],
        dont: ["لا تشارك أرقامك", "لا تفتح روابط مجهولة"],
        summary: "رسالة عادية سليمة",
        extracted_text: "",
      });

      // Use consistent IP & device cookie to trigger limit
      const headers = {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.19",
      };

      // Check 1: Allowed (remaining 2)
      const req1 = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        body: JSON.stringify({ kind: "text", text: "رسالة رقم 1" }),
        headers,
      });
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);

      // Check 2: Allowed (remaining 1)
      const req2 = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        body: JSON.stringify({ kind: "text", text: "رسالة رقم 2" }),
        headers,
      });
      const res2 = await POST(req2);
      expect(res2.status).toBe(200);

      // Check 3: Allowed (remaining 0)
      const req3 = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        body: JSON.stringify({ kind: "text", text: "رسالة رقم 3" }),
        headers,
      });
      const res3 = await POST(req3);
      expect(res3.status).toBe(200);

      // Check 4: Blocked with 429
      const req4 = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        body: JSON.stringify({ kind: "text", text: "رسالة رقم 4 بعد انتهاء الرصيد" }),
        headers,
      });
      const res4 = await POST(req4);
      expect(res4.status).toBe(429);

      const errData = await res4.json();
      expect(errData.remaining).toBe(0);
      // In local mode without Supabase, it should NOT prompt the user to log in!
      expect(errData.error).not.toContain("سجل دخولك");
      expect(errData.error).toContain("وصلت للحد الأقصى اليومي");
    });
  });
});
