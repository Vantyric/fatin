"use client";

import React, { useState } from "react";
import { AnalyzeResult } from "@/lib/ai/schemas";
import { RiskGauge } from "./RiskGauge";
import { HighlightedText } from "./HighlightedText";
import { ShareCardModal } from "./ShareCardModal";
import { EmergencyModal } from "./EmergencyModal";
import { formatWesternDate } from "@/lib/text/dateFormat";
import { formatRemainingChecks } from "@/lib/text/plural";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Share2,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Info,
  ExternalLink,
  Shield,
  AlertOctagon,
  Flame,
  Sparkles,
  Users,
  Target,
  ArrowRight,
  HelpCircle,
  Quote,
  LifeBuoy,
} from "lucide-react";

interface ResultCardProps {
  result: AnalyzeResult;
  onReset: () => void;
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "دقة عالية",
  medium: "دقة متوسطة",
  low: "دقة منخفضة",
};

const SCAM_TYPE_NAMES: Record<string, string> = {
  prize: "جوائز وسحوبات وهمية • Fake Prize Lottery",
  otp_takeover: "سرقة كود التحقق • Account Takeover / OTP",
  bank_impersonation: "انتحال مصرفي • Financial Institution Phishing",
  delivery_fee: "طرد بريدي احتيالي • Delivery Smishing",
  job: "وظائف وهمية • Fake Employment Scam",
  investment: "احتيال استثماري • Ponzi / Crypto Investment",
  family_impersonation: "انتحال صفة • Impersonation / Whaling",
  sextortion: "ابتزاز رقمي • Sextortion / Cyber Blackmail",
  phishing_link: "تصيد احتيالي • Credential Harvesting / Phishing",
  remote_access: "تحكم عن بعد • Remote Access Trojan (RAT)",
  malicious_app: "تطبيق خبيث • Malicious APK / Spyware",
  ussd_forwarding: "تحويل مكالمات • MMI / USSD Forwarding",
  qr_phishing: "تصيد باركود • Quishing (QR Phishing)",
  fake_payment_proof: "إشعار تحويل مزور • Fraudulent Wire Proof",
  overpayment: "احتيال زيادة الدفع • Overpayment Refund Fraud",
  romance_investment: "استدراج استثماري • Pig Butchering Scam",
  advance_fee: "دفع مسبق ورسوم وهمية • Advance-Fee Fraud (419)",
  toad_callback: "احتيال هاتفي وفواتير وهمية • Callback Phishing (TOAD)",
  brand_homoglyph: "انتحال نطاق وعلامة تجارية • Homoglyph / Brand Spoofing",
  crypto_drainer: "توقيع احتيالي للمحفظة • Crypto Drainer / Web3 Permit Fraud",
  oauth_consent: "تصيد تصريح الدخول • AitM / OAuth Consent Phishing",
  task_scam: "مهام يومية وهمية • Fake Rating & Task Scam",
  other: "نمط احتيالي • Social Engineering Vector",
  none: "محتوى اعتيادي • Benign / Clean",
};

const TACTIC_LABELS: Record<string, string> = {
  urgency: "الاستعجال وضيق الوقت",
  authority: "انتحال سلطة أو جهة رسمية",
  fear: "إثارة الخوف والتهديد",
  greed: "الإغراء بجوائز أو مال",
  trust: "استغلال الثقة أو القرابة",
  isolation: "طلب السرية وعزل الضحية",
};

export function ResultCard({ result, onReset }: ResultCardProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<boolean | null>(null);

  const isScam = result.verdict === "scam";
  const isSuspicious = result.verdict === "suspicious";
  const isSafe = result.verdict === "safe";

  const handleCopySummary = () => {
    const briefLines = [
      `=== تقرير تحليل الحادثة الأمني | FATIN Threat Incident Brief ===`,
      `التقييم: ${result.verdictLabelAr} [${result.verdict.toUpperCase()}]`,
      `مستوى الخطورة: ${result.riskScore}/100 (${CONFIDENCE_LABELS[result.confidence] || "دقة متوسطة"})`,
      `تصنيف التهديد: ${SCAM_TYPE_NAMES[result.scamType] || result.scamType}`,
      result.attackerGoal ? `هدف المهاجم: ${result.attackerGoal}` : null,
      result.requestedAction ? `المطلوب منك: ${result.requestedAction}` : null,
      result.worstCaseIfComplied ? `التبعات المحتملة: ${result.worstCaseIfComplied}` : null,
      `الملخص الأمني: ${result.summary}`,
      result.reasons?.length ? `المؤشرات المرصودة:\n• ${result.reasons.join("\n• ")}` : null,
      result.doList?.length ? `إجراءات الحماية الموصى بها:\n• ${result.doList.slice(0, 3).join("\n• ")}` : null,
      `منصة الفحص: FATIN Security Threat Engine (https://fatin.iq)`,
    ]
      .filter(Boolean)
      .join("\n\n");

    navigator.clipboard.writeText(briefLines).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    });
  };

  const handleFeedback = async (helpful: boolean) => {
    if (feedbackSent !== null) return;
    setFeedbackSent(helpful);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict: result.verdict, helpful }),
      });
    } catch {
      // Non-intrusive
    }
  };

  return (
    <div
      aria-live="polite"
      className="relative p-6 sm:p-8 rounded-3xl border border-white/[0.09] bg-slate-950/70 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-6 text-start animate-fadeIn"
    >
      {/* Degraded Mode Notice if AI was unavailable */}
      {result.degraded && (
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-2 font-medium">
            <Info size={15} className="text-emerald-400" />
            <span>تحليل أمني استباقي عبر المحرك الاستدلالي المباشر (المحرك الموسّع قيد التحديث السريع).</span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.1] font-bold text-slate-300">مبسّط</span>
        </div>
      )}

      {/* 1. Verdict Banner with Executive Dossier Styling */}
      <div
        className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all ${
          isScam
            ? "bg-gradient-to-r from-rose-950/40 via-red-950/20 to-slate-950/40 border-rose-500/30 text-rose-400 shadow-[0_0_30px_-5px_rgba(244,63,94,0.15)]"
            : isSuspicious
            ? "bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-slate-950/40 border-amber-500/30 text-amber-400 shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)]"
            : "bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-slate-950/40 border-emerald-500/30 text-emerald-400 shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/[0.1] shrink-0 shadow-inner">
            {isScam ? (
              <ShieldAlert size={32} className="text-rose-400" />
            ) : isSuspicious ? (
              <AlertTriangle size={32} className="text-amber-400" />
            ) : (
              <ShieldCheck size={32} className="text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold tracking-wider uppercase opacity-85">
                {isScam
                  ? "احتيال عالي الخطورة • Critical Threat"
                  : isSuspicious
                  ? "مشبوه / خطر متوسط • Moderate Risk"
                  : "آمن / محتوى اعتيادي • Clean / Safe"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{result.verdictLabelAr}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {/* Deep Analysis Badge */}
          {result.deepPassRan && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <Sparkles size={13} />
              <span>تحليل استباقي عميق</span>
            </span>
          )}

          {/* Known Campaign Crowd Badge */}
          {result.campaignSeenCount && result.campaignSeenCount >= 3 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
              <Users size={13} />
              <span>حملة تصيد متكررة ({result.campaignSeenCount} مرات)</span>
            </span>
          ) : null}

          {/* Brand Spoofing / Homoglyph Badge */}
          {(result.isBrandSpoofing || result.urlDetails?.isHomoglyphAttack) && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <AlertOctagon size={13} />
              <span>انتحال موقع رسمي / نطاق وهمي</span>
            </span>
          )}

          {/* Confidence Badge */}
          <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-slate-900/80 border border-white/[0.1] text-slate-200">
            {CONFIDENCE_LABELS[result.confidence] || "دقة متوسطة"}
          </span>
        </div>
      </div>

      {/* 2. Semicircle Risk Gauge + Summary Dossier */}
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/[0.08] backdrop-blur-sm flex flex-col md:flex-row items-center gap-6">
        <div className="shrink-0 flex flex-col items-center">
          <RiskGauge score={result.riskScore} size={190} />
          {result.scamType !== "none" && (
            <span className="mt-2 text-xs px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-slate-200 font-semibold">
              {SCAM_TYPE_NAMES[result.scamType] || result.scamType}
            </span>
          )}
        </div>

        <div className="flex-1 space-y-2.5 text-start">
          <h3 className="font-bold text-slate-100 text-base">ملخص الفحص الأمني</h3>
          <p className="text-slate-300 text-sm leading-relaxed font-normal">{result.summary}</p>
          <div className="pt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>تاريخ الفحص: {formatWesternDate(result.createdAt)}</span>
            <span>•</span>
            <span>{formatRemainingChecks(result.remainingDailyChecks)}</span>
          </div>
        </div>
      </div>

      {/* Brand Spoofing / Homoglyph Attack Alert Card */}
      {(result.isBrandSpoofing || result.urlDetails?.isHomoglyphAttack || result.urlDetails?.isBrandSpoofing) && (
        <div className="p-5 rounded-2xl bg-rose-950/40 border-2 border-rose-500/60 text-rose-200 space-y-2.5 shadow-[0_0_25px_rgba(244,63,94,0.2)] animate-pulseOnce">
          <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm sm:text-base">
            <AlertOctagon size={22} className="shrink-0" />
            <h4>انتحال موقع رسمي / نطاق وهمي (Brand Spoofing / Homoglyph Attack)</h4>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            تم رصد تقنيات تزوير متقدمة عبر محاكاة حروف متطابقة بصرياً (Homoglyphs / Punycode) أو إنشاء نطاق مركب خادع يحاكي جهة أو منصة عالمية معروفة{result.spoofedBrand ? ` (${result.spoofedBrand})` : ""}. هذا الرابط لا يتبع الموقع الحقيقي نهائياً وهو مصمم لخداعك وسرقة بياناتك.
          </p>
        </div>
      )}

      {/* 3. URGENT ACCOUNT RISK BOX */}
      {result.isUrgentAccountRisk && (
        <div className="p-5 rounded-2xl bg-verdict-danger/15 border-2 border-verdict-danger text-foreground space-y-3 animate-pulseOnce">
          <div className="flex items-center gap-2 text-verdict-danger font-bold text-base">
            <Flame size={20} />
            <h4>إجراء أمني عاجل لحماية حسابك وأموالك:</h4>
          </div>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
            تواصل فوراً مع مصرفك أو مزود محفظتك عبر <strong>الرقم الرسمي المطبوع على ظهر بطاقتك أو داخل تطبيقهم المعتمد فقط</strong> لإيقاف البطاقة. غيّر كلمات المرور فوراً، فعّل ميزة التحقق بخطوتين، وافتح واتساب ثم اذهب إلى <strong>(الأجهزة المرتبطة) وسجل الخروج من أي جهاز غريب</strong>.
          </p>
        </div>
      )}

      {/* 4. Phase 5: "ماذا يريد المرسل؟" (Intent & Behavior Analysis) */}
      {(result.attackerGoal || result.requestedAction || result.worstCaseIfComplied) && (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/50 border border-white/[0.08] backdrop-blur-sm space-y-4">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <Target size={16} className="text-emerald-400" />
            <span>ماذا يريد المرسل؟ (Attacker Intent & Behavioral Analysis)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs sm:text-sm">
            {/* Attacker Goal */}
            {result.attackerGoal && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/[0.08] space-y-1.5 shadow-inner">
                <span className="text-[11px] font-bold text-slate-400 block">هدف المرسل الحقيقي:</span>
                <p className="text-slate-200 font-medium leading-relaxed">{result.attackerGoal}</p>
              </div>
            )}

            {/* Requested Action */}
            {result.requestedAction && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/[0.08] space-y-1.5 shadow-inner">
                <span className="text-[11px] font-bold text-slate-400 block">المطلوب منك فعله:</span>
                <p className="text-slate-200 font-medium leading-relaxed">{result.requestedAction}</p>
              </div>
            )}

            {/* Worst Case */}
            {result.worstCaseIfComplied && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-rose-500/20 space-y-1.5 shadow-inner">
                <span className="text-[11px] font-bold text-rose-400 block">التبعات في حال الامتثال:</span>
                <p className="text-rose-200/90 font-medium leading-relaxed">{result.worstCaseIfComplied}</p>
              </div>
            )}
          </div>

          {/* Psychological Tactics Used */}
          {result.tactics && result.tactics.length > 0 && (
            <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium me-1">الحِيَل النفسية المكتشفة:</span>
              {result.tactics.map((tac) => (
                <span
                  key={tac}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.05] border border-white/[0.1] text-slate-300"
                >
                  {TACTIC_LABELS[tac] || tac}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Phase 5: Conversation Turning Point Quote (if chat transcript) */}
      {result.turningPointQuote && (
        <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2 text-start">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
            <Quote size={16} />
            <span>نقطة التحول في المحادثة (لحظة الاستدراج):</span>
          </div>
          <blockquote className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/20 text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed italic">
            &ldquo;{result.turningPointQuote}&rdquo;
          </blockquote>
          <p className="text-[11px] text-slate-400">
            في هذه النقطة بالتحديد، تحولت المحادثة من دردشة عادية إلى طلب مريب أو محاولة للحصول على منفعة.
          </p>
        </div>
      )}

      {/* 6. Phase 5: Side-by-Side Red Flags vs Green Flags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Red Flags Column */}
        <div className="p-5 sm:p-6 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-3">
          <h4 className="font-bold text-rose-400 text-sm flex items-center gap-1.5">
            <ShieldAlert size={16} />
            <span>المؤشرات المرصودة وعلامات الخطر (IOCs & Behavioral Red Flags) ({result.redFlags?.length || 0}):</span>
          </h4>
          {result.redFlags && result.redFlags.length > 0 ? (
            <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
              {result.redFlags.map((flag, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-rose-400 shrink-0 mt-1">•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">لم تُكتشف علامات خطر مؤكدة.</p>
          )}
        </div>

        {/* Green Flags Column */}
        <div className="p-5 sm:p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-3">
          <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
            <ShieldCheck size={16} />
            <span>علامات تطمين وسلامة ({result.greenFlags?.length || 0}):</span>
          </h4>
          {result.greenFlags && result.greenFlags.length > 0 ? (
            <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
              {result.greenFlags.map((flag, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-emerald-400 shrink-0 mt-1">•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">لا توجد مؤشرات تطمين كافية.</p>
          )}
        </div>
      </div>

      {/* 7. Phase 5: "كيف تتأكد؟" (Safe Official Verification Route) */}
      {result.howToVerify && (
        <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/25 space-y-2">
          <h3 className="font-bold text-cyan-400 text-sm flex items-center gap-1.5">
            <HelpCircle size={16} />
            <span>كيف تتأكد بنفسك؟ (الطريقة الرسمية الآمنة)</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
            {result.howToVerify}
          </p>
        </div>
      )}

      {/* 8. Reasons Breakdown */}
      {result.reasons && result.reasons.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/50 border border-white/[0.08] space-y-3">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <Info size={16} className="text-emerald-400" />
            <span>تفاصيل إضافية للتقييم:</span>
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm">
            {result.reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-slate-200">
                <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
                  <Shield size={12} />
                </span>
                <span className="leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 9. Highlighted User Text (Exact Substrings Only) */}
      {(() => {
        const textToDisplay = result.originalText || result.extractedText || "";
        const exactSuspiciousPhrases = (result.suspiciousPhrases || []).filter(
          (p) =>
            p &&
            p.trim().length >= 2 &&
            (textToDisplay.includes(p.trim()) ||
              textToDisplay.toLowerCase().includes(p.trim().toLowerCase()))
        );

        if (!textToDisplay || exactSuspiciousPhrases.length === 0) {
          return null;
        }

        return (
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/50 border border-white/[0.08] space-y-3">
            <h3 className="font-bold text-rose-400 text-sm flex items-center gap-2">
              <AlertOctagon size={16} />
              <span>العبارات المشبوهة المكتشفة في رسالتك:</span>
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-white/[0.08] text-xs sm:text-sm max-h-60 overflow-y-auto leading-relaxed">
              <HighlightedText
                text={textToDisplay}
                phrases={exactSuspiciousPhrases}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              العبارات المظللة باللون الأحمر هي الكلمات التي ترفع احتمالية الاحتيال عادةً.
            </p>
          </div>
        );
      })()}

      {/* 10. Link Breakdown with Unshortened URL, Domain Age, and Lookalike */}
      {result.urlDetails && (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/50 border border-white/[0.08] space-y-3">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <ExternalLink size={16} className="text-emerald-400" />
            <span>تفاصيل فحص الرابط والنطاق:</span>
          </h3>

          <div className="space-y-2">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.07] text-xs flex items-center justify-between">
              <span className="text-slate-400 font-medium">اسم النطاق:</span>
              <span className="font-mono font-bold text-slate-200" dir="ltr">
                <bdi>{result.urlDetails.domain}</bdi>
              </span>
            </div>

            {/* Unshortened Destination */}
            {result.urlDetails.unshortenedUrl && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.07] text-xs flex flex-col gap-1">
                <span className="text-slate-400 font-medium">الوجهة الحقيقية للرابط المختصر:</span>
                <span className="font-mono text-emerald-400 font-bold break-all" dir="ltr">
                  <bdi>{result.urlDetails.unshortenedUrl}</bdi>
                </span>
              </div>
            )}

            {/* Domain Age */}
            {result.urlDetails.domainAgeDays !== undefined && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.07] text-xs flex items-center justify-between">
                <span className="text-slate-400 font-medium">عمر النطاق:</span>
                <span className="font-bold text-slate-200">
                  {result.urlDetails.domainAgeDays} يوماً
                  {result.urlDetails.isNewDomain ? " (نطاق حديث جداً، احذر!)" : ""}
                </span>
              </div>
            )}

            {/* Lookalike Warning */}
            {result.urlDetails.isLookalike && result.urlDetails.impersonatedBrand && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs flex items-center gap-2 text-rose-300 font-bold">
                <AlertTriangle size={16} className="shrink-0 text-rose-400" />
                <span>تحذير: هذا الرابط ينتحل هوية ({result.urlDetails.impersonatedBrand}) ولا يتبع موقعهم الرسمي!</span>
              </div>
            )}

            {/* Homoglyph / Brand Spoofing Warning */}
            {(result.urlDetails.isHomoglyphAttack || result.urlDetails.isBrandSpoofing) && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs flex items-center gap-2 text-rose-300 font-bold">
                <AlertOctagon size={16} className="shrink-0 text-rose-400" />
                <span>تحذير أمني حرج: النطاق يستخدم تقنيات تشابه الحروف (Homoglyphs / Punycode) أو اسماً خادعاً لانتحال علامة تجارية!</span>
              </div>
            )}
          </div>

          {result.urlDetails.flags && result.urlDetails.flags.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-semibold text-slate-200">مؤشرات الخطر على الرابط:</span>
              <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                {result.urlDetails.flags.map((flag, i) => (
                  <li key={i}>{flag.description}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-emerald-400 font-medium">
              لم تُكتشف أي نطاقات خداعية شائعة في هيكل الرابط.
            </p>
          )}
        </div>
      )}

      {/* 11. إجراءات الحماية الموصى بها (Mitigation Checklist) */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>إجراءات الحماية الموصى بها (Actionable Mitigation Checklist)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Do List */}
          <div className="p-5 sm:p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-3">
            <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
              <CheckCircle2 size={16} />
              <span>شنو تسوي هسه:</span>
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
              {result.doList.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-emerald-400 shrink-0 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Don't List */}
          <div className="p-5 sm:p-6 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-3">
            <h4 className="font-bold text-rose-400 text-sm flex items-center gap-1.5">
              <XCircle size={16} />
              <span>إياك أن تفعل (لا تسوي):</span>
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
              {result.dontList.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-rose-400 shrink-0 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 12. Emergency Action Button (سويت اللي طلبه!) */}
      {!isSafe && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-red-950/20 to-slate-950/40 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold shrink-0">
              <LifeBuoy size={22} />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm">وقعت بالفخ ونفذت الطلب؟</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                اضغط هنا فوراً لاتباع خطوات الطوارئ والحد من الضرر واستعادة حسابك وأموالك.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEmergencyOpen(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 text-white font-bold text-xs hover:brightness-110 shadow-[0_0_20px_-3px_rgba(239,68,68,0.5)] transition-all touch-target shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>سويت اللي طلبه! (إجراءات طارئة)</span>
            <ArrowRight size={14} className="rotate-180" />
          </button>
        </div>
      )}

      {/* 13. Action Buttons & Feedback */}
      <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Share warning card */}
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 hover:brightness-105 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] transition-all touch-target"
          >
            <Share2 size={15} />
            <span>مشاركة التحذير</span>
          </button>

          {/* Copy summary */}
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-white/[0.08] transition-colors touch-target"
            title="نسخ ملخص تقرير الحادثة"
          >
            {copiedSummary ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            <span>{copiedSummary ? "تم نسخ التقرير!" : "نسخ ملخص تقرير الحادثة"}</span>
          </button>

          {/* Check another message */}
          <button
            type="button"
            onClick={onReset}
            className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-white/[0.08] transition-colors touch-target"
          >
            <RotateCcw size={15} />
            <span>فحص رسالة ثانية</span>
          </button>
        </div>

        {/* Feedback: Was this evaluation helpful? */}
        <div className="flex items-center gap-2.5 text-xs text-slate-400 w-full sm:w-auto justify-end">
          <span className="font-medium">التقييم صح؟</span>
          {feedbackSent === null ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleFeedback(true)}
                className="p-2 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] hover:text-emerald-400 transition-colors touch-target"
                aria-label="نعم، التقييم صحيح"
                title="نعم، صحيح"
              >
                <ThumbsUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(false)}
                className="p-2 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] hover:text-rose-400 transition-colors touch-target"
                aria-label="لا، التقييم غير دقيق"
                title="غير دقيق"
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          ) : (
            <span className="text-emerald-400 font-semibold">شكراً لرأيك!</span>
          )}
        </div>
      </div>

      {/* Honest Disclaimer */}
      <p className="text-[11px] text-slate-500 text-center leading-relaxed pt-2">
        هذا تقييم آلي مساعد وليس حكماً نهائياً. إذا شكيت، تواصل مع الجهة الرسمية من قناتها المعروفة.
      </p>

      {/* Share Card Modal */}
      <ShareCardModal result={result} isOpen={shareOpen} onClose={() => setShareOpen(false)} />

      {/* Emergency Damage Control Modal */}
      <EmergencyModal isOpen={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
    </div>
  );
}
