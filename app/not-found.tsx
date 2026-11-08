import React from "react";
import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="inline-flex p-4 rounded-full bg-surface-2 text-muted mb-6">
        <FileQuestion size={48} />
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-3">الصفحة غير موجودة</h1>
      <p className="text-sm text-muted mb-8 leading-relaxed">
        الرابط الذي تحاول الوصول إليه غير موجود أو تم نقله. تأكد من صحة العنوان أو عد للصفحة الرئيسية.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-slate-950 font-bold text-sm hover:opacity-90 transition-opacity touch-target"
      >
        <ArrowLeft size={16} className="rotate-180" />
        <span>العودة للرئيسية</span>
      </Link>
    </div>
  );
}
