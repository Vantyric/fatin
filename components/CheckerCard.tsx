"use client";

import React, { useState, useRef, useEffect } from "react";
import { AnalyzeResult } from "@/lib/ai/schemas";
import { formatRemainingChecks } from "@/lib/text/plural";
import {
  FileText,
  Link2,
  Upload,
  Clipboard,
  Trash2,
  ArrowLeft,
  X,
  Camera,
  AlertCircle,
  RefreshCw,
  Sparkles,
  StopCircle,
} from "lucide-react";

interface CheckerCardProps {
  onResult: (result: AnalyzeResult) => void;
}

type TabType = "text" | "link" | "image";

const STAGED_LOADING_MESSAGES = [
  "نحلل الروابط والنطاقات المشبوهة (Threat Intelligence)…",
  "نفحص المؤشرات السلوكية ومحاولات الهندسة الاجتماعية…",
  "نجهّز تقرير الحادثة الأمني وقائمة الإجراءات الوقائية…",
];

const SAMPLE_CHIPS = [
  {
    label: "انتحال نطاق رسمي (Homoglyph Spoof: рaypal.com)",
    text: "تنبيه أمني عاجل: تم رصد محاولة دخول غير معتادة إلى حسابك. يرجى تأكيد هويتك لحماية محفظتك عبر: https://рaypal.com/account/security-check",
  },
  {
    label: "فاتورة وهمية ورقم اتصال (Callback Phishing)",
    text: "Geek Squad Total Support: Invoice #GS-99281 for $499.99 auto-renewed successfully. If you did not authorize this charge, call our toll-free fraud resolution desk immediately at +1-888-555-0199.",
  },
  {
    label: "شحنة دولية معلقة (DHL / FedEx Smishing)",
    text: "طردك البريدي الدولي معلق في مركز التوزيع الجمركي بسبب رسوم جمركية مستحقة بقيمة 2.50$. يرجى دفع الرسوم لاستلام شحنتك اليوم: https://dhl-express-tracking-delivery.info",
  },
  {
    label: "وظيفة مهام يومية وهمية (Task Scam)",
    text: "فرصة عمل أونلاين: اربح من 50$ إلى 200$ يومياً مقابل تقييم التطبيقات والمنتجات اليومية مع فريقنا على تيليجرام. اسحب عمولتك فوراً بعد إنهاء المهام دون أي خبرة سابقة.",
  },
  {
    label: "كود تحويل مكالمات مشبوه (USSD Code)",
    text: "عزيزي العميل، لتفعيل باقة الإنترنت السريعة المضاعفة مجاناً من شركة الاتصالات، يرجى طلب الكود التالي من لوحة الاتصال في هاتفك الآن: *21*07701234567#",
  },
  {
    label: "سحب جوائز وهمية",
    text: "مبروك! تم اختيار رقمك للفوز بجائزة 5000 دولار من سحب الاتصالات الكبرى. لاستلام جائزتك النقدية اضغط الرابط وأدخل بياناتك: https://example.com/claim-prize",
  },
  {
    label: "تصيد بنكي / بطاقة مصرفية",
    text: "تنبيه مصرفي أمني: تم رصد محاولة دخول مريبة وتجميد بطاقتك الائتمانية. يرجى تأكيد ملكية الحساب خلال 12 ساعة لتفادي إيقاف الرصيد عبر الرابط: https://secure-ebank-update.com/verify",
  },
];

export function CheckerCard({ onResult }: CheckerCardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("text");
  const [textInput, setTextInput] = useState("");
  const [linkInput, setLinkInput] = useState("");

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageMimeType, setImageMimeType] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const [extractedQr, setExtractedQr] = useState<string>("");

  // Loading & Staged messages
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [currentStageLabel, setCurrentStageLabel] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Errors & Remaining Checks
  const [errorMsg, setErrorMsg] = useState("");
  const [errorType, setErrorType] = useState<string | null>(null);
  const [resetSeconds, setResetSeconds] = useState<number | null>(null);
  const [clipboardNotice, setClipboardNotice] = useState("");
  const [remainingDailyChecks, setRemainingDailyChecks] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Staged loading message cycler
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setStageIndex((prev) => (prev + 1) % STAGED_LOADING_MESSAGES.length);
      }, 1600);
    } else {
      setStageIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Handle Clipboard Paste
  const handlePaste = async () => {
    setErrorMsg("");
    setClipboardNotice("");
    try {
      if (!navigator.clipboard?.readText) {
        setClipboardNotice("المتصفح لا يدعم اللصق المباشر، يمكنك اللصق يدوياً داخل الحقل.");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        setTextInput(text.slice(0, 4000));
      } else {
        setClipboardNotice("الحافظة فارغة، يرجى نسخ الرسالة أولاً.");
      }
    } catch {
      setClipboardNotice("تم رفض إذن الوصول إلى الحافظة. يرجى الضغط مطولاً داخل الصندوق ولصق النص يدوياً.");
    }
  };

  // Client-side image processing: resize to max 1600px and re-encode to JPEG 0.85 via Canvas (strips EXIF)
  const processImageFile = async (file: File) => {
    setErrorMsg("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMsg("نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg("حجم الملف الأصلي كبير جداً. يرجى اختيار صورة أصغر من 15MB.");
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const maxSide = 1600;
      let width = bitmap.width;
      let height = bitmap.height;

      if (width > maxSide || height > maxSide) {
        if (width > height) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        } else {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      ctx.drawImage(bitmap, 0, 0, width, height);

      // Client-side QR code detection using jsqr
      try {
        const jsQR = (await import("jsqr")).default;
        const imgData = ctx.getImageData(0, 0, width, height);
        const qrCode = jsQR(imgData.data, imgData.width, imgData.height);
        if (qrCode && qrCode.data && qrCode.data.trim().length > 0) {
          setExtractedQr(qrCode.data.trim());
        } else {
          setExtractedQr("");
        }
      } catch {
        // Continue if QR decoding is unsupported or fails
      }

      // Re-encode as clean JPEG q0.85 (this completely purges all camera/GPS EXIF metadata)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setImageBase64(dataUrl);
      setImagePreview(dataUrl);
      setImageFile(file);
      setImageMimeType("image/jpeg");
    } catch {
      setErrorMsg("تعذر تجهيز الصورة، قد يكون الملف تالفاً. جرب أخذ لقطة شاشة أخرى.");
    }
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    setTextInput("");
    setLinkInput("");
    setImageFile(null);
    setImageBase64("");
    setImagePreview("");
    setExtractedQr("");
    setCurrentStageLabel("");
    setErrorMsg("");
    setErrorType(null);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setErrorMsg("تم إلغاء عملية الفحص.");
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setErrorType(null);

    // Check offline status
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setErrorType("offline");
      setErrorMsg("أنت غير متصل بالإنترنت حالياً. تأكد من اتصال هاتفك بالشبكة وأعد المحاولة.");
      return;
    }

    let payload: any;
    if (activeTab === "text") {
      const trimmed = textInput.trim();
      if (!trimmed) {
        setErrorMsg("يرجى كتابة أو لصق الرسالة أولاً.");
        return;
      }
      payload = { kind: "text", text: trimmed };
    } else if (activeTab === "link") {
      const trimmed = linkInput.trim();
      if (!trimmed) {
        setErrorMsg("يرجى إدخال الرابط المراد فحصه.");
        return;
      }
      payload = { kind: "link", url: trimmed };
    } else if (activeTab === "image") {
      if (!imageBase64) {
        setErrorMsg("يرجى اختيار أو رفع لقطة الشاشة أولاً.");
        return;
      }
      payload = {
        kind: "image",
        imageBase64,
        mimeType: imageMimeType,
        extractedQr: extractedQr || undefined,
      };
    }

    setLoading(true);
    setCurrentStageLabel("");
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/analyze?stream=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            if (!part.trim()) continue;
            const eventMatch = part.match(/event:\s*([^\n]+)/);
            const dataMatch = part.match(/data:\s*([^\n]+)/);
            const event = eventMatch ? eventMatch[1].trim() : "message";
            if (!dataMatch) continue;

            try {
              const parsedData = JSON.parse(dataMatch[1].trim());
              if (event === "stage" && parsedData?.label) {
                setCurrentStageLabel(parsedData.label);
              } else if (event === "done" && parsedData) {
                if (parsedData.remainingDailyChecks !== undefined) {
                  setRemainingDailyChecks(parsedData.remainingDailyChecks);
                }
                onResult(parsedData);
                return;
              } else if (event === "error") {
                setErrorMsg(parsedData?.error || "حدث خطأ أثناء الفحص");
                return;
              }
            } catch {}
          }
        }
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setErrorType("rate_limit");
          setResetSeconds(data.resetSeconds || null);
          setErrorMsg(data.error || "وصلت للحد الأقصى اليومي المسموح به.");
        } else {
          setErrorMsg(data.error || "حدث خطأ غير متوقع، يرجى المحاولة ثانية.");
        }
        return;
      }

      if (data.remainingDailyChecks !== undefined) {
        setRemainingDailyChecks(data.remainingDailyChecks);
      }

      onResult(data);
    } catch (err: any) {
      if (err.name === "AbortError") {
        // User cancelled deliberately
        return;
      }
      setErrorMsg("تعذر الاتصال بالخادم. يرجى التحقق من اتصالك وإعادة المحاولة.");
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const isFormValid =
    (activeTab === "text" && textInput.trim().length > 0) ||
    (activeTab === "link" && linkInput.trim().length > 0) ||
    (activeTab === "image" && imageBase64.length > 0);

  return (
    <div className="relative p-5 sm:p-7 rounded-3xl border border-white/[0.09] bg-slate-950/70 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] text-start">
      {/* Top Bar: Segmented Pill Control for 3 Modes + Remaining Checks Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div
          role="tablist"
          aria-label="نوع المدخلات للفحص"
          className="inline-flex p-1 rounded-2xl bg-slate-900/90 border border-white/[0.08] backdrop-blur-md self-start"
        >
          <button
            role="tab"
            id="tab-text"
            aria-selected={activeTab === "text"}
            aria-controls="panel-text"
            type="button"
            onClick={() => {
              setActiveTab("text");
              setErrorMsg("");
            }}
            className={`py-2 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === "text"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
            }`}
          >
            <FileText size={15} />
            <span>نص</span>
          </button>

          <button
            role="tab"
            id="tab-link"
            aria-selected={activeTab === "link"}
            aria-controls="panel-link"
            type="button"
            onClick={() => {
              setActiveTab("link");
              setErrorMsg("");
            }}
            className={`py-2 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === "link"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
            }`}
          >
            <Link2 size={15} />
            <span>رابط</span>
          </button>

          <button
            role="tab"
            id="tab-image"
            aria-selected={activeTab === "image"}
            aria-controls="panel-image"
            type="button"
            onClick={() => {
              setActiveTab("image");
              setErrorMsg("");
            }}
            className={`py-2 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === "image"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
            }`}
          >
            <Upload size={15} />
            <span>صورة</span>
          </button>
        </div>

        {/* Remaining Checks Pill (Desktop) */}
        <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>
            {remainingDailyChecks !== null
              ? formatRemainingChecks(remainingDailyChecks)
              : "Zero-Log Privacy Engine"}
          </span>
        </div>
      </div>

      {/* Main Integrated Composer Form */}
      <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4">
        {/* Tab 1: Text Composer */}
        {activeTab === "text" && (
          <div id="panel-text" role="tabpanel" aria-labelledby="tab-text">
            <div className="rounded-2xl border border-white/[0.1] bg-slate-900/60 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all flex flex-col justify-between overflow-hidden shadow-inner min-h-[220px]">
              <div className="p-4 sm:p-5 flex-1 flex flex-col">
                <label htmlFor="text-checker-input" className="sr-only">
                  نص الرسالة المشبوهة
                </label>
                <textarea
                  id="text-checker-input"
                  rows={5}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value.slice(0, 4000))}
                  placeholder="الصق الرسالة أو المحادثة المشبوهة هنا (مثال: تصيد بنكي، شحنة بريد معلقة، استثمار وهمي، أو طلب كود تحقق OTP...)"
                  disabled={loading}
                  className="w-full bg-transparent border-0 text-slate-100 placeholder:text-slate-500 text-sm sm:text-base focus:ring-0 focus:outline-none resize-none leading-relaxed flex-1"
                />
              </div>

              {/* Integrated Bottom Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-white/[0.06] bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handlePaste}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5"
                    title="لصق من الحافظة"
                  >
                    <Clipboard size={13} />
                    <span>لصق</span>
                  </button>
                  {textInput && (
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={loading}
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title="مسح النص"
                      aria-label="مسح النص"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <span className="text-[11px] text-slate-500">
                    <span className={textInput.length > 3900 ? "text-amber-400 font-bold" : ""}>
                      {textInput.length} / 4000
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2 ms-auto">
                  {loading && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <StopCircle size={14} />
                      <span>إلغاء</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!isFormValid || loading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs sm:text-sm shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_-3px_rgba(16,185,129,0.6)] hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span className="text-xs">{currentStageLabel || STAGED_LOADING_MESSAGES[stageIndex]}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>افحص الآن</span>
                        <ArrowLeft size={14} className="rotate-180" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            {clipboardNotice && (
              <p className="text-xs text-amber-400 pt-1.5">{clipboardNotice}</p>
            )}
          </div>
        )}

        {/* Tab 2: Link Composer */}
        {activeTab === "link" && (
          <div id="panel-link" role="tabpanel" aria-labelledby="tab-link">
            <div className="rounded-2xl border border-white/[0.1] bg-slate-900/60 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all flex flex-col justify-between overflow-hidden shadow-inner min-h-[170px]">
              <div className="p-4 sm:p-5 flex-1">
                <label htmlFor="link-checker-input" className="text-xs font-semibold text-slate-400 block mb-2">
                  الرابط المراد فحصه:
                </label>
                <div className="relative">
                  <input
                    id="link-checker-input"
                    type="text"
                    dir="ltr"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="example.com/claim-prize or https://..."
                    disabled={loading}
                    className="w-full bg-transparent border-0 text-slate-100 placeholder:text-slate-500 text-sm sm:text-base focus:ring-0 focus:outline-none font-mono"
                  />
                  {linkInput && (
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={loading}
                      className="absolute top-1/2 -translate-y-1/2 end-2 p-1.5 rounded-lg bg-white/[0.05] text-slate-400 hover:text-rose-400 transition-colors"
                      aria-label="مسح الرابط"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Integrated Bottom Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-white/[0.06] bg-slate-950/60">
                <p className="text-[11px] text-slate-500">
                  يتم فحص الرابط هيكلياً بأمان دون فتحه لتفادي أي برمجيات خبيثة.
                </p>

                <div className="flex items-center gap-2 ms-auto">
                  {loading && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <StopCircle size={14} />
                      <span>إلغاء</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!isFormValid || loading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs sm:text-sm shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_-3px_rgba(16,185,129,0.6)] hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span className="text-xs">{currentStageLabel || STAGED_LOADING_MESSAGES[stageIndex]}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>افحص الآن</span>
                        <ArrowLeft size={14} className="rotate-180" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Image Composer */}
        {activeTab === "image" && (
          <div id="panel-image" role="tabpanel" aria-labelledby="tab-image">
            <div className="rounded-2xl border border-white/[0.1] bg-slate-900/60 focus-within:border-emerald-500/50 transition-all flex flex-col justify-between overflow-hidden shadow-inner">
              <div className="p-4 sm:p-5 flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processImageFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {!imagePreview ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleImageDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 rounded-xl border border-dashed border-white/[0.15] hover:border-emerald-500/50 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3"
                  >
                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                      <Upload size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-200 mb-1">
                        اضغط لرفع لقطة شاشة، أو اسحب الصورة هنا
                      </p>
                      <p className="text-xs text-slate-500">
                        يُقبل JPG، PNG، WEBP (يتم تقليص الحجم وإزالة بيانات EXIF تلقائياً)
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1 text-xs text-emerald-400 font-semibold">
                      <Camera size={14} />
                      <span>التقاط بالكاميرا أو اختيار من المعرض</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative p-3 rounded-xl bg-slate-950/60 border border-white/[0.08] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreview}
                          alt="معاينة لقطة الشاشة"
                          className="w-16 h-16 object-cover rounded-xl border border-white/[0.1]"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-200">
                            {imageFile?.name || "لقطة الشاشة جاهزة"}
                          </p>
                          <p className="text-[11px] text-slate-500">تمت معالجة الصورة وإزالة البيانات الحساسة</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClear}
                        disabled={loading}
                        className="p-2 rounded-xl border border-white/[0.08] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        aria-label="إزالة الصورة"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Extracted QR Code Pill Badge */}
                    {extractedQr && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-2 text-xs text-emerald-400 font-medium">
                        <div className="flex items-center gap-2 truncate">
                          <Sparkles size={14} className="shrink-0" />
                          <span className="font-bold">رمز QR مستخرج:</span>
                          <span className="font-mono truncate text-slate-200" dir="ltr">
                            <bdi>{extractedQr}</bdi>
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-[10px] font-bold border border-white/[0.1] text-slate-300 shrink-0">
                          جاهز للفحص
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Integrated Bottom Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-white/[0.06] bg-slate-950/60">
                <p className="text-[11px] text-slate-500">
                  تحليل ذكي للنصوص والمحادثات وقراءة رموز الاستجابة السريعة (QR).
                </p>

                <div className="flex items-center gap-2 ms-auto">
                  {loading && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <StopCircle size={14} />
                      <span>إلغاء</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!isFormValid || loading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs sm:text-sm shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_-3px_rgba(16,185,129,0.6)] hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span className="text-xs">{currentStageLabel || STAGED_LOADING_MESSAGES[stageIndex]}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>افحص الآن</span>
                        <ArrowLeft size={14} className="rotate-180" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fictional Sample Chips */}
        <div className="pt-2">
          <span className="text-xs font-semibold text-slate-400 block mb-2.5">
            أو جرب مثالاً سريعاً:
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => {
                  setActiveTab("text");
                  setTextInput(chip.text);
                  setErrorMsg("");
                }}
                className="rounded-full bg-slate-900/80 border border-white/10 hover:border-emerald-500/40 px-3.5 py-1.5 text-xs text-slate-300 hover:text-white transition-all active:scale-95"
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Notification with Retry */}
        {errorMsg && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start justify-between gap-3 animate-fadeIn"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMsg}</p>
                {resetSeconds && (
                  <p className="mt-1 text-slate-400 text-[11px]">
                    يتجدد رصيد الفحص التلقائي بعد قرابة {Math.ceil(resetSeconds / 3600)} ساعة.
                  </p>
                )}
              </div>
            </div>
            {errorType !== "rate_limit" && (
              <button
                type="button"
                onClick={handleSubmit}
                className="p-1 rounded hover:bg-rose-500/20 text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <RefreshCw size={12} />
                <span>إعادة المحاولة</span>
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
