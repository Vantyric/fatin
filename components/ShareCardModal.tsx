"use client";

import React, { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Logo } from "./Logo";
import {
  Share2,
  Download,
  Copy,
  Check,
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { AnalyzeResult } from "@/lib/ai/schemas";

interface ShareCardModalProps {
  result: AnalyzeResult;
  isOpen: boolean;
  onClose: () => void;
}

const SCAM_TYPE_LABELS: Record<string, string> = {
  prize: "جوائز وسحوبات وهمية",
  otp_takeover: "سرقة كود التحقق (OTP)",
  bank_impersonation: "انتحال صفة مصرف أو محفظة",
  delivery_fee: "رسوم طرود وجمارك وهمية",
  job: "وظائف وهمية وعمولات كاذبة",
  investment: "استثمار وهمي وأرباح كاذبة",
  family_impersonation: "انتحال صفة قريب أو صديق",
  sextortion: "ابتزاز إلكتروني وتهديد",
  phishing_link: "رابط تصيد احتيالي",
  other: "أسلوب احتيالي",
  none: "محتوى آمن",
};

export function ShareCardModal({ result, isOpen, onClose }: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const scamTypeLabel = SCAM_TYPE_LABELS[result.scamType] || "احتيال إلكتروني";

  const getSafetyTip = () => {
    if (result.verdict === "safe") {
      return "تذكر دائماً: الرسائل الرسمية لا تطلب رموز التحقق السرية أو كلمات المرور عبر محادثات عادية.";
    }
    if (result.scamType === "otp_takeover") {
      return "لا تشارك رمز التحقق (OTP) المكون من 6 أرقام مع أي شخص مهما ادعى، فهو مفتاح حسابك.";
    }
    if (result.scamType === "bank_impersonation") {
      return "المصارف والمحافظ (زين كاش، كي كارد) لا تطلب تحديث بياناتك بروابط نصية عشوائية.";
    }
    return "قبل ما تضغط على أي رابط أو تحول رصيد، تأكد من المصدر عبر القنوات الرسمية الموثقة.";
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    setErrorMsg("");

    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        width: 1080,
        height: 1350,
      });

      // Convert dataUrl to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `fatin-warning-${Date.now()}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `تحذير احتيال: ${scamTypeLabel} | فَطِن`,
          text: `تحذير من تطبيق فَطِن حول أسلوب احتيال منتشر (${scamTypeLabel}). قبل ما تضغط.. تأكد!`,
        });
      } else {
        // Fallback: download image
        downloadBlob(blob, `fatin-warning-${Date.now()}.png`);
      }
    } catch {
      setErrorMsg("تعذرت المشاركة المباشرة. يمكنك حفظ البطاقة عبر زر التحميل.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        width: 1080,
        height: 1350,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      downloadBlob(blob, `fatin-check-${Date.now()}.png`);
    } catch {
      setErrorMsg("حدث خطأ أثناء حفظ الصورة، يرجى المحاولة ثانية.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    const textToCopy = `تحذير من تطبيق فَطِن (${result.verdictLabelAr}):\nالنوع: ${scamTypeLabel}\nالنتيجة: ${result.summary}\nالقاعدة الذهبية: ${getSafetyTip()}\nافحص رسائلك مجاناً: https://fatin.iq`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const getWhatsAppShareUrl = () => {
    const shareText = `⚠️ تحذير أمان رقمي من تطبيق فَطِن:\nالتقييم: ${result.verdictLabelAr} (${scamTypeLabel})\n${result.summary}\n\n🛡️ نصيحة:\n${getSafetyTip()}\n\nقبل ما تضغط.. تأكد عبر: https://fatin.iq`;
    return `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  };

  const isScam = result.verdict === "scam";
  const isSuspicious = result.verdict === "suspicious";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-card overflow-hidden text-start">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-2/40">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-brand-primary" />
            <h2 id="share-modal-title" className="text-base font-bold text-foreground">
              مشاركة بطاقة التحذير التوعوية
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            aria-label="إغلاق النافذة"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <p className="text-xs text-muted leading-relaxed">
            البطاقة المصممة للمشاركة لا تحتوي على أي نص خاص بك أو أرقام شخصية. تحتوي فقط على التحذير التوعوي والنصيحة لحماية أصدقائك وعائلتك.
          </p>

          {/* Live Mini Preview of the Card */}
          <div className="p-5 rounded-2xl border border-border bg-surface-2 shadow-inner flex flex-col items-center justify-center text-center">
            <div className="mb-3">
              {isScam ? (
                <div className="p-3 rounded-full bg-verdict-danger/10 text-verdict-danger inline-flex">
                  <ShieldAlert size={36} />
                </div>
              ) : isSuspicious ? (
                <div className="p-3 rounded-full bg-verdict-warning/10 text-verdict-warning inline-flex">
                  <AlertTriangle size={36} />
                </div>
              ) : (
                <div className="p-3 rounded-full bg-verdict-safe/10 text-verdict-safe inline-flex">
                  <ShieldCheck size={36} />
                </div>
              )}
            </div>
            <span
              className={`text-sm font-black px-3 py-1 rounded-full mb-1 ${
                isScam
                  ? "bg-verdict-danger/15 text-verdict-danger"
                  : isSuspicious
                  ? "bg-verdict-warning/15 text-verdict-warning"
                  : "bg-verdict-safe/15 text-verdict-safe"
              }`}
            >
              {result.verdictLabelAr}
            </span>
            <span className="text-xs font-bold text-foreground mb-3">{scamTypeLabel}</span>
            <p className="text-xs text-muted max-w-sm leading-relaxed">{getSafetyTip()}</p>
          </div>

          {errorMsg && (
            <p className="text-xs text-verdict-danger bg-verdict-danger/10 p-2.5 rounded-xl border border-verdict-danger/20">
              {errorMsg}
            </p>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleShare}
              disabled={generating}
              className="w-full py-3 px-4 rounded-xl bg-brand-primary text-slate-950 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity touch-target"
            >
              <Share2 size={16} />
              <span>{generating ? "جارٍ التجهيز…" : "مشاركة مباشرة"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={generating}
              className="w-full py-3 px-4 rounded-xl border border-border bg-surface text-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-surface-2 transition-colors touch-target"
            >
              <Download size={16} />
              <span>تحميل كصورة (PNG)</span>
            </button>

            <a
              href={getWhatsAppShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-colors touch-target"
            >
              <MessageCircle size={16} />
              <span>إرسال عبر واتساب</span>
            </a>

            <button
              type="button"
              onClick={handleCopyText}
              className="w-full py-3 px-4 rounded-xl border border-border bg-surface text-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-surface-2 transition-colors touch-target"
            >
              {copied ? <Check size={16} className="text-verdict-safe" /> : <Copy size={16} />}
              <span>{copied ? "تم نسخ التحذير!" : "نسخ النص"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden 1080x1350 Offscreen Container for html-to-image rendering */}
      <div
        className="fixed top-[-9999px] left-[-9999px] pointer-events-none select-none"
        aria-hidden="true"
      >
        <div
          ref={cardRef}
          style={{
            width: "1080px",
            height: "1350px",
            backgroundColor: "#0B1020",
            color: "#E8ECF8",
            direction: "rtl",
            fontFamily: "system-ui, -apple-system, sans-serif",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "80px",
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <Logo size={80} />
              <div>
                <h1 style={{ fontSize: "52px", fontWeight: "900", margin: 0, color: "#FFFFFF" }}>
                  فَطِن
                </h1>
                <p style={{ fontSize: "28px", color: "#14B8A6", margin: "4px 0 0 0", fontWeight: "600" }}>
                  قبل ما تضغط.. تأكد
                </p>
              </div>
            </div>
            <div
              style={{
                backgroundColor: "#18223B",
                border: "2px solid #25304D",
                borderRadius: "32px",
                padding: "16px 36px",
                fontSize: "26px",
                color: "#9AA6C4",
                fontWeight: "600",
              }}
            >
              تنبيه أمان إلكتروني
            </div>
          </div>

          {/* Main Card Body */}
          <div
            style={{
              backgroundColor: "#121A2F",
              border: "3px solid #25304D",
              borderRadius: "48px",
              padding: "70px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            {/* Verdict Badge */}
            <div
              style={{
                backgroundColor: isScam
                  ? "rgba(239, 68, 68, 0.2)"
                  : isSuspicious
                  ? "rgba(245, 158, 11, 0.2)"
                  : "rgba(34, 197, 94, 0.2)",
                color: isScam ? "#EF4444" : isSuspicious ? "#F59E0B" : "#22C55E",
                border: `3px solid ${isScam ? "#EF4444" : isSuspicious ? "#F59E0B" : "#22C55E"}`,
                borderRadius: "40px",
                padding: "20px 60px",
                fontSize: "44px",
                fontWeight: "900",
                marginBottom: "32px",
              }}
            >
              {result.verdictLabelAr}
            </div>

            <h2 style={{ fontSize: "54px", fontWeight: "800", color: "#FFFFFF", marginBottom: "24px" }}>
              {scamTypeLabel}
            </h2>

            <div
              style={{
                width: "120px",
                height: "6px",
                backgroundColor: "#14B8A6",
                borderRadius: "3px",
                marginBottom: "40px",
              }}
            />

            {/* Tip Box */}
            <div
              style={{
                backgroundColor: "#18223B",
                border: "2px solid #25304D",
                borderRadius: "32px",
                padding: "48px",
                width: "100%",
                boxSizing: "border-box",
                textAlign: "start",
              }}
            >
              <p
                style={{
                  fontSize: "30px",
                  fontWeight: "700",
                  color: "#14B8A6",
                  marginBottom: "16px",
                }}
              >
                💡 كيف تحمي نفسك؟
              </p>
              <p
                style={{
                  fontSize: "32px",
                  lineHeight: "1.6",
                  color: "#E8ECF8",
                  margin: 0,
                  fontWeight: "500",
                }}
              >
                {getSafetyTip()}
              </p>
            </div>
          </div>

          {/* Footer Call to Action */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "2px solid #25304D",
              paddingTop: "32px",
            }}
          >
            <p style={{ fontSize: "26px", color: "#9AA6C4", margin: 0 }}>
              المنصة المتقدمة لكشف التهديدات والتصيد الرقمي | FATIN Security
            </p>
            <p style={{ fontSize: "32px", fontWeight: "800", color: "#38BDF8", margin: 0, direction: "ltr" }}>
              fatin.iq
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
