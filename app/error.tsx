"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log generic error information without user message content
    console.error("Application error boundary caught an error:", error.name, error.message);
  }, [error]);

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="inline-flex p-4 rounded-full bg-verdict-danger/10 text-verdict-danger mb-6">
        <AlertCircle size={48} />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">حدث خطأ غير متوقع</h1>
      <p className="text-sm text-muted mb-8 leading-relaxed">
        نعتذر، واجه التطبيق مشكلة مؤقتة في المعالجة. لم يتم حفظ أي بيانات، ويمكنك محاولة إعادة التحميل الآن.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-slate-950 font-bold text-sm hover:opacity-90 transition-opacity touch-target"
      >
        <RefreshCw size={16} />
        <span>إعادة المحاولة</span>
      </button>
    </div>
  );
}
