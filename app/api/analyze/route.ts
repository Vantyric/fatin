import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { AnalyzeRequestSchema } from "@/lib/ai/schemas";
import { validateImageBase64 } from "@/lib/security/imageValidator";
import { evaluateGuestUsage, checkAndIncrementUsage } from "@/lib/security/rateLimiter";
import { maskSensitiveData } from "@/lib/text/mask";
import { analyzeUrl, extractUrlsFromText } from "@/lib/url/analyzer";
import { evaluateRules } from "@/lib/rules/engine";
import { normalizeArabic } from "@/lib/text/normalize";
import { deobfuscateAndNormalize } from "@/lib/text/advancedNormalize";
import { extractEntities } from "@/lib/text/entityExtractor";
import { extractSignals } from "@/lib/rules/signalsEngine";
import { analyzeConversation } from "@/lib/text/conversationAnalyzer";
import { recordCampaignObservation } from "@/lib/campaigns/memory";
import { callGeminiAnalysis, callTwoTierGeminiAnalysis } from "@/lib/ai/gemini";
import { combineScores } from "@/lib/scoring/combiner";
import { createServerClient } from "@supabase/ssr";

// Fallback recommendations if AI is degraded or in offline rules-only mode
const DEFAULT_DO_RECOMMENDATIONS: Record<string, string[]> = {
  otp_takeover: [
    "لا ترسل كود التحقق لأي شخص مهما ادعى قرابته أو معرفته بك.",
    "افتح تطبيق واتساب واذهب إلى (الأجهزة المرتبطة) وسجل الخروج من أي جهاز غريب.",
    "فعّل خاصية التحقق بخطوتين برقم تعريف شخصي (PIN) فوراً.",
  ],
  bank_impersonation: [
    "اتصل بالمصرف أو المحفظة عبر الرقم الرسمي المطبوع على بطاقتك فقط.",
    "غيّر كلمة مرور حسابك ورمز المحفظة فوراً من داخل التطبيق الرسمي.",
    "لا تفتح أي رابط يدعي تعليق الحساب أو الحاجة لتحديث البيانات عبر الرسائل.",
  ],
  prize: [
    "تجاهل الرسالة تماماً ولا ترسل أي رصيد أو مبالغ شحن.",
    "تحقق من المسابقات الرسمية عبر الصفحات الموثقة لشركة الاتصالات فقط.",
    "احظر الرقم وأبلغ عنه كرسالة احتيالية.",
  ],
  default: [
    "تريث ولا تتخذ أي إجراء سريع تحت وطأة الخوف أو الاستعجال.",
    "تأكد من هوية المرسل من خلال وسيلة اتصال مباشرة وموثوقة.",
    "لا تشارك أي بيانات مصرفية أو رموز سرية تصلك على هاتفك.",
  ],
};

const DEFAULT_DONT_RECOMMENDATIONS: Record<string, string[]> = {
  otp_takeover: [
    "لا تشارك رمز التحقق المكون من 6 أرقام مع أي شخص.",
    "لا تضغط على روابط إعادة تعيين الحساب المرسلة لك.",
  ],
  bank_impersonation: [
    "لا تدخل رقم بطاقتك أو الرقم السري (PIN) في أي رابط غير رسمي.",
    "لا تصدق أي تهديد بحظر حسابك عبر رسائل نصية عشوائية.",
  ],
  default: [
    "لا تدفع أي رسوم مسبقة لاستلام جوائز أو طرود مجهولة.",
    "لا تحول أموالاً لحسابات أو محافظ لأشخاص لم تتأكد من هويتهم صوتياً.",
  ],
};

const SAFE_DO_RECOMMENDATIONS = [
  "يمكنك متابعة محادثتك بشكل طبيعي مع مراعاة الحذر المعتاد.",
  "احرص دائماً على عدم مشاركة أي رموز تحقق (OTP) أو كلمات سر مستقبلاً.",
  "إذا طُلب منك لاحقاً تحويل أموال أو بيانات بطاقتك، أعد الفحص هنا فوراً.",
];

const SAFE_DONT_RECOMMENDATIONS = [
  "لا ترسل أي معلومات مالية أو صور بطاقات مصرفية مستقبلاً.",
  "لا تشارك أي رموز أمان أو كلمات مرور تصل إلى هاتفك.",
];

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & Validate incoming JSON body
    let bodyJson: unknown;
    try {
      bodyJson = await req.json();
    } catch {
      return NextResponse.json(
        { error: "طلب غير صالح، يرجى التحقق من المدخلات" },
        { status: 400 }
      );
    }

    const parseResult = AnalyzeRequestSchema.safeParse(bodyJson);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || "بيانات الإدخال غير صالحة";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const payload = parseResult.data;

    // Check if client requested streaming SSE response
    const wantsStream =
      req.headers.get("accept")?.includes("text/event-stream") ||
      req.nextUrl?.searchParams?.get("stream") === "true" ||
      Boolean((payload as any).stream);

    // 2. Identify client device & IP
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    let deviceId = req.cookies.get("fatin_did")?.value;
    let setDeviceCookie = false;
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      setDeviceCookie = true;
    }

    // 3. Optional Supabase Auth & Usage Check
    let userId: string | null = null;
    let userPlan = "free";
    let saveHistory = false;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const isSupabaseConfigured = Boolean(
      supabaseUrl &&
      anonKey &&
      !supabaseUrl.includes("your-project.supabase.co")
    );

    if (isSupabaseConfigured && supabaseUrl && anonKey) {
      try {
        const supabase = createServerClient(supabaseUrl, anonKey, {
          cookies: {
            getAll() {
              return req.cookies.getAll();
            },
            setAll() {},
          },
        });

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          userId = user.id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("plan, save_history")
            .eq("id", user.id)
            .single();

          if (profile) {
            userPlan = profile.plan || "free";
            saveHistory = !!profile.save_history;
          }
        }
      } catch {
        // Continue gracefully if Supabase auth call fails
      }
    }

    // 4. Rate Limiting Check
    let rateLimitResult;
    if (userId) {
      const userLimit = userPlan === "pro" ? 100 : 10;
      rateLimitResult = await checkAndIncrementUsage(`user:${userId}`, userLimit);
    } else {
      rateLimitResult = await evaluateGuestUsage(clientIp, deviceId);
    }

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error:
            userId
              ? "وصلت للحد الأقصى اليومي للفحوصات لحسابك. يتجدد الرصيد عند منتصف الليل بتوقيت بغداد."
              : isSupabaseConfigured
              ? "وصلت للحد الأقصى اليومي المسموح للزوار (3 فحوصات اليوم). سجل دخولك مجاناً لرفع رصيدك إلى 10 فحوصات يومياً."
              : "وصلت للحد الأقصى اليومي المسموح به (3 فحوصات اليوم). يتجدد الرصيد عند منتصف الليل بتوقيت بغداد.",
          limit: rateLimitResult.limit,
          remaining: 0,
          resetSeconds: rateLimitResult.resetSeconds,
        },
        { status: 429 }
      );
    }

    // Helper to run the entire analysis pipeline
    const executeAnalysis = async (
      onProgress?: (stage: "normalizing" | "urls" | "intent" | "deep", label: string) => void
    ) => {
      // Step A: Normalization & Pre-Masking Entity Extraction
      if (onProgress) onProgress("normalizing", "جاري تدقيق المدخلات والتحقق من الروابط…");

      let textToAnalyze = "";
      let rawTextForEntities = "";
      let extractedText = "";
      let urlDetails: {
        domain: string;
        unshortenedUrl?: string;
        domainAgeDays?: number;
        isNewDomain?: boolean;
        isLookalike?: boolean;
        impersonatedBrand?: string;
        isHomoglyphAttack?: boolean;
        isBrandSpoofing?: boolean;
        spoofedBrand?: string;
        flags: any[];
      } | undefined;
      let urlRisk = 0;
      let urlAnalysisResult: any = null;

      if (payload.kind === "text") {
        rawTextForEntities = payload.text;
        const deobfuscated = deobfuscateAndNormalize(payload.text);
        const mask = maskSensitiveData(deobfuscated);
        textToAnalyze = mask.maskedText;

        const extractedUrls = extractUrlsFromText(payload.text);
        if (extractedUrls.length > 0) {
          if (onProgress) onProgress("urls", "نفحص أمان الروابط والنطاقات…");
          urlAnalysisResult = await analyzeUrl(extractedUrls[0]);
          urlDetails = {
            domain: urlAnalysisResult.domain,
            unshortenedUrl: urlAnalysisResult.unshortenedUrl,
            domainAgeDays: urlAnalysisResult.rdap?.domainAgeDays,
            isNewDomain: urlAnalysisResult.rdap?.isNewDomain,
            isLookalike: urlAnalysisResult.lookalike?.isLookalike,
            impersonatedBrand: urlAnalysisResult.lookalike?.targetBrandAr,
            isHomoglyphAttack: urlAnalysisResult.isHomoglyphAttack,
            isBrandSpoofing: urlAnalysisResult.isBrandSpoofing,
            spoofedBrand: urlAnalysisResult.spoofedBrand,
            flags: urlAnalysisResult.flags,
          };
          urlRisk = urlAnalysisResult.riskContribution;
        }
      } else if (payload.kind === "link") {
        if (onProgress) onProgress("urls", "نفحص أمان الرابط والنطاق…");
        urlAnalysisResult = await analyzeUrl(payload.url);
        urlDetails = {
          domain: urlAnalysisResult.domain,
          unshortenedUrl: urlAnalysisResult.unshortenedUrl,
          domainAgeDays: urlAnalysisResult.rdap?.domainAgeDays,
          isNewDomain: urlAnalysisResult.rdap?.isNewDomain,
          isLookalike: urlAnalysisResult.lookalike?.isLookalike,
          impersonatedBrand: urlAnalysisResult.lookalike?.targetBrandAr,
          isHomoglyphAttack: urlAnalysisResult.isHomoglyphAttack,
          isBrandSpoofing: urlAnalysisResult.isBrandSpoofing,
          spoofedBrand: urlAnalysisResult.spoofedBrand,
          flags: urlAnalysisResult.flags,
        };
        urlRisk = urlAnalysisResult.riskContribution;
        rawTextForEntities = `رابط للفحص: ${urlAnalysisResult.normalizedUrl}. النطاق هو: ${urlAnalysisResult.domain}.`;
        textToAnalyze = `${rawTextForEntities} علامات الخطر المكتشفة: ${urlAnalysisResult.flags.map((f: any) => f.description).join("، ")}`;
      } else if (payload.kind === "image") {
        const imgValidation = validateImageBase64(payload.imageBase64, payload.mimeType);
        if (!imgValidation.valid) {
          throw new Error(imgValidation.errorAr || "نوع الصورة غير صالح");
        }
        if (payload.extractedQr) {
          rawTextForEntities = `رمز QR مستخرج: ${payload.extractedQr}`;
          textToAnalyze = rawTextForEntities;
        }
      }

      // Step B: Entity Extraction BEFORE masking
      const entities = extractEntities(rawTextForEntities || textToAnalyze);

      // Step C: Conversation Trajectory Analysis
      const convAnalysis = analyzeConversation(textToAnalyze);

      // Step D: Signals Engine
      const signalsReport = extractSignals(textToAnalyze, entities);
      const signals = signalsReport.signals;
      const signalsScore = Math.min(100, signals.reduce((sum, s) => sum + s.weight, 0));

      // Legacy rules for fallback
      const rulesResult = evaluateRules(textToAnalyze);
      const effectiveRulesScore = Math.max(
        signalsScore,
        rulesResult.rulesScore,
        urlRisk
      );

      // Step E: Privacy-Preserving Campaign Memory
      const campaign = await recordCampaignObservation({
        text: textToAnalyze,
        domain: urlDetails?.domain,
        clientIp,
      });

      // Step F: Call Gemini AI (Two-Tier Analysis)
      let aiResult: any = null;
      let deepPassRan = false;
      let degraded = false;

      try {
        if (onProgress) onProgress("intent", "نحلل النية وسلوك الرسالة بالمحرك الأمني الاستباقي…");

        if (typeof callTwoTierGeminiAnalysis === "function") {
          const twoTierRes = await callTwoTierGeminiAnalysis({
            text: textToAnalyze || undefined,
            image: payload.kind === "image" ? {
              base64Data: payload.imageBase64,
              mimeType: payload.mimeType,
            } : undefined,
            extractedQr: payload.kind === "image" ? payload.extractedQr : undefined,
            entities,
            signalsReport: signalsReport,
            isConversation: convAnalysis.isConversation,
            conversationTrajectory: convAnalysis.trajectory?.stages?.map((s) => s.stage).join(" -> "),
            onProgress: (stage, label) => {
              if (onProgress && stage === "deep") {
                onProgress("deep", "نتعمق أكثر بالتحليل لضمان أعلى دقة…");
              }
            },
          });

          if (twoTierRes?.analysis) {
            aiResult = twoTierRes.analysis;
            deepPassRan = twoTierRes.deepPassRan;
          }
        }
      } catch (err) {
        console.error("[Fatin API] Two-tier AI error, attempting fallback:", err);
      }

      // Fallback single-call Gemini if two-tier failed or was mocked
      if (!aiResult && typeof callGeminiAnalysis === "function") {
        try {
          if (payload.kind === "image") {
            aiResult = await callGeminiAnalysis({
              image: {
                base64Data: payload.imageBase64,
                mimeType: payload.mimeType,
              },
            });
          } else {
            aiResult = await callGeminiAnalysis({ text: textToAnalyze });
          }
        } catch {
          // AI degraded
        }
      }

      if (!aiResult) {
        degraded = true;
      }

      if (aiResult?.extracted_text) {
        extractedText = aiResult.extracted_text;
        const extractedMask = maskSensitiveData(extractedText);
        const imageRules = evaluateRules(extractedMask.maskedText);
        rulesResult.rulesScore = Math.max(rulesResult.rulesScore, imageRules.rulesScore);
        if (imageRules.hasHardFlag) rulesResult.hasHardFlag = true;
        if (imageRules.scamType !== "none") rulesResult.scamType = imageRules.scamType;
      }

      // Step G: Evaluate Hard Floor Conditions
      const isUnsolicitedOtp = Boolean(
        !rulesResult.isLegitGuarded &&
        (signals.some((s) => s.id === "otp_takeover_request") ||
          /(?:ارسل|دز|ابعث|اعطيني|انطيني|شارك)\s*(?:لي)?\s*(?:ال)?(?:رمز|كود|otp)/i.test(textToAnalyze))
      );

      const isLookalikeWithCredentials = Boolean(
        urlDetails?.isLookalike &&
          (textToAnalyze.includes("رمز") ||
            textToAnalyze.includes("كلمة") ||
            textToAnalyze.includes("بطاق") ||
            textToAnalyze.includes("حساب"))
      );

      const isYoungDomainWithCredentials = Boolean(
        urlDetails?.isNewDomain &&
          (textToAnalyze.includes("رمز") ||
            textToAnalyze.includes("كلمة") ||
            textToAnalyze.includes("بطاق"))
      );

      const isSafeBrowsingMatch = Boolean(
        urlAnalysisResult?.flags?.some((f: any) => f.type === "safebrowsing_threat")
      );

      const isRemoteAccessOrApk = Boolean(
        (entities.remoteAccessApps && entities.remoteAccessApps.length > 0) ||
        (entities.dangerousFileTypes && entities.dangerousFileTypes.length > 0)
      );

      const isUssdForwarding = Boolean(entities.ussdCodes && entities.ussdCodes.length > 0);

      const isHomoglyphOrBrandSpoof = Boolean(
        urlAnalysisResult?.isHomoglyphAttack ||
        urlAnalysisResult?.isBrandSpoofing ||
        signals.some((s) => s.id === "brand_homoglyph_attack" || s.id === "homoglyph_attack")
      );

      const isToadInvoiceCallback = Boolean(
        signals.some((s) => s.id === "toad_callback_invoice")
      );

      const isCryptoDrainer = Boolean(
        signals.some((s) => s.id === "crypto_drainer_signature")
      );

      // Step H: Final Score Combiner (AI Leads + Hard Floors + Crowd Bonus)
      const combined = combineScores({
        aiScore: aiResult ? aiResult.risk_score : null,
        rulesScore: effectiveRulesScore,
        hasHardFlag: signalsReport.hasHardSignal || rulesResult.hasHardFlag || Boolean(urlAnalysisResult?.hasHardFlag),
        aiScamType: aiResult?.scam_type,
        rulesScamType: (signalsReport.suggestedScamType as any) || rulesResult.scamType,
        aiConfidence: aiResult?.confidence,
        urlRiskScore: urlRisk,
        crowdBonus: campaign.crowdBonus,
        hardFloors: {
          isLookalikeWithCredentials,
          isYoungDomainWithCredentials,
          isSafeBrowsingMatch,
          isUnsolicitedOtp: isUnsolicitedOtp,
          isRemoteAccessOrApk,
          isUssdForwarding,
          isHomoglyphOrBrandSpoof,
          isToadInvoiceCallback,
          isCryptoDrainer,
        },
      });

      const isSafe = combined.verdict === "safe";

      // Check for urgent account security risk box
      const isUrgentAccountRisk =
        combined.scamType === "otp_takeover" ||
        combined.scamType === "bank_impersonation" ||
        combined.isHardFlag ||
        (combined.finalScore >= 70 &&
          (textToAnalyze.includes("كود") ||
            textToAnalyze.includes("بطاق") ||
            textToAnalyze.includes("رمز") ||
            textToAnalyze.includes("محفظ") ||
            textToAnalyze.includes("حساب")));

      const VERIFICATION_CODE_WARNING =
        "تأكد أنك أنت من طلب هذا الرمز، وإذا لم تطلبه فتجاهل الرسالة وغيّر كلمة المرور";

      const originalInputText = payload.kind === "text" ? payload.text : (textToAnalyze || extractedText);
      const containsVerificationCode =
        /(?:رمز|كود|تحقق|تفعيل|تأكيد|otp|pin|verification\s*code|security\s*code)/i.test(originalInputText) ||
        /\[رمز\]/.test(textToAnalyze) ||
        rulesResult.isLegitGuarded;

      // Reasons
      const reasons = aiResult?.reasons?.length ? [...aiResult.reasons] : [...rulesResult.reasons];
      if (reasons.length === 0) {
        if (isSafe) {
          reasons.push("تبدو رسالة اعتيادية ولا تحتوي على طلب مريب.");
        } else {
          reasons.push("الرسالة تتبع أسلوباً مشابهاً لمحاولات الاحتيال الإلكتروني الشائعة.");
        }
      }

      // Never assert official, genuine, or safe from brand
      for (let i = 0; i < reasons.length; i++) {
        reasons[i] = reasons[i]
          .replace(/رسالة\s+(رسمية|حقيقية|نظامية|أصلية)/g, "رسالة اعتيادية")
          .replace(/آمنة\s+تماماً/g, "تبدو اعتيادية");
      }

      if (containsVerificationCode) {
        if (!reasons.some((r) => r.includes("تأكد أنك أنت من طلب هذا الرمز"))) {
          reasons.push(VERIFICATION_CODE_WARNING);
        }
      }

      // Suspicious phrases (empty for safe messages)
      const suspiciousPhrases = isSafe
        ? []
        : (aiResult?.suspicious_phrases?.length
            ? aiResult.suspicious_phrases
            : rulesResult.suspiciousPhrases);

      // Recommendations (do & dont)
      let doList: string[];
      let rawDontList: string[];

      if (isSafe) {
        doList =
          aiResult?.do && aiResult.do.length >= 2
            ? [...aiResult.do.slice(0, 5)]
            : [...SAFE_DO_RECOMMENDATIONS];
        rawDontList =
          aiResult?.dont && aiResult.dont.length >= 2
            ? [...aiResult.dont.slice(0, 4)]
            : [...SAFE_DONT_RECOMMENDATIONS];

        if (containsVerificationCode && !doList.some((item) => item.includes("تأكد أنك أنت من طلب هذا الرمز"))) {
          doList.unshift(VERIFICATION_CODE_WARNING);
        }
      } else {
        doList =
          aiResult?.do && aiResult.do.length >= 3
            ? [...aiResult.do.slice(0, 5)]
            : [...(DEFAULT_DO_RECOMMENDATIONS[combined.scamType] || DEFAULT_DO_RECOMMENDATIONS.default)];
        rawDontList =
          aiResult?.dont && aiResult.dont.length >= 2
            ? [...aiResult.dont.slice(0, 4)]
            : [...(DEFAULT_DONT_RECOMMENDATIONS[combined.scamType] || DEFAULT_DONT_RECOMMENDATIONS.default)];
      }

      const isDontHesitate = (item: string) => {
        const normalized = normalizeArabic(item).trim();
        return normalized.startsWith("لا تتردد") || /^لا\s*تتردد/i.test(item.trim());
      };

      let dontList = rawDontList.filter((item) => !isDontHesitate(item));

      if (dontList.length < 2) {
        const replenishmentFallbacks = isSafe
          ? SAFE_DONT_RECOMMENDATIONS
          : (DEFAULT_DONT_RECOMMENDATIONS[combined.scamType] || DEFAULT_DONT_RECOMMENDATIONS.default);
        for (const fallbackItem of replenishmentFallbacks) {
          if (!dontList.includes(fallbackItem) && !isDontHesitate(fallbackItem)) {
            dontList.push(fallbackItem);
          }
          if (dontList.length >= 2) break;
        }
      }

      let summary = aiResult?.summary;
      if (!summary) {
        if (isSafe) {
          summary = containsVerificationCode
            ? `تبدو رسالة اعتيادية ولا تحتوي على طلب مريب. ${VERIFICATION_CODE_WARNING}.`
            : "تبدو رسالة اعتيادية ولا تحتوي على طلب مريب.";
        } else if (combined.verdict === "suspicious") {
          summary = "تحتوي الرسالة على بعض العلامات غير المعتادة، ننصح بالحذر والتحقق.";
        } else {
          summary = "مؤشرات احتيال قوية تهدف لسرقة حسابك أو بياناتك المالية.";
        }
      } else {
        summary = summary
          .replace(/رسالة\s+(رسمية|حقيقية|نظامية|أصلية)/g, "رسالة اعتيادية")
          .replace(/آمنة\s+تماماً/g, "تبدو اعتيادية");

        if (isSafe && containsVerificationCode && !summary.includes("تأكد أنك أنت من طلب هذا الرمز")) {
          summary = `${summary.replace(/\.?$/, "")}. ${VERIFICATION_CODE_WARNING}.`;
        }
      }

      // Phase 5 Fields: Attack Chain & Behavior
      const attackerGoal =
        aiResult?.attacker_goal ||
        (isSafe
          ? "تواصل اعتيادي دون أهداف احتيالية واضحة."
          : "محاولة استدراج المستخدم أو الحصول على بياناته أو أمواله.");

      const requestedAction =
        aiResult?.requested_action ||
        (isSafe
          ? "لا يوجد طلب مشبوه أو تصرف غير معتاد مطلوب منك."
          : "الضغط على رابط أو إرسال بيانات حساسة أو تحويل رصيد.");

      const worstCaseIfComplied =
        aiResult?.worst_case_if_complied ||
        (isSafe
          ? "لا يوجد خطر مباشر متوقع من هذه الرسالة."
          : "اختراق حسابك الشخصي أو سحب أموال من محفظتك.");

      const tactics = aiResult?.tactics || [];

      const redFlags =
        aiResult?.red_flags && aiResult.red_flags.length > 0
          ? aiResult.red_flags
          : isSafe
          ? []
          : reasons.slice(0, 4);

      const greenFlags =
        aiResult?.green_flags && aiResult.green_flags.length > 0
          ? aiResult.green_flags
          : isSafe
          ? [
              "الرسالة لا تطلب تحويل أموال أو كشف كلمات مرور.",
              "عدم وجود روابط خارجية مجهولة أو استعجال غير مبرر.",
            ]
          : [];

      const howToVerify =
        aiResult?.how_to_verify ||
        (isSafe
          ? "إذا كانت الرسالة من شخص تعرفه، تواصل معه عبر اتصاله المعتاد للتأكد."
          : "تحقق مباشرة عبر التطبيق الرسمي للخدمة أو الاتصال بالرقم المطبوع خلف بطاقتك فقط.");

      const checkId = crypto.randomUUID();
      const maskedExcerpt = textToAnalyze.slice(0, 300);

      // Save to database only if history enabled
      if (userId && saveHistory && isSupabaseConfigured && supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const adminClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
          await adminClient.from("checks").insert({
            id: checkId,
            user_id: userId,
            kind: payload.kind,
            verdict: combined.verdict,
            risk_score: combined.finalScore,
            scam_type: combined.scamType,
            summary: summary.slice(0, 140),
            masked_excerpt: maskedExcerpt,
          });
        } catch {
          // Never fail the response if history fails
        }
      }

      const responsePayload = {
        id: checkId,
        verdict: combined.verdict,
        verdictLabelAr: combined.verdictLabelAr,
        riskScore: combined.finalScore,
        confidence: combined.confidence,
        scamType: combined.scamType,
        summary,
        reasons: reasons.slice(0, 5),
        suspiciousPhrases: suspiciousPhrases.slice(0, 8),
        doList,
        dontList,
        isUrgentAccountRisk,
        maskedExcerpt,
        originalText: payload.kind === "text" ? payload.text : undefined,
        extractedText: extractedText || undefined,
        urlDetails,
        degraded,
        remainingDailyChecks: rateLimitResult.remaining,
        createdAt: new Date().toISOString(),

        // Phase 5 Intelligence Fields:
        attackerGoal,
        requestedAction,
        worstCaseIfComplied,
        tactics,
        redFlags: redFlags.slice(0, 5),
        greenFlags: greenFlags.slice(0, 5),
        howToVerify,
        deepPassRan,
        turningPointQuote: convAnalysis.turningPointQuote || undefined,
        campaignSeenCount: campaign.seenCount,
        isKnownCampaign: campaign.isKnownCampaign,
        appliedFloors: combined.appliedFloors,
        isBrandSpoofing: isHomoglyphOrBrandSpoof || Boolean(urlAnalysisResult?.isBrandSpoofing),
        spoofedBrand: urlAnalysisResult?.spoofedBrand,
      };

      return responsePayload;
    };

    // If client requested SSE streaming:
    if (wantsStream) {
      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();

      const sendEvent = async (event: string, data: any) => {
        try {
          await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      // Run async background processing writing to stream
      (async () => {
        try {
          const finalResult = await executeAnalysis(async (stage, label) => {
            await sendEvent("stage", { stage, label });
          });
          await sendEvent("done", finalResult);
        } catch (err: any) {
          await sendEvent("error", { error: err?.message || "حدث خطأ أثناء الفحص" });
        } finally {
          await writer.close();
        }
      })();

      const headers = new Headers({
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      });

      if (setDeviceCookie && deviceId) {
        headers.set(
          "Set-Cookie",
          `fatin_did=${deviceId}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${
            process.env.NODE_ENV === "production" ? "; Secure" : ""
          }`
        );
      }

      return new Response(stream.readable, { headers });
    }

    // Standard synchronous JSON response:
    const responsePayload = await executeAnalysis();
    const response = NextResponse.json(responsePayload, { status: 200 });

    if (setDeviceCookie && deviceId) {
      response.cookies.set("fatin_did", deviceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("API /api/analyze internal error:", error?.name, error?.message, error?.stack);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع في الخادم أثناء الفحص. يرجى المحاولة مرة أخرى." },
      { status: 500 }
    );
  }
}
