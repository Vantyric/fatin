import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff, ShieldCheck, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "أنت غير متصل بالإنترنت | فَطِن",
  description: "يبدو أن اتصال الإنترنت مقطوع حالياً.",
};

export default function OfflinePage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="inline-flex p-4 rounded-full bg-surface-2 text-muted mb-6">
        <WifiOff size={48} />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">أنت غير متصل بالإنترنت</h1>
      <p className="text-sm text-muted mb-8 leading-relaxed">
        تحتاج منصة فَطِن إلى اتصال نشط بالشبكة لتشغيل محرك التحليل الأمني الاستباقي وفحص الروابط والنطاقات. يرجى التأكد من اتصال هاتفك بالإنترنت.
      </p>

      {/* Offline safety tips */}
      <div className="p-4 rounded-2xl bg-surface border border-border text-start text-xs space-y-2 mb-8">
        <div className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
          <ShieldCheck size={16} className="text-brand-primary" />
          <span>نصيحة أمان أثناء انقطاع النت:</span>
        </div>
        <p className="text-muted leading-relaxed">
          إذا وصلتك رسالة أو اتصال يطلب رمز تحقق (OTP) أو تحويل رصيد طارئ، لا تستجب له أبداً حتى يعود اتصالك وتتمكن من التأكد من المرسل.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-slate-950 font-bold text-sm hover:opacity-90 transition-opacity touch-target"
        >
          <RefreshCw size={16} />
          <span>إعادة المحاولة</span>
        </Link>
      </div>
    </div>
  );
}
