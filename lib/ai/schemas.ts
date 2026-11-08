import { z } from "zod";

export const AnalyzeRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    text: z.string().min(1, "يرجى كتابة أو لصق النص أولاً").max(4000, "النص طويل جداً (الحد الأقصى 4000 حرف)"),
  }),
  z.object({
    kind: z.literal("link"),
    url: z.string().min(1, "يرجى إدخال الرابط المراد فحصه").max(2048, "الرابط طويل جداً"),
  }),
  z.object({
    kind: z.literal("image"),
    imageBase64: z.string().min(1, "يرجى اختيار صورة صالحة"),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"], {
      errorMap: () => ({ message: "نوع الصورة غير مدعوم (فقط JPG، PNG، WEBP)" }),
    }),
    extractedQr: z.string().optional(),
  }),
]);

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const SCAM_TYPES = [
  "prize",
  "job",
  "otp_takeover",
  "bank_impersonation",
  "delivery_fee",
  "investment",
  "family_impersonation",
  "sextortion",
  "phishing_link",
  "remote_access",
  "malicious_app",
  "ussd_forwarding",
  "qr_phishing",
  "fake_payment_proof",
  "overpayment",
  "romance_investment",
  "advance_fee",
  "toad_callback",
  "brand_homoglyph",
  "crypto_drainer",
  "oauth_consent",
  "task_scam",
  "other",
  "none",
] as const;

export type ScamTypeEnum = typeof SCAM_TYPES[number];

export const ATTACK_TACTICS = [
  "urgency",
  "authority",
  "fear",
  "greed",
  "trust",
  "isolation",
] as const;

export type AttackTactic = typeof ATTACK_TACTICS[number];

export const GeminiResponseSchema = z.object({
  verdict: z.enum(["safe", "suspicious", "scam"]),
  risk_score: z.number().min(0).max(100),
  confidence: z.enum(["high", "medium", "low"]),
  scam_type: z.enum(SCAM_TYPES),
  reasons: z.array(z.string()).max(8).optional().default([]),
  suspicious_phrases: z.array(z.string()).max(12).optional().default([]),
  do: z.array(z.string()).max(8).optional().default([]),
  dont: z.array(z.string()).max(8).optional().default([]),
  summary: z.string().max(300),
  attacker_goal: z.string().optional(),
  requested_action: z.string().optional(),
  worst_case_if_complied: z.string().optional(),
  tactics: z.array(z.enum(ATTACK_TACTICS)).optional(),
  red_flags: z.array(z.string()).optional(),
  green_flags: z.array(z.string()).optional(),
  how_to_verify: z.string().optional(),
  extracted_text: z.string().optional(),
});

export type GeminiAnalysis = z.infer<typeof GeminiResponseSchema>;

export const AnalyzeResultSchema = z.object({
  id: z.string(),
  verdict: z.enum(["safe", "suspicious", "scam"]),
  verdictLabelAr: z.string(),
  riskScore: z.number().min(0).max(100),
  confidence: z.enum(["high", "medium", "low"]),
  scamType: z.enum(SCAM_TYPES),
  summary: z.string(),
  reasons: z.array(z.string()),
  suspiciousPhrases: z.array(z.string()),
  doList: z.array(z.string()),
  dontList: z.array(z.string()),
  attackerGoal: z.string().optional(),
  requestedAction: z.string().optional(),
  worstCaseIfComplied: z.string().optional(),
  tactics: z.array(z.enum(ATTACK_TACTICS)).optional(),
  redFlags: z.array(z.string()).optional(),
  greenFlags: z.array(z.string()).optional(),
  howToVerify: z.string().optional(),
  appliedFloors: z.array(z.string()).optional(),
  isUrgentAccountRisk: z.boolean(),
  maskedExcerpt: z.string(),
  originalText: z.string().optional(),
  extractedText: z.string().optional(),
  deepPassRan: z.boolean().optional(),
  turningPointQuote: z.string().optional(),
  turningPointExplanationAr: z.string().optional(),
  campaignSeenCount: z.number().optional(),
  isKnownCampaign: z.boolean().optional(),
  isBrandSpoofing: z.boolean().optional(),
  spoofedBrand: z.string().optional(),
  urlDetails: z
    .object({
      domain: z.string(),
      flags: z.array(
        z.object({
          type: z.string(),
          severity: z.enum(["high", "medium", "low"]),
          description: z.string(),
        })
      ),
      domainAgeDays: z.number().optional(),
      isNewDomain: z.boolean().optional(),
      isLookalike: z.boolean().optional(),
      isHomoglyphAttack: z.boolean().optional(),
      isBrandSpoofing: z.boolean().optional(),
      impersonatedBrand: z.string().optional(),
      unshortenedUrl: z.string().optional(),
      lookalikeTarget: z.string().optional(),
    })
    .optional(),
  degraded: z.boolean().optional(),
  remainingDailyChecks: z.number(),
  createdAt: z.string(),
});

export type AnalyzeResult = z.infer<typeof AnalyzeResultSchema>;
