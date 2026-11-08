"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Logo } from "@/components/Logo";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Terminal, Home } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [supabaseEnabled, setSupabaseEnabled] = useState(true);

  useEffect(() => {
    setSupabaseEnabled(isSupabaseConfigured());
  }, []);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMsg(error.message || "فشل إرسال رابط الدخول، تأكد من صحة البريد الإلكتروني.");
      } else {
        setMagicLinkSent(true);
      }
    } catch {
      setErrorMsg("حدث خطأ غير متوقع. يرجى إعادة المحاولة.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) {
        setErrorMsg(error.message || "تعذر الاتصال بـ Google حالياً.");
      }
    } catch {
      setErrorMsg("حدث خطأ أثناء محاولة تسجيل الدخول عبر Google.");
    }
  };

  // If running in local development mode without Supabase
  if (!supabaseEnabled) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="flex flex-col items-center mb-6">
          <Link href="/" className="mb-4">
            <Logo size={48} />
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold mb-3">
            <Terminal size={14} />
            <span>وضع التطوير المحلي مفعّل</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">تسجيل الدخول غير متاح حالياً</h1>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            يعمل التطبيق حالياً بدون Supabase في وضع الذاكرة المؤقتة. ميزة الفحص بكامل تفاصيلها متاحة ومجانية للجميع بدون الحاجة لتسجيل الدخول.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-surface border border-border text-start space-y-4 shadow-soft">
          <h2 className="text-xs font-bold text-foreground">كيفية تفعيل المصادقة وقاعدة البيانات:</h2>
          <p className="text-xs text-muted leading-relaxed">
            لتفعيل تسجيل الدخول وسجل الفحوصات، قم بإضافة بيانات مشروع Supabase الخاص بك في ملف <code className="text-brand-primary bg-surface-2 px-1.5 py-0.5 rounded font-mono text-[11px]">.env.local</code>:
          </p>
          <ul className="text-xs text-muted space-y-1 font-mono text-[11px] bg-surface-2 p-3 rounded-xl border border-border/60">
            <li>NEXT_PUBLIC_SUPABASE_URL=https://...</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...</li>
            <li>SUPABASE_SERVICE_ROLE_KEY=eyJ...</li>
          </ul>

          <Link
            href="/"
            className="w-full mt-4 py-3 px-4 rounded-xl bg-brand-primary text-slate-950 font-bold text-sm hover:opacity-95 transition-opacity flex items-center justify-center gap-2 touch-target"
          >
            <Home size={16} />
            <span>العودة للفاحص الرئيسي</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8">
        <Link href="/" className="mb-4">
          <Logo size={48} />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">تسجيل الدخول إلى فَطِن</h1>
        <p className="text-xs sm:text-sm text-muted">
          سجّل دخولك لزيادة رصيد الفحص إلى 10 فحوصات يومياً مجاناً، والتحكم بسجل فحوصاتك.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-surface border border-border shadow-soft text-start space-y-6">
        {magicLinkSent ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-verdict-safe/10 text-verdict-safe flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="text-lg font-bold text-foreground">تم إرسال رابط الدخول!</h2>
            <p className="text-xs text-muted leading-relaxed">
              أرسلنا رابط تسجيل الدخول السريع إلى بريدك: <strong className="text-foreground">{email}</strong>.
              اضغط على الرابط في رسالتك للدخول فوراً بدون كلمة مرور.
            </p>
            <button
              type="button"
              onClick={() => setMagicLinkSent(false)}
              className="text-xs text-brand-primary font-bold hover:underline"
            >
              استخدام بريد إلكتروني آخر
            </button>
          </div>
        ) : (
          <>
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 rounded-xl border border-border bg-surface-2 hover:bg-surface-2/80 text-foreground font-semibold text-sm flex items-center justify-center gap-3 transition-colors touch-target"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.675-5.17 3.675-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l3.99-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.28 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              <span>المتابعة باستخدام Google</span>
            </button>

            <div className="relative flex items-center justify-center my-4">
              <span className="w-full border-t border-border" />
              <span className="absolute bg-surface px-3 text-[11px] text-muted">أو بالبريد الإلكتروني</span>
            </div>

            {/* Email Magic Link Form */}
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-xs font-semibold text-foreground">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <input
                    id="login-email"
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    disabled={loading}
                    className="w-full p-3 ps-10 rounded-xl bg-surface-2 border border-border text-foreground placeholder:text-muted/60 text-sm focus:border-brand-primary outline-none"
                  />
                  <Mail size={16} className="absolute start-3 top-3.5 text-muted" />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-verdict-danger/10 border border-verdict-danger/20 text-verdict-danger text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3 px-4 rounded-xl bg-brand-primary text-slate-950 font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-opacity touch-target flex items-center justify-center gap-2"
              >
                <span>{loading ? "جارٍ الإرسال…" : "إرسال رابط الدخول السريع"}</span>
                <ArrowLeft size={16} className="rotate-180" />
              </button>
            </form>
          </>
        )}

        {/* Reassurance points */}
        <div className="pt-4 border-t border-border/60 space-y-2 text-xs text-muted">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-brand-primary shrink-0" />
            <span>مجاني 100% وبدون أي اشتراكات خفية</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-brand-primary shrink-0" />
            <span>حفظ السجل معطّل افتراضياً لحماية كامل خصوصيتك</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-brand-primary shrink-0" />
            <span>يمكنك حذف بياناتك وحسابك بضغطة زر في أي وقت</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link href="/" className="text-xs text-muted hover:text-foreground transition-colors">
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
